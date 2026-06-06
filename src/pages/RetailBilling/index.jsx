import { useState, useEffect, useRef, useMemo } from 'react'
import AutocompleteDropdown from '../../components/AutocompleteDropdown'
import DateInput from '../../components/DateInput'
import { useCache } from '../../context/CacheContext'

export default function Billing({ isYearLocked = false }) {
    const {
        medicines,
        companies,
        categories: types,
        powers,
        packings,
        storeProfile,
        refreshMedicines
    } = useCache()

    useEffect(() => {
        if (window.api && window.api.logRendererEvent) {
            window.api.logRendererEvent('info', `[RetailBilling] Companies loaded in component. Count: ${companies ? companies.length : 0}`);
            if (companies && companies.length > 0) {
                window.api.logRendererEvent('info', `[RetailBilling] First 3 companies: ${JSON.stringify(companies.slice(0, 3).map(c => c.name))}`);
            }
        }
    }, [companies]);

    const [bills, setBills] = useState([])
    const [items, setItems] = useState([])
    const [view, setView] = useState(isYearLocked ? 'history' : 'new')
    const [printBillData, setPrintBillData] = useState(null)
    const [triggerPrint, setTriggerPrint] = useState(false)

    
    // History Filters
    const [fromDate, setFromDate] = useState('')
    const [toDate, setToDate] = useState('')
    const [searchCustomer, setSearchCustomer] = useState('')
    
    // Bill Details
    const [billDetails, setBillDetails] = useState({
        patientName: 'CASH',
        address: '-',
        prescribedBy: 'Self',
        discountRs: 0,
        otherCharges: 0,
        otherChargesType: 'E'
    })

    // Current Entry
    const [currentEntry, setCurrentEntry] = useState({
        company: '',
        medicine: '',
        medicine_id: null,
        type: '', // Medicine category (Drops, Decimal, etc.)
        saleType: 'Sealed', // Sealed vs Loose
        power: '',
        packing: '',
        qty: '',
        price: '',
        disPercent: 10,
        gstPercent: 5,
        batch: '',
        gid: '',
        location: '',
        stock: 0
    })
    
    const [selectedMed, setSelectedMed] = useState(null)
    const [search, setSearch] = useState('')
    const [showSearch, setShowSearch] = useState(false)
    
    const [focusedMedIndex, setFocusedMedIndex] = useState(0)
    
    const [batchModalOpen, setBatchModalOpen] = useState(false)
    const [availableBatches, setAvailableBatches] = useState([])
    const [pendingMedSelection, setPendingMedSelection] = useState(null)
    const [focusedBatchIndex, setFocusedBatchIndex] = useState(0)
    
    // View Bill Modal State
    const [viewBillModal, setViewBillModal] = useState({ show: false, data: null })
    const [toast, setToast] = useState({ show: false, msg: '', type: 'success' })
    function showToast(msg, type = 'success') {
        setToast({ show: true, msg, type })
        setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000)
    }

    // Success Modal State
    const [successModal, setSuccessModal] = useState({ show: false, billNo: '', billId: null })
    const [successFocus, setSuccessFocus] = useState('ok')
    const isLocked = isYearLocked

    const [heldBills, setHeldBills] = useState([])
    const [showHeldModal, setShowHeldModal] = useState(false)
    const [showClearConfirm, setShowClearConfirm] = useState(false)

    useEffect(() => {
        try {
            const stored = JSON.parse(localStorage.getItem('retailHeldBills') || '[]');
            setHeldBills(stored);
        } catch (e) {}
    }, []);

    async function load() {
        try {
            const b = await window.api.getBills()
            setBills(b || [])
        } catch (e) {
            console.error('Failed to load bills:', e)
        }
    }


    useEffect(() => { load() }, [])

    // ─── Direct PDF Invoicing Pipeline ───
    async function triggerInvoicePrint(billId, enrichFromActiveForm = false) {
        try {
            const dbBill = await window.api.getBillById(billId)
            const enrichedBill = {
                ...dbBill,
                address: enrichFromActiveForm ? billDetails.address : '-',
                prescribed_by: enrichFromActiveForm ? billDetails.prescribedBy : '-'
            }
            setPrintBillData(enrichedBill)
            setTriggerPrint(true)
        } catch (err) {
            console.error('[PRINT] Failed to fetch bill for printing:', err)
            showToast('Failed to fetch bill details', 'error')
        }
    }

    useEffect(() => {
        if (triggerPrint && printBillData) {
            setTriggerPrint(false)
            
            const printReceiptData = async () => {
                try {
                    let totalGross = 0;
                    let totalDiscount = 0;
                    
                    const rowsHtml = (printBillData.items || []).map((item, idx) => {
                        const medName = item.medicine_name || '';
                        const details = `${item.potency ? item.potency : ''} ${item.packing || ''} ${item.unit || ''}`.trim();
                        const companyStr = item.company ? `(${item.company})` : '';
                        const subLine = [details, companyStr].filter(Boolean).join(' ');
                        const descHtml = subLine ? `${medName}<br><span style="font-size: 9px; font-weight: 600;">${subLine}</span>` : medName;
                        
                        const qty = Number(item.quantity) || 0;
                        const price = Number(item.unit_price) || 0;
                        const net = Number(item.total_price) || 0;
                        const gross = price * qty;
                        const discount = gross - net;
                        
                        totalGross += gross;
                        totalDiscount += discount;

                        return `
                            <tr>
                                <td style="vertical-align: top; padding: 1px 0;">${idx + 1}</td>
                                <td style="vertical-align: top; padding: 1px 2px; line-height: 1.1;">${descHtml}</td>
                                <td style="text-align: center; vertical-align: top; padding: 1px 0;">${qty}</td>
                                <td style="text-align: right; vertical-align: top; padding: 1px 0;">${price.toFixed(2)}</td>
                                <td style="text-align: right; vertical-align: top; padding: 1px 0;">${discount > 0 ? discount.toFixed(2) : '-'}</td>
                                <td style="text-align: right; vertical-align: top; padding: 1px 0;">${net.toFixed(2)}</td>
                            </tr>
                        `;
                    }).join('');

                    const roundedTotal = Math.round(Number(printBillData.total_amount) || 0);
                    const roundOff = roundedTotal - Number(printBillData.total_amount);

                    const cgst = (Number(printBillData.total_tax) || 0) / 2;
                    const sgst = (Number(printBillData.total_tax) || 0) / 2;

                    const numInWords = numberToWords(roundedTotal);

                    const qrSvg = `<svg width="25" height="25" viewBox="0 0 100 100" fill="none"><path d="M10 10h30v30H10V10zm10 10h10v10H20V20zm40-10h30v30H60V10zm10 10h10v10H70V20zM10 60h30v30H10V60zm10 10h10v10H20V70zm40 0h10v10H60V70zm20 0h10v10H80V70zm-20 20h30v10H60V90zm20-20h10v10H80V70zM45 45h10v10H45V45zm0 20h10v10H45V65zm20 0h10v10H65V65z" fill="#000"/></svg>`;

                    const logoSvg = `<svg width="35" height="35" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 2px;"><path d="M7 10h10M5 6l2 4 1.5-1.5M19 6l-2 4-1.5-1.5"/><path d="M5 10c0 4.418 3.134 8 7 8s7-3.582 7-8H5z"/><path d="M12 18v4M9 22h6"/><path d="M12 11v4M10 13h4"/></svg>`;

                    const printStyles = `style="-webkit-print-color-adjust: exact; print-color-adjust: exact;"`;

                    const receiptData = [
                        {
                            type: 'html',
                            value: `
                                <div style="text-align: center; margin-bottom: 4px;">
                                    ${logoSvg}
                                    <h1 style="margin: 0; font-size: 14px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px;">${storeProfile?.store_name || 'HOMOEOSTORE'}</h1>
                                    <p style="margin: 1px 0 0 0; font-size: 9px;">${[storeProfile?.address_line1, storeProfile?.address_line2, storeProfile?.address_line3].filter(Boolean).join(', ') || 'Address'}</p>
                                    ${storeProfile?.phone ? `<p style="margin: 0; font-size: 9px;">Mobile: ${storeProfile.phone}</p>` : ''}
                                    ${storeProfile?.gstin ? `<p style="margin: 0; font-size: 9px;">GSTIN: ${storeProfile.gstin}</p>` : ''}
                                    ${storeProfile?.dl_no ? `<p style="margin: 0; font-size: 9px;">DL RETAIL: ${storeProfile.dl_no}</p>` : ''}
                                </div>
                                
                                <div style="font-size: 10px; margin-top: 2px;">
                                    <div style="font-weight: 800; font-size: 11px; margin-bottom: 1px;">CASH MEMO / INVOICE</div>
                                    <div style="display: flex;">
                                        <div style="width: 20px;">To:</div>
                                        <div style="font-weight: 800; text-transform: uppercase;">${printBillData.customer_name || 'CASH'}</div>
                                    </div>
                                </div>
                                <div style="border-bottom: 1px dashed #000; margin: 3px 0;"></div>
                                
                                <div style="font-size: 10px;">
                                    <div><span style="font-weight: 800; display: inline-block; width: 50px;">Bill No.:</span> <span style="font-weight: 800;">${printBillData.bill_number}</span></div>
                                    <div><span style="font-weight: 800; display: inline-block; width: 50px;">Date:</span> <span style="font-weight: 800;">${formatInvoiceDate(printBillData.created_at + (printBillData.created_at.includes('Z') ? '' : 'Z'))}</span></div>
                                </div>

                                <div style="border-top: 1px dashed #000; border-bottom: 1px dashed #000; margin-top: 4px; padding: 2px 0; ${printStyles}">
                                    <table style="width: 100%; font-size: 9px; font-weight: 800;">
                                        <tr>
                                            <td style="width: 5%;">#</td>
                                            <td style="width: 43%;">MEDICINE</td>
                                            <td style="width: 7%; text-align: center;">QT</td>
                                            <td style="width: 13%; text-align: right;">PRICE</td>
                                            <td style="width: 12%; text-align: right;">DISC</td>
                                            <td style="width: 20%; text-align: right;">AMOUNT</td>
                                        </tr>
                                    </table>
                                </div>

                                <table style="width: 100%; font-size: 10px; margin-bottom: 2px; margin-top: 1px; font-weight: 600;">
                                    ${rowsHtml}
                                </table>

                                ${cgst > 0 ? `
                                <div style="border-bottom: 1px dashed #000; margin: 2px 0;"></div>
                                <table style="width: 100%; font-size: 10px; margin-top: 2px; font-weight: 600;">
                                    <tr>
                                        <td style="width: 35%;"></td>
                                        <td style="width: 35%;">CGST (2.50%) :</td>
                                        <td style="width: 5%;">₹</td>
                                        <td style="width: 25%; text-align: right;">${cgst.toFixed(2)}</td>
                                    </tr>
                                    <tr>
                                        <td></td>
                                        <td>SGST (2.50%) :</td>
                                        <td>₹</td>
                                        <td style="text-align: right;">${sgst.toFixed(2)}</td>
                                    </tr>
                                </table>
                                <div style="display: flex; justify-content: flex-end;">
                                    <div style="width: 65%; border-bottom: 1px dashed #000; margin: 2px 0;"></div>
                                </div>
                                <table style="width: 100%; font-size: 10px; font-weight: 800; margin-bottom: 4px;">
                                    <tr>
                                        <td style="width: 35%;"></td>
                                        <td style="width: 35%;">Total CGST :</td>
                                        <td style="width: 5%;">₹</td>
                                        <td style="width: 25%; text-align: right;">${cgst.toFixed(2)}</td>
                                    </tr>
                                    <tr>
                                        <td></td>
                                        <td>Total SGST :</td>
                                        <td>₹</td>
                                        <td style="text-align: right;">${sgst.toFixed(2)}</td>
                                    </tr>
                                </table>
                                ` : `<div style="border-bottom: 1px dashed #000; margin: 4px 0;"></div>`}

                                <div style="font-size: 10px; font-weight: 800; margin-bottom: 2px;">SUMMARY</div>
                                <table style="width: 100%; font-size: 10px; font-weight: 600;">
                                    <tr>
                                        <td style="width: 50%;">Total MRP</td>
                                        <td style="width: 10%;">:</td>
                                        <td style="width: 5%;">₹</td>
                                        <td style="width: 35%; text-align: right;">${totalGross.toFixed(2)}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding-bottom: 2px;">Less Discount</td>
                                        <td style="padding-bottom: 2px;">:</td>
                                        <td style="padding-bottom: 2px;">₹</td>
                                        <td style="text-align: right; padding-bottom: 2px;">${totalDiscount.toFixed(2)}</td>
                                    </tr>
                                </table>
                                <div style="border-bottom: 1px dashed #000; margin: 2px 0;"></div>
                                <table style="width: 100%; font-size: 12px; font-weight: 900;">
                                    <tr>
                                        <td style="width: 50%;">TOTAL (Tax Incl.)</td>
                                        <td style="width: 10%;">:</td>
                                        <td style="width: 5%;">₹</td>
                                        <td style="width: 35%; text-align: right;">${roundedTotal.toFixed(2)}</td>
                                    </tr>
                                </table>
                                <table style="width: 100%; font-size: 10px; font-weight: 600; margin-top: 1px;">
                                    <tr>
                                        <td style="width: 50%;">Round</td>
                                        <td style="width: 10%;">:</td>
                                        <td style="width: 5%;"></td>
                                        <td style="width: 35%; text-align: right;">${roundOff > 0 ? '+' : ''}${roundOff.toFixed(2)}</td>
                                    </tr>
                                </table>
                                
                                <div style="border-top: 1px dashed #000; border-bottom: 1px dashed #000; ${printStyles} padding: 4px 0; margin-top: 4px;">
                                    <table style="width: 100%; font-size: 13px; font-weight: 900;">
                                        <tr>
                                            <td style="width: 50%;">FINAL TOTAL</td>
                                            <td style="width: 10%;">:</td>
                                            <td style="width: 5%;">₹</td>
                                            <td style="width: 35%; text-align: right;">${roundedTotal.toFixed(2)}</td>
                                        </tr>
                                    </table>
                                </div>

                                <div style="font-size: 9px; margin-top: 6px;">
                                    <div style="font-weight: 800;">TOTAL IN WORDS:</div>
                                    <div style="margin-top: 1px;">${numInWords}</div>
                                </div>
                                <div style="border-bottom: 1px dashed #000; margin: 4px 0;"></div>

                                <div style="display: flex; justify-content: space-between; font-size: 8px; align-items: flex-end;">
                                    <div style="width: 60%;">
                                        <div style="margin-bottom: 2px;">For <span style="font-weight: 800;">${storeProfile?.store_name?.toUpperCase() || 'HOMOEOSTORE'}</span></div>
                                        <div>1. Goods once sold will not be taken back.</div>
                                        <div>2. All disputes subject to local jurisdiction.</div>
                                    </div>
                                    <div style="text-align: right;">
                                        <div style="margin-bottom: 20px;">E&OE</div>
                                        <div>Authorised Signatory</div>
                                    </div>
                                </div>

                                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
                                    <div style="font-weight: 900; font-size: 11px; letter-spacing: 0.5px; color: #000; ${printStyles}">
                                        WE WISH YOU GOOD HEALTH
                                    </div>
                                    <div>${qrSvg}</div>
                                </div>
                                
                                <div style="text-align: center; font-size: 7px; margin-top: 8px;">
                                    Printed with Homoeostore POS
                                </div>
                            `
                        }
                    ]

                    console.log('[PRINT] Calling window.api.printReceipt with', receiptData.length, 'items')
                    const response = await window.api.printReceipt(receiptData)
                    console.log('[PRINT] Response from backend:', response)
                    if (response.success) {
                        showToast('Bill Sent to Thermal Printer!', 'success')
                    } else {
                        showToast('Thermal Printing failed: ' + response.error, 'error')
                    }
                } catch (e) {
                    console.error('[PRINT] Error in printReceiptData:', e)
                    showToast('Failed to prepare print data', 'error')
                }
            }
            
            printReceiptData()
        }
    }, [triggerPrint, printBillData])

    function numberToWords(num) {
        const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
        const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
        
        if ((num = num.toString()).length > 9) return 'overflow';
        let n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
        if (!n) return '';
        let str = '';
        str += (Number(n[1]) != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + ' Crore ' : '';
        str += (Number(n[2]) != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + ' Lakh ' : '';
        str += (Number(n[3]) != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + ' Thousand ' : '';
        str += (Number(n[4]) != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + ' Hundred ' : '';
        str += (Number(n[5]) != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) + ' Only' : 'Only';
        return str;
    }

    const formatInvoiceDate = (dateStr) => {
        if (!dateStr) return '';
        let dStr = typeof dateStr === 'string' && !dateStr.includes('T') ? dateStr.replace(' ', 'T') + 'Z' : dateStr;
        const dateObj = new Date(dStr);
        if (isNaN(dateObj.getTime())) return dateStr;
        return dateObj.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase();
    }

    const formatCurrency = (num) => {
        return `₹${(Number(num) || 0).toFixed(2)}`;
    }


    // Scroll to focused medicine item
    useEffect(() => {
        if (showSearch && focusedMedIndex >= 0) {
            document.getElementById(`billing-med-item-${focusedMedIndex}`)?.scrollIntoView({ block: 'nearest' })
        }
    }, [focusedMedIndex, showSearch])

    // Scroll to focused batch item
    useEffect(() => {
        if (batchModalOpen && focusedBatchIndex >= 0) {
            document.getElementById(`batch-row-${focusedBatchIndex}`)?.scrollIntoView({ block: 'nearest' })
        }
    }, [focusedBatchIndex, batchModalOpen])

    // Global Escape and F2 listener to focus Finalise & Print button
    useEffect(() => {
        if (view !== 'new' || batchModalOpen || successModal.show) return;
        function handleEscToFinalize(e) {
            if ((e.key === 'Escape' || e.key === 'F2') && items.length > 0) {
                const btn = document.getElementById('billing-finalize-btn');
                if (btn) {
                    e.preventDefault();
                    btn.focus();
                }
            } else if (e.key === 'F9') {
                e.preventDefault();
                handleHoldBill();
            }
        }
        window.addEventListener('keydown', handleEscToFinalize);
        return () => window.removeEventListener('keydown', handleEscToFinalize);
    }, [view, items, batchModalOpen, successModal.show, heldBills, billDetails, currentEntry]);

    // Global keydown event listener for Batch Selection Modal
    useEffect(() => {
        if (!batchModalOpen) return;

        // Blur active element to prevent background button double-triggering
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }

        function handleGlobalKeyDown(e) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setFocusedBatchIndex(prev => (prev < availableBatches.length - 1 ? prev + 1 : prev));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setFocusedBatchIndex(prev => (prev > 0 ? prev - 1 : 0));
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (focusedBatchIndex >= 0 && focusedBatchIndex < availableBatches.length) {
                    continueAdd(availableBatches[focusedBatchIndex]);
                }
            } else if (e.key === 'Escape') {
                e.preventDefault();
                setBatchModalOpen(false);
            }
        }

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => {
            window.removeEventListener('keydown', handleGlobalKeyDown);
        };
    }, [batchModalOpen, availableBatches, focusedBatchIndex]);

    // Global keydown event listener for Success Modal (Print vs OK navigation)
    useEffect(() => {
        if (!successModal.show) return;

        // Blur active element to prevent double triggering or background focusing
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }

        function handleSuccessKeyDown(e) {
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                e.preventDefault();
                setSuccessFocus(prev => prev === 'ok' ? 'print' : 'ok');
            } else if (e.key === 'Enter') {
                e.preventDefault();
                const tempId = successModal.billId;
                if (successFocus === 'print') {
                    setSuccessModal({ show: false, billNo: '', billId: null });
                    if (tempId) triggerInvoicePrint(tempId, true);
                } else {
                    setSuccessModal({ show: false, billNo: '', billId: null });
                }
                setTimeout(() => document.getElementById('billing-company-input')?.focus(), 100);
            } else if (e.key === 'Escape') {
                e.preventDefault();
                setSuccessModal({ show: false, billNo: '', billId: null });
                setTimeout(() => document.getElementById('billing-company-input')?.focus(), 100);
            }
        }

        window.addEventListener('keydown', handleSuccessKeyDown);
        return () => {
            window.removeEventListener('keydown', handleSuccessKeyDown);
        };
    }, [successModal, successFocus]);


    // Global keydown event listener for View Bill Modal (History)
    useEffect(() => {
        if (!viewBillModal.show) return;
        function handleKeyDown(e) {
            if (e.key === 'Escape') {
                e.preventDefault();
                setViewBillModal({ show: false, data: null });
            }
        }
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [viewBillModal.show]);

    // Math
    const totalQty = items.reduce((sum, item) => sum + Number(item.qty), 0)
    
    // Derived Calculations
    const subtotal = items.reduce((sum, item) => sum + Number(item.amount), 0)
    const itemDiscountAmount = items.reduce((sum, item) => sum + Number(item.disAmount), 0)
    const billDiscountRs = Number(billDetails.discountRs) || 0
    const totalDiscountAmount = itemDiscountAmount + billDiscountRs
    const otherCharges = Number(billDetails.otherCharges) || 0
    
    const finalAmountUnrounded = subtotal - billDiscountRs + otherCharges
    const finalTotal = Math.round(finalAmountUnrounded)
    const roundOff = finalTotal - finalAmountUnrounded

    const totalSaving = totalDiscountAmount

    const maxBillNo = (() => {
        let maxNum = 0;
        (bills || []).forEach(b => {
            if (!b.bill_number) return;
            const str = b.bill_number.toString();
            if (str.includes('/')) {
                const parts = str.split('/');
                const lastPart = Number(parts[parts.length - 1]);
                if (!isNaN(lastPart) && lastPart > maxNum) {
                    maxNum = lastPart;
                }
            } else {
                const num = Number(str);
                if (!isNaN(num) && num > maxNum) {
                    maxNum = num;
                }
            }
        });
        return maxNum;
    })();

    const currentYear = new Date().getFullYear();
    const nextBillNumberStr = `NHP/${currentYear}/${String(maxBillNo + 1).padStart(4, '0')}`;

    // Dynamic dropdown options based on selected medicine and type
    const sameNameMedicines = useMemo(() => {
        if (!currentEntry.medicine) return [];
        const medNameLower = currentEntry.medicine.toLowerCase();
        return medicines.filter(m => m.nameLower === medNameLower);
    }, [medicines, currentEntry.medicine]);
        
    const hasPowerOptions = useMemo(() => {
        if (!currentEntry.medicine) return true;
        return sameNameMedicines.some(m => m.potency && m.potency.trim() !== '');
    }, [currentEntry.medicine, sameNameMedicines]);
        
    const sameNameAndTypeMedicines = useMemo(() => {
        if (!currentEntry.type) return sameNameMedicines;
        const typeLower = currentEntry.type.toLowerCase();
        return sameNameMedicines.filter(m => (m.category || '').toLowerCase() === typeLower);
    }, [sameNameMedicines, currentEntry.type]);
    
    const availableTypes = useMemo(() => {
        if (sameNameMedicines.length === 0) return types;
        return types.filter(t => sameNameMedicines.some(m => (m.category || '').toLowerCase() === t.name.toLowerCase()));
    }, [sameNameMedicines, types]);

    const availablePackings = useMemo(() => {
        if (sameNameMedicines.length === 0) return packings;
        return packings.filter(p => sameNameAndTypeMedicines.some(m => (m.unit || '').toLowerCase() === p.name.toLowerCase()));
    }, [sameNameMedicines, sameNameAndTypeMedicines, packings]);

    const availablePowers = useMemo(() => {
        if (sameNameMedicines.length === 0) return powers;
        return powers.filter(p => sameNameAndTypeMedicines.some(m => (m.potency || '').toLowerCase() === p.name.toLowerCase()));
    }, [sameNameMedicines, sameNameAndTypeMedicines, powers]);

    async function handleViewLocations(overrideMedId = null) {
        const targetMedId = overrideMedId || currentEntry.medicine_id
        if (!targetMedId) return showToast('Select a medicine first', 'error')
        
        // Check if we need to show batch modal
        const batches = await window.api.getStockBatches(targetMedId)
        
        let unassignedCartQty = items
            .filter(item => item.medicine_id === targetMedId && !item.batch_id)
            .reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
            
        const liveBatches = (batches || []).map(b => {
            const batchCartQty = items
                .filter(item => item.batch_id === b.id)
                .reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
            
            let available = Math.max(0, (b.quantity || 0) - batchCartQty);
            const deduct = Math.min(available, unassignedCartQty);
            available -= deduct;
            unassignedCartQty -= deduct;
            
            return {
                ...b,
                quantity: available
            };
        });
        const validBatches = liveBatches.filter(b => b.quantity > 0)
        if (validBatches.length > 0) {
            setAvailableBatches(validBatches)
            setPendingMedSelection(currentEntry)
            setFocusedBatchIndex(0)
            setBatchModalOpen(true)
        } else {
            showToast('Out of stock! No locations found.', 'error')
            // Clear the medicine selection
            setSearch('')
            setSelectedMed(null)
            setCurrentEntry({ ...currentEntry, medicine: '', type: '', packing: '', power: '', qty: '', price: '', disPercent: 10, gstPercent: 5 })
            setShowSearch(true)
            // Don't move to Qty if out of stock. Go back to medicine search.
            setTimeout(() => {
                document.getElementById('billing-medicine-input')?.focus()
            }, 50)
        }
    }

    function continueAdd(selectedBatch) {
        setBatchModalOpen(false)

        let finalEntry = { ...currentEntry }
        if (selectedBatch) {
            finalEntry.price = Number(selectedBatch.mrp || 0).toFixed(2)
            finalEntry.stock = selectedBatch.quantity || 0
            finalEntry.batch_id = selectedBatch.id
            finalEntry.batch = selectedBatch.batch_no || ''
            finalEntry.gid = selectedBatch.godown || ''
            const godownStr = selectedBatch.godown ? `${selectedBatch.godown} - ` : ''
            finalEntry.location = `${godownStr}${selectedBatch.location_type || ''} ${selectedBatch.location_value || ''}`.trim()
        } else {
            finalEntry.skip_batch_selection = true
        }
        
        finalEntry.qty = '' // Keep qty empty to force user input

        setCurrentEntry(finalEntry)

        setTimeout(() => {
            document.getElementById('billing-qty-input')?.focus()
        }, 50)
    }

    function handleHoldBill() {
        if (items.length === 0) return showToast('Cannot hold an empty bill', 'error');
        const newHold = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            items: [...items],
            billDetails: { ...billDetails }
        };
        const updated = [...heldBills, newHold];
        setHeldBills(updated);
        localStorage.setItem('retailHeldBills', JSON.stringify(updated));
        
        setItems([]);
        setBillDetails({ patientName: 'CASH', address: '-', prescribedBy: 'Self', discountRs: 0, otherCharges: 0, otherChargesType: 'E' });
        setCurrentEntry({
            company: '', medicine: '', medicine_id: null, type: '', saleType: 'Sealed', power: '', packing: '', qty: '', price: '', disPercent: 10, gstPercent: 5, batch: '', gid: '', location: '', stock: 0
        });
        localStorage.removeItem('retailDraft');
        showToast('Bill put on hold', 'success');
        document.getElementById('billing-company-input')?.focus();
    }

    function handleRestoreBill(holdId) {
        if (items.length > 0) return showToast('Please clear or hold the current bill first', 'error');
        
        const holdIndex = heldBills.findIndex(h => h.id === holdId);
        if (holdIndex === -1) return;
        
        const hold = heldBills[holdIndex];
        setItems(hold.items);
        setBillDetails(hold.billDetails);
        
        const updated = heldBills.filter(h => h.id !== holdId);
        setHeldBills(updated);
        localStorage.setItem('retailHeldBills', JSON.stringify(updated));
        
        setShowHeldModal(false);
        showToast('Bill restored', 'success');
        setTimeout(() => {
            document.getElementById('billing-company-input')?.focus();
        }, 100);
    }

    function handleAdd() {
        if (isLocked) return showToast('Financial Year is locked. Cannot add items.', 'error')
        if (!currentEntry.medicine) return showToast('Select a medicine first', 'error')
        
        // Force location selection if not yet processed
        if (!currentEntry.batch_id && !currentEntry.skip_batch_selection) {
            handleViewLocations()
            return
        }

        const price = Number(currentEntry.price) || 0
        const qty = Number(currentEntry.qty) || 0
        
        if (qty <= 0) return showToast('Please enter a valid quantity', 'error')
        const disPercent = Number(currentEntry.disPercent) || 0
        
        if (currentEntry.batch_id && qty > currentEntry.stock) {
            return showToast(`Cannot add ${qty}. Only ${currentEntry.stock} available in this location/batch!`, 'error')
        } else if (!currentEntry.batch_id && currentEntry.stock !== undefined && qty > currentEntry.stock) {
            return showToast(`Cannot add ${qty}. Only ${currentEntry.stock} available in stock!`, 'error')
        }

        const grossAmount = price * qty
        const disAmount = (grossAmount * disPercent) / 100
        const amount = grossAmount - disAmount

        const newItem = {
            id: Date.now(),
            ...currentEntry,
            amount,
            disAmount
        }

        setItems([...items, newItem])
        
        // Reset entry but keep company and saleType for continuous fast entry
        setCurrentEntry({
            ...currentEntry,
            medicine: '',
            medicine_id: null,
            type: '',
            packing: '',
            power: '',
            qty: '',
            price: '',
            stock: 0,
            batch: '',
            batch_id: null,
            skip_batch_selection: false,
            gid: '',
            location: '',
            gstPercent: 5
        })
        setSearch('')
        setSelectedMed(null)
        
        // Automatically focus back to medicine input for continuous entry
        setTimeout(() => {
            document.getElementById('billing-medicine-input')?.focus();
        }, 50);
    }

    function selectMedicine(m) {
        const cartQty = items
            .filter(item => item.medicine_id === m.id)
            .reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
        const remainingStock = Math.max(0, (m.stock_quantity || 0) - cartQty);

        setCurrentEntry({
            ...currentEntry,
            company: m.company || '',
            medicine: m.name,
            medicine_id: m.id,
            type: m.category || '',
            packing: m.unit || '',
            power: m.potency || '',
            price: Number(m.selling_price || 0).toFixed(2),
            qty: 1,
            stock: remainingStock,
            batch_id: null,
            location: '',
            skip_batch_selection: false,
            gstPercent: m.gst_rate !== undefined ? m.gst_rate : 5
        })
        setSearch(m.name)
        setShowSearch(false)
        setSelectedMed(m)
        
        // Always pop up locations immediately
        handleViewLocations(m.id);
    }

    // Removed handleCompanyKeyDown

    function handleMedKeyDown(e) {
        if (!showSearch) {
            if (e.key === 'Enter') {
                e.preventDefault();
                document.getElementById('billing-type-input')?.focus();
            }
            return
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault()
            setFocusedMedIndex(prev => prev < filtered.length - 1 ? prev + 1 : prev)
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setFocusedMedIndex(prev => prev > 0 ? prev - 1 : prev)
        } else if (e.key === 'Enter') {
            e.preventDefault()
            if (focusedMedIndex >= 0 && focusedMedIndex < filtered.length) {
                selectMedicine(filtered[focusedMedIndex])
                setFocusedMedIndex(0)
            } else if (filtered.length > 0) {
                selectMedicine(filtered[0])
            } else {
                setShowSearch(false)
                document.getElementById('billing-type-input')?.focus();
            }
        } else if (e.key === 'Escape') {
            if (!search && items.length > 0) {
                e.preventDefault()
                document.getElementById('billing-finalize-btn')?.focus()
            } else {
                e.stopPropagation()
            }
            setShowSearch(false)
            setFocusedMedIndex(0)
        }
    }

    function removeItem(id) {
        setItems(items.filter(i => i.id !== id))
    }

    async function handleBill() {
        if (isLocked) return showToast('Financial Year is locked', 'error')
        if (items.length === 0) return showToast('Add at least one item', 'error')
        const bill_number = nextBillNumberStr
        
        const billId = await window.api.createBill({
            bill_number,
            customer_name: billDetails.patientName,
            customer_phone: '',
            total_amount: finalTotal,
            discount: totalDiscountAmount,
            paid_amount: finalTotal,
            items: items.map(i => ({
                medicine_id: i.medicine_id || null,
                batch_id: i.batch_id || null,
                quantity: i.qty,
                unit_price: i.price,
                total_price: i.amount,
                gst_rate: i.gstPercent !== undefined ? i.gstPercent : 5
            }))
        })
        
        setItems([])
        setBillDetails({ patientName: 'CASH', address: '-', prescribedBy: 'Self', discountRs: 0, otherCharges: 0, otherChargesType: 'E' })
        setCurrentEntry({
            company: '', medicine: '', medicine_id: null, type: '', saleType: 'Sealed', power: '', packing: '', qty: '', price: '', disPercent: 10, gstPercent: 5, batch: '', gid: '', location: '', stock: 0
        })
        setSelectedMed(null)
        setSearch('')
        load()
        refreshMedicines()
        setSuccessModal({ show: true, billNo: bill_number, billId })

    }

    const filtered = useMemo(() => {
        if (!showSearch) return []
        const companyLower = (currentEntry.company || '').toLowerCase()
        const searchTerms = search.toLowerCase().split(' ').filter(t => t.trim() !== '')
        
        return medicines.filter(m => {
            if (companyLower && m.companyLower !== companyLower) return false
            if (searchTerms.length === 0) return true
            return searchTerms.every(t => m._searchKey.includes(t))
        }).slice(0, 1000)
    }, [showSearch, medicines, currentEntry.company, search])

    // History filtering
    const filteredBills = bills.filter(b => {
        const bDate = new Date(b.created_at + (b.created_at.includes('Z') ? '' : 'Z'))
        bDate.setHours(0, 0, 0, 0)
        
        if (fromDate) {
            const fd = new Date(fromDate)
            fd.setHours(0, 0, 0, 0)
            if (bDate < fd) return false
        }
        if (toDate) {
            const td = new Date(toDate)
            td.setHours(0, 0, 0, 0)
            if (bDate > td) return false
        }
        if (searchCustomer) {
            const cName = b.customer_name ? b.customer_name.toLowerCase() : 'walk-in'
            const sText = searchCustomer.toLowerCase()
            if (!cName.includes(sText) && !b.bill_number.toString().includes(sText)) {
                return false
            }
        }
        return true
    })
    
    const totalSalesHistory = filteredBills.reduce((sum, b) => sum + (Number(b.total_amount) || 0), 0)

    const inputStyle = {
        padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1',
        background: '#f8fafc', fontSize: '13px', fontFamily: 'Outfit, sans-serif', 
        outline: 'none', width: '100%', boxSizing: 'border-box', color: '#0f172a',
        fontWeight: '600'
    }
    
    const darkInputStyle = {
        padding: '6px 10px', borderRadius: '6px', border: '1px solid #166534',
        fontSize: '13px', fontFamily: 'Outfit, sans-serif', outline: 'none',
        width: '100%', boxSizing: 'border-box', background: '#0a1c12', color: '#fff'
    }
    
    const labelStyle = {
        fontSize: '11px', fontWeight: '700', color: '#64748b', marginBottom: '2px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em'
    }

    const sectionStyle = {
        background: '#ffffff',
        borderRadius: '8px',
        padding: '8px 12px',
        boxShadow: '0 2px 4px -1px rgba(0,0,0,0.05), 0 1px 2px -1px rgba(0,0,0,0.05)',
        border: '1px solid #e2e8f0',
        position: 'relative'
    }
    
    const legendStyle = {
        fontSize: '13px',
        fontWeight: '800',
        color: '#0f172a',
        marginBottom: '6px',
        borderBottom: '1px solid #f1f5f9',
        paddingBottom: '4px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
    }


    return (
        <>
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                {/* Toast Notification */}

            {toast.show && (
                <div style={{
                    position: 'fixed',
                    bottom: '32px',
                    right: '32px',
                    background: toast.type === 'success' ? '#10b981' : '#ef4444',
                    color: '#fff',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)',
                    fontWeight: '500',
                    fontSize: '14px',
                    zIndex: 99999,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    animation: 'fadeIn 0.3s ease-out'
                }}>
                    {toast.type === 'error' && (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="15" y1="9" x2="9" y2="15"></line>
                            <line x1="9" y1="9" x2="15" y2="15"></line>
                        </svg>
                    )}
                    {toast.msg}
                </div>
            )}

            {/* Bill Success Modal */}
            {successModal.show && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 100000
                }}>
                    <div style={{
                        background: '#fff',
                        padding: '24px',
                        borderRadius: '8px',
                        width: '320px',
                        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)'
                    }}>
                        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                            <div style={{ width: '48px', height: '48px', background: '#dcfce7', color: '#16a34a', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path></svg>
                            </div>
                            <h3 style={{ margin: 0, color: '#0f2d1f', fontSize: '18px' }}>Bill Created!</h3>
                            <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: '14px' }}>Bill No: <strong>{successModal.billNo}</strong></p>
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button 
                                onClick={() => {
                                    const tempId = successModal.billId;
                                    setSuccessModal({ show: false, billNo: '', billId: null });
                                    if (tempId) triggerInvoicePrint(tempId, true);
                                    setTimeout(() => document.getElementById('billing-company-input')?.focus(), 100);
                                }}
                                onMouseEnter={() => setSuccessFocus('print')}
                                style={{
                                    flex: 1,
                                    padding: '8px',
                                    background: successFocus === 'print' ? '#f0fdf4' : '#fff',
                                    border: successFocus === 'print' ? '1px solid #16a34a' : '1px solid #cbd5e1',
                                    color: successFocus === 'print' ? '#16a34a' : '#334155',
                                    borderRadius: '4px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    boxShadow: successFocus === 'print' ? '0 0 0 2px #fff, 0 0 0 4px #16a34a' : 'none',
                                    outline: 'none',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                Print
                            </button>
                            <button 
                                onClick={() => {
                                    setSuccessModal({ show: false, billNo: '', billId: null });
                                    setTimeout(() => document.getElementById('billing-company-input')?.focus(), 100);
                                }}
                                onMouseEnter={() => setSuccessFocus('ok')}
                                style={{
                                    flex: 1,
                                    padding: '8px',
                                    background: successFocus === 'ok' ? '#15803d' : '#16a34a',
                                    border: 'none',
                                    color: '#fff',
                                    borderRadius: '4px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    boxShadow: successFocus === 'ok' ? '0 0 0 2px #fff, 0 0 0 4px #16a34a' : 'none',
                                    outline: 'none',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                OK
                            </button>
                        </div>

                    </div>
                </div>
            )}

            {/* Clear Bill Confirmation Modal */}
            {showClearConfirm && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 100000
                }}>
                    <div style={{
                        background: '#fff',
                        padding: '24px',
                        borderRadius: '8px',
                        width: '400px',
                        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
                        textAlign: 'center',
                        animation: 'fadeIn 0.2s ease-out'
                    }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
                        <h3 style={{ margin: '0 0 12px 0', color: '#0f172a', fontSize: '20px' }}>Clear Bill?</h3>
                        <p style={{ margin: '0 0 24px 0', color: '#64748b', fontSize: '14px', lineHeight: '1.5' }}>
                            Are you sure you want to clear this entire bill? This action cannot be undone.
                        </p>
                        
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <button 
                                onClick={() => setShowClearConfirm(false)}
                                style={{
                                    flex: 1,
                                    padding: '10px',
                                    background: '#e2e8f0',
                                    border: 'none',
                                    color: '#475569',
                                    borderRadius: '6px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={() => {
                                    setItems([]);
                                    setBillDetails({ patientName: 'CASH', address: '-', prescribedBy: 'Self', discountRs: 0, otherCharges: 0, otherChargesType: 'E' });
                                    setCurrentEntry({ company: '', medicine: '', medicine_id: null, type: '', saleType: 'Sealed', power: '', packing: '', qty: '', price: '', disPercent: 10, gstPercent: 5, batch: '', gid: '', location: '', stock: 0 });
                                    localStorage.removeItem('retailDraft');
                                    setShowClearConfirm(false);
                                    showToast('Bill cleared successfully', 'success');
                                    setTimeout(() => {
                                        document.getElementById('billing-company-input')?.focus();
                                    }, 100);
                                }}
                                style={{
                                    flex: 1,
                                    padding: '10px',
                                    background: '#ef4444',
                                    border: 'none',
                                    color: '#fff',
                                    borderRadius: '6px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 6px -1px rgba(239, 68, 68, 0.3)',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                Yes, Clear It
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Held Bills Modal */}
            {showHeldModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', zIndex: 100000
                }}>
                    <div style={{ background: '#fff', padding: '24px', borderRadius: '8px', width: '500px', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <h3 style={{ margin: 0, color: '#0f2d1f', fontSize: '18px' }}>Held Bills</h3>
                            <button onClick={() => setShowHeldModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}>×</button>
                        </div>
                        {heldBills.length === 0 ? (
                            <p style={{ color: '#64748b' }}>No held bills.</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {heldBills.map(hold => (
                                    <div key={hold.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                                        <div>
                                            <div style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>{hold.billDetails.patientName}</div>
                                            <div style={{ fontSize: '12px', color: '#64748b' }}>{hold.items.length} items • ₹{hold.items.reduce((s, i) => s + i.amount, 0).toFixed(2)}</div>
                                            <div style={{ fontSize: '11px', color: '#94a3b8' }}>{new Date(hold.timestamp).toLocaleTimeString()}</div>
                                        </div>
                                        <button onClick={() => handleRestoreBill(hold.id)} style={{ background: '#10b981', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '12px' }}>
                                            Restore
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Top Toolbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                {isLocked && view === 'new' && (
                    <div style={{ position: 'absolute', top: '70px', left: '50%', transform: 'translateX(-50%)', background: '#fee2e2', color: '#991b1b', padding: '8px 24px', borderRadius: '8px', fontWeight: '700', fontSize: '14px', border: '1px solid #f87171', zIndex: 100, display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                        🔒 Financial Year is Locked. No modifications permitted.
                    </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#0f2d1f', margin: 0 }}>Retail Bill (B2C)</h2>
                    <div style={{ display: 'flex', gap: '4px', background: '#e2e8f0', padding: '4px', borderRadius: '8px' }}>
                        {['new', 'history'].filter(v => !(isLocked && v === 'new')).map(v => (
                            <button key={v} onClick={() => setView(v)} style={{
                                padding: '6px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                                fontSize: '13px', fontWeight: '600', transition: 'all 0.2s',
                                background: view === v ? '#0f2d1f' : 'transparent',
                                color: view === v ? '#fff' : '#64748b',
                            }}>
                                {v === 'new' ? 'New Bill' : 'History'}
                            </button>
                        ))}
                    </div>
                    {view === 'new' && (
                        <div style={{ display: 'flex', gap: '8px', marginLeft: '8px' }}>
                            <button onClick={handleHoldBill} title="Shortcut: F9" style={{ padding: '6px 12px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 4px rgba(245, 158, 11, 0.2)' }}>
                                ⏸ Hold Bill (F9)
                            </button>
                            {heldBills.length > 0 && (
                                <button onClick={() => setShowHeldModal(true)} style={{ padding: '6px 12px', background: '#fff', color: '#f59e0b', border: '1px solid #f59e0b', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    📂 Held Bills ({heldBills.length})
                                </button>
                            )}
                        </div>
                    )}
                </div>

            </div>

            {view === 'new' ? (
                <div style={{ display: 'flex', gap: '12px', flex: 1, minHeight: 0 }}>
                    {/* LEFT PANEL */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0, minHeight: 0 }}>
                        
                        {/* Company Section */}
                        <div style={sectionStyle}>
                            <div style={legendStyle}>Company</div>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                                <div style={{ flex: 2 }}>
                                    <label style={labelStyle}>Name</label>
                                    <AutocompleteDropdown 
                                        id="billing-company-input"
                                        inputStyle={inputStyle}
                                        value={currentEntry.company || ''}
                                        onChange={val => {
                                            setCurrentEntry({ ...currentEntry, company: val, medicine: '', type: '', packing: '', power: '' })
                                            setSearch('')
                                            setSelectedMed(null)
                                        }}
                                        options={companies}
                                        maxItems={1000}
                                        onEnter={(val) => {
                                            const finalVal = val || currentEntry.company;
                                            if (!finalVal) {
                                                showToast('Please select a company first', 'error');
                                                return;
                                            }
                                            document.getElementById('billing-company-type-select')?.focus()
                                        }}
                                        placeholder="Type or select company..."
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <select 
                                        id="billing-company-type-select"
                                        className="modern-input"
                                        style={inputStyle} 
                                        value={currentEntry.saleType || 'Sealed'} 
                                        onChange={e => setCurrentEntry({...currentEntry, saleType: e.target.value})}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                if (!currentEntry.company) {
                                                    showToast('Please select a company first', 'error');
                                                    document.getElementById('billing-company-input')?.focus();
                                                    return;
                                                }
                                                document.getElementById('billing-medicine-input')?.focus();
                                            }
                                        }}
                                    >
                                        <option>Sealed</option>
                                        <option>Loose</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Medicine Section */}
                        <div style={{ ...sectionStyle, opacity: !currentEntry.company ? 0.5 : 1, pointerEvents: !currentEntry.company ? 'none' : 'auto' }}>
                            <div style={{...legendStyle, color: '#2563eb'}}>Medicine</div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                                <div style={{ flex: 3, position: 'relative' }}>
                                    <label style={labelStyle}>Name</label>
                                    <input 
                                        id="billing-medicine-input"
                                        className="modern-input"
                                        style={{...inputStyle, fontWeight: '600'}} 
                                        value={search} 
                                        onChange={e => { setSearch(e.target.value); setShowSearch(true); setFocusedMedIndex(0); }}
                                        onFocus={() => setShowSearch(true)}
                                        onKeyDown={handleMedKeyDown}
                                        placeholder="Search medicine..."
                                        autoComplete="off"
                                    />
                                    {filtered.length > 0 && (
                                        <div style={{
                                            position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 99999,
                                            background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px',
                                            minWidth: '100%', width: 'max-content',
                                            maxHeight: '250px', overflowY: 'auto', boxSizing: 'border-box',
                                            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)'
                                        }}>
                                            {filtered.slice(0, 1000).map((m, idx) => {
                                                const isHighlighted = idx === focusedMedIndex
                                                return (
                                                    <div
                                                        key={m.id}
                                                        id={`billing-med-item-${idx}`}
                                                        onClick={() => selectMedicine(m)}
                                                        onMouseEnter={() => setFocusedMedIndex(idx)}
                                                        style={{
                                                            padding: '10px 10px', fontSize: '13px', fontFamily: 'Outfit, sans-serif', cursor: 'pointer',
                                                            borderBottom: '1px solid #f8fafc', background: isHighlighted ? '#ecfdf5' : '#fff',
                                                            color: isHighlighted ? '#059669' : '#334155', fontWeight: isHighlighted ? '600' : '500',
                                                            transition: 'all 0.15s ease'
                                                        }}
                                                    >
                                                        <span style={{ fontWeight: '700' }}>{m.name}</span>
                                                        {m.potency && <span style={{ background: '#f1f5f9', color: '#475569', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', marginLeft: '8px', fontWeight: '700' }}>{m.potency}</span>}
                                                        {m.unit && <span style={{ background: '#f8fafc', color: '#64748b', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', marginLeft: '4px', fontWeight: '600' }}>{m.unit}</span>}
                                                        {m.category && (
                                                            <span style={{ 
                                                                color: '#3b82f6', fontSize: '11px', marginLeft: '8px', fontWeight: '700'
                                                            }}>
                                                                [{m.category}]
                                                            </span>
                                                        )}
                                                        <span style={{ float: 'right', color: isHighlighted ? '#16a34a' : '#6b7280', fontSize: '11px' }}>
                                                            Qty: {(() => {
                                                                const cartQty = items.filter(item => item.medicine_id === m.id).reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
                                                                return Math.max(0, (m.stock_quantity || 0) - cartQty);
                                                            })()} {m.unit ? `| ${m.unit}` : ''}
                                                        </span>
                                                    </div>
                                                )
                                            })}
                                            {filtered.length > 1000 && (
                                                <div style={{ padding: '8px', textAlign: 'center', fontSize: '11px', color: '#6b7280', background: '#f8fafc' }}>
                                                    Keep typing to see more results...
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={labelStyle}>Type</label>
                                    <AutocompleteDropdown 
                                        id="billing-type-input"
                                        inputStyle={inputStyle}
                                        value={currentEntry.type || ''}
                                        onChange={val => setCurrentEntry({...currentEntry, type: val})}
                                        options={availableTypes}
                                        onEnter={() => document.getElementById('billing-packing-input')?.focus()}
                                        placeholder="Type..."
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={labelStyle}>Packing</label>
                                    <AutocompleteDropdown 
                                        id="billing-packing-input"
                                        inputStyle={inputStyle}
                                        value={currentEntry.packing || ''}
                                        onChange={val => setCurrentEntry({...currentEntry, packing: val})}
                                        options={availablePackings}
                                        onEnter={() => {
                                            if (hasPowerOptions) {
                                                document.getElementById('billing-power-input')?.focus();
                                            } else {
                                                document.getElementById('billing-view-locations-btn')?.focus();
                                            }
                                        }}
                                        placeholder="Packing..."
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={labelStyle}>Power</label>
                                    <AutocompleteDropdown 
                                        id="billing-power-input"
                                        inputStyle={hasPowerOptions ? inputStyle : { ...inputStyle, background: '#e2e8f0', color: '#64748b', cursor: 'not-allowed' }}
                                        value={currentEntry.power || ''}
                                        onChange={val => setCurrentEntry({...currentEntry, power: val})}
                                        options={availablePowers}
                                        onEnter={() => document.getElementById('billing-view-locations-btn')?.focus()}
                                        placeholder={hasPowerOptions ? "Power..." : "N/A"}
                                        readOnly={!hasPowerOptions}
                                        tabIndex={hasPowerOptions ? undefined : "-1"}
                                    />
                                </div>
                                <button 
                                    id="billing-view-locations-btn"
                                    onClick={() => handleViewLocations()} 
                                    className="modern-button"
                                    style={{ padding: '6px 14px', background: '#f8fafc', color: '#3b82f6', border: '1px solid #bfdbfe', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: '700', whiteSpace: 'nowrap' }}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') { e.preventDefault(); handleViewLocations(); }
                                    }}
                                >
                                    View Locations
                                </button>
                                <div style={{ 
                                    background: '#0f172a', color: '#4ade80', fontWeight: '800', fontSize: '13px',
                                    width: '40px', height: '32px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    {currentEntry.stock !== undefined ? currentEntry.stock : 0}
                                </div>
                            </div>
                        </div>

                        {/* Details Section */}
                        <div style={{ ...sectionStyle, opacity: !currentEntry.company ? 0.5 : 1, pointerEvents: !currentEntry.company ? 'none' : 'auto' }}>
                            <div style={legendStyle}>Details</div>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span style={{ fontSize: '12px', color: '#475569', fontWeight: '700', textTransform: 'uppercase' }}>Qty</span>
                                    <input 
                                        id="billing-qty-input"
                                        className="modern-input"
                                        style={{...inputStyle, width: '60px', textAlign: 'center'}} 
                                        type="number" 
                                        placeholder="0"
                                        value={currentEntry.qty} 
                                        onChange={e => {
                                            const val = e.target.value;
                                            if (currentEntry.batch_id && currentEntry.stock !== undefined && Number(val) > currentEntry.stock) {
                                                showToast(`Only ${currentEntry.stock} available in this location!`, 'error');
                                                setCurrentEntry({...currentEntry, qty: currentEntry.stock});
                                            } else {
                                                setCurrentEntry({...currentEntry, qty: val});
                                            }
                                        }} 
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                if (!currentEntry.qty || Number(currentEntry.qty) <= 0) {
                                                    showToast("Please enter a valid quantity", "error");
                                                    return;
                                                }
                                                document.getElementById('billing-price-input')?.focus();
                                            }
                                        }}
                                    />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontSize: '12px', color: '#475569', fontWeight: '700', textTransform: 'uppercase' }}>Price</span>
                                    <input 
                                        id="billing-price-input"
                                        className="modern-input"
                                        style={{...inputStyle, width: '80px', padding: '8px', textAlign: 'center'}} 
                                        type="number" 
                                        placeholder="0"
                                        value={currentEntry.price} 
                                        onChange={e => setCurrentEntry({...currentEntry, price: e.target.value})} 
                                        onBlur={e => {
                                            const val = e.target.value;
                                            if (val !== '') setCurrentEntry(prev => ({...prev, price: Number(val).toFixed(2)}));
                                        }}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                const val = e.target.value;
                                                if (val !== '') {
                                                    setCurrentEntry(prev => ({...prev, price: Number(val).toFixed(2)}));
                                                }
                                                document.getElementById('billing-dis-input')?.focus();
                                            }
                                        }}
                                    />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontSize: '12px', color: '#475569', fontWeight: '700', textTransform: 'uppercase' }}>Dis %</span>
                                    <input 
                                        id="billing-dis-input"
                                        className="modern-input"
                                        style={{...inputStyle, width: '60px', textAlign: 'center'}} 
                                        type="number" 
                                        value={currentEntry.disPercent} 
                                        onChange={e => setCurrentEntry({...currentEntry, disPercent: e.target.value})} 
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                document.getElementById('billing-add-btn')?.focus();
                                            }
                                        }}
                                    />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontSize: '12px', color: '#475569', fontWeight: '700', textTransform: 'uppercase' }}>GST %</span>
                                    <input 
                                        id="billing-gst-input"
                                        className="modern-input"
                                        style={{...inputStyle, width: '60px', textAlign: 'center', background: '#e2e8f0', color: '#64748b', cursor: 'not-allowed'}} 
                                        type="number" 
                                        value={currentEntry.gstPercent} 
                                        readOnly tabIndex="-1"
                                    />
                                </div>
                                <div style={{ flex: 1, textAlign: 'center', fontSize: '14px', fontWeight: '700', color: '#ef4444' }}>
                                    - ₹{((Number(currentEntry.price) || 0) * (Number(currentEntry.qty) || 0) * (Number(currentEntry.disPercent) || 0) / 100).toFixed(2)}
                                </div>
                                <div style={{ fontSize: '16px', fontWeight: '800', color: '#059669' }}>
                                    ₹{((Number(currentEntry.price) || 0) * (Number(currentEntry.qty) || 0) - ((Number(currentEntry.price) || 0) * (Number(currentEntry.qty) || 0) * (Number(currentEntry.disPercent) || 0) / 100)).toFixed(2)}
                                </div>
                                <button 
                                    id="billing-add-btn"
                                    onClick={handleAdd} 
                                    className="modern-button"
                                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 24px', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: '800', boxShadow: '0 4px 6px -1px rgba(16,185,129,0.3), 0 2px 4px -2px rgba(16,185,129,0.2)' }}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') { e.preventDefault(); handleAdd(); }
                                    }}
                                >
                                    <span>Add</span>
                                    <span style={{ fontSize: '11px', opacity: 0.8, fontWeight: '600', background: 'rgba(0,0,0,0.1)', padding: '2px 6px', borderRadius: '4px' }}>↵</span>
                                </button>
                            </div>
                        </div>


                        {/* Items Grid */}
                        <div style={{ ...sectionStyle, flex: 1, padding: '0', overflow: 'hidden', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                            <div style={legendStyle} className="table-header-padding">
                                <span style={{ padding: '16px 16px 0 16px' }}>Items Detail</span>
                            </div>
                            <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto' }}>
                                <table style={{ width: '100%', minWidth: '900px', borderCollapse: 'collapse', fontSize: '12px' }}>
                                    <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', zIndex: 10 }}>
                                        <tr style={{ color: '#64748b' }}>
                                            {['S.No', 'Company', 'Medicine', 'Power', 'Packing', 'Qty', 'Batch', 'Price', 'Amount', 'Dis %', 'Dis. Am', 'GST', 'GID', 'Location'].map(h => (
                                                <th key={h} style={{ padding: '10px 12px', borderBottom: '2px solid #e2e8f0', textAlign: 'left', fontWeight: '700' }}>{h}</th>
                                            ))}
                                            <th style={{ padding: '10px 12px', borderBottom: '2px solid #e2e8f0' }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map((item, idx) => (
                                            <tr key={item.id} style={{ background: idx % 2 === 0 ? '#ffffff' : '#f8fafc', borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }}>
                                                <td style={{ padding: '8px 12px' }}>{idx + 1}</td>
                                                <td style={{ padding: '8px 12px' }}>{item.company}</td>
                                                <td style={{ padding: '8px 12px', fontWeight: '600', color: '#0f2d1f' }}>{item.medicine}</td>
                                                <td style={{ padding: '8px 12px' }}>{item.power}</td>
                                                <td style={{ padding: '8px 12px' }}>{item.packing}</td>
                                                <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: '600', color: '#2563eb' }}>{item.qty}</td>
                                                <td style={{ padding: '8px 12px' }}>{item.batch}</td>
                                                <td style={{ padding: '8px 12px', textAlign: 'right' }}>{Number(item.price).toFixed(2)}</td>
                                                <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '500' }}>{Number(item.amount).toFixed(2)}</td>
                                                <td style={{ padding: '8px 12px', textAlign: 'right' }}>{item.disPercent}</td>
                                                <td style={{ padding: '8px 12px', textAlign: 'right', color: '#ef4444' }}>{Number(item.disAmount).toFixed(2)}</td>
                                                <td style={{ padding: '8px 12px', textAlign: 'right' }}>{item.gstPercent}</td>
                                                <td style={{ padding: '8px 12px' }}>{item.gid}</td>
                                                <td style={{ padding: '8px 12px', color: '#64748b' }}>{item.location}</td>
                                                <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                                    <button onClick={() => removeItem(item.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '15px', fontWeight: '700' }} title="Remove">✕</button>
                                                </td>
                                            </tr>
                                        ))}
                                        {items.length === 0 && (
                                            <tr>
                                                <td colSpan="15" style={{ padding: '64px', textAlign: 'center', color: '#94a3b8' }}>
                                                    <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>🛒</div>
                                                    <div style={{ fontSize: '16px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Empty Cart</div>
                                                    <div style={{ fontSize: '13px' }}>Select a company and search medicine to begin billing.</div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                    </div>

                    {/* RIGHT PANEL - Bill Summary */}
                    <div style={{ width: '280px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ ...sectionStyle, padding: '16px' }}>
                            <div style={{...legendStyle, color: '#3730a3', borderBottom: '2px solid #e0e7ff', paddingBottom: '8px', marginBottom: '10px'}}>Bill Summary</div>
                            
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '12px', fontWeight: '700' }}>
                                <div style={{ color: '#64748b' }}>No. <span style={{ color: '#dc2626' }}>{nextBillNumberStr}</span></div>
                                <div style={{ color: '#64748b' }}>Dt. <span style={{ color: '#dc2626' }}>{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-')}</span></div>
                            </div>

                            <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '12px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#0f172a', fontWeight: '700', fontSize: '13px' }}>
                                    <span>👤</span> Customer Info
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <div>
                                        <input className="modern-input" placeholder="Patient Name" style={{...inputStyle, padding: '10px 12px'}} value={billDetails.patientName} onChange={e => setBillDetails({...billDetails, patientName: e.target.value})} />
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <input className="modern-input" placeholder="Address" style={{...inputStyle, flex: 1}} value={billDetails.address} onChange={e => setBillDetails({...billDetails, address: e.target.value})} />
                                        <input className="modern-input" placeholder="Prescribed By" style={{...inputStyle, flex: 1}} value={billDetails.prescribedBy} onChange={e => setBillDetails({...billDetails, prescribedBy: e.target.value})} />
                                    </div>
                                </div>
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{...labelStyle, fontSize: '11px'}}>Bill Discount ₹</label>
                                        <input className="modern-input" style={{...inputStyle, textAlign: 'right'}} type="number" value={billDetails.discountRs} onChange={e => setBillDetails({...billDetails, discountRs: e.target.value})} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{...labelStyle, fontSize: '11px'}}>Other Charges</label>
                                        <input className="modern-input" style={{...inputStyle, textAlign: 'right'}} type="number" value={billDetails.otherCharges} onChange={e => setBillDetails({...billDetails, otherCharges: e.target.value})} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Totals Card */}
                        <div style={{ ...sectionStyle, padding: '14px 16px', background: '#f8fafc' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b', marginBottom: '6px' }}>
                                <span>Items: <b style={{ color: '#0f2d1f' }}>{items.length}</b></span>
                                <span>Qty: <b style={{ color: '#2563eb' }}>{totalQty}</b></span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                                <span style={{ color: '#64748b' }}>Subtotal</span>
                                <span style={{ fontWeight: '600' }}>{subtotal.toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                                <span style={{ color: '#64748b' }}>- Bill Discount</span>
                                <span style={{ fontWeight: '600', color: '#ef4444' }}>{billDiscountRs.toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                                <span style={{ color: '#64748b' }}>+ Other Charges</span>
                                <span style={{ fontWeight: '600' }}>{otherCharges.toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '8px' }}>
                                <span style={{ color: '#64748b' }}>Round</span>
                                <span style={{ fontWeight: '600' }}>{roundOff.toFixed(2)}</span>
                            </div>
                            <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '14px', fontWeight: '800', color: '#475569' }}>TOTAL</span>
                                <span style={{ fontSize: '36px', fontWeight: '900', color: '#1d4ed8', letterSpacing: '-0.02em', lineHeight: 1 }}>₹{finalTotal.toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginTop: '6px', color: '#16a34a', fontWeight: '600' }}>
                                <span>Total Saving</span>
                                <span>₹{totalSaving.toFixed(2)}</span>
                            </div>
                        </div>

                        <button id="billing-finalize-btn" onClick={handleBill} disabled={isLocked} className="modern-button" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', width: '100%', padding: '16px', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#ffffff', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(37,99,235,0.3), 0 4px 6px -2px rgba(37,99,235,0.2)' }}>
                            Finalise & Print <span style={{ fontSize: '12px', opacity: 0.8, fontWeight: '600', background: 'rgba(255,255,255,0.2)', padding: '2px 6px', borderRadius: '4px' }}>F2</span>
                        </button>
                        
                        {items.length > 0 && (
                            <button onClick={() => setShowClearConfirm(true)} className="modern-button" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', padding: '12px', background: '#fee2e2', color: '#dc2626', border: '1px solid #f87171', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', marginTop: '8px', transition: 'all 0.2s' }}>
                                Clear Bill
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <div style={{ display: 'flex', gap: '12px', height: '100%', minHeight: 0 }}>
                    {/* LEFT PANEL: Filters and Table */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0 }}>
                        {/* Filters Card */}
                        <div style={{...sectionStyle, display: 'flex', alignItems: 'flex-end', gap: '12px'}}>
                            <div style={legendStyle}>Filters</div>
                            <div style={{ flex: 1 }}>
                                <label style={labelStyle}>From Date</label>
                                <DateInput  value={fromDate} onChange={e => setFromDate(e.target.value)} style={inputStyle} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={labelStyle}>To Date</label>
                                <DateInput  value={toDate} onChange={e => setToDate(e.target.value)} style={inputStyle} />
                            </div>
                            <div style={{ flex: 2 }}>
                                <label style={labelStyle}>Search</label>
                                <input type="text" placeholder="Search Customer / Bill No..." value={searchCustomer} onChange={e => setSearchCustomer(e.target.value)} style={inputStyle} />
                            </div>
                            {(fromDate || toDate || searchCustomer) && (
                                <button className="modern-button" onClick={() => { setFromDate(''); setToDate(''); setSearchCustomer(''); }} style={{ padding: '8px 16px', background: '#e2e8f0', border: 'none', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', color: '#475569', fontWeight: '600' }}>Clear</button>
                            )}
                        </div>

                        {/* Table Card */}
                        <div style={{...sectionStyle, padding: '0', overflowY: 'auto', flex: 1}}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                                    <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #e2e8f0' }}>
                                        {['Bill No', 'Customer', 'Amount', 'Discount', 'Date', 'Action'].map(h => (
                                            <th key={h} style={{ padding: '12px 16px', textAlign: h === 'Action' ? 'right' : 'left', fontWeight: '700', color: '#334155', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredBills.length === 0 ? (
                                        <tr><td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>No bills found</td></tr>
                                    ) : filteredBills.map(b => (
                                        <tr key={b.id} style={{ borderBottom: '1px solid #e2e8f0', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                            <td style={{ padding: '12px 16px', fontWeight: '700', color: '#16a34a' }}>{b.bill_number}</td>
                                            <td style={{ padding: '12px 16px', fontWeight: '500', color: '#1e293b' }}>{b.customer_name || 'Walk-in'}</td>
                                            <td style={{ padding: '12px 16px', fontWeight: '700', color: '#0f172a' }}>₹{b.total_amount.toFixed(2)}</td>
                                            <td style={{ padding: '12px 16px', color: '#ef4444', fontWeight: '600' }}>₹{b.discount.toFixed(2)}</td>
                                            <td style={{ padding: '12px 16px', color: '#64748b', fontWeight: '500' }}>
                                                {new Date(b.created_at + (b.created_at.includes('Z') ? '' : 'Z')).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </td>
                                            <td style={{ padding: '12px 16px', textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                <button className="modern-button" onClick={async () => { const data = await window.api.getBillById(b.id); setViewBillModal({ show: true, data }); }} style={{ padding: '6px 14px', background: '#eff6ff', border: '1px solid #bfdbfe', color: '#2563eb', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: '600' }}>View</button>
                                                <button className="modern-button" onClick={() => triggerInvoicePrint(b.id)} style={{ padding: '6px 14px', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#475569', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: '600' }}>Print</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* RIGHT PANEL: Summary */}
                    <div style={{ width: '280px', display: 'flex', flexDirection: 'column', gap: '12px', flexShrink: 0 }}>
                        <div style={{ ...sectionStyle, padding: '24px 16px', background: '#f8fafc', textAlign: 'center' }}>
                            <div style={{ fontSize: '13px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Total Sale</div>
                            <div style={{ fontSize: '32px', fontWeight: '800', color: '#16a34a' }}>₹{totalSalesHistory.toFixed(2)}</div>
                            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '8px' }}>Based on current filters</div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Batch Selection Modal */}
            {batchModalOpen && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000
                }}>
                    <div style={{
                        background: '#fff', padding: '24px', borderRadius: '8px', width: '600px',
                        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
                        display: 'flex', flexDirection: 'column', gap: '16px'
                    }}>
                        <div style={{ fontSize: '18px', fontWeight: '700', color: '#0f2d1f' }}>Select Location/Batch for {pendingMedSelection?.name}</div>
                        <div style={{ fontSize: '13px', color: '#475569', marginBottom: '8px' }}>
                            Choose the location from where you are picking this medicine.
                        </div>
                        
                        <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                <thead>
                                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                        <th style={{ padding: '8px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Godown</th>
                                        <th style={{ padding: '8px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Location</th>
                                        <th style={{ padding: '8px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Batch</th>
                                        <th style={{ padding: '8px', textAlign: 'center', fontWeight: '600', color: '#475569' }}>Qty Available</th>
                                        <th style={{ padding: '8px', textAlign: 'right', fontWeight: '600', color: '#475569' }}>MRP</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {availableBatches.map((b, idx) => {
                                        const isFocused = idx === focusedBatchIndex;
                                        return (
                                            <tr 
                                                key={b.id} 
                                                id={`batch-row-${idx}`}
                                                onClick={() => continueAdd(b)}
                                                onMouseEnter={() => setFocusedBatchIndex(idx)}
                                                style={{ 
                                                    borderBottom: '1px solid #e2e8f0', 
                                                    background: isFocused ? '#fef3c7' : (idx % 2 === 0 ? '#fff' : '#f8fafc'),
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <td style={{ padding: '8px' }}>{b.godown}</td>
                                                <td style={{ padding: '8px', fontWeight: '600' }}>{b.location_type} {b.location_value}</td>
                                                <td style={{ padding: '8px' }}>{b.batch_no}</td>
                                                <td style={{ padding: '8px', textAlign: 'center', fontWeight: '700', color: '#2563eb' }}>{b.quantity}</td>
                                                <td style={{ padding: '8px', textAlign: 'right' }}>₹{b.mrp}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                            <button
                                onClick={() => setBatchModalOpen(false)}
                                style={{
                                    padding: '6px 16px', background: '#dc2626', border: 'none',
                                    borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: '700', color: '#fff'
                                }}
                            >Cancel</button>
                        </div>
                    </div>
                </div>
            )}
            {/* View Bill Modal */}
            {viewBillModal.show && viewBillModal.data && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100000
                }}>
                    <div style={{ background: '#ffffff', padding: '0', borderRadius: '12px', width: '650px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '20px 24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>Bill Details</h2>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '6px' }}>
                                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#3b82f6', background: '#eff6ff', padding: '2px 8px', borderRadius: '4px' }}>No. {viewBillModal.data.bill_number}</span>
                                    <span style={{ fontSize: '13px', color: '#64748b' }}>
                                        {new Date(viewBillModal.data.created_at.replace(' ', 'T') + 'Z').toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                                    </span>
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <p style={{ margin: 0, fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>Customer</p>
                                <p style={{ margin: '4px 0 0', fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>{viewBillModal.data.customer_name || 'Walk-in'}</p>
                            </div>
                        </div>

                        {/* Items Table */}
                        <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 10 }}>
                                    <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                                        <th style={{ padding: '12px 24px', textAlign: 'left', fontWeight: '700', color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Medicine</th>
                                        <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: '700', color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Batch</th>
                                        <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: '700', color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Location</th>
                                        <th style={{ padding: '12px 8px', textAlign: 'center', fontWeight: '700', color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Qty</th>
                                        <th style={{ padding: '12px 8px', textAlign: 'right', fontWeight: '700', color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Price</th>
                                        <th style={{ padding: '12px 8px', textAlign: 'right', fontWeight: '700', color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Disc %</th>
                                        <th style={{ padding: '12px 24px', textAlign: 'right', fontWeight: '700', color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {viewBillModal.data.items?.map((item, idx) => (
                                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                            <td style={{ padding: '12px 24px' }}>
                                                <div style={{ fontWeight: '600', color: '#1e293b' }}>{item.medicine_name}</div>
                                                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                                                    {item.potency} {item.unit} {item.company && `(${item.company})`}
                                                </div>
                                            </td>
                                            <td style={{ padding: '12px 8px', color: '#475569' }}>{item.batch_no || '-'}</td>
                                            <td style={{ padding: '12px 8px', color: '#475569', fontSize: '12px' }}>
                                                {item.godown ? `${item.godown} - ${item.location_type || ''} ${item.location_value || ''}` : '-'}
                                            </td>
                                            <td style={{ padding: '12px 8px', textAlign: 'center', fontWeight: '600', color: '#0f172a' }}>{item.quantity}</td>
                                            <td style={{ padding: '12px 8px', textAlign: 'right', color: '#475569' }}>₹{(item.unit_price || 0).toFixed(2)}</td>
                                            <td style={{ padding: '12px 8px', textAlign: 'right', color: '#16a34a' }}>
                                                {(() => {
                                                    const origTotal = (item.unit_price || 0) * (item.quantity || 0);
                                                    const discAmount = origTotal - (item.total_price || 0);
                                                    const discPercent = origTotal > 0 ? Math.round((discAmount / origTotal) * 100) : 0;
                                                    return discPercent > 0 ? `${discPercent}%` : '-';
                                                })()}
                                            </td>
                                            <td style={{ padding: '12px 24px', textAlign: 'right', fontWeight: '600', color: '#0f172a' }}>₹{(item.total_price || 0).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer Totals & Close */}
                        <div style={{ padding: '20px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <div>
                                    <p style={{ margin: 0, fontSize: '13px', color: '#64748b', fontWeight: '500' }}>Total Discount</p>
                                    <p style={{ margin: '4px 0 0', fontSize: '16px', color: '#f59e0b', fontWeight: '700' }}>₹{(viewBillModal.data.discount || 0).toFixed(2)}</p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <p style={{ margin: 0, fontSize: '13px', color: '#64748b', fontWeight: '500' }}>Total Paid Amount</p>
                                    <p style={{ margin: '4px 0 0', fontSize: '24px', fontWeight: '800', color: '#16a34a' }}>₹{(viewBillModal.data.total_amount || 0).toFixed(2)}</p>
                                </div>
                            </div>

                            <div style={{ textAlign: 'right' }}>
                                <button 
                                    className="modern-button"
                                    onClick={() => setViewBillModal({ show: false, data: null })} 
                                    style={{ padding: '10px 24px', background: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', fontSize: '13px' }}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            </div>
        </>
    )
}
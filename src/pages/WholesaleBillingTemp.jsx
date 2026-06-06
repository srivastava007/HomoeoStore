import { useState, useEffect } from 'react'
import WholesaleInvoicePrint from '../components/WholesaleInvoicePrint'
import DateInput from '../components/DateInput'

function AutocompleteDropdown({ value, onChange, options, onEnter, placeholder, id, inputStyle, readOnly, tabIndex, nameOnly, onEscape }) {
    const [show, setShow] = useState(false)
    const [focusedIdx, setFocusedIdx] = useState(-1)

    const filtered = show ? options.filter(o => {
        const searchStr = nameOnly ? o.name : (o.name + ' ' + (o.potency || ''));
        const searchTerms = String(value||'').toLowerCase().split(/\s+/).filter(Boolean);
        return searchTerms.every(term => searchStr.toLowerCase().includes(term));
    }).slice(0, 50) : []

    function handleKeyDown(e) {
        if (readOnly) {
            if (e.key === 'Enter') { e.preventDefault(); onEnter(); }
            return;
        }
        if (!show) {
            if (e.key === 'Enter') { e.preventDefault(); onEnter(); }
            if (e.key === 'Escape' && onEscape) { e.preventDefault(); e.stopPropagation(); onEscape(); return; }
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') setShow(true);
            return
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault()
            setFocusedIdx(prev => prev < filtered.length - 1 ? prev + 1 : prev)
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setFocusedIdx(prev => prev > 0 ? prev - 1 : prev)
        } else if (e.key === 'Enter') {
            e.preventDefault()
            if (focusedIdx >= 0 && focusedIdx < filtered.length) {
                onChange(filtered[focusedIdx])
                setShow(false)
                setFocusedIdx(-1)
                setTimeout(onEnter, 50)
            } else {
                setShow(false)
                onEnter()
            }
        } else if (e.key === 'Escape') {
            e.stopPropagation()
            setShow(false)
            setFocusedIdx(-1)
        }
    }

    return (
        <div style={{ position: 'relative', width: '100%' }}>
            <input 
                id={id}
                className="modern-input" style={inputStyle}
                value={value}
                onChange={e => { if (readOnly) return; onChange(e.target.value); setShow(true); setFocusedIdx(0); }}
                onFocus={() => { if (readOnly) return; setShow(true); setFocusedIdx(-1); }}
                onBlur={() => setTimeout(() => setShow(false), 200)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                autoComplete="off"
                readOnly={readOnly}
                tabIndex={tabIndex}
            />
            {show && filtered.length > 0 && (
                <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 9999,
                    background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px',
                    maxHeight: '180px', overflowY: 'auto', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
                }}>
                    {filtered.map((opt, idx) => {
                        const isHigh = idx === focusedIdx
                        return (
                            <div 
                                key={opt.id || opt.name || idx}
                                onClick={() => { onChange(opt); setShow(false); setTimeout(onEnter, 50); }}
                                onMouseEnter={() => setFocusedIdx(idx)}
                                style={{
                                    padding: '6px 12px', fontSize: '12px', cursor: 'pointer', fontFamily: 'Outfit, sans-serif',
                                    background: isHigh ? '#f0fdf4' : '#fff', color: isHigh ? '#16a34a' : '#1f2937',
                                    fontWeight: isHigh ? '600' : 'normal', borderBottom: '1px solid #f1f5f9'
                                }}
                            >
                                {opt.name} 
                                {!nameOnly && opt.company ? <span style={{ color: '#94a3b8', fontSize: '11px', marginLeft: '6px' }}>({opt.company})</span> : null}
                                {opt.potency ? <span style={{ color: '#64748b', fontSize: '11px', marginLeft: '6px' }}>{opt.potency}</span> : null}
                                {opt.unit ? <span style={{ color: '#64748b', fontSize: '11px', marginLeft: '6px' }}>{opt.unit}</span> : null}
                                {opt.category ? <span style={{ color: '#64748b', fontSize: '11px', marginLeft: '6px' }}>[{opt.category}]</span> : null}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

export default function WholesaleBilling() {
    const [medicines, setMedicines] = useState([])
    const [ledgers, setLedgers] = useState([])
    const [items, setItems] = useState([])
    const [itemToDelete, setItemToDelete] = useState(null)
    const [showResetConfirm, setShowResetConfirm] = useState(false)
    const [storeProfile, setStoreProfile] = useState({})
    const [printBill, setPrintBill] = useState(null)
    const [view, setView] = useState('new')
    const [wholesaleBills, setWholesaleBills] = useState([])
    const [selectedViewBill, setSelectedViewBill] = useState(null)
    const [exportModalVisible, setExportModalVisible] = useState(false)
    const [exportBillId, setExportBillId] = useState(null)
    const [companies, setCompanies] = useState([])
    const [mrs, setMrs] = useState([])
    const [loadingHistory, setLoadingHistory] = useState(false)
    const [historySearchTerm, setHistorySearchTerm] = useState('')
    const [isAutomatic, setIsAutomatic] = useState(true) // Default to true based on typical use cases
    const [toast, setToast] = useState({ show: false, msg: '', type: 'success' })

    const [billDetails, setBillDetails] = useState({
        ledgerId: '',
        billType: 'WS',
        billNumber: 'Loading...',
        billDate: new Date().toISOString().split('T')[0],
        challanNo: '',
        challanDate: '',
        orderNo: '',
        orderDate: '',
        grNo: '',
        grDate: '',
        reference: '',
        gstAcc: 'GST',
        saleRegister: 'SALES',
        sendThrough: '',
        documentsThrough: '',
        saleDestination: 'in_state',
        remark: ''
    })

    const [currentItem, setCurrentItem] = useState({
        medicineName: '',
        company: '',
        potency: '',
        packing: '',
        type: '',
        batchNo: '',
        quantity: '',
        freeQuantity: '',
        unitPrice: '',
        discountPercent: '',
        schemeDiscountPercent: '',
        box: '',
        gstRate: '',
        amount: '0',
        hsnCode: ''
    })

    // --- Issue Slip States ---
                                    // -------------------------

    function showToast(msg, type = 'success') {
        setToast({ show: true, msg, type })
        setTimeout(() => setToast({ show: false, msg: '', type: 'success' }), 3000)
    }

    useEffect(() => {
        loadData()
        loadStoreProfile()

        try {
            const draft = JSON.parse(localStorage.getItem('wholesaleDraft'));
            if (draft) {
                if (draft.items) setItems(draft.items);
                if (draft.billDetails) {
                    setBillDetails(prev => {
                        const { billNumber, ...restDraft } = draft.billDetails;
                        return { ...prev, ...restDraft };
                    });
                }
            }
        } catch (e) {}

        setTimeout(() => {
            document.getElementById('wb-party')?.focus();
        }, 100);
    }, [])

    useEffect(() => {
        if (items.length > 0) {
            localStorage.setItem('wholesaleDraft', JSON.stringify({ items, billDetails }));
        } else {
            localStorage.removeItem('wholesaleDraft');
        }
    }, [items, billDetails]);

    async function loadStoreProfile() {
        try {
            const profile = await window.api.getStoreProfile()
            setStoreProfile(profile || {})
        } catch (e) {
            console.error('Failed to load store profile', e)
        }
    }

    async function loadData() {
        const meds = await window.api.getMedicines()
        setMedicines(meds || [])

        const ledgs = await window.api.getLedgers()
        // Filter out internal system accounts (case-insensitive)
        const filtered = ledgs.filter(l => {
            const name = (l.ledger_name || '').toUpperCase();
            return name !== 'PURCHASE ACCOUNT' && name !== 'SALES ACCOUNT';
        });
        setLedgers(filtered)

        const comps = await window.api.getCompanies()
        setCompanies(comps || [])
        
        const mrData = await window.api.getMRs()
        setMrs(mrData || [])

        const nextNo = await window.api.getNextWholesaleBillNumber()
        setBillDetails(prev => ({ ...prev, billNumber: nextNo }))
    }

    async function loadHistory() {
        setLoadingHistory(true)
        try {
            const data = await window.api.getWholesaleBills()
            setWholesaleBills(data || [])
        } catch (error) {
            showToast('Failed to load history', 'error')
        } finally {
            setLoadingHistory(false)
        }
    }

    

    

    
    async function handleViewBill(id) {
        try {
            const billData = await window.api.getWholesaleBillById(id);
            setSelectedViewBill(billData);
        } catch (error) {
            showToast('Failed to fetch bill details', 'error');
        }
    }

    async function handlePrintBill(id) {
        try {
            const billData = await window.api.getWholesaleBillById(id);
            setPrintBill(billData);
            setTimeout(() => {
                window.api.printWindow();
            }, 500);
        } catch (error) {
            showToast('Failed to prepare bill for printing', 'error');
        }
    }

    function openExportModal(id) {
        setExportBillId(id);
        setExportModalVisible(true);
    }

    async function handleExportBill(copyType) {
        if (!exportBillId) return;
        try {
            const billData = await window.api.getWholesaleBillById(exportBillId);
            if (!billData) return showToast('Bill details not found', 'error');
            
            const res = await window.api.exportWholesalePdf(billData, storeProfile, copyType);
            
            if (res.success) {
                showToast('PDF Exported Successfully!', 'success');
            } else if (!res.canceled) {
                showToast('Failed to export PDF', 'error');
            }
        } catch (error) {
            showToast('Failed to export bill', 'error');
        }
        setExportModalVisible(false);
        setExportBillId(null);
    }

    useEffect(() => {
        const q = Number(currentItem.quantity) || 0;
        const rate = Number(currentItem.unitPrice) || 0;
        const inputDis = Number(currentItem.discountPercent) || 0;
        const sdis = Number(currentItem.schemeDiscountPercent) || 0;
        const gst = Number(currentItem.gstRate) || 0;

        let gross = q * rate;
        let effectiveDis = inputDis;

        if (isAutomatic && gst > 0) {
            // Target final amount after discount (tax inclusive)
            const targetFinal = gross * (1 - inputDis / 100);
            // Gross required to reach that target final after adding GST
            let tempGross = targetFinal / (1 + gst / 100);
            // Effective discount on base rate to reach this gross
            if (q * rate > 0) {
                let calcDis = 100 - (tempGross / (q * rate) * 100);
                effectiveDis = Math.round(calcDis * 100) / 100;
                gross = (q * rate) * (1 - effectiveDis / 100);
            }
        } else {
            if (inputDis > 0) gross = gross - (gross * inputDis / 100);
        }

        if (sdis > 0) gross = gross - (gross * sdis / 100);
        gross = Math.round(gross * 100) / 100;

        let gstAmt = 0;
        if (billDetails.saleDestination === 'in_state') {
            const halfGst = gst / 2;
            const cgst = Math.round(gross * (halfGst / 100) * 100) / 100;
            const sgst = Math.round(gross * (halfGst / 100) * 100) / 100;
            gstAmt = cgst + sgst;
        } else {
            gstAmt = Math.round(gross * (gst / 100) * 100) / 100;
        }

        const finalAmt = gross + gstAmt;
        setCurrentItem(prev => ({ 
            ...prev, 
            amount: finalAmt.toFixed(2), 
            grossTotal: gross,
            computedDiscount: effectiveDis 
        }))
    }, [currentItem.quantity, currentItem.unitPrice, currentItem.discountPercent, currentItem.schemeDiscountPercent, currentItem.gstRate, billDetails.saleDestination, isAutomatic])

    function handleAddItem() {
        if (!currentItem.company) {
            showToast('Please select Company first', 'error')
            document.getElementById('wb-company')?.focus()
            return
        }
        if (!currentItem.medicineName || !currentItem.quantity) {
            showToast('Please enter Medicine Name and Quantity', 'error')
            return
        }

        const med = medicines.find(m => m.name === currentItem.medicineName)
        if (!med) {
            showToast('Medicine not found!', 'error')
            return
        }

        setItems([...items, { 
            ...currentItem, 
            discountPercent: currentItem.computedDiscount !== undefined ? currentItem.computedDiscount.toFixed(2) : currentItem.discountPercent,
            medicine_id: med.id, 
            hsn_code: med.hsn_code || '',
            id: Date.now() 
        }])
        setCurrentItem({
            medicineName: '', company: '', potency: '', packing: '', type: '', batchNo: '',
            quantity: '', freeQuantity: '0', unitPrice: '', discountPercent: '0',
            schemeDiscountPercent: '0', box: '0', gstRate: '', amount: '0', hsnCode: ''
        })
        setTimeout(() => {
            document.getElementById('wb-company')?.focus()
        }, 50)
    }

    function removeItem(id) {
        setItemToDelete(id)
    }

    function confirmRemove() {
        if (itemToDelete) {
            setItems(items.filter(i => i.id !== itemToDelete))
            setItemToDelete(null)
        }
    }

    const totals = items.reduce((acc, item) => {
        const q = Number(item.quantity) || 0;
        const rate = Number(item.unitPrice) || 0;
        const dis = Number(item.discountPercent) || 0;
        const sdis = Number(item.schemeDiscountPercent) || 0;
        const gst = Number(item.gstRate) || 0;

        let gross = q * rate;
        let originalGross = gross;
        
        if (dis > 0) gross = gross - (gross * dis / 100);
        if (sdis > 0) gross = gross - (gross * sdis / 100);
        gross = Math.round(gross * 100) / 100;

        let gstAmt = 0;
        let cgst = 0;
        let sgst = 0;
        let igst = 0;

        if (billDetails.saleDestination === 'in_state') {
            const halfGst = gst / 2;
            cgst = Math.round(gross * (halfGst / 100) * 100) / 100;
            sgst = Math.round(gross * (halfGst / 100) * 100) / 100;
            gstAmt = cgst + sgst;
        } else {
            igst = Math.round(gross * (gst / 100) * 100) / 100;
            gstAmt = igst;
        }

        const discountAmt = originalGross - gross;

        acc.gross += gross;
        acc.discount += discountAmt;
        acc.gst += gstAmt;
        acc.cgst += cgst;
        acc.sgst += sgst;
        acc.igst += igst;
        return acc;
    }, { gross: 0, discount: 0, gst: 0, cgst: 0, sgst: 0, igst: 0 })

    const totalAmount = totals.gross + totals.gst
    const roundedNet = totalAmount
    const roundOff = 0

    async function handleSaveBill() {
        if (!billDetails.ledgerId) return showToast('Please select a Party', 'error')
        if (items.length === 0) return showToast('Please add at least one item', 'error')

        const payload = {
            ledger_id: billDetails.ledgerId,
            bill_number: billDetails.billNumber,
            bill_date: billDetails.billDate,
            bill_type: billDetails.billType,
            challan_no: billDetails.challanNo,
            challan_date: billDetails.challanDate,
            order_no: billDetails.orderNo,
            order_date: billDetails.orderDate,
            gr_no: billDetails.grNo,
            gr_date: billDetails.grDate,
            reference: billDetails.reference,
            gst_acc: billDetails.gstAcc,
            sale_register: billDetails.saleRegister,
            send_through: billDetails.sendThrough,
            documents_through: billDetails.documentsThrough,
            sale_destination: billDetails.saleDestination,
            medical_rep: '', // Not used separately anymore
            remark: billDetails.remark,
            total_amount: totals.gross,
            total_discount: totals.discount,
            round_off: roundOff,
            net_amount: roundedNet,
            items: items.map(i => {
                let cgstRate = 0, sgstRate = 0, igstRate = 0;
                if (billDetails.saleDestination === 'in_state') {
                    cgstRate = Number(i.gstRate)/2;
                    sgstRate = Number(i.gstRate)/2;
                } else {
                    igstRate = Number(i.gstRate);
                }
                return {
                    medicine_id: i.medicine_id,
                    batch_id: i.batchNo ? i.batchNo.split(' (')[0] : null,
                    hsn_code: i.hsnCode,
                    quantity: Number(i.quantity) || 0,
                    free_quantity: Number(i.freeQuantity) || 0,
                    unit_price: Number(i.unitPrice) || 0,
                    discount_percent: Number(i.discountPercent) || 0,
                    scheme_discount_percent: Number(i.schemeDiscountPercent) || 0,
                    box: Number(i.box) || 0,
                    gross_total: Number(i.grossTotal) || 0,
                    cgst_rate: cgstRate,
                    sgst_rate: sgstRate,
                    igst_rate: igstRate,
                    total_price: Number(i.amount) || 0
                }
            })
        }

        try {
            await window.api.createWholesaleBill(payload)
            showToast('Wholesale Bill Saved Successfully!', 'success')
            setItems([])
            const nextNo = await window.api.getNextWholesaleBillNumber()
            setBillDetails(prev => ({ ...prev, challanNo: '', orderNo: '', remark: '', reference: '', ledgerId: '', billNumber: nextNo }))
            localStorage.removeItem('wholesaleDraft');
        } catch (e) {
            showToast('Failed to save Wholesale Bill', 'error')
            console.error(e)
        }
    }

    async function executeResetBill() {
        setItems([]);
        const nextNo = await window.api.getNextWholesaleBillNumber();
        setBillDetails({
            ledgerId: '', billType: 'WS', billNumber: nextNo, 
            billDate: new Date().toISOString().split('T')[0],
            challanNo: '', challanDate: '', orderNo: '', orderDate: '',
            grNo: '', grDate: '', reference: '', gstAcc: 'GST',
            saleRegister: 'SALES', sendThrough: '', documentsThrough: '',
            saleDestination: 'in_state', remark: ''
        });
        setCurrentItem({
            medicineName: '', company: '', potency: '', packing: '', type: '', batchNo: '',
            quantity: '', freeQuantity: '0', unitPrice: '', discountPercent: '0',
            schemeDiscountPercent: '0', box: '0', gstRate: '', amount: '0'
        });
        localStorage.removeItem('wholesaleDraft');
        setShowResetConfirm(false);
        showToast('Bill Reset Successfully', 'success');
        setTimeout(() => document.getElementById('wb-party')?.focus(), 100);
    }

    // --- Issue Slip Functions ---
    async function handleIssueMedicineSelect(med) {
        if (med) {
            setCurrentIssueEntry({
                ...currentIssueEntry,
                medicine_id: med.id,
                medicine_name: med.name,
                company: med.company,
                power: med.potency,
                packing: med.unit || '',
                type: med.category,
                quantity: '1',
                discount_rs: '0.00',
                batch_id: '', batch_number: '', mrp: '', loc: ''
            })
            try {
                const batches = await window.api.getStockBatches(med.id)
                if (batches && batches.length > 0) {
                    setIssueLiveBatches(batches)
                    setIssueFocusedBatchIdx(0)
                    setIssueLocationsModalVisible(true)
                    setTimeout(() => {
                        const modal = document.getElementById('issue-batch-modal')
                        if (modal) modal.focus()
                    }, 100)
                } else {
                    showToast('No stock locations available for this medicine', 'error')
                }
            } catch (e) {
                console.error(e)
                showToast('Failed to load batches', 'error')
            }
        }
    }

    

    async function handleSaveIssueSlip() {
        if (!issueDetails.ledgerId) return showToast('Please select Issued To (Party)', 'error')
        if (issueItems.length === 0) return showToast('Please add at least one item', 'error')

        const payload = {
            ledger_id: issueDetails.ledgerId,
            issue_date: issueDetails.issueDate,
            items: issueItems.map(i => ({
                medicine_id: i.medicine_id,
                batch_id: i.batch_id,
                quantity: Number(i.quantity),
                mrp: Number(i.mrp),
                discount_rs: Number(i.discount_rs)
            }))
        }

        try {
            await window.api.createIssueSlip(payload)
            showToast('Issue Slip saved successfully!', 'success')
            setIssueItems([])
            setIssueDetails({ ...issueDetails, ledgerId: '' })
        } catch (e) {
            console.error(e)
            showToast('Failed to save Issue Slip', 'error')
        }
    }
    // ----------------------------

    function handleResetBill() {
        setShowResetConfirm(true);
    }

    const inputStyle = { width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }
    const labelStyle = { display: 'block', fontSize: '11px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }

    return (
        <>
            <div className="no-print" style={{ padding: '24px', background: '#f8fafc', minHeight: '100vh', fontFamily: 'Outfit, sans-serif' }}>
            {toast.show && (
                <div style={{ position: 'fixed', bottom: '24px', right: '24px', background: toast.type === 'success' ? '#10b981' : '#ef4444', color: '#fff', padding: '12px 24px', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', zIndex: 9999, fontWeight: '600' }}>
                    {toast.msg}
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#0f2d1f', margin: 0 }}>Wholesale Bill (B2B)</h2>
                    <div style={{ display: 'flex', gap: '4px', background: '#e2e8f0', padding: '4px', borderRadius: '8px' }}>
                        {['new', 'history', 'issue_slip', 'issue_history'].map(v => (
                            <button key={v} onClick={() => {
                                setView(v)
                                if (v === 'issue_history') loadIssueHistory()
                            }} style={{
                                padding: '6px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                                fontSize: '13px', fontWeight: '600', transition: 'all 0.2s',
                                background: view === v ? '#0f2d1f' : 'transparent',
                                color: view === v ? '#fff' : '#64748b',
                            }}>
                                {v === 'new' ? 'New Bill' : v === 'history' ? 'History' : v === 'issue_slip' ? 'Issue Slip' : 'Issue History'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {view === 'history' ? (
                <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                    <div style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, fontSize: '16px', color: '#0f172a' }}>Wholesale Bills History</h3>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <input 
                                type="text" 
                                placeholder="Search Bill No or Party..." 
                                value={historySearchTerm}
                                onChange={e => setHistorySearchTerm(e.target.value)}
                                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', width: '220px', outline: 'none' }}
                            />
                            <button onClick={loadHistory} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontWeight: '600', cursor: 'pointer' }}>Refresh</button>
                        </div>
                    </div>
                    {loadingHistory ? (
                        <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>Loading history...</div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                <tr>
                                    <th style={{ padding: '12px 24px', fontSize: '12px', fontWeight: '600', color: '#475569' }}>Date</th>
                                    <th style={{ padding: '12px 24px', fontSize: '12px', fontWeight: '600', color: '#475569' }}>Bill No</th>
                                    <th style={{ padding: '12px 24px', fontSize: '12px', fontWeight: '600', color: '#475569' }}>Party Name</th>
                                    <th style={{ padding: '12px 24px', fontSize: '12px', fontWeight: '600', color: '#475569' }}>Type</th>
                                    <th style={{ padding: '12px 24px', fontSize: '12px', fontWeight: '600', color: '#475569' }}>Amount</th>
                                    <th style={{ padding: '12px 24px', fontSize: '12px', fontWeight: '600', color: '#475569' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {wholesaleBills.filter(bill => !historySearchTerm || bill.bill_number.toLowerCase().includes(historySearchTerm.toLowerCase()) || (bill.party_name && bill.party_name.toLowerCase().includes(historySearchTerm.toLowerCase()))).map(bill => (
                                    <tr key={bill.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '12px 24px', fontSize: '13px', color: '#0f172a' }}>{new Date(bill.bill_date).toLocaleDateString('en-IN')}</td>
                                        <td style={{ padding: '12px 24px', fontSize: '13px', color: '#3b82f6', fontWeight: '600' }}>{bill.bill_number}</td>
                                        <td style={{ padding: '12px 24px', fontSize: '13px', color: '#0f172a' }}>{bill.party_name}</td>
                                        <td style={{ padding: '12px 24px', fontSize: '13px', color: '#64748b' }}>{bill.bill_type}</td>
                                        <td style={{ padding: '12px 24px', fontSize: '13px', color: '#10b981', fontWeight: '600' }}>₹{bill.net_amount?.toFixed(2)}</td>
                                        <td style={{ padding: '12px 24px' }}>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button onClick={() => handleViewBill(bill.id)} style={{ padding: '4px 10px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>View</button>
                                                <button onClick={() => handlePrintBill(bill.id)} style={{ padding: '4px 10px', background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>Print</button>
                                                <button onClick={() => openExportModal(bill.id)} style={{ padding: '4px 10px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>Export</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {wholesaleBills.length === 0 && (
                                    <tr><td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>No bills found</td></tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            ) : view === 'issue_history' ? (
                <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                    <div style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, fontSize: '16px', color: '#0f172a' }}>Issue Slips History</h3>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <button onClick={loadIssueHistory} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontWeight: '600', cursor: 'pointer' }}>Refresh</button>
                        </div>
                    </div>
                    {loadingHistory ? (
                        <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>Loading history...</div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                <tr>
                                    <th style={{ padding: '12px 24px', fontSize: '12px', fontWeight: '600', color: '#475569' }}>Date</th>
                                    <th style={{ padding: '12px 24px', fontSize: '12px', fontWeight: '600', color: '#475569' }}>Issue No</th>
                                    <th style={{ padding: '12px 24px', fontSize: '12px', fontWeight: '600', color: '#475569' }}>Party Name</th>
                                    <th style={{ padding: '12px 24px', fontSize: '12px', fontWeight: '600', color: '#475569' }}>Total Items</th>
                                    <th style={{ padding: '12px 24px', fontSize: '12px', fontWeight: '600', color: '#475569' }}>Total Qty</th>
                                    <th style={{ padding: '12px 24px', fontSize: '12px', fontWeight: '600', color: '#475569' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {issueSlipsHistory.map(slip => (
                                    <tr key={slip.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '12px 24px', fontSize: '13px', color: '#334155' }}>{new Date(slip.issue_date).toLocaleDateString('en-GB')}</td>
                                        <td style={{ padding: '12px 24px', fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>{slip.issue_number}</td>
                                        <td style={{ padding: '12px 24px', fontSize: '13px', color: '#334155' }}>{slip.party_name}</td>
                                        <td style={{ padding: '12px 24px', fontSize: '13px', color: '#334155' }}>{slip.total_items}</td>
                                        <td style={{ padding: '12px 24px', fontSize: '13px', color: '#334155' }}>{slip.total_qty}</td>
                                        <td style={{ padding: '12px 24px', fontSize: '13px' }}>
                                            <button onClick={() => handleViewIssueSlip(slip.id)} style={{ padding: '6px 12px', background: '#e0f2fe', color: '#0369a1', border: 'none', borderRadius: '4px', fontWeight: '600', cursor: 'pointer', marginRight: '8px' }}>View</button>
                                        </td>
                                    </tr>
                                ))}
                                {issueSlipsHistory.length === 0 && (
                                    <tr>
                                        <td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>No issue slips found</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}

                    {selectedIssueSlip && (
                        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                            <div style={{ background: '#fff', width: '800px', borderRadius: '12px', maxHeight: '90vh', overflowY: 'auto', padding: '24px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                    <h2 style={{ margin: 0, color: '#0f172a' }}>Issue Slip Details</h2>
                                    <button onClick={() => setSelectedIssueSlip(null)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#64748b' }}>&times;</button>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px', padding: '16px', background: '#f8fafc', borderRadius: '8px' }}>
                                    <div>
                                        <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#64748b' }}>Issue Number</p>
                                        <p style={{ margin: 0, fontWeight: '600', color: '#0f172a' }}>{selectedIssueSlip.issue_number}</p>
                                    </div>
                                    <div>
                                        <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#64748b' }}>Date</p>
                                        <p style={{ margin: 0, fontWeight: '600', color: '#0f172a' }}>{new Date(selectedIssueSlip.issue_date).toLocaleDateString('en-GB')}</p>
                                    </div>
                                    <div style={{ gridColumn: '1 / -1' }}>
                                        <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#64748b' }}>Party Name</p>
                                        <p style={{ margin: 0, fontWeight: '600', color: '#0f172a' }}>{selectedIssueSlip.party_name}</p>
                                    </div>
                                </div>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                    <thead style={{ background: '#f1f5f9' }}>
                                        <tr>
                                            <th style={{ padding: '10px 12px', fontSize: '12px', color: '#475569', fontWeight: '600' }}>Medicine</th>
                                            <th style={{ padding: '10px 12px', fontSize: '12px', color: '#475569', fontWeight: '600' }}>Company</th>
                                            <th style={{ padding: '10px 12px', fontSize: '12px', color: '#475569', fontWeight: '600' }}>Power/Pack</th>
                                            <th style={{ padding: '10px 12px', fontSize: '12px', color: '#475569', fontWeight: '600' }}>Batch</th>
                                            <th style={{ padding: '10px 12px', fontSize: '12px', color: '#475569', fontWeight: '600' }}>Loc</th>
                                            <th style={{ padding: '10px 12px', fontSize: '12px', color: '#475569', fontWeight: '600' }}>Qty</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedIssueSlip.items?.map((item, idx) => (
                                            <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                <td style={{ padding: '10px 12px', fontSize: '13px' }}>{item.medicine_name}</td>
                                                <td style={{ padding: '10px 12px', fontSize: '13px' }}>{item.company}</td>
                                                <td style={{ padding: '10px 12px', fontSize: '13px' }}>{item.potency} | {item.packing}</td>
                                                <td style={{ padding: '10px 12px', fontSize: '13px' }}>{item.batch_number || '-'}</td>
                                                <td style={{ padding: '10px 12px', fontSize: '13px' }}>
                                                    {item.location_type && item.location_value ? `${item.godown || 'G1'} (${item.location_type} ${item.location_value})` : (item.godown || item.loc || 'G1')}
                                                </td>
                                                <td style={{ padding: '10px 12px', fontSize: '13px', fontWeight: '600' }}>{item.quantity}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            ) : view === 'issue_slip' ? (
                <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ background: '#ecfdf5', padding: '16px', borderRadius: '12px', border: '1px solid #10b981', marginBottom: '16px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'end' }}>
                                <div>
                                    <label style={{ ...labelStyle, color: '#047857' }}>Issued To (Sundry Debtors)</label>
                                    <select 
                                        id="issue-ledger"
                                        value={issueDetails.ledgerId} 
                                        onChange={e => setIssueDetails({...issueDetails, ledgerId: e.target.value})}
                                        onKeyDown={e => { if (e.key === 'Enter') document.getElementById('issue-date')?.focus(); }}
                                        style={{ ...inputStyle, borderColor: '#34d399', background: '#fff' }}
                                    >
                                        <option value="">-- Select Party --</option>
                                        {ledgers.map(l => <option key={l.id} value={l.id}>{l.ledger_name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ ...labelStyle, color: '#047857' }}>Issue Date</label>
                                    <DateInput id="issue-date"
                                         
                                        value={issueDetails.issueDate} 
                                        onChange={e => setIssueDetails({...issueDetails, issueDate: e.target.value})}
                                        onKeyDown={e => { 
                                            if (e.key === 'Enter') document.getElementById('issue-company')?.focus(); 
                                            if (e.key === 'Escape') document.getElementById('issue-ledger')?.focus();
                                        }}
                                        style={{ ...inputStyle, borderColor: '#34d399', background: '#fff' }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Issue Entry Form */}
                        <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '16px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr 1fr 1fr 0.8fr', gap: '12px', marginBottom: '12px' }}>
                                <div>
                                    <label style={labelStyle}>Company</label>
                                    <AutocompleteDropdown 
                                        id="issue-company"
                                        options={companies.map(c => ({name: c.name}))}
                                        value={currentIssueEntry.company}
                                        onChange={v => setCurrentIssueEntry({...currentIssueEntry, company: typeof v === 'string' ? v : v.name, medicine_name: ''})}
                                        onEnter={() => document.getElementById('issue-med')?.focus()}
                                        onEscape={() => document.getElementById('issue-date')?.focus()}
                                        placeholder="Select company..."
                                        inputStyle={inputStyle}
                                    />
                                </div>
                                <div>
                                    <label style={labelStyle}>Medicine</label>
                                    <AutocompleteDropdown 
                                        id="issue-med"
                                        options={currentIssueEntry.company ? medicines.filter(m => m.company && String(m.company).trim().toLowerCase() === String(currentIssueEntry.company).trim().toLowerCase()) : medicines} 
                                        value={currentIssueEntry.medicine_name}
                                        onChange={handleIssueMedicineSelect}
                                        onEscape={() => document.getElementById('issue-company')?.focus()}
                                        placeholder="Type to search..." 
                                        inputStyle={inputStyle}
                                        nameOnly
                                    />
                                </div>
                                <div><label style={labelStyle}>Type</label><input type="text" value={currentIssueEntry.type} readOnly style={{ ...inputStyle, background: '#f8fafc' }} /></div>
                                <div><label style={labelStyle}>Power</label><input type="text" value={currentIssueEntry.power} readOnly style={{ ...inputStyle, background: '#f8fafc' }} /></div>
                                <div><label style={labelStyle}>Packing</label><input type="text" value={currentIssueEntry.packing} readOnly style={{ ...inputStyle, background: '#f8fafc' }} /></div>
                                <div>
                                    <label style={labelStyle}>Qty</label>
                                    <input id="issue-qty-input" type="number" value={currentIssueEntry.quantity} onChange={e => setCurrentIssueEntry({...currentIssueEntry, quantity: e.target.value})} onKeyDown={e => { 
                                        if (e.key === 'Enter') document.getElementById('issue-dis')?.focus(); 
                                        if (e.key === 'Escape') document.getElementById('issue-med')?.focus();
                                    }} style={inputStyle} />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 0.5fr', gap: '12px', alignItems: 'end' }}>
                                <div><label style={labelStyle}>Location (Selected)</label><input type="text" value={currentIssueEntry.loc || 'Not Selected'} readOnly style={{ ...inputStyle, background: '#f8fafc' }} /></div>
                                <div><label style={labelStyle}>Batch</label><input type="text" value={currentIssueEntry.batch_number} readOnly style={{ ...inputStyle, background: '#f8fafc' }} /></div>
                                <div><label style={labelStyle}>MRP</label><input type="text" value={currentIssueEntry.mrp} readOnly style={{ ...inputStyle, background: '#f8fafc' }} /></div>
                                <div><label style={labelStyle}>Dis Rs.</label><input id="issue-dis" type="number" value={currentIssueEntry.discount_rs} onChange={e => setCurrentIssueEntry({...currentIssueEntry, discount_rs: e.target.value})} onKeyDown={e => { 
                                    if (e.key === 'Enter') { e.preventDefault(); handleIssueAdd(); } 
                                    if (e.key === 'Escape') document.getElementById('issue-qty-input')?.focus();
                                }} style={inputStyle} /></div>
                                <div><button id="issue-add-btn" onClick={handleIssueAdd} style={{ padding: '8px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', width: '100%' }}>Add</button></div>
                            </div>
                        </div>

                        {/* Issue Items Grid */}
                        <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden', minHeight: '150px', marginBottom: '16px' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead style={{ background: '#14452f', color: '#fff' }}>
                                    <tr>
                                        <th style={{ padding: '10px 12px', fontSize: '11px', fontWeight: '600' }}>SNo</th>
                                        <th style={{ padding: '10px 12px', fontSize: '11px', fontWeight: '600' }}>Medicine</th>
                                        <th style={{ padding: '10px 12px', fontSize: '11px', fontWeight: '600' }}>Company</th>
                                        <th style={{ padding: '10px 12px', fontSize: '11px', fontWeight: '600' }}>Type/Power/Pack</th>
                                        <th style={{ padding: '10px 12px', fontSize: '11px', fontWeight: '600' }}>Qty</th>
                                        <th style={{ padding: '10px 12px', fontSize: '11px', fontWeight: '600' }}>LOC</th>
                                        <th style={{ padding: '10px 12px', fontSize: '11px', fontWeight: '600' }}>Batch</th>
                                        <th style={{ padding: '10px 12px', fontSize: '11px', fontWeight: '600' }}>MRP</th>
                                        <th style={{ padding: '10px 12px', fontSize: '11px', fontWeight: '600' }}>Dis Rs</th>
                                        <th style={{ padding: '10px 12px', fontSize: '11px', fontWeight: '600', textAlign: 'center' }}>X</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {issueItems.map((item, idx) => (
                                        <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '8px 12px', fontSize: '12px' }}>{idx + 1}</td>
                                            <td style={{ padding: '8px 12px', fontSize: '12px', fontWeight: '600', color: '#1e3b2e' }}>{item.medicine_name}</td>
                                            <td style={{ padding: '8px 12px', fontSize: '12px', color: '#64748b' }}>{item.company}</td>
                                            <td style={{ padding: '8px 12px', fontSize: '12px', color: '#64748b' }}>{item.type} | {item.power} | {item.packing}</td>
                                            <td style={{ padding: '8px 12px', fontSize: '12px', fontWeight: '700' }}>{item.quantity}</td>
                                            <td style={{ padding: '8px 12px', fontSize: '12px', color: '#64748b' }}>{item.loc}</td>
                                            <td style={{ padding: '8px 12px', fontSize: '12px', color: '#64748b' }}>{item.batch_number}</td>
                                            <td style={{ padding: '8px 12px', fontSize: '12px' }}>{item.mrp}</td>
                                            <td style={{ padding: '8px 12px', fontSize: '12px' }}>{item.discount_rs}</td>
                                            <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                                <button onClick={() => setIssueItems(issueItems.filter(i => i.id !== item.id))} style={{ background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '4px', width: '24px', height: '24px', cursor: 'pointer' }}>&times;</button>
                                            </td>
                                        </tr>
                                    ))}
                                    {issueItems.length === 0 && (
                                        <tr><td colSpan="10" style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>No items added to Issue Slip</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    <div style={{ width: '320px', background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                        <h3 style={{ margin: '0 0 16px 0', color: '#0f172a', fontSize: '16px' }}>Issue Summary</h3>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px dashed #e2e8f0' }}>
                            <span style={{ color: '#64748b', fontSize: '14px' }}>Total Items</span>
                            <span style={{ fontWeight: '700', color: '#0f172a', fontSize: '14px' }}>{issueItems.length}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', paddingBottom: '12px', borderBottom: '1px dashed #e2e8f0' }}>
                            <span style={{ color: '#64748b', fontSize: '14px' }}>Total Qty</span>
                            <span style={{ fontWeight: '800', color: '#10b981', fontSize: '16px' }}>{issueItems.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0)}</span>
                        </div>
                        
                        <button onClick={handleSaveIssueSlip} style={{ width: '100%', padding: '12px', background: '#0f2d1f', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '14px', cursor: 'pointer', transition: 'background 0.2s', boxShadow: '0 4px 6px -1px rgba(15, 45, 31, 0.2)' }} onMouseEnter={e => e.currentTarget.style.background = '#1a4f36'} onMouseLeave={e => e.currentTarget.style.background = '#0f2d1f'}>
                            Save Issue Slip
                        </button>
                    </div>
                </div>
            ) : (
                <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                        {/* Header Section */}
                        <div style={{ background: '#ecfdf5', padding: '16px', borderRadius: '12px', border: '1px solid #10b981', marginBottom: '16px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', gap: '16px', alignItems: 'end' }}>
                                <div>
                                    <label style={{ ...labelStyle, color: '#047857' }}>Party Name (Sundry Debtors)</label>
                                    <select 
                                        id="wb-party"
                                        value={billDetails.ledgerId} 
                                        onChange={e => setBillDetails({...billDetails, ledgerId: e.target.value})}
                                        onKeyDown={e => { if (e.key === 'Enter') document.getElementById('wb-date')?.focus(); }}
                                        className="modern-input" style={{ ...inputStyle, border: '1px solid #6ee7b7', background: '#fff' }}
                                    >
                                        <option value="">Select Party...</option>
                                        {ledgers.map(s => <option key={s.id} value={s.id}>{s.ledger_name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={labelStyle}>Bill Type</label>
                                    <div style={{ display: 'flex', gap: '16px', padding: '6px 0' }}>
                                        <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <input type="radio" name="btype" checked={billDetails.billType==='WS'} onChange={() => setBillDetails({...billDetails, billType: 'WS'})} /> Wholesale
                                        </label>
                                        <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <input type="radio" name="btype" checked={billDetails.billType==='Cash'} onChange={() => setBillDetails({...billDetails, billType: 'Cash'})} /> Cash
                                        </label>
                                    </div>
                                </div>
                                <div>
                                    <label style={labelStyle}>Current Balance</label>
                                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', padding: '6px 0' }}>
                                        {(() => {
                                            if (!billDetails.ledgerId) return '-';
                                            const l = ledgers.find(x => x.id.toString() === billDetails.ledgerId.toString());
                                            if (!l) return '0.00 Dr';
                                            return `${Number(l.current_balance).toFixed(2)} ${l.current_balance_type}`;
                                        })()}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Details Section */}
                        <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '16px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr 1fr 1fr 1.5fr 1fr', gap: '12px' }}>
                                <div><label style={labelStyle}>TAX INVOICE No.</label><input type="text" readOnly value={billDetails.billNumber} className="modern-input" style={{ ...inputStyle, background: '#f8fafc', fontWeight: 'bold' }} /></div>
                                <div><label style={labelStyle}>Bill Date</label><DateInput id="wb-date"  value={billDetails.billDate} onChange={e => setBillDetails({...billDetails, billDate: e.target.value})} onKeyDown={e => { if (e.key === 'Enter') document.getElementById('wb-ref')?.focus(); }} className="modern-input" style={inputStyle} /></div>
                                <div>
                                    <label style={labelStyle}>Reference (MR)</label>
                                    <select id="wb-ref" value={billDetails.reference} onChange={e => setBillDetails({...billDetails, reference: e.target.value})} onKeyDown={e => { if (e.key === 'Enter') document.getElementById('wb-send')?.focus(); }} className="modern-input" style={inputStyle}>
                                        <option value="">Select Reference...</option>
                                        {mrs.map(m => (
                                            <option key={`mr-${m.id}`} value={m.name}>
                                                {m.name} {m.company ? `(${m.company})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label style={labelStyle}>Send Through</label>
                                    <input id="wb-send" type="text" value={billDetails.sendThrough} onChange={e => setBillDetails({...billDetails, sendThrough: e.target.value})} onKeyDown={e => { if (e.key === 'Enter') document.getElementById('wb-doc')?.focus(); }} className="modern-input" style={inputStyle} placeholder="DIRECT" />
                                </div>
                                <div>
                                    <label style={labelStyle}>Doc. Through</label>
                                    <input id="wb-doc" type="text" value={billDetails.documentsThrough} onChange={e => setBillDetails({...billDetails, documentsThrough: e.target.value})} onKeyDown={e => { if (e.key === 'Enter') document.getElementById('wb-remark')?.focus(); }} className="modern-input" style={inputStyle} placeholder="Self" />
                                </div>
                                <div>
                                    <label style={labelStyle}>Sale Destination</label>
                                    <div style={{ display: 'flex', gap: '16px', padding: '6px 0' }}>
                                        <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}><input type="radio" checked={billDetails.saleDestination==='in_state'} onChange={() => setBillDetails({...billDetails, saleDestination: 'in_state'})} /> In State (CGST+SGST)</label>
                                        <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}><input type="radio" checked={billDetails.saleDestination==='out_state'} onChange={() => setBillDetails({...billDetails, saleDestination: 'out_state'})} /> Out State (IGST)</label>
                                    </div>
                                </div>
                                <div><label style={labelStyle}>Remark</label><input id="wb-remark" type="text" value={billDetails.remark} onChange={e => setBillDetails({...billDetails, remark: e.target.value})} onKeyDown={e => { if (e.key === 'Enter') document.getElementById('wb-company')?.focus(); }} className="modern-input" style={inputStyle} /></div>
                            </div>
                        </div>

                        {/* Add Item Form */}
                        <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: '16px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 0.8fr 0.8fr 1fr 1fr 0.8fr 0.6fr', gap: '12px', marginBottom: '12px' }}>
                                <div>
                                    <label style={labelStyle}>Company</label>
                                    <AutocompleteDropdown 
                                        id="wb-company"
                                        options={companies.map(c => ({name: c.name}))}
                                        value={currentItem.company}
                                        onChange={v => setCurrentItem({...currentItem, company: typeof v === 'string' ? v : v.name, medicineName: ''})}
                                        onEnter={() => document.getElementById('wb-med')?.focus()}
                                        onEscape={() => document.getElementById('wb-finish')?.focus()}
                                        placeholder="Select company..."
                                        inputStyle={inputStyle}
                                    />
                                </div>
                                <div>
                                    <label style={labelStyle}>Medicine Name</label>
                                    <AutocompleteDropdown 
                                        id="wb-med"
                                        options={currentItem.company ? medicines.filter(m => m.company && String(m.company).trim().toLowerCase() === String(currentItem.company).trim().toLowerCase()) : medicines}
                                        value={currentItem.medicineName}
                                        onChange={v => {
                                            if (typeof v === 'string') {
                                                setCurrentItem({...currentItem, medicineName: v})
                                            } else {
                                                setCurrentItem({
                                                    ...currentItem, 
                                                    medicineName: v.name, 
                                                    company: v.company || currentItem.company, 
                                                    packing: v.unit || '', 
                                                    potency: v.potency || '', 
                                                    type: v.category || '', 
                                                    unitPrice: v.selling_price || '',
                                                    gstRate: v.gst_rate !== undefined ? v.gst_rate.toString() : '5',
                                                    hsnCode: v.hsn_code || ''
                                                })
                                            }
                                        }}
                                        onEnter={() => document.getElementById('qty').focus()}
                                        placeholder="Search medicine..."
                                        inputStyle={inputStyle}
                                        nameOnly
                                    />
                                </div>
                                <div><label style={labelStyle}>Power</label><input readOnly value={currentItem.potency} className="modern-input" style={{...inputStyle, background: '#f8fafc', color: '#64748b'}} tabIndex={-1} /></div>
                                <div><label style={labelStyle}>Packing</label><input readOnly value={currentItem.packing} className="modern-input" style={{...inputStyle, background: '#f8fafc', color: '#64748b'}} tabIndex={-1} /></div>
                                <div><label style={labelStyle}>Type</label><input readOnly value={currentItem.type} className="modern-input" style={{...inputStyle, background: '#f8fafc', color: '#64748b'}} tabIndex={-1} /></div>
                                <div><label style={labelStyle}>Batch</label><input value={currentItem.batchNo} onChange={e => setCurrentItem({...currentItem, batchNo: e.target.value})} className="modern-input" style={inputStyle} /></div>
                                <div><label style={labelStyle}>HSN</label><input readOnly value={currentItem.hsnCode || ''} className="modern-input" style={{...inputStyle, background: '#f8fafc', color: '#64748b'}} tabIndex={-1} /></div>
                                <div><label style={labelStyle}>GST %</label><input readOnly value={currentItem.gstRate ? `${currentItem.gstRate}%` : ''} className="modern-input" style={{...inputStyle, background: '#f8fafc', color: '#64748b'}} tabIndex={-1} /></div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr 1fr auto', gap: '12px', alignItems: 'end' }}>
                                <div><label style={labelStyle}>Qty (N)</label><input id="qty" type="number" value={currentItem.quantity} onChange={e => setCurrentItem({...currentItem, quantity: e.target.value})} onKeyDown={e => e.key==='Enter' && document.getElementById('freeQty').focus()} className="modern-input" style={inputStyle} /></div>
                                <div><label style={labelStyle}>Free Qty</label><input id="freeQty" type="number" value={currentItem.freeQuantity} onChange={e => setCurrentItem({...currentItem, freeQuantity: e.target.value})} onKeyDown={e => e.key==='Enter' && document.getElementById('rate').focus()} className="modern-input" style={inputStyle} /></div>
                                <div><label style={labelStyle}>Rate (₹)</label><input id="rate" type="number" value={currentItem.unitPrice} onChange={e => setCurrentItem({...currentItem, unitPrice: e.target.value})} onBlur={e => { const val = e.target.value; if(val !== '') setCurrentItem(prev => ({...prev, unitPrice: Number(val).toFixed(2)})); }} onKeyDown={e => { if(e.key==='Enter'){ e.preventDefault(); const val = e.target.value; if(val !== '') setCurrentItem(prev => ({...prev, unitPrice: Number(val).toFixed(2)})); document.getElementById('dis').focus(); } }} className="modern-input" style={inputStyle} /></div>
                                <div>
                                    <label style={{...labelStyle, display: 'flex', alignItems: 'center', gap: '4px'}}>
                                        Disc % 
                                        <label title="Calculate Discount Inclusive of Tax" style={{ display: 'flex', alignItems: 'center', gap: '2px', cursor: 'pointer', color: '#3b82f6' }}>
                                            <input type="checkbox" checked={isAutomatic} onChange={e => setIsAutomatic(e.target.checked)} style={{ margin: 0, width: '12px', height: '12px' }} />
                                            Tax Incl.
                                        </label>
                                    </label>
                                    <input id="dis" type="number" placeholder="0" value={currentItem.discountPercent} onChange={e => setCurrentItem({...currentItem, discountPercent: e.target.value})} onKeyDown={e => e.key==='Enter' && document.getElementById('scdis').focus()} className="modern-input" style={inputStyle} />
                                </div>
                                <div><label style={labelStyle}>Sc.Dis %</label><input id="scdis" type="number" placeholder="0" value={currentItem.schemeDiscountPercent} onChange={e => setCurrentItem({...currentItem, schemeDiscountPercent: e.target.value})} onKeyDown={e => e.key==='Enter' && document.getElementById('box').focus()} className="modern-input" style={inputStyle} /></div>
                                <div><label style={labelStyle}>Box</label><input id="box" type="number" placeholder="0" value={currentItem.box} onChange={e => setCurrentItem({...currentItem, box: e.target.value})} onKeyDown={e => e.key==='Enter' && handleAddItem()} className="modern-input" style={inputStyle} /></div>
                                <div><label style={labelStyle}>Total Amount</label><div style={{ padding: '6px 10px', background: '#f8fafc', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '13px', fontWeight: '700' }}>₹{currentItem.amount}</div></div>
                                <div><button onClick={handleAddItem} style={{ background: '#10b981', color: '#fff', border: 'none', padding: '6px 16px', borderRadius: '4px', fontWeight: '600', cursor: 'pointer', fontSize: '12px', height: '30px' }}>Add</button></div>
                            </div>
                        </div>

                        {/* Grid */}
                        <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'visible' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                    <tr>
                                        <th style={{ padding: '10px 12px', fontSize: '11px', fontWeight: '600', color: '#475569' }}>S No</th>
                                        <th style={{ padding: '10px 12px', fontSize: '11px', fontWeight: '600', color: '#475569' }}>Medicine</th>
                                        <th style={{ padding: '10px 12px', fontSize: '11px', fontWeight: '600', color: '#475569' }}>Company</th>
                                        <th style={{ padding: '10px 12px', fontSize: '11px', fontWeight: '600', color: '#475569' }}>Power</th>
                                        <th style={{ padding: '10px 12px', fontSize: '11px', fontWeight: '600', color: '#475569' }}>Packing</th>
                                        <th style={{ padding: '10px 12px', fontSize: '11px', fontWeight: '600', color: '#475569' }}>Qty</th>
                                        <th style={{ padding: '10px 12px', fontSize: '11px', fontWeight: '600', color: '#475569' }}>Free</th>
                                        <th style={{ padding: '10px 12px', fontSize: '11px', fontWeight: '600', color: '#475569' }}>Rate</th>
                                        <th style={{ padding: '10px 12px', fontSize: '11px', fontWeight: '600', color: '#475569' }}>Dis%</th>
                                        <th style={{ padding: '10px 12px', fontSize: '11px', fontWeight: '600', color: '#475569' }}>Sc.Dis%</th>
                                        <th style={{ padding: '10px 12px', fontSize: '11px', fontWeight: '600', color: '#475569' }}>Gross Total</th>
                                        {billDetails.saleDestination === 'in_state' ? (
                                            <>
                                                <th style={{ padding: '10px 12px', fontSize: '11px', fontWeight: '600', color: '#475569' }}>CGST</th>
                                                <th style={{ padding: '10px 12px', fontSize: '11px', fontWeight: '600', color: '#475569' }}>SGST</th>
                                            </>
                                        ) : (
                                            <th style={{ padding: '10px 12px', fontSize: '11px', fontWeight: '600', color: '#475569' }}>IGST</th>
                                        )}
                                        <th style={{ padding: '10px 12px', fontSize: '11px', fontWeight: '600', color: '#475569' }}>Net</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item, idx) => (
                                        <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '10px 12px', fontSize: '12px' }}>{idx + 1}</td>
                                            <td style={{ padding: '10px 12px', fontSize: '12px', fontWeight: '500' }}>{item.medicineName}</td>
                                            <td style={{ padding: '10px 12px', fontSize: '12px' }}>{item.company}</td>
                                            <td style={{ padding: '10px 12px', fontSize: '12px' }}>{item.potency}</td>
                                            <td style={{ padding: '10px 12px', fontSize: '12px' }}>{item.packing}</td>
                                            <td style={{ padding: '10px 12px', fontSize: '12px' }}>{item.quantity}</td>
                                            <td style={{ padding: '10px 12px', fontSize: '12px' }}>{item.freeQuantity}</td>
                                            <td style={{ padding: '10px 12px', fontSize: '12px' }}>{item.unitPrice}</td>
                                            <td style={{ padding: '10px 12px', fontSize: '12px' }}>{item.discountPercent}%</td>
                                            <td style={{ padding: '10px 12px', fontSize: '12px' }}>{item.schemeDiscountPercent}%</td>
                                            <td style={{ padding: '10px 12px', fontSize: '12px' }}>{Number(item.grossTotal).toFixed(2)}</td>
                                            {billDetails.saleDestination === 'in_state' ? (
                                                <>
                                                    <td style={{ padding: '10px 12px', fontSize: '12px' }}>{((Number(item.amount) - Number(item.grossTotal))/2).toFixed(2)}</td>
                                                    <td style={{ padding: '10px 12px', fontSize: '12px' }}>{((Number(item.amount) - Number(item.grossTotal))/2).toFixed(2)}</td>
                                                </>
                                            ) : (
                                                <td style={{ padding: '10px 12px', fontSize: '12px' }}>{(Number(item.amount) - Number(item.grossTotal)).toFixed(2)}</td>
                                            )}
                                            <td style={{ padding: '10px 12px', fontSize: '12px', fontWeight: '600' }}>{item.amount}</td>
                                            <td style={{ padding: '10px 12px' }}><button onClick={() => removeItem(item.id)} style={{ color: '#ef4444', border:'none', background:'none', cursor:'pointer' }}>×</button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom Sticky Footer */}
            {view === 'new' && (
                <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '1px solid #e2e8f0', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 -4px 6px -1px rgba(0,0,0,0.05)', zIndex: 100 }}>
                    <div style={{ display: 'flex', gap: '32px' }}>
                        <div><span style={{ fontSize: '12px', color: '#64748b' }}>Total Items:</span> <span style={{ fontWeight: '700', color: '#0f172a' }}>{items.length}</span></div>
                        <div><span style={{ fontSize: '12px', color: '#64748b' }}>Total Gross:</span> <span style={{ fontWeight: '700', color: '#0f172a' }}>₹{totals.gross.toFixed(2)}</span></div>
                        <div><span style={{ fontSize: '12px', color: '#64748b' }}>Total GST:</span> <span style={{ fontWeight: '700', color: '#10b981' }}>₹{totals.gst.toFixed(2)}</span></div>
                        {Math.abs(roundOff) > 0.001 && <div><span style={{ fontSize: '12px', color: '#64748b' }}>Round:</span> <span style={{ fontWeight: '700', color: '#0f172a' }}>{roundOff.toFixed(2)}</span></div>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                        <div style={{ fontSize: '24px', fontWeight: '800', color: '#16a34a' }}>₹{roundedNet.toFixed(2)}</div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button onClick={handleResetBill} style={{ padding: '10px 20px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>Reset Bill</button>
                            <button id="wb-finish" onClick={handleSaveBill} style={{ padding: '10px 20px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>Finish (F10)</button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Custom Confirm Dialog */}
            {itemToDelete && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', width: '400px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                        <h3 style={{ margin: '0 0 16px 0', color: '#0f172a', fontSize: '18px' }}>Remove Item</h3>
                        <p style={{ margin: '0 0 24px 0', color: '#475569', fontSize: '14px' }}>Are you sure you want to remove this medicine from the bill?</p>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button onClick={() => setItemToDelete(null)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
                            <button onClick={confirmRemove} style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#ef4444', color: '#fff', fontWeight: '600', cursor: 'pointer' }}>Remove</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reset Confirm Dialog */}
            {showResetConfirm && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)' }}>
                    <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', width: '400px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                        <h3 style={{ margin: '0 0 16px 0', color: '#0f172a', fontSize: '18px' }}>Reset Bill</h3>
                        <p style={{ margin: '0 0 24px 0', color: '#475569', fontSize: '14px' }}>Are you sure you want to reset the current bill? All unsaved items will be lost.</p>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button onClick={() => setShowResetConfirm(false)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
                            <button onClick={executeResetBill} style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#ef4444', color: '#fff', fontWeight: '600', cursor: 'pointer' }}>Reset</button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Bill Modal */}
            {selectedViewBill && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
                    <div style={{ background: '#fff', borderRadius: '16px', padding: '32px', width: '900px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '24px', fontWeight: '800', color: '#0f2d1f', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    Bill Details
                                    <span style={{ fontSize: '12px', padding: '4px 10px', background: '#dcfce7', color: '#166534', borderRadius: '20px', fontWeight: '700', letterSpacing: '0.5px' }}>{selectedViewBill.bill_number}</span>
                                </h3>
                                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b', fontWeight: '500' }}>Review invoice contents and amounts</p>
                            </div>
                            <button onClick={() => setSelectedViewBill(null)} style={{ border: 'none', background: '#f1f5f9', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', cursor: 'pointer', color: '#475569', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'} onMouseLeave={e => e.currentTarget.style.background = '#f1f5f9'}>&times;</button>
                        </div>

                        <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '28px', border: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                                <div style={{ display: 'flex', alignItems: 'center' }}><span style={{ color: '#64748b', width: '60px', fontWeight: '600' }}>Party:</span> <span style={{ color: '#0f172a', fontWeight: '700' }}>{selectedViewBill.party_name}</span></div>
                                <div style={{ display: 'flex', alignItems: 'center' }}><span style={{ color: '#64748b', width: '60px', fontWeight: '600' }}>Date:</span> <span style={{ color: '#334155', fontWeight: '600' }}>{new Date(selectedViewBill.bill_date).toLocaleDateString('en-IN', {day:'numeric', month:'short', year:'numeric'})}</span></div>
                                <div style={{ display: 'flex', alignItems: 'center' }}><span style={{ color: '#64748b', width: '60px', fontWeight: '600' }}>Type:</span> <span style={{ color: '#334155', fontWeight: '600' }}>{selectedViewBill.bill_type}</span></div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', textAlign: 'right' }}>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}><span style={{ color: '#64748b', width: '100px', fontWeight: '600' }}>Gross Amount:</span> <span style={{ color: '#334155', fontWeight: '700', width: '80px' }}>₹{selectedViewBill.total_amount?.toFixed(2)}</span></div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}><span style={{ color: '#64748b', width: '100px', fontWeight: '600' }}>Discount:</span> <span style={{ color: '#ef4444', fontWeight: '600', width: '80px' }}>-₹{selectedViewBill.total_discount?.toFixed(2)}</span></div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: '4px', paddingTop: '4px', borderTop: '1px dashed #cbd5e1' }}><span style={{ color: '#0f2d1f', width: '100px', fontWeight: '800', fontSize: '14px' }}>Net Payable:</span> <span style={{ color: '#10b981', fontWeight: '800', fontSize: '15px', width: '80px' }}>₹{selectedViewBill.net_amount?.toFixed(2)}</span></div>
                            </div>
                        </div>

                        <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                                <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                    <tr>
                                        <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '700' }}>Medicine</th>
                                        <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '700' }}>Company</th>
                                        <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '700' }}>Power</th>
                                        <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '700' }}>Packing</th>
                                        <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '700', textAlign: 'center' }}>Qty (F)</th>
                                        <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '700', textAlign: 'right' }}>Rate</th>
                                        <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '700', textAlign: 'center' }}>Dis%</th>
                                        <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '700', textAlign: 'center' }}>GST%</th>
                                        <th style={{ padding: '12px 16px', color: '#475569', fontWeight: '700', textAlign: 'right' }}>Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedViewBill.items && selectedViewBill.items.map((item, idx) => (
                                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#fff' : '#fafaf9', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'} onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#fafaf9'}>
                                            <td style={{ padding: '12px 16px', fontWeight: '600', color: '#0f172a' }}>{item.medicine_name}</td>
                                            <td style={{ padding: '12px 16px', color: '#64748b' }}>{item.company}</td>
                                            <td style={{ padding: '12px 16px', color: '#64748b' }}>{item.potency}</td>
                                            <td style={{ padding: '12px 16px', color: '#64748b' }}>{item.unit}</td>
                                            <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '600' }}>{item.quantity} <span style={{color: '#10b981', fontSize: '11px'}}>({item.free_quantity})</span></td>
                                            <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '500' }}>₹{item.unit_price}</td>
                                            <td style={{ padding: '12px 16px', textAlign: 'center', color: '#ef4444', fontWeight: '500' }}>{(item.discount_percent + item.scheme_discount_percent).toFixed(1)}%</td>
                                            <td style={{ padding: '12px 16px', textAlign: 'center', color: '#3b82f6', fontWeight: '500' }}>{(item.cgst_rate + item.sgst_rate + item.igst_rate)}%</td>
                                            <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '700', color: '#0f2d1f' }}>₹{item.total_price}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div style={{ marginTop: '28px', display: 'flex', justifyContent: 'flex-end' }}>
                            <button onClick={() => setSelectedViewBill(null)} style={{ padding: '10px 32px', background: '#0f2d1f', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '14px', cursor: 'pointer', transition: 'background 0.2s', boxShadow: '0 4px 6px -1px rgba(15, 45, 31, 0.2)' }} onMouseEnter={e => e.currentTarget.style.background = '#1a4f36'} onMouseLeave={e => e.currentTarget.style.background = '#0f2d1f'}>Done</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Export Copy Type Modal */}
            {exportModalVisible && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: '#fff', width: '360px', borderRadius: '12px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>Select Copy Type</h3>
                            <button onClick={() => {setExportModalVisible(false); setExportBillId(null);}} style={{ border: 'none', background: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}>&times;</button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <button onClick={() => handleExportBill('Original')} style={{ padding: '12px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', transition: 'background 0.2s' }}>Original for Recipient</button>
                            <button onClick={() => handleExportBill('Duplicate')} style={{ padding: '12px', background: '#eab308', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', transition: 'background 0.2s' }}>Duplicate for Supplier</button>
                            <button onClick={() => handleExportBill('Triplicate')} style={{ padding: '12px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', transition: 'background 0.2s' }}>Triplicate for Transporter</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Issue Locations Modal */}
            {issueLocationsModalVisible && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div 
                        id="issue-batch-modal"
                        tabIndex={0}
                        style={{ background: '#fff', width: '600px', borderRadius: '12px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', maxHeight: '80vh', overflowY: 'auto', outline: 'none' }}
                        onKeyDown={e => {
                            if (e.key === 'ArrowDown') {
                                e.preventDefault()
                                setIssueFocusedBatchIdx(prev => prev < issueLiveBatches.length - 1 ? prev + 1 : prev)
                            } else if (e.key === 'ArrowUp') {
                                e.preventDefault()
                                setIssueFocusedBatchIdx(prev => prev > 0 ? prev - 1 : prev)
                            } else if (e.key === 'Enter') {
                                e.preventDefault()
                                const b = issueLiveBatches[issueFocusedBatchIdx]
                                if (b && b.quantity > 0) {
                                    setCurrentIssueEntry({
                                        ...currentIssueEntry,
                                        batch_id: b.id,
                                        batch_number: b.batch_number || b.batch_no || '-',
                                        mrp: b.mrp,
                                        loc: b.location_type ? `${b.godown || 'G1'} (${b.location_type} ${b.location_value})` : (b.godown || 'G1')
                                    })
                                    setIssueLocationsModalVisible(false)
                                    setTimeout(() => document.getElementById('issue-qty-input')?.focus(), 100)
                                }
                            } else if (e.key === 'Escape') {
                                setIssueLocationsModalVisible(false)
                                setTimeout(() => document.getElementById('issue-med')?.focus(), 100)
                            }
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <h3 style={{ margin: 0, fontSize: '20px', color: '#0f2d1f', fontWeight: '800' }}>Select Location/Batch for <span style={{color: '#10b981'}}>{currentIssueEntry.medicine_name}</span></h3>
                            <button onClick={() => setIssueLocationsModalVisible(false)} style={{ border: 'none', background: 'none', fontSize: '24px', cursor: 'pointer', color: '#64748b' }}>&times;</button>
                        </div>
                        <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#64748b' }}>Choose the location from where you are picking this medicine.</p>
                        
                        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                                <thead style={{ background: '#f8fafc' }}>
                                    <tr>
                                        <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', color: '#1e293b', fontWeight: '600' }}>Godown</th>
                                        <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', color: '#1e293b', fontWeight: '600' }}>Location</th>
                                        <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', color: '#1e293b', fontWeight: '600' }}>Batch</th>
                                        <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', color: '#1e293b', fontWeight: '600' }}>Qty Available</th>
                                        <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', color: '#1e293b', fontWeight: '600' }}>MRP</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {issueLiveBatches.map((b, idx) => (
                                        <tr 
                                            key={b.id}
                                            style={{ 
                                                background: idx === issueFocusedBatchIdx ? '#dcfce7' : '#fff', 
                                                cursor: b.quantity > 0 ? 'pointer' : 'not-allowed',
                                                opacity: b.quantity > 0 ? 1 : 0.6,
                                                borderBottom: idx < issueLiveBatches.length - 1 ? '1px solid #f1f5f9' : 'none'
                                            }}
                                            onClick={() => {
                                                if (b.quantity <= 0) return
                                                setIssueFocusedBatchIdx(idx)
                                                setCurrentIssueEntry({
                                                    ...currentIssueEntry,
                                                    batch_id: b.id,
                                                    batch_number: b.batch_number || b.batch_no || '-',
                                                    mrp: b.mrp,
                                                    loc: b.location_type ? `${b.godown || 'G1'} (${b.location_type} ${b.location_value})` : (b.godown || 'G1')
                                                })
                                                setIssueLocationsModalVisible(false)
                                                setTimeout(() => document.getElementById('issue-qty-input')?.focus(), 100)
                                            }}
                                        >
                                            <td style={{ padding: '12px 16px', color: '#334155' }}>{b.godown || 'G1'}</td>
                                            <td style={{ padding: '12px 16px', fontWeight: '700', color: '#0f172a' }}>{b.location_type && b.location_value ? `${b.location_type} ${b.location_value}` : '-'}</td>
                                            <td style={{ padding: '12px 16px', color: '#334155' }}>{b.batch_number || b.batch_no || '-'}</td>
                                            <td style={{ padding: '12px 16px', color: '#2563eb', fontWeight: '600' }}>{b.quantity}</td>
                                            <td style={{ padding: '12px 16px', color: '#334155' }}>₹{b.mrp}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                            <button onClick={() => setIssueLocationsModalVisible(false)} style={{ padding: '10px 24px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '700', fontSize: '14px', cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#b91c1c'} onMouseLeave={e => e.currentTarget.style.background = '#dc2626'}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
            </div>
            
            <WholesaleInvoicePrint bill={printBill} storeProfile={storeProfile} />
        </>
    )
}


import { useState, useEffect, useRef, useMemo } from 'react'
import DateInput from '../components/DateInput'
import './WholesaleBilling.css'
import { useCache } from '../context/CacheContext'

function AutocompleteDropdown({ value, onChange, options, onEnter, placeholder, id, inputStyle, readOnly, tabIndex, maxItems = 50 }) {
    const [show, setShow] = useState(false)
    const [focusedIdx, setFocusedIdx] = useState(-1)

    const filtered = show ? options.filter(o => {
        if (o._searchKey) {
            const searchTerms = String(value||'').toLowerCase().split(/\s+/).filter(Boolean);
            return searchTerms.every(term => o._searchKey.includes(term));
        }
        const searchStr = (o.name + ' ' + (o.potency || '')).toLowerCase();
        const searchTerms = String(value||'').toLowerCase().split(/\s+/).filter(Boolean);
        return searchTerms.every(term => searchStr.includes(term));
    }).slice(0, maxItems) : []

    useEffect(() => {
        if (show && filtered.length > 0) {
            setFocusedIdx(0)
        } else if (!show) {
            setFocusedIdx(-1)
        }
    }, [show, value, options])

    function handleKeyDown(e) {
        if (readOnly) {
            if (e.key === 'Enter') {
                e.preventDefault();
                onEnter();
            }
            return;
        }
        if (!show) {
            if (e.key === 'Enter') {
                e.preventDefault();
                onEnter();
            }
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                setShow(true);
            }
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
            <input className="wb-input modern-input" id={id}
                style={inputStyle}
                value={value}
                onChange={e => { if (readOnly) return; onChange(e.target.value); setShow(true); setFocusedIdx(-1); }}
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
                    background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px',
                    maxHeight: '250px', overflowY: 'auto', boxSizing: 'border-box',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)'
                }}>
                    {filtered.map((opt, idx) => {
                        const isHigh = idx === focusedIdx
                        return (
                            <div 
                                key={opt.id || opt.name || idx}
                                onClick={() => { onChange(opt); setShow(false); setTimeout(onEnter, 50); }}
                                onMouseEnter={() => setFocusedIdx(idx)}
                                style={{
                                    padding: '10px 10px', fontSize: '13px', cursor: 'pointer', fontFamily: 'Outfit, sans-serif',
                                    background: isHigh ? '#ecfdf5' : '#fff', color: isHigh ? '#059669' : '#334155',
                                    fontWeight: isHigh ? '600' : '500', borderBottom: '1px solid #f8fafc',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                <span style={{ fontWeight: '700' }}>{opt.name}</span>
                                {opt.company && <span style={{ color: '#94a3b8', fontSize: '11px', marginLeft: '6px' }}>({opt.company})</span>}
                                {opt.potency && <span style={{ background: '#f1f5f9', color: '#475569', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', marginLeft: '8px', fontWeight: '700' }}>{opt.potency}</span>}
                                {opt.unit && <span style={{ background: 'rgba(248,250,252,0.6)', color: '#64748b', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', marginLeft: '4px', fontWeight: '600' }}>{opt.unit}</span>}
                                {opt.category && (
                                    <span style={{ color: '#3b82f6', fontSize: '11px', marginLeft: '8px', fontWeight: '700' }}>
                                        [{opt.category}]
                                    </span>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

export default function PurchaseEntry({ isYearLocked }) {
    const { 
        medicines: cachedMeds, 
        companies: cachedComps, 
        ledgers: cachedLedgs, 
        hsnSacList: cachedHsns,
        refreshMedicines,
        refreshLedgers
    } = useCache()

    const medicines = useMemo(() => cachedMeds || [], [cachedMeds])
    const hsns = useMemo(() => cachedHsns || [], [cachedHsns])

    const suppliers = useMemo(() => {
        const ledgers = cachedLedgs || [];
        return ledgers.filter(l => {
            const name = (l.ledger_name || '').toUpperCase();
            return name !== 'PURCHASE ACCOUNT' && name !== 'SALES ACCOUNT';
        });
    }, [cachedLedgs]);

    const companies = useMemo(() => {
        const dbCompanies = cachedComps || []
        const medicineCompanies = (cachedMeds || []).map(m => m.company).filter(Boolean)
        const uniqueCompanyNames = Array.from(new Set([...dbCompanies.map(x => x.name), ...medicineCompanies]))
        return uniqueCompanyNames.map(name => ({ name }))
    }, [cachedComps, cachedMeds]);

    const [items, setItems] = useState([])
    const [view, setView] = useState('new') // 'new' | 'history'
    const [purchaseBills, setPurchaseBills] = useState([])
    const [loadingHistory, setLoadingHistory] = useState(false)
    const [selectedViewBill, setSelectedViewBill] = useState(null)
    const [toast, setToast] = useState({ show: false, msg: '', type: 'success' })

    const [isUnlockedForSession, setIsUnlockedForSession] = useState(false)
    const [showPasswordModal, setShowPasswordModal] = useState(false)
    const [unlockPassword, setUnlockPassword] = useState('')
    const [unlockError, setUnlockError] = useState('')

    const [billDetails, setBillDetails] = useState({
        supplierId: '',
        invoiceNumber: '',
        invoiceDate: new Date().toISOString().split('T')[0],
        purchaseSource: 'in_state'
    })

    const [qrModal, setQrModal] = useState(false)
    const [qrInput, setQrInput] = useState('')

    const [currentItem, setCurrentItem] = useState({
        medicineName: '',
        company: '',
        packing: '',
        hsn_code: '',
        batchNo: '',
        expMonth: '',
        expYear: '',
        quantity: '',
        freeQuantity: '',
        purchaseRate: '',
        mrp: '',
        discountPercent: '',
        gstRate: '5',
        amount: '0'
    })

    function showToast(msg, type = 'success') {
        setToast({ show: true, msg, type })
        setTimeout(() => setToast({ show: false, msg: '', type: 'success' }), 3000)
    }

    useEffect(() => {
        try {
            const draft = JSON.parse(localStorage.getItem('purchaseDraft'));
            if (draft) {
                if (draft.items) setItems(draft.items);
                if (draft.billDetails) setBillDetails(draft.billDetails);
            }
        } catch (e) {}
    }, [])

    useEffect(() => {
        if (isYearLocked && !isUnlockedForSession) {
            setView('history')
            loadHistory()
        } else {
            setView('new')
        }
    }, [isYearLocked, isUnlockedForSession])

    useEffect(() => {
        if (items.length > 0) {
            localStorage.setItem('purchaseDraft', JSON.stringify({ items, billDetails }));
        } else {
            localStorage.removeItem('purchaseDraft');
        }
    }, [items, billDetails]);

    useEffect(() => {
        function handleGlobalKeyDown(e) {
            if (e.key === 'F10') {
                e.preventDefault();
                document.getElementById('pe-save-btn')?.click();
            }
        }
        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, []);



    async function loadHistory() {
        setLoadingHistory(true)
        try {
            const data = await window.api.getPurchaseBills()
            setPurchaseBills(data || [])
        } catch (error) {
            showToast('Failed to load history', 'error')
        } finally {
            setLoadingHistory(false)
        }
    }

    async function handleViewBill(id) {
        try {
            const billData = await window.api.getPurchaseBillById(id);
            setSelectedViewBill(billData);
        } catch (error) {
            showToast('Failed to fetch bill details', 'error');
        }
    }

    // Auto-calculate current item total
    useEffect(() => {
        const q = Number(currentItem.quantity) || 0
        const mrp = Number(currentItem.mrp) || 0
        const pr = Number(currentItem.purchaseRate) || 0
        const dis = Number(currentItem.discountPercent) || 0
        const gst = Number(currentItem.gstRate) || 0

        const taxable = (mrp > 0 && dis > 0) 
            ? Math.round(q * mrp * (1 - dis / 100) * 100) / 100
            : Math.round(q * pr * 100) / 100;

        let gstAmt = 0;
        if (billDetails.purchaseSource === 'in_state') {
             const halfGst = gst / 2;
             const cgst = Math.round(taxable * (halfGst / 100) * 100) / 100;
             const sgst = Math.round(taxable * (halfGst / 100) * 100) / 100;
             gstAmt = cgst + sgst;
        } else {
             gstAmt = Math.round(taxable * (gst / 100) * 100) / 100;
        }
        
        const withGst = taxable + gstAmt;
        setCurrentItem(prev => ({ ...prev, amount: withGst.toFixed(2) }))
    }, [currentItem.quantity, currentItem.mrp, currentItem.purchaseRate, currentItem.discountPercent, currentItem.gstRate, billDetails.purchaseSource])

    function handleAddItem() {
        if (!currentItem.medicineName || !currentItem.quantity) {
            showToast('Please enter Medicine Name and Quantity', 'error')
            return
        }

        const med = medicines.find(m => m.name === currentItem.medicineName)
        if (!med) {
            showToast('Medicine not found in master!', 'error')
            return
        }

        setItems([...items, { ...currentItem, medicine_id: med.id, id: Date.now() }])
        setCurrentItem({
            ...currentItem,
            medicineName: '', packing: '', potency: '', type: '', hsn_code: '', batchNo: '', expMonth: '', expYear: '',
            quantity: '', freeQuantity: '', purchaseRate: '', mrp: '',
            discountPercent: '', gstRate: '5', amount: '0'
        })
        setTimeout(() => {
            document.getElementById('medSearch')?.focus()
        }, 10)
    }

    function removeItem(id) {
        setItems(items.filter(i => i.id !== id))
    }

    // Totals Calculation
    const totals = items.reduce((acc, item) => {
        const q = Number(item.quantity) || 0
        const pr = Number(item.purchaseRate) || 0
        const mrp = Number(item.mrp) || 0
        const dis = Number(item.discountPercent) || 0
        const gst = Number(item.gstRate) || 0

        const taxable = (mrp > 0 && dis > 0) 
            ? Math.round(q * mrp * (1 - dis / 100) * 100) / 100
            : Math.round(q * pr * 100) / 100;

        let gstAmt = 0;
        if (billDetails.purchaseSource === 'in_state') {
             const halfGst = gst / 2;
             const cgst = Math.round(taxable * (halfGst / 100) * 100) / 100;
             const sgst = Math.round(taxable * (halfGst / 100) * 100) / 100;
             gstAmt = cgst + sgst;
        } else {
             gstAmt = Math.round(taxable * (gst / 100) * 100) / 100;
        }
        
        // Discount amount for display purposes (savings)
        const disAmt = q * (mrp > 0 ? mrp - (taxable/q) : 0)

        acc.gross += taxable
        acc.discount += disAmt
        acc.taxable += taxable
        acc.gst += gstAmt
        return acc
    }, { gross: 0, discount: 0, taxable: 0, gst: 0 })

    const totalAmount = totals.taxable + totals.gst
    const roundedNet = totalAmount
    const roundOff = 0

    async function handleSaveBill() {
        if (!billDetails.supplierId) return showToast('Please select a Supplier', 'error')
        if (!billDetails.invoiceNumber) return showToast('Please enter Invoice Number', 'error')
        if (items.length === 0) return showToast('Please add at least one item', 'error')

        const payload = {
            supplier_id: billDetails.supplierId,
            invoice_number: billDetails.invoiceNumber,
            invoice_date: billDetails.invoiceDate,
            total_amount: totalAmount,
            discount: totals.discount,
            round_off: roundOff,
            net_amount: roundedNet,
            items: items.map(i => ({
                medicine_id: i.medicine_id,
                batch_number: i.batchNo || 'N/A',
                expiry_month: i.expMonth || null,
                expiry_year: i.expYear || null,
                quantity: Number(i.quantity) || 0,
                free_quantity: Number(i.freeQuantity) || 0,
                purchase_rate: Number(i.purchaseRate) || 0,
                mrp: Number(i.mrp) || 0,
                discount_percent: Number(i.discountPercent) || 0,
                gst_rate: Number(i.gstRate) || 0,
                total_price: Number(i.amount) || 0
            }))
        }

        try {
            await window.api.createPurchaseBill(payload)
            refreshMedicines()
            refreshLedgers()
            showToast('Purchase Bill Saved Successfully!', 'success')
            setItems([])
            setBillDetails({
                supplierId: '',
                invoiceNumber: '',
                invoiceDate: new Date().toISOString().split('T')[0],
                purchaseSource: 'in_state'
            })
            localStorage.removeItem('purchaseDraft');
        } catch (e) {
            showToast('Failed to save Purchase Bill', 'error')
            console.error(e)
        }
    }

    async function handleQrSubmit(e) {
        if(e) e.preventDefault();
        if(!qrInput.trim()) return;
        try {
            const res = await window.api.decodeQR(qrInput.trim());
            if(!res.success) throw new Error(res.error || 'Decode failed');
            
            const data = res.data;
            if(!data || data.v !== 1) throw new Error('Invalid QR Format');
            
            setBillDetails(prev => ({
                ...prev,
                invoiceNumber: data.bn || prev.invoiceNumber,
                invoiceDate: data.dt ? data.dt.split('T')[0] : prev.invoiceDate,
            }));

            let matchedSup = null;
            if(data.gst) {
                matchedSup = suppliers.find(s => (s.gst_number || '').toUpperCase() === data.gst.toUpperCase());
            }
            if(!matchedSup && data.pn) {
                matchedSup = suppliers.find(s => (s.ledger_name || '').toUpperCase() === data.pn.toUpperCase());
            }

            if(matchedSup) {
                setBillDetails(prev => ({ ...prev, supplierId: matchedSup.id }));
            }

            const newItems = (data.i || []).map((it, idx) => {
                const matchedMed = medicines.find(m => m.name.toLowerCase() === (it.n || '').toLowerCase());
                
                let hsn_code = matchedMed ? matchedMed.hsn_code : (it.hsn || '');
                let gstRate = it.g || 5;

                // Auto-pick GST rate based on HSN
                if (hsn_code) {
                    const hsnObj = hsns.find(h => h.hsn_code === hsn_code);
                    if (hsnObj && hsnObj.igst) {
                        gstRate = hsnObj.igst;
                    }
                }

                return {
                    id: Date.now() + idx,
                    medicine_id: matchedMed ? matchedMed.id : null,
                    medicineName: matchedMed ? matchedMed.name : it.n,
                    company: matchedMed ? matchedMed.company : (it.c || ''),
                    packing: matchedMed ? matchedMed.unit : (it.pk || ''),
                    potency: matchedMed ? matchedMed.potency : (it.p || ''),
                    type: matchedMed ? matchedMed.category : (it.ty || ''),
                    hsn_code: hsn_code,
                    batchNo: it.b || '',
                    expMonth: it.em || '',
                    expYear: it.ey || '',
                    quantity: it.q || 0,
                    freeQuantity: it.fq || 0,
                    mrp: it.r || '',
                    purchaseRate: it.r ? (Number(it.r) - (Number(it.r) * (Number(it.d || 0) / 100))).toFixed(4) : 0,
                    discountPercent: it.d || 0,
                    gstRate: gstRate,
                    amount: ((it.q || 0) * (it.r || 0) * (1 - (it.d || 0)/100) * (1 + gstRate/100)).toFixed(2)
                };
            });
            
            setItems(prev => [...prev, ...newItems]);
            showToast('QR Scanned Successfully! Please verify items.', 'success');
            setQrModal(false);
            setQrInput('');
        } catch(err) {
            console.error(err);
            showToast('Invalid or Unreadable QR Code', 'error');
        }
    }

    async function handleUnlockSubmit(e) {
        e.preventDefault()
        setUnlockError('')
        if (!unlockPassword) return
        
        const res = await window.api.verifyAdminPin(unlockPassword)
        if (res.success) {
            setIsUnlockedForSession(true)
            setShowPasswordModal(false)
            setUnlockPassword('')
            setView('new')
            showToast('Year Unlocked for Purchase Entry', 'success')
        } else {
            setUnlockError('Incorrect Admin PIN')
        }
    }

    return (
        <div className="no-print wb-container">
            {toast.show && (
                <div style={{ position: 'fixed', bottom: '24px', right: '24px', background: toast.type === 'success' ? '#10b981' : '#ef4444', color: '#fff', padding: '8px 16px', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', zIndex: 9999, fontWeight: '600' }}>
                    {toast.msg}
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#0f2d1f', margin: 0 }}>Purchase Entry</h2>
                    <div style={{ display: 'flex', background: '#e2e8f0', borderRadius: '8px', padding: '4px' }}>
                        <button onClick={() => {
                            if (isYearLocked && !isUnlockedForSession) {
                                setShowPasswordModal(true)
                            } else {
                                setView('new')
                            }
                        }} style={{ padding: '6px 16px', borderRadius: '6px', border: 'none', background: view === 'new' ? '#0f2d1f' : 'transparent', color: view === 'new' ? '#fff' : '#64748b', fontWeight: '600', fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {isYearLocked && !isUnlockedForSession ? '🔒 New Bill' : 'New Bill'}
                        </button>
                        <button onClick={() => { setView('history'); loadHistory(); }} style={{ padding: '6px 16px', borderRadius: '6px', border: 'none', background: view === 'history' ? '#0f2d1f' : 'transparent', color: view === 'history' ? '#fff' : '#64748b', fontWeight: '600', fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s' }}>History</button>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {view === 'new' && (
                        <button onClick={() => setQrModal(true)} style={{ background: '#10b981', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '15px', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.3)' }}>
                            📷 Scan Bill QR
                        </button>
                    )}
                    {view === 'new' && (
                        <button id="pe-save-btn" onClick={handleSaveBill} style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '15px', boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.3)' }}>
                            Save Bill (F10)
                        </button>
                    )}
                </div>
            </div>

            {/* Password Modal */}
            {showPasswordModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
                    <div style={{ background: '#fff', padding: '32px', borderRadius: '16px', width: '400px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                        <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '24px' }}>🔒</span> Admin Unlock
                        </h3>
                        <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 24px 0', lineHeight: '1.5' }}>
                            This Financial Year is locked. Enter your Admin PIN to add a backdated purchase bill.
                        </p>
                        <form onSubmit={handleUnlockSubmit}>
                            <input className="wb-input modern-input" type="password"
                                placeholder="Enter Admin PIN"
                                value={unlockPassword}
                                onChange={e => setUnlockPassword(e.target.value)}
                                autoFocus
                                
                            />
                            {unlockError && <div style={{ color: '#ef4444', fontSize: '13px', fontWeight: '600', marginBottom: '8px', textAlign: 'center' }}>{unlockError}</div>}
                            <div style={{ display: 'flex', gap: '8px', marginTop: '24px' }}>
                                <button type="button" onClick={() => { setShowPasswordModal(false); setUnlockError(''); setUnlockPassword(''); }} style={{ flex: 1, padding: '12px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '14px' }}>Cancel</button>
                                <button type="submit" style={{ flex: 1, padding: '12px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '14px', boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.3)' }}>Unlock</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {view === 'history' ? (
                <div style={{ background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.6)', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead style={{ background: 'rgba(248,250,252,0.6)', borderBottom: '1px solid #e2e8f0' }}>
                            <tr>
                                <th style={{ padding: '8px 12px', fontSize: '13px', fontWeight: '600', color: '#475569' }}>Date</th>
                                <th style={{ padding: '8px 12px', fontSize: '13px', fontWeight: '600', color: '#475569' }}>Invoice No.</th>
                                <th style={{ padding: '8px 12px', fontSize: '13px', fontWeight: '600', color: '#475569' }}>Supplier Name</th>
                                <th style={{ padding: '8px 12px', fontSize: '13px', fontWeight: '600', color: '#475569', textAlign: 'right' }}>Total MRP Value</th>
                                <th style={{ padding: '8px 12px', fontSize: '13px', fontWeight: '600', color: '#475569', textAlign: 'right' }}>Discount</th>
                                <th style={{ padding: '8px 12px', fontSize: '13px', fontWeight: '600', color: '#475569', textAlign: 'right' }}>Round Off</th>
                                <th style={{ padding: '8px 12px', fontSize: '13px', fontWeight: '600', color: '#475569', textAlign: 'right' }}>Net Amount</th>
                                <th style={{ padding: '8px 12px', fontSize: '13px', fontWeight: '600', color: '#475569', textAlign: 'center' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loadingHistory ? (
                                <tr><td colSpan="8" style={{ padding: '12px', textAlign: 'center', color: '#64748b' }}>Loading...</td></tr>
                            ) : purchaseBills.length === 0 ? (
                                <tr><td colSpan="8" style={{ padding: '12px', textAlign: 'center', color: '#64748b' }}>No purchase bills found.</td></tr>
                            ) : (
                                purchaseBills.map((bill) => (
                                    <tr key={bill.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '8px 12px', fontSize: '14px', color: '#334155' }}>
                                            {new Date(bill.invoice_date || bill.created_at).toLocaleDateString('en-IN')}
                                        </td>
                                        <td style={{ padding: '8px 12px', fontSize: '14px', color: '#334155', fontWeight: '500' }}>
                                            {bill.invoice_number}
                                        </td>
                                        <td style={{ padding: '8px 12px', fontSize: '14px', color: '#334155' }}>
                                            {bill.supplier_name || 'Unknown Supplier'}
                                        </td>
                                        <td style={{ padding: '8px 12px', fontSize: '14px', color: '#334155', textAlign: 'right' }}>
                                            ₹{(bill.total_mrp || 0).toFixed(2)}
                                        </td>
                                        <td style={{ padding: '8px 12px', fontSize: '14px', color: '#10b981', textAlign: 'right' }}>
                                            ₹{(bill.discount || 0).toFixed(2)}
                                        </td>
                                        <td style={{ padding: '8px 12px', fontSize: '14px', color: '#334155', textAlign: 'right' }}>
                                            ₹{(bill.round_off || 0).toFixed(2)}
                                        </td>
                                        <td style={{ padding: '8px 12px', fontSize: '15px', color: '#0f172a', fontWeight: '700', textAlign: 'right' }}>
                                            ₹{(bill.net_amount || 0).toFixed(2)}
                                        </td>
                                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                            <button onClick={() => handleViewBill(bill.id)} style={{ padding: '4px 12px', background: '#e2e8f0', border: '1px solid #cbd5e1', color: '#334155', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', fontWeight: '600' }}>
                                                View
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            ) : (
                <>
                    {/* Header Section */}
            <div style={{ background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.6)', padding: '8px 12px', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', marginBottom: '8px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>Supplier / Creditor</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <select className="wb-input modern-input" id="supplierId"
                            autoFocus
                            value={billDetails.supplierId} 
                            onChange={e => setBillDetails({...billDetails, supplierId: e.target.value})}
                            onKeyDown={e => e.key === 'Enter' && document.getElementById('invoiceNum')?.focus()}
                            
                        >
                            <option value="">Select Supplier...</option>
                            {suppliers.map(s => <option key={s.id} value={s.id}>{s.ledger_name}</option>)}
                        </select>
                        {billDetails.supplierId && suppliers.find(s => s.id === billDetails.supplierId)?.gst_number && (
                            <span style={{ fontSize: '11px', color: '#10b981', fontWeight: '700' }}>GSTIN: {suppliers.find(s => s.id === billDetails.supplierId).gst_number}</span>
                        )}
                    </div>
                </div>
                <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>Invoice Number</label>
                    <input className="wb-input modern-input" id="invoiceNum"
                        type="text" 
                        value={billDetails.invoiceNumber}
                        onChange={e => setBillDetails({...billDetails, invoiceNumber: e.target.value})}
                        onKeyDown={e => e.key === 'Enter' && document.getElementById('invoiceDateInput')?.focus()}
                        placeholder="e.g. INV-2024-001"
                        
                    />
                </div>
                <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>Invoice Date</label>
                    <DateInput  
                        id="invoiceDateInput"
                        value={billDetails.invoiceDate}
                        onChange={e => setBillDetails({...billDetails, invoiceDate: e.target.value})}
                        onKeyDown={e => e.key === 'Enter' && document.getElementById('purchaseSource')?.focus()}
                        className="wb-input modern-input"
                    />
                </div>
                <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>Purchase Source</label>
                    <select className="wb-input modern-input" id="purchaseSource"
                        value={billDetails.purchaseSource}
                        onChange={e => setBillDetails({...billDetails, purchaseSource: e.target.value})}
                        onKeyDown={e => e.key === 'Enter' && document.getElementById('companySearch')?.focus()}
                        
                    >
                        <option value="in_state">In State (CGST + SGST)</option>
                        <option value="out_state">Out State (IGST)</option>
                    </select>
                </div>
            </div>

            {/* Add Item Form */}
            <div style={{ background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.6)', padding: '8px 12px', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', marginBottom: '8px', position: 'relative', zIndex: 5 }}>
                <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b', marginBottom: '8px', marginTop: 0 }}>Add Medicine</h3>
                
                {/* Row 1 */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 2fr 1fr 1fr 1fr 1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Company</label>
                        <AutocompleteDropdown 
                            id="companySearch"
                            options={[{name: 'All Companies'}, ...companies]}
                            value={currentItem.company}
                            onChange={v => {
                                const val = typeof v === 'string' ? v : v.name;
                                setCurrentItem({
                                    ...currentItem, 
                                    company: val === 'All Companies' ? '' : val, 
                                    medicineName: '', packing: '', potency: '', type: '', hsn_code: '', gstRate: '5'
                                });
                            }}
                            onEnter={() => document.getElementById('medSearch')?.focus()}
                            placeholder="Select company..."
                            maxItems={1000}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Medicine Name</label>
                        <AutocompleteDropdown 
                            id="medSearch"
                            options={medicines.filter(m => !currentItem.company || m.company === currentItem.company)}
                            value={currentItem.medicineName}
                            onChange={v => {
                                if (typeof v === 'string') {
                                    setCurrentItem({...currentItem, medicineName: v})
                                } else {
                                    let newGst = currentItem.gstRate;
                                    if (v.hsn_code) {
                                        const hsnObj = hsns.find(h => h.hsn_code === v.hsn_code);
                                        if (hsnObj && hsnObj.igst) {
                                            newGst = hsnObj.igst;
                                        }
                                    }
                                    setCurrentItem({
                                        ...currentItem, 
                                        medicineName: v.name, 
                                        company: v.company || currentItem.company, 
                                        packing: v.unit || '', 
                                        potency: v.potency || '', 
                                        type: v.category || '', 
                                        hsn_code: v.hsn_code || '', 
                                        gstRate: newGst
                                    })
                                }
                            }}
                            onEnter={() => document.getElementById('batchNo').focus()}
                            placeholder="Search medicine..."
                            maxItems={1000}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Power</label>
                        <input className="wb-input modern-input" readOnly placeholder="Power" value={currentItem.potency || ''}  tabIndex={-1} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Packing</label>
                        <input className="wb-input modern-input" readOnly placeholder="Packing" value={currentItem.packing || ''}  tabIndex={-1} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Type</label>
                        <input className="wb-input modern-input" readOnly placeholder="Type" value={currentItem.type || ''}  tabIndex={-1} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Batch</label>
                        <input className="wb-input modern-input" id="batchNo" type="text" placeholder="Batch" value={currentItem.batchNo} onChange={e => setCurrentItem({...currentItem, batchNo: e.target.value})} onKeyDown={e => e.key==='Enter' && document.getElementById('expMonth').focus()}  />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Exp</label>
                        <div style={{ display: 'flex', gap: '4px' }}>
                            <input className="wb-input modern-input" id="expMonth" type="text" placeholder="MM" value={currentItem.expMonth} onChange={e => setCurrentItem({...currentItem, expMonth: e.target.value})} onKeyDown={e => e.key==='Enter' && document.getElementById('expYear').focus()}  />
                            <input className="wb-input modern-input" id="expYear" type="text" placeholder="YYYY" value={currentItem.expYear} onChange={e => setCurrentItem({...currentItem, expYear: e.target.value})} onKeyDown={e => e.key==='Enter' && document.getElementById('qty').focus()}  />
                        </div>
                    </div>
                </div>

                {/* Row 2 */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr 1.5fr 1fr 1fr 1.5fr auto', gap: '8px', alignItems: 'end' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Qty</label>
                        <input className="wb-input modern-input" id="qty" type="number" placeholder="Qty" value={currentItem.quantity} onChange={e => setCurrentItem({...currentItem, quantity: e.target.value})} onKeyDown={e => e.key==='Enter' && document.getElementById('freeQty').focus()}  />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Free</label>
                        <input className="wb-input modern-input" id="freeQty" type="number" placeholder="Free" value={currentItem.freeQuantity} onChange={e => setCurrentItem({...currentItem, freeQuantity: e.target.value})} onKeyDown={e => e.key==='Enter' && document.getElementById('mrp').focus()}  />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>MRP (₹)</label>
                        <input className="wb-input modern-input" id="mrp" type="number" placeholder="MRP" value={currentItem.mrp} onChange={e => {
                            const newMrp = e.target.value;
                            const dis = Number(currentItem.discountPercent) || 0;
                            const newPr = newMrp ? (newMrp - (newMrp * (dis / 100))).toFixed(4) : currentItem.purchaseRate;
                            setCurrentItem({...currentItem, mrp: newMrp, purchaseRate: newPr});
                        }} onKeyDown={e => e.key==='Enter' && document.getElementById('dis').focus()}  />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Dis (%)</label>
                        <input className="wb-input modern-input" id="dis" type="number" placeholder="0" value={currentItem.discountPercent} onChange={e => {
                            const newDis = e.target.value;
                            const mrp = Number(currentItem.mrp) || 0;
                            const newPr = mrp ? (mrp - (mrp * (Number(newDis) / 100))).toFixed(4) : currentItem.purchaseRate;
                            setCurrentItem({...currentItem, discountPercent: newDis, purchaseRate: newPr});
                        }} onKeyDown={e => e.key==='Enter' && handleAddItem()}  />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Gross</label>
                        <input className="wb-input modern-input" id="gross" type="text" value={
                            (() => {
                                const q = Number(currentItem.quantity) || 0;
                                const mrp = Number(currentItem.mrp) || 0;
                                const dis = Number(currentItem.discountPercent) || 0;
                                const pr = Number(currentItem.purchaseRate) || 0;
                                const taxable = (mrp > 0 && dis > 0) ? Math.round(q * mrp * (1 - dis / 100) * 100) / 100 : Math.round(q * pr * 100) / 100;
                                return taxable > 0 ? taxable.toFixed(2) : '';
                            })()
                        } readOnly placeholder="Auto"  tabIndex={-1} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>GST (%)</label>
                        <input className="wb-input modern-input" id="gst" type="text" readOnly tabIndex={-1} placeholder="GST%" value={currentItem.gstRate}  />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Amount</label>
                        <div style={{ padding: '10px 12px', background: 'rgba(248,250,252,0.6)', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>
                            ₹{currentItem.amount}
                        </div>
                    </div>
                    <div>
                        <button onClick={handleAddItem} style={{ background: '#10b981', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '13px', height: '39px', width: '100%' }}>ADD ITEM</button>
                    </div>
                </div>
            </div>

            {/* Grid Section */}
            <div style={{ background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.6)', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', overflow: 'visible', marginBottom: '12px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ background: 'rgba(248,250,252,0.6)', borderBottom: '1px solid #e2e8f0' }}>
                        <tr>
                            <th style={{ padding: '8px 12px', fontSize: '12px', fontWeight: '600', color: '#475569', width: '25%' }}>Medicine Name</th>
                            <th style={{ padding: '8px 12px', fontSize: '12px', fontWeight: '600', color: '#475569' }}>Company</th>
                            <th style={{ padding: '8px 12px', fontSize: '12px', fontWeight: '600', color: '#475569' }}>Packing</th>
                            <th style={{ padding: '8px 12px', fontSize: '12px', fontWeight: '600', color: '#475569' }}>HSN</th>
                            <th style={{ padding: '8px 12px', fontSize: '12px', fontWeight: '600', color: '#475569' }}>Batch</th>
                            <th style={{ padding: '8px 12px', fontSize: '12px', fontWeight: '600', color: '#475569' }}>Exp M/Y</th>
                            <th style={{ padding: '8px 12px', fontSize: '12px', fontWeight: '600', color: '#475569' }}>Qty+Free</th>
                            <th style={{ padding: '8px 12px', fontSize: '12px', fontWeight: '600', color: '#475569' }}>MRP</th>
                            <th style={{ padding: '8px 12px', fontSize: '12px', fontWeight: '600', color: '#475569' }}>Dis%</th>
                            <th style={{ padding: '8px 12px', fontSize: '12px', fontWeight: '600', color: '#475569' }}>Gross</th>
                            {billDetails.purchaseSource === 'in_state' ? (
                                <>
                                    <th style={{ padding: '8px 12px', fontSize: '12px', fontWeight: '600', color: '#475569' }}>CGST%</th>
                                    <th style={{ padding: '8px 12px', fontSize: '12px', fontWeight: '600', color: '#475569' }}>SGST%</th>
                                </>
                            ) : (
                                <th style={{ padding: '8px 12px', fontSize: '12px', fontWeight: '600', color: '#475569' }}>IGST%</th>
                            )}
                            <th style={{ padding: '8px 12px', fontSize: '12px', fontWeight: '600', color: '#475569' }}>Amount</th>
                            <th style={{ padding: '8px 12px', fontSize: '12px', fontWeight: '600', color: '#475569' }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, idx) => (
                            <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '8px 12px', fontSize: '13px', fontWeight: '500', color: '#0f172a' }}>{item.medicineName}</td>
                                <td style={{ padding: '8px 12px', fontSize: '13px', color: '#475569' }}>{item.company || '-'}</td>
                                <td style={{ padding: '8px 12px', fontSize: '13px', color: '#475569' }}>{item.packing || '-'}</td>
                                <td style={{ padding: '8px 12px', fontSize: '13px', color: '#475569' }}>{item.hsn_code || '-'}</td>
                                <td style={{ padding: '8px 12px', fontSize: '13px', color: '#475569' }}>{item.batchNo || '-'}</td>
                                <td style={{ padding: '8px 12px', fontSize: '13px', color: '#475569' }}>{item.expMonth}/{item.expYear}</td>
                                <td style={{ padding: '8px 12px', fontSize: '13px', color: '#475569' }}>{item.quantity} + {item.freeQuantity}</td>
                                <td style={{ padding: '8px 12px', fontSize: '13px', color: '#475569' }}>₹{item.mrp}</td>
                                <td style={{ padding: '8px 12px', fontSize: '13px', color: '#475569' }}>{item.discountPercent}%</td>
                                <td style={{ padding: '8px 12px', fontSize: '13px', color: '#475569' }}>
                                    ₹{(() => {
                                        const q = Number(item.quantity) || 0;
                                        const pr = Number(item.purchaseRate) || 0;
                                        const mrp = Number(item.mrp) || 0;
                                        const dis = Number(item.discountPercent) || 0;
                                        return ((mrp > 0 && dis > 0) ? Math.round(q * mrp * (1 - dis / 100) * 100) / 100 : Math.round(q * pr * 100) / 100).toFixed(2);
                                    })()}
                                </td>
                                {billDetails.purchaseSource === 'in_state' ? (
                                    <>
                                        <td style={{ padding: '8px 12px', fontSize: '13px', color: '#475569' }}>{Number(item.gstRate)/2}%</td>
                                        <td style={{ padding: '8px 12px', fontSize: '13px', color: '#475569' }}>{Number(item.gstRate)/2}%</td>
                                    </>
                                ) : (
                                    <td style={{ padding: '8px 12px', fontSize: '13px', color: '#475569' }}>{item.gstRate}%</td>
                                )}
                                <td style={{ padding: '8px 12px', fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>
                                    ₹{(() => {
                                        const q = Number(item.quantity) || 0;
                                        const pr = Number(item.purchaseRate) || 0;
                                        const mrp = Number(item.mrp) || 0;
                                        const dis = Number(item.discountPercent) || 0;
                                        const gst = Number(item.gstRate) || 0;
                                        const taxable = (mrp > 0 && dis > 0) ? Math.round(q * mrp * (1 - dis / 100) * 100) / 100 : Math.round(q * pr * 100) / 100;
                                        let gstAmt = 0;
                                        if (billDetails.purchaseSource === 'in_state') {
                                            const halfGst = gst / 2;
                                            gstAmt = Math.round(taxable * (halfGst / 100) * 100) / 100 + Math.round(taxable * (halfGst / 100) * 100) / 100;
                                        } else {
                                            gstAmt = Math.round(taxable * (gst / 100) * 100) / 100;
                                        }
                                        return (taxable + gstAmt).toFixed(2);
                                    })()}
                                </td>
                                <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                                    <button onClick={() => removeItem(item.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}>×</button>
                                </td>
                            </tr>
                        ))}

                    </tbody>
                </table>
            </div>

            {/* Footer Calculation Section */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ background: '#fff', padding: '12px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', width: '350px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#64748b', fontSize: '14px' }}>
                        <span>Total Taxable:</span>
                        <span style={{ fontWeight: '600', color: '#0f172a' }}>₹{totals.taxable.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#64748b', fontSize: '14px' }}>
                        <span>Total Savings:</span>
                        <span style={{ fontWeight: '600', color: '#10b981' }}>₹{totals.discount.toFixed(2)}</span>
                    </div>
                    {billDetails.purchaseSource === 'in_state' ? (
                        <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#64748b', fontSize: '14px' }}>
                                <span>CGST Tax:</span>
                                <span style={{ fontWeight: '600', color: '#0f172a' }}>+₹{(totals.gst / 2).toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#64748b', fontSize: '14px' }}>
                                <span>SGST Tax:</span>
                                <span style={{ fontWeight: '600', color: '#0f172a' }}>+₹{(totals.gst / 2).toFixed(2)}</span>
                            </div>
                        </>
                    ) : (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#64748b', fontSize: '14px' }}>
                            <span>IGST Tax:</span>
                            <span style={{ fontWeight: '600', color: '#0f172a' }}>+₹{totals.gst.toFixed(2)}</span>
                        </div>
                    )}
                    
                    <div style={{ borderTop: '2px dashed #cbd5e1', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>NET PAYABLE:</span>
                        <span style={{ fontSize: '24px', fontWeight: '800', color: '#16a34a' }}>₹{roundedNet.toFixed(2)}</span>
                    </div>
                </div>
            </div>

                </>
            )}

            {/* View Bill Modal */}
            {selectedViewBill && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
                    <div style={{ background: '#fff', borderRadius: '12px', width: '800px', maxHeight: '90vh', overflowY: 'auto', padding: '12px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', marginBottom: '8px' }}>
                            <div>
                                <h2 style={{ margin: 0, color: '#0f2d1f', fontSize: '20px' }}>Bill Details - {selectedViewBill.invoice_number}</h2>
                                <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}>Supplier: {selectedViewBill.supplier_name}</p>
                            </div>
                            <button onClick={() => setSelectedViewBill(null)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#64748b' }}>×</button>
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginBottom: '12px' }}>
                            <thead>
                                <tr style={{ background: 'rgba(248,250,252,0.6)', borderBottom: '1px solid #e2e8f0' }}>
                                    <th style={{ padding: '12px', fontSize: '12px', color: '#475569' }}>Medicine Name</th>
                                    <th style={{ padding: '12px', fontSize: '12px', color: '#475569' }}>Batch</th>
                                    <th style={{ padding: '12px', fontSize: '12px', color: '#475569', textAlign: 'right' }}>Qty</th>
                                    <th style={{ padding: '12px', fontSize: '12px', color: '#475569', textAlign: 'right' }}>MRP</th>
                                    <th style={{ padding: '12px', fontSize: '12px', color: '#475569', textAlign: 'right' }}>Dis%</th>
                                    <th style={{ padding: '12px', fontSize: '12px', color: '#475569', textAlign: 'right' }}>GST%</th>
                                    <th style={{ padding: '12px', fontSize: '12px', color: '#475569', textAlign: 'right' }}>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {selectedViewBill.items.map((item, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '12px', fontSize: '13px' }}>
                                            {item.medicine_name} {item.company ? <span style={{ color: '#64748b', fontSize: '11px' }}>({item.company})</span> : null}
                                        </td>
                                        <td style={{ padding: '12px', fontSize: '13px' }}>{item.batch_number}</td>
                                        <td style={{ padding: '12px', fontSize: '13px', textAlign: 'right' }}>{item.quantity}</td>
                                        <td style={{ padding: '12px', fontSize: '13px', textAlign: 'right' }}>₹{item.mrp?.toFixed(2)}</td>
                                        <td style={{ padding: '12px', fontSize: '13px', textAlign: 'right' }}>{item.discount_percent}%</td>
                                        <td style={{ padding: '12px', fontSize: '13px', textAlign: 'right' }}>{item.gst_rate}%</td>
                                        <td style={{ padding: '12px', fontSize: '13px', textAlign: 'right', fontWeight: '600' }}>₹{item.total_price?.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <div style={{ width: '300px', background: 'rgba(248,250,252,0.6)', padding: '8px 12px', borderRadius: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', color: '#64748b' }}>
                                    <span>Total MRP Value:</span><span>₹{selectedViewBill.items?.reduce((sum, item) => sum + ((item.mrp || 0) * ((item.quantity || 0) + (item.free_quantity || 0))), 0).toFixed(2)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', color: '#64748b' }}>
                                    <span>Total Amount:</span><span>₹{selectedViewBill.total_amount?.toFixed(2)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', color: '#10b981' }}>
                                    <span>Discount:</span><span>₹{selectedViewBill.discount?.toFixed(2)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #cbd5e1', paddingTop: '8px', marginTop: '8px', fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>
                                    <span>Net Amount:</span><span>₹{selectedViewBill.net_amount?.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* QR Scan Modal */}
            {qrModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
                    <div style={{ background: '#fff', borderRadius: '12px', width: '500px', padding: '12px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0f2d1f', margin: 0 }}>Scan QR Code</h3>
                            <button onClick={() => setQrModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#94a3b8' }}>&times;</button>
                        </div>
                        <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '8px', lineHeight: '1.5' }}>
                            Click inside the text box below, then scan the 2D Barcode (QR Code) from the Wholesale Invoice. The items and supplier will be automatically populated.
                        </p>
                        <form onSubmit={handleQrSubmit}>
                            <input className="wb-input modern-input" autoFocus
                                type="text"
                                value={qrInput}
                                onChange={(e) => setQrInput(e.target.value)}
                                placeholder="Waiting for scanner input..."
                                
                            />
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                <button type="button" onClick={() => setQrModal(false)} style={{ padding: '8px 16px', background: '#e2e8f0', color: '#475569', borderRadius: '6px', border: 'none', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
                                <button type="submit" style={{ padding: '8px 16px', background: '#10b981', color: '#fff', borderRadius: '6px', border: 'none', fontWeight: '600', cursor: 'pointer' }}>Process</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

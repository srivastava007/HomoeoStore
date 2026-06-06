import { useState, useEffect, useRef, useMemo } from 'react'
import DateInput from '../components/DateInput'
import { useCache } from '../context/CacheContext'

// Common styling
const lbl = { fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', display: 'block' }
const inp = { padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', fontFamily: 'Outfit, sans-serif', background: '#f8fafc', width: '100%', boxSizing: 'border-box', outline: 'none', color: '#0f172a', transition: 'all 0.2s', boxShadow: 'none' }
const focusStyle = { border: '1px solid #10b981', background: '#fff', boxShadow: '0 0 0 3px #dcfce7' }

function AutocompleteDropdown({ value, onChange, options, onEnter, placeholder, id, className, readOnly, tabIndex, nameOnly, onEscape, dropdownWidth, searchPlaceholder, maxItems = 50 }) {
    const [show, setShow] = useState(false)
    const [focusedIdx, setFocusedIdx] = useState(0)
    const [searchQuery, setSearchQuery] = useState('')

    // Use value string as initial search query if not editing
    const displayValue = value ? (nameOnly ? value.name : (value.name + (value.potency ? ' ' + value.potency : ''))) : ''
    const currentSearch = show ? searchQuery : displayValue

    const filtered = show ? options.filter(o => {
        if (o._searchKey && !nameOnly) {
            const searchTerms = String(searchQuery||'').toLowerCase().split(/\s+/).filter(Boolean);
            return searchTerms.every(term => o._searchKey.includes(term));
        }
        const searchStr = nameOnly ? (o.name || o.ledger_name) 
            : ((o.name || '') + ' ' + (o.potency || ''));
        const searchTerms = String(searchQuery||'').toLowerCase().split(/\s+/).filter(Boolean);
        return searchTerms.every(term => String(searchStr).toLowerCase().includes(term));
    }).slice(0, maxItems) : []

    function handleKeyDown(e) {
        if (readOnly) {
            if (e.key === 'Enter' && onEnter) { e.preventDefault(); onEnter(); }
            return;
        }
        if (!show) {
            if (e.key === 'Enter' && onEnter) { e.preventDefault(); onEnter(); }
            if (e.key === 'Escape' && onEscape) { e.preventDefault(); e.stopPropagation(); onEscape(); return; }
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                setShow(true);
                setSearchQuery('');
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
                setFocusedIdx(0)
                setTimeout(() => onEnter && onEnter(), 50)
            } else if (filtered.length === 1) {
                onChange(filtered[0])
                setShow(false)
                setFocusedIdx(0)
                setTimeout(() => onEnter && onEnter(), 50)
            } else {
                setShow(false)
                if(onEnter) onEnter()
            }
        } else if (e.key === 'Escape') {
            e.stopPropagation()
            setShow(false)
            setFocusedIdx(0)
        }
    }

    return (
        <div style={{ position: 'relative', width: '100%', zIndex: show ? 50 : 1 }}>
            <input
                id={id}
                tabIndex={tabIndex}
                className={className}
                type="text"
                placeholder={show ? (searchPlaceholder || 'Search...') : placeholder}
                value={currentSearch}
                readOnly={readOnly}
                onChange={e => {
                    if (readOnly) return
                    setSearchQuery(e.target.value)
                    if (!show) setShow(true)
                    setFocusedIdx(0)
                    if (e.target.value === '') {
                        onChange(null)
                    }
                }}
                onKeyDown={handleKeyDown}
                onClick={() => {
                    if (!readOnly && !show) {
                        setShow(true)
                        setSearchQuery('')
                    }
                }}
                onBlur={() => {
                    setTimeout(() => {
                        setShow(false)
                        setFocusedIdx(0)
                        setSearchQuery('')
                    }, 200)
                }}
                style={{
                    ...inp,
                    background: readOnly ? '#e2e8f0' : '#f8fafc',
                    cursor: readOnly ? 'not-allowed' : 'text'
                }}
                onFocus={e => {
                    Object.assign(e.target.style, focusStyle)
                    if (!readOnly && !show) {
                        setShow(true)
                        setSearchQuery('')
                    }
                }}
                onBlurCapture={e => Object.assign(e.target.style, { ...inp, background: readOnly ? '#e2e8f0' : '#f8fafc' })}
            />
            {show && (
                <div style={{
                    position: 'absolute', top: '100%', left: 0, right: dropdownWidth ? 'auto' : 0, width: dropdownWidth || '100%',
                    background: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)', maxHeight: '300px', overflowY: 'auto',
                    zIndex: 1000, marginTop: '4px'
                }}>
                    {filtered.length === 0 ? (
                        <div style={{ padding: '10px 14px', color: '#64748b', fontSize: '13px', fontStyle: 'italic' }}>No matches found</div>
                    ) : (
                        filtered.map((opt, i) => (
                            <div
                                key={opt.id}
                                style={{
                                    padding: '10px 14px',
                                    borderBottom: i < filtered.length - 1 ? '1px solid #f1f5f9' : 'none',
                                    background: focusedIdx === i ? '#dcfce7' : '#fff',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    color: '#0f172a',
                                    fontWeight: '500'
                                }}
                                onMouseEnter={() => setFocusedIdx(i)}
                                onClick={() => {
                                    onChange(opt)
                                    setShow(false)
                                    setFocusedIdx(0)
                                    setTimeout(() => onEnter && onEnter(), 50)
                                }}
                            >
                                {nameOnly ? (
                                    opt.name || opt.ledger_name
                                ) : (
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <span style={{ fontWeight: '600' }}>{opt.name}</span>
                                        {opt.potency && <span style={{ opacity: 0.7, marginLeft: '6px' }}>({opt.potency})</span>}
                                        {opt.category && (
                                            <span style={{ 
                                                opacity: 0.9, marginLeft: '8px', fontSize: '10px', 
                                                background: focusedIdx === i ? '#dcfce7' : '#e2e8f0', 
                                                padding: '2px 6px', borderRadius: '4px', color: focusedIdx === i ? '#15803d' : '#475569' 
                                            }}>
                                                {opt.category}
                                            </span>
                                        )}
                                        {opt.unit && (
                                            <span style={{ opacity: 0.75, marginLeft: '8px', fontSize: '11px', fontWeight: '500' }}>
                                                {opt.unit}
                                            </span>
                                        )}
                                        <span style={{ marginLeft: 'auto', color: focusedIdx === i ? '#16a34a' : '#6b7280', fontSize: '11px' }}>
                                            Qty: {opt.stock_quantity || 0} | MRP: ₹{opt.selling_price || 0}
                                        </span>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    )
}

export default function IssueSlip({ isYearLocked = false }) {
    const { 
        ledgers: cachedLedgs, 
        companies: cachedComps, 
        medicines: cachedMeds, 
        refreshMedicines 
    } = useCache()

    const ledgers = useMemo(() => {
        return (cachedLedgs || []).map(ledger => ({...ledger, name: ledger.ledger_name}))
    }, [cachedLedgs])

    const companies = useMemo(() => {
        return (cachedComps || []).map(comp => ({...comp, name: comp.name || comp.company_name}))
    }, [cachedComps])

    const medicines = cachedMeds || []
    
    const [issueNo, setIssueNo] = useState('')
    const [issueDate, setIssueDate] = useState(new Date().toISOString().substring(0, 10))
    const [issuedTo, setIssuedTo] = useState(null)
    
    // Item Entry
    const [selectedCompany, setSelectedCompany] = useState(null)
    const [selectedMedicine, setSelectedMedicine] = useState(null)
    
    const [issueItems, setIssueItems] = useState([])
    
    // Tabs
    const [activeTab, setActiveTab] = useState(isYearLocked ? 'history' : 'new')
    const [historySlips, setHistorySlips] = useState([])
    
    // Batch selection modal
    const [batchModalVisible, setBatchModalVisible] = useState(false)
    const [liveBatches, setLiveBatches] = useState([])
    const [focusedBatchIdx, setFocusedBatchIdx] = useState(0)
    
    // Staging entry
    const [stagingEntry, setStagingEntry] = useState(null)

    // View Modal
    const [viewModal, setViewModal] = useState({ show: false, data: null })
    const [editingSlipId, setEditingSlipId] = useState(null)
    
    // Toast
    const [toast, setToast] = useState(null)
    function showToast(msg, type='success') {
        setToast({ msg, type })
        setTimeout(() => setToast(null), 3000)
    }

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        const [nextNo, slips] = await Promise.all([
            window.api.getNextIssueSlipNumber(),
            window.api.getIssueSlips()
        ])
        setIssueNo(nextNo)
        setHistorySlips(slips || [])
    }
    
    // Filter medicines based on selected company
    const filteredMedicines = (selectedCompany && selectedCompany.name)
        ? medicines.filter(m => m.company && String(m.company).trim().toLowerCase() === String(selectedCompany.name).trim().toLowerCase()) 
        : medicines

    async function handleMedicineSelect(med) {
        setSelectedMedicine(med)
        if (!med) return
        
        try {
            const batches = await window.api.getStockBatches(med.id)
            if (!batches || batches.length === 0) {
                showToast('No stock available for this medicine', 'error')
                return
            }
            setLiveBatches(batches)
            setFocusedBatchIdx(0)
            setStagingEntry({
                medicine_id: med.id,
                medicine_name: med.name,
                company: med.company,
                potency: med.potency,
                unit: med.unit,
                category: med.category,
                quantity: '',
                discount_rs: '',
                mrp: 0
            })
            setBatchModalVisible(true)
            setTimeout(() => document.getElementById('issue-batch-modal')?.focus(), 100)
        } catch(e) {
            showToast('Error loading batches', 'error')
        }
    }
    
    function handleAddItem() {
        if (!stagingEntry || !stagingEntry.batch_id || !stagingEntry.quantity || isNaN(stagingEntry.quantity) || parseInt(stagingEntry.quantity) <= 0) {
            showToast('Please select a batch and enter a valid quantity.', 'error')
            setTimeout(() => document.getElementById('issue-qty-input')?.focus(), 50)
            return
        }
        if (parseInt(stagingEntry.quantity) > stagingEntry.available_qty) {
            showToast(`Quantity cannot exceed available stock (${stagingEntry.available_qty})`, 'error')
            setTimeout(() => document.getElementById('issue-qty-input')?.focus(), 50)
            return
        }
        
        // Add to items
        setIssueItems([...issueItems, stagingEntry])
        
        // Reset
        setSelectedMedicine(null)
        setStagingEntry(null)
        setTimeout(() => document.getElementById('issue-med')?.focus(), 100)
    }
    
    function removeItem(index) {
        setIssueItems(issueItems.filter((_, i) => i !== index))
    }
    
    async function handleSave() {
        if (!issuedTo) {
            showToast('Please select Issued To (Ledger).', 'error')
            return
        }
        if (issueItems.length === 0) {
            showToast('Please add at least one item.', 'error')
            return
        }
        
        const total_qty = issueItems.reduce((acc, curr) => acc + parseInt(curr.quantity || 0), 0)
        
        const payload = {
            ledger_id: issuedTo.id,
            issue_date: issueDate,
            total_items: issueItems.length,
            total_qty: total_qty,
            items: issueItems.map(i => ({
                medicine_id: i.medicine_id,
                batch_id: i.batch_id,
                quantity: parseInt(i.quantity),
                mrp: parseFloat(i.mrp || 0),
                discount_rs: parseFloat(i.discount_rs || 0)
            }))
        }
        
        try {
            await window.api.createIssueSlip(payload)
            showToast('Issue Slip created successfully!', 'success')
            refreshMedicines()
            // Reset form
            setIssueItems([])
            setIssuedTo(null)
            setSelectedCompany(null)
            setSelectedMedicine(null)
            const nextNo = await window.api.getNextIssueSlipNumber()
            setIssueNo(nextNo)
            // Refresh history
            const slips = await window.api.getIssueSlips()
            setHistorySlips(slips || [])
        } catch(e) {
            showToast(e.message, 'error')
        }
    }

    async function handleViewSlip(id) {
        try {
            const slip = await window.api.getIssueSlipById(id)
            if (slip) setViewModal({ show: true, data: slip })
            else showToast('Issue Slip not found', 'error')
        } catch (e) {
            showToast('Error loading slip', 'error')
        }
    }

    async function handleEditSlip(id) {
        try {
            const slip = await window.api.getIssueSlipById(id)
            if (!slip) return showToast('Issue Slip not found', 'error')
            setEditingSlipId(id)
            setIssuedTo({ id: slip.ledger_id, name: slip.party_name, ledger_name: slip.party_name })
            setIssueDate(slip.issue_date)
            setIssueNo(slip.issue_number)
            setIssueItems((slip.items || []).map(item => ({
                medicine_id: item.medicine_id,
                medicine_name: item.medicine_name,
                company: item.company,
                potency: item.potency,
                unit: item.packing,
                category: '',
                quantity: String(item.quantity),
                discount_rs: String(item.discount_rs || ''),
                mrp: item.mrp,
                batch_id: item.batch_id,
                batch_number: item.batch_number || '-',
                loc: item.location_type ? `${item.godown || 'G1'} (${item.location_type} ${item.location_value})` : (item.godown || 'G1'),
                available_qty: item.quantity
            })))
            setActiveTab('new')
        } catch (e) {
            showToast('Error loading slip for edit', 'error')
        }
    }

    function handlePrintSlip(slip) {
        const printWindow = window.open('', '_blank', 'width=800,height=600')
        printWindow.document.write(`
            <html><head><title>Issue Slip #${slip.issue_number}</title>
            <style>
                body { font-family: 'Segoe UI', sans-serif; padding: 30px; color: #333; }
                h2 { text-align: center; margin-bottom: 5px; }
                .info { display: flex; justify-content: space-between; margin: 15px 0; font-size: 14px; }
                table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                th, td { border: 1px solid #ccc; padding: 8px 12px; text-align: left; font-size: 13px; }
                th { background: #f1f5f9; font-weight: 700; }
                .footer { margin-top: 30px; display: flex; justify-content: space-between; font-size: 13px; }
                @media print { body { padding: 10px; } }
            </style></head><body>
            <h2>Issue Slip</h2>
            <div class="info">
                <div><b>Slip No:</b> ${slip.issue_number}</div>
                <div><b>Date:</b> ${slip.issue_date}</div>
                <div><b>Party:</b> ${slip.party_name}</div>
            </div>
            <table>
                <thead><tr><th>#</th><th>Company</th><th>Medicine</th><th>Potency</th><th>Batch</th><th>Location</th><th>Qty</th><th>MRP</th></tr></thead>
                <tbody>${(slip.items || []).map((item, i) => `
                    <tr>
                        <td>${i + 1}</td>
                        <td>${item.company || '-'}</td>
                        <td>${item.medicine_name}</td>
                        <td>${item.potency || '-'}</td>
                        <td>${item.batch_number || '-'}</td>
                        <td>${item.location_type ? `${item.godown || 'G1'} (${item.location_type} ${item.location_value})` : (item.godown || 'G1')}</td>
                        <td style="text-align:center;font-weight:700">${item.quantity}</td>
                        <td style="text-align:right">₹${item.mrp || 0}</td>
                    </tr>`).join('')}
                </tbody>
            </table>
            <div class="footer">
                <div><b>Total Items:</b> ${slip.total_items}</div>
                <div><b>Total Qty:</b> ${slip.total_qty}</div>
            </div>
            </body></html>
        `)
        printWindow.document.close()
        setTimeout(() => { printWindow.print() }, 300)
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '20px' }}>
            {toast && (
                <div style={{
                    position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999,
                    background: toast.type === 'success' ? '#10b981' : '#ef4444',
                    color: '#fff', padding: '14px 24px', borderRadius: '8px',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)', fontWeight: '600',
                    display: 'flex', alignItems: 'center', gap: '8px'
                }}>
                    <span>{toast.type === 'success' ? '✅' : '⚠️'}</span>
                    {toast.msg}
                </div>
            )}

            {/* Header Panel */}
            <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: activeTab === 'new' ? '20px' : '0' }}>
                    <h2 style={{ margin: 0, color: '#0f2d1f', fontSize: '20px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        📦 Issue Slips
                    </h2>
                    <div style={{ display: 'flex', gap: '8px', background: '#f1f5f9', padding: '4px', borderRadius: '8px' }}>
                        {!isYearLocked && <button onClick={() => setActiveTab('new')} style={{ padding: '8px 16px', background: activeTab === 'new' ? '#fff' : 'transparent', color: activeTab === 'new' ? '#0f2d1f' : '#64748b', border: 'none', borderRadius: '6px', fontWeight: '700', fontSize: '14px', cursor: 'pointer', boxShadow: activeTab === 'new' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.2s' }}>New Issue Slip</button>}
                        <button onClick={() => setActiveTab('history')} style={{ padding: '8px 16px', background: activeTab === 'history' ? '#fff' : 'transparent', color: activeTab === 'history' ? '#0f2d1f' : '#64748b', border: 'none', borderRadius: '6px', fontWeight: '700', fontSize: '14px', cursor: 'pointer', boxShadow: activeTab === 'history' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.2s' }}>History</button>
                    </div>
                </div>
                
                {activeTab === 'new' && (
                    <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
                    <div style={{ gridColumn: 'span 2' }}>
                        <label style={lbl}>Issued To (Party/Ledger)</label>
                        <AutocompleteDropdown
                            id="issue-ledger"
                            value={issuedTo}
                            options={ledgers}
                            onChange={setIssuedTo}
                            onEnter={() => document.getElementById('issue-date')?.focus()}
                            nameOnly={true}
                            placeholder="Select Ledger..."
                        />
                    </div>
                    <div>
                        <label style={lbl}>Date</label>
                        <DateInput id="issue-date"
                            
                            style={inp}
                            value={issueDate}
                            onChange={e => setIssueDate(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') {
                                    e.preventDefault()
                                    document.getElementById('issue-company')?.focus()
                                }
                            }}
                        />
                    </div>
                    <div>
                        <label style={lbl}>Issue Slip No.</label>
                        <input
                            type="text"
                            style={{...inp, background: '#e2e8f0', fontWeight: '700', color: '#1e293b'}}
                            value={issueNo}
                            readOnly
                        />
                    </div>
                </div>
                    </>
                )}
            </div>

            {/* Main Content Area */}
            {activeTab === 'new' ? (
                <div style={{ display: 'flex', gap: '20px', flex: 1, minHeight: 0 }}>
                
                {/* Entry Panel */}
                <div style={{ width: '420px', background: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', display: 'flex', flexDirection: 'column', gap: '20px', overflow: 'visible' }}>
                    <h3 style={{ margin: 0, color: '#0f2d1f', fontSize: '16px', fontWeight: '700', paddingBottom: '12px', borderBottom: '2px solid #f1f5f9' }}>Add Item</h3>
                    
                    <div>
                        <label style={lbl}>Company</label>
                        <AutocompleteDropdown
                            id="issue-company"
                            value={selectedCompany}
                            options={companies}
                            onChange={setSelectedCompany}
                            onEnter={() => document.getElementById('issue-med')?.focus()}
                            nameOnly={true}
                            placeholder="All Companies"
                            maxItems={1000}
                        />
                    </div>
                    
                    <div>
                        <label style={lbl}>Medicine Name</label>
                        <AutocompleteDropdown
                            id="issue-med"
                            value={selectedMedicine}
                            options={filteredMedicines}
                            onChange={handleMedicineSelect}
                            onEnter={() => {}}
                            placeholder="Search Medicine..."
                            maxItems={1000}
                        />
                    </div>
                    
                    {stagingEntry && stagingEntry.batch_id && (
                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>Selected Batch</div>
                                <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>{stagingEntry.batch_number}</div>
                                <div style={{ fontSize: '12px', color: '#3b82f6', fontWeight: '600', marginTop: '2px' }}>{stagingEntry.loc}</div>
                                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>MRP: ₹{stagingEntry.mrp}</div>
                            </div>
                            
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={lbl}>Quantity</label>
                                    <input
                                        id="issue-qty-input"
                                        type="number"
                                        style={inp}
                                        value={stagingEntry.quantity}
                                        onChange={e => setStagingEntry({...stagingEntry, quantity: e.target.value})}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') {
                                                if (parseInt(stagingEntry.quantity) > stagingEntry.available_qty) {
                                                    showToast(`Quantity cannot exceed available stock (${stagingEntry.available_qty})`, 'error')
                                                    return
                                                }
                                                document.getElementById('issue-dis-input')?.focus()
                                            }
                                        }}
                                        min="1"
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={lbl}>Discount (Rs)</label>
                                    <input
                                        id="issue-dis-input"
                                        type="number"
                                        style={inp}
                                        value={stagingEntry.discount_rs}
                                        onChange={e => setStagingEntry({...stagingEntry, discount_rs: e.target.value})}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') handleAddItem()
                                        }}
                                        min="0"
                                    />
                                </div>
                            </div>
                            
                            <button
                                onClick={handleAddItem}
                                style={{
                                    padding: '12px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px',
                                    fontWeight: '700', fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = '#059669'}
                                onMouseLeave={e => e.currentTarget.style.background = '#10b981'}
                            >
                                <span>➕</span> Add Item
                            </button>
                        </div>
                    )}
                </div>
                
                {/* Table Panel */}
                <div style={{ flex: 1, background: '#fff', borderRadius: '16px', padding: '0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <div style={{ overflowX: 'auto', flex: 1 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px', whiteSpace: 'nowrap' }}>
                            <thead style={{ background: '#f8fafc', position: 'sticky', top: 0, zIndex: 10 }}>
                                <tr>
                                    <th style={{ padding: '16px', borderBottom: '2px solid #e2e8f0', color: '#475569', fontWeight: '700' }}>S.No</th>
                                    <th style={{ padding: '16px', borderBottom: '2px solid #e2e8f0', color: '#475569', fontWeight: '700' }}>Company</th>
                                    <th style={{ padding: '16px', borderBottom: '2px solid #e2e8f0', color: '#475569', fontWeight: '700' }}>Medicine Name</th>
                                    <th style={{ padding: '16px', borderBottom: '2px solid #e2e8f0', color: '#475569', fontWeight: '700' }}>Type</th>
                                    <th style={{ padding: '16px', borderBottom: '2px solid #e2e8f0', color: '#475569', fontWeight: '700' }}>Power</th>
                                    <th style={{ padding: '16px', borderBottom: '2px solid #e2e8f0', color: '#475569', fontWeight: '700' }}>Packing</th>
                                    <th style={{ padding: '16px', borderBottom: '2px solid #e2e8f0', color: '#475569', fontWeight: '700', textAlign: 'center' }}>Qty</th>
                                    <th style={{ padding: '16px', borderBottom: '2px solid #e2e8f0', color: '#475569', fontWeight: '700' }}>Location / Godown</th>
                                    <th style={{ padding: '16px', borderBottom: '2px solid #e2e8f0', color: '#475569', fontWeight: '700' }}>Batch</th>
                                    <th style={{ padding: '16px', borderBottom: '2px solid #e2e8f0', color: '#475569', fontWeight: '700', textAlign: 'right' }}>Dis (Rs)</th>
                                    <th style={{ padding: '16px', borderBottom: '2px solid #e2e8f0', color: '#475569', fontWeight: '700', textAlign: 'right' }}>MRP</th>
                                    <th style={{ padding: '16px', borderBottom: '2px solid #e2e8f0', color: '#475569', fontWeight: '700', textAlign: 'center' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {issueItems.length === 0 ? (
                                    <tr>
                                        <td colSpan="12" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
                                            No items added yet. Search and select a medicine to begin.
                                        </td>
                                    </tr>
                                ) : issueItems.map((item, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                        <td style={{ padding: '12px 16px', color: '#64748b' }}>{idx + 1}</td>
                                        <td style={{ padding: '12px 16px', fontWeight: '600', color: '#475569' }}>{item.company}</td>
                                        <td style={{ padding: '12px 16px', fontWeight: '700', color: '#0f172a' }}>{item.medicine_name}</td>
                                        <td style={{ padding: '12px 16px', color: '#64748b' }}>{item.category}</td>
                                        <td style={{ padding: '12px 16px', color: '#059669', fontWeight: '600' }}>{item.potency}</td>
                                        <td style={{ padding: '12px 16px', color: '#64748b' }}>{item.unit}</td>
                                        <td style={{ padding: '12px 16px', fontWeight: '800', color: '#2563eb', textAlign: 'center' }}>{item.quantity}</td>
                                        <td style={{ padding: '12px 16px', color: '#475569' }}>{item.loc}</td>
                                        <td style={{ padding: '12px 16px', color: '#475569' }}>{item.batch_number}</td>
                                        <td style={{ padding: '12px 16px', color: '#ef4444', fontWeight: '600', textAlign: 'right' }}>{item.discount_rs ? `₹${item.discount_rs}` : '-'}</td>
                                        <td style={{ padding: '12px 16px', color: '#0f172a', fontWeight: '600', textAlign: 'right' }}>₹{item.mrp}</td>
                                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                            <button
                                                onClick={() => removeItem(idx)}
                                                style={{ border: 'none', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', width: '28px', height: '28px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}
                                                onMouseEnter={e => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = '#fff' }}
                                                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; e.currentTarget.style.color = '#ef4444' }}
                                                title="Delete Row"
                                            >
                                                🗑️
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    
                    {/* Footer */}
                    <div style={{ padding: '20px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: '32px' }}>
                            <div>
                                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Items</div>
                                <div style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a' }}>{issueItems.length}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Qty</div>
                                <div style={{ fontSize: '24px', fontWeight: '800', color: '#2563eb' }}>
                                    {issueItems.reduce((acc, curr) => acc + parseInt(curr.quantity || 0), 0)}
                                </div>
                            </div>
                        </div>
                        
                        <button
                            onClick={handleSave}
                            style={{
                                padding: '14px 32px', background: '#0f2d1f', color: '#34d399', border: 'none', borderRadius: '10px',
                                fontSize: '16px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 4px 12px rgba(15, 45, 31, 0.2)',
                                transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(15, 45, 31, 0.3)' }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(15, 45, 31, 0.2)' }}
                        >
                            <span>💾</span> Save Issue Slip
                        </button>
                    </div>
                </div>
            </div>
            ) : (
                <div style={{ flex: 1, background: '#fff', borderRadius: '16px', padding: '0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <div style={{ overflowX: 'auto', flex: 1 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px', whiteSpace: 'nowrap' }}>
                            <thead style={{ background: '#f8fafc', position: 'sticky', top: 0, zIndex: 10 }}>
                                <tr>
                                    <th style={{ padding: '16px', borderBottom: '2px solid #e2e8f0', color: '#475569', fontWeight: '700' }}>Issue Date</th>
                                    <th style={{ padding: '16px', borderBottom: '2px solid #e2e8f0', color: '#475569', fontWeight: '700' }}>Issue No</th>
                                    <th style={{ padding: '16px', borderBottom: '2px solid #e2e8f0', color: '#475569', fontWeight: '700' }}>Party Name</th>
                                    <th style={{ padding: '16px', borderBottom: '2px solid #e2e8f0', color: '#475569', fontWeight: '700', textAlign: 'center' }}>Total Items</th>
                                    <th style={{ padding: '16px', borderBottom: '2px solid #e2e8f0', color: '#475569', fontWeight: '700', textAlign: 'center' }}>Total Qty</th>
                                    <th style={{ padding: '16px', borderBottom: '2px solid #e2e8f0', color: '#475569', fontWeight: '700', textAlign: 'center' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {historySlips.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
                                            No Issue Slips found.
                                        </td>
                                    </tr>
                                ) : historySlips.map((slip, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                        <td style={{ padding: '12px 16px', color: '#64748b' }}>{slip.issue_date}</td>
                                        <td style={{ padding: '12px 16px', fontWeight: '700', color: '#0f172a' }}>{slip.issue_number}</td>
                                        <td style={{ padding: '12px 16px', fontWeight: '600', color: '#475569' }}>{slip.party_name}</td>
                                        <td style={{ padding: '12px 16px', color: '#2563eb', fontWeight: '800', textAlign: 'center' }}>{slip.total_items}</td>
                                        <td style={{ padding: '12px 16px', color: '#059669', fontWeight: '800', textAlign: 'center' }}>{slip.total_qty}</td>
                                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                                {!isYearLocked && (
                                                    <button onClick={() => handleEditSlip(slip.id)} title="Edit" style={{ border: 'none', background: 'rgba(234, 179, 8, 0.15)', color: '#b45309', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.background = '#eab308'; e.currentTarget.style.color = '#fff' }} onMouseLeave={e => { e.currentTarget.style.background = 'rgba(234, 179, 8, 0.15)'; e.currentTarget.style.color = '#b45309' }}>Edit</button>
                                                )}
                                                <button onClick={() => handleViewSlip(slip.id)} title="View" style={{ border: 'none', background: 'rgba(59, 130, 246, 0.15)', color: '#2563eb', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.background = '#3b82f6'; e.currentTarget.style.color = '#fff' }} onMouseLeave={e => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)'; e.currentTarget.style.color = '#2563eb' }}>View</button>
                                                <button onClick={async () => { const s = await window.api.getIssueSlipById(slip.id); if (s) handlePrintSlip(s); }} title="Print" style={{ border: 'none', background: 'rgba(16, 185, 129, 0.15)', color: '#059669', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.background = '#10b981'; e.currentTarget.style.color = '#fff' }} onMouseLeave={e => { e.currentTarget.style.background = 'rgba(16, 185, 129, 0.15)'; e.currentTarget.style.color = '#059669' }}>Print</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* View Modal */}
            {viewModal.show && viewModal.data && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
                    <div style={{ background: '#fff', width: '700px', maxHeight: '80vh', borderRadius: '16px', padding: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, fontSize: '20px', color: '#0f2d1f', fontWeight: '800' }}>📦 Issue Slip #{viewModal.data.issue_number}</h3>
                            <button onClick={() => setViewModal({ show: false, data: null })} style={{ border: 'none', background: 'none', fontSize: '24px', cursor: 'pointer', color: '#94a3b8' }}>&times;</button>
                        </div>
                        <div style={{ display: 'flex', gap: '24px', marginBottom: '20px', fontSize: '14px', color: '#475569' }}>
                            <div><span style={{ fontWeight: '700' }}>Date:</span> {viewModal.data.issue_date}</div>
                            <div><span style={{ fontWeight: '700' }}>Party:</span> {viewModal.data.party_name}</div>
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead style={{ background: '#f8fafc' }}>
                                <tr>
                                    <th style={{ padding: '12px', borderBottom: '2px solid #e2e8f0', color: '#475569', fontWeight: '700', textAlign: 'left' }}>#</th>
                                    <th style={{ padding: '12px', borderBottom: '2px solid #e2e8f0', color: '#475569', fontWeight: '700', textAlign: 'left' }}>Company</th>
                                    <th style={{ padding: '12px', borderBottom: '2px solid #e2e8f0', color: '#475569', fontWeight: '700', textAlign: 'left' }}>Medicine</th>
                                    <th style={{ padding: '12px', borderBottom: '2px solid #e2e8f0', color: '#475569', fontWeight: '700', textAlign: 'left' }}>Potency</th>
                                    <th style={{ padding: '12px', borderBottom: '2px solid #e2e8f0', color: '#475569', fontWeight: '700', textAlign: 'left' }}>Batch</th>
                                    <th style={{ padding: '12px', borderBottom: '2px solid #e2e8f0', color: '#475569', fontWeight: '700', textAlign: 'left' }}>Location</th>
                                    <th style={{ padding: '12px', borderBottom: '2px solid #e2e8f0', color: '#475569', fontWeight: '700', textAlign: 'center' }}>Qty</th>
                                    <th style={{ padding: '12px', borderBottom: '2px solid #e2e8f0', color: '#475569', fontWeight: '700', textAlign: 'right' }}>MRP</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(viewModal.data.items || []).map((item, i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '10px 12px', color: '#64748b' }}>{i + 1}</td>
                                        <td style={{ padding: '10px 12px', color: '#475569' }}>{item.company || '-'}</td>
                                        <td style={{ padding: '10px 12px', fontWeight: '600', color: '#0f172a' }}>{item.medicine_name}</td>
                                        <td style={{ padding: '10px 12px', color: '#059669', fontWeight: '600' }}>{item.potency || '-'}</td>
                                        <td style={{ padding: '10px 12px', color: '#475569' }}>{item.batch_number || '-'}</td>
                                        <td style={{ padding: '10px 12px', color: '#475569' }}>{item.location_type ? `${item.godown || 'G1'} (${item.location_type} ${item.location_value})` : (item.godown || 'G1')}</td>
                                        <td style={{ padding: '10px 12px', color: '#2563eb', fontWeight: '800', textAlign: 'center' }}>{item.quantity}</td>
                                        <td style={{ padding: '10px 12px', color: '#0f172a', fontWeight: '600', textAlign: 'right' }}>₹{item.mrp || 0}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', gap: '24px', fontSize: '14px' }}>
                                <div><span style={{ fontWeight: '700', color: '#475569' }}>Total Items:</span> <span style={{ fontWeight: '800', color: '#0f172a' }}>{viewModal.data.total_items}</span></div>
                                <div><span style={{ fontWeight: '700', color: '#475569' }}>Total Qty:</span> <span style={{ fontWeight: '800', color: '#2563eb' }}>{viewModal.data.total_qty}</span></div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={() => { handlePrintSlip(viewModal.data) }} style={{ padding: '10px 20px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>🖨️ Print</button>
                                <button onClick={() => setViewModal({ show: false, data: null })} style={{ padding: '10px 20px', background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Batch Selection Modal */}
            {batchModalVisible && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
                    <div 
                        id="issue-batch-modal"
                        tabIndex={0}
                        style={{ background: '#fff', width: '600px', borderRadius: '16px', padding: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', outline: 'none' }}
                        onKeyDown={e => {
                            if (e.key === 'ArrowDown') {
                                e.preventDefault()
                                setFocusedBatchIdx(prev => prev < liveBatches.length - 1 ? prev + 1 : prev)
                            } else if (e.key === 'ArrowUp') {
                                e.preventDefault()
                                setFocusedBatchIdx(prev => prev > 0 ? prev - 1 : prev)
                            } else if (e.key === 'Enter') {
                                e.preventDefault()
                                const b = liveBatches[focusedBatchIdx]
                                if (b && b.quantity > 0) {
                                    setStagingEntry({
                                        ...stagingEntry,
                                        batch_id: b.id,
                                        batch_number: b.batch_number || b.batch_no || '-',
                                        mrp: b.mrp,
                                        loc: b.location_type ? `${b.godown || 'G1'} (${b.location_type} ${b.location_value})` : (b.godown || 'G1'),
                                        available_qty: b.quantity
                                    })
                                    setBatchModalVisible(false)
                                    setTimeout(() => document.getElementById('issue-qty-input')?.focus(), 100)
                                }
                            } else if (e.key === 'Escape') {
                                setBatchModalVisible(false)
                                setTimeout(() => document.getElementById('issue-med')?.focus(), 100)
                            }
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <h3 style={{ margin: 0, fontSize: '20px', color: '#0f2d1f', fontWeight: '800' }}>Select Godown/Batch</h3>
                            <button onClick={() => setBatchModalVisible(false)} style={{ border: 'none', background: 'none', fontSize: '24px', cursor: 'pointer', color: '#94a3b8' }}>&times;</button>
                        </div>
                        <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#64748b' }}>
                            Available stock for <span style={{color: '#10b981', fontWeight: '700'}}>{stagingEntry?.medicine_name}</span>
                        </p>
                        
                        <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                                <thead style={{ background: '#f8fafc' }}>
                                    <tr>
                                        <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: '700' }}>Godown</th>
                                        <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: '700' }}>Location</th>
                                        <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: '700' }}>Batch</th>
                                        <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: '700' }}>Qty Available</th>
                                        <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: '700' }}>MRP</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {liveBatches.map((b, idx) => (
                                        <tr 
                                            key={b.id}
                                            style={{ 
                                                background: idx === focusedBatchIdx ? '#dcfce7' : '#fff', 
                                                cursor: b.quantity > 0 ? 'pointer' : 'not-allowed',
                                                opacity: b.quantity > 0 ? 1 : 0.6,
                                                borderBottom: idx < liveBatches.length - 1 ? '1px solid #f1f5f9' : 'none'
                                            }}
                                            onClick={() => {
                                                if (b.quantity <= 0) return
                                                setFocusedBatchIdx(idx)
                                                setStagingEntry({
                                                    ...stagingEntry,
                                                    batch_id: b.id,
                                                    batch_number: b.batch_number || b.batch_no || '-',
                                                    mrp: b.mrp,
                                                    loc: b.location_type ? `${b.godown || 'G1'} (${b.location_type} ${b.location_value})` : (b.godown || 'G1'),
                                                    available_qty: b.quantity
                                                })
                                                setBatchModalVisible(false)
                                                setTimeout(() => document.getElementById('issue-qty-input')?.focus(), 100)
                                            }}
                                            onMouseEnter={() => b.quantity > 0 && setFocusedBatchIdx(idx)}
                                        >
                                            <td style={{ padding: '12px 16px', color: '#334155' }}>{b.godown || 'G1'}</td>
                                            <td style={{ padding: '12px 16px', fontWeight: '700', color: '#0f172a' }}>{b.location_type && b.location_value ? `${b.location_type} ${b.location_value}` : '-'}</td>
                                            <td style={{ padding: '12px 16px', color: '#334155' }}>{b.batch_number || b.batch_no || '-'}</td>
                                            <td style={{ padding: '12px 16px', color: '#2563eb', fontWeight: '700' }}>{b.quantity}</td>
                                            <td style={{ padding: '12px 16px', color: '#0f172a', fontWeight: '600' }}>₹{b.mrp}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button onClick={() => {
                                setBatchModalVisible(false)
                                setTimeout(() => document.getElementById('issue-med')?.focus(), 100)
                            }} style={{ padding: '10px 24px', background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#cbd5e1'} onMouseLeave={e => e.currentTarget.style.background = '#e2e8f0'}>Cancel (Esc)</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

import { useState, useEffect, useRef } from 'react'
import html2pdf from 'html2pdf.js'

export default function ItemLedger() {
    const [medicines, setMedicines] = useState([])
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedMedicine, setSelectedMedicine] = useState(null)
    const [ledger, setLedger] = useState([])
    const [loading, setLoading] = useState(false)
    const [isExporting, setIsExporting] = useState(false)
    const [toast, setToast] = useState({ show: false, msg: '', type: 'success' })
    const reportRef = useRef(null)

    // Load medicines for search dropdown
    useEffect(() => {
        window.api.getMedicines().then(data => setMedicines(data || []))
    }, [])

    function showToast(msg, type = 'success') {
        setToast({ show: true, msg, type })
        setTimeout(() => setToast({ show: false, msg: '', type: 'success' }), 3000)
    }

    const filteredMedicines = searchQuery.trim() === '' ? [] : medicines.filter(m => {
        const searchStr = `${m.name} ${m.potency || ''} ${m.unit || ''} ${m.company || ''}`.toLowerCase();
        const searchTerms = searchQuery.toLowerCase().split(/\s+/).filter(Boolean);
        return searchTerms.every(term => searchStr.includes(term));
    }).slice(0, 1000)

    async function loadLedger(medicineId) {
        setLoading(true)
        try {
            const data = await window.api.getItemLedger(medicineId)
            
            // Calculate running balance
            let balance = 0
            const processedData = (data || []).map(row => {
                balance += (Number(row.qty_in) - Number(row.qty_out))
                return { ...row, balance }
            })
            
            setLedger(processedData)
        } catch (err) {
            console.error(err)
            showToast('Failed to load ledger', 'error')
        }
        setLoading(false)
    }

    function handleSelectMedicine(med) {
        setSelectedMedicine(med)
        setSearchQuery('') // clear search box
        loadLedger(med.id)
    }

    function handleExportPDF() {
        if (!reportRef.current || ledger.length === 0) return
        
        setIsExporting(true)
        showToast('Preparing PDF...', 'success')
        
        setTimeout(() => {
            const opt = {
                margin: [10, 10, 10, 10],
                filename: `Item_Ledger_${selectedMedicine.name.replace(/[^a-z0-9]/gi, '_')}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, logging: false },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
                pagebreak: { mode: 'css', avoid: 'tr' }
            }
            
            html2pdf().set(opt).from(reportRef.current).save().then(() => {
                setIsExporting(false)
                showToast('PDF Exported Successfully!', 'success')
            }).catch(err => {
                console.error(err)
                setIsExporting(false)
                showToast('Failed to export PDF', 'error')
            })
        }, 500)
    }

    const tableHeaderStyle = {
        background: '#f8fafc',
        padding: '12px 16px',
        textAlign: 'left',
        fontSize: '12px',
        fontWeight: '700',
        color: '#475569',
        borderBottom: '2px solid #e2e8f0',
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
    }

    const tableCellStyle = {
        padding: '12px 16px',
        fontSize: '13px',
        color: '#1e293b',
        borderBottom: '1px solid #f1f5f9',
        fontWeight: '500'
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ margin: '0 0 4px 0', fontSize: '28px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em' }}>Item Ledger</h1>
                    <p style={{ margin: 0, fontSize: '14px', color: '#64748b', fontWeight: '500' }}>Date-wise Stock Movement</p>
                </div>
                
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>🔍</span>
                        <input 
                            type="text" 
                            placeholder="Search Medicine to View Ledger..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            disabled={isExporting}
                            style={{
                                padding: '10px 16px 10px 36px',
                                borderRadius: '8px',
                                border: '1px solid #cbd5e1',
                                width: '300px',
                                outline: 'none',
                                fontSize: '14px',
                                fontFamily: 'Outfit, sans-serif',
                                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                                opacity: isExporting ? 0.5 : 1
                            }}
                        />
                        {/* Search Results Dropdown */}
                        {searchQuery.trim() !== '' && (
                            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', marginTop: '4px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', zIndex: 50, maxHeight: '300px', overflowY: 'auto' }}>
                                {filteredMedicines.length === 0 ? (
                                    <div style={{ padding: '12px 16px', color: '#64748b', fontSize: '14px' }}>No medicines found.</div>
                                ) : (
                                    filteredMedicines.map(m => (
                                        <div 
                                            key={m.id}
                                            onClick={() => handleSelectMedicine(m)}
                                            style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.2s' }}
                                            onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                                            onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                                        >
                                            <div style={{ fontWeight: '600', color: '#0f172a' }}>{m.name}</div>
                                            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{m.potency} {m.unit} | {m.company}</div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                    
                    <button 
                        onClick={handleExportPDF}
                        disabled={isExporting || !selectedMedicine || ledger.length === 0}
                        style={{
                            background: (isExporting || !selectedMedicine || ledger.length === 0) ? '#94a3b8' : '#10b981',
                            color: 'white',
                            border: 'none',
                            padding: '10px 20px',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: (isExporting || !selectedMedicine || ledger.length === 0) ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)',
                            transition: 'all 0.2s'
                        }}
                    >
                        <span>{isExporting ? '⏳' : '📄'}</span> {isExporting ? 'Exporting...' : 'Export PDF'}
                    </button>
                </div>
            </div>

            {/* Main Report Container */}
            <div style={{ flex: 1, background: '#fff', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {!selectedMedicine ? (
                    <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#94a3b8', flexDirection: 'column', gap: '12px' }}>
                        <span style={{ fontSize: '48px' }}>🔍</span>
                        <div style={{ fontSize: '16px', fontWeight: '500' }}>Search and select a medicine to view its ledger</div>
                    </div>
                ) : (
                    <div style={{ flex: 1, overflow: 'auto' }}>
                        <div ref={reportRef} style={{ padding: '24px', minWidth: '900px' }}>
                            
                            {/* PDF Header */}
                            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                                <h2 style={{ margin: '0 0 4px 0', fontSize: '24px', color: '#0f172a' }}>Item Ledger</h2>
                                <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#334155' }}>
                                    {selectedMedicine.name} {selectedMedicine.potency && `(${selectedMedicine.potency})`}
                                </h3>
                                <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
                                    Company: {selectedMedicine.company || '-'} | Unit: {selectedMedicine.unit || '-'}
                                </p>
                            </div>

                            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Outfit, sans-serif' }}>
                                <thead>
                                    <tr>
                                        <th style={tableHeaderStyle}>Date</th>
                                        <th style={tableHeaderStyle}>Voucher Type</th>
                                        <th style={tableHeaderStyle}>Reference / Party</th>
                                        <th style={tableHeaderStyle}>Batch</th>
                                        <th style={{...tableHeaderStyle, textAlign: 'right', background: '#f0fdf4', color: '#166534'}}>In (Qty)</th>
                                        <th style={{...tableHeaderStyle, textAlign: 'right', background: '#fef2f2', color: '#991b1b'}}>Out (Qty)</th>
                                        <th style={{...tableHeaderStyle, textAlign: 'right', background: '#f0f9ff', color: '#0369a1'}}>Balance</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Loading ledger data...</td></tr>
                                    ) : ledger.length === 0 ? (
                                        <tr><td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>No transactions found for this item.</td></tr>
                                    ) : (
                                        ledger.map((row, i) => (
                                            <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa', pageBreakInside: 'avoid' }}>
                                                <td style={{...tableCellStyle, whiteSpace: 'nowrap'}}>
                                                    {new Date(row.date).toLocaleDateString('en-IN')}
                                                </td>
                                                <td style={{...tableCellStyle, fontWeight: '600'}}>
                                                    {row.type}
                                                </td>
                                                <td style={tableCellStyle}>
                                                    <div style={{ color: '#0f172a', fontWeight: '500' }}>{row.reference || '-'}</div>
                                                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{row.party_name || 'Walk-in'}</div>
                                                </td>
                                                <td style={tableCellStyle}>{row.batch || '-'}</td>
                                                <td style={{...tableCellStyle, textAlign: 'right', background: '#f0fdf4', fontWeight: '700', color: row.qty_in > 0 ? '#166534' : 'inherit'}}>
                                                    {row.qty_in > 0 ? row.qty_in : '-'}
                                                </td>
                                                <td style={{...tableCellStyle, textAlign: 'right', background: '#fef2f2', fontWeight: '700', color: row.qty_out > 0 ? '#991b1b' : 'inherit'}}>
                                                    {row.qty_out > 0 ? row.qty_out : '-'}
                                                </td>
                                                <td style={{...tableCellStyle, textAlign: 'right', background: '#f0f9ff', fontWeight: '800', color: '#0369a1', fontSize: '14px'}}>
                                                    {row.balance}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Toast Alert */}
            {toast.show && (
                <div style={{
                    position: 'fixed', bottom: '24px', right: '24px',
                    background: toast.type === 'error' ? '#fee2e2' : '#dcfce7',
                    border: `1px solid ${toast.type === 'error' ? '#fca5a5' : '#86efac'}`,
                    color: toast.type === 'error' ? '#991b1b' : '#14532d',
                    padding: '14px 24px', borderRadius: '12px',
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                    display: 'flex', alignItems: 'center', gap: '12px',
                    fontSize: '14px', fontWeight: '600', zIndex: 99999,
                    animation: 'slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}>
                    <span style={{ fontSize: '18px' }}>{toast.type === 'error' ? '❌' : '✅'}</span>
                    <span>{toast.msg}</span>
                </div>
            )}
        </div>
    )
}

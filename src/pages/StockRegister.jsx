import { useState, useEffect, useRef } from 'react'
import html2pdf from 'html2pdf.js'

export default function StockRegister() {
    const [batches, setBatches] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [activeTab, setActiveTab] = useState('item-wise') // 'item-wise' or 'company-wise'
    const [currentPage, setCurrentPage] = useState(1)
    const [isExporting, setIsExporting] = useState(false)
    const [toast, setToast] = useState({ show: false, msg: '', type: 'success' })
    const itemsPerPage = 50
    const reportRef = useRef(null)

    useEffect(() => {
        loadData()
    }, [])

    useEffect(() => {
        setCurrentPage(1)
    }, [search, activeTab])

    async function loadData() {
        setLoading(true)
        try {
            const data = await window.api.getAllStockBatches()
            setBatches(data || [])
        } catch (error) {
            console.error('Failed to load stock batches', error)
        }
        setLoading(false)
    }

    const filteredBatches = batches.filter(b => 
        (b.medicine_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (b.company || '').toLowerCase().includes(search.toLowerCase()) ||
        (b.batch_no || '').toLowerCase().includes(search.toLowerCase())
    )

    // Calculate Grand Totals
    const totalPurchaseValuation = filteredBatches.reduce((sum, b) => sum + (Number(b.quantity) * Number(b.purchase_price || 0)), 0)
    const totalMRPValuation = filteredBatches.reduce((sum, b) => sum + (Number(b.quantity) * Number(b.mrp || 0)), 0)

    // Calculate Company-wise Totals
    const companyTotalsMap = filteredBatches.reduce((acc, b) => {
        const company = b.company || 'Unknown / Uncategorized'
        if (!acc[company]) {
            acc[company] = { company, totalQty: 0, totalPurchaseValue: 0, totalMRPValue: 0 }
        }
        acc[company].totalQty += Number(b.quantity || 0)
        acc[company].totalPurchaseValue += (Number(b.quantity) * Number(b.purchase_price || 0))
        acc[company].totalMRPValue += (Number(b.quantity) * Number(b.mrp || 0))
        return acc
    }, {})

    const companyList = Object.values(companyTotalsMap).sort((a,b) => a.company.localeCompare(b.company))

    // Pagination for Item-wise View
    const totalPages = Math.ceil(filteredBatches.length / itemsPerPage)
    const paginatedBatches = isExporting ? filteredBatches : filteredBatches.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

    function showToast(msg, type = 'success') {
        setToast({ show: true, msg, type })
        setTimeout(() => setToast({ show: false, msg: '', type: 'success' }), 3000)
    }

    async function handleExportPDF() {
        if (!reportRef.current) return
        
        setIsExporting(true)
        
        // Wait for React to render all items in the DOM
        setTimeout(() => {
            const opt = {
                margin: [10, 10, 10, 10],
                filename: `Closing_Stock_${activeTab === 'item-wise' ? 'Detailed' : 'CompanyWise'}_${new Date().toISOString().split('T')[0]}.pdf`,
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
        }, 500) // 500ms delay to ensure DOM is fully updated with all rows
    }
    // Modern Premium Styling
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

    const tabStyle = (isActive) => ({
        padding: '10px 20px',
        borderBottom: isActive ? '3px solid #10b981' : '3px solid transparent',
        color: isActive ? '#0f172a' : '#64748b',
        fontWeight: isActive ? '700' : '600',
        cursor: 'pointer',
        fontSize: '14px',
        background: 'transparent',
        borderTop: 'none', borderLeft: 'none', borderRight: 'none',
        transition: 'all 0.2s',
        display: 'flex', alignItems: 'center', gap: '8px'
    })

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ margin: '0 0 4px 0', fontSize: '28px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em' }}>Stock Register</h1>
                    <p style={{ margin: 0, fontSize: '14px', color: '#64748b', fontWeight: '500' }}>Closing Stock Valuation Report</p>
                </div>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>🔍</span>
                        <input 
                            type="text" 
                            placeholder="Search item, company or batch..." 
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            disabled={isExporting}
                            style={{
                                padding: '10px 16px 10px 36px',
                                borderRadius: '8px',
                                border: '1px solid #cbd5e1',
                                width: '280px',
                                outline: 'none',
                                fontSize: '14px',
                                fontFamily: 'Outfit, sans-serif',
                                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                                opacity: isExporting ? 0.5 : 1
                            }}
                        />
                    </div>
                    <button 
                        onClick={handleExportPDF}
                        disabled={isExporting}
                        style={{
                            background: isExporting ? '#94a3b8' : '#10b981',
                            color: 'white',
                            border: 'none',
                            padding: '10px 20px',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: isExporting ? 'wait' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2), 0 2px 4px -1px rgba(16, 185, 129, 0.1)',
                            transition: 'all 0.2s'
                        }}
                    >
                        <span>{isExporting ? '⏳' : '📄'}</span> {isExporting ? 'Exporting...' : 'Export PDF'}
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '16px' }}>
                <button style={tabStyle(activeTab === 'item-wise')} onClick={() => setActiveTab('item-wise')} disabled={isExporting}>
                    <span>📋</span> Item-Wise Statement
                </button>
                <button style={tabStyle(activeTab === 'company-wise')} onClick={() => setActiveTab('company-wise')} disabled={isExporting}>
                    <span>🏢</span> Company-Wise Total
                </button>
            </div>

            {/* Main Report Container */}
            <div style={{ flex: 1, background: '#fff', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                
                <div style={{ flex: 1, overflow: 'auto' }}>
                    <div ref={reportRef} style={{ padding: '24px', minWidth: '900px' }}>
                        
                        {/* PDF Header */}
                        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                            <h2 style={{ margin: '0 0 4px 0', fontSize: '24px', color: '#0f172a' }}>
                                Closing Stock Statement {activeTab === 'company-wise' ? '(Company-Wise)' : ''}
                            </h2>
                            <p style={{ margin: 0, color: '#64748b' }}>As of {new Date().toLocaleDateString('en-IN')}</p>
                        </div>

                        {activeTab === 'item-wise' ? (
                            <>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Outfit, sans-serif' }}>
                                    <thead>
                                        <tr>
                                            <th style={tableHeaderStyle}>Item Details</th>
                                            <th style={tableHeaderStyle}>Company</th>
                                            <th style={tableHeaderStyle}>Batch & Expiry</th>
                                            <th style={{...tableHeaderStyle, textAlign: 'right'}}>Quantity</th>
                                            <th style={{...tableHeaderStyle, textAlign: 'right'}}>P. Rate (₹)</th>
                                            <th style={{...tableHeaderStyle, textAlign: 'right'}}>MRP (₹)</th>
                                            <th style={{...tableHeaderStyle, textAlign: 'right', background: '#f0fdf4', color: '#166534'}}>Value (P.Rate)</th>
                                            <th style={{...tableHeaderStyle, textAlign: 'right', background: '#f0f9ff', color: '#0369a1'}}>Value (MRP)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? (
                                            <tr><td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Loading stock data...</td></tr>
                                        ) : paginatedBatches.length === 0 ? (
                                            <tr><td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>No stock found.</td></tr>
                                        ) : (
                                            paginatedBatches.map((b, i) => (
                                                <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa', pageBreakInside: 'avoid' }}>
                                                    <td style={tableCellStyle}>
                                                        <div style={{ fontWeight: '600', color: '#0f172a' }}>{b.medicine_name}</div>
                                                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                                            {b.potency && `${b.potency} `}{b.unit} {b.category && `| ${b.category}`}
                                                        </div>
                                                    </td>
                                                    <td style={tableCellStyle}>{b.company || '-'}</td>
                                                    <td style={tableCellStyle}>
                                                        <div style={{ fontWeight: '600' }}>{b.batch_no || '-'}</div>
                                                        {b.expiry_month && b.expiry_year && (
                                                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                                                Exp: {String(b.expiry_month).padStart(2, '0')}/{b.expiry_year}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td style={{...tableCellStyle, textAlign: 'right', fontWeight: '700', color: '#0f172a'}}>{b.quantity}</td>
                                                    <td style={{...tableCellStyle, textAlign: 'right'}}>{Number(b.purchase_price || 0).toFixed(2)}</td>
                                                    <td style={{...tableCellStyle, textAlign: 'right'}}>{Number(b.mrp || 0).toFixed(2)}</td>
                                                    <td style={{...tableCellStyle, textAlign: 'right', background: '#f0fdf4', fontWeight: '700', color: '#166534'}}>
                                                        {(Number(b.quantity) * Number(b.purchase_price || 0)).toFixed(2)}
                                                    </td>
                                                    <td style={{...tableCellStyle, textAlign: 'right', background: '#f0f9ff', fontWeight: '700', color: '#0369a1'}}>
                                                        {(Number(b.quantity) * Number(b.mrp || 0)).toFixed(2)}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>

                                {/* Pagination Controls */}
                                {!loading && !isExporting && totalPages > 1 && (
                                    <div id="stock-pagination" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', padding: '16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                        <button 
                                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                            disabled={currentPage === 1}
                                            style={{ padding: '6px 12px', background: currentPage === 1 ? '#e2e8f0' : '#1e293b', color: currentPage === 1 ? '#94a3b8' : '#fff', border: 'none', borderRadius: '6px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                                        >
                                            Previous
                                        </button>
                                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>
                                            Page {currentPage} of {totalPages}
                                        </span>
                                        <button 
                                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                            disabled={currentPage === totalPages}
                                            style={{ padding: '6px 12px', background: currentPage === totalPages ? '#e2e8f0' : '#1e293b', color: currentPage === totalPages ? '#94a3b8' : '#fff', border: 'none', borderRadius: '6px', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
                                        >
                                            Next
                                        </button>
                                    </div>
                                )}
                            </>
                        ) : (
                            // Company-wise View
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Outfit, sans-serif' }}>
                                <thead>
                                    <tr>
                                        <th style={tableHeaderStyle}>Company Name</th>
                                        <th style={{...tableHeaderStyle, textAlign: 'right'}}>Total Items (Qty)</th>
                                        <th style={{...tableHeaderStyle, textAlign: 'right', background: '#f0fdf4', color: '#166534'}}>Total Value (P.Rate)</th>
                                        <th style={{...tableHeaderStyle, textAlign: 'right', background: '#f0f9ff', color: '#0369a1'}}>Total Value (MRP)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan="4" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Loading stock data...</td></tr>
                                    ) : companyList.length === 0 ? (
                                        <tr><td colSpan="4" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>No companies found.</td></tr>
                                    ) : (
                                        companyList.map((c, i) => (
                                            <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa', pageBreakInside: 'avoid' }}>
                                                <td style={{...tableCellStyle, fontWeight: '700', color: '#0f172a', fontSize: '14px'}}>{c.company}</td>
                                                <td style={{...tableCellStyle, textAlign: 'right', fontWeight: '600'}}>{c.totalQty}</td>
                                                <td style={{...tableCellStyle, textAlign: 'right', background: '#f0fdf4', fontWeight: '700', color: '#166534', fontSize: '15px'}}>
                                                    ₹ {c.totalPurchaseValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </td>
                                                <td style={{...tableCellStyle, textAlign: 'right', background: '#f0f9ff', fontWeight: '700', color: '#0369a1', fontSize: '15px'}}>
                                                    ₹ {c.totalMRPValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        )}

                        {/* Grand Totals */}
                        {!loading && filteredBatches.length > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '24px', marginTop: '24px', padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', pageBreakInside: 'avoid' }}>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>Overall Value (Purchase Rate)</div>
                                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#166534', letterSpacing: '-0.02em' }}>
                                        ₹ {totalPurchaseValuation.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>
                                </div>
                                <div style={{ width: '1px', background: '#cbd5e1' }}></div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>Overall Value (MRP)</div>
                                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#0369a1', letterSpacing: '-0.02em' }}>
                                        ₹ {totalMRPValuation.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
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

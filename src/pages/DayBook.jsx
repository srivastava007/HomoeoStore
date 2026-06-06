import { useState, useEffect, useRef } from 'react'
import html2pdf from 'html2pdf.js'

export default function DayBook() {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])
    const [filterCash, setFilterCash] = useState(false)
    const [data, setData] = useState({ openingCash: 0, transactions: [], cashLedgerId: null })
    const [loading, setLoading] = useState(false)
    const [isExporting, setIsExporting] = useState(false)
    const [toast, setToast] = useState({ show: false, msg: '', type: 'success' })
    const reportRef = useRef(null)

    useEffect(() => {
        loadDayBook(date)
    }, [date])

    function showToast(msg, type = 'success') {
        setToast({ show: true, msg, type })
        setTimeout(() => setToast({ show: false, msg: '', type: 'success' }), 3000)
    }

    async function loadDayBook(selectedDate) {
        setLoading(true)
        try {
            const result = await window.api.getDayBook(selectedDate)
            setData(result || { openingCash: 0, transactions: [], cashLedgerId: null })
        } catch (err) {
            console.error(err)
            showToast('Failed to load Day Book', 'error')
        }
        setLoading(false)
    }

    function handleExportPDF() {
        if (!reportRef.current || data.transactions.length === 0) return
        
        setIsExporting(true)
        showToast('Preparing PDF...', 'success')
        
        setTimeout(() => {
            const opt = {
                margin: [10, 10, 10, 10],
                filename: `Day_Book_${date}.pdf`,
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

    // Filter transactions based on Cash toggle
    const filteredTransactions = filterCash 
        ? data.transactions.filter(t => t.ledger_id === data.cashLedgerId || t.voucher_type.includes('Cash') || t.particulars.toLowerCase().includes('cash'))
        : data.transactions;

    // Calculate Totals (Overall for the table)
    let totalDr = 0;
    let totalCr = 0;
    
    // For Cash Only
    let cashInflow = 0;
    let cashOutflow = 0;

    data.transactions.forEach(t => {
        if (t.ledger_id === data.cashLedgerId || t.voucher_type.includes('Cash') || t.particulars.toLowerCase().includes('cash')) {
            // In transactions table, for CASH ledger:
            // Debit = Inflow (Receipt)
            // Credit = Outflow (Payment)
            cashInflow += Number(t.dr_amount || 0)
            cashOutflow += Number(t.cr_amount || 0)
        }
    })

    filteredTransactions.forEach(t => {
        totalDr += Number(t.dr_amount || 0)
        totalCr += Number(t.cr_amount || 0)
    })

    const closingCash = data.openingCash + cashInflow - cashOutflow

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

    const StatCard = ({ title, amount, color, icon }) => (
        <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: `1px solid ${color}30`, flex: 1, display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', color: color }}>
                {icon}
            </div>
            <div>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>{title}</div>
                <div style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a' }}>₹{amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>
        </div>
    )

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ margin: '0 0 4px 0', fontSize: '28px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em' }}>Day Book</h1>
                    <p style={{ margin: 0, fontSize: '14px', color: '#64748b', fontWeight: '500' }}>Daily Transaction & Cash Flow Snapshot</p>
                </div>
                
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fff', padding: '6px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <button 
                            onClick={() => setFilterCash(false)}
                            style={{ padding: '6px 16px', borderRadius: '6px', border: 'none', background: !filterCash ? '#f1f5f9' : 'transparent', color: !filterCash ? '#0f172a' : '#64748b', fontWeight: !filterCash ? '700' : '500', cursor: 'pointer', transition: 'all 0.2s', fontSize: '13px' }}
                        >All Entries</button>
                        <button 
                            onClick={() => setFilterCash(true)}
                            style={{ padding: '6px 16px', borderRadius: '6px', border: 'none', background: filterCash ? '#f1f5f9' : 'transparent', color: filterCash ? '#0f172a' : '#64748b', fontWeight: filterCash ? '700' : '500', cursor: 'pointer', transition: 'all 0.2s', fontSize: '13px' }}
                        >Cash Book</button>
                    </div>

                    <input 
                        type="date" 
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        disabled={loading || isExporting}
                        style={{
                            padding: '10px 16px',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            outline: 'none',
                            fontSize: '14px',
                            fontFamily: 'Outfit, sans-serif',
                            fontWeight: '600',
                            color: '#0f172a',
                            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                            cursor: 'pointer'
                        }}
                    />
                    
                    <button 
                        onClick={handleExportPDF}
                        disabled={isExporting || filteredTransactions.length === 0}
                        style={{
                            background: (isExporting || filteredTransactions.length === 0) ? '#94a3b8' : '#10b981',
                            color: 'white',
                            border: 'none',
                            padding: '10px 20px',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: (isExporting || filteredTransactions.length === 0) ? 'not-allowed' : 'pointer',
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

            {/* Stat Cards (Cash Flow Focus) */}
            <div style={{ display: 'flex', gap: '20px', marginBottom: '24px' }}>
                <StatCard title="Opening Cash" amount={data.openingCash} color="#3b82f6" icon="💰" />
                <StatCard title="Total Cash Inflow" amount={cashInflow} color="#10b981" icon="↗️" />
                <StatCard title="Total Cash Outflow" amount={cashOutflow} color="#ef4444" icon="↙️" />
                <StatCard title="Closing Cash" amount={closingCash} color="#8b5cf6" icon="🏦" />
            </div>

            {/* Main Report Container */}
            <div style={{ flex: 1, background: '#fff', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ flex: 1, overflow: 'auto' }}>
                    <div ref={reportRef} style={{ padding: '24px', minWidth: '900px' }}>
                        
                        {/* PDF Header */}
                        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                            <h2 style={{ margin: '0 0 4px 0', fontSize: '24px', color: '#0f172a' }}>{filterCash ? 'Cash Book' : 'Day Book'}</h2>
                            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#334155', fontWeight: '500' }}>
                                For Date: <strong style={{color: '#10b981'}}>{new Date(date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong>
                            </h3>
                        </div>

                        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Outfit, sans-serif' }}>
                            <thead>
                                <tr>
                                    <th style={{...tableHeaderStyle, width: '120px'}}>Particulars (A/c)</th>
                                    <th style={tableHeaderStyle}>Vch Type</th>
                                    <th style={tableHeaderStyle}>Vch No.</th>
                                    <th style={tableHeaderStyle}>Details</th>
                                    <th style={{...tableHeaderStyle, textAlign: 'right', background: '#f0fdf4', color: '#166534'}}>Debit In (₹)</th>
                                    <th style={{...tableHeaderStyle, textAlign: 'right', background: '#fef2f2', color: '#991b1b'}}>Credit Out (₹)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Loading transactions...</td></tr>
                                ) : filteredTransactions.length === 0 ? (
                                    <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>No transactions found for this date.</td></tr>
                                ) : (
                                    <>
                                        {filteredTransactions.map((row, i) => (
                                            <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa', pageBreakInside: 'avoid' }}>
                                                <td style={{...tableCellStyle, fontWeight: '700', color: '#1e293b'}}>
                                                    {row.ledger_name || 'N/A'}
                                                </td>
                                                <td style={{...tableCellStyle, fontWeight: '600', color: '#475569'}}>
                                                    <span style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', textTransform: 'uppercase' }}>
                                                        {row.voucher_type}
                                                    </span>
                                                </td>
                                                <td style={{...tableCellStyle, fontFamily: 'monospace', fontSize: '12px'}}>
                                                    {row.voucher_no || '-'}
                                                </td>
                                                <td style={{...tableCellStyle, color: '#64748b', fontSize: '12px'}}>
                                                    {row.particulars || '-'}
                                                </td>
                                                <td style={{...tableCellStyle, textAlign: 'right', background: '#f0fdf4', fontWeight: '700', color: row.dr_amount > 0 ? '#166534' : 'inherit'}}>
                                                    {row.dr_amount > 0 ? Number(row.dr_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
                                                </td>
                                                <td style={{...tableCellStyle, textAlign: 'right', background: '#fef2f2', fontWeight: '700', color: row.cr_amount > 0 ? '#991b1b' : 'inherit'}}>
                                                    {row.cr_amount > 0 ? Number(row.cr_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
                                                </td>
                                            </tr>
                                        ))}
                                        
                                        {/* Table Totals Row */}
                                        <tr style={{ background: '#f8fafc', borderTop: '2px solid #cbd5e1' }}>
                                            <td colSpan="4" style={{...tableCellStyle, textAlign: 'right', fontWeight: '800', color: '#0f172a'}}>TOTAL FOR THE DAY:</td>
                                            <td style={{...tableCellStyle, textAlign: 'right', fontWeight: '800', color: '#166534', background: '#dcfce7', fontSize: '14px'}}>
                                                ₹{totalDr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td style={{...tableCellStyle, textAlign: 'right', fontWeight: '800', color: '#991b1b', background: '#fee2e2', fontSize: '14px'}}>
                                                ₹{totalCr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    </>
                                )}
                            </tbody>
                        </table>
                        
                        {/* Footer Summary for PDF */}
                        {!loading && filteredTransactions.length > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px', borderTop: '1px dashed #cbd5e1', paddingTop: '16px' }}>
                                <div style={{ width: '300px', background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', color: '#475569' }}>
                                        <span>Opening Cash:</span>
                                        <span style={{ fontWeight: '600' }}>₹{data.openingCash.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', color: '#475569' }}>
                                        <span>Cash Inflow:</span>
                                        <span style={{ fontWeight: '600', color: '#166534' }}>+ ₹{cashInflow.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', color: '#475569', paddingBottom: '8px', borderBottom: '1px solid #cbd5e1' }}>
                                        <span>Cash Outflow:</span>
                                        <span style={{ fontWeight: '600', color: '#991b1b' }}>- ₹{cashOutflow.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', color: '#0f172a', fontWeight: '800' }}>
                                        <span>Closing Cash:</span>
                                        <span>₹{closingCash.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
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

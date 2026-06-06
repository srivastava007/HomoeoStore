import { useState, useEffect } from 'react'
import { useDialog } from '../context/DialogContext'
import DateInput from '../components/DateInput'

export default function LedgerBook({ onNavigate }) {
  const [ledgers, setLedgers] = useState([])
  const [selectedLedgerId, setSelectedLedgerId] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [statement, setStatement] = useState(null)
  const [loading, setLoading] = useState(false)
  const { showToast } = useDialog()

  const [storeProfile, setStoreProfile] = useState(null)

  useEffect(() => {
    async function loadLedgers() {
      const data = await window.api.getLedgers()
      setLedgers(data)
      const profile = await window.api.getStoreProfile()
      if (profile) setStoreProfile(profile)
    }
    loadLedgers()
  }, [])

  const setDateRange = (days) => {
    const end = new Date()
    const start = new Date()
    start.setDate(end.getDate() - days)
    setFromDate(start.toISOString().split('T')[0])
    setToDate(end.toISOString().split('T')[0])
  }

  async function handleGenerate(e) {
    e?.preventDefault()
    if (!selectedLedgerId) return showToast('Validation Error', 'error')
    setLoading(true)
    try {
      const data = await window.api.getLedgerStatement(selectedLedgerId, fromDate || null, toDate || null)
      setStatement(data)
    } catch (err) {
      console.error(err)
      showToast('Failed to generate statement', 'error')
    }
    setLoading(false)
  }

  async function handlePrint() {
    if (!statement) return
    if (!storeProfile) {
      showToast('Store profile not found', 'error')
      return
    }
    const res = await window.api.exportLedgerPdf(statement, storeProfile, fromDate, toDate)
    if (res && res.success) {
      showToast('PDF Exported Successfully!', 'success')
    } else if (res && !res.canceled) {
      showToast('Failed to export PDF: ' + res.error, 'error')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%', fontFamily: 'Outfit, sans-serif' }}>
      
      {/* Header & Controls (Hidden when printing) */}
      <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#0f2d1f', margin: '0 0 4px 0', letterSpacing: '-0.5px' }}>Ledger Book</h1>
            <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>View chronological statement of transactions for any account</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>

            {statement && (
              <button onClick={handlePrint} style={{
                background: '#0f2d1f', color: '#fff', border: 'none', borderRadius: '8px',
                padding: '10px 20px', fontSize: '14px', fontWeight: '600', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
              }}>
                🖨️ Export / Print PDF
              </button>
            )}
          </div>
        </div>

        {/* Filter Panel */}
        <form onSubmit={handleGenerate} style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 10px rgba(0,0,0,0.02)', display: 'flex', gap: '20px', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '6px', textTransform: 'uppercase' }}>Select Ledger Account</label>
            <select 
              value={selectedLedgerId} 
              onChange={e => setSelectedLedgerId(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
              required
            >
              <option value="">-- Choose Account --</option>
              {ledgers.map(l => (
                <option key={l.id} value={l.id}>{l.ledger_name} ({l.account_group})</option>
              ))}
            </select>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Date Range</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span onClick={() => setDateRange(30)} style={{ fontSize: '11px', color: '#2563eb', cursor: 'pointer', fontWeight: '700', background: '#eff6ff', padding: '2px 6px', borderRadius: '4px' }}>30D</span>
                <span onClick={() => setDateRange(60)} style={{ fontSize: '11px', color: '#2563eb', cursor: 'pointer', fontWeight: '700', background: '#eff6ff', padding: '2px 6px', borderRadius: '4px' }}>60D</span>
                <span onClick={() => setDateRange(90)} style={{ fontSize: '11px', color: '#2563eb', cursor: 'pointer', fontWeight: '700', background: '#eff6ff', padding: '2px 6px', borderRadius: '4px' }}>90D</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <DateInput  value={fromDate} onChange={e => setFromDate(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }} title="From Date" />
              <DateInput  value={toDate} onChange={e => setToDate(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }} title="To Date" />
            </div>
          </div>

          <button type="submit" disabled={loading} style={{
            background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px',
            padding: '10px 24px', fontSize: '14px', fontWeight: '600', cursor: loading ? 'wait' : 'pointer', height: '42px',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)'
          }}>
            {loading ? 'Generating...' : 'View Statement'}
          </button>
        </form>
      </div>

      {/* Statement Area */}
      {statement && (
        <div className="print-section" style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          
          {/* Statement Header */}
          <div style={{ padding: '24px', borderBottom: '2px solid #0f2d1f', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: '#f8fafc' }}>
            <div>
              <h2 style={{ margin: '0 0 4px 0', fontSize: '24px', color: '#0f2d1f', fontWeight: '800' }}>{statement.ledger.ledger_name}</h2>
              <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>{statement.ledger.account_group}</p>
              {statement.ledger.mobile && <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#475569' }}>📞 {statement.ledger.mobile}</p>}
            </div>
            <div style={{ textAlign: 'right' }}>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', color: '#1e293b' }}>STATEMENT OF ACCOUNT</h3>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                {fromDate ? new Date(fromDate).toLocaleDateString('en-IN') : 'Start'} 
                {' '}to{' '} 
                {toDate ? new Date(toDate).toLocaleDateString('en-IN') : 'End'}
              </p>
            </div>
          </div>

          {/* Statement Table */}
          <div style={{ overflowY: 'auto', flex: 1, padding: '0 24px 24px 24px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginTop: '20px' }}>
              <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 10, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <tr>
                  <th style={{ padding: '12px 8px', textAlign: 'left', color: '#475569', fontWeight: '700', borderBottom: '1px solid #cbd5e1' }}>DATE</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', color: '#475569', fontWeight: '700', borderBottom: '1px solid #cbd5e1' }}>PARTICULARS</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', color: '#475569', fontWeight: '700', borderBottom: '1px solid #cbd5e1' }}>VCH TYPE</th>
                  <th style={{ padding: '12px 8px', textAlign: 'left', color: '#475569', fontWeight: '700', borderBottom: '1px solid #cbd5e1' }}>VCH NO.</th>
                  <th style={{ padding: '12px 8px', textAlign: 'right', color: '#475569', fontWeight: '700', borderBottom: '1px solid #cbd5e1' }}>DEBIT (₹)</th>
                  <th style={{ padding: '12px 8px', textAlign: 'right', color: '#475569', fontWeight: '700', borderBottom: '1px solid #cbd5e1' }}>CREDIT (₹)</th>
                  <th style={{ padding: '12px 8px', textAlign: 'right', color: '#475569', fontWeight: '700', borderBottom: '1px solid #cbd5e1' }}>BALANCE</th>
                </tr>
              </thead>
              <tbody>
                {/* Opening Balance Row */}
                <tr style={{ background: '#f8fafc', fontWeight: '600', color: '#1e293b' }}>
                  <td style={{ padding: '12px 8px' }}>{fromDate ? new Date(fromDate).toLocaleDateString('en-IN') : 'Opening'}</td>
                  <td colSpan={3} style={{ padding: '12px 8px' }}>{statement.opening_balance_type === 'Dr' ? 'To Opening Balance' : 'By Opening Balance'}</td>
                  <td style={{ padding: '12px 8px', textAlign: 'right', color: statement.opening_balance_type === 'Dr' ? '#dc2626' : '#16a34a' }}>
                    {statement.opening_balance_type === 'Dr' ? statement.opening_balance.toLocaleString('en-IN', {minimumFractionDigits: 2}) : ''}
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'right', color: statement.opening_balance_type === 'Cr' ? '#16a34a' : '#dc2626' }}>
                    {statement.opening_balance_type === 'Cr' ? statement.opening_balance.toLocaleString('en-IN', {minimumFractionDigits: 2}) : ''}
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'right', color: statement.opening_balance_type === 'Dr' ? '#dc2626' : '#16a34a' }}>
                    {statement.opening_balance.toLocaleString('en-IN', {minimumFractionDigits: 2})} {statement.opening_balance_type}
                  </td>
                </tr>

                {/* Transactions */}
                {statement.transactions.map((tx, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '12px 8px', color: '#475569' }}>{new Date(tx.date).toLocaleDateString('en-IN')}</td>
                    <td style={{ padding: '12px 8px', color: '#1e293b', fontWeight: '500' }}>{tx.particulars}</td>
                    <td style={{ padding: '12px 8px', color: '#64748b' }}>{tx.voucher_type}</td>
                    <td style={{ padding: '12px 8px', color: '#64748b' }}>{tx.voucher_no || '-'}</td>
                    <td style={{ padding: '12px 8px', textAlign: 'right', color: tx.dr_amount ? '#1e293b' : '#cbd5e1' }}>
                      {tx.dr_amount ? tx.dr_amount.toLocaleString('en-IN', {minimumFractionDigits: 2}) : ''}
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'right', color: tx.cr_amount ? '#1e293b' : '#cbd5e1' }}>
                      {tx.cr_amount ? tx.cr_amount.toLocaleString('en-IN', {minimumFractionDigits: 2}) : ''}
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: '600', color: tx.running_balance_type === 'Dr' ? '#dc2626' : '#16a34a' }}>
                      {tx.running_balance.toLocaleString('en-IN', {minimumFractionDigits: 2})} {tx.running_balance_type}
                    </td>
                  </tr>
                ))}

                {/* Summary Row */}
                <tr style={{ borderTop: '2px solid #cbd5e1', background: '#f8fafc', fontWeight: '700' }}>
                  <td colSpan={4} style={{ padding: '16px 8px', textAlign: 'right', color: '#0f2d1f' }}>TOTALS:</td>
                  <td style={{ padding: '16px 8px', textAlign: 'right', color: '#0f2d1f' }}>
                    {(statement.transactions.reduce((s, t) => s + t.dr_amount, 0) + (statement.opening_balance_type === 'Dr' ? statement.opening_balance : 0)).toLocaleString('en-IN', {minimumFractionDigits: 2})}
                  </td>
                  <td style={{ padding: '16px 8px', textAlign: 'right', color: '#0f2d1f' }}>
                    {(statement.transactions.reduce((s, t) => s + t.cr_amount, 0) + (statement.opening_balance_type === 'Cr' ? statement.opening_balance : 0)).toLocaleString('en-IN', {minimumFractionDigits: 2})}
                  </td>
                  <td style={{ padding: '16px 8px', textAlign: 'right', color: statement.closing_balance_type === 'Dr' ? '#dc2626' : '#16a34a', fontSize: '15px' }}>
                    {statement.closing_balance.toLocaleString('en-IN', {minimumFractionDigits: 2})} {statement.closing_balance_type}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Print Styles */}
      <style>{`
        @media print {
          @page { margin: 15mm; size: A4; }
          body { background: white !important; }
          .no-print { display: none !important; }
          .print-section { border: none !important; box-shadow: none !important; border-radius: 0 !important; margin: 0 !important; }
        }
      `}</style>
    </div>
  )
}

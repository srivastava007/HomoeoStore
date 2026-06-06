import { useState, useEffect } from 'react'

export default function ExpiryManagement() {
  const [batches, setBatches] = useState([])
  const [daysFilter, setDaysFilter] = useState(60) // Default to 60 days
  const [loading, setLoading] = useState(true)

  async function loadData(days) {
    setLoading(true)
    try {
      const data = await window.api.getExpiringBatches(days)
      setBatches(data)
    } catch (err) {
      console.error('Failed to load expiry batches', err)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadData(daysFilter)
  }, [daysFilter])

  const getUrgencyColor = (month, year) => {
    const expiry = new Date(year, month - 1, 1)
    const today = new Date()
    const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24))
    
    if (diffDays <= 30) return '#fee2e2' // Red (Critical)
    if (diffDays <= 60) return '#fef3c7' // Amber (Warning)
    return '#f0fdf4' // Green (Okay)
  }

  const getUrgencyTextColor = (month, year) => {
    const expiry = new Date(year, month - 1, 1)
    const today = new Date()
    const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24))
    
    if (diffDays <= 30) return '#b91c1c'
    if (diffDays <= 60) return '#b45309'
    return '#15803d'
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', fontFamily: 'Outfit, sans-serif' }}>
      
      {/* Header & Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: '0 0 2px 0', letterSpacing: '-0.02em' }}>Expiry Management</h1>
          <p style={{ fontSize: '12px', color: '#64748b', margin: 0, fontWeight: '500' }}>Track medicines expiring soon to manage returns efficiently</p>
        </div>
        
        {/* Days Filter (Segment Control) */}
        <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '8px', gap: '4px', border: '1px solid #e2e8f0' }}>
          {[30, 60, 90].map(days => {
            const isActive = daysFilter === days
            return (
              <button key={days} onClick={() => setDaysFilter(days)} style={{
                padding: '6px 16px', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                background: isActive ? '#fff' : 'transparent',
                color: isActive ? '#0f172a' : '#64748b',
                boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.2s ease',
                width: '110px'
              }}>
                Next {days} Days
              </button>
            )
          })}
        </div>
      </div>

      {/* Analytics Summary */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <div style={{ background: '#fff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', flex: 1, boxShadow: '0 1px 3px -1px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>Total Expiring Batches</div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>{batches.length}</div>
          </div>
        </div>
        <div style={{ background: '#fff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', flex: 1, boxShadow: '0 1px 3px -1px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>Total Quantities at Risk</div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: '#b91c1c' }}>{batches.reduce((sum, b) => sum + b.quantity, 0)}</div>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 2px 4px -1px rgba(0,0,0,0.05)' }}>
        <div style={{ overflowY: 'auto', flex: 1, padding: '0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead style={{ background: '#f8fafc', position: 'sticky', top: 0, zIndex: 10 }}>
              <tr>
                <th style={{ padding: '8px 12px', textAlign: 'left', color: '#64748b', fontWeight: '700', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>Medicine Name</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', color: '#64748b', fontWeight: '700', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>Batch No</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', color: '#64748b', fontWeight: '700', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>Company</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', color: '#64748b', fontWeight: '700', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>Supplier</th>
                <th style={{ padding: '8px 12px', textAlign: 'right', color: '#64748b', fontWeight: '700', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>Stock Qty</th>
                <th style={{ padding: '8px 12px', textAlign: 'center', color: '#64748b', fontWeight: '700', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>Expiry Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>Loading expiry data...</td></tr>
              ) : batches.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '64px 32px', textAlign: 'center', color: '#64748b' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                      <div style={{ width: '64px', height: '64px', borderRadius: '32px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                        </svg>
                      </div>
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', marginBottom: '4px' }}>All Clear!</div>
                    <div style={{ fontSize: '13px' }}>No batches expiring in the next {daysFilter} days.</div>
                  </td>
                </tr>
              ) : (
                batches.map((b) => (
                  <tr key={b.id} style={{ borderBottom: '1px solid #e2e8f0', transition: 'background 0.2s', ':hover': { background: '#f8fafc' } }}>
                    <td style={{ padding: '8px 12px', fontWeight: '600', color: '#0f172a' }}>{b.medicine_name}</td>
                    <td style={{ padding: '8px 12px', color: '#475569', fontFamily: 'monospace', fontWeight: '600' }}>{b.batch_no}</td>
                    <td style={{ padding: '8px 12px', color: '#64748b' }}>{b.company}</td>
                    <td style={{ padding: '8px 12px', color: '#0f172a', fontWeight: '500' }}>
                      {b.supplier_name ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"/><path d="M9 8h1"/><path d="M9 12h1"/><path d="M9 16h1"/><path d="M14 8h1"/><path d="M14 12h1"/><path d="M14 16h1"/><path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"/></svg>
                          {b.supplier_name}
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '700', color: '#0f172a', fontSize: '13px' }}>{b.quantity}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      <span style={{ 
                        background: getUrgencyColor(b.expiry_month, b.expiry_year), 
                        color: getUrgencyTextColor(b.expiry_month, b.expiry_year), 
                        padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', letterSpacing: '0.02em'
                      }}>
                        {String(b.expiry_month).padStart(2, '0')} / {b.expiry_year}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

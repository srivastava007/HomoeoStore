import { useState, useEffect } from 'react'

const inputStyle = {
  padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1',
  fontSize: '14px', fontFamily: 'Outfit, sans-serif', outline: 'none',
  background: '#fff', width: '100%', boxSizing: 'border-box',
  transition: 'all 0.2s ease', color: '#1e293b'
}

function StatCard({ title, value, icon, color }) {
  return (
    <div style={{ background: '#fff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '16px', flex: 1, boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
      <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: `${color}15`, color: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
        {icon}
      </div>
      <div>
        <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>{title}</p>
        <h3 style={{ margin: 0, fontSize: '24px', fontWeight: '800', color: '#0f2d1f' }}>{value}</h3>
      </div>
    </div>
  )
}

export default function LedgerMaster() {
  const [ledgers, setLedgers] = useState([])
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('ALL')

  async function load() {
    const data = await window.api.getLedgers()
    setLedgers(data)
  }

  useEffect(() => { load() }, [])

  const filtered = ledgers.filter(l => {
    const matchSearch = l.ledger_name.toLowerCase().includes(search.toLowerCase()) || (l.mobile && l.mobile.includes(search))
    const matchFilter = filterType === 'ALL' || l.account_group === filterType
    return matchSearch && matchFilter
  })

  const debtorsCount = ledgers.filter(l => l.account_group === 'SUNDRY DEBTORS').length
  const creditorsCount = ledgers.filter(l => l.account_group === 'SUNDRY CREDITORS').length
  const banksCount = ledgers.filter(l => l.account_group === 'BANK ACCOUNTS').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%', fontFamily: 'Outfit, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#0f2d1f', margin: '0 0 4px 0', letterSpacing: '-0.5px' }}>Ledger Balances</h1>
          <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>View balances of all your party accounts and financial ledgers</p>
        </div>
      </div>

      {/* Analytics */}
      <div style={{ display: 'flex', gap: '20px' }}>
        <StatCard title="Total Debtors" value={debtorsCount} icon="👥" color="#3b82f6" />
        <StatCard title="Total Creditors" value={creditorsCount} icon="🏢" color="#f59e0b" />
        <StatCard title="Bank Accounts" value={banksCount} icon="🏦" color="#10b981" />
      </div>

      {/* Main Content Area */}
      <div style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #e2e8f0', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* Toolbar */}
        <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
          <div style={{ position: 'relative', width: '320px' }}>
            <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>🔍</span>
            <input
              placeholder="Search by name or mobile..."
              value={search} onChange={e => setSearch(e.target.value)}
              style={{ ...inputStyle, paddingLeft: '40px', background: '#fff' }}
            />
          </div>
          
          <div style={{ display: 'flex', gap: '8px', background: '#e2e8f0', padding: '4px', borderRadius: '10px' }}>
            {['ALL', 'SUNDRY DEBTORS', 'SUNDRY CREDITORS', 'BANK ACCOUNTS'].map(type => (
              <button key={type} onClick={() => setFilterType(type)} style={{
                padding: '8px 16px', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                background: filterType === type ? '#fff' : 'transparent',
                color: filterType === type ? '#0f2d1f' : '#64748b',
                boxShadow: filterType === type ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                transition: 'all 0.2s'
              }}>
                {type.replace('SUNDRY ', '')}
              </button>
            ))}
          </div>
        </div>
        
        {/* Table */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 1, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
              <tr style={{ textAlign: 'left' }}>
                <th style={{ padding: '16px 24px', color: '#64748b', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ledger Details</th>
                <th style={{ padding: '16px 24px', color: '#64748b', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Contact</th>
                <th style={{ padding: '16px 24px', color: '#64748b', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right' }}>Opening Balance</th>
                <th style={{ padding: '16px 24px', color: '#64748b', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right' }}>Current Balance</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(l => (
                <tr key={l.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }}>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '15px' }}>{l.ledger_name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                      <span style={{ fontSize: '11px', background: '#f1f5f9', color: '#64748b', padding: '2px 8px', borderRadius: '4px', fontWeight: '600' }}>{l.account_group}</span>
                      {l.station && <span style={{ fontSize: '12px', color: '#94a3b8' }}>📍 {l.station}</span>}
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ color: '#475569', fontSize: '13px' }}>{l.mobile || '—'}</div>
                    {l.email && <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '2px' }}>{l.email}</div>}
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '13px', fontWeight: '600' }}>
                      ₹ {parseFloat(l.opening_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      <span style={{ fontSize: '11px', opacity: 0.8 }}>{l.dr_cr}</span>
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                    <div style={{ 
                      display: 'inline-flex', alignItems: 'center', gap: '6px', 
                      background: l.current_balance_type === 'Dr' ? '#fef2f2' : '#f0fdf4',
                      color: l.current_balance_type === 'Dr' ? '#ef4444' : '#22c55e',
                      padding: '6px 12px', borderRadius: '8px', fontWeight: '700', fontSize: '14px'
                    }}>
                      ₹ {parseFloat(l.current_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      <span style={{ fontSize: '11px', opacity: 0.8 }}>{l.current_balance_type}</span>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>
                    <div style={{ fontSize: '48px', marginBottom: '12px' }}>📭</div>
                    <div style={{ fontSize: '16px', fontWeight: '600', color: '#475569' }}>No ledgers found</div>
                    <p style={{ margin: '4px 0 0 0', fontSize: '14px' }}>Try adjusting your search or filters.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* Styles for hover effects */}
      <style>{`
        input:focus, select:focus, textarea:focus { border-color: #10b981 !important; box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1) !important; }
        tr:hover { background: #f8fafc !important; }
        button:hover { transform: translateY(-1px); }
        button:active { transform: translateY(0); }
      `}</style>
    </div>
  )
}

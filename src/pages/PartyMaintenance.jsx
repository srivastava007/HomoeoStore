import { useState, useEffect } from 'react'
import { useDialog } from '../context/DialogContext'

const EMPTY_LEDGER = {
  ledger_name: '', station: '', account_group: 'SUNDRY DEBTORS', balancing_method: 'Bill by Bill',
  opening_balance: 0, dr_cr: 'Dr', mail_to: '', address: '', pin_code: '', email: '',
  website: '', contact_person: '', designation: '', phone_office: '', phone_res: '',
  mobile: '', fax: '', dl_no: '', dl_expiry: '', gst_heading: 'Local', gstin: '',
  pan_no: '', ledger_category: 'OTHERS', state: '', country: 'INDIA', ledger_type: 'REGISTERED',
  status: 'ACTIVE'
}

function Drawer({ title, isOpen, onClose, children }) {
  return (
    <>
      <div 
        style={{
          position: 'fixed', left: 0, right: 0, bottom: 0, top: '36px', background: 'rgba(0,0,0,0.4)', zIndex: 999,
          opacity: isOpen ? 1 : 0, pointerEvents: isOpen ? 'auto' : 'none', transition: 'opacity 0.3s ease',
          backdropFilter: 'blur(2px)'
        }} 
        onClick={onClose} 
      />
      <div 
        style={{
          position: 'fixed', top: '36px', right: 0, bottom: 0, width: '600px', background: '#f8fafc',
          zIndex: 1000, transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: '-10px 0 30px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column'
        }}
      >
        <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#0f2d1f', margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>✕</button>
        </div>
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {children}
        </div>
      </div>
    </>
  )
}

function Field({ label, children, required }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label} {required && <span style={{color: '#ef4444'}}>*</span>}
      </label>
      {children}
    </div>
  )
}

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

export default function PartyMaintenance() {
  const [ledgers, setLedgers] = useState([])
  const [purchaseBills, setPurchaseBills] = useState([])
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('ALL')
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_LEDGER)
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' })
  const { showConfirm } = useDialog()

  function showToast(msg, type = 'success') {
    setToast({ show: true, msg, type })
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000)
  }

  async function load() {
    const data = await window.api.getLedgers()
    setLedgers(data)
    try {
      const pbs = await window.api.getPurchaseBills()
      setPurchaseBills(pbs || [])
    } catch(e) {
      console.error('Failed to fetch purchase bills:', e)
    }
  }

  useEffect(() => { load() }, [])

  function openAdd() { 
    let defaultGroup = 'SUNDRY DEBTORS'
    if (filterType === 'CREDITORS') defaultGroup = 'SUNDRY CREDITORS'
    setForm({ 
      ...EMPTY_LEDGER, 
      account_group: defaultGroup,
      status: 'ACTIVE'
    })
    setEditing(null)
    setIsDrawerOpen(true) 
  }
  
  function openEdit(l) { 
    setForm({
      ...EMPTY_LEDGER,
      ...l
    })
    setEditing(l.id)
    setIsDrawerOpen(true) 
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.ledger_name.trim()) return showToast('Ledger Name is required', 'error')
    
    const data = { ...form, opening_balance: parseFloat(form.opening_balance) || 0 }
    
    if (editing) {
      await window.api.updateLedger({ ...data, id: editing })
      showToast('Ledger updated successfully!')
    } else {
      await window.api.addLedger(data)
      showToast('Ledger created successfully!')
    }
    
    setIsDrawerOpen(false)
    load()
  }

  async function handleDelete(id) {
    showConfirm('Delete Ledger', 'Are you sure you want to delete this ledger?', async () => {
      try {
        await window.api.deleteLedger(id)
        showToast('Ledger deleted successfully!')
        load()
      } catch (err) {
        let msg = err.message || 'Error deleting ledger'
        if (msg.includes('Cannot delete:')) {
          msg = msg.split('Cannot delete:')[1].trim()
        }
        showToast(`Cannot delete: ${msg}`, 'error')
      }
    })
  }

  const filtered = ledgers.filter(l => {
    const matchSearch = l.ledger_name.toLowerCase().includes(search.toLowerCase()) || 
                        (l.mobile && l.mobile.includes(search)) || 
                        (l.station && l.station.toLowerCase().includes(search.toLowerCase())) ||
                        (l.ledger_category && l.ledger_category.toLowerCase().includes(search.toLowerCase()))
    
    let matchFilter = false
    if (filterType === 'ALL') matchFilter = true
    else if (filterType === 'DEBTORS') matchFilter = l.account_group === 'SUNDRY DEBTORS'
    else if (filterType === 'CREDITORS') matchFilter = l.account_group === 'SUNDRY CREDITORS'
    else if (filterType === 'CASH/BANK') matchFilter = l.account_group === 'CASH IN HAND' || l.account_group === 'BANK ACCOUNTS'
    else if (filterType === 'OTHERS') matchFilter = !['SUNDRY DEBTORS', 'SUNDRY CREDITORS', 'CASH IN HAND', 'BANK ACCOUNTS'].includes(l.account_group)

    return matchSearch && matchFilter
  })

  // General counts
  const debtorsCount = ledgers.filter(l => l.account_group === 'SUNDRY DEBTORS').length
  const creditorsCount = ledgers.filter(l => l.account_group === 'SUNDRY CREDITORS').length
  
  // Creditor/Supplier specific stats
  const suppliers = ledgers.filter(l => l.account_group === 'SUNDRY CREDITORS')
  const totalSuppliersCount = suppliers.length
  const activeSuppliersCount = suppliers.filter(s => (s.status || 'ACTIVE') === 'ACTIVE').length
  const outstandingPayable = suppliers.reduce((sum, s) => s.current_balance_type === 'Cr' ? sum + s.current_balance : sum, 0)
  
  // Calculate recent deliveries (created today)
  const todayStr = new Date().toLocaleDateString('en-CA') // Local YYYY-MM-DD
  const recentDeliveriesTodayCount = purchaseBills.filter(pb => pb.created_at && pb.created_at.startsWith(todayStr)).length

  // Debtor/Customer specific stats
  const customers = ledgers.filter(l => l.account_group === 'SUNDRY DEBTORS')
  const totalCustomersCount = customers.length
  const activeCustomersCount = customers.filter(c => (c.status || 'ACTIVE') === 'ACTIVE').length
  const outstandingReceivable = customers.reduce((sum, c) => c.current_balance_type === 'Dr' ? sum + c.current_balance : sum, 0)

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const thStyle = {
    padding: '16px 24px', 
    color: '#64748b', 
    fontWeight: '700', 
    fontSize: '12px', 
    textTransform: 'uppercase', 
    letterSpacing: '0.5px'
  }

  // Dynamic values based on active tab
  const getHeaderInfo = () => {
    if (filterType === 'CREDITORS') {
      return {
        title: 'Supplier Management',
        subtitle: 'Create and manage wholesale distributors and supply agencies',
        btnText: '+ Add New Supplier',
        showBadge: true
      }
    } else if (filterType === 'DEBTORS') {
      return {
        title: 'Customer Management',
        subtitle: 'Create and manage customer accounts and retail buyers',
        btnText: '+ Add New Customer',
        showBadge: false
      }
    }
    return {
      title: 'Party / Account Maintenance',
      subtitle: 'Create and manage all party accounts and financial ledgers',
      btnText: '+ New Account',
      showBadge: false
    }
  }

  const header = getHeaderInfo()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%', fontFamily: 'Outfit, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#0f2d1f', margin: '0 0 4px 0', letterSpacing: '-0.5px' }}>{header.title}</h1>
            {header.showBadge && (
              <span style={{ fontSize: '11px', fontWeight: '800', background: '#dcfce7', color: '#15803d', padding: '4px 12px', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Active Module
              </span>
            )}
          </div>
          <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>{header.subtitle}</p>
        </div>
        <button onClick={openAdd} style={{
          background: 'linear-gradient(135deg, #0f2d1f 0%, #153c29 100%)', color: '#fff', border: 'none', borderRadius: '10px',
          padding: '12px 24px', fontSize: '14px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px',
          cursor: 'pointer', boxShadow: '0 4px 12px rgba(15, 45, 31, 0.2)', transition: 'all 0.2s'
        }}>
          {header.btnText}
        </button>
      </div>

      {/* Dynamic Analytics Block */}
      {filterType === 'CREDITORS' ? (
        <div style={{ display: 'flex', gap: '20px' }}>
          <StatCard title="Total Suppliers" value={totalSuppliersCount} icon="👥" color="#10b981" />
          <StatCard title="Active Distributors" value={activeSuppliersCount} icon="📡" color="#3b82f6" />
          <StatCard title="Outstanding Payable" value={'₹' + parseFloat(outstandingPayable).toLocaleString('en-IN', { maximumFractionDigits: 0 })} icon="💵" color="#ef4444" />
          <StatCard title="Recent Deliveries" value={recentDeliveriesTodayCount + ' Today'} icon="⏱️" color="#f59e0b" />
        </div>
      ) : filterType === 'DEBTORS' ? (
        <div style={{ display: 'flex', gap: '20px' }}>
          <StatCard title="Total Customers" value={totalCustomersCount} icon="👥" color="#3b82f6" />
          <StatCard title="Active Customers" value={activeCustomersCount} icon="✅" color="#10b981" />
          <StatCard title="Outstanding Receivable" value={'₹' + parseFloat(outstandingReceivable).toLocaleString('en-IN', { maximumFractionDigits: 0 })} icon="💰" color="#f59e0b" />
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '20px' }}>
          <StatCard title="Total Debtors (Customers)" value={debtorsCount} icon="👥" color="#3b82f6" />
          <StatCard title="Total Creditors (Suppliers)" value={creditorsCount} icon="🏢" color="#f59e0b" />
        </div>
      )}

      {/* Main Content Area */}
      <div style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #e2e8f0', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* Toolbar */}
        <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
          <div style={{ position: 'relative', width: '360px' }}>
            <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>🔍</span>
            <input
              placeholder={filterType === 'CREDITORS' ? "Filter by Supplier City or Category name..." : "Search by name, mobile, or city..."}
              value={search} onChange={e => setSearch(e.target.value)}
              style={{ ...inputStyle, paddingLeft: '40px', background: '#fff' }}
            />
          </div>
          
          <div style={{ display: 'flex', gap: '8px', background: '#e2e8f0', padding: '4px', borderRadius: '10px' }}>
            {['ALL', 'DEBTORS', 'CREDITORS', 'CASH/BANK', 'OTHERS'].map(type => (
              <button key={type} onClick={() => { setFilterType(type); setSearch(''); }} style={{
                padding: '8px 16px', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
                background: filterType === type ? '#fff' : 'transparent',
                color: filterType === type ? '#0f2d1f' : '#64748b',
                boxShadow: filterType === type ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                transition: 'all 0.2s'
              }}>
                {type === 'CREDITORS' ? 'SUPPLIERS' : type === 'DEBTORS' ? 'CUSTOMERS' : type}
              </button>
            ))}
          </div>
        </div>
        
        {/* Table */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 1, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
              {filterType === 'CREDITORS' ? (
                <tr style={{ textAlign: 'left' }}>
                  <th style={thStyle}>Supplier Name</th>
                  <th style={thStyle}>Contact Person</th>
                  <th style={thStyle}>Phone Number</th>
                  <th style={thStyle}>DL Number</th>
                  <th style={thStyle}>City</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Balance (Payable)</th>
                  <th style={thStyle}>Status</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
                </tr>
              ) : (
                <tr style={{ textAlign: 'left' }}>
                  <th style={thStyle}>Ledger Details</th>
                  <th style={thStyle}>Contact</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Opening Balance</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Current Balance</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
                </tr>
              )}
            </thead>
            <tbody>
              {filtered.map(l => {
                if (filterType === 'CREDITORS') {
                  const balColor = l.current_balance_type === 'Dr' ? '#22c55e' : '#ef4444'
                  const balBg = l.current_balance_type === 'Dr' ? '#f0fdf4' : '#fef2f2'
                  return (
                    <tr key={l.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }}>
                      <td style={{ padding: '16px 24px' }}>
                        <div style={{ fontWeight: '700', color: '#0f2d1f', fontSize: '15px' }}>{l.ledger_name}</div>
                        <div style={{ fontSize: '11px', background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '4px', fontWeight: '700', display: 'inline-block', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          {l.ledger_category || 'GENERAL'}
                        </div>
                      </td>
                      <td style={{ padding: '16px 24px', color: '#475569', fontWeight: '500' }}>{l.contact_person || '—'}</td>
                      <td style={{ padding: '16px 24px', color: '#475569' }}>{l.mobile || '—'}</td>
                      <td style={{ padding: '16px 24px', color: '#475569', fontFamily: 'monospace', fontSize: '13px' }}>{l.dl_no || '—'}</td>
                      <td style={{ padding: '16px 24px', color: '#475569' }}>{l.station || '—'}</td>
                      <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                        <div style={{ 
                          display: 'inline-flex', alignItems: 'center', gap: '6px', 
                          background: balBg, color: balColor,
                          padding: '6px 12px', borderRadius: '8px', fontWeight: '800', fontSize: '14px'
                        }}>
                          ₹ {parseFloat(l.current_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          <span style={{ fontSize: '11px', opacity: 0.8 }}>{l.current_balance_type}</span>
                        </div>
                      </td>
                      <td style={{ padding: '16px 24px' }}>
                        <span style={{ 
                          background: (l.status || 'ACTIVE') === 'ACTIVE' ? '#dcfce7' : '#fee2e2', 
                          color: (l.status || 'ACTIVE') === 'ACTIVE' ? '#15803d' : '#ef4444', 
                          padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '800',
                          border: `1px solid ${(l.status || 'ACTIVE') === 'ACTIVE' ? '#bbf7d0' : '#fecaca'}`,
                          textTransform: 'uppercase', letterSpacing: '0.5px'
                        }}>
                          {l.status || 'ACTIVE'}
                        </span>
                      </td>
                      <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                          <button onClick={() => openEdit(l)} style={{ padding: '6px 12px', fontSize: '13px', cursor: 'pointer', background: '#eff6ff', color: '#3b82f6', border: 'none', borderRadius: '6px', fontWeight: '600', transition: 'all 0.2s' }}>Edit</button>
                          {l.is_deletable && (
                            <button onClick={() => handleDelete(l.id)} style={{ padding: '6px 12px', fontSize: '13px', cursor: 'pointer', background: '#fef2f2', color: '#ef4444', border: 'none', borderRadius: '6px', fontWeight: '600', transition: 'all 0.2s' }}>Delete</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                } else {
                  return (
                    <tr key={l.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }}>
                      <td style={{ padding: '16px 24px' }}>
                        <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '15px' }}>{l.ledger_name}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                          <span style={{ fontSize: '11px', background: '#f1f5f9', color: '#64748b', padding: '2px 8px', borderRadius: '4px', fontWeight: '600' }}>{l.account_group}</span>
                          {l.station && <span style={{ fontSize: '12px', color: '#94a3b8' }}>📍 {l.station}</span>}
                          <span style={{ 
                            fontSize: '10px', 
                            background: (l.status || 'ACTIVE') === 'ACTIVE' ? '#e8f5e9' : '#f1f5f9', 
                            color: (l.status || 'ACTIVE') === 'ACTIVE' ? '#15803d' : '#64748b', 
                            padding: '1px 6px', 
                            borderRadius: '4px', 
                            fontWeight: '700',
                            border: `1px solid ${(l.status || 'ACTIVE') === 'ACTIVE' ? '#bbf7d0' : '#e2e8f0'}`,
                          }}>
                            {l.status || 'ACTIVE'}
                          </span>
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
                      <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                          {!['CASH', 'Purchase Account', 'Sales Account'].includes(l.ledger_name) && (
                            <button onClick={() => openEdit(l)} style={{ padding: '6px 12px', fontSize: '13px', cursor: 'pointer', background: '#eff6ff', color: '#3b82f6', border: 'none', borderRadius: '6px', fontWeight: '600', transition: 'all 0.2s' }}>Edit</button>
                          )}
                          {l.is_deletable && (
                            <button onClick={() => handleDelete(l.id)} style={{ padding: '6px 12px', fontSize: '13px', cursor: 'pointer', background: '#fef2f2', color: '#ef4444', border: 'none', borderRadius: '6px', fontWeight: '600', transition: 'all 0.2s' }}>Delete</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                }
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={filterType === 'CREDITORS' ? 8 : 5} style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>
                    <div style={{ fontSize: '48px', marginBottom: '12px' }}>📭</div>
                    <div style={{ fontSize: '16px', fontWeight: '600', color: '#475569' }}>No accounts found</div>
                    <p style={{ margin: '4px 0 0 0', fontSize: '14px' }}>Try adjusting your search or filters.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-out Drawer Form */}
      <Drawer title={editing ? 'Edit Account Ledger' : 'Create New Account Ledger'} isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)}>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Section 1 */}
          <div style={{ background: '#fff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#0f2d1f', display: 'flex', alignItems: 'center', gap: '8px' }}>🏢 General Details</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <Field label="Ledger Name" required><input required name="ledger_name" value={form.ledger_name} onChange={handleChange} style={inputStyle} placeholder="Enter full name" /></Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <Field label="Station"><input name="station" value={form.station} onChange={handleChange} style={inputStyle} placeholder="e.g. New Delhi" /></Field>
                <Field label="Account Group">
                  <select name="account_group" value={form.account_group} onChange={handleChange} style={inputStyle}>
                    <option>SUNDRY DEBTORS</option><option>SUNDRY CREDITORS</option><option>BANK ACCOUNTS</option><option>CASH IN HAND</option>
                    <option>DUTIES & TAXES</option><option>EXPENSES (INDIRECT)</option><option>INCOMES (INDIRECT)</option>
                  </select>
                </Field>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <Field label="Balancing Method">
                  <select name="balancing_method" value={form.balancing_method} onChange={handleChange} style={inputStyle}>
                    <option>Bill by Bill</option><option>On Account</option>
                  </select>
                </Field>
                <Field label="Opening Balance">
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input type="number" step="0.01" name="opening_balance" value={form.opening_balance} onChange={handleChange} style={{...inputStyle, flex: 1}} />
                    <select name="dr_cr" value={form.dr_cr} onChange={handleChange} style={{...inputStyle, width: '80px', background: form.dr_cr === 'Dr' ? '#fef2f2' : '#f0fdf4', color: form.dr_cr === 'Dr' ? '#ef4444' : '#22c55e', fontWeight: '700', border: `1px solid ${form.dr_cr === 'Dr' ? '#fca5a5' : '#86efac'}`}}>
                      <option>Dr</option><option>Cr</option>
                    </select>
                  </div>
                </Field>
              </div>
            </div>
          </div>

          {/* Section 2 */}
          <div style={{ background: '#fff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#0f2d1f', display: 'flex', alignItems: 'center', gap: '8px' }}>📍 Contact Information</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <Field label="Address"><textarea name="address" value={form.address} onChange={handleChange} style={{...inputStyle, height: '80px', resize: 'vertical'}} placeholder="Full address" /></Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <Field label="Mobile"><input name="mobile" value={form.mobile} onChange={handleChange} style={inputStyle} placeholder="+91" /></Field>
                <Field label="Email"><input type="email" name="email" value={form.email} onChange={handleChange} style={inputStyle} placeholder="mail@example.com" /></Field>
                <Field label="Pin Code"><input name="pin_code" value={form.pin_code} onChange={handleChange} style={inputStyle} /></Field>
                <Field label="Contact Person"><input name="contact_person" value={form.contact_person} onChange={handleChange} style={inputStyle} /></Field>
              </div>
            </div>
          </div>

          {/* Section 3 */}
          <div style={{ background: '#fff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#0f2d1f', display: 'flex', alignItems: 'center', gap: '8px' }}>📜 Statutory & Settings</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <Field label="GSTIN"><input name="gstin" value={form.gstin} onChange={handleChange} style={inputStyle} placeholder="15-digit GSTIN" /></Field>
              <Field label="PAN No"><input name="pan_no" value={form.pan_no} onChange={handleChange} style={inputStyle} placeholder="10-digit PAN" /></Field>
              <Field label="D.L. No."><input name="dl_no" value={form.dl_no} onChange={handleChange} style={inputStyle} placeholder="Drug License" /></Field>
              <Field label="Ledger Category">
                <select name="ledger_category" value={form.ledger_category} onChange={handleChange} style={inputStyle}>
                  <option>OTHERS</option><option>RETAILER</option><option>STOCKIST</option><option>OEM PARTNER</option><option>DISTRIBUTOR</option><option>SPECIALIST</option>
                </select>
              </Field>
              <Field label="State"><input name="state" value={form.state} onChange={handleChange} style={inputStyle} placeholder="e.g. 07-DELHI" /></Field>
              <Field label="Ledger Type">
                <select name="ledger_type" value={form.ledger_type} onChange={handleChange} style={inputStyle}>
                  <option>REGISTERED</option><option>UNREGISTERED</option><option>COMPOSITION</option>
                </select>
              </Field>
              <Field label="Status">
                <select name="status" value={form.status || 'ACTIVE'} onChange={handleChange} style={inputStyle}>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </Field>
            </div>
          </div>

          {/* Action Bar */}
          <div style={{ position: 'sticky', bottom: '-24px', background: '#f8fafc', padding: '24px 0', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px', zIndex: 10 }}>
            <button type="button" onClick={() => setIsDrawerOpen(false)} style={{ padding: '12px 24px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontFamily: 'Outfit', fontWeight: '600', color: '#475569', transition: 'all 0.2s' }}>Cancel</button>
            <button type="submit" style={{ padding: '12px 32px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #0f2d1f 0%, #153c29 100%)', color: '#fff', fontWeight: '700', cursor: 'pointer', fontFamily: 'Outfit', boxShadow: '0 4px 12px rgba(15, 45, 31, 0.2)', transition: 'all 0.2s' }}>💾 Save Ledger</button>
          </div>

        </form>
      </Drawer>

      {/* Styles for hover effects */}
      <style>{`
        input:focus, select:focus, textarea:focus { border-color: #10b981 !important; box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1) !important; }
        tr:hover { background: #f8fafc !important; }
        button:hover { transform: translateY(-1px); }
        button:active { transform: translateY(0); }
      `}</style>

      {/* Toast Alert */}
      {toast.show && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', background: toast.type === 'error' ? '#fee2e2' : '#dcfce7', border: `1px solid ${toast.type === 'error' ? '#fca5a5' : '#86efac'}`, color: toast.type === 'error' ? '#991b1b' : '#14532d', padding: '14px 24px', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', fontWeight: '600', zIndex: 99999, animation: 'slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}>
          <span style={{ fontSize: '18px' }}>{toast.type === 'error' ? '❌' : '✅'}</span>
          <span>{toast.msg}</span>
          <style>{`@keyframes slideIn { from { transform: translateY(100px) scale(0.9); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }`}</style>
        </div>
      )}
    </div>
  )
}

import React, { useState, useEffect } from 'react'
import { useDialog } from '../context/DialogContext'

const DEFAULT_GROUPS = [
  { name: 'SUNDRY DEBTORS', type: 'Asset', desc: 'Customers who owe you money for goods or services', isDefault: true },
  { name: 'SUNDRY CREDITORS', type: 'Liability', desc: 'Suppliers to whom you owe money for purchases', isDefault: true },
  { name: 'CASH-IN-HAND', type: 'Asset', desc: 'Physical cash available in the store (Cash Drawer)', isDefault: true },
  { name: 'BANK ACCOUNTS', type: 'Asset', desc: 'All business bank accounts (e.g., HDFC, SBI)', isDefault: true },
  { name: 'DIRECT EXPENSES', type: 'Expense', desc: 'Expenses directly related to purchases (e.g., Freight, Carriage)', isDefault: true },
  { name: 'INDIRECT EXPENSES', type: 'Expense', desc: 'Operating expenses (e.g., Shop Rent, Salaries, Electricity)', isDefault: true },
  { name: 'DIRECT INCOMES', type: 'Income', desc: 'Direct revenue generated from selling goods (Sales)', isDefault: true },
  { name: 'INDIRECT INCOMES', type: 'Income', desc: 'Other revenue sources (e.g., Discount Received, Interest)', isDefault: true },
  { name: 'CAPITAL ACCOUNT', type: 'Liability', desc: 'Funds invested by the business owner(s)', isDefault: true },
  { name: 'LOANS (LIABILITY)', type: 'Liability', desc: 'Borrowed funds or loans from banks and financial institutions', isDefault: true }
]

const CATEGORIES = ['Asset', 'Liability', 'Income', 'Expense']

export default function AccountGroups() {
  const [customGroups, setCustomGroups] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', type: 'Asset', desc: '' })
  const { showAlert, showConfirm } = useDialog()

  async function loadData() {
    try {
      const data = await window.api.getAccountGroups()
      setCustomGroups(data)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  async function handleSave(e) {
    e.preventDefault()
    if (!form.name.trim()) return showAlert('Validation Error', 'Group Name is required')
    if (!form.type) return showAlert('Validation Error', 'Category is required')
    
    try {
      await window.api.addAccountGroup({
        name: form.name.trim().toUpperCase(),
        type: form.type,
        desc: form.desc.trim()
      })
      setShowModal(false)
      setForm({ name: '', type: 'Asset', desc: '' })
      loadData()
    } catch (err) {
      if (err.message.includes('UNIQUE')) {
        showAlert('Error', 'Account Group with this name already exists.')
      } else {
        showAlert('Error', 'Failed to add custom group.')
      }
    }
  }

  async function handleDelete(id) {
    showConfirm('Delete Group', 'Are you sure you want to delete this custom group? This action cannot be undone.', async () => {
      try {
        await window.api.deleteAccountGroup(id)
        loadData()
      } catch (err) {
        showAlert('Error', 'Failed to delete custom group.')
      }
    })
  }

  const allGroups = [...DEFAULT_GROUPS, ...customGroups]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%', fontFamily: 'Outfit, sans-serif' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0', letterSpacing: '-0.5px' }}>Account Groups (Master)</h1>
          <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>Manage standard primary accounting groups and custom groups</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          style={{ 
            background: '#0f172a', color: '#fff', border: 'none', borderRadius: '12px', 
            padding: '12px 24px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', 
            transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(15, 23, 42, 0.2)' 
          }}
          className="btn-new"
        >
          + Add Custom Group
        </button>
      </div>

      {/* Table Section */}
      <div style={{ background: '#fff', borderRadius: '20px', border: '1px solid #e2e8f0', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
        <div style={{ padding: '0', overflowY: 'auto', flex: 1 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead style={{ background: '#f8fafc', position: 'sticky', top: 0, zIndex: 10 }}>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '16px 24px', textAlign: 'left', color: '#475569', fontWeight: '700', width: '25%', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>GROUP NAME</th>
                <th style={{ padding: '16px 24px', textAlign: 'left', color: '#475569', fontWeight: '700', width: '15%', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>CATEGORY</th>
                <th style={{ padding: '16px 24px', textAlign: 'left', color: '#475569', fontWeight: '700', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>DESCRIPTION / USAGE</th>
                <th style={{ padding: '16px 24px', textAlign: 'right', color: '#475569', fontWeight: '700', width: '10%', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {allGroups.map((grp, idx) => (
                <tr key={grp.id || `def-${idx}`} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }} className="table-row">
                  <td style={{ padding: '16px 24px', fontWeight: '700', color: '#0f172a' }}>
                    {grp.name}
                    {!grp.isDefault && (
                      <span style={{ marginLeft: '8px', fontSize: '10px', background: '#e0e7ff', color: '#4338ca', padding: '2px 6px', borderRadius: '4px', fontWeight: '800', letterSpacing: '0.5px' }}>CUSTOM</span>
                    )}
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <span style={{
                      background: grp.type === 'Asset' ? '#ecfdf5' : grp.type === 'Liability' ? '#fef2f2' : grp.type === 'Expense' ? '#fff7ed' : '#f0fdfa',
                      color: grp.type === 'Asset' ? '#059669' : grp.type === 'Liability' ? '#dc2626' : grp.type === 'Expense' ? '#ea580c' : '#0d9488',
                      padding: '4px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '800', border: `1px solid ${grp.type === 'Asset' ? '#a7f3d0' : grp.type === 'Liability' ? '#fecaca' : grp.type === 'Expense' ? '#ffedd5' : '#ccfbf1'}`
                    }}>
                      {grp.type}
                    </span>
                  </td>
                  <td style={{ padding: '16px 24px', color: '#64748b', fontSize: '13px', fontWeight: '500' }}>{grp.desc || '—'}</td>
                  <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                    {grp.isDefault ? (
                      <span style={{ color: '#cbd5e1', fontSize: '12px', fontWeight: '600' }}>Default</span>
                    ) : (
                      <button 
                        onClick={() => handleDelete(grp.id)} 
                        style={{ background: '#fef2f2', color: '#ef4444', border: 'none', borderRadius: '8px', padding: '6px 14px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Outfit, sans-serif', transition: 'all 0.2s' }} 
                        className="btn-delete"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Custom Group Modal */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '24px', width: '100%', maxWidth: '500px', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.2)', border: '1px solid #e2e8f0', overflow: 'hidden', animation: 'scaleIn 0.2s ease-out' }}>
            
            <div style={{ padding: '24px', background: 'linear-gradient(to right, #0f172a, #1e293b)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#f8fafc', letterSpacing: '-0.5px' }}>Add Custom Group</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', cursor: 'pointer', color: '#fff', transition: 'all 0.2s' }} className="btn-hover-close">✕</button>
            </div>

            <form onSubmit={handleSave} style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Group Name <span style={{ color: '#ef4444' }}>*</span></label>
                <input 
                  type="text" 
                  value={form.name} 
                  onChange={e => setForm({...form, name: e.target.value.toUpperCase()})}
                  placeholder="e.g. SECURED LOANS" 
                  style={{ padding: '12px 16px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', fontFamily: 'Outfit, sans-serif', background: '#f8fafc', outline: 'none', color: '#0f172a', transition: 'all 0.2s', fontWeight: '600' }} 
                  className="focus-ring"
                  autoFocus
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Category <span style={{ color: '#ef4444' }}>*</span></label>
                <select 
                  value={form.type} 
                  onChange={e => setForm({...form, type: e.target.value})}
                  style={{ padding: '12px 16px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', fontFamily: 'Outfit, sans-serif', background: '#f8fafc', outline: 'none', color: '#0f172a', transition: 'all 0.2s', fontWeight: '600' }} 
                  className="focus-ring"
                  required
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Description</label>
                <textarea 
                  value={form.desc} 
                  onChange={e => setForm({...form, desc: e.target.value})}
                  placeholder="What is this group used for?" 
                  style={{ padding: '12px 16px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', fontFamily: 'Outfit, sans-serif', background: '#f8fafc', outline: 'none', color: '#0f172a', transition: 'all 0.2s', minHeight: '80px', resize: 'vertical' }} 
                  className="focus-ring"
                />
              </div>

              <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '12px 24px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontWeight: '700', fontSize: '14px', color: '#475569', transition: 'all 0.2s' }} className="btn-hover-outline">Cancel</button>
                <button type="submit" style={{ padding: '12px 32px', borderRadius: '12px', border: 'none', background: '#10b981', color: '#fff', fontWeight: '800', cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontSize: '14px', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)', transition: 'all 0.2s' }} className="btn-hover-primary">Save Group</button>
              </div>

            </form>
          </div>
        </div>
      )}

      <style>{`
        .focus-ring:focus {
          border-color: #3b82f6 !important;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important;
          background: #fff !important;
        }
        .btn-new:hover { background: #1e293b !important; transform: translateY(-2px); }
        .table-row:hover { background: #f8fafc !important; }
        .btn-delete:hover { background: #fee2e2 !important; color: #dc2626 !important; box-shadow: 0 2px 4px rgba(220,38,38,0.1); }
        .btn-hover-close:hover { background: rgba(255,255,255,0.2) !important; transform: scale(1.05); }
        .btn-hover-outline:hover { background: #f1f5f9 !important; border-color: #94a3b8 !important; }
        .btn-hover-primary:hover { background: #059669 !important; box-shadow: 0 6px 20px rgba(5, 150, 105, 0.4) !important; transform: translateY(-2px); }
        @keyframes scaleIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>

    </div>
  )
}

import { useState } from 'react'
import { useDialog } from '../context/DialogContext'
import { useCache } from '../context/CacheContext'

export default function PowerMaster() {
  const { powers, refreshPowers } = useCache()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const { showConfirm, showAlert } = useDialog()

  async function handleSave(e) {
    e.preventDefault()
    setError('')
    try {
      if (!name.trim()) throw new Error("Power / Potency is required")
      if (editingId) {
        await window.api.updatePower({ id: editingId, name: name.trim() })
      } else {
        await window.api.addPower({ name: name.trim() })
      }
      setIsModalOpen(false)
      setName('')
      setEditingId(null)
      refreshPowers()
    } catch (err) {
      if (err.message.includes('UNIQUE')) {
        setError('A Power/Potency with this name already exists.')
      } else {
        setError(err.message)
      }
    }
  }

  async function handleDelete(id) {
    showConfirm('Delete Power', 'Are you sure you want to delete this power/potency? This action cannot be undone.', async () => {
      try {
        await window.api.deletePower(id)
        refreshPowers()
      } catch (err) {
        showAlert('Error', 'Failed to delete power/potency.')
      }
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%', fontFamily: 'Outfit, sans-serif' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0', letterSpacing: '-0.5px' }}>Power (Potency) Master</h1>
          <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>Manage medicine powers (e.g., 30, 200, 1M, Q)</p>
        </div>
        <button 
          onClick={() => { setEditingId(null); setName(''); setIsModalOpen(true); }} 
          style={{ 
            background: '#0f172a', color: '#fff', border: 'none', borderRadius: '12px', 
            padding: '12px 24px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', 
            transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(15, 23, 42, 0.2)' 
          }}
          className="btn-new"
        >
          + New Power
        </button>
      </div>

      {/* List */}
      <div style={{ background: '#fff', borderRadius: '20px', border: '1px solid #e2e8f0', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
        <div style={{ flex: 1, padding: '32px', overflowY: 'auto', background: '#f8fafc' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}>
            {powers.map(p => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', border: '1px solid #e2e8f0', borderRadius: '16px', background: '#fff', transition: 'all 0.2s' }} className="power-card">
                <span style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', letterSpacing: '0.5px' }}>
                  {p.name}
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => { setEditingId(p.id); setName(p.name); setIsModalOpen(true); }} style={{ background: '#f1f5f9', color: '#3b82f6', border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' }} className="btn-edit">Edit</button>
                  <button onClick={() => handleDelete(p.id)} style={{ background: '#fef2f2', color: '#ef4444', border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' }} className="btn-delete">Delete</button>
                </div>
              </div>
            ))}
            
            {powers.length === 0 && (
              <div style={{ gridColumn: '1 / -1', padding: '60px', textAlign: 'center', color: '#94a3b8', fontSize: '15px' }}>
                <div style={{ fontSize: '40px', marginBottom: '16px' }}>⚡</div>
                No powers added yet. Click "+ New Power" to start.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '24px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.2)', border: '1px solid #e2e8f0', overflow: 'hidden', animation: 'scaleIn 0.2s ease-out' }}>
            
            <div style={{ padding: '24px', background: 'linear-gradient(to right, #0f172a, #1e293b)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#f8fafc', letterSpacing: '-0.5px' }}>{editingId ? 'Edit Power' : 'Add New Power'}</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', cursor: 'pointer', color: '#fff', transition: 'all 0.2s' }} className="btn-hover-close">✕</button>
            </div>

            <form onSubmit={handleSave} style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {error && (
                <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', color: '#ef4444', borderRadius: '10px', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>❌</span> {error}
                </div>
              )}
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Power / Potency <span style={{ color: '#ef4444' }}>*</span></label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  placeholder="e.g. 30, 200, 1M"
                  style={{ padding: '12px 16px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '16px', fontFamily: 'Outfit, sans-serif', background: '#f8fafc', outline: 'none', color: '#0f172a', transition: 'all 0.2s', fontWeight: '800', letterSpacing: '0.5px' }} 
                  className="focus-ring"
                  autoFocus
                  required
                />
              </div>

              <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={() => { setIsModalOpen(false); setEditingId(null); setName(''); }} style={{ padding: '12px 24px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontWeight: '700', fontSize: '14px', color: '#475569', transition: 'all 0.2s' }} className="btn-hover-outline">Cancel</button>
                <button type="submit" style={{ padding: '12px 32px', borderRadius: '12px', border: 'none', background: '#10b981', color: '#fff', fontWeight: '800', cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontSize: '14px', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)', transition: 'all 0.2s' }} className="btn-hover-primary">{editingId ? 'Update' : 'Save'}</button>
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
        .power-card {
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);
        }
        .power-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05);
          border-color: #cbd5e1 !important;
        }
        .btn-edit:hover { background: #eff6ff !important; color: #2563eb !important; }
        .btn-delete:hover { background: #fee2e2 !important; color: #dc2626 !important; }
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

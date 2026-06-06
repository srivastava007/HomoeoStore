import { useState, useEffect } from 'react'
import { useDialog } from '../context/DialogContext'

export default function GodownMaster() {
  const [godowns, setGodowns] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const { showConfirm } = useDialog()

  async function load() {
    const data = await window.api.getGodowns()
    setGodowns(data)
  }

  useEffect(() => { load() }, [])

  async function handleSave(e) {
    e.preventDefault()
    setError('')
    try {
      if (!name) throw new Error("Godown name is required")
      await window.api.addGodown({ name, description })
      setIsModalOpen(false)
      setName('')
      setDescription('')
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleDelete(id) {
    showConfirm('Delete Godown', 'Are you sure you want to delete this godown?', async () => {
      await window.api.deleteGodown(id)
      load()
    })
  }

  return (
    <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 2px 4px -1px rgba(0,0,0,0.05)', height: '100%', display: 'flex', flexDirection: 'column', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em' }}>Godown Master</h2>
          <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Manage warehouse and godown locations</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)} 
          style={{ 
            background: '#10b981', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', 
            fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'Outfit, sans-serif',
            boxShadow: '0 2px 4px -1px rgba(16, 185, 129, 0.2)', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px'
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'none'}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
          New Godown
        </button>
      </div>

      {/* List */}
      <div style={{ flex: 1, padding: '24px', overflowY: 'auto', background: '#fff' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
          {godowns.map(g => (
            <div 
              key={g.id} 
              style={{ 
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', 
                border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff',
                boxShadow: '0 1px 3px -1px rgba(0,0,0,0.05)', transition: 'all 0.2s', cursor: 'default'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = '#cbd5e1';
                e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.05)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.boxShadow = '0 1px 3px -1px rgba(0,0,0,0.05)';
              }}
            >
              <div>
                <span style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', display: 'block' }}>{g.name}</span>
                {g.description ? (
                  <span style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', display: 'block' }}>{g.description}</span>
                ) : (
                  <span style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px', display: 'block', fontStyle: 'italic' }}>No description</span>
                )}
              </div>
              <button 
                onClick={() => handleDelete(g.id)} 
                style={{ 
                  background: '#fef2f2', border: '1px solid #fecaca', color: '#ef4444', cursor: 'pointer', 
                  width: '32px', height: '32px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'}
                onMouseLeave={e => e.currentTarget.style.background = '#fef2f2'}
                title="Delete Godown"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
              </button>
            </div>
          ))}
          
          {godowns.length === 0 && (
            <div style={{ gridColumn: '1 / -1', padding: '64px', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
               <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '16px' }}>
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
              </svg>
              <div style={{ fontSize: '15px', fontWeight: '600', color: '#0f172a', marginBottom: '4px' }}>No Godowns Found</div>
              <div style={{ fontSize: '13px' }}>Click "+ New Godown" to add your first storage location.</div>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, animation: 'fadeIn 0.2s ease' }}>
          <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', width: '400px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)', animation: 'slideUp 0.3s ease' }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', color: '#0f172a', fontWeight: '700', letterSpacing: '-0.01em' }}>Add New Godown</h3>
            
            <form onSubmit={handleSave}>
              {error && <div style={{ background: '#fef2f2', color: '#ef4444', padding: '10px', borderRadius: '6px', fontSize: '12px', marginBottom: '16px', border: '1px solid #fee2e2' }}>{error}</div>}
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Name <span style={{color: '#ef4444'}}>*</span></label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  placeholder="e.g. G1"
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', fontFamily: 'Outfit, sans-serif', boxSizing: 'border-box', outline: 'none', transition: 'all 0.2s' }}
                  onFocus={e => { e.target.style.borderColor = '#10b981'; e.target.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.1)' }}
                  onBlur={e => { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'none' }}
                  autoFocus
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Description</label>
                <input 
                  type="text" 
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                  placeholder="e.g. Main warehouse ground floor"
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', fontFamily: 'Outfit, sans-serif', boxSizing: 'border-box', outline: 'none', transition: 'all 0.2s' }}
                  onFocus={e => { e.target.style.borderColor = '#10b981'; e.target.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.1)' }}
                  onBlur={e => { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'none' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ flex: 1, padding: '10px', background: '#f1f5f9', border: 'none', borderRadius: '6px', color: '#475569', fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'} onMouseLeave={e => e.currentTarget.style.background = '#f1f5f9'}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: '10px', background: '#10b981', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '13px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 2px 4px rgba(16,185,129,0.2)', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#059669'} onMouseLeave={e => e.currentTarget.style.background = '#10b981'}>Save Godown</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

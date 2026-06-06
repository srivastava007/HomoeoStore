import { useState, useEffect } from 'react'
import DateInput from '../components/DateInput'

export default function FYSelector({ onSelect, onClose }) {
  const [years, setYears] = useState([])
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ id: '', name: '', startDate: '', endDate: '', copyFromDb: '' })
  const [error, setError] = useState('')

  async function load() {
    const data = await window.api.getFinancialYears()
    setYears(data)
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        if (showCreate) {
          setShowCreate(false)
        } else if (onClose) {
          onClose()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showCreate, onClose])

  useEffect(() => {
    const match = form.id.match(/^(\d{4})-(\d{4})$/)
    if (match) {
      const y1 = match[1]
      const y2 = match[2]
      setForm(prev => {
        const newStart = `${y1}-04-01`
        const newEnd = `${y2}-03-31`
        if (prev.startDate !== newStart || prev.endDate !== newEnd) {
          return { ...prev, name: `FY ${y1} - ${y2}`, startDate: newStart, endDate: newEnd }
        }
        return prev
      })
    }
  }, [form.id])

  useEffect(() => {
    if (form.startDate && form.endDate) {
      const y1 = form.startDate.split('-')[0]
      const y2 = form.endDate.split('-')[0]
      if (y1 && y2 && y1.length === 4 && y2.length === 4) {
        setForm(prev => {
          const newId = `${y1}-${y2}`
          const newName = `FY ${y1} - ${y2}`
          if (prev.id !== newId || prev.name !== newName) {
            return { ...prev, id: newId, name: newName }
          }
          return prev
        })
      }
    }
  }, [form.startDate, form.endDate])

  async function handleSelect(dbName) {
    await window.api.selectFinancialYear(dbName)
    try {
      const net = await window.api.getNetworkStatus()
      localStorage.setItem(`last_selected_fy_${net.mode}`, dbName)
    } catch (e) {
      localStorage.setItem('last_selected_fy_LOCAL', dbName)
    }
    localStorage.setItem('last_selected_fy', dbName)
    window.location.reload()
  }

  async function handleCreate(e) {
    e.preventDefault()
    setError('')
    try {
      if (!form.id || !form.name || !form.startDate || !form.endDate) {
        throw new Error("All fields are required")
      }
      await window.api.createFinancialYear(form)
      setShowCreate(false)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  const inputStyle = {
    padding: '10px 14px', borderRadius: '8px', border: '1px solid #d1d5db',
    fontSize: '14px', fontFamily: 'Outfit, sans-serif', outline: 'none',
    background: '#fff', width: '100%', boxSizing: 'border-box'
  }

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) {
          onClose()
        }
      }}
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(4px)', fontFamily: 'Outfit, sans-serif' }}
    >
      <div style={{ position: 'relative', width: '450px', background: '#fff', padding: '32px', borderRadius: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
        {onClose && (
          <button 
            type="button"
            onClick={onClose} 
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#9ca3af',
              fontSize: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#4b5563' }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9ca3af' }}
            title="Close"
          >
            ✕
          </button>
        )}
        
        {!showCreate ? (
          <>
            <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#111827', margin: '0 0 8px 0', textAlign: 'center' }}>Select Financial Year</h2>
            <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 24px 0', textAlign: 'center' }}>Choose a financial year to continue</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {years.map(y => (
                <button key={y.id} onClick={() => handleSelect(y.dbName)} style={{
                  padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px',
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start', cursor: 'pointer', transition: 'all 0.2s ease',
                  textAlign: 'left'
                }}
                onMouseOver={(e) => { e.currentTarget.style.borderColor = '#4ade80'; e.currentTarget.style.background = '#f0fdf4' }}
                onMouseOut={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#f8fafc' }}
                >
                  <span style={{ fontSize: '16px', fontWeight: '600', color: '#0f2d1f', marginBottom: '4px' }}>{y.name}</span>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>{y.startDate} to {y.endDate}</span>
                </button>
              ))}
            </div>

            <button onClick={() => setShowCreate(true)} style={{
              marginTop: '20px', padding: '14px', background: 'transparent', border: '2px dashed #cbd5e1', borderRadius: '12px',
              color: '#475569', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s ease',
              fontFamily: 'Outfit, sans-serif', width: '100%'
            }}
            onMouseOver={(e) => { e.currentTarget.style.borderColor = '#94a3b8'; e.currentTarget.style.color = '#334155' }}
            onMouseOut={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#475569' }}
            >
              + Create New Financial Year
            </button>
          </>
        ) : (
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#111827', margin: '0 0 8px 0' }}>New Financial Year</h2>
            
            {error && <div style={{ padding: '12px', background: '#fef2f2', color: '#dc2626', borderRadius: '8px', fontSize: '13px' }}>{error}</div>}

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#4b5563', marginBottom: '4px' }}>FY ID (e.g. 2025-2026)</label>
              <input style={inputStyle} value={form.id} onChange={e => {
                let val = e.target.value;
                if (/^\d{4}$/.test(val) && form.id.length < val.length) {
                  const nextYear = parseInt(val) + 1;
                  val = `${val}-${nextYear}`;
                }
                setForm({...form, id: val});
              }} placeholder="2025-2026" />
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#4b5563', marginBottom: '4px' }}>Display Name</label>
              <input style={inputStyle} value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="FY 2025 - 2026" />
            </div>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#4b5563', marginBottom: '4px' }}>Start Date</label>
                <DateInput style={inputStyle} value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#4b5563', marginBottom: '4px' }}>End Date</label>
                <DateInput style={inputStyle} value={form.endDate} onChange={e => setForm({...form, endDate: e.target.value})} />
              </div>
            </div>


            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
              <button type="button" onClick={() => setShowCreate(false)} style={{ flex: 1, padding: '12px', background: '#f1f5f9', border: 'none', borderRadius: '8px', color: '#475569', fontWeight: '600', cursor: 'pointer', fontFamily: 'Outfit, sans-serif' }}>Cancel</button>
              <button type="submit" style={{ flex: 2, padding: '12px', background: '#0f2d1f', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: '600', cursor: 'pointer', fontFamily: 'Outfit, sans-serif' }}>Create Year</button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

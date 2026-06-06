import { useState, useEffect, useMemo } from 'react'
import { useDialog } from '../context/DialogContext'

const EMPTY_HSN = {
  hsn_code: '', short_name: '', sgst: 0, cgst: 0, igst: 0, type: 'Goods', uqc: '', cess: 0
}

const lbl = { fontSize:'11px', fontWeight:'700', color:'#475569', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'6px', display:'block' }
const inp = { padding:'10px 14px', borderRadius:'10px', border:'1px solid #cbd5e1', fontSize:'14px', fontFamily:'Outfit, sans-serif', background:'#f8fafc', width:'100%', boxSizing:'border-box', outline:'none', color:'#0f172a', transition:'all 0.2s', fontWeight:'600' }
const sel = { ...inp }

export default function HsnSacMaster() {
  const [items, setItems] = useState([])
  const [categories, setCategories] = useState([])
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_HSN)
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(15)

  const { showAlert, showConfirm } = useDialog()

  async function load() {
    const [data, cats] = await Promise.all([
      window.api.getHsnSac(),
      window.api.getCategories()
    ])
    setItems(data)
    setCategories(cats)
  }

  useEffect(() => { load() }, [])

  function openAdd() { setForm(EMPTY_HSN); setEditing(null); setShowModal(true) }
  function openEdit(item) { setForm(item); setEditing(item.id); setShowModal(true) }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.hsn_code.trim()) return showAlert('Validation Error', 'HSN/SAC Code is required')
    
    const data = { 
      ...form, 
      sgst: parseFloat(form.sgst) || 0,
      cgst: parseFloat(form.cgst) || 0,
      igst: parseFloat(form.igst) || 0,
      cess: parseFloat(form.cess) || 0
    }
    
    if (editing) await window.api.updateHsnSac({ ...data, id: editing })
    else await window.api.addHsnSac(data)
    
    setShowModal(false)
    load()
  }

  async function handleDelete(id) {
    showConfirm('Delete HSN/SAC', 'Are you sure you want to delete this HSN/SAC? This action cannot be undone.', async () => {
      await window.api.deleteHsnSac(id)
      load()
    })
  }

  const getCategoryName = (val) => {
    if (!val) return '—'
    const cat = categories.find(c => String(c.id) === String(val))
    return cat ? cat.name : val
  }

  const filtered = useMemo(() => {
    return items.filter(i => {
      const q = search.toLowerCase()
      const catName = getCategoryName(i.short_name).toLowerCase()
      return i.hsn_code.toLowerCase().includes(q) || catName.includes(q)
    })
  }, [items, search, categories])

  const totalPages = Math.ceil(filtered.length / itemsPerPage)
  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filtered.slice(start, start + itemsPerPage)
  }, [filtered, currentPage, itemsPerPage])

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) setCurrentPage(totalPages)
  }, [filtered.length, totalPages, currentPage])

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%', fontFamily: 'Outfit, sans-serif' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0', letterSpacing: '-0.5px' }}>HSN/SAC Master</h1>
          <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>Manage GST HSN and SAC codes</p>
        </div>
        <button onClick={openAdd} style={{ 
          background: '#0f172a', color: '#fff', border: 'none', borderRadius: '12px', 
          padding: '12px 24px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', 
          transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(15, 23, 42, 0.2)' 
        }} className="btn-new">
          + New HSN/SAC
        </button>
      </div>

      {/* List Container */}
      <div style={{ background: '#fff', borderRadius: '20px', border: '1px solid #e2e8f0', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
        
        {/* Search Bar */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
            <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '16px' }}>🔍</span>
            <input
              placeholder="Search by HSN or Category..."
              value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
              style={{ padding: '12px 16px 12px 44px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '14px', fontFamily: 'Outfit, sans-serif', width: '100%', boxSizing: 'border-box', outline: 'none', transition: 'all 0.2s', background: '#fff' }}
              className="focus-ring"
            />
          </div>
        </div>
        
        {/* Table */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 1, background: '#f8fafc' }}>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '16px 24px', textAlign: 'left', fontWeight: '700', color: '#475569', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>HSN/SAC</th>
                <th style={{ padding: '16px 24px', textAlign: 'left', fontWeight: '700', color: '#475569', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Category</th>
                <th style={{ padding: '16px 24px', textAlign: 'center', fontWeight: '700', color: '#475569', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Type</th>
                <th style={{ padding: '16px 24px', textAlign: 'center', fontWeight: '700', color: '#475569', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>GST Rates</th>
                <th style={{ padding: '16px 24px', textAlign: 'right', fontWeight: '700', color: '#475569', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '60px', textAlign: 'center', color: '#94a3b8', fontSize: '15px' }}>
                    <div style={{ fontSize: '40px', marginBottom: '16px' }}>📑</div>
                    {search ? 'No matching records found.' : 'No HSN/SAC codes added yet. Click "+ New" to start.'}
                  </td>
                </tr>
              ) : currentItems.map(i => (
                <tr key={i.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }} className="table-row">
                  <td style={{ padding: '16px 24px', fontWeight: '700', color: '#0f172a', letterSpacing: '0.5px' }}>{i.hsn_code}</td>
                  <td style={{ padding: '16px 24px', color: '#64748b', fontWeight: '500' }}>{getCategoryName(i.short_name)}</td>
                  <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                    <span style={{ 
                      background: i.type === 'Goods' ? '#ecfdf5' : '#eff6ff', 
                      color: i.type === 'Goods' ? '#059669' : '#2563eb', 
                      padding: '4px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '700',
                      border: `1px solid ${i.type === 'Goods' ? '#a7f3d0' : '#bfdbfe'}`
                    }}>
                      {i.type}
                    </span>
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <span style={{ fontSize: '12px', color: '#64748b', background: '#f1f5f9', padding: '4px 8px', borderRadius: '6px' }}>S: <strong style={{color:'#0f172a'}}>{i.sgst}%</strong></span>
                      <span style={{ fontSize: '12px', color: '#64748b', background: '#f1f5f9', padding: '4px 8px', borderRadius: '6px' }}>C: <strong style={{color:'#0f172a'}}>{i.cgst}%</strong></span>
                      <span style={{ fontSize: '12px', color: '#64748b', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '4px 8px', borderRadius: '6px' }}>I: <strong style={{color:'#0f172a'}}>{i.igst}%</strong></span>
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                    <button onClick={() => openEdit(i)} style={{ background: '#f1f5f9', color: '#3b82f6', border: 'none', borderRadius: '8px', padding: '6px 14px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', marginRight: '8px', transition: 'all 0.2s' }} className="btn-edit">Edit</button>
                    <button onClick={() => handleDelete(i.id)} style={{ background: '#fef2f2', color: '#ef4444', border: 'none', borderRadius: '8px', padding: '6px 14px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' }} className="btn-delete">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filtered.length > 0 && (
          <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', color: '#64748b', fontWeight: '500' }}>
              <span>Show</span>
              <select 
                value={itemsPerPage} 
                onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontFamily: 'Outfit, sans-serif', cursor: 'pointer' }}
              >
                <option value={15}>15</option>
                <option value={30}>30</option>
                <option value={50}>50</option>
              </select>
              <span>entries per page</span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', color: '#64748b', marginRight: '8px' }}>
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length}
              </span>
              
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{ 
                  padding: '6px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', 
                  background: currentPage === 1 ? '#f1f5f9' : '#fff', 
                  color: currentPage === 1 ? '#94a3b8' : '#0f172a',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  fontWeight: '600', fontFamily: 'Outfit, sans-serif', fontSize: '13px'
                }}
              >
                Prev
              </button>
              
              <div style={{ display: 'flex', gap: '4px' }}>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum = i + 1;
                  // simple logic to show around current page
                  if (totalPages > 5) {
                    if (currentPage > 3) pageNum = currentPage - 3 + i + 1;
                    if (pageNum > totalPages) pageNum = totalPages - 4 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      style={{
                        width: '32px', height: '32px', borderRadius: '8px',
                        border: currentPage === pageNum ? 'none' : '1px solid #cbd5e1',
                        background: currentPage === pageNum ? '#10b981' : '#fff',
                        color: currentPage === pageNum ? '#fff' : '#475569',
                        fontWeight: '700', fontFamily: 'Outfit, sans-serif', fontSize: '13px',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: currentPage === pageNum ? '0 2px 8px rgba(16, 185, 129, 0.3)' : 'none'
                      }}
                    >
                      {pageNum}
                    </button>
                  )
                })}
              </div>

              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                style={{ 
                  padding: '6px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', 
                  background: currentPage === totalPages || totalPages === 0 ? '#f1f5f9' : '#fff', 
                  color: currentPage === totalPages || totalPages === 0 ? '#94a3b8' : '#0f172a',
                  cursor: currentPage === totalPages || totalPages === 0 ? 'not-allowed' : 'pointer',
                  fontWeight: '600', fontFamily: 'Outfit, sans-serif', fontSize: '13px'
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '24px', width: '100%', maxWidth: '600px', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.2)', border: '1px solid #e2e8f0', overflow: 'hidden', animation: 'scaleIn 0.2s ease-out', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
            
            <div style={{ padding: '24px 32px', background: 'linear-gradient(to right, #0f172a, #1e293b)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#f8fafc', letterSpacing: '-0.5px' }}>{editing ? 'Modify HSN/SAC' : 'Add New HSN/SAC'}</h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>Configure tax rates and category mappings</p>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', cursor: 'pointer', color: '#fff', transition: 'all 0.2s' }} className="btn-hover-close">✕</button>
            </div>

            <div style={{ padding: '32px', overflowY: 'auto' }}>
              <form id="hsn-form" onSubmit={handleSave} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={lbl}>HSN/SAC Code <span style={{ color: '#ef4444' }}>*</span></label>
                  <input name="hsn_code" value={form.hsn_code} onChange={handleChange} style={{...inp, fontSize: '16px', letterSpacing: '1px'}} className="focus-ring" placeholder="e.g. 30049014" autoFocus required />
                </div>

                <div>
                  <label style={lbl}>Category</label>
                  <select name="short_name" value={form.short_name} onChange={handleChange} style={sel} className="focus-ring">
                    <option value="">-- Select Category --</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div>
                  <label style={lbl}>Type</label>
                  <select name="type" value={form.type} onChange={handleChange} style={sel} className="focus-ring">
                    <option>Goods</option>
                    <option>Services</option>
                  </select>
                </div>

                <div style={{ gridColumn: '1 / -1', background: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                  <h3 style={{ gridColumn: '1 / -1', margin: '0 0 8px 0', fontSize: '14px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>💰</span> Tax Rates Configuration
                  </h3>
                  <div>
                    <label style={lbl}>SGST (%)</label>
                    <input type="number" step="0.01" name="sgst" value={form.sgst} onChange={handleChange} style={inp} className="focus-ring" />
                  </div>
                  <div>
                    <label style={lbl}>CGST (%)</label>
                    <input type="number" step="0.01" name="cgst" value={form.cgst} onChange={handleChange} style={inp} className="focus-ring" />
                  </div>
                  <div>
                    <label style={lbl}>IGST (%)</label>
                    <input type="number" step="0.01" name="igst" value={form.igst} onChange={handleChange} style={{...inp, background: '#fff'}} className="focus-ring" />
                  </div>
                </div>

                <div>
                  <label style={lbl}>UQC (Unit)</label>
                  <input name="uqc" value={form.uqc} onChange={handleChange} style={inp} className="focus-ring" placeholder="e.g. BTL, PCS" />
                </div>

                <div>
                  <label style={lbl}>CESS (%)</label>
                  <input type="number" step="0.01" name="cess" value={form.cess} onChange={handleChange} style={{...inp, borderColor: '#bfdbfe', background: '#eff6ff', color: '#1e3a8a'}} className="focus-ring" />
                </div>

              </form>
            </div>

            <div style={{ padding: '24px 32px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '16px', background: '#fff' }}>
              <button type="button" onClick={() => setShowModal(false)} style={{ padding: '12px 24px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontWeight: '700', fontSize: '14px', color: '#475569', transition: 'all 0.2s' }} className="btn-hover-outline">Cancel</button>
              <button type="submit" form="hsn-form" style={{ padding: '12px 40px', borderRadius: '12px', border: 'none', background: '#10b981', color: '#fff', fontWeight: '800', cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontSize: '14px', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)', transition: 'all 0.2s' }} className="btn-hover-primary">{editing ? 'Update HSN/SAC' : 'Save HSN/SAC'}</button>
            </div>

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
        .btn-edit:hover { background: #eff6ff !important; color: #2563eb !important; box-shadow: 0 2px 4px rgba(37,99,235,0.1); }
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

import { useState, useEffect, useMemo } from 'react'
import { useDialog } from '../context/DialogContext'

const EMPTY = {
  name: '', company: '', phone: '', email: '', notes: ''
}

const lbl = { fontSize:'11px', fontWeight:'700', color:'#475569', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'6px', display:'block' }
const inp = { padding:'10px 14px', borderRadius:'10px', border:'1px solid #cbd5e1', fontSize:'14px', fontFamily:'Outfit, sans-serif', background:'#f8fafc', width:'100%', boxSizing:'border-box', outline:'none', color:'#0f172a', transition:'all 0.2s' }

export default function MRMaster() {
  const [items, setItems] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [searchTerm, setSearchTerm] = useState('')
  const { showAlert, showConfirm } = useDialog()
  
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  async function load() { setItems(await window.api.getMRs()) }
  useEffect(() => { load() }, [])

  function openNew() { setForm(EMPTY); setEditing(null); setShowForm(true) }
  function openEdit(c) { setForm({ ...EMPTY, ...c }); setEditing(c.id); setShowForm(true) }

  async function handleSave() {
    if (!form.name.trim()) return showAlert('Validation Error', 'Reference Name is required')
    const data = { ...form }
    if (editing) await window.api.updateMR({ ...data, id: editing })
    else await window.api.addMR(data)
    setShowForm(false)
    load()
  }

  async function handleDelete(id) {
    showConfirm('Delete Reference', 'Are you sure you want to delete this Reference?', async () => {
      await window.api.deleteMR(id)
      load()
    })
  }

  const ch = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const filteredItems = useMemo(() => {
    if (!searchTerm) return items;
    const lower = searchTerm.toLowerCase();
    return items.filter(c => 
      c.name.toLowerCase().includes(lower) || 
      (c.company && c.company.toLowerCase().includes(lower)) || 
      (c.phone && c.phone.includes(lower))
    );
  }, [items, searchTerm]);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage)
  
  const currentItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredItems.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredItems, currentPage, itemsPerPage])

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) setCurrentPage(totalPages)
  }, [items.length, totalPages, currentPage])

  if (showForm) {
    return (
      <div style={{ background:'#fff', borderRadius:'24px', boxShadow:'0 20px 40px -10px rgba(0,0,0,0.1)', height:'100%', display:'flex', flexDirection:'column', overflow:'hidden', border:'1px solid #e2e8f0' }}>
        
        <div style={{ padding:'24px 32px', background:'linear-gradient(to right, #0f172a, #1e293b)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <h2 style={{ margin:0, fontSize:'22px', fontWeight:'800', color:'#f8fafc', letterSpacing:'-0.5px' }}>
              {editing ? 'Modify Reference' : 'Add Reference'}
            </h2>
            <p style={{ margin:'4px 0 0 0', fontSize:'13px', color:'#94a3b8' }}>Fill in Reference details below</p>
          </div>
          <button onClick={() => setShowForm(false)} style={{ background:'rgba(255,255,255,0.1)', border:'none', borderRadius:'50%', width:'40px', height:'40px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', cursor:'pointer', color:'#fff', transition:'all 0.2s' }} className="btn-hover-close">✕</button>
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:'32px', background:'#f8fafc' }}>
          <div style={{ display:'flex', flexDirection:'column', gap:'20px', background:'#fff', padding:'32px', borderRadius:'20px', boxShadow:'0 4px 20px rgba(0,0,0,0.03)', border:'1px solid #e2e8f0', maxWidth:'600px', margin:'0 auto' }}>
            <div>
              <h3 style={{ margin:'0 0 16px 0', fontSize:'16px', color:'#0f172a', borderBottom:'2px solid #f1f5f9', paddingBottom:'12px', display:'flex', alignItems:'center', gap:'8px' }}>
                <span style={{ fontSize:'18px' }}>👨‍⚕️</span> Reference Information
              </h3>
            </div>
            <div><label style={lbl}>Reference Name <span style={{ color: '#ef4444' }}>*</span></label><input style={inp} className="focus-ring" value={form.name} onChange={ch('name')} autoFocus placeholder="e.g. Rahul Sharma" /></div>
            <div><label style={lbl}>Company / Agency</label><input style={inp} className="focus-ring" value={form.company} onChange={ch('company')} placeholder="Company name..." /></div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>
              <div><label style={lbl}>Phone No.</label><input style={inp} className="focus-ring" value={form.phone} onChange={ch('phone')} placeholder="Phone Number" /></div>
              <div><label style={lbl}>E-Mail</label><input style={inp} className="focus-ring" value={form.email} onChange={ch('email')} placeholder="Email Address" /></div>
            </div>
            <div><label style={lbl}>Notes / Remarks</label><textarea style={{...inp, height: '80px', resize: 'vertical'}} className="focus-ring" value={form.notes} onChange={ch('notes')} placeholder="Any specific area, target, or instructions..." /></div>
          </div>
        </div>

        <div style={{ padding:'24px 32px', borderTop:'1px solid #e2e8f0', display:'flex', justifyContent:'flex-end', gap:'16px', background:'#fff' }}>
          <button onClick={() => setShowForm(false)} style={{ padding:'12px 24px', borderRadius:'12px', border:'1px solid #cbd5e1', background:'#fff', cursor:'pointer', fontFamily:'Outfit, sans-serif', fontWeight:'700', fontSize:'14px', color:'#475569', transition:'all 0.2s' }} className="btn-hover-outline">Cancel</button>
          <button onClick={handleSave} style={{ padding:'12px 40px', borderRadius:'12px', border:'none', background:'#10b981', color:'#fff', fontWeight:'800', cursor:'pointer', fontFamily:'Outfit, sans-serif', fontSize:'14px', boxShadow:'0 4px 14px rgba(16, 185, 129, 0.3)', transition:'all 0.2s' }} className="btn-hover-primary">Save Reference</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'24px', height:'100%', fontFamily: 'Outfit, sans-serif' }}>
      
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <h1 style={{ fontSize:'28px', fontWeight:'800', color:'#0f172a', margin:'0 0 4px 0', letterSpacing:'-0.5px' }}>Reference Master</h1>
          <p style={{ fontSize:'14px', color:'#64748b', margin:0 }}>{filteredItems.length} references found</p>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <input 
            type="text" 
            placeholder="Search Reference or Company..." 
            value={searchTerm} 
            onChange={e => {setSearchTerm(e.target.value); setCurrentPage(1);}}
            style={{ padding: '10px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', width: '250px', fontFamily: 'Outfit, sans-serif' }}
            className="focus-ring"
          />
          <button onClick={openNew} style={{ 
            background:'#0f172a', color:'#fff', border:'none', borderRadius:'12px', 
            padding:'10px 24px', fontSize:'14px', fontWeight:'700', cursor:'pointer', 
            fontFamily:'Outfit, sans-serif', transition:'all 0.2s', boxShadow:'0 4px 12px rgba(15, 23, 42, 0.2)', height: '42px'
          }} className="btn-new">
            + New Reference
          </button>
        </div>
      </div>

      <div style={{ background:'#fff', borderRadius:'20px', boxShadow:'0 10px 30px rgba(0,0,0,0.03)', border:'1px solid #e2e8f0', flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ overflowY:'auto', flex:1 }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'14px' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 1, background:'#f8fafc' }}>
              <tr style={{ borderBottom:'1px solid #e2e8f0' }}>
                {['Name','Company','Phone','Email','Notes','Actions'].map(h => (
                  <th key={h} style={{ padding:'16px 24px', textAlign: h === 'Actions' ? 'right' : 'left', fontWeight:'700', color:'#475569', fontSize:'12px', textTransform:'uppercase', letterSpacing:'0.5px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding:'60px', textAlign:'center', color:'#94a3b8', fontSize:'15px' }}>
                    <div style={{ fontSize:'40px', marginBottom:'16px' }}>👨‍⚕️</div>
                    No References yet. Click "+ New Reference" to start.
                  </td>
                </tr>
              ) : currentItems.map(c => (
                <tr key={c.id} style={{ borderBottom:'1px solid #f1f5f9', transition:'background 0.2s' }} className="table-row">
                  <td style={{ padding:'16px 24px', fontWeight:'700', color:'#0f172a' }}>{c.name}</td>
                  <td style={{ padding:'16px 24px', color:'#64748b', fontWeight:'600' }}>{c.company || '—'}</td>
                  <td style={{ padding:'16px 24px', color:'#64748b', fontWeight:'500' }}>{c.phone || '—'}</td>
                  <td style={{ padding:'16px 24px', color:'#64748b', fontWeight:'500' }}>{c.email || '—'}</td>
                  <td style={{ padding:'16px 24px', color:'#64748b', fontWeight:'500' }}>{c.notes || '—'}</td>
                  <td style={{ padding:'16px 24px', textAlign:'right' }}>
                    <button onClick={() => openEdit(c)} style={{ background:'#f1f5f9', color:'#3b82f6', border:'none', borderRadius:'8px', padding:'6px 14px', fontSize:'13px', fontWeight:'700', cursor:'pointer', marginRight:'8px', fontFamily:'Outfit, sans-serif', transition:'all 0.2s' }} className="btn-edit">Edit</button>
                    <button onClick={() => handleDelete(c.id)} style={{ background:'#fef2f2', color:'#ef4444', border:'none', borderRadius:'8px', padding:'6px 14px', fontSize:'13px', fontWeight:'700', cursor:'pointer', fontFamily:'Outfit, sans-serif', transition:'all 0.2s' }} className="btn-delete">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {items.length > 0 && (
          <div style={{ padding:'16px 24px', borderTop:'1px solid #e2e8f0', background:'#f8fafc', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'12px', fontSize:'13px', color:'#64748b', fontWeight:'500' }}>
              <span>Show</span>
              <select 
                value={itemsPerPage} 
                onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                style={{ padding:'6px 12px', borderRadius:'8px', border:'1px solid #cbd5e1', outline:'none', fontFamily:'Outfit, sans-serif', cursor:'pointer' }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <span>entries per page</span>
            </div>
            
            <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
              <span style={{ fontSize:'13px', color:'#64748b', marginRight:'8px' }}>
                Showing {filteredItems.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredItems.length)} of {filteredItems.length}
              </span>
              
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{ 
                  padding:'6px 14px', borderRadius:'8px', border:'1px solid #cbd5e1', 
                  background: currentPage === 1 ? '#f1f5f9' : '#fff', 
                  color: currentPage === 1 ? '#94a3b8' : '#0f172a',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  fontWeight:'600', fontFamily:'Outfit, sans-serif', fontSize:'13px'
                }}
              >
                Prev
              </button>
              
              <div style={{ display:'flex', gap:'4px' }}>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    style={{
                      width:'32px', height:'32px', borderRadius:'8px',
                      border: currentPage === page ? 'none' : '1px solid #cbd5e1',
                      background: currentPage === page ? '#10b981' : '#fff',
                      color: currentPage === page ? '#fff' : '#475569',
                      fontWeight:'700', fontFamily:'Outfit, sans-serif', fontSize:'13px',
                      cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
                      boxShadow: currentPage === page ? '0 2px 8px rgba(16, 185, 129, 0.3)' : 'none'
                    }}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                style={{ 
                  padding:'6px 14px', borderRadius:'8px', border:'1px solid #cbd5e1', 
                  background: currentPage === totalPages || totalPages === 0 ? '#f1f5f9' : '#fff', 
                  color: currentPage === totalPages || totalPages === 0 ? '#94a3b8' : '#0f172a',
                  cursor: currentPage === totalPages || totalPages === 0 ? 'not-allowed' : 'pointer',
                  fontWeight:'600', fontFamily:'Outfit, sans-serif', fontSize:'13px'
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
      
      <style>{`
        .focus-ring:focus {
          border-color: #3b82f6 !important;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important;
          background: #fff !important;
        }
        .btn-hover-close:hover {
          background: rgba(255,255,255,0.2) !important;
          transform: scale(1.05);
        }
        .btn-hover-outline:hover {
          background: #f1f5f9 !important;
          border-color: #94a3b8 !important;
        }
        .btn-hover-primary:hover {
          background: #059669 !important;
          box-shadow: 0 6px 20px rgba(5, 150, 105, 0.4) !important;
          transform: translateY(-2px);
        }
        .btn-new:hover { background: #1e293b !important; transform: translateY(-2px); }
        .table-row:hover { background: #f8fafc !important; }
        .btn-edit:hover { background: #eff6ff !important; color: #2563eb !important; box-shadow: 0 2px 4px rgba(37,99,235,0.1); }
        .btn-delete:hover { background: #fee2e2 !important; color: #dc2626 !important; box-shadow: 0 2px 4px rgba(220,38,38,0.1); }
      `}</style>
    </div>
  )
}

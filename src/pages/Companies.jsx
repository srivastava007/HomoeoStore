import { useState, useEffect, useMemo } from 'react'
import { useDialog } from '../context/DialogContext'
import DateInput from '../components/DateInput'
import { useCache } from '../context/CacheContext'

const STATES = [
  '00-Other State','01-Jammu and Kashmir','02-Himachal Pradesh','03-Punjab','04-Chandigarh',
  '05-Uttarakhand','06-Haryana','07-Delhi','08-Rajasthan','09-Uttar Pradesh','10-Bihar',
  '11-Sikkim','12-Arunachal Pradesh','13-Nagaland','14-Manipur','15-Mizoram','16-Tripura',
  '17-Meghalaya','18-Assam','19-West Bengal','20-Jharkhand','21-Odisha','22-Chhattisgarh',
  '23-Madhya Pradesh','24-Gujarat','25-Daman and Diu','26-Dadra and Nagar Haveli',
  '27-Maharashtra','29-Karnataka','30-Goa','31-Lakshadweep','32-Kerala','33-Tamil Nadu',
  '34-Puducherry','35-Andaman and Nicobar Islands','36-Telangana','37-Andhra Pradesh','38-Ladakh'
]

const BUSINESS_TYPES = ['PHARMACY SHOP (CHEMIST)','HOMOEOPATHIC CLINIC','WHOLESALE DEALER','RETAIL DEALER','HOSPITAL','COMPANY','MANUFACTURER','OTHER']
const TAX_STRUCTURES = ['Product Wise','Bill Wise','Not Applicable']
const COMPANY_TYPES = ['Registered','Unregistered','Composition']

const EMPTY = {
  name:'', address1:'', address2:'', phone:'', branch_code:'',
  website:'', email:'', country:'India', state:'', business_type:'PHARMACY SHOP (CHEMIST)',
  working_style:'', gstin:'', vat_no:'', dl_no:'', dl_expiry:'',
  mfg_lic_no:'', mfg_lic_expiry:'', lst_no:'', lst_expiry:'',
  service_tax:'', service_tax_expiry:'', food_lic_no:'', food_lic_expiry:'',
  fax:'', address3:'', jurisdiction:'', tax_structure:'Product Wise',
  company_type:'Registered', valuation:'Last Purchase', password:''
}

const lbl = { fontSize:'11px', fontWeight:'700', color:'#475569', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'6px', display:'block' }
const inp = { padding:'10px 14px', borderRadius:'10px', border:'1px solid #cbd5e1', fontSize:'14px', fontFamily:'Outfit, sans-serif', background:'#f8fafc', width:'100%', boxSizing:'border-box', outline:'none', color:'#0f172a', transition:'all 0.2s' }
const sel = { ...inp }

export default function Companies() {
  const { companies: items, refreshCompanies } = useCache()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [searchTerm, setSearchTerm] = useState('')
  const { showAlert, showConfirm } = useDialog()
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  function openNew() { setForm(EMPTY); setEditing(null); setShowForm(true) }
  function openEdit(c) { setForm({ ...EMPTY, ...c }); setEditing(c.id); setShowForm(true) }

  async function handleSave() {
    if (!form.name.trim()) return showAlert('Validation Error', 'Company Name is required')
    const data = { ...form }
    Object.keys(EMPTY).forEach(k => { if (data[k] === undefined || data[k] === null) data[k] = '' })
    if (editing) await window.api.updateCompany({ ...data, id: editing })
    else await window.api.addCompany(data)
    setShowForm(false)
    refreshCompanies()
  }

  async function handleDelete(id) {
    showConfirm('Delete Company', 'Are you sure you want to delete this company?', async () => {
      await window.api.deleteCompany(id)
      refreshCompanies()
    })
  }

  const ch = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  // Pagination & Search Logic
  const filteredItems = useMemo(() => {
    if (!searchTerm) return items;
    const lower = searchTerm.toLowerCase();
    return items.filter(c => 
      c.name.toLowerCase().includes(lower) || 
      (c.phone && c.phone.includes(lower)) || 
      (c.gstin && c.gstin.toLowerCase().includes(lower))
    );
  }, [items, searchTerm]);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage)
  
  const currentItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredItems.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredItems, currentPage, itemsPerPage])

  // Ensure current page is valid when items array changes
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages)
    }
  }, [items.length, totalPages, currentPage])

  if (showForm) {
    return (
      <div style={{ background:'#fff', borderRadius:'24px', boxShadow:'0 20px 40px -10px rgba(0,0,0,0.1)', height:'100%', display:'flex', flexDirection:'column', overflow:'hidden', border:'1px solid #e2e8f0' }}>
        
        <div style={{ padding:'24px 32px', background:'linear-gradient(to right, #0f172a, #1e293b)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <h2 style={{ margin:0, fontSize:'22px', fontWeight:'800', color:'#f8fafc', letterSpacing:'-0.5px' }}>
              {editing ? 'Modify Company' : 'Company Creation'}
            </h2>
            <p style={{ margin:'4px 0 0 0', fontSize:'13px', color:'#94a3b8' }}>Fill in the business and tax details below</p>
          </div>
          <button onClick={() => setShowForm(false)} style={{ background:'rgba(255,255,255,0.1)', border:'none', borderRadius:'50%', width:'40px', height:'40px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', cursor:'pointer', color:'#fff', transition:'all 0.2s' }} className="btn-hover-close">✕</button>
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:'32px', background:'#f8fafc' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'48px', maxWidth:'1000px', margin:'0 auto' }}>
            
            {/* Left Column */}
            <div style={{ display:'flex', flexDirection:'column', gap:'20px', background:'#fff', padding:'32px', borderRadius:'20px', boxShadow:'0 4px 20px rgba(0,0,0,0.03)', border:'1px solid #e2e8f0' }}>
              <div>
                <h3 style={{ margin:'0 0 16px 0', fontSize:'16px', color:'#0f172a', borderBottom:'2px solid #f1f5f9', paddingBottom:'12px', display:'flex', alignItems:'center', gap:'8px' }}>
                  <span style={{ fontSize:'18px' }}>🏢</span> Basic Information
                </h3>
              </div>
              <div><label style={lbl}>Company Name <span style={{ color: '#ef4444' }}>*</span></label><input style={inp} className="focus-ring" value={form.name} onChange={ch('name')} autoFocus placeholder="Legal entity name" /></div>
              <div style={{ display:'flex', flexDirection:'column', gap:'12px', background:'#f8fafc', padding:'16px', borderRadius:'12px', border:'1px solid #e2e8f0' }}>
                <label style={{...lbl, marginBottom:0}}>Address Details</label>
                <input style={inp} className="focus-ring" value={form.address1} onChange={ch('address1')} placeholder="Line 1 (Shop/Building)" />
                <input style={inp} className="focus-ring" value={form.address2} onChange={ch('address2')} placeholder="Line 2 (Locality)" />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>
                <div><label style={lbl}>Phone No.</label><input style={inp} className="focus-ring" value={form.phone} onChange={ch('phone')} placeholder="+91..." /></div>
                <div><label style={lbl}>Branch Code</label><input style={inp} className="focus-ring" value={form.branch_code} onChange={ch('branch_code')} placeholder="e.g. BR-01" /></div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>
                <div><label style={lbl}>Website</label><input style={inp} className="focus-ring" value={form.website} onChange={ch('website')} placeholder="www." /></div>
                <div><label style={lbl}>E-Mail</label><input style={inp} className="focus-ring" value={form.email} onChange={ch('email')} placeholder="@" /></div>
              </div>
              <div>
                <label style={lbl}>Business Type</label>
                <select style={sel} className="focus-ring" value={form.business_type} onChange={ch('business_type')}>
                  {BUSINESS_TYPES.map(b => <option key={b}>{b}</option>)}
                </select>
              </div>
            </div>

            {/* Right Column */}
            <div style={{ display:'flex', flexDirection:'column', gap:'20px', background:'#fff', padding:'32px', borderRadius:'20px', boxShadow:'0 4px 20px rgba(0,0,0,0.03)', border:'1px solid #e2e8f0' }}>
              <div>
                <h3 style={{ margin:'0 0 16px 0', fontSize:'16px', color:'#0f172a', borderBottom:'2px solid #f1f5f9', paddingBottom:'12px', display:'flex', alignItems:'center', gap:'8px' }}>
                  <span style={{ fontSize:'18px' }}>📝</span> Registration & Licensing
                </h3>
              </div>
              <div>
                <label style={lbl}>State</label>
                <input
                  list="state-list"
                  style={inp}
                  className="focus-ring"
                  value={form.state}
                  onChange={ch('state')}
                  placeholder="Type or select state..."
                />
                <datalist id="state-list">
                  {STATES.map(s => <option key={s} value={s} />)}
                </datalist>
              </div>
              <div><label style={lbl}>GSTIN Number</label><input style={{ ...inp, letterSpacing:'1px', fontWeight:'600' }} className="focus-ring" value={form.gstin} onChange={e => setForm(f => ({ ...f, gstin: e.target.value.toUpperCase() }))} placeholder="e.g. 07AABCT1234F1Z5" maxLength={15} /></div>
              
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px', background:'#f8fafc', padding:'16px', borderRadius:'12px', border:'1px solid #e2e8f0' }}>
                <div><label style={lbl}>D.L. No.</label><input style={inp} className="focus-ring" value={form.dl_no} onChange={ch('dl_no')} placeholder="Drug License" /></div>
                <div><label style={lbl}>D.L. Expiry</label><DateInput  style={inp} className="focus-ring" value={form.dl_expiry} onChange={ch('dl_expiry')} /></div>
              </div>
              
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px', background:'#f8fafc', padding:'16px', borderRadius:'12px', border:'1px solid #e2e8f0' }}>
                <div><label style={lbl}>Mfg. Lic. No.</label><input style={inp} className="focus-ring" value={form.mfg_lic_no} onChange={ch('mfg_lic_no')} placeholder="Manufacturing Lic" /></div>
                <div><label style={lbl}>Mfg. Expiry</label><DateInput  style={inp} className="focus-ring" value={form.mfg_lic_expiry} onChange={ch('mfg_lic_expiry')} /></div>
              </div>
              
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>
                <div>
                  <label style={lbl}>Tax Structure</label>
                  <select style={sel} className="focus-ring" value={form.tax_structure} onChange={ch('tax_structure')}>
                    {TAX_STRUCTURES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Company Type</label>
                  <select style={sel} className="focus-ring" value={form.company_type} onChange={ch('company_type')}>
                    {COMPANY_TYPES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding:'24px 32px', borderTop:'1px solid #e2e8f0', display:'flex', justifyContent:'flex-end', gap:'16px', background:'#fff' }}>
          <button onClick={() => setShowForm(false)} style={{ padding:'12px 24px', borderRadius:'12px', border:'1px solid #cbd5e1', background:'#fff', cursor:'pointer', fontFamily:'Outfit, sans-serif', fontWeight:'700', fontSize:'14px', color:'#475569', transition:'all 0.2s' }} className="btn-hover-outline">Cancel</button>
          <button onClick={handleSave} style={{ padding:'12px 40px', borderRadius:'12px', border:'none', background:'#10b981', color:'#fff', fontWeight:'800', cursor:'pointer', fontFamily:'Outfit, sans-serif', fontSize:'14px', boxShadow:'0 4px 14px rgba(16, 185, 129, 0.3)', transition:'all 0.2s' }} className="btn-hover-primary">Save Company</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'24px', height:'100%', fontFamily: 'Outfit, sans-serif' }}>
      
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <h1 style={{ fontSize:'28px', fontWeight:'800', color:'#0f172a', margin:'0 0 4px 0', letterSpacing:'-0.5px' }}>Company Master</h1>
          <p style={{ fontSize:'14px', color:'#64748b', margin:0 }}>{filteredItems.length} companies found</p>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <input 
            type="text" 
            placeholder="Search company..." 
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
            + New Company
          </button>
        </div>
      </div>

      <div style={{ background:'#fff', borderRadius:'20px', boxShadow:'0 10px 30px rgba(0,0,0,0.03)', border:'1px solid #e2e8f0', flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ overflowY:'auto', flex:1 }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'14px' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 1, background:'#f8fafc' }}>
              <tr style={{ borderBottom:'1px solid #e2e8f0' }}>
                {['Company Name','Branch','Phone','GSTIN','State','Type','Actions'].map(h => (
                  <th key={h} style={{ padding:'16px 24px', textAlign: h === 'Actions' ? 'right' : 'left', fontWeight:'700', color:'#475569', fontSize:'12px', textTransform:'uppercase', letterSpacing:'0.5px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding:'60px', textAlign:'center', color:'#94a3b8', fontSize:'15px' }}>
                    <div style={{ fontSize:'40px', marginBottom:'16px' }}>🏢</div>
                    No companies yet. Click "+ New Company" to start.
                  </td>
                </tr>
              ) : currentItems.map(c => (
                <tr key={c.id} style={{ borderBottom:'1px solid #f1f5f9', transition:'background 0.2s' }} className="table-row">
                  <td style={{ padding:'16px 24px', fontWeight:'700', color:'#0f172a' }}>{c.name}</td>
                  <td style={{ padding:'16px 24px', color:'#64748b', fontWeight:'500' }}>{c.branch_code || '—'}</td>
                  <td style={{ padding:'16px 24px', color:'#64748b', fontWeight:'500' }}>{c.phone || '—'}</td>
                  <td style={{ padding:'16px 24px', color:'#64748b', fontWeight:'500' }}>{c.gstin || '—'}</td>
                  <td style={{ padding:'16px 24px', color:'#64748b', fontWeight:'500' }}>{c.state || '—'}</td>
                  <td style={{ padding:'16px 24px' }}>
                    <span style={{ 
                      background: c.company_type === 'Registered' ? '#ecfdf5' : '#f1f5f9', 
                      color: c.company_type === 'Registered' ? '#059669' : '#64748b', 
                      padding:'4px 12px', borderRadius:'8px', fontSize:'12px', fontWeight:'700',
                      border: `1px solid ${c.company_type === 'Registered' ? '#a7f3d0' : '#e2e8f0'}`
                    }}>
                      {c.company_type || 'Registered'}
                    </span>
                  </td>
                  <td style={{ padding:'16px 24px', textAlign:'right' }}>
                    <button onClick={() => openEdit(c)} style={{ background:'#f1f5f9', color:'#3b82f6', border:'none', borderRadius:'8px', padding:'6px 14px', fontSize:'13px', fontWeight:'700', cursor:'pointer', marginRight:'8px', fontFamily:'Outfit, sans-serif', transition:'all 0.2s' }} className="btn-edit">Edit</button>
                    <button onClick={() => handleDelete(c.id)} style={{ background:'#fef2f2', color:'#ef4444', border:'none', borderRadius:'8px', padding:'6px 14px', fontSize:'13px', fontWeight:'700', cursor:'pointer', fontFamily:'Outfit, sans-serif', transition:'all 0.2s' }} className="btn-delete">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Footer */}
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

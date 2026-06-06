import { useState, useEffect, useRef, useMemo } from 'react'
import { useDialog } from '../context/DialogContext'
import { List } from 'react-window'
import { useCache } from '../context/CacheContext'

const EMPTY = {
  company: '', name: '', potency: '', unit: '', type: '',
  low_stock_threshold: 0, gst_rate: 5
}

// Custom Searchable Combobox matching modern green theme
function SearchableCombobox({ value, onChange, options, autoFocus, id, onEnter, placeholder }) {
  const [isOpen, setIsOpen] = useState(false)
  const [filter, setFilter] = useState(value || '')
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  useEffect(() => {
    setFilter(value || '')
  }, [value])

  const filteredOptions = options.filter(opt =>
    (opt || '').toLowerCase().includes(filter.toLowerCase())
  )

  // Show dropdown on focus if there are options
  const shouldShowDropdown = isOpen && filteredOptions.length > 0

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!isOpen) {
        setIsOpen(true)
        setHighlightedIndex(0)
      } else {
        setHighlightedIndex(prev => {
          const nextIndex = prev < filteredOptions.length - 1 ? prev + 1 : prev;
          if (listRef.current) listRef.current.scrollToItem(nextIndex);
          return nextIndex;
        })
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (isOpen) {
        setHighlightedIndex(prev => {
          const nextIndex = prev > 0 ? prev - 1 : 0;
          if (listRef.current) listRef.current.scrollToItem(nextIndex);
          return nextIndex;
        })
      }
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (shouldShowDropdown && highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
        const selected = filteredOptions[highlightedIndex]
        onChange(selected)
        setFilter(selected)
        setIsOpen(false)
      } else {
        if (filteredOptions.length > 0) {
          const selected = filteredOptions[0]
          onChange(selected)
          setFilter(selected)
        } else {
          onChange(filter)
        }
        setIsOpen(false)
      }
      
      if (onEnter) {
        setTimeout(onEnter, 50)
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    } else if (e.key === 'Tab') {
      if (shouldShowDropdown) {
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          const selected = filteredOptions[highlightedIndex]
          onChange(selected)
          setFilter(selected)
        } else if (filteredOptions.length > 0) {
          const selected = filteredOptions[0]
          onChange(selected)
          setFilter(selected)
        } else {
          onChange(filter)
        }
        setIsOpen(false)
      }
    }
  }

  return (
    <div style={{ position: 'relative', display: 'flex', width: '100%' }}>
      <input
        id={id}
        ref={inputRef}
        value={filter}
        autoFocus={autoFocus}
        placeholder={placeholder || "Type to search..."}
        onChange={e => {
          const val = e.target.value
          setFilter(val)
          onChange(val)
          setIsOpen(true)
          setHighlightedIndex(0)
          if (listRef.current) listRef.current.scrollToItem(0);
        }}
        onFocus={(e) => {
          setIsOpen(true)
          setHighlightedIndex(-1)
          e.target.style.borderColor = '#10b981'
          e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)'
        }}
        onBlur={(e) => {
          setTimeout(() => {
            setIsOpen(false)
          }, 200)
          e.target.style.borderColor = '#cbd5e1'
          e.target.style.boxShadow = 'none'
        }}
        onKeyDown={handleKeyDown}
        style={{
          flex: 1,
          padding: '10px 14px',
          border: '1px solid #cbd5e1',
          outline: 'none',
          borderRadius: '8px',
          background: '#fff',
          color: '#0f172a',
          fontSize: '14px',
          fontFamily: 'Outfit, sans-serif',
          height: '42px',
          boxSizing: 'border-box',
          transition: 'all 0.2s'
        }}
      />

      {shouldShowDropdown && (
        <div style={{
          position: 'absolute',
          top: '46px',
          left: 0,
          right: 0,
          zIndex: 9999,
          background: '#fff',
          border: '1px solid #cbd5e1',
          borderRadius: '8px',
          boxSizing: 'border-box',
          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
          animation: 'slideDown 0.2s ease-out',
          maxHeight: '180px',
          overflowY: 'auto'
        }}
        ref={listRef}
        >
          {filteredOptions.map((opt, index) => {
            const isHighlighted = index === highlightedIndex
            return (
              <div
                key={index}
                style={{
                  padding: '10px 14px',
                  background: isHighlighted ? '#f0fdf4' : '#fff',
                  color: isHighlighted ? '#16a34a' : '#1e293b',
                  fontWeight: isHighlighted ? '600' : '500',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontFamily: 'Outfit, sans-serif',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  borderLeft: isHighlighted ? '3px solid #16a34a' : '3px solid transparent',
                  boxSizing: 'border-box',
                  height: '38px',
                  display: 'flex',
                  alignItems: 'center'
                }}
                onMouseDown={(e) => {
                  e.preventDefault(); // Prevent input blur before click
                  onChange(opt)
                  setFilter(opt)
                  setIsOpen(false)
                }}
                onMouseEnter={() => setHighlightedIndex(index)}
              >
                {opt}
              </div>
            )
          })}
        </div>
      )}
      <style>{`
        @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  )
}

// Modern Premium Theme Modal Frame
function Modal({ title, onClose, children }) {
  useEffect(() => {
    // Prevent background scrolling
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; }
  }, []);

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div style={{
        background: '#ffffff', 
        borderRadius: '16px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        width: '580px', 
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: 'Outfit, sans-serif',
        animation: 'slideUp 0.3s ease-out'
      }}>
        {/* Title Bar */}
        <div style={{
          background: '#f8fafc',
          padding: '20px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #e2e8f0',
        }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0f172a', letterSpacing: '-0.02em' }}>
            {title}
          </h2>
          <button 
            onClick={onClose} 
            style={{ 
              background: '#f1f5f9', 
              border: 'none', 
              fontSize: '18px', 
              cursor: 'pointer', 
              color: '#64748b',
              width: '32px', height: '32px',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = '#0f172a'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#64748b'; }}
          >
            ✕
          </button>
        </div>
        
        {/* Client Area */}
        <div style={{ padding: '28px', overflowY: 'auto' }}>
          {children}
        </div>
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  )
}

export default function Medicines() {
  const {
    medicines,
    suppliers,
    companies,
    categories,
    powers,
    packings,
    hsnSacList,
    refreshMedicines
  } = useCache()

  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [page, setPage] = useState(1)
  const ITEMS_PER_PAGE = 50
  const { showAlert, showConfirm, showToast } = useDialog()

  const lbl = { fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px', display: 'block', letterSpacing: '0.01em' }
  const inp = { padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', fontFamily: 'Outfit, sans-serif', background: '#fff', width: '100%', boxSizing: 'border-box', outline: 'none', height: '42px', color: '#0f172a' }

  // Filter medicines locally (instant client-side search)
  const filteredMeds = useMemo(() => {
    const trimmed = search.trim();
    if (!trimmed) return medicines;
    const terms = trimmed.toLowerCase().split(/\s+/);
    return medicines.filter(m => {
      return terms.every(term => 
        (m.nameLower || '').includes(term) || 
        (m.companyLower || '').includes(term)
      );
    });
  }, [medicines, search]);

  const totalMedicines = filteredMeds.length;
  const paginatedMeds = filteredMeds.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const packingNames = (packings || []).map(p => p.name);

  // Auto-fill HSN and GST based on selected Category/Type
  useEffect(() => {
    if (form.type && categories.length > 0 && hsnSacList.length > 0) {
      const cat = categories.find(c => c.name === form.type)
      if (cat) {
        const hsn = hsnSacList.find(h => String(h.short_name) === String(cat.id))
        if (hsn) {
          setForm(f => ({ ...f, hsn_code: hsn.hsn_code, gst_rate: hsn.igst }))
        } else {
          setForm(f => ({ ...f, hsn_code: 'Not Mapped', gst_rate: 0 }))
        }
      }
    }
  }, [form.type, categories, hsnSacList])

  function openAdd() { setForm(EMPTY); setEditing(null); setShowModal(true) }
  function openEdit(m) { setForm({ ...m, type: m.category || '', gst_rate: m.gst_rate !== undefined ? m.gst_rate : 5 }); setEditing(m.id); setShowModal(true) }
  
  async function handleSave() {
    if (!form.company || !form.company.trim()) {
      return showAlert('Validation Error', "Company Name is required")
    }
    
    // Verify that the typed company name is registered in the database
    const companyExists = companies.some(c => 
      (c.name || '').trim().toLowerCase() === form.company.trim().toLowerCase()
    )
    if (!companyExists) {
      return showAlert('Company Not Found', `Company "${form.company}" is not registered. Please create the company in the Company Master first.`)
    }

    if (!form.name || !form.name.trim()) return showAlert('Validation Error', "Medicine Name is required")

    // Format Medicine Name to Title/Sentence Case (e.g. "ARNICA MONTANA" -> "Arnica Montana")
    const formattedName = form.name
      .trim()
      .split(' ')
      .map(word => word ? word.charAt(0).toUpperCase() + word.toLowerCase().slice(1) : '')
      .join(' ')

    const data = {
      ...form,
      name: formattedName,
      selling_price: parseFloat(form.selling_price) || 0,
      low_stock_threshold: parseInt(form.low_stock_threshold) || 0,
      purchase_price: form.purchase_price || 0,
      stock_quantity: form.stock_quantity || 0,
      category: form.type || '', 
      expiry_date: form.expiry_date || null,
      supplier_id: form.supplier_id || null,
      gst_rate: form.gst_rate !== undefined ? parseFloat(form.gst_rate) : 5
    }
    if (editing) {
      await window.api.updateMedicine({ ...data, id: editing })
      showToast("Medicine updated successfully!")
    } else {
      await window.api.addMedicine(data)
      showToast("Medicine added successfully!")
    }
    setShowModal(false)
    refreshMedicines()
  }

  async function handleDelete(id) {
    console.log("Delete triggered for:", id)
    showConfirm('Delete Medicine', 'Are you sure you want to delete this medicine?', async () => {
      await window.api.deleteMedicine(id)
      refreshMedicines()
    })
  }

  const totalPages = Math.ceil(totalMedicines / ITEMS_PER_PAGE)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%' }}>

      {/* Header Area */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0', letterSpacing: '-0.02em' }}>Medicines Directory</h1>
          <p style={{ fontSize: '14px', color: '#64748b', margin: 0, fontWeight: '500' }}>
            <span style={{ color: '#10b981', fontWeight: '700' }}>{totalMedicines}</span> items in your inventory
          </p>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <svg style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input
              placeholder="Search by name or company..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              style={{
                padding: '10px 16px 10px 40px', borderRadius: '10px', border: '1px solid #cbd5e1',
                fontSize: '14px', fontFamily: 'Outfit, sans-serif', outline: 'none',
                background: '#ffffff', width: '320px', color: '#0f172a',
                transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}
              onFocus={e => { e.target.style.borderColor = '#10b981'; e.target.style.boxShadow = '0 0 0 4px rgba(16, 185, 129, 0.1)'; }}
              onBlur={e => { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)'; }}
            />
          </div>
          <button onClick={openAdd} style={{
            background: '#10b981', color: '#fff', border: 'none', borderRadius: '10px',
            padding: '10px 24px', fontSize: '14px', fontWeight: '700',
            fontFamily: 'Outfit, sans-serif', cursor: 'pointer',
            boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2), 0 2px 4px -1px rgba(16, 185, 129, 0.1)',
            transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px'
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 8px -1px rgba(16, 185, 129, 0.3)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(16, 185, 129, 0.2)'; }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Add Medicine
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div style={{ background: '#ffffff', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)', overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, border: '1px solid #f1f5f9' }}>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 10 }}>
              <tr>
                {['Name', 'Company', 'Category', 'Potency', 'Size', 'Stock', 'HSN', 'GST', 'Actions'].map((h, idx) => (
                  <th key={h} style={{ padding: '16px 24px', textAlign: idx === 5 || idx === 7 ? 'center' : 'left', fontWeight: '700', color: '#64748b', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedMeds.length === 0 ? (
                <tr><td colSpan={9} style={{ padding: '48px', textAlign: 'center', color: '#94a3b8', fontSize: '15px' }}>No medicines found</td></tr>
              ) : paginatedMeds.map(m => {
                const isOutOfStock = m.stock_quantity === 0;
                const isLowStock = !isOutOfStock && m.stock_quantity <= m.low_stock_threshold;
                
                let badgeBg = '#ecfdf5', badgeColor = '#059669'; // Normal
                if (isOutOfStock) { badgeBg = '#fef2f2'; badgeColor = '#dc2626'; }
                else if (isLowStock) { badgeBg = '#fffbeb'; badgeColor = '#d97706'; }

                return (
                  <tr key={m.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '16px 24px', fontWeight: '600', color: '#0f172a' }}>{m.name}</td>
                    <td style={{ padding: '16px 24px', color: '#475569', fontWeight: '500' }}>{m.company || '—'}</td>
                    <td style={{ padding: '16px 24px', color: '#475569' }}>{m.category || '—'}</td>
                    <td style={{ padding: '16px 24px', color: '#475569' }}>{m.potency || 'Nil'}</td>
                    <td style={{ padding: '16px 24px', color: '#475569' }}>{m.unit || '—'}</td>
                    <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                      <span style={{
                        background: badgeBg,
                        color: badgeColor,
                        padding: '4px 12px', borderRadius: '20px', fontWeight: '700', fontSize: '12px',
                        display: 'inline-block', minWidth: '32px'
                      }}>{m.stock_quantity}</span>
                    </td>
                    <td style={{ padding: '16px 24px', color: '#475569', fontWeight: '500' }}>{m.hsn_code || '—'}</td>
                    <td style={{ padding: '16px 24px', color: '#475569', textAlign: 'center', fontWeight: '500' }}>{m.gst_rate !== undefined ? `${m.gst_rate}%` : '5%'}</td>
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => openEdit(m)} style={{
                          background: '#f1f5f9', color: '#3b82f6', border: 'none', borderRadius: '8px',
                          padding: '6px 14px', fontSize: '13px', cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontWeight: '600',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#e0e7ff'; e.currentTarget.style.color = '#4f46e5'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#3b82f6'; }}
                        >Edit</button>
                        <button onClick={() => handleDelete(m.id)} style={{
                          background: '#fef2f2', color: '#ef4444', border: 'none', borderRadius: '8px',
                          padding: '6px 14px', fontSize: '13px', cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontWeight: '600',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#dc2626'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#ef4444'; }}
                        >Delete</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '16px 24px', borderTop: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>
              Showing <span style={{ color: '#0f172a', fontWeight: '700' }}>{(page - 1) * ITEMS_PER_PAGE + 1}</span> to <span style={{ color: '#0f172a', fontWeight: '700' }}>{Math.min(page * ITEMS_PER_PAGE, totalMedicines)}</span> of <span style={{ color: '#0f172a', fontWeight: '700' }}>{totalMedicines}</span> entries
            </span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button 
                disabled={page === 1} 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                style={{
                  padding: '6px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', background: page === 1 ? '#f1f5f9' : '#fff', 
                  color: page === 1 ? '#94a3b8' : '#334155', cursor: page === 1 ? 'not-allowed' : 'pointer', fontSize: '13px', fontFamily: 'Outfit, sans-serif', fontWeight: '600',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => { if (page !== 1) e.currentTarget.style.background = '#f8fafc'; }}
                onMouseLeave={e => { if (page !== 1) e.currentTarget.style.background = '#fff'; }}
                >
                Previous
              </button>
              <span style={{ padding: '0 8px', fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>Page {page} of {totalPages}</span>
              <button 
                disabled={page === totalPages} 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                style={{
                  padding: '6px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', background: page === totalPages ? '#f1f5f9' : '#fff', 
                  color: page === totalPages ? '#94a3b8' : '#334155', cursor: page === totalPages ? 'not-allowed' : 'pointer', fontSize: '13px', fontFamily: 'Outfit, sans-serif', fontWeight: '600',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => { if (page !== totalPages) e.currentTarget.style.background = '#f8fafc'; }}
                onMouseLeave={e => { if (page !== totalPages) e.currentTarget.style.background = '#fff'; }}
                >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <Modal title={editing ? 'Modify Medicine' : 'Add New Medicine'} onClose={() => setShowModal(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Row 1: Company */}
            <div>
              <label style={lbl}>Company</label>
              <SearchableCombobox
                id="medicine-company-input"
                value={form.company || ''}
                onChange={val => setForm({ ...form, company: val })}
                options={companies.map(c => c.name)}
                placeholder="Type to search company..."
                autoFocus
                onEnter={() => document.getElementById('medicine-name-input')?.focus()}
              />
            </div>

            {/* Row 2: Medicine Name */}
            <div>
              <label style={lbl}>Medicine Name *</label>
              <input
                id="medicine-name-input"
                value={form.name || ''}
                onChange={e => setForm({ ...form, name: e.target.value })}
                onKeyDown={e => {
                  if (e.key === 'Enter') document.getElementById('medicine-type-input')?.focus()
                }}
                style={{...inp, transition: 'all 0.2s'}}
                onFocus={e => { e.target.style.borderColor = '#10b981'; e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)'; }}
                onBlur={e => { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'none'; }}
                placeholder="Enter medicine name..."
              />
            </div>

            {/* Row 3: Type */}
            <div>
              <label style={lbl}>Category</label>
              <SearchableCombobox
                id="medicine-type-input"
                value={form.type || ''}
                onChange={val => setForm({ ...form, type: val })}
                options={categories.map(c => c.name)}
                placeholder="Select or type category..."
                onEnter={() => document.getElementById('medicine-power-input')?.focus()}
              />
            </div>

            {/* Row 3: Power & Packing */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <label style={lbl}>Power</label>
                <SearchableCombobox
                  id="medicine-power-input"
                  value={form.potency || ''}
                  onChange={val => setForm({ ...form, potency: val })}
                  options={powers.map(p => p.name)}
                  placeholder="Select or type power..."
                  onEnter={() => document.getElementById('medicine-packing-input')?.focus()}
                />
              </div>
              
              <div>
                <label style={lbl}>Packing</label>
                <SearchableCombobox
                  id="medicine-packing-input"
                  value={form.unit || ''}
                  onChange={val => setForm({ ...form, unit: val })}
                  options={packingNames}
                  placeholder="Select or type packing..."
                  onEnter={() => document.getElementById('medicine-reorder-input')?.focus()}
                />
              </div>
            </div>

            {/* Row 4: HSN & GST Rate */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <label style={lbl}>HSN/SAC Code</label>
                <input
                  value={form.hsn_code || ''}
                  readOnly
                  disabled
                  style={{ ...inp, background: '#f8fafc', color: '#94a3b8', cursor: 'not-allowed', borderColor: '#e2e8f0' }}
                />
              </div>

              <div>
                <label style={lbl}>GST Percentage (%)</label>
                <input
                  value={form.gst_rate !== undefined && form.type ? `${form.gst_rate}%` : ''}
                  readOnly
                  disabled
                  style={{ ...inp, background: '#f8fafc', color: '#94a3b8', cursor: 'not-allowed', borderColor: '#e2e8f0' }}
                />
              </div>
            </div>

            {/* Row 5: Reorder Level */}
            <div>
              <label style={lbl}>Low Stock Warning Level</label>
              <input
                id="medicine-reorder-input"
                type="number"
                value={form.low_stock_threshold}
                onChange={e => setForm({ ...form, low_stock_threshold: e.target.value })}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    document.getElementById('medicine-save-btn')?.focus()
                  }
                }}
                style={{...inp, transition: 'all 0.2s'}}
                onFocus={e => { e.target.style.borderColor = '#10b981'; e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)'; }}
                onBlur={e => { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'none'; }}
              />
            </div>
          </div>
          
          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '28px', borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
            <button 
              onClick={() => setShowModal(false)} 
              style={{ 
                padding: '10px 24px', 
                borderRadius: '10px', 
                border: '1px solid #cbd5e1', 
                background: '#ffffff', 
                cursor: 'pointer', 
                fontFamily: 'Outfit, sans-serif', 
                fontWeight: '600', 
                fontSize: '14px',
                color: '#475569',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#ffffff'; }}
            >
              Cancel
            </button>
            <button 
              id="medicine-save-btn"
              onClick={handleSave} 
              style={{ 
                padding: '10px 32px', 
                borderRadius: '10px', 
                border: 'none', 
                background: '#10b981', 
                color: '#fff', 
                fontWeight: '700', 
                cursor: 'pointer', 
                fontFamily: 'Outfit, sans-serif', 
                fontSize: '14px',
                boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2), 0 2px 4px -1px rgba(16, 185, 129, 0.1)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 8px -1px rgba(16, 185, 129, 0.3)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(16, 185, 129, 0.2)'; }}
            >
              {editing ? 'Save Changes' : 'Add Medicine'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
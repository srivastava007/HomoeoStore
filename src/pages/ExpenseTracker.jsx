import { useState, useEffect } from 'react'
import DateInput from '../components/DateInput'
import Select from 'react-select'
import { useDialog } from '../context/DialogContext'

const inputStyle = {
  padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1',
  fontSize: '15px', fontFamily: 'Outfit, sans-serif', outline: 'none',
  background: '#fff', width: '100%', boxSizing: 'border-box',
  transition: 'all 0.2s ease', color: '#1e293b'
}

const selectStyles = (borderColor, focusColor) => ({
  control: (base, state) => ({
    ...base,
    borderRadius: '8px',
    padding: '2px 4px',
    borderColor: state.isFocused ? focusColor : borderColor,
    boxShadow: state.isFocused ? `0 0 0 1px ${focusColor}` : 'none',
    fontSize: '15px',
    fontFamily: 'Outfit, sans-serif',
    cursor: 'pointer',
    background: '#fff',
    '&:hover': { borderColor: focusColor }
  }),
  option: (base, state) => ({
    ...base,
    fontSize: '15px',
    fontFamily: 'Outfit, sans-serif',
    backgroundColor: state.isSelected ? focusColor : state.isFocused ? '#f1f5f9' : 'white',
    color: state.isSelected ? 'white' : '#1e293b',
    cursor: 'pointer'
  }),
  singleValue: (base) => ({
    ...base,
    color: '#1e293b',
    fontFamily: 'Outfit, sans-serif'
  }),
  placeholder: (base) => ({
    ...base,
    color: '#94a3b8',
    fontFamily: 'Outfit, sans-serif'
  }),
  menuPortal: base => ({ ...base, zIndex: 9999 })
})

function Field({ label, children, required }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label} {required && <span style={{color: '#ef4444'}}>*</span>}
      </label>
      {children}
    </div>
  )
}

export default function ExpenseTracker() {
  const [ledgers, setLedgers] = useState([])
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(false)
  const { showToast } = useDialog()
  
  // Quick Add Modal state
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [addingCategory, setAddingCategory] = useState(false)

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    expenseLedgerId: '',
    cashBankLedgerId: '',
    amount: '',
    particulars: ''
  })

  async function loadData() {
    try {
      const ledgerData = await window.api.getLedgers()
      setLedgers(ledgerData)

      // Auto prefill Cash account as default payment mode if exists
      const cashAcct = ledgerData.find(l => l.ledger_name === 'CASH' || l.account_group === 'CASH IN HAND')
      if (cashAcct) {
        setForm(f => ({ ...f, cashBankLedgerId: cashAcct.id.toString() }))
      }

      const expenseList = await window.api.getRecentExpenses()
      setExpenses(expenseList || [])
    } catch (e) {
      console.error(e)
      showToast('Error loading data', 'error')
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const isCashOrBank = (l) => l.account_group === 'BANK ACCOUNTS' || l.account_group === 'CASH IN HAND' || l.ledger_name === 'CASH'
  const isExpense = (l) => l.account_group === 'DIRECT EXPENSES' || l.account_group === 'INDIRECT EXPENSES'

  const cashBankOptions = ledgers.filter(isCashOrBank)
  const expenseOptions = ledgers.filter(isExpense)

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.expenseLedgerId) return showToast('Please select an Expense Category', 'error')
    if (!form.cashBankLedgerId) return showToast('Please select a Paid From account', 'error')
    
    const amt = parseFloat(form.amount)
    if (!amt || amt <= 0) return showToast('Please enter a valid amount', 'error')

    setLoading(true)
    try {
      const data = {
        date: form.date,
        voucher_type: 'Payment',
        debit_ledger_id: parseInt(form.expenseLedgerId),
        credit_ledger_id: parseInt(form.cashBankLedgerId),
        amount: amt,
        particulars: form.particulars
      }
      
      const res = await window.api.addVoucher(data)
      if (res.success) {
        showToast(`Expense recorded successfully! (Voucher: ${res.voucher_no})`, 'success')
        
        // Reset form amount & particulars
        setForm(f => ({ ...f, amount: '', particulars: '', expenseLedgerId: '' }))
        
        // Reload list
        const expenseList = await window.api.getRecentExpenses()
        setExpenses(expenseList || [])
      }
    } catch (err) {
      showToast(err.message || 'Error saving expense', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleQuickAddCategory = async (e) => {
    e.preventDefault()
    if (addingCategory) return
    const trimmed = newCategoryName.trim()
    if (!trimmed) return showToast('Category name cannot be empty', 'error')
    
    // Check if category already exists
    const duplicate = ledgers.find(l => (l.ledger_name || '').trim().toLowerCase() === trimmed.toLowerCase())
    if (duplicate) return showToast('This category already exists', 'error')

    setAddingCategory(true)
    try {
      const ledgerData = {
        ledger_name: trimmed.toUpperCase(),
        account_group: 'INDIRECT EXPENSES',
        opening_balance: 0,
        dr_cr: 'Dr',
        ledger_category: 'Expense',
        ledger_type: 'Regular'
      }

      const res = await window.api.addLedger(ledgerData)
      if (res && (res.success || res.id)) {
        showToast('Expense Category added successfully!', 'success')
        setNewCategoryName('')
        setShowAddCategory(false)
        
        // Reload ledgers & set newly created category as active selection
        const refreshedLedgers = await window.api.getLedgers()
        setLedgers(refreshedLedgers)
        
        if (res.id) {
          setForm(f => ({ ...f, expenseLedgerId: res.id.toString() }))
        } else {
          // If insertRowid is not directly returned, find by name
          const created = refreshedLedgers.find(l => (l.ledger_name || '').trim().toUpperCase() === ledgerData.ledger_name)
          if (created) {
            setForm(f => ({ ...f, expenseLedgerId: created.id.toString() }))
          }
        }
      }
    } catch (err) {
      showToast(err.message || 'Failed to create category', 'error')
    } finally {
      setAddingCategory(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%', fontFamily: 'Outfit, sans-serif' }}>
      
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#ea580c', margin: '0 0 4px 0', letterSpacing: '-0.5px' }}>Expense Tracker</h1>
        <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>Record and track day-to-day shop expenditures and overheads</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '24px', alignItems: 'flex-start' }}>
        
        {/* Expense Entry Card */}
        <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', padding: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b', margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>💸</span> New Expense Entry
          </h2>
          
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <Field label="Date" required>
              <DateInput name="date" value={form.date} onChange={handleChange} style={inputStyle} />
            </Field>

            <Field label="Expense Category" required>
              <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                <div style={{ flex: 1 }}>
                  <Select
                    value={form.expenseLedgerId ? { value: form.expenseLedgerId, label: expenseOptions.find(o => o.id.toString() === form.expenseLedgerId.toString())?.ledger_name || '' } : null}
                    onChange={selectedOption => setForm(f => ({ ...f, expenseLedgerId: selectedOption ? selectedOption.value.toString() : '' }))}
                    options={expenseOptions.map(l => ({ value: l.id, label: l.ledger_name }))}
                    placeholder="Select category..."
                    styles={selectStyles('#ffedd5', '#ea580c')}
                    menuPortalTarget={document.body}
                    menuPosition="fixed"
                  />
                </div>
                <button 
                  type="button" 
                  onClick={() => setShowAddCategory(true)}
                  style={{
                    background: '#fff7ed', color: '#ea580c', border: '1px solid #ffedd5', borderRadius: '8px',
                    padding: '0 12px', fontSize: '16px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s'
                  }}
                  title="Add new category"
                >
                  ➕
                </button>
              </div>
            </Field>

            <Field label="Paid From" required>
              <Select
                value={form.cashBankLedgerId ? { value: form.cashBankLedgerId, label: cashBankOptions.find(o => o.id.toString() === form.cashBankLedgerId.toString())?.ledger_name || '' } : null}
                onChange={selectedOption => setForm(f => ({ ...f, cashBankLedgerId: selectedOption ? selectedOption.value.toString() : '' }))}
                options={cashBankOptions.map(l => ({ value: l.id, label: l.ledger_name }))}
                placeholder="Select cash/bank account..."
                styles={selectStyles('#e2e8f0', '#475569')}
                menuPortalTarget={document.body}
                menuPosition="fixed"
              />
            </Field>

            <Field label="Amount (₹)" required>
              <input 
                type="number" 
                step="0.01" 
                name="amount" 
                value={form.amount} 
                onChange={handleChange} 
                style={{...inputStyle, fontSize: '20px', fontWeight: '700', color: '#ea580c'}} 
                placeholder="0.00" 
                required
              />
            </Field>

            <Field label="Description / Particulars">
              <input 
                name="particulars" 
                value={form.particulars} 
                onChange={handleChange} 
                style={inputStyle} 
                placeholder="e.g. Paid tea expenses for staff" 
              />
            </Field>

            <button 
              type="submit" 
              disabled={loading}
              style={{
                background: '#ea580c', color: '#fff', border: 'none', borderRadius: '8px',
                padding: '14px', fontSize: '15px', fontWeight: '700', cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(234, 88, 12, 0.25)', transition: 'all 0.2s', marginTop: '10px'
              }}
            >
              {loading ? 'Saving...' : '💾 Save Expense'}
            </button>
          </form>
        </div>

        {/* Recent Expenses List */}
        <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📋</span> Recent Expenses
          </h2>

          <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 16px', fontWeight: '700', color: '#475569' }}>Date</th>
                  <th style={{ padding: '12px 16px', fontWeight: '700', color: '#475569' }}>Category</th>
                  <th style={{ padding: '12px 16px', fontWeight: '700', color: '#475569' }}>Paid From</th>
                  <th style={{ padding: '12px 16px', fontWeight: '700', color: '#475569' }}>Narration</th>
                  <th style={{ padding: '12px 16px', fontWeight: '700', color: '#475569', textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ padding: '32px 16px', textAlign: 'center', color: '#94a3b8' }}>
                      No expenses recorded yet.
                    </td>
                  </tr>
                ) : (
                  expenses.map(e => (
                    <tr key={e.id} style={{ borderBottom: '1px solid #f1f5f9', hover: { background: '#f8fafc' } }}>
                      <td style={{ padding: '12px 16px', color: '#64748b' }}>{new Date(e.date).toLocaleDateString('en-IN')}</td>
                      <td style={{ padding: '12px 16px', fontWeight: '600', color: '#334155' }}>{e.expense_category}</td>
                      <td style={{ padding: '12px 16px', color: '#64748b' }}><span style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: '600' }}>{e.paid_from}</span></td>
                      <td style={{ padding: '12px 16px', color: '#64748b', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={e.particulars}>{e.particulars || '-'}</td>
                      <td style={{ padding: '12px 16px', fontWeight: '700', color: '#ea580c', textAlign: 'right' }}>₹ {parseFloat(e.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Quick Add Category Modal */}
      {showAddCategory && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.3)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100000 }}>
          <div style={{ background: '#fff', padding: '32px', borderRadius: '16px', border: '1px solid #e2e8f0', width: '400px', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b', margin: '0 0 4px 0' }}>Add Expense Category</h3>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Create a new expense ledger account</p>
            </div>
            
            <form onSubmit={handleQuickAddCategory} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <Field label="Category Name" required>
                <input 
                  type="text" 
                  value={newCategoryName} 
                  onChange={e => setNewCategoryName(e.target.value)} 
                  placeholder="e.g. SHOP RENT, SALARIES" 
                  style={{ ...inputStyle, opacity: addingCategory ? 0.7 : 1 }}
                  autoFocus
                  required
                  disabled={addingCategory}
                />
              </Field>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button 
                  type="button" 
                  onClick={() => { setShowAddCategory(false); setNewCategoryName(''); }}
                  disabled={addingCategory}
                  style={{
                    background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px',
                    padding: '10px 20px', fontSize: '14px', fontWeight: '600', cursor: addingCategory ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s', opacity: addingCategory ? 0.6 : 1
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={addingCategory}
                  style={{
                    background: '#ea580c', color: '#fff', border: 'none', borderRadius: '8px',
                    padding: '10px 20px', fontSize: '14px', fontWeight: '600', cursor: addingCategory ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 10px rgba(234, 88, 12, 0.15)', transition: 'all 0.2s',
                    opacity: addingCategory ? 0.7 : 1
                  }}
                >
                  {addingCategory ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        button:hover { transform: translateY(-1px); }
        button:active { transform: translateY(0); }
        input:focus { border-color: #ea580c !important; box-shadow: 0 0 0 3px #ffedd5 !important; }
      `}</style>

    </div>
  )
}

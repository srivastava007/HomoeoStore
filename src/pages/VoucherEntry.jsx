import { useState, useEffect } from 'react'
import DateInput from '../components/DateInput'
import Select from 'react-select'

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

export default function VoucherEntry() {
  const [type, setType] = useState('Payment')
  const [ledgers, setLedgers] = useState([])
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' })
  
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    debitLedgerId: '',
    creditLedgerId: '',
    amount: '',
    particulars: ''
  })

  function showToast(msg, t = 'success') {
    setToast({ show: true, msg, type: t })
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000)
  }

  async function load() {
    const data = await window.api.getLedgers()
    setLedgers(data)

    const prefillId = sessionStorage.getItem('prefill_voucher_ledger')
    if (prefillId) {
      sessionStorage.removeItem('prefill_voucher_ledger')
      const ledger = data.find(l => l.id.toString() === prefillId)
      if (ledger) {
        let t = 'Payment'
        if (ledger.current_balance_raw > 0) {
          t = 'Receipt'
        } else if (ledger.current_balance_raw < 0) {
          t = 'Payment'
        } else if (ledger.account_group === 'SUNDRY DEBTORS' || (ledger.account_group !== 'SUNDRY CREDITORS' && ledger.dr_cr === 'Dr')) {
          t = 'Receipt'
        }
        setType(t)
        // Wait for type state to trigger the clear effect, then set the prefilled value
        setTimeout(() => {
          setForm(f => ({
            ...f,
            debitLedgerId: t === 'Payment' ? prefillId : '',
            creditLedgerId: t === 'Receipt' ? prefillId : ''
          }))
        }, 50)
      }
    }
  }

  useEffect(() => { load() }, [])

  // Reset form when type changes
  useEffect(() => {
    setForm({
      date: new Date().toISOString().split('T')[0],
      debitLedgerId: '',
      creditLedgerId: '',
      amount: '',
      particulars: ''
    })
  }, [type])

  const isCashOrBank = (l) => l.account_group === 'BANK ACCOUNTS' || l.account_group === 'CASH IN HAND' || l.ledger_name === 'CASH'
  
  let debitOptions = []
  let creditOptions = []

  if (type === 'Payment') {
    creditOptions = ledgers.filter(isCashOrBank)
    debitOptions = ledgers.filter(l => !isCashOrBank(l))
  } else if (type === 'Receipt') {
    debitOptions = ledgers.filter(isCashOrBank)
    creditOptions = ledgers.filter(l => !isCashOrBank(l))
  } else if (type === 'Contra') {
    debitOptions = ledgers.filter(isCashOrBank)
    creditOptions = ledgers.filter(isCashOrBank)
  }

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.debitLedgerId) return showToast('Please select a Debit Account', 'error')
    if (!form.creditLedgerId) return showToast('Please select a Credit Account', 'error')
    if (form.debitLedgerId === form.creditLedgerId) return showToast('Debit and Credit accounts cannot be the same', 'error')
    
    const amt = parseFloat(form.amount)
    if (!amt || amt <= 0) return showToast('Please enter a valid amount', 'error')

    try {
      const data = {
        date: form.date,
        voucher_type: type,
        debit_ledger_id: parseInt(form.debitLedgerId),
        credit_ledger_id: parseInt(form.creditLedgerId),
        amount: amt,
        particulars: form.particulars
      }
      const res = await window.api.addVoucher(data)
      if (res.success) {
        showToast(`${type} saved successfully! (Voucher No: ${res.voucher_no})`)
        setForm(f => ({ ...f, amount: '', particulars: '', debitLedgerId: '', creditLedgerId: '' }))
        load() // Refresh balances
      }
    } catch (err) {
      showToast(err.message || 'Error saving voucher', 'error')
    }
  }

  // Find balances to display next to selects
  const getBal = (id) => {
    if (!id) return ''
    const l = ledgers.find(x => x.id === parseInt(id))
    if (!l) return ''
    return ` (Bal: ₹ ${parseFloat(l.current_balance).toLocaleString('en-IN', {minimumFractionDigits: 2})} ${l.current_balance_type})`
  }

  const themeColor = type === 'Payment' ? '#ef4444' : type === 'Receipt' ? '#10b981' : '#3b82f6'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%', fontFamily: 'Outfit, sans-serif' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: themeColor, margin: '0 0 4px 0', letterSpacing: '-0.5px' }}>{type} Entry</h1>
          <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>Create a new double-entry {type.toLowerCase()} voucher</p>
        </div>

        {/* Type Selector Tabs */}
        <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '12px', gap: '4px' }}>
          {['Payment', 'Receipt', 'Contra'].map(t => {
            const isActive = type === t
            const tColor = t === 'Payment' ? '#ef4444' : t === 'Receipt' ? '#10b981' : '#3b82f6'
            return (
              <button key={t} onClick={() => setType(t)} style={{
                padding: '10px 24px', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: 'pointer',
                background: isActive ? '#fff' : 'transparent',
                color: isActive ? tColor : '#64748b',
                boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                transition: 'all 0.2s'
              }}>
                {t}
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 30px rgba(0,0,0,0.03)', flex: 1 }}>
        <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '24px', background: '#f8fafc', borderTopLeftRadius: '16px', borderTopRightRadius: '16px' }}>
          <div style={{ flex: 1 }}>
            <Field label="Voucher Date" required>
              <DateInput  name="date" value={form.date} onChange={handleChange} style={inputStyle} />
            </Field>
          </div>
          <div style={{ flex: 1 }}>
            <Field label="Voucher No">
              <input value="Auto Generated" readOnly style={{...inputStyle, background: '#f1f5f9', color: '#94a3b8', cursor: 'not-allowed'}} />
            </Field>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '24px', background: '#f0fdfa', borderRadius: '12px', border: '1px solid #ccfbf1' }}>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f766e', display: 'flex', justifyContent: 'space-between' }}>
                <span>DEBIT (Dr)</span>
                <span>{getBal(form.debitLedgerId)}</span>
              </div>
              <Field label={`Receiver Account`} required>
                <Select
                  value={form.debitLedgerId ? { value: form.debitLedgerId, label: debitOptions.find(o => o.id.toString() === form.debitLedgerId.toString())?.ledger_name || '' } : null}
                  onChange={selectedOption => setForm(f => ({ ...f, debitLedgerId: selectedOption ? selectedOption.value : '' }))}
                  options={debitOptions.map(l => ({ value: l.id, label: l.ledger_name }))}
                  placeholder="-- Select Debit Account --"
                  styles={selectStyles('#99f6e4', '#0f766e')}
                  menuPortalTarget={document.body}
                  menuPosition="fixed"
                />
              </Field>
              <div style={{ fontSize: '12px', color: '#0f766e' }}>{type === 'Payment' ? 'Select the party or expense account.' : 'Select the cash or bank account receiving funds.'}</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '24px', background: '#fff1f2', borderRadius: '12px', border: '1px solid #ffe4e6' }}>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#be123c', display: 'flex', justifyContent: 'space-between' }}>
                <span>CREDIT (Cr)</span>
                <span>{getBal(form.creditLedgerId)}</span>
              </div>
              <Field label={`Giver Account`} required>
                <Select
                  value={form.creditLedgerId ? { value: form.creditLedgerId, label: creditOptions.find(o => o.id.toString() === form.creditLedgerId.toString())?.ledger_name || '' } : null}
                  onChange={selectedOption => setForm(f => ({ ...f, creditLedgerId: selectedOption ? selectedOption.value : '' }))}
                  options={creditOptions.map(l => ({ value: l.id, label: l.ledger_name }))}
                  placeholder="-- Select Credit Account --"
                  styles={selectStyles('#fecdd3', '#be123c')}
                  menuPortalTarget={document.body}
                  menuPosition="fixed"
                />
              </Field>
              <div style={{ fontSize: '12px', color: '#be123c' }}>{type === 'Payment' ? 'Select your cash or bank account paying out.' : 'Select the party or income account.'}</div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #e2e8f0', margin: '8px 0' }}></div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', alignItems: 'flex-start' }}>
            <Field label="Amount (₹)" required>
              <input type="number" step="0.01" name="amount" value={form.amount} onChange={handleChange} style={{...inputStyle, fontSize: '24px', fontWeight: '700', color: themeColor}} placeholder="0.00" />
            </Field>
            
            <Field label="Narration / Particulars">
              <input name="particulars" value={form.particulars} onChange={handleChange} style={inputStyle} placeholder="e.g. Paid by Cheque No. 123456" />
            </Field>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
            <button type="submit" style={{
              background: themeColor, color: '#fff', border: 'none', borderRadius: '8px',
              padding: '14px 32px', fontSize: '16px', fontWeight: '700', cursor: 'pointer',
              boxShadow: `0 4px 12px ${themeColor}40`, transition: 'all 0.2s'
            }}>
              💾 Save {type}
            </button>
          </div>

        </form>
      </div>

      <style>{`
        input:focus, select:focus { border-color: ${themeColor} !important; box-shadow: 0 0 0 3px ${themeColor}20 !important; }
        button:hover { transform: translateY(-2px); }
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

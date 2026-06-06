import React, { useState } from 'react'

export default function PurchaseReturn() {
    const [invoiceNumber, setInvoiceNumber] = useState('')
    const [billData, setBillData] = useState(null)
    const [returnItems, setReturnItems] = useState([])
    const [reason, setReason] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [toast, setToast] = useState({ show: false, msg: '', type: '' })
    const [confirmModal, setConfirmModal] = useState({ show: false, amount: 0, data: null })
    const [view, setView] = useState('new')
    const [history, setHistory] = useState([])

    React.useEffect(() => {
        if (view === 'history') {
            loadHistory()
        }
    }, [view])

    async function loadHistory() {
        try {
            const data = await window.api.getPurchaseReturns()
            setHistory(data)
        } catch (err) {
            console.error(err)
        }
    }

    const showToast = (msg, type = 'success') => {
        setToast({ show: true, msg, type })
        setTimeout(() => setToast({ show: false, msg: '', type: '' }), 3000)
    }

    async function handleSearch(e) {
        e.preventDefault()
        let searchVal = invoiceNumber.trim()
        if (!searchVal) return

        if (/^\d+$/.test(searchVal)) {
            searchVal = searchVal.padStart(4, '0')
            setInvoiceNumber(searchVal)
        }

        setLoading(true)
        setError('')
        try {
            const data = await window.api.getPurchaseBillForReturn(invoiceNumber.trim())
            if (!data) {
                setError('Purchase invoice not found.')
                setBillData(null)
                setReturnItems([])
            } else {
                setBillData(data)
                setReturnItems(data.items.map(item => ({
                    ...item,
                    return_qty: 0,
                    return_amount: 0
                })))
            }
        } catch (err) {
            console.error(err)
            const msg = err.message.includes('fully returned') ? 'This invoice has already been fully returned.' : 'Error fetching invoice details.'
            setError(msg)
        } finally {
            setLoading(false)
        }
    }

    function handleQtyChange(index, qty) {
        const value = parseInt(qty) || 0
        const item = returnItems[index]
        
        if (value < 0) return
        if (value > item.quantity) {
            showToast(`Cannot return more than originally billed (${item.quantity})`, 'error')
            return
        }
        if (value > (item.available_stock || 0)) {
            showToast(`Cannot return ${value}. Only ${item.available_stock || 0} available in stock!`, 'error')
            return
        }

        const newItems = [...returnItems]
        newItems[index].return_qty = value
        newItems[index].return_amount = value * item.purchase_rate
        setReturnItems(newItems)
    }

    async function handleSubmit() {
        const itemsToReturn = returnItems.filter(item => item.return_qty > 0)
        if (itemsToReturn.length === 0) {
            showToast('Please specify return quantity for at least one item.', 'error')
            return
        }

        const totalReturnAmount = itemsToReturn.reduce((sum, item) => sum + item.return_amount, 0)
        
        setConfirmModal({ show: true, amount: totalReturnAmount, itemsToReturn })
    }

    async function executeSubmit() {
        const { amount, itemsToReturn } = confirmModal
        setConfirmModal({ show: false, amount: 0, itemsToReturn: null })
        
        try {
            const returnData = {
                return_number: `DR-${Date.now()}`,
                supplier_id: billData.supplier_id,
                invoice_number: billData.invoice_number,
                total_amount: amount,
                reason: reason || 'Purchase Return',
                items: itemsToReturn.map(item => ({
                    medicine_id: item.medicine_id,
                    batch_number: item.batch_number,
                    batch_id: item.batch_id,
                    quantity: item.return_qty,
                    purchase_rate: item.purchase_rate,
                    total_price: item.return_amount,
                    gst_rate: item.gst_rate
                }))
            }

            await window.api.createPurchaseReturn(returnData)
            showToast('Purchase Return (Debit Note) created successfully! Stock updated.', 'success')
            
            // Reset form
            setInvoiceNumber('')
            setBillData(null)
            setReturnItems([])
            setReason('')
        } catch (err) {
            console.error(err)
            showToast('Failed to save return: ' + err.message, 'error')
        }
    }

    // Modern Styles
    const inputStyle = {
        padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1',
        background: '#f8fafc', fontSize: '14px', fontFamily: 'Outfit, sans-serif',
        color: '#0f172a', transition: 'all 0.2s ease', outline: 'none', width: '100%', boxSizing: 'border-box'
    }
    const sectionStyle = {
        background: '#ffffff', borderRadius: '12px', padding: '20px',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.05)',
        border: '1px solid #f1f5f9'
    }
    const buttonStyle = {
        padding: '10px 20px', borderRadius: '8px', border: 'none',
        background: '#0f2d1f', color: '#fff', fontSize: '14px', fontWeight: '600',
        cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'Outfit, sans-serif',
        boxShadow: '0 4px 6px -1px rgba(15,45,31,0.2)'
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%', position: 'relative', fontFamily: 'Outfit, sans-serif' }}>
            <style>{`
                input:focus {
                    background: #ffffff !important;
                    border-color: #16a34a !important;
                    box-shadow: 0 0 0 4px rgba(22, 163, 74, 0.1) !important;
                }
                .modern-button:hover:not(:disabled) {
                    transform: translateY(-1px);
                    box-shadow: 0 6px 12px -2px rgba(0,0,0,0.15) !important;
                }
                .modern-button:active:not(:disabled) {
                    transform: translateY(0);
                }
                .table-row:hover {
                    background: #f8fafc;
                }
            `}</style>

            {/* Toast Notification */}
            {toast.show && (
                <div style={{
                    position: 'fixed', top: '24px', right: '24px',
                    background: toast.type === 'success' ? '#10b981' : '#ef4444', color: '#fff',
                    padding: '12px 24px', borderRadius: '8px',
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontWeight: '600', fontSize: '14px', zIndex: 99999,
                    display: 'flex', alignItems: 'center', gap: '8px', animation: 'fadeIn 0.3s ease-out'
                }}>
                    {toast.type === 'error' && (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                    )}
                    {toast.msg}
                </div>
            )}

            {/* Confirm Modal */}
            {confirmModal.show && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100000
                }}>
                    <div style={{ background: '#fff', padding: '24px', borderRadius: '8px', width: '320px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                        <h3 style={{ margin: '0 0 12px 0', color: '#0f2d1f', fontSize: '18px' }}>Confirm Purchase Return</h3>
                        <p style={{ margin: '0 0 20px 0', color: '#475569', fontSize: '14px' }}>
                            Are you sure you want to create a Debit Note for <strong>Rs. {confirmModal.amount.toFixed(2)}</strong>?
                        </p>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button onClick={() => setConfirmModal({ show: false, amount: 0, itemsToReturn: null })} style={{ flex: 1, padding: '8px', background: '#e2e8f0', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600', color: '#475569' }}>Cancel</button>
                            <button onClick={executeSubmit} style={{ flex: 1, padding: '8px', background: '#ef4444', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600', color: '#fff' }}>Confirm Return</button>
                        </div>
                    </div>
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0f2d1f' }}>Purchase Return</h1>
                    <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>Return stock to supplier (e.g. damaged, expired).</p>
                </div>
                <div style={{ display: 'flex', gap: '4px', background: '#e2e8f0', padding: '2px', borderRadius: '6px' }}>
                    {['new', 'history'].map(v => (
                        <button key={v} onClick={() => setView(v)} style={{
                            padding: '6px 16px', borderRadius: '4px', border: 'none', cursor: 'pointer',
                            background: view === v ? '#0f2d1f' : 'transparent',
                            color: view === v ? '#fff' : '#475569',
                            fontWeight: '600', fontSize: '13px', transition: 'all 0.2s'
                        }}>
                            {v === 'new' ? 'New Return' : 'History'}
                        </button>
                    ))}
                </div>
            </div>

            {view === 'new' && (
                <>
                    {/* Search Inline Form */}
                    <div style={{ ...sectionStyle, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '16px', background: '#f8fafc', padding: '6px 6px 6px 16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                            <form onSubmit={handleSearch} style={{ display: 'flex', flex: 1, gap: '12px' }}>
                                <input
                                    type="text"
                                    value={invoiceNumber}
                                    onChange={e => setInvoiceNumber(e.target.value)}
                                    placeholder="Enter Supplier Invoice Number (e.g. INV-999)"
                                    style={{ ...inputStyle, border: 'none', background: 'transparent', padding: '8px 12px', fontSize: '15px', boxShadow: 'none' }}
                                    required
                                />
                                <button type="submit" disabled={loading} className="modern-button" style={{ ...buttonStyle, padding: '8px 24px', opacity: loading ? 0.7 : 1 }}>
                                    {loading ? 'Searching...' : 'Search'}
                                </button>
                            </form>
                        </div>
                        {error && <div style={{ color: '#ef4444', fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>{error}</div>}
                    </div>

            {billData && (
                <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', flex: 1, overflowY: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #e2e8f0' }}>
                        <div>
                            <p style={{ fontSize: '13px', color: '#64748b' }}>Supplier</p>
                            <p style={{ fontSize: '16px', fontWeight: '600', color: '#0f2d1f' }}>{billData.supplier_name}</p>
                            <p style={{ fontSize: '13px', color: '#475569' }}>Invoice Date: {billData.invoice_date}</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <p style={{ fontSize: '13px', color: '#64748b' }}>Original Invoice Amount</p>
                            <p style={{ fontSize: '18px', fontWeight: '700', color: '#0284c7' }}>Rs. {billData.total_amount?.toFixed(2)}</p>
                        </div>
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left', marginBottom: '24px' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', color: '#475569' }}>
                                <th style={{ padding: '12px', fontWeight: '600', borderBottom: '2px solid #e2e8f0' }}>Medicine</th>
                                <th style={{ padding: '12px', fontWeight: '600', borderBottom: '2px solid #e2e8f0' }}>Batch</th>
                                <th style={{ padding: '12px', fontWeight: '600', borderBottom: '2px solid #e2e8f0', textAlign: 'center' }}>Purchased Qty</th>
                                <th style={{ padding: '12px', fontWeight: '600', borderBottom: '2px solid #e2e8f0', textAlign: 'center' }}>Available Stock</th>
                                <th style={{ padding: '12px', fontWeight: '600', borderBottom: '2px solid #e2e8f0', textAlign: 'right' }}>Purchase Rate</th>
                                <th style={{ padding: '12px', fontWeight: '600', borderBottom: '2px solid #e2e8f0', textAlign: 'center' }}>Return Qty</th>
                                <th style={{ padding: '12px', fontWeight: '600', borderBottom: '2px solid #e2e8f0', textAlign: 'right' }}>Refund Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {returnItems.map((item, index) => (
                                <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                    <td style={{ padding: '12px', fontWeight: '500' }}>{item.medicine_name} <span style={{ color: '#64748b', fontSize: '11px' }}>{item.potency} {item.unit}</span></td>
                                    <td style={{ padding: '12px' }}>{item.batch_number || '-'}</td>
                                    <td style={{ padding: '12px', textAlign: 'center' }}>{item.quantity}</td>
                                    <td style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: (item.available_stock || 0) < item.quantity ? '#ef4444' : '#10b981' }}>{item.available_stock || 0}</td>
                                    <td style={{ padding: '12px', textAlign: 'right' }}>{item.purchase_rate?.toFixed(2)}</td>
                                    <td style={{ padding: '12px', textAlign: 'center' }}>
                                        <input 
                                            type="number" 
                                            min="0"
                                            max={Math.min(item.quantity, item.available_stock || 0)}
                                            value={item.return_qty === 0 ? '' : item.return_qty}
                                            onChange={e => handleQtyChange(index, e.target.value)}
                                            placeholder="0"
                                            style={{
                                                width: '60px', padding: '6px', textAlign: 'center', borderRadius: '4px',
                                                border: '1px solid #cbd5e1', outline: 'none'
                                            }}
                                        />
                                    </td>
                                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#ef4444' }}>
                                        {item.return_amount > 0 ? `Rs. ${item.return_amount.toFixed(2)}` : '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1, maxWidth: '400px' }}>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>
                                Reason for Return (Optional)
                            </label>
                            <input
                                type="text"
                                value={reason}
                                onChange={e => setReason(e.target.value)}
                                placeholder="e.g., Damaged, Expired, Wrong item"
                                style={{
                                    width: '100%', padding: '10px 12px', borderRadius: '8px',
                                    border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none'
                                }}
                            />
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '8px' }}>Total Debit Amount</p>
                            <p style={{ fontSize: '24px', fontWeight: '700', color: '#ef4444', marginBottom: '16px' }}>
                                Rs. {returnItems.reduce((s, i) => s + i.return_amount, 0).toFixed(2)}
                            </p>
                            <button 
                                onClick={handleSubmit}
                                disabled={returnItems.every(i => i.return_qty === 0)}
                                style={{
                                    background: '#ef4444', color: '#fff', border: 'none', padding: '12px 24px',
                                    borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: 'pointer',
                                    opacity: returnItems.every(i => i.return_qty === 0) ? 0.5 : 1,
                                    boxShadow: '0 4px 6px rgba(239, 68, 68, 0.2)'
                                }}
                            >
                                Submit Debit Note
                            </button>
                        </div>
                    </div>
                </div>
                )}
                </>
            )}

            {view === 'history' && (
                <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', flex: 1, overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                            <tr>
                                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Date</th>
                                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Return No.</th>
                                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Original Invoice</th>
                                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Supplier</th>
                                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#475569' }}>Reason</th>
                                <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#475569' }}>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.length === 0 ? (
                                <tr><td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#9ca3af' }}>No returns found</td></tr>
                            ) : history.map(h => (
                                <tr key={h.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                    <td style={{ padding: '12px', color: '#64748b' }}>{new Date(h.return_date).toLocaleDateString('en-IN')}</td>
                                    <td style={{ padding: '12px', fontWeight: '600', color: '#ef4444' }}>{h.return_number}</td>
                                    <td style={{ padding: '12px', fontWeight: '500', color: '#0f2d1f' }}>{h.invoice_number}</td>
                                    <td style={{ padding: '12px' }}>{h.supplier_name || '-'}</td>
                                    <td style={{ padding: '12px', color: '#64748b' }}>{h.reason || '-'}</td>
                                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: '700', color: '#0f2d1f' }}>Rs. {h.total_amount?.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}

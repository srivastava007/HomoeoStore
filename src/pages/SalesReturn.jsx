import React, { useState } from 'react'

export default function SalesReturn() {
    const [billNumber, setBillNumber] = useState('')
    const [billData, setBillData] = useState(null)
    const [returnItems, setReturnItems] = useState([])
    const [reason, setReason] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [toast, setToast] = useState({ show: false, msg: '', type: '' })
    const [confirmModal, setConfirmModal] = useState({ show: false, amount: 0, itemsToReturn: null })
    const [stockAction, setStockAction] = useState('none')
    const [newLocation, setNewLocation] = useState({ godown: 'G1', box: '' })
    const [view, setView] = useState('new')
    const [history, setHistory] = useState([])

    React.useEffect(() => {
        if (view === 'history') {
            loadHistory()
        }
    }, [view])

    React.useEffect(() => {
        if (!confirmModal.show) return;
        function handleKeyDown(e) {
            if (e.key === 'Escape') {
                e.preventDefault();
                setConfirmModal({ show: false, amount: 0, itemsToReturn: null });
                setTimeout(() => document.getElementById('process-return-btn')?.focus(), 50);
            } else if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && document.activeElement?.tagName !== 'INPUT') {
                e.preventDefault();
                setStockAction(prev => {
                    const options = ['none', 'original', 'new'];
                    const currentIndex = options.indexOf(prev);
                    if (e.key === 'ArrowDown') return options[(currentIndex + 1) % options.length];
                    return options[(currentIndex - 1 + options.length) % options.length];
                });
            } else if (e.key === 'Enter' && document.activeElement?.tagName !== 'BUTTON' && document.activeElement?.type !== 'text') {
                e.preventDefault();
                document.getElementById('return-confirm-btn')?.focus();
            }
        }
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [confirmModal.show, stockAction]);

    async function loadHistory() {
        try {
            const data = await window.api.getSalesReturns()
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
        let searchVal = billNumber.trim()
        if (!searchVal) return
        
        if (/^\d+$/.test(searchVal)) {
            searchVal = searchVal.padStart(4, '0')
            setBillNumber(searchVal)
        }

        setLoading(true)
        setError('')
        try {
            const data = await window.api.getSalesBillForReturn(billNumber.trim())
            if (!data) {
                setError('Bill not found.')
                setBillData(null)
                setReturnItems([])
            } else {
                setBillData(data)
                setReturnItems(data.items.map(item => ({
                    ...item,
                    return_qty: '',
                    return_amount: 0
                })))
            }
        } catch (err) {
            console.error(err)
            const msg = err.message.includes('fully returned') ? 'This bill has already been fully returned.' : 'Error fetching bill details.'
            setError(msg)
        } finally {
            setLoading(false)
        }
    }

    function handleQtyChange(index, qty) {
        let value = qty === '' ? '' : parseInt(qty)
        if (value !== '' && isNaN(value)) value = 0
        const item = returnItems[index]
        
        if (value !== '' && value < 0) return
        if (value !== '' && value > item.quantity) {
            showToast(`Cannot return more than originally billed (${item.quantity})`, 'error')
            return
        }

        const newItems = [...returnItems]
        newItems[index].return_qty = value
        const effectiveUnitPrice = item.total_price / item.quantity
        newItems[index].return_amount = (value === '' ? 0 : value) * effectiveUnitPrice
        setReturnItems(newItems)
    }

    async function handleSubmit() {
        const itemsToReturn = returnItems.filter(item => item.return_qty > 0)
        if (itemsToReturn.length === 0) {
            showToast('Please specify return quantity for at least one item.', 'error')
            return
        }

        const totalReturnAmount = itemsToReturn.reduce((sum, item) => sum + (Number(item.return_amount) || 0), 0)
        
        setConfirmModal({ show: true, amount: totalReturnAmount, itemsToReturn })
    }

    async function executeSubmit() {
        const { amount, itemsToReturn } = confirmModal
        setConfirmModal({ show: false, amount: 0, itemsToReturn: null })
        
        try {
            const returnData = {
                return_number: `CR-${Date.now()}`,
                bill_number: billData.bill_number,
                customer_name: billData.customer_name,
                customer_phone: billData.customer_phone,
                total_amount: amount,
                reason: reason || 'Customer Return',
                stock_action: stockAction,
                new_location: newLocation,
                items: itemsToReturn.map(item => ({
                    medicine_id: item.medicine_id,
                    batch_id: item.batch_id,
                    quantity: item.return_qty,
                    unit_price: item.total_price / item.quantity,
                    total_price: item.return_amount,
                    gst_rate: item.gst_rate
                }))
            }

            await window.api.createSalesReturn(returnData)
            showToast('Sales Return (Credit Note) created successfully! Stock updated.', 'success')
            
            setBillNumber('')
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
    const tableHeaderStyle = {
        padding: '14px 16px', background: '#f8fafc', color: '#475569',
        fontWeight: '600', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px',
        borderBottom: '2px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 10
    }
    const tableCellStyle = {
        padding: '14px 16px', borderBottom: '1px solid #f1f5f9', color: '#1e293b', fontSize: '14px'
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
                    position: 'fixed', bottom: '32px', right: '32px',
                    background: toast.type === 'success' ? '#16a34a' : '#ef4444', color: '#fff',
                    padding: '14px 24px', borderRadius: '10px',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)', fontWeight: '600', fontSize: '14px', zIndex: 99999,
                    display: 'flex', alignItems: 'center', gap: '10px', animation: 'fadeIn 0.3s ease-out'
                }}>
                    {toast.type === 'error' && (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                    )}
                    {toast.type === 'success' && (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path></svg>
                    )}
                    {toast.msg}
                </div>
            )}

            {/* Confirm Modal */}
            {confirmModal.show && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100000,
                    backdropFilter: 'blur(4px)'
                }}>
                    <div style={{ background: '#fff', padding: '32px', borderRadius: '16px', width: '400px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', textAlign: 'left' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ width: '56px', height: '56px', background: '#fee2e2', color: '#ef4444', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                                <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                            </div>
                            <h3 style={{ margin: '0 0 8px 0', color: '#0f172a', fontSize: '20px', fontWeight: '700' }}>Confirm Return</h3>
                            <p style={{ margin: '0 0 24px 0', color: '#64748b', fontSize: '15px' }}>
                                Create a Credit Note for<br/><strong style={{ color: '#ef4444', fontSize: '22px', display: 'block', marginTop: '8px' }}>₹ {confirmModal.amount.toFixed(2)}</strong>
                            </p>
                        </div>
                        
                        {/* Stock Action Options */}
                        <div style={{ marginBottom: '24px', background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                            <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#334155' }}>Returned Stock Action</h4>
                            
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', cursor: 'pointer', fontSize: '14px', color: '#475569' }}>
                                <input type="radio" name="stockAction" value="none" checked={stockAction === 'none'} onChange={(e) => setStockAction(e.target.value)} />
                                Just Return (No Location Update)
                            </label>

                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', cursor: 'pointer', fontSize: '14px', color: '#475569' }}>
                                <input type="radio" name="stockAction" value="original" checked={stockAction === 'original'} onChange={(e) => setStockAction(e.target.value)} />
                                Return to Original Location
                            </label>
                            
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', cursor: 'pointer', fontSize: '14px', color: '#475569' }}>
                                <input type="radio" name="stockAction" value="new" checked={stockAction === 'new'} onChange={(e) => setStockAction(e.target.value)} />
                                Return to New Location
                            </label>

                            {stockAction === 'new' && (
                                <div style={{ display: 'flex', gap: '8px', marginTop: '12px', paddingLeft: '24px' }}>
                                    <input 
                                        id="return-godown-input"
                                        type="text" 
                                        placeholder="Godown" 
                                        value={newLocation.godown} 
                                        onChange={(e) => setNewLocation({...newLocation, godown: e.target.value})}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                document.getElementById('return-box-input')?.focus();
                                            }
                                        }}
                                        style={{ width: '100px', padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px' }} 
                                    />
                                    <input 
                                        id="return-box-input"
                                        type="text" 
                                        placeholder="Box / Rack" 
                                        value={newLocation.box} 
                                        onChange={(e) => setNewLocation({...newLocation, box: e.target.value})}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                document.getElementById('return-confirm-btn')?.focus();
                                            }
                                        }}
                                        style={{ flex: 1, padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px' }} 
                                    />
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button id="return-cancel-btn" className="modern-button" onClick={() => {
                                setConfirmModal({ show: false, amount: 0, itemsToReturn: null });
                                setTimeout(() => document.getElementById('process-return-btn')?.focus(), 50);
                            }} onKeyDown={(e) => {
                                if (e.key === 'ArrowRight') document.getElementById('return-confirm-btn')?.focus();
                            }} style={{ ...buttonStyle, flex: 1, background: '#f1f5f9', color: '#475569', boxShadow: 'none' }}>Cancel</button>
                            <button id="return-confirm-btn" className="modern-button" onClick={executeSubmit} onKeyDown={(e) => {
                                if (e.key === 'ArrowLeft') document.getElementById('return-cancel-btn')?.focus();
                            }} style={{ ...buttonStyle, flex: 1, background: '#ef4444', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)' }}>Confirm</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header & Toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div>
                    <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#0f2d1f', margin: 0, letterSpacing: '-0.5px' }}>Sales Return</h1>
                    <p style={{ fontSize: '14px', color: '#64748b', margin: '4px 0 0 0' }}>Process customer returns and issue credit notes</p>
                </div>
                <div style={{ display: 'flex', gap: '4px', background: '#e2e8f0', padding: '4px', borderRadius: '8px' }}>
                    {['new', 'history'].map(v => (
                        <button key={v} onClick={() => setView(v)} style={{
                            padding: '8px 20px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                            background: view === v ? '#0f2d1f' : 'transparent',
                            color: view === v ? '#fff' : '#64748b',
                            fontWeight: '600', fontSize: '14px', transition: 'all 0.2s ease',
                            fontFamily: 'Outfit, sans-serif'
                        }}>
                            {v === 'new' ? 'New Return' : 'History'}
                        </button>
                    ))}
                </div>
            </div>

            {view === 'new' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1, minHeight: 0 }}>
                    {/* Search Inline Form */}
                    <div style={{ ...sectionStyle, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '16px', background: '#f8fafc', padding: '6px 6px 6px 16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                            <form onSubmit={handleSearch} style={{ display: 'flex', flex: 1, gap: '12px' }}>
                                <input
                                    type="text"
                                    value={billNumber}
                                    onChange={e => setBillNumber(e.target.value)}
                                    placeholder="Enter Original Bill Number (e.g. NHP/2026/0001)"
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
                        <div style={{ ...sectionStyle, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 }}>
                            
                            {/* Bill Summary Header */}
                            <div style={{ padding: '20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', gap: '24px' }}>
                                    <div>
                                        <p style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 4px 0' }}>Customer</p>
                                        <p style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: 0 }}>{billData.customer_name || 'Walk-in Customer'}</p>
                                        <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>{billData.customer_phone || 'No phone provided'}</p>
                                    </div>
                                    <div style={{ width: '1px', background: '#cbd5e1' }}></div>
                                    <div>
                                        <p style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 4px 0' }}>Bill Number</p>
                                        <p style={{ fontSize: '16px', fontWeight: '600', color: '#0f172a', margin: 0 }}>{billData.bill_number}</p>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right', background: '#ecfdf5', padding: '12px 20px', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
                                    <p style={{ fontSize: '12px', color: '#059669', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 4px 0' }}>Original Amount</p>
                                    <p style={{ fontSize: '22px', fontWeight: '800', color: '#047857', margin: 0 }}>₹ {billData.total_amount?.toFixed(2)}</p>
                                </div>
                            </div>

                            {/* Data Table */}
                            <div style={{ flex: 1, overflowY: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                    <thead>
                                        <tr>
                                            <th style={tableHeaderStyle}>Medicine Details</th>
                                            <th style={tableHeaderStyle}>Batch</th>
                                            <th style={tableHeaderStyle}>Location</th>
                                            <th style={{...tableHeaderStyle, textAlign: 'center'}}>Billed</th>
                                            <th style={{...tableHeaderStyle, textAlign: 'right'}}>Rate</th>
                                            <th style={{...tableHeaderStyle, textAlign: 'right'}}>Disc %</th>
                                            <th style={{...tableHeaderStyle, textAlign: 'right'}}>Final Rate</th>
                                            <th style={{...tableHeaderStyle, textAlign: 'center'}}>Return Qty</th>
                                            <th style={{...tableHeaderStyle, textAlign: 'right'}}>Refund</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {returnItems.map((item, index) => (
                                            <tr key={item.id} className="table-row">
                                                <td style={{ ...tableCellStyle, fontWeight: '600' }}>
                                                    {item.medicine_name} 
                                                    {item.potency && <span style={{ color: '#64748b', fontSize: '12px', marginLeft: '6px', fontWeight: '500' }}>{item.potency}</span>}
                                                    {item.unit && <span style={{ color: '#94a3b8', fontSize: '11px', marginLeft: '4px', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>{item.unit}</span>}
                                                </td>
                                                <td style={{ ...tableCellStyle, color: '#475569', fontSize: '13px' }}>{item.batch_no || '-'}</td>
                                                <td style={{ ...tableCellStyle, color: '#475569', fontSize: '13px' }}>{item.godown ? `${item.godown} ${item.rack ? '- ' + item.rack : ''}` : '-'}</td>
                                                <td style={{ ...tableCellStyle, textAlign: 'center', fontWeight: '600', color: '#0f172a' }}>{item.quantity}</td>
                                                <td style={{ ...tableCellStyle, textAlign: 'right' }}>₹ {item.unit_price?.toFixed(2)}</td>
                                                <td style={{ ...tableCellStyle, textAlign: 'right', color: '#16a34a' }}>
                                                    {(() => {
                                                        const origTotal = (item.unit_price || 0) * (item.quantity || 0);
                                                        const discAmount = origTotal - (item.total_price || 0);
                                                        const discPercent = origTotal > 0 ? Math.round((discAmount / origTotal) * 100) : 0;
                                                        return discPercent > 0 ? `${discPercent}%` : '-';
                                                    })()}
                                                </td>
                                                <td style={{ ...tableCellStyle, textAlign: 'right', fontWeight: '600' }}>₹ {(item.total_price / item.quantity).toFixed(2)}</td>
                                                <td style={{ ...tableCellStyle, textAlign: 'center' }}>
                                                    <input 
                                                        type="number" 
                                                        min="0"
                                                        max={item.quantity}
                                                        value={item.return_qty === '' ? '' : item.return_qty}
                                                        onChange={e => handleQtyChange(index, e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                document.getElementById('process-return-btn')?.focus();
                                                            }
                                                        }}
                                                        placeholder="0"
                                                        style={{
                                                            width: '70px', padding: '8px', textAlign: 'center', borderRadius: '6px',
                                                            border: item.return_qty > 0 ? '2px solid #ef4444' : '1px solid #cbd5e1', 
                                                            outline: 'none', fontWeight: '600', color: item.return_qty > 0 ? '#ef4444' : '#0f172a',
                                                            background: item.return_qty > 0 ? '#fef2f2' : '#fff', transition: 'all 0.2s'
                                                        }}
                                                    />
                                                </td>
                                                <td style={{ ...tableCellStyle, textAlign: 'right', fontWeight: '700', color: item.return_amount > 0 ? '#ef4444' : '#94a3b8' }}>
                                                    {item.return_amount > 0 ? `₹ ${item.return_amount.toFixed(2)}` : '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Bottom Action Area */}
                            <div style={{ padding: '20px', background: '#fff', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                <div style={{ flex: 1, maxWidth: '450px' }}>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>
                                        Reason for Return (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={reason}
                                        onChange={e => setReason(e.target.value)}
                                        placeholder="e.g., Damaged product, wrong potency, customer request..."
                                        style={{ ...inputStyle, background: '#fff' }}
                                    />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                                    <div style={{ textAlign: 'right' }}>
                                        <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 4px 0', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Refund</p>
                                        <p style={{ fontSize: '28px', fontWeight: '800', color: '#ef4444', margin: 0, lineHeight: 1 }}>
                                            ₹ {returnItems.reduce((s, i) => s + (Number(i.return_amount) || 0), 0).toFixed(2)}
                                        </p>
                                    </div>
                                    <button 
                                                        id="process-return-btn"
                                        className="modern-button"
                                        onClick={handleSubmit}
                                        disabled={returnItems.every(i => !i.return_qty || i.return_qty <= 0)}
                                        style={{
                                            ...buttonStyle,
                                            background: '#ef4444', padding: '14px 28px', fontSize: '16px',
                                            opacity: returnItems.every(i => !i.return_qty || i.return_qty <= 0) ? 0.5 : 1,
                                            boxShadow: returnItems.every(i => !i.return_qty || i.return_qty <= 0) ? 'none' : '0 4px 12px rgba(239, 68, 68, 0.3)',
                                            display: 'flex', alignItems: 'center', gap: '8px'
                                        }}
                                    >
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path></svg>
                                        Process Return
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {view === 'history' && (
                <div style={{ ...sectionStyle, flex: 1, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                        <h2 style={{ margin: 0, fontSize: '18px', color: '#0f172a', fontWeight: '700' }}>Return History</h2>
                        <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500', background: '#e2e8f0', padding: '4px 10px', borderRadius: '12px' }}>
                            {history.length} Records
                        </span>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr>
                                    <th style={tableHeaderStyle}>Date</th>
                                    <th style={tableHeaderStyle}>Credit Note No.</th>
                                    <th style={tableHeaderStyle}>Original Bill</th>
                                    <th style={tableHeaderStyle}>Customer</th>
                                    <th style={tableHeaderStyle}>Reason</th>
                                    <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.length === 0 ? (
                                    <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '15px' }}>No returns found</td></tr>
                                ) : history.map(h => (
                                    <tr key={h.id} className="table-row">
                                        <td style={{ ...tableCellStyle, color: '#64748b', fontWeight: '500' }}>{new Date(h.created_at).toLocaleDateString('en-IN', {day: '2-digit', month: 'short', year: 'numeric'})}</td>
                                        <td style={{ ...tableCellStyle, fontWeight: '700', color: '#ef4444' }}>{h.return_number}</td>
                                        <td style={{ ...tableCellStyle, fontWeight: '600', color: '#0f172a' }}>{h.bill_number}</td>
                                        <td style={{ ...tableCellStyle }}>{h.customer_name || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Walk-in</span>}</td>
                                        <td style={{ ...tableCellStyle, color: '#64748b' }}>{h.reason || '-'}</td>
                                        <td style={{ ...tableCellStyle, textAlign: 'right', fontWeight: '800', color: '#0f172a' }}>₹ {h.total_amount?.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}

import React, { useState } from 'react';

export default function CancelBillModal({ isOpen, onClose, bill, billType = 'retail', onSuccess }) {
    const [reasonOption, setReasonOption] = useState('Customer declined / cancelled order');
    const [customReason, setCustomReason] = useState('');
    const [pin, setPin] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    if (!isOpen || !bill) return null;

    const displayBillNo = bill.bill_number || `Bill #${bill.id}`;
    const displayName = bill.customer_name || bill.party_name || 'Walk-in Customer';
    const displayAmount = (bill.total_amount ?? bill.net_amount ?? 0).toFixed(2);
    const displayDate = bill.created_at || bill.bill_date ? new Date(bill.created_at || bill.bill_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

    const handleConfirmCancel = async () => {
        setErrorMsg('');
        const finalReason = reasonOption === 'Other' ? customReason.trim() : reasonOption;
        if (reasonOption === 'Other' && !finalReason) {
            setErrorMsg('Please specify a reason for cancellation.');
            return;
        }

        setLoading(true);
        try {
            // 1. Verify PIN if entered or configured
            if (window.api && window.api.verifyAdminPin) {
                const pinRes = await window.api.verifyAdminPin(pin);
                if (pinRes && pinRes.success === false) {
                    setErrorMsg(pinRes.message || 'Incorrect Admin PIN. Please check and try again.');
                    setLoading(false);
                    return;
                }
            }

            // 2. Perform atomic cancellation via IPC
            let res;
            if (billType === 'wholesale') {
                res = await window.api.cancelWholesaleBill({ id: bill.id, reason: finalReason });
            } else {
                res = await window.api.cancelRetailBill({ id: bill.id, reason: finalReason });
            }

            if (res && res.success) {
                onSuccess && onSuccess(res);
                onClose();
            } else {
                setErrorMsg('Failed to cancel bill. Please try again.');
            }
        } catch (err) {
            console.error('[CancelBillModal] Error cancelling bill:', err);
            setErrorMsg(err.message || 'Error occurred while cancelling bill.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '16px'
        }}>
            <div style={{
                background: '#ffffff',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '520px',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                fontFamily: 'Outfit, sans-serif'
            }}>
                {/* Header */}
                <div style={{
                    padding: '20px 24px 16px',
                    borderBottom: '1px solid #f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                }}>
                    <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '12px',
                        background: '#fee2e2',
                        color: '#dc2626',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '20px',
                        flexShrink: 0
                    }}>
                        🗑️
                    </div>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                            Cancel {billType === 'wholesale' ? 'Wholesale' : 'Retail'} Bill
                        </h3>
                        <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#64748b' }}>
                            Safe reversal with inventory & accounts restoration
                        </p>
                    </div>
                </div>

                {/* Content */}
                <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Bill Info Card */}
                    <div style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        padding: '12px 16px',
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '8px 16px',
                        fontSize: '13px'
                    }}>
                        <div>
                            <span style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase', fontWeight: '700' }}>Bill Number</span>
                            <div style={{ fontWeight: '800', color: '#dc2626', fontSize: '14px' }}>{displayBillNo}</div>
                        </div>
                        <div>
                            <span style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase', fontWeight: '700' }}>Party / Customer</span>
                            <div style={{ fontWeight: '700', color: '#1e293b' }}>{displayName}</div>
                        </div>
                        <div>
                            <span style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase', fontWeight: '700' }}>Date</span>
                            <div style={{ fontWeight: '600', color: '#475569' }}>{displayDate}</div>
                        </div>
                        <div>
                            <span style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase', fontWeight: '700' }}>Total Amount</span>
                            <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '15px' }}>₹{displayAmount}</div>
                        </div>
                    </div>

                    {/* Impact Notice */}
                    <div style={{
                        background: '#fffbeb',
                        border: '1px solid #fde68a',
                        borderRadius: '8px',
                        padding: '10px 14px',
                        fontSize: '12px',
                        color: '#92400e',
                        lineHeight: 1.5
                    }}>
                        <strong>What happens on cancellation:</strong>
                        <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                            <li>Medicine quantities & batch stock will be <strong>restored (+)</strong>.</li>
                            <li>Day Book cash entry & Sales revenue will be <strong>reversed</strong>.</li>
                            <li>Bill status becomes <span style={{ color: '#dc2626', fontWeight: '700' }}>[CANCELLED]</span> for GST & audit safety.</li>
                        </ul>
                    </div>

                    {/* Reason Selector */}
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                            Reason for Cancellation <span style={{ color: '#dc2626' }}>*</span>
                        </label>
                        <select
                            value={reasonOption}
                            onChange={(e) => setReasonOption(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '8px 12px',
                                borderRadius: '8px',
                                border: '1px solid #cbd5e1',
                                background: '#f8fafc',
                                fontSize: '13px',
                                color: '#1e293b',
                                outline: 'none',
                                fontWeight: '600'
                            }}
                        >
                            <option value="Customer declined / cancelled order">Customer declined / cancelled order</option>
                            <option value="Incorrect items or dosage entered">Incorrect items or dosage entered</option>
                            <option value="Billing mistake / wrong customer">Billing mistake / wrong customer</option>
                            <option value="Duplicate bill generated">Duplicate bill generated</option>
                            <option value="Payment failed / customer left">Payment failed / customer left</option>
                            <option value="Testing / Training bill">Testing / Training bill</option>
                            <option value="Other">Other (Enter custom reason below)</option>
                        </select>
                    </div>

                    {/* Custom Reason Field */}
                    {reasonOption === 'Other' && (
                        <div>
                            <input
                                type="text"
                                placeholder="Type cancellation reason..."
                                value={customReason}
                                onChange={(e) => setCustomReason(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    borderRadius: '8px',
                                    border: '1px solid #cbd5e1',
                                    fontSize: '13px',
                                    color: '#1e293b',
                                    outline: 'none',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>
                    )}

                    {/* Admin PIN */}
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                            Admin PIN <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'normal' }}>(Optional if not set)</span>
                        </label>
                        <input
                            type="password"
                            placeholder="Enter 4-digit Admin PIN"
                            value={pin}
                            maxLength={10}
                            onChange={(e) => setPin(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '8px 12px',
                                borderRadius: '8px',
                                border: '1px solid #cbd5e1',
                                fontSize: '13px',
                                color: '#1e293b',
                                outline: 'none',
                                boxSizing: 'border-box',
                                letterSpacing: '2px'
                            }}
                        />
                    </div>

                    {/* Error Message */}
                    {errorMsg && (
                        <div style={{
                            padding: '8px 12px',
                            background: '#fee2e2',
                            border: '1px solid #fca5a5',
                            borderRadius: '8px',
                            color: '#dc2626',
                            fontSize: '12px',
                            fontWeight: '600'
                        }}>
                            ⚠️ {errorMsg}
                        </div>
                    )}
                </div>

                {/* Footer Buttons */}
                <div style={{
                    padding: '14px 24px',
                    background: '#f8fafc',
                    borderTop: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '10px'
                }}>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        style={{
                            padding: '9px 18px',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            background: '#ffffff',
                            color: '#475569',
                            fontSize: '13px',
                            fontWeight: '600',
                            cursor: 'pointer'
                        }}
                    >
                        Keep Bill
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirmCancel}
                        disabled={loading}
                        style={{
                            padding: '9px 20px',
                            borderRadius: '8px',
                            border: 'none',
                            background: loading ? '#94a3b8' : 'linear-gradient(135deg, #ef4444, #dc2626)',
                            color: '#ffffff',
                            fontSize: '13px',
                            fontWeight: '700',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            boxShadow: '0 4px 6px -1px rgba(220, 38, 38, 0.2)'
                        }}
                    >
                        {loading ? 'Cancelling...' : 'Confirm Cancellation'}
                    </button>
                </div>
            </div>
        </div>
    );
}

import React from 'react';

export default function HeldBillsModal({ 
    show, 
    heldBills, 
    onClose, 
    onRestore 
}) {
    if (!show) return null;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', zIndex: 100000
        }}>
            <div style={{ background: '#fff', padding: '24px', borderRadius: '8px', width: '500px', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0, color: '#0f2d1f', fontSize: '18px' }}>Held Bills</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}>×</button>
                </div>
                {heldBills.length === 0 ? (
                    <p style={{ color: '#64748b' }}>No held bills.</p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {heldBills.map(hold => (
                            <div key={hold.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                                <div>
                                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>{hold.billDetails.patientName}</div>
                                    <div style={{ fontSize: '12px', color: '#64748b' }}>{hold.items.length} items • ₹{hold.items.reduce((s, i) => s + i.amount, 0).toFixed(2)}</div>
                                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>{new Date(hold.timestamp).toLocaleTimeString()}</div>
                                </div>
                                <button onClick={() => onRestore(hold.id)} style={{ background: '#10b981', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '12px' }}>
                                    Restore
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

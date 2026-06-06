import React from 'react';

export default function ClearConfirmModal({ 
    show, 
    onClose, 
    onConfirm 
}) {
    if (!show) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100000
        }}>
            <div style={{
                background: '#fff',
                padding: '24px',
                borderRadius: '8px',
                width: '400px',
                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
                textAlign: 'center',
                animation: 'fadeIn 0.2s ease-out'
            }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
                <h3 style={{ margin: '0 0 12px 0', color: '#0f172a', fontSize: '20px' }}>Clear Bill?</h3>
                <p style={{ margin: '0 0 24px 0', color: '#64748b', fontSize: '14px', lineHeight: '1.5' }}>
                    Are you sure you want to clear this entire bill? This action cannot be undone.
                </p>
                
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                    <button 
                        onClick={onClose}
                        style={{
                            flex: 1,
                            padding: '10px',
                            background: '#e2e8f0',
                            border: 'none',
                            color: '#475569',
                            borderRadius: '6px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                        }}
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={onConfirm}
                        style={{
                            flex: 1,
                            padding: '10px',
                            background: '#ef4444',
                            border: 'none',
                            color: '#fff',
                            borderRadius: '6px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            boxShadow: '0 4px 6px -1px rgba(239, 68, 68, 0.3)',
                            transition: 'all 0.15s ease'
                        }}
                    >
                        Yes, Clear It
                    </button>
                </div>
            </div>
        </div>
    )
}

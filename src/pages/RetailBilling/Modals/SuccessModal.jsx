import React from 'react';

export default function SuccessModal({ 
    show, 
    billNo, 
    billId, 
    successFocus, 
    setSuccessFocus, 
    onClose, 
    onPrint 
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
                width: '320px',
                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                    <div style={{ width: '48px', height: '48px', background: '#dcfce7', color: '#16a34a', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path></svg>
                    </div>
                    <h3 style={{ margin: 0, color: '#0f2d1f', fontSize: '18px' }}>Bill Created!</h3>
                    <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: '14px' }}>Bill No: <strong>{billNo}</strong></p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button 
                        onClick={() => onPrint(billId)}
                        onMouseEnter={() => setSuccessFocus('print')}
                        style={{
                            flex: 1,
                            padding: '8px',
                            background: successFocus === 'print' ? '#f0fdf4' : '#fff',
                            border: successFocus === 'print' ? '1px solid #16a34a' : '1px solid #cbd5e1',
                            color: successFocus === 'print' ? '#16a34a' : '#334155',
                            borderRadius: '4px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            boxShadow: successFocus === 'print' ? '0 0 0 2px #fff, 0 0 0 4px #16a34a' : 'none',
                            outline: 'none',
                            transition: 'all 0.15s ease'
                        }}
                    >
                        Print
                    </button>
                    <button 
                        onClick={onClose}
                        onMouseEnter={() => setSuccessFocus('ok')}
                        style={{
                            flex: 1,
                            padding: '8px',
                            background: successFocus === 'ok' ? '#15803d' : '#16a34a',
                            border: 'none',
                            color: '#fff',
                            borderRadius: '4px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            boxShadow: successFocus === 'ok' ? '0 0 0 2px #fff, 0 0 0 4px #16a34a' : 'none',
                            outline: 'none',
                            transition: 'all 0.15s ease'
                        }}
                    >
                        OK
                    </button>
                </div>
            </div>
        </div>
    )
}

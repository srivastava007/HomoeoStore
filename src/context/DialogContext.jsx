import React, { createContext, useContext, useState } from 'react';

const DialogContext = createContext();

export function useDialog() {
  return useContext(DialogContext);
}

export function DialogProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const showAlert = (title, message) => {
    setDialog({ type: 'alert', title, message });
  };

  const showConfirm = (title, message, onConfirm, confirmText = 'Yes, Delete') => {
    setDialog({ type: 'confirm', title, message, onConfirm, confirmText });
  };

  const closeDialog = () => setDialog(null);

  const handleConfirm = () => {
    if (dialog && dialog.onConfirm) {
      dialog.onConfirm();
    }
    closeDialog();
  };

  return (
    <DialogContext.Provider value={{ showAlert, showConfirm, showToast }}>
      {children}
      {dialog && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999
        }}>
          <div style={{
            background: '#fff', borderRadius: '16px', padding: '24px', width: '400px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            fontFamily: 'Outfit, sans-serif'
          }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
              {dialog.title}
            </h3>
            <p style={{ margin: '0 0 24px 0', color: '#475569', fontSize: '15px', lineHeight: '1.5' }}>
              {dialog.message}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              {dialog.type === 'confirm' && (
                <button autoFocus onClick={closeDialog} style={{
                  padding: '10px 20px', borderRadius: '8px', border: '1px solid #cbd5e1',
                  background: '#fff', color: '#475569', fontSize: '14px', fontWeight: '700', cursor: 'pointer', transition: '0.2s'
                }}>
                  Cancel
                </button>
              )}
              <button 
                autoFocus={dialog.type !== 'confirm'} 
                onClick={dialog.type === 'confirm' ? handleConfirm : closeDialog} 
                style={{
                  padding: '10px 20px', borderRadius: '8px', border: 'none',
                  background: dialog.type === 'confirm' ? '#ef4444' : '#16a34a', color: '#fff', fontSize: '14px', fontWeight: '700', cursor: 'pointer', transition: '0.2s'
                }}>
                {dialog.type === 'confirm' ? dialog.confirmText : 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 999999,
          background: toast.type === 'success' ? '#16a34a' : '#ef4444',
          color: '#fff', padding: '14px 24px', borderRadius: '8px',
          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
          fontFamily: 'Outfit, sans-serif', fontWeight: '500', fontSize: '15px',
          animation: 'slideInRight 0.3s ease-out'
        }}>
          {toast.message}
        </div>
      )}
    </DialogContext.Provider>
  );
}

import React, { useState, useEffect } from 'react'
import { useDialog } from '../context/DialogContext'

export default function BackupSetup() {
  const [backupPath, setBackupPath] = useState('')
  const { showAlert } = useDialog()

  useEffect(() => {
    async function loadSettings() {
      const path = await window.api.getSetting('backup_path')
      if (path) setBackupPath(path)
    }
    loadSettings()
  }, [])

  async function handlePickFolder() {
    const folder = await window.api.pickBackupFolder()
    if (folder) {
      setBackupPath(folder)
      await window.api.setSetting('backup_path', folder)
      showAlert('Success', 'Backup location saved successfully!')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%', fontFamily: 'Outfit, sans-serif' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0', letterSpacing: '-0.5px' }}>Cloud & Drive Backup Setup</h1>
          <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>Automated Auto-Backup System</p>
        </div>
      </div>

      <div style={{ 
        background: '#fff', 
        padding: '40px', 
        borderRadius: '24px', 
        border: '1px solid #e2e8f0', 
        boxShadow: '0 10px 30px rgba(0,0,0,0.03)', 
        maxWidth: '700px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative background element */}
        <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '200px', height: '200px', background: 'radial-gradient(circle, rgba(16,185,129,0.1) 0%, rgba(255,255,255,0) 70%)', zIndex: 0 }} />
        
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '24px', marginBottom: '36px' }}>
            <div style={{ 
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', 
              width: '64px', height: '64px', 
              borderRadius: '16px', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', 
              fontSize: '32px',
              boxShadow: '0 8px 16px rgba(15,23,42,0.2)'
            }}>
              ☁️
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: '0 0 8px 0', letterSpacing: '-0.5px' }}>Backup on Close</h2>
              <p style={{ fontSize: '15px', color: '#475569', margin: 0, lineHeight: '1.6', fontWeight: '500' }}>
                Whenever you close the software, a clean copy of your database will automatically be saved to the location below. Old backups (older than 30 days) are automatically deleted to save space.
              </p>
            </div>
          </div>

          <div style={{ marginBottom: '32px', background: '#f8fafc', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
              Current Backup Location
            </label>
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ 
                flex: 1, 
                padding: '16px 20px', 
                borderRadius: '12px', 
                border: '1px solid #cbd5e1', 
                fontSize: '15px', 
                fontWeight: '600',
                color: backupPath ? '#0f172a' : '#94a3b8', 
                background: '#fff',
                display: 'flex', alignItems: 'center',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
              }}>
                {backupPath ? (
                  <>
                    <span style={{ marginRight: '8px', color: '#3b82f6' }}>📁</span> 
                    {backupPath}
                  </>
                ) : (
                  'No backup location selected'
                )}
              </div>
              <button 
                onClick={handlePickFolder}
                style={{ 
                  background: '#0f172a', color: '#fff', border: 'none', borderRadius: '12px', 
                  padding: '0 32px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', 
                  boxShadow: '0 4px 12px rgba(15, 23, 42, 0.2)',
                  transition: 'all 0.2s'
                }}
                className="btn-browse"
              >
                Browse...
              </button>
            </div>
          </div>

          {backupPath && (
            <div style={{ 
              background: 'linear-gradient(to right, #ecfdf5, #d1fae5)', 
              color: '#065f46', 
              padding: '20px 24px', 
              borderRadius: '16px', 
              fontSize: '15px', 
              display: 'flex', gap: '16px', alignItems: 'center',
              border: '1px solid #a7f3d0',
              animation: 'fadeIn 0.5s ease-out'
            }}>
              <div style={{ background: '#10b981', color: '#fff', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 'bold', flexShrink: 0, boxShadow: '0 4px 10px rgba(16,185,129,0.3)' }}>
                ✓
              </div>
              <div>
                <strong style={{ display: 'block', fontSize: '16px', marginBottom: '4px' }}>Auto-Backup is Active!</strong>
                <div style={{ opacity: 0.85, fontWeight: '500' }}>Your data will be safely backed up to this location every time you exit HomoeoStore.</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .btn-browse:hover {
          background: #1e293b !important;
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(15, 23, 42, 0.3) !important;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

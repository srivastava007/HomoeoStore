import React, { useState, useEffect } from 'react'

export default function Login({ onLogin }) {
  const [role, setRole] = useState(null)
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [isPinSetup, setIsPinSetup] = useState(false)
  const [setupStep, setSetupStep] = useState('ROLE_SELECT') // 'ROLE_SELECT', 'SET_PIN', 'SEARCHING_SERVER', 'SERVER_UNCONFIGURED'

  const [netStatus, setNetStatus] = useState({ mode: 'LOCAL', ip: null, connected: true })
  const [showNetworkMenu, setShowNetworkMenu] = useState(false)

  // Load initial network status and poll for client discovery
  useEffect(() => {
    if (!window.api) return;
    
    const fetchStatus = () => {
      window.api.getNetworkStatus().then(status => {
        setNetStatus(status);
      });
    };

    fetchStatus();
    const intv = setInterval(fetchStatus, 2000);
    return () => clearInterval(intv);
  }, []);

  // Monitor connection status when in SEARCHING_SERVER mode
  useEffect(() => {
    if (setupStep === 'SEARCHING_SERVER' && netStatus.mode === 'CLIENT' && netStatus.connected && netStatus.ip) {
      // Server found! Check if it is configured
      window.api.verifyAdminPin('').then(pinCheck => {
        if (pinCheck.message === 'No PIN set') {
          setSetupStep('SERVER_UNCONFIGURED');
        } else {
          // Discovered server is already configured!
          // We can skip PIN setup on client node and go directly to normal login.
          setIsPinSetup(false);
          setRole(null);
          setSetupStep('ROLE_SELECT'); // reset wizard state in case they change modes later
        }
      }).catch(err => {
        console.error('Failed to verify server configuration:', err);
      });
    }
  }, [setupStep, netStatus.connected, netStatus.mode, netStatus.ip]);

  // Initial check to see if database needs setup
  useEffect(() => {
    async function checkSetup() {
      try {
        const pinCheck = await window.api.verifyAdminPin('')
        if (pinCheck.message === 'No PIN set') {
          setIsPinSetup(true)
          setRole('admin')
        }
      } catch (err) {
        // If client cannot connect to server, we handle it gracefully
        console.log('Setup check failed (expected if client node offline):', err);
      }
    }
    checkSetup()
  }, [])

  // Auto-submit when PIN length is sufficient
  useEffect(() => {
    async function autoSubmit() {
      if (!isPinSetup && pin.length >= 4 && role) {
        if (role === 'admin') {
          const res = await window.api.verifyAdminPin(pin)
          if (res.success) {
            onLogin('admin')
          }
        } else {
          const res = await window.api.verifyCashierPin(pin)
          if (res.success) {
            onLogin('cashier')
          }
        }
      } else if (pin.length < 4) {
        setError('')
      }
    }
    autoSubmit()
  }, [pin, role, isPinSetup, onLogin])

  const handleModeChange = (newMode) => {
    window.api.setNetworkMode(newMode);
    setTimeout(() => {
      window.api.getNetworkStatus().then(status => setNetStatus(status));
    }, 500);
  }

  // Handle configuration selection from the onboarding welcome screen
  const selectSystemRole = (mode) => {
    handleModeChange(mode);
    if (mode === 'CLIENT') {
      setSetupStep('SEARCHING_SERVER');
    } else {
      setSetupStep('SET_PIN');
    }
  }

  // Submit handler (Set PIN or Login)
  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    
    if (isPinSetup) {
      if (pin.length < 4) return setError('PIN must be at least 4 characters')
      try {
        await window.api.updateAdminPin(pin)
        await window.api.updateCashierPin('1234')
        onLogin('admin')
      } catch (err) {
        setError('Failed to setup PIN database: ' + err.message)
      }
      return
    }

    if (role === 'admin') {
      const res = await window.api.verifyAdminPin(pin)
      if (res.success) {
        onLogin('admin')
      } else {
        setError('Incorrect Admin PIN')
        setPin('')
      }
    } else {
      const res = await window.api.verifyCashierPin(pin)
      if (res.success) {
        onLogin('cashier')
      } else {
        setError('Incorrect Cashier PIN')
        setPin('')
      }
    }
  }

  // Shortcut to retry searching or reset role choice
  const handleResetSetup = () => {
    handleModeChange('LOCAL');
    setSetupStep('ROLE_SELECT');
    setPin('');
    setError('');
  }

  return (
    <div style={{ height: '100vh', width: '100vw', position: 'relative', overflow: 'hidden', fontFamily: 'Outfit, sans-serif', background: '#ffffff' }}>
      
      {/* Animated Background Orbs (very subtle light theme) */}
      <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '60vw', height: '60vw', background: 'radial-gradient(circle, rgba(16,185,129,0.04) 0%, rgba(255,255,255,0) 70%)', filter: 'blur(80px)', animation: 'float1 12s infinite alternate ease-in-out', zIndex: 0 }} />
      <div style={{ position: 'absolute', bottom: '-20%', right: '-10%', width: '70vw', height: '70vw', background: 'radial-gradient(circle, rgba(20,184,166,0.03) 0%, rgba(255,255,255,0) 70%)', filter: 'blur(100px)', animation: 'float2 15s infinite alternate ease-in-out', zIndex: 0 }} />

      <style>{`
        @keyframes float1 { 0% { transform: translate(0, 0) scale(1); } 100% { transform: translate(5%, 10%) scale(1.1); } }
        @keyframes float2 { 0% { transform: translate(0, 0) scale(1); } 100% { transform: translate(-10%, -5%) scale(1.2); } }
        .glass-panel {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.05);
        }
        .btn-hover {
          background: #ffffff !important;
          color: #1e293b !important;
          border: 1px solid #e2e8f0 !important;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.03) !important;
        }
        .btn-hover:hover {
          background: #ffffff !important;
          border-color: #cbd5e1 !important;
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.06) !important;
        }
        .btn-hover:active { 
          transform: translateY(0); 
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.03) !important; 
        }
        .pin-input:focus { 
          border-color: #10b981 !important; 
          box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.1) !important; 
        }
        .setup-card {
          border: 1px solid #cbd5e1;
          background: #f8fafc;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .setup-card:hover {
          border-color: #10b981;
          background: #f0fdf4;
          transform: translateY(-2px);
          box-shadow: 0 10px 15px -3px rgba(16,185,129,0.08);
        }
      `}</style>

      {/* Draggable Title Bar Area (invisible) */}
      <div style={{ height: '36px', minHeight: '36px', WebkitAppRegion: 'drag', position: 'absolute', top: 0, left: 0, right: 0, zIndex: 50 }} />

      {/* Network Mode Pill in top left (Only shown during normal operation) */}
      {!isPinSetup && (
        <div style={{ position: 'absolute', top: '24px', left: '24px', zIndex: 100, WebkitAppRegion: 'no-drag' }}>
          <div 
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f1f5f9', padding: '8px 16px', borderRadius: '30px', cursor: 'pointer', border: '1px solid #e2e8f0', transition: 'all 0.2s ease', color: '#1e293b', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}
            onClick={() => setShowNetworkMenu(!showNetworkMenu)}
          >
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: netStatus.connected ? '#10b981' : '#ef4444', boxShadow: '0 0 0 2px rgba(16,185,129,0.2)' }} />
            <span style={{ fontSize: '11px', fontWeight: '800', letterSpacing: '0.05em', color: '#1e293b', textTransform: 'uppercase' }}>
              {netStatus.mode}
            </span>
          </div>
          {showNetworkMenu && (
            <div className="glass-panel" style={{ position: 'absolute', top: '100%', left: 0, marginTop: '8px', borderRadius: '16px', padding: '16px', minWidth: '240px', background: '#ffffff', color: '#1e293b', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px rgba(0,0,0,0.08)', zIndex: 100000 }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Network Setup</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {['LOCAL', 'SERVER', 'CLIENT'].map(mode => {
                  const isActive = netStatus.mode === mode;
                  return (
                    <button 
                      key={mode} 
                      onClick={() => { handleModeChange(mode); setShowNetworkMenu(false) }} 
                      style={{ 
                        padding: '10px 12px', 
                        background: isActive ? 'rgba(16, 185, 129, 0.08)' : '#f8fafc', 
                        color: isActive ? '#10b981' : '#475569', 
                        border: '1px solid', 
                        borderColor: isActive ? 'rgba(16, 185, 129, 0.2)' : '#e2e8f0', 
                        borderRadius: '8px', 
                        textAlign: 'left', 
                        cursor: 'pointer', 
                        fontSize: '13px', 
                        fontWeight: '600', 
                        transition: 'all 0.2s' 
                      }}
                    >
                      {mode === 'LOCAL' ? '💻 Local (Standalone)' : mode === 'SERVER' ? '📡 Main Server' : '🔗 Client Node'}
                    </button>
                  );
                })}
              </div>
              {netStatus.mode === 'SERVER' && <div style={{ marginTop: '12px', fontSize: '11px', color: '#64748b', textAlign: 'center', background: '#f1f5f9', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>Server IP: <strong style={{color:'#1e293b'}}>{netStatus.ip}</strong></div>}
              {netStatus.mode === 'CLIENT' && <div style={{ marginTop: '12px', fontSize: '11px', color: '#64748b', textAlign: 'center', background: '#f1f5f9', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>{netStatus.ip ? `Connected to: ${netStatus.ip}` : 'Searching for Server...'}</div>}
            </div>
          )}
        </div>
      )}

      {/* Center Card */}
      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '56px', fontWeight: '800', margin: '0 0 8px 0', color: '#10b981', letterSpacing: '-1.5px' }}>
            🌿 HomoeoStore
          </h1>
          <p style={{ fontSize: '16px', color: '#64748b', maxWidth: '400px', margin: '0 auto', lineHeight: '1.6', fontWeight: '500' }}>
            Enterprise billing and inventory management.
          </p>
        </div>

        {/* ── Setup Onboarding Screen (Option B) ── */}
        {isPinSetup ? (
          <div className="glass-panel" style={{ width: setupStep === 'ROLE_SELECT' ? '820px' : '480px', padding: '48px 40px', borderRadius: '24px', display: 'flex', flexDirection: 'column', transition: 'width 0.3s ease' }}>
            
            {setupStep === 'ROLE_SELECT' && (
              <div style={{ textAlign: 'center' }}>
                <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#0f2d1f', margin: '0 0 8px 0' }}>System Configuration Setup</h2>
                <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '40px' }}>Select the deployment role for this computer instance.</p>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
                  
                  {/* Standalone Card */}
                  <div onClick={() => selectSystemRole('LOCAL')} className="setup-card" style={{ padding: '28px 20px', borderRadius: '16px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ fontSize: '36px' }}>💻</div>
                    <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0f2d1f', margin: 0 }}>Standalone (Single PC)</h3>
                    <p style={{ fontSize: '12px', color: '#64748b', margin: 0, lineHeight: '1.5' }}>Ideal if you use the software on a single computer. Data is stored locally.</p>
                  </div>

                  {/* Main Server Card */}
                  <div onClick={() => selectSystemRole('SERVER')} className="setup-card" style={{ padding: '28px 20px', borderRadius: '16px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ fontSize: '36px' }}>📡</div>
                    <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0f2d1f', margin: 0 }}>Main Server</h3>
                    <p style={{ fontSize: '12px', color: '#64748b', margin: 0, lineHeight: '1.5' }}>Ideal for the shop's main PC. It hosts the database and lets other computers connect.</p>
                  </div>

                  {/* Client Card */}
                  <div onClick={() => selectSystemRole('CLIENT')} className="setup-card" style={{ padding: '28px 20px', borderRadius: '16px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ fontSize: '36px' }}>🔗</div>
                    <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0f2d1f', margin: 0 }}>Cashier Terminal</h3>
                    <p style={{ fontSize: '12px', color: '#64748b', margin: 0, lineHeight: '1.5' }}>Acts as a client. It auto-discovers and connects to the Main Server over Wi-Fi/LAN.</p>
                  </div>

                </div>
              </div>
            )}

            {setupStep === 'SET_PIN' && (
              <div style={{ position: 'relative', textAlign: 'center' }}>
                <button onClick={() => setSetupStep('ROLE_SELECT')} style={{ position: 'absolute', top: '-16px', left: '-16px', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', cursor: 'pointer', transition: 'all 0.2s' }} className="btn-hover">←</button>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🛡️</div>
                <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#0f2d1f', margin: '0 0 8px 0' }}>Set Admin Master PIN</h2>
                <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '32px' }}>Create a security PIN (4+ digits) to protect system configurations.</p>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <input className="pin-input" type="password" placeholder="Create new PIN" value={pin} onChange={(e) => setPin(e.target.value)} style={{ padding: '16px', fontSize: '24px', letterSpacing: '8px', textAlign: 'center', borderRadius: '16px', border: '1px solid #cbd5e1', outline: 'none', background: '#ffffff', color: '#1e293b' }} autoFocus />
                  {error && <div style={{ color: '#ef4444', fontSize: '14px', fontWeight: '600' }}>{error}</div>}
                  <button type="submit" style={{ padding: '16px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff', border: 'none', borderRadius: '16px', fontSize: '16px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)', transition: 'all 0.2s' }}>
                    Save PIN & Start Application
                  </button>
                </form>
              </div>
            )}

            {setupStep === 'SEARCHING_SERVER' && (
              <div style={{ position: 'relative', textAlign: 'center', padding: '12px 0' }}>
                <button onClick={handleResetSetup} style={{ position: 'absolute', top: '-16px', left: '-16px', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', cursor: 'pointer', transition: 'all 0.2s' }} className="btn-hover">←</button>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                  <div style={{ width: '48px', height: '48px', border: '4px solid #f3f3f3', borderTop: '4px solid #10b981', borderRadius: '50%', animation: 'spin 1.2s linear infinite' }} />
                  <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                </div>
                <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#0f2d1f', margin: '0 0 8px 0' }}>Network Auto-Discovery</h2>
                <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '16px', lineHeight: '1.5' }}>
                  Scanning your local network for the **Main Server**...
                </p>
                <div style={{ background: '#f1f5f9', padding: '12px 24px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px', fontWeight: '700', color: '#475569', letterSpacing: '0.5px' }}>
                  Make sure the Main Server app is open on your network.
                </div>
              </div>
            )}

            {setupStep === 'SERVER_UNCONFIGURED' && (
              <div style={{ position: 'relative', textAlign: 'center', padding: '12px 0' }}>
                <button onClick={handleResetSetup} style={{ position: 'absolute', top: '-16px', left: '-16px', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', cursor: 'pointer', transition: 'all 0.2s' }} className="btn-hover">←</button>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
                <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#b45309', margin: '0 0 8px 0' }}>Main Server Unconfigured</h2>
                <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px', lineHeight: '1.6' }}>
                  We discovered the Main Server at <strong style={{color: '#1e293b'}}>{netStatus.ip}</strong>, but it does not have a Master PIN configured yet.
                </p>
                <div style={{ background: '#fffbeb', padding: '16px', borderRadius: '12px', border: '1px solid #fde68a', fontSize: '13px', color: '#92400e', lineHeight: '1.5', marginBottom: '24px' }}>
                  Please complete the initial Master PIN setup on the <strong>Main Server Computer</strong> first, then reload this Cashier Terminal.
                </div>
                <button onClick={() => setSetupStep('SEARCHING_SERVER')} style={{ padding: '12px 24px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' }}>
                  🔄 Retry connection
                </button>
              </div>
            )}

          </div>
        ) : (
          /* ── Normal Login / Role Selection Screen ── */
          <div className="glass-panel" style={{ width: '440px', padding: '48px 40px', borderRadius: '24px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            
            {(!role) ? (
              <div style={{ textAlign: 'center' }}>
                <h2 style={{ fontSize: '18px', color: '#1e293b', margin: '0 0 32px 0', fontWeight: '700', letterSpacing: '0.02em' }}>Select your role</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <button onClick={() => setRole('admin')} className="btn-hover" style={{ padding: '16px 24px', borderRadius: '9999px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', transition: 'all 0.2s' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="#10b981" style={{ flexShrink: 0 }}>
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                    Login as Admin
                  </button>
                  <button onClick={() => setRole('cashier')} className="btn-hover" style={{ padding: '16px 24px', borderRadius: '9999px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', transition: 'all 0.2s' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <circle cx="9" cy="21" r="1" fill="#10b981" />
                      <circle cx="20" cy="21" r="1" fill="#10b981" />
                      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                    </svg>
                    Login as Cashier
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <button onClick={() => { setRole(null); setPin(''); setError(''); }} style={{ position: 'absolute', top: '-24px', left: '-24px', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', cursor: 'pointer', transition: 'all 0.2s' }} className="btn-hover">←</button>
                
                <div style={{ textAlign: 'center' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                    {role === 'admin' ? (
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="#10b981">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                      </svg>
                    ) : (
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="9" cy="21" r="1" fill="#10b981" />
                        <circle cx="20" cy="21" r="1" fill="#10b981" />
                        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                      </svg>
                    )}
                  </div>
                  <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#1e293b', margin: '0 0 8px 0' }}>{role === 'admin' ? 'Admin Login' : 'Cashier Login'}</h2>
                  <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '32px' }}>Please enter your PIN to continue.</p>

                  <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <input className="pin-input" type="password" placeholder="Enter PIN" value={pin} onChange={(e) => setPin(e.target.value)} style={{ padding: '16px', fontSize: '24px', letterSpacing: '4px', textAlign: 'center', borderRadius: '16px', border: '1px solid #cbd5e1', outline: 'none', background: '#ffffff', color: '#1e293b', transition: 'all 0.2s' }} autoFocus />
                    {error && <div style={{ color: '#ef4444', fontSize: '14px', fontWeight: '600' }}>{error}</div>}
                    <button type="submit" style={{ padding: '16px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff', border: 'none', borderRadius: '16px', fontSize: '16px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)', transition: 'all 0.2s' }}>
                      Unlock Dashboard
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}
        
        <div style={{ position: 'absolute', bottom: '24px', textAlign: 'center', fontSize: '10px', color: '#94a3b8', fontWeight: '700', letterSpacing: '0.1em' }}>
          HOMOEOSTORE ERP V1.0.0
        </div>
      </div>
    </div>
  )
}


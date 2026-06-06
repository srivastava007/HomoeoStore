import { useState, useEffect } from 'react'
import DateInput from '../components/DateInput'

export default function StoreProfile() {
    const [profile, setProfile] = useState({
        store_name: '',
        address_line1: '',
        address_line2: '',
        address_line3: '',
        phone: '',
        email: '',
        gstin: '',
        dl_no: '',
        dl_expiry: '',
        mfg_lic_no: '',
        bank_name: '',
        account_number: '',
        ifsc_code: '',
        qr_code: ''
    })

    const [saving, setSaving] = useState(false)
    const [toast, setToast] = useState({ show: false, msg: '', type: 'success' })
    const [isLocked, setIsLocked] = useState(true)
    const [pinInput, setPinInput] = useState('')
    const [isPinSetup, setIsPinSetup] = useState(false)
    const [checkingLock, setCheckingLock] = useState(true)
    const [cashierPinInput, setCashierPinInput] = useState('')
    const [savingCashierPin, setSavingCashierPin] = useState(false)

    // Thermal Printer state
    const [systemPrinters, setSystemPrinters] = useState([])
    const [thermalPrinter, setThermalPrinter] = useState({ name: '', size: '80mm' })
    const [savingPrinter, setSavingPrinter] = useState(false)

    function showToast(msg, type = 'success') {
        setToast({ show: true, msg, type })
        setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000)
    }

    function handleQrUpload(e) {
        const file = e.target.files[0]
        if (!file) return
        if (file.size > 2 * 1024 * 1024) return showToast('QR Code image must be less than 2MB', 'error')
        const reader = new FileReader()
        reader.onload = (ev) => {
            setProfile(prev => ({ ...prev, qr_code: ev.target.result }))
        }
        reader.readAsDataURL(file)
    }

    async function handleUnlock(e) {
        e.preventDefault()
        if (isPinSetup) {
            if (pinInput.length < 4) return showToast('PIN must be at least 4 characters', 'error')
            await window.api.updateAdminPin(pinInput)
            setIsPinSetup(false)
            setIsLocked(false)
            showToast('Master PIN set successfully!')
        } else {
            const res = await window.api.verifyAdminPin(pinInput)
            if (res.success) {
                setIsLocked(false)
                showToast('Unlocked successfully!')
            } else {
                showToast('Incorrect PIN', 'error')
                setPinInput('')
            }
        }
    }

    async function loadProfile() {
        try {
            const data = await window.api.getStoreProfile()
            if (data) {
                setProfile({
                    store_name: data.store_name || '',
                    address_line1: data.address_line1 || '',
                    address_line2: data.address_line2 || '',
                    address_line3: data.address_line3 || '',
                    phone: data.phone || '',
                    email: data.email || '',
                    gstin: data.gstin || '',
                    dl_no: data.dl_no || '',
                    dl_expiry: data.dl_expiry || '',
                    mfg_lic_no: data.mfg_lic_no || '',
                    bank_name: data.bank_name || '',
                    account_number: data.account_number || '',
                    ifsc_code: data.ifsc_code || '',
                    qr_code: data.qr_code || ''
                })
            }
            
            const pinCheck = await window.api.verifyAdminPin('')
            if (pinCheck.message === 'No PIN set') {
                setIsPinSetup(true)
            }
            setCheckingLock(false)

            try {
                const [pName, pSize, printers] = await Promise.all([
                    window.api.getSetting('thermal_printer_name'),
                    window.api.getSetting('thermal_printer_size'),
                    window.api.getPrinters()
                ])
                setThermalPrinter({ name: pName || '', size: pSize || '80mm' })
                setSystemPrinters(printers || [])
            } catch (err) {
                console.error('Failed to load printer settings', err)
            }
        } catch (err) {
            console.error('Failed to load store profile:', err)
            showToast('Failed to load credentials', 'error')
            setCheckingLock(false)
        }
    }

    useEffect(() => {
        loadProfile()
    }, [])

    async function handleSave(e) {
        e.preventDefault()
        if (!profile.store_name.trim()) {
            return showToast('Store Name is required', 'error')
        }

        setSaving(true)
        try {
            const result = await window.api.updateStoreProfile({
                store_name: profile.store_name.trim(),
                address_line1: profile.address_line1.trim(),
                address_line2: profile.address_line2.trim(),
                address_line3: profile.address_line3.trim(),
                phone: profile.phone.trim(),
                email: profile.email.trim(),
                gstin: profile.gstin.trim().toUpperCase(),
                dl_no: profile.dl_no.trim(),
                dl_expiry: profile.dl_expiry || null,
                mfg_lic_no: profile.mfg_lic_no.trim(),
                bank_name: profile.bank_name.trim(),
                account_number: profile.account_number.trim(),
                ifsc_code: profile.ifsc_code.trim().toUpperCase(),
                qr_code: profile.qr_code || ''
            })
            
            if (result.changes > 0) {
                showToast('Registration credentials updated successfully!')
            } else {
                showToast('No changes detected', 'info')
            }
        } catch (err) {
            console.error('Failed to update store profile:', err)
            showToast('Database update failed', 'error')
        } finally {
            setSaving(false)
        }
    }

    async function handleSaveCashierPin(e) {
        e.preventDefault()
        if (cashierPinInput.length < 4) return showToast('Cashier PIN must be at least 4 characters', 'error')
        setSavingCashierPin(true)
        try {
            await window.api.updateCashierPin(cashierPinInput)
            setSavingCashierPin(false)
            setCashierPinInput('')
            showToast('Cashier PIN updated successfully!')
        } catch (err) {
            showToast('Failed to update Cashier PIN', 'error')
        }
    }

    async function handleSavePrinter(e) {
        e.preventDefault()
        setSavingPrinter(true)
        await window.api.setSetting('thermal_printer_name', thermalPrinter.name)
        await window.api.setSetting('thermal_printer_size', thermalPrinter.size)
        setSavingPrinter(false)
        showToast('Thermal Printer configuration saved!')
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%', fontFamily: 'Outfit, sans-serif' }}>
            
            {/* Header section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0', letterSpacing: '-0.5px' }}>
                        Registered To {profile.store_name ? profile.store_name : 'Store Profile'}
                    </h1>
                    <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>Configure software license billing credentials & drug licenses</p>
                </div>
                <div style={{
                    background: '#ecfdf5',
                    color: '#059669',
                    padding: '8px 16px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '800',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 2px 10px rgba(5, 150, 105, 0.1)'
                }}>
                    <span style={{ display: 'inline-block', width: '8px', height: '8px', background: '#059669', borderRadius: '50%', boxShadow: '0 0 8px #059669' }}></span>
                    Licensed Instance
                </div>
            </div>

            {/* Lock Screen UI */}
            {!checkingLock && isLocked && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#fff', borderRadius: '24px', padding: '80px 20px', border: '1px solid #e2e8f0', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.05)', marginTop: '20px' }}>
                    <div style={{ fontSize: '56px', marginBottom: '24px', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' }}>{isPinSetup ? '🛡️' : '🔒'}</div>
                    <h3 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: '0 0 12px 0' }}>
                        {isPinSetup ? 'Set Master PIN' : 'Enter Master PIN'}
                    </h3>
                    <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '32px', textAlign: 'center', maxWidth: '340px', lineHeight: '1.5' }}>
                        {isPinSetup 
                            ? 'Create a Master PIN to protect your business credentials from unauthorized access.' 
                            : 'This page is highly secured. Please enter your Master PIN to view or edit business credentials.'}
                    </p>
                    <form onSubmit={handleUnlock} style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '280px' }}>
                        <input
                            type="password"
                            placeholder={isPinSetup ? "Create a 4+ digit PIN" : "Enter PIN"}
                            value={pinInput}
                            onChange={e => setPinInput(e.target.value)}
                            style={{ ...inputStyle, textAlign: 'center', letterSpacing: '8px', fontSize: '24px', padding: '16px', borderRadius: '12px' }}
                            autoFocus
                        />
                        <button type="submit" style={{
                            background: '#0f172a', color: '#fff', border: 'none', borderRadius: '12px', padding: '16px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(15, 23, 42, 0.2)'
                        }} className="btn-hover">
                            {isPinSetup ? 'Secure Profile' : 'Unlock Profile'}
                        </button>
                    </form>
                </div>
            )}

            {/* Main Content Area */}
            {!checkingLock && !isLocked && (
            <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                
                {/* FORM COLUMN */}
                <form onSubmit={handleSave} style={{
                    flex: '1.2',
                    minWidth: '450px',
                    background: '#fff',
                    borderRadius: '24px',
                    padding: '32px',
                    boxShadow: '0 10px 40px -10px rgba(0,0,0,0.03)',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '24px'
                }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', borderBottom: '2px solid #f1f5f9', paddingBottom: '16px', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '20px' }}>🏢</span> Business Information
                    </h3>

                    {/* Store name */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Store / Pharmacy Name <span style={{ color: '#ef4444' }}>*</span></label>
                        <input
                            type="text"
                            required
                            value={profile.store_name}
                            onChange={e => setProfile({ ...profile, store_name: e.target.value })}
                            placeholder="Enter legal pharmacy name"
                            style={inputStyle}
                        />
                    </div>

                    {/* Addresses */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                        <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Store Address</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <input
                                    type="text"
                                    value={profile.address_line1}
                                    onChange={e => setProfile({ ...profile, address_line1: e.target.value })}
                                    placeholder="Shop / Building No, Street"
                                    style={inputStyle}
                                />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <input
                                        type="text"
                                        value={profile.address_line2}
                                        onChange={e => setProfile({ ...profile, address_line2: e.target.value })}
                                        placeholder="Locality / Area"
                                        style={inputStyle}
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <input
                                        type="text"
                                        value={profile.address_line3}
                                        onChange={e => setProfile({ ...profile, address_line3: e.target.value })}
                                        placeholder="City, State, Pin Code"
                                        style={inputStyle}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* GSTIN & Contacts */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>GSTIN Number</label>
                            <input
                                type="text"
                                maxLength={15}
                                value={profile.gstin}
                                onChange={e => setProfile({ ...profile, gstin: e.target.value.toUpperCase() })}
                                placeholder="e.g. 07AACCR1234F1Z5"
                                style={inputStyle}
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mfg. License No (if any)</label>
                            <input
                                type="text"
                                value={profile.mfg_lic_no}
                                onChange={e => setProfile({ ...profile, mfg_lic_no: e.target.value })}
                                placeholder="Manufacturing Lic No"
                                style={inputStyle}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contact Phone</label>
                            <input
                                type="text"
                                value={profile.phone}
                                onChange={e => setProfile({ ...profile, phone: e.target.value })}
                                placeholder="e.g. +91 98765 43210"
                                style={inputStyle}
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email Address</label>
                            <input
                                type="email"
                                value={profile.email}
                                onChange={e => setProfile({ ...profile, email: e.target.value })}
                                placeholder="e.g. pharmacy@gmail.com"
                                style={inputStyle}
                            />
                        </div>
                    </div>

                    <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', borderBottom: '2px solid #f1f5f9', paddingBottom: '16px', margin: '8px 0 0 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '20px' }}>💊</span> Licensing Credentials
                    </h3>

                    {/* Drug License No & Expiry */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Drug License (D.L.) No.</label>
                            <input
                                type="text"
                                value={profile.dl_no}
                                onChange={e => setProfile({ ...profile, dl_no: e.target.value })}
                                placeholder="e.g. DL-12345/W, DL-12346/R"
                                style={inputStyle}
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>D.L. Expiry Date</label>
                            <DateInput 
                                value={profile.dl_expiry}
                                onChange={e => setProfile({ ...profile, dl_expiry: e.target.value })}
                                style={inputStyle}
                            />
                        </div>
                    </div>

                    <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', borderBottom: '2px solid #f1f5f9', paddingBottom: '16px', margin: '8px 0 0 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '20px' }}>🏦</span> Bank Details
                    </h3>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bank Name</label>
                            <input
                                type="text"
                                value={profile.bank_name}
                                onChange={e => setProfile({ ...profile, bank_name: e.target.value })}
                                placeholder="e.g. HDFC BANK LTD"
                                style={inputStyle}
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Account Number</label>
                            <input
                                type="text"
                                value={profile.account_number}
                                onChange={e => setProfile({ ...profile, account_number: e.target.value })}
                                placeholder="e.g. 12345678901234"
                                style={inputStyle}
                            />
                        </div>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>IFSC Code</label>
                            <input
                                type="text"
                                value={profile.ifsc_code}
                                onChange={e => setProfile({ ...profile, ifsc_code: e.target.value.toUpperCase() })}
                                placeholder="e.g. HDFC0001234"
                                style={inputStyle}
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Payment QR Code (Optional)</label>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                <input type="file" accept="image/*" onChange={handleQrUpload} style={{ ...inputStyle, padding: '8px' }} />
                                {profile.qr_code && (
                                    <button type="button" onClick={() => setProfile({ ...profile, qr_code: '' })} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 16px', fontWeight: '700', cursor: 'pointer' }}>Remove</button>
                                )}
                            </div>
                            {profile.qr_code && (
                                <img src={profile.qr_code} alt="QR Code Preview" style={{ width: '100px', height: '100px', objectFit: 'contain', border: '1px solid #cbd5e1', borderRadius: '8px', marginTop: '8px' }} />
                            )}
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={saving}
                        style={{
                            marginTop: '16px',
                            background: '#10b981',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '12px',
                            padding: '16px',
                            fontSize: '15px',
                            fontWeight: '800',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            boxShadow: '0 4px 14px 0 rgba(16, 185, 129, 0.39)'
                        }}
                        className="btn-hover-green"
                    >
                        {saving ? '🔄 SECURING CREDENTIALS...' : '💾 SAVE STORE PROFILE'}
                    </button>
                </form>

                {/* CERTIFICATE PREVIEW COLUMN */}
                <div style={{
                    flex: '0.8',
                    minWidth: '380px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '24px'
                }}>
                    
                    {/* Live Preview Title */}
                    <div style={{ fontSize: '14px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ display: 'inline-block', width: '8px', height: '8px', background: '#dc2626', borderRadius: '50%', boxShadow: '0 0 8px #dc2626', animation: 'pulse 2s infinite' }}></span>
                        Dynamic License Preview
                    </div>

                    {/* Software Registration Certificate Box */}
                    <div style={{
                        background: 'linear-gradient(135deg, #020617 0%, #0f172a 100%)',
                        borderRadius: '24px',
                        padding: '32px',
                        boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.4), 0 10px 20px -5px rgba(0, 0, 0, 0.3)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        position: 'relative',
                        color: '#fff',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        minHeight: '460px',
                        overflow: 'hidden',
                        transition: 'transform 0.3s ease',
                    }}
                    className="license-card"
                    >
                        
                        {/* Certificate background watermarks */}
                        <div style={{
                            position: 'absolute',
                            right: '-30px',
                            top: '-30px',
                            width: '200px',
                            height: '200px',
                            background: 'radial-gradient(circle, rgba(16,185,129,0.15) 0%, rgba(0,0,0,0) 70%)',
                            borderRadius: '50%',
                            pointerEvents: 'none'
                        }}></div>
                        
                        <div style={{
                            position: 'absolute',
                            left: '-30px',
                            bottom: '-30px',
                            width: '250px',
                            height: '250px',
                            background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, rgba(0,0,0,0) 70%)',
                            borderRadius: '50%',
                            pointerEvents: 'none'
                        }}></div>

                        {/* Top Ribbon / Border */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            position: 'relative',
                            zIndex: 2
                        }}>
                            <div>
                                <span style={{ fontSize: '11px', color: '#10b981', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '2px' }}>
                                    Enterprise Edition
                                </span>
                                <h4 style={{ margin: '4px 0 0 0', fontSize: '18px', fontWeight: '800', letterSpacing: '1px', color: '#f8fafc' }}>
                                    SOFTWARE LICENSE
                                </h4>
                            </div>
                            <div style={{
                                width: '48px',
                                height: '48px',
                                background: 'linear-gradient(135deg, #fcd34d 0%, #f59e0b 100%)',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 4px 14px rgba(245, 158, 11, 0.4), inset 0 2px 4px rgba(255,255,255,0.5)',
                                fontSize: '20px',
                                border: '3px solid rgba(255,255,255,0.2)'
                            }}>
                                🏅
                            </div>
                        </div>

                        {/* Certificate body */}
                        <div style={{ margin: '32px 0', display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', zIndex: 2 }}>
                            <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', fontStyle: 'italic', letterSpacing: '0.5px', lineHeight: '1.5' }}>
                                This system instance and its associated financial ledgers are legally registered and licensed to operate under the title:
                            </p>

                            {/* Registered Name */}
                            <h2 style={{
                                margin: '8px 0',
                                fontSize: '26px',
                                fontWeight: '800',
                                color: '#f8fafc',
                                textShadow: '0 2px 10px rgba(0,0,0,0.5)',
                                wordBreak: 'break-word',
                                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                                paddingBottom: '16px',
                                letterSpacing: '0.5px'
                            }}>
                                {profile.store_name ? profile.store_name.toUpperCase() : 'YOUR STORE NAME'}
                            </h2>

                            {/* Details block */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', color: '#cbd5e1' }}>
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <span style={{ width: '90px', color: '#64748b', fontWeight: '600', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>GSTIN:</span>
                                    <span style={{ fontWeight: '700', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '4px 8px', borderRadius: '6px' }}>{profile.gstin || 'N/A'}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <span style={{ width: '90px', color: '#64748b', fontWeight: '600', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>DL No:</span>
                                    <span style={{ fontWeight: '600', color: '#fff' }}>{profile.dl_no || 'N/A'}</span>
                                </div>
                                {profile.dl_expiry && (
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <span style={{ width: '90px', color: '#64748b', fontWeight: '600', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>DL Expiry:</span>
                                        <span style={{ fontWeight: '700', color: '#f59e0b' }}>
                                            {new Date(profile.dl_expiry).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </span>
                                    </div>
                                )}
                                <div style={{ display: 'flex', marginTop: '4px' }}>
                                    <span style={{ width: '90px', color: '#64748b', fontWeight: '600', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', paddingTop: '2px' }}>Location:</span>
                                    <span style={{ flex: 1, lineHeight: '1.5', fontWeight: '500' }}>
                                        {[profile.address_line1, profile.address_line2, profile.address_line3].filter(Boolean).join(', ') || 'N/A'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Certificate footer status */}
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            padding: '16px',
                            borderRadius: '12px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            position: 'relative',
                            zIndex: 2,
                            backdropFilter: 'blur(10px)',
                            border: '1px solid rgba(255, 255, 255, 0.05)'
                        }}>
                            <div>
                                <div style={{ color: '#64748b', fontSize: '10px', fontWeight: '800', letterSpacing: '1px' }}>AUTHENTICATION KEY</div>
                                <div style={{ fontFamily: 'monospace', color: '#94a3b8', marginTop: '4px', letterSpacing: '1px', fontSize: '12px' }}>
                                    HS-ERP-{profile.gstin ? profile.gstin.substring(0, 4).toUpperCase() : 'XXXX'}-{profile.phone ? profile.phone.substring(0, 4) : 'YYYY'}-V1
                                </div>
                            </div>
                            <div style={{
                                background: 'rgba(16, 185, 129, 0.1)',
                                color: '#10b981',
                                padding: '6px 12px',
                                borderRadius: '8px',
                                fontWeight: '800',
                                border: '1px solid rgba(16, 185, 129, 0.2)',
                                letterSpacing: '0.5px',
                                fontSize: '11px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}>
                                <span style={{ display: 'inline-block', width: '6px', height: '6px', background: '#10b981', borderRadius: '50%', boxShadow: '0 0 6px #10b981' }}></span>
                                ACTIVE & VALID
                            </div>
                        </div>

                    </div>
                    
                    <button
                        onClick={() => {
                            setIsPinSetup(true);
                            setIsLocked(true);
                            setPinInput('');
                        }}
                        style={{
                            background: '#fff',
                            color: '#475569',
                            border: '1px dashed #cbd5e1',
                            borderRadius: '12px',
                            padding: '14px',
                            fontSize: '14px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                        }}
                        className="btn-hover-outline"
                    >
                        🔑 Change Master PIN
                    </button>

                    <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 10px rgba(0,0,0,0.02)' }}>
                        <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '18px' }}>🛒</span> Cashier PIN Access
                        </h4>
                        <form onSubmit={handleSaveCashierPin} style={{ display: 'flex', gap: '12px' }}>
                            <input 
                                type="text"
                                placeholder="New Cashier PIN"
                                value={cashierPinInput}
                                onChange={e => setCashierPinInput(e.target.value)}
                                style={{ ...inputStyle, letterSpacing: '4px', textAlign: 'center', width: '160px', fontSize: '16px', fontWeight: '700' }}
                                maxLength={6}
                            />
                            <button 
                                type="submit"
                                disabled={savingCashierPin || cashierPinInput.length < 4}
                                style={{
                                    background: '#2563eb', color: '#fff', border: 'none', borderRadius: '10px', padding: '0 20px', fontSize: '14px', fontWeight: '700', cursor: cashierPinInput.length >= 4 ? 'pointer' : 'not-allowed', opacity: cashierPinInput.length >= 4 ? 1 : 0.6,
                                    transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)'
                                }}
                                className={cashierPinInput.length >= 4 ? "btn-hover-blue" : ""}
                            >
                                {savingCashierPin ? 'Saving...' : 'Set PIN'}
                            </button>
                        </form>
                        <p style={{ margin: '12px 0 0 0', fontSize: '12px', color: '#64748b', lineHeight: '1.5' }}>
                            Default Cashier PIN is <strong>1234</strong>. Change it here to prevent unauthorized access to the billing screen.
                        </p>
                    </div>

                    <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 10px rgba(0,0,0,0.02)', marginTop: '24px' }}>
                        <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '18px' }}>🖨️</span> Thermal Printer Settings
                        </h4>
                        <form onSubmit={handleSavePrinter} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Select Printer</label>
                                <select 
                                    value={thermalPrinter.name} 
                                    onChange={e => setThermalPrinter(prev => ({ ...prev, name: e.target.value }))}
                                    style={{ ...inputStyle, background: '#fff', fontSize: '14px' }}
                                >
                                    <option value="">-- No Printer Selected --</option>
                                    {systemPrinters.map((p, idx) => (
                                        <option key={idx} value={p.name}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Paper Size</label>
                                <select 
                                    value={thermalPrinter.size} 
                                    onChange={e => setThermalPrinter(prev => ({ ...prev, size: e.target.value }))}
                                    style={{ ...inputStyle, background: '#fff', fontSize: '14px' }}
                                >
                                    <option value="58mm">58mm (2-inch)</option>
                                    <option value="80mm">80mm (3-inch)</option>
                                </select>
                            </div>
                            <button 
                                type="submit"
                                disabled={savingPrinter}
                                style={{
                                    alignSelf: 'flex-start',
                                    background: '#0f172a', color: '#fff', border: 'none', borderRadius: '10px', padding: '12px 24px', fontSize: '14px', fontWeight: '700', cursor: 'pointer',
                                    transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(15, 23, 42, 0.2)'
                                }}
                                className="btn-hover-black"
                            >
                                {savingPrinter ? 'Saving...' : 'Save Printer Settings'}
                            </button>
                        </form>
                    </div>

                </div>

            </div>
            )}

            {/* CSS styles inside the component */}
            <style>{`
                input:focus {
                    border-color: #3b82f6 !important;
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important;
                    background: #fff !important;
                }
                .btn-hover:hover {
                    background: #1e293b !important;
                    transform: translateY(-2px);
                }
                .btn-hover-green:hover:not(:disabled) {
                    background: #059669 !important;
                    box-shadow: 0 6px 20px rgba(5, 150, 105, 0.4) !important;
                    transform: translateY(-2px);
                }
                .btn-hover-blue:hover:not(:disabled) {
                    background: #1d4ed8 !important;
                    transform: translateY(-2px);
                }
                .btn-hover-outline:hover {
                    border-color: #94a3b8 !important;
                    background: #f1f5f9 !important;
                }
                .license-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                }
                @keyframes pulse {
                    0% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.4); }
                    70% { box-shadow: 0 0 0 6px rgba(220, 38, 38, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0); }
                }
            `}</style>

            {/* Custom Toast Alert */}
            {toast.show && (
                <div style={{
                    position: 'fixed',
                    bottom: '32px',
                    right: '32px',
                    background: toast.type === 'error' ? '#fef2f2' : toast.type === 'info' ? '#eff6ff' : '#f0fdf4',
                    border: `1px solid ${toast.type === 'error' ? '#fecaca' : toast.type === 'info' ? '#bfdbfe' : '#bbf7d0'}`,
                    color: toast.type === 'error' ? '#991b1b' : toast.type === 'info' ? '#1e40af' : '#166534',
                    padding: '16px 24px',
                    borderRadius: '12px',
                    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    fontSize: '15px',
                    fontWeight: '700',
                    zIndex: 99999,
                    animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                }}>
                    <span style={{ fontSize: '20px' }}>{toast.type === 'error' ? '❌' : toast.type === 'info' ? 'ℹ️' : '✅'}</span>
                    <span>{toast.msg}</span>
                    <style>{`
                        @keyframes slideIn {
                            from { transform: translateX(100px); opacity: 0; }
                            to { transform: translateX(0); opacity: 1; }
                        }
                    `}</style>
                </div>
            )}
        </div>
    )
}

// Styling tokens
const inputStyle = {
    padding: '12px 16px',
    borderRadius: '10px',
    border: '1px solid #cbd5e1',
    fontFamily: 'Outfit, sans-serif',
    fontSize: '14px',
    fontWeight: '500',
    color: '#0f172a',
    outline: 'none',
    width: '100%',
    background: '#f8fafc',
    transition: 'all 0.2s ease'
}

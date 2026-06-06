import { useState, useEffect, useMemo } from 'react'
import Select from 'react-select'

export default function LowStockReport() {
    const [lowStock, setLowStock] = useState([])
    const [companies, setCompanies] = useState([])
    const [selectedCompany, setSelectedCompany] = useState('')
    const [loading, setLoading] = useState(true)
    const [exportingPdf, setExportingPdf] = useState(false)

    // Auto-PO states
    const [poModalVisible, setPoModalVisible] = useState(false)
    const [suppliers, setSuppliers] = useState([])
    const [selectedSupplier, setSelectedSupplier] = useState('')
    const [poItems, setPoItems] = useState([])
    const [isGeneratingPo, setIsGeneratingPo] = useState(false)
    const [storeProfile, setStoreProfile] = useState({})
    const [errorMsg, setErrorMsg] = useState('')
    const [toast, setToast] = useState({ show: false, msg: '', type: 'success' })

    function showToast(msg, type = 'success') {
        setToast({ show: true, msg, type })
        setTimeout(() => setToast({ show: false, msg: '', type: 'success' }), 3000)
    }

    useEffect(() => {
        function handleEsc(e) {
            if (e.key === 'Escape' && poModalVisible) {
                setPoModalVisible(false)
            }
        }
        window.addEventListener('keydown', handleEsc)
        return () => window.removeEventListener('keydown', handleEsc)
    }, [poModalVisible])

    useEffect(() => {
        async function load() {
            setLoading(true)
            try {
                const [ls, comps, supps, profile] = await Promise.all([
                    window.api.getLowStock(),
                    window.api.getCompanies(),
                    window.api.getSuppliers(),
                    window.api.getStoreProfile()
                ])
                setLowStock(ls || [])
                setCompanies(comps || [])
                setSuppliers(supps || [])
                setStoreProfile(profile || {})
            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    const filteredStock = useMemo(() => {
        if (!selectedCompany) return lowStock
        return lowStock.filter(m => (m.company || '').toLowerCase() === selectedCompany.toLowerCase())
    }, [lowStock, selectedCompany])

    async function handleExportPDF() {
        if (filteredStock.length === 0) {
            showToast('No items to export for the selected filters.', 'error')
            return
        }
        
        setExportingPdf(true)
        document.body.classList.add('is-full-print')
        await new Promise(r => setTimeout(r, 500))
        
        const date = new Date().toISOString().split('T')[0]
        const defaultName = `Low_Stock_Report_${selectedCompany || 'All'}_${date}.pdf`
        
        try {
            const res = await window.api.saveToPdf(defaultName, 'Export Low Stock Report', true)
            if (res.success) {
                // optional success message
            } else if (!res.canceled) {
                showToast(res.error || 'Failed to generate PDF document.', 'error')
            }
        } catch (err) {
            console.error('PDF export error:', err)
            showToast('An unexpected system error occurred during PDF generation.', 'error')
        } finally {
            document.body.classList.remove('is-full-print')
            setExportingPdf(false)
        }
    }

    function handleOpenPoModal() {
        if (filteredStock.length === 0) {
            showToast('No low stock items available to order.', 'error')
            return
        }
        const initialItems = filteredStock.map(m => ({
            ...m,
            orderQuantity: ''
        }))
        setPoItems(initialItems)
        setSelectedSupplier('')
        setErrorMsg('')
        setPoModalVisible(true)
    }

    async function handleGeneratePo() {
        setErrorMsg('')
        
        const itemsToOrder = poItems.filter(i => Number(i.orderQuantity) > 0)
        
        if (itemsToOrder.length === 0) {
            setErrorMsg('Please enter an order quantity for at least one item.')
            return
        }

        setIsGeneratingPo(true)
        try {
            const supplier = selectedSupplier 
                ? suppliers.find(s => s.id.toString() === selectedSupplier.toString()) 
                : { name: 'Distributor', id: null, phone: '', address: '' }
            
            const poData = {
                supplier_name: supplier.name,
                supplier_contact: supplier.phone || supplier.address || '',
                notes: 'Auto-generated PO from Low Stock Report.',
                items: itemsToOrder.map(i => ({
                    medicine_id: i.id,
                    medicine_name: i.name,
                    company: i.company,
                    potency: i.potency,
                    packing: i.unit,
                    quantity: Number(i.orderQuantity)
                }))
            }

            const res = await window.api.exportPoPdf(poData, storeProfile)
            
            if (res.success) {
                // Save PO to database
                await window.api.createPurchaseOrder({
                    supplier_id: supplier.id,
                    notes: poData.notes,
                    items: poData.items.map(i => ({
                        medicine_id: i.medicine_id,
                        quantity_ordered: i.quantity,
                        unit_price: 0
                    }))
                })
                showToast('Purchase Order PDF saved successfully!', 'success')
                setPoModalVisible(false)
            } else if (!res.canceled) {
                setErrorMsg(res.error || 'Failed to generate PO PDF')
            }
        } catch (e) {
            console.error(e)
            setErrorMsg('An error occurred while generating the PO.')
        } finally {
            setIsGeneratingPo(false)
        }
    }

    if (loading) {
        return <div style={{ padding: '24px', color: '#6b7280' }}>Loading low stock data...</div>
    }

    return (
        <>
            {/* Toast Notification */}
            {toast.show && (
                <div style={{ position: 'fixed', bottom: '24px', right: '24px', background: toast.type === 'success' ? '#10b981' : '#ef4444', color: '#fff', padding: '12px 24px', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', zIndex: 9999, fontWeight: '600', fontFamily: 'Outfit, sans-serif' }}>
                    {toast.msg}
                </div>
            )}
            {/* Print Only Report */}
            <div className="print-only-report" style={{ padding: '20px', background: 'white', color: 'black', fontFamily: 'sans-serif' }}>
                <h1 style={{ textAlign: 'center', marginBottom: '5px', fontSize: '20px' }}>Low Stock Report</h1>
                <p style={{ textAlign: 'center', marginBottom: '20px', fontSize: '12px', color: '#555' }}>
                    Generated on {new Date().toLocaleDateString('en-IN')}
                    {selectedCompany ? ` | Company: ${selectedCompany}` : ' | All Companies'}
                </p>
                
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid black' }}>
                            <th style={{ textAlign: 'left', padding: '8px' }}>Company</th>
                            <th style={{ textAlign: 'left', padding: '8px' }}>Medicine Name</th>
                            <th style={{ textAlign: 'left', padding: '8px' }}>Potency</th>
                            <th style={{ textAlign: 'left', padding: '8px' }}>Packing</th>
                            <th style={{ textAlign: 'center', padding: '8px' }}>Current Stock</th>
                            <th style={{ textAlign: 'center', padding: '8px' }}>Min Level</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredStock.map(m => (
                            <tr key={m.id} style={{ borderBottom: '1px solid #ddd' }}>
                                <td style={{ padding: '8px' }}>{m.company || '-'}</td>
                                <td style={{ padding: '8px', fontWeight: 'bold' }}>{m.name}</td>
                                <td style={{ padding: '8px' }}>{m.potency || '-'}</td>
                                <td style={{ padding: '8px' }}>{m.unit || '-'}</td>
                                <td style={{ padding: '8px', textAlign: 'center', color: m.stock_quantity === 0 ? 'red' : 'black', fontWeight: m.stock_quantity === 0 ? 'bold' : 'normal' }}>
                                    {m.stock_quantity}
                                </td>
                                <td style={{ padding: '8px', textAlign: 'center' }}>{m.low_stock_threshold}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Standard Interactive UI */}
            <div className="no-print-area" style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '4px' }}>
                    <div>
                        <h1 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>Low Stock Report</h1>
                        <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', fontWeight: '500' }}>
                            Medicines that are below their minimum reorder levels.
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <Select
                            value={{ value: selectedCompany, label: selectedCompany || 'All Companies' }}
                            onChange={selectedOption => setSelectedCompany(selectedOption.value)}
                            options={[
                                { value: '', label: 'All Companies' },
                                ...companies.map(c => ({ value: c.name, label: c.name }))
                            ]}
                            styles={{
                                control: (base, state) => ({
                                    ...base,
                                    borderRadius: '6px',
                                    borderColor: state.isFocused ? '#3b82f6' : '#cbd5e1',
                                    boxShadow: state.isFocused ? '0 0 0 1px #3b82f6' : 'none',
                                    fontSize: '13px',
                                    minWidth: '220px',
                                    fontFamily: 'Outfit, sans-serif',
                                    cursor: 'pointer',
                                    '&:hover': { borderColor: '#94a3b8' }
                                }),
                                option: (base, state) => ({
                                    ...base,
                                    fontSize: '13px',
                                    fontFamily: 'Outfit, sans-serif',
                                    backgroundColor: state.isSelected ? '#3b82f6' : state.isFocused ? '#f1f5f9' : 'white',
                                    color: state.isSelected ? 'white' : '#0f172a',
                                    cursor: 'pointer'
                                }),
                                singleValue: (base) => ({
                                    ...base,
                                    color: '#0f172a'
                                }),
                                menuPortal: base => ({ ...base, zIndex: 9999 })
                            }}
                            menuPortalTarget={document.body}
                            menuPosition={'fixed'}
                        />

                        <button 
                            onClick={handleOpenPoModal}
                            style={{
                                background: '#10b981', color: '#fff', border: 'none', padding: '8px 16px',
                                borderRadius: '6px', fontSize: '13px', fontWeight: '700', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 4px -1px rgba(16, 185, 129, 0.2)',
                                transition: 'all 0.2s', fontFamily: 'Outfit, sans-serif'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = '#059669'}
                            onMouseLeave={e => e.currentTarget.style.background = '#10b981'}
                        >
                            🛒 Auto-Purchase Order
                        </button>

                        <button 
                            onClick={handleExportPDF}
                            disabled={exportingPdf}
                            style={{
                                background: '#ef4444', color: '#fff', border: 'none', padding: '8px 16px',
                                borderRadius: '6px', fontSize: '13px', fontWeight: '700', cursor: exportingPdf ? 'not-allowed' : 'pointer',
                                display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 4px -1px rgba(239,68,68,0.2)',
                                opacity: exportingPdf ? 0.7 : 1, transition: 'all 0.2s', fontFamily: 'Outfit, sans-serif'
                            }}
                            onMouseEnter={e => !exportingPdf && (e.currentTarget.style.background = '#dc2626')}
                            onMouseLeave={e => !exportingPdf && (e.currentTarget.style.background = '#ef4444')}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                            {exportingPdf ? 'Exporting...' : 'Export PDF'}
                        </button>
                    </div>
                </div>

                <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 2px 4px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ overflowY: 'auto', flex: 1 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                            <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 10 }}>
                            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                <th style={{ padding: '16px', textAlign: 'left', fontWeight: '700', color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Company</th>
                                <th style={{ padding: '16px', textAlign: 'left', fontWeight: '700', color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Medicine Name</th>
                                <th style={{ padding: '16px', textAlign: 'left', fontWeight: '700', color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Potency</th>
                                <th style={{ padding: '16px', textAlign: 'left', fontWeight: '700', color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Packing</th>
                                <th style={{ padding: '16px', textAlign: 'center', fontWeight: '700', color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Stock</th>
                                <th style={{ padding: '16px', textAlign: 'center', fontWeight: '700', color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Expired Stock</th>
                                <th style={{ padding: '16px', textAlign: 'center', fontWeight: '700', color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Valid Stock</th>
                                <th style={{ padding: '16px', textAlign: 'center', fontWeight: '700', color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Min Level</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredStock.length === 0 ? (
                                <tr>
                                    <td colSpan="8" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a', marginBottom: '4px' }}>No low stock items</div>
                                        <div style={{ fontSize: '13px' }}>Your inventory is well maintained for {selectedCompany || 'all companies'}.</div>
                                    </td>
                                </tr>
                            ) : (
                                filteredStock.map(m => (
                                    <tr key={m.id} style={{ borderBottom: '1px solid #f1f5f9', background: m.stock_quantity === 0 ? '#fff1f2' : '#fff' }}>
                                        <td style={{ padding: '10px 16px', color: '#64748b', fontSize: '12px' }}>{m.company || '—'}</td>
                                        <td style={{ padding: '10px 16px', fontWeight: '600', color: '#0f172a', fontSize: '12px' }}>{m.name}</td>
                                        <td style={{ padding: '10px 16px', color: '#475569', fontSize: '12px' }}>{m.potency || '—'}</td>
                                        <td style={{ padding: '10px 16px', color: '#475569', fontSize: '12px' }}>{m.unit || '—'}</td>
                                        <td style={{ padding: '16px', textAlign: 'center' }}>
                                            <span style={{ 
                                                background: m.stock_quantity <= 0 ? '#fecdd3' : '#fef3c7', 
                                                color: m.stock_quantity <= 0 ? '#be123c' : '#b45309',
                                                padding: '4px 12px', borderRadius: '20px', fontWeight: '700'
                                            }}>
                                                {m.stock_quantity}
                                            </span>
                                        </td>
                                        <td style={{ padding: '16px', textAlign: 'center' }}>
                                            {m.expired_quantity > 0 ? (
                                                <span style={{ background: '#fecdd3', color: '#be123c', padding: '4px 12px', borderRadius: '20px', fontWeight: '700' }}>
                                                    {m.expired_quantity}
                                                </span>
                                            ) : (
                                                <span style={{ color: '#94a3b8' }}>0</span>
                                            )}
                                        </td>
                                        <td style={{ padding: '16px', textAlign: 'center' }}>
                                            <span style={{ 
                                                background: (m.stock_quantity - (m.expired_quantity || 0)) <= 0 ? '#fecdd3' : '#dcfce7', 
                                                color: (m.stock_quantity - (m.expired_quantity || 0)) <= 0 ? '#be123c' : '#166534',
                                                padding: '4px 12px', borderRadius: '20px', fontWeight: '700'
                                            }}>
                                                {m.stock_quantity - (m.expired_quantity || 0)}
                                            </span>
                                        </td>
                                        <td style={{ padding: '16px', textAlign: 'center', color: '#475569' }}>{m.low_stock_threshold}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            
            {/* Auto PO Modal */}
            {poModalVisible && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(2px)' }}>
                    <div style={{ background: '#fff', width: '900px', maxHeight: '90vh', borderRadius: '16px', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
                        <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f2d1f', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    🛒 Auto-Purchase Order
                                    {selectedCompany && <span style={{ fontSize: '12px', background: '#dcfce7', color: '#166534', padding: '4px 12px', borderRadius: '20px' }}>{selectedCompany}</span>}
                                </h3>
                                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>Select a supplier and enter the order quantities for the items you wish to restock.</p>
                            </div>
                            <button onClick={() => setPoModalVisible(false)} style={{ border: 'none', background: '#e2e8f0', color: '#475569', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>&times;</button>
                        </div>
                        
                        <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '8px' }}>Select Distributor / Supplier</label>
                                <Select
                                    value={selectedSupplier ? { value: selectedSupplier, label: suppliers.find(s => s.id.toString() === selectedSupplier.toString())?.name || 'Select...' } : null}
                                    onChange={selectedOption => setSelectedSupplier(selectedOption ? selectedOption.value : '')}
                                    options={suppliers.map(s => ({ value: s.id, label: s.name }))}
                                    placeholder="Select a supplier..."
                                    styles={{
                                        control: (base, state) => ({
                                            ...base,
                                            borderRadius: '8px',
                                            padding: '4px',
                                            borderColor: state.isFocused ? '#3b82f6' : '#cbd5e1',
                                            boxShadow: state.isFocused ? '0 0 0 1px #3b82f6' : 'none',
                                            fontSize: '14px',
                                            fontFamily: 'Outfit, sans-serif',
                                            cursor: 'pointer',
                                            '&:hover': { borderColor: '#94a3b8' }
                                        }),
                                        option: (base, state) => ({
                                            ...base,
                                            fontSize: '14px',
                                            fontFamily: 'Outfit, sans-serif',
                                            backgroundColor: state.isSelected ? '#3b82f6' : state.isFocused ? '#f1f5f9' : 'white',
                                            color: state.isSelected ? 'white' : '#0f172a',
                                            cursor: 'pointer'
                                        }),
                                        singleValue: (base) => ({
                                            ...base,
                                            color: '#0f172a'
                                        }),
                                        menuPortal: base => ({ ...base, zIndex: 9999 })
                                    }}
                                    menuPortalTarget={document.body}
                                    menuPosition={'fixed'}
                                />
                            </div>

                            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                                    <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                        <tr>
                                            <th style={{ padding: '12px', fontWeight: '700', color: '#64748b', fontSize: '11px', textTransform: 'uppercase' }}>Medicine</th>
                                            <th style={{ padding: '12px', fontWeight: '700', color: '#64748b', fontSize: '11px', textTransform: 'uppercase' }}>Company</th>
                                            <th style={{ padding: '12px', textAlign: 'center', fontWeight: '700', color: '#64748b', fontSize: '11px', textTransform: 'uppercase' }}>Total</th>
                                            <th style={{ padding: '12px', textAlign: 'center', fontWeight: '700', color: '#64748b', fontSize: '11px', textTransform: 'uppercase' }}>Expired</th>
                                            <th style={{ padding: '12px', textAlign: 'center', fontWeight: '700', color: '#64748b', fontSize: '11px', textTransform: 'uppercase' }}>Valid</th>
                                            <th style={{ padding: '12px', fontWeight: '700', color: '#64748b', fontSize: '11px', textTransform: 'uppercase', width: '130px' }}>Order Qty</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {poItems.map((item, idx) => (
                                            <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                <td style={{ padding: '10px 12px', fontWeight: '600', color: '#0f172a' }}>{item.name} <span style={{color: '#94a3b8', fontSize: '11px', marginLeft: '6px'}}>{item.potency} {item.unit}</span></td>
                                                <td style={{ padding: '10px 12px', color: '#64748b' }}>{item.company}</td>
                                                <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                                    <span style={{ color: item.stock_quantity === 0 ? '#be123c' : '#b45309', background: item.stock_quantity === 0 ? '#fecdd3' : '#fef3c7', padding: '2px 8px', borderRadius: '12px', fontWeight: '700', fontSize: '12px' }}>{item.stock_quantity}</span>
                                                </td>
                                                <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                                    {item.expired_quantity > 0 ? (
                                                        <span style={{ background: '#fecdd3', color: '#be123c', padding: '2px 8px', borderRadius: '12px', fontWeight: '700', fontSize: '12px' }}>{item.expired_quantity}</span>
                                                    ) : (
                                                        <span style={{ color: '#94a3b8', fontSize: '12px' }}>0</span>
                                                    )}
                                                </td>
                                                <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                                        <span style={{ background: (item.stock_quantity - (item.expired_quantity || 0)) <= 0 ? '#fecdd3' : '#dcfce7', color: (item.stock_quantity - (item.expired_quantity || 0)) <= 0 ? '#be123c' : '#166534', padding: '2px 8px', borderRadius: '12px', fontWeight: '700', fontSize: '12px' }}>{item.stock_quantity - (item.expired_quantity || 0)}</span>
                                                        <span style={{ color: '#94a3b8', fontSize: '10px' }}>(Min: {item.low_stock_threshold})</span>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '8px 12px' }}>
                                                    <input 
                                                        id={`po-qty-${idx}`}
                                                        type="number"
                                                        placeholder="Qty"
                                                        value={item.orderQuantity}
                                                        onChange={e => {
                                                            const newItems = [...poItems];
                                                            newItems[idx].orderQuantity = e.target.value;
                                                            setPoItems(newItems);
                                                        }}
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                const nextInput = document.getElementById(`po-qty-${idx + 1}`);
                                                                if (nextInput) {
                                                                    nextInput.focus();
                                                                } else {
                                                                    document.getElementById('po-save-btn')?.focus();
                                                                }
                                                            }
                                                        }}
                                                        style={{
                                                            width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1',
                                                            fontSize: '13px', outline: 'none', fontFamily: 'Outfit, sans-serif'
                                                        }}
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {errorMsg && (
                            <div style={{ padding: '12px 24px', background: '#fef2f2', borderTop: '1px solid #fecaca', color: '#ef4444', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>⚠️</span> {errorMsg}
                            </div>
                        )}

                        <div style={{ padding: '20px 24px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: '13px', color: '#64748b' }}>
                                <span style={{ fontWeight: '700', color: '#10b981' }}>{poItems.filter(i => Number(i.orderQuantity) > 0).length}</span> items selected for order
                            </div>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button onClick={() => setPoModalVisible(false)} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
                                <button 
                                    id="po-save-btn"
                                    onClick={handleGeneratePo} 
                                    disabled={isGeneratingPo}
                                    style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#0f2d1f', color: '#fff', fontWeight: '700', cursor: isGeneratingPo ? 'not-allowed' : 'pointer', opacity: isGeneratingPo ? 0.7 : 1, transition: 'background 0.2s' }}
                                >
                                    {isGeneratingPo ? 'Generating PDF...' : 'Save & Generate PO PDF'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
        </>
    )
}

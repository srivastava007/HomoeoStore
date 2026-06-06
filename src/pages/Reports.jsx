import { useState, useEffect } from 'react'
import DateInput from '../components/DateInput'

export default function Reports() {
    const [activeTab, setActiveTab] = useState('overview') // 'overview' or 'gst'
    
    // Overview Data State
    const [sales, setSales] = useState([])
    const [expiry, setExpiry] = useState([])
    const [lowStock, setLowStock] = useState([])
    const [range, setRange] = useState('7')

    // GST Register State
    const [fromDate, setFromDate] = useState(() => {
        const now = new Date()
        const month = String(now.getMonth() + 1).padStart(2, '0')
        return `${now.getFullYear()}-${month}-01` // First of current month
    })
    const [toDate, setToDate] = useState(() => {
        const now = new Date()
        const month = String(now.getMonth() + 1).padStart(2, '0')
        const day = String(now.getDate()).padStart(2, '0')
        return `${now.getFullYear()}-${month}-${day}` // Today
    })
    const [gstSales, setGstSales] = useState([])
    const [gstPage, setGstPage] = useState(1)
    const [gstTotalRows, setGstTotalRows] = useState(0)
    const [gstTotals, setGstTotals] = useState({ grandNet: 0, grandTaxable: 0, grandCgst: 0, grandSgst: 0, grandIgst: 0, totalTax: 0 })
    const gstLimit = 50
    const [gstSearch, setGstSearch] = useState('')
    const [loadingGst, setLoadingGst] = useState(false)

    // GST Purchase Register State
    const [gstPurchases, setGstPurchases] = useState([])
    const [gstPurchasePage, setGstPurchasePage] = useState(1)
    const [gstPurchaseTotalRows, setGstPurchaseTotalRows] = useState(0)
    const [gstPurchaseTotals, setGstPurchaseTotals] = useState({ grandNet: 0, grandTaxable: 0, grandCgst: 0, grandSgst: 0, grandIgst: 0, totalTax: 0 })
    const [gstPurchaseSearch, setGstPurchaseSearch] = useState('')
    const [loadingGstPurchase, setLoadingGstPurchase] = useState(false)
    const [companies, setCompanies] = useState([])
    const [pdfSuccess, setPdfSuccess] = useState(null)
    const [pdfError, setPdfError] = useState(null)
    const [exportingPdf, setExportingPdf] = useState(false)
    const [storeProfile, setStoreProfile] = useState(null)


    // Load Overview Data
    async function loadOverview() {
        try {
            const [s, e, l] = await Promise.all([
                window.api.getSalesReport(range),
                window.api.getExpiryAlerts(),
                window.api.getLowStock(),
            ])
            setSales(s)
            setExpiry(e)
            setLowStock(l)
        } catch (err) {
            console.error('Failed to load overview reports:', err)
        }
    }

    // Load GST Data
    async function loadGst(page = 1) {
        setLoadingGst(true)
        try {
            const data = await window.api.getGstSalesRegisterPaginated({ fromDate, toDate, search: gstSearch, page, limit: gstLimit })
            setGstSales(data.invoices || [])
            setGstTotals(data.totals || { grandNet: 0, grandTaxable: 0, grandCgst: 0, grandSgst: 0, grandIgst: 0, totalTax: 0 })
            setGstTotalRows(data.total || 0)
            setGstPage(data.page || 1)
        } catch (err) {
            console.error('Failed to load GST Sales Register:', err)
        } finally {
            setLoadingGst(false)
        }
    }

    async function loadGstPurchase(page = 1) {
        setLoadingGstPurchase(true)
        try {
            const data = await window.api.getGstPurchaseRegisterPaginated({ fromDate, toDate, search: gstPurchaseSearch, page, limit: gstLimit })
            setGstPurchases(data.invoices || [])
            setGstPurchaseTotals(data.totals || { grandNet: 0, grandTaxable: 0, grandCgst: 0, grandSgst: 0, grandIgst: 0, totalTax: 0 })
            setGstPurchaseTotalRows(data.total || 0)
            setGstPurchasePage(data.page || 1)
        } catch (err) {
            console.error('Failed to load GST Purchase Register:', err)
        } finally {
            setLoadingGstPurchase(false)
        }
    }

    async function handleExportPDF() {
        setExportingPdf(true)
        setPdfError(null)
        setPdfSuccess(null)
        const cleanFrom = fromDate.replace(/-/g, '_')
        const cleanTo = toDate.replace(/-/g, '_')
        const reportType = activeTab === 'gst-purchase' ? 'Purchase' : 'Sales'
        const defaultName = `GST_${reportType}_Register_${cleanFrom}_to_${cleanTo}.pdf`
        try {
            const res = await window.api.saveToPdf(defaultName, `Export GST ${reportType} Register as PDF`, true)

            if (res.success) {
                setPdfSuccess(res.filePath)
            } else if (!res.canceled) {
                setPdfError(res.error || 'Failed to generate PDF document.')
            }
        } catch (err) {
            console.error('PDF export error:', err)
            setPdfError('An unexpected system error occurred during PDF generation.')
        } finally {
            setExportingPdf(false)
        }
    }

    // Effect for Overview Range changes
    useEffect(() => {
        if (activeTab === 'overview') {
            loadOverview()
        }
    }, [range, activeTab])

    // Effect for GST Tab and range changes
    useEffect(() => {
        if (activeTab === 'gst') {
            loadGst()
        } else if (activeTab === 'gst-purchase') {
            loadGstPurchase()
        }
    }, [fromDate, toDate, activeTab])

    // Fetch initial companies and store profile on mount
    useEffect(() => {
        window.api.getCompanies().then(comps => setCompanies(comps || []))
        window.api.getStoreProfile().then(profile => setStoreProfile(profile || null))
    }, [])


    // --- Overview Calculations ---
    const totalRevenue = sales.reduce((s, d) => s + d.revenue, 0)
    const totalBills = sales.reduce((s, d) => s + d.total_bills, 0)
    const maxRevenue = Math.max(...sales.map(d => d.revenue), 1)

    // --- GST Calculations ---
    const companyName = storeProfile?.store_name || 'HOMOEOSTORE'
    const companyGstin = storeProfile?.gstin || 'N/A'
    const companyAddress = [storeProfile?.address_line1, storeProfile?.address_line2, storeProfile?.address_line3].filter(Boolean).join(', ') || 'N/A'


    const grandNet = gstTotals.grandNet || 0
    const grandTaxable = gstTotals.grandTaxable || 0
    const grandCgst = gstTotals.grandCgst || 0
    const grandSgst = gstTotals.grandSgst || 0
    const grandIgst = gstTotals.grandIgst || 0
    const grandTotalTax = gstTotals.totalTax || 0

    // Helper to format Date for display
    const formatDate = (dateStr) => {
        if (!dateStr) return ''
        const dateObj = new Date(dateStr)
        const day = String(dateObj.getDate()).padStart(2, '0')
        const month = String(dateObj.getMonth() + 1).padStart(2, '0')
        const year = dateObj.getFullYear()
        return `${day}-${month}-${year}`
    }

    // --- Data Aggregation for GST Register ---
    const aggregatedRows = []
    let snIndex = (gstPage - 1) * gstLimit + 1
    let bgIndex = 0

    gstSales.forEach(bill => {
        const gstin = '-'
        let billTotalQty = 0
        let billTotalTaxable = 0
        let billTotalCgst = 0
        let billTotalSgst = 0
        let billTotalAmount = 0
        
        const rateKeys = bill.rates.map(r => r.gst_rate).sort((a, b) => a - b)
        const bgColor = bgIndex % 2 === 0 ? '#fff' : '#f8fafc'
        bgIndex++

        rateKeys.forEach((rateStr, rIdx) => {
            const rateData = bill.rates.find(r => r.gst_rate === rateStr)
            const rate = parseFloat(rateData.gst_rate) || 0
            const qty = parseInt(rateData.qty) || 0
            const net = parseFloat(rateData.net) || 0
            const taxable = net / (1 + (rate / 100))
            const tax = net - taxable
            const halfTax = tax / 2

            billTotalQty += qty
            billTotalTaxable += taxable
            billTotalCgst += halfTax
            billTotalSgst += halfTax
            billTotalAmount += net

            aggregatedRows.push({
                isTotalRow: false,
                isFirstRow: rIdx === 0,
                sn: rIdx === 0 ? snIndex++ : '',
                bg: bgColor,
                bill_number: bill.bill_number,
                customer_name: bill.customer_name || 'CASH',
                created_at: bill.created_at,
                gstin: gstin,
                entry_type: bill.entry_type || 'SALE',
                rate: rate,
                qty: qty,
                taxable: taxable,
                cgst: halfTax,
                sgst: halfTax,
                rnd: null,
                net: net
            })
        })
        
        // Total Row for the bill
        const isNegative = billTotalAmount < 0
        const absAmount = Math.abs(billTotalAmount)
        const roundedAbs = Math.round(absAmount)
        const roundedTotal = isNegative ? -roundedAbs : roundedAbs
        const rnd = roundedTotal - billTotalAmount
        
        aggregatedRows.push({
            isTotalRow: true,
            bg: bgColor,
            bill_number: bill.bill_number,
            entry_type: bill.entry_type || 'SALE',
            qty: billTotalQty,
            taxable: billTotalTaxable,
            cgst: billTotalCgst,
            sgst: billTotalSgst,
            rnd: rnd,
            net: roundedTotal
        })
    })


    // --- Data Aggregation for GST Purchase ---
    const purchaseAggRows = []
    let snPurchaseIndex = (gstPurchasePage - 1) * gstLimit + 1
    let bgPurchaseIndex = 0

    gstPurchases.forEach(bill => {
        const gstin = '-'
        let billTotalQty = 0
        let billTotalTaxable = 0
        let billTotalCgst = 0
        let billTotalSgst = 0
        let billTotalAmount = 0
        
        const rateKeys = bill.rates.map(r => r.gst_rate).sort((a, b) => a - b)
        const bgColor = bgPurchaseIndex % 2 === 0 ? '#fff' : '#f8fafc'
        bgPurchaseIndex++

        rateKeys.forEach((rateStr, rIdx) => {
            const rateData = bill.rates.find(r => r.gst_rate === rateStr)
            const rate = parseFloat(rateData.gst_rate) || 0
            const qty = parseInt(rateData.qty) || 0
            const net = parseFloat(rateData.net) || 0
            const taxable = net / (1 + (rate / 100))
            const tax = net - taxable
            const halfTax = tax / 2

            billTotalQty += qty
            billTotalTaxable += taxable
            billTotalCgst += halfTax
            billTotalSgst += halfTax
            billTotalAmount += net

            purchaseAggRows.push({
                isTotalRow: false,
                isFirstRow: rIdx === 0,
                sn: rIdx === 0 ? snPurchaseIndex++ : '',
                bg: bgColor,
                bill_number: bill.bill_number,
                customer_name: bill.customer_name || 'CASH',
                created_at: bill.created_at,
                gstin: gstin,
                entry_type: bill.entry_type || 'PURCHASE',
                rate: rate,
                qty: qty,
                taxable: taxable,
                cgst: halfTax,
                sgst: halfTax,
                rnd: null,
                net: net
            })
        })
        
        // Total Row for the bill
        const isNegative = billTotalAmount < 0
        const absAmount = Math.abs(billTotalAmount)
        const roundedAbs = Math.round(absAmount)
        const roundedTotal = isNegative ? -roundedAbs : roundedAbs
        const rnd = roundedTotal - billTotalAmount
        
        purchaseAggRows.push({
            isTotalRow: true,
            bg: bgColor,
            bill_number: bill.bill_number,
            entry_type: bill.entry_type || 'PURCHASE',
            qty: billTotalQty,
            taxable: billTotalTaxable,
            cgst: billTotalCgst,
            sgst: billTotalSgst,
            rnd: rnd,
            net: roundedTotal
        })
    })

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Global Print Styling Overrides (Hides UI and formats beautifully on A4 Landscape) */}
            <style>{`
                @media print {
                    /* Hide sidebar and all other non-report UI panels */
                    aside, .no-print, header, .drag-bar {
                        display: none !important;
                    }
                    /* Reset main container spacing */
                    main {
                        padding: 0 !important;
                        margin: 0 !important;
                        background: #fff !important;
                        overflow: visible !important;
                    }
                    body {
                        background: #fff !important;
                        color: #000 !important;
                        font-family: 'Outfit', sans-serif !important;
                    }
                    .print-full-width {
                        width: 100% !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        box-shadow: none !important;
                        border: none !important;
                        height: auto !important;
                        overflow: visible !important;
                        display: block !important;
                    }
                    /* Page Size Configuration */
                    @page {
                        size: A4 landscape;
                        margin: 10mm;
                    }
                    /* Print Table styling with sharp black lines */
                    .print-table {
                        width: 100% !important;
                        border-collapse: collapse !important;
                        margin-top: 15px !important;
                    }
                    .print-table th, .print-table td {
                        padding: 6px 10px !important;
                        font-size: 11px !important;
                        color: #1e293b !important;
                        word-wrap: break-word !important;
                        border-bottom: 1px solid #cbd5e1 !important;
                        border-left: none !important;
                        border-right: none !important;
                    }
                    .print-table th {
                        background: #f1f5f9 !important;
                        font-weight: 700 !important;
                        color: #0f2d1f !important;
                        border-bottom: 2px solid #64748b !important;
                        border-top: 2px solid #64748b !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .print-grand-total {
                        background: #e5e7eb !important;
                        font-weight: bold !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    /* Print business profile header */
                    .print-header {
                        display: flex !important;
                        justify-content: space-between !important;
                        align-items: flex-end !important;
                        margin-bottom: 24px !important;
                        border-bottom: 2px solid #cbd5e1 !important;
                        padding-bottom: 16px !important;
                    }
                    .print-header-left h1 {
                        font-size: 24px !important;
                        margin: 0 0 6px 0 !important;
                        font-weight: 800 !important;
                        color: #0f2d1f !important;
                        letter-spacing: -0.5px !important;
                    }
                    .print-header-left p {
                        margin: 0 0 4px 0 !important;
                        font-size: 12px !important;
                        color: #475569 !important;
                    }
                    .print-header-right {
                        text-align: right !important;
                    }
                    .print-header-right h2 {
                        font-size: 16px !important;
                        margin: 0 0 6px 0 !important;
                        font-weight: 800 !important;
                        color: #0f2d1f !important;
                        text-transform: uppercase !important;
                        letter-spacing: 0.5px !important;
                    }
                    .print-header-right p {
                        margin: 0 !important;
                        font-size: 12px !important;
                        color: #475569 !important;
                        font-weight: 500 !important;
                    }
                }
                
                @media screen {
                    .print-header {
                        display: none !important;
                    }
                }
            `}</style>

            {/* Screen Header & Navigation Tabs */}
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingBottom: '16px' }}>
                <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div 
                        onClick={() => setActiveTab('overview')}
                        style={{ 
                            fontSize: '13px', 
                            fontWeight: '600', 
                            color: activeTab === 'overview' ? '#0f172a' : '#64748b', 
                            padding: '6px 16px', 
                            background: activeTab === 'overview' ? '#fff' : 'transparent',
                            borderRadius: '6px',
                            boxShadow: activeTab === 'overview' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>
                        Sales Overview
                    </div>
                    <div 
                        onClick={() => setActiveTab('gst')}
                        style={{ 
                            fontSize: '13px', 
                            fontWeight: '600', 
                            color: activeTab === 'gst' ? '#0f172a' : '#64748b', 
                            padding: '6px 16px', 
                            background: activeTab === 'gst' ? '#fff' : 'transparent',
                            borderRadius: '6px',
                            boxShadow: activeTab === 'gst' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 14h-8"/><path d="M16 10h-8"/><path d="M10 18H8"/></svg>
                        GST Sales Register
                    </div>

                    <div 
                        onClick={() => setActiveTab('gst-purchase')}
                        style={{ 
                            fontSize: '13px', 
                            fontWeight: '600', 
                            color: activeTab === 'gst-purchase' ? '#0f172a' : '#64748b', 
                            padding: '6px 16px', 
                            background: activeTab === 'gst-purchase' ? '#fff' : 'transparent',
                            borderRadius: '6px',
                            boxShadow: activeTab === 'gst-purchase' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 14h-8"/><path d="M16 10h-8"/><path d="M10 18H8"/></svg>
                        GST Purchase Register
                    </div>
                </div>

                {/* Tab Specific Top Filter Controls */}
                {activeTab === 'overview' && (
                    <select
                        value={range}
                        onChange={e => setRange(e.target.value)}
                        style={{ 
                            padding: '8px 14px', 
                            borderRadius: '8px', 
                            border: '1px solid #d1d5db', 
                            fontSize: '13px', 
                            fontFamily: 'Outfit, sans-serif', 
                            outline: 'none', 
                            background: '#fff' 
                        }}
                    >
                        <option value="7">Last 7 days</option>
                        <option value="30">Last 30 days</option>
                        <option value="90">Last 90 days</option>
                    </select>
                )}
            </div>

            {/* --- TAB 1: OVERVIEW DASHBOARD --- */}
            {activeTab === 'overview' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Summary Cards */}
                    <div style={{ display: 'flex', gap: '16px' }}>
                        {[
                            { label: 'Total Revenue', value: `₹${totalRevenue.toFixed(2)}`, bg: '#ecfdf5', iconColor: '#10b981', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h12"/><path d="M6 8h12"/><path d="m6 13 8.5 8"/><path d="M6 13h3"/><path d="M9 13c6.667 0 6.667-10 0-10"/></svg> },
                            { label: 'Total Bills', value: totalBills, bg: '#eff6ff', iconColor: '#3b82f6', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 14h-8"/><path d="M16 10h-8"/><path d="M10 18H8"/></svg> },
                            { label: 'Expiry Alerts', value: expiry.length, bg: '#fef2f2', iconColor: '#ef4444', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
                            { label: 'Low Stock Items', value: lowStock.length, bg: '#fffbeb', iconColor: '#f59e0b', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg> },
                        ].map(c => (
                            <div key={c.label} style={{
                                flex: 1, background: '#fff', borderRadius: '12px', padding: '16px',
                                border: '1px solid #e2e8f0', boxShadow: '0 2px 4px -1px rgba(0,0,0,0.05)',
                                display: 'flex', alignItems: 'center', gap: '12px'
                            }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: c.bg, color: c.iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {c.icon}
                                </div>
                                <div>
                                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>{c.label}</div>
                                    <div style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>{c.value}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Sales Bar Chart */}
                    <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px -1px rgba(0,0,0,0.05)' }}>
                        <h3 style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>
                            Daily Revenue
                        </h3>
                        {sales.length === 0 ? (
                            <p style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', padding: '40px 0' }}>No sales data for this period</p>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '160px' }}>
                                {sales.map(d => (
                                    <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', height: '100%', justifyContent: 'flex-end' }}>
                                        <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '600' }}>₹{d.revenue.toFixed(0)}</span>
                                        <div style={{
                                            width: '100%', background: '#10b981', borderRadius: '4px 4px 0 0',
                                            height: `${(d.revenue / maxRevenue) * 120}px`, minHeight: '4px',
                                            transition: 'height 0.3s ease', opacity: 0.9
                                        }} />
                                        <span style={{ fontSize: '10px', color: '#94a3b8', whiteSpace: 'nowrap', fontWeight: '500' }}>
                                            {new Date(d.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Bottom Panels (Expiry & Low Stock) */}
                    <div style={{ display: 'flex', gap: '16px' }}>
                        {/* Expiry Alerts */}
                        <div style={{ flex: 1, background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px -1px rgba(0,0,0,0.05)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ padding: '16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                <h3 style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                    Expiry Alerts (60 Days)
                                </h3>
                            </div>
                            <div style={{ padding: '16px', flex: 1 }}>
                                {expiry.length === 0 ? (
                                    <p style={{ color: '#94a3b8', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        No medicines expiring soon
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                                    </p>
                                ) : (
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                        <thead>
                                            <tr>
                                                <th style={{ textAlign: 'left', paddingBottom: '8px', color: '#64748b', fontWeight: '700', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>Medicine</th>
                                                <th style={{ textAlign: 'left', paddingBottom: '8px', color: '#64748b', fontWeight: '700', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>Expiry</th>
                                                <th style={{ textAlign: 'right', paddingBottom: '8px', color: '#64748b', fontWeight: '700', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>Days Left</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {expiry.map(m => {
                                                const days = Math.ceil((new Date(m.expiry_date) - new Date()) / 86400000)
                                                return (
                                                    <tr key={m.id}>
                                                        <td style={{ padding: '10px 0', fontWeight: '600', color: '#0f172a', borderBottom: '1px solid #f1f5f9' }}>{m.name} {m.potency}</td>
                                                        <td style={{ padding: '10px 0', color: '#475569', borderBottom: '1px solid #f1f5f9' }}>{m.expiry_date}</td>
                                                        <td style={{ padding: '10px 0', textAlign: 'right', borderBottom: '1px solid #f1f5f9' }}>
                                                            <span style={{
                                                                color: days <= 30 ? '#dc2626' : '#d97706', fontWeight: '700',
                                                            }}>{days}d</span>
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>

                        {/* Low Stock Alerts */}
                        <div style={{ flex: 1, background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px -1px rgba(0,0,0,0.05)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ padding: '16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                <h3 style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
                                    Low Stock Report
                                </h3>
                            </div>
                            <div style={{ padding: '16px', flex: 1 }}>
                                {lowStock.length === 0 ? (
                                    <p style={{ color: '#94a3b8', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        All medicines well stocked
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                                    </p>
                                ) : (
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                        <thead>
                                            <tr>
                                                <th style={{ textAlign: 'left', paddingBottom: '8px', color: '#64748b', fontWeight: '700', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>Medicine</th>
                                                <th style={{ textAlign: 'center', paddingBottom: '8px', color: '#64748b', fontWeight: '700', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>Stock</th>
                                                <th style={{ textAlign: 'center', paddingBottom: '8px', color: '#64748b', fontWeight: '700', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>Min Level</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {lowStock.map(m => (
                                                <tr key={m.id}>
                                                    <td style={{ padding: '10px 0', fontWeight: '600', color: '#0f172a', borderBottom: '1px solid #f1f5f9' }}>{m.name} {m.potency}</td>
                                                    <td style={{ padding: '10px 0', textAlign: 'center', borderBottom: '1px solid #f1f5f9' }}>
                                                        <span style={{
                                                            background: m.stock_quantity === 0 ? '#fef2f2' : '#fffbeb',
                                                            color: m.stock_quantity === 0 ? '#ef4444' : '#d97706',
                                                            padding: '4px 8px', borderRadius: '12px', fontWeight: '700', fontSize: '11px', letterSpacing: '0.02em'
                                                        }}>{m.stock_quantity}</span>
                                                    </td>
                                                    <td style={{ padding: '10px 0', textAlign: 'center', color: '#94a3b8', fontWeight: '600', borderBottom: '1px solid #f1f5f9' }}>{m.low_stock_threshold}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- TAB 2: GST SALES REGISTER (ACCOUNTANT MODE) --- */}
            {activeTab === 'gst' && (
                <div className="print-full-width" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    {/* Native Document Print Header (ONLY renders on PDF print output) */}
                    <div className="print-header">
                        <div className="print-header-left">
                            <h1>{companyName}</h1>
                            <p style={{ fontWeight: '600' }}>GSTIN: <span style={{ color: '#0f2d1f' }}>{companyGstin}</span></p>
                            <p>Address: {companyAddress}</p>
                        </div>
                        <div className="print-header-right">
                            <h2>GST Sales Register</h2>
                            <p>Period: {formatDate(fromDate)} to {formatDate(toDate)}</p>
                        </div>
                    </div>

                    {/* Accountant Register Interactive Filter Bar */}
                    <div className="no-print" style={{ 
                        background: '#fff', 
                        borderRadius: '12px', 
                        padding: '16px 20px', 
                        boxShadow: '0 2px 4px -1px rgba(0,0,0,0.05)', 
                        border: '1px solid #e2e8f0',
                        display: 'flex', 
                        flexWrap: 'wrap',
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        gap: '16px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', letterSpacing: '0.05em' }}>FROM DATE</label>
                                <DateInput  
                                    value={fromDate}
                                    onChange={e => setFromDate(e.target.value)}
                                    style={{ 
                                        padding: '8px 12px', 
                                        borderRadius: '6px', 
                                        border: '1px solid #cbd5e1', 
                                        fontFamily: 'Outfit, sans-serif',
                                        fontSize: '13px',
                                        outline: 'none',
                                        transition: 'all 0.2s',
                                        color: '#0f172a'
                                    }}
                                    onFocus={e => { e.target.style.borderColor = '#10b981'; e.target.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.1)' }}
                                    onBlur={e => { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'none' }}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', letterSpacing: '0.05em' }}>TO DATE</label>
                                <DateInput  
                                    value={toDate}
                                    onChange={e => setToDate(e.target.value)}
                                    style={{ 
                                        padding: '8px 12px', 
                                        borderRadius: '6px', 
                                        border: '1px solid #cbd5e1', 
                                        fontFamily: 'Outfit, sans-serif',
                                        fontSize: '13px',
                                        outline: 'none',
                                        transition: 'all 0.2s',
                                        color: '#0f172a'
                                    }}
                                    onFocus={e => { e.target.style.borderColor = '#10b981'; e.target.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.1)' }}
                                    onBlur={e => { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'none' }}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '240px' }}>
                                <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', letterSpacing: '0.05em' }}>SEARCH REGISTER</label>
                                <div style={{ position: 'relative' }}>
                                    <svg style={{ position: 'absolute', left: '10px', top: '9px', color: '#94a3b8' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                                    <input 
                                        type="text" 
                                        value={gstSearch}
                                        onChange={e => setGstSearch(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && loadGst(1)}
                                        placeholder="Search invoice or customer..."
                                        style={{ 
                                            width: '100%',
                                            padding: '8px 12px 8px 32px', 
                                            borderRadius: '6px', 
                                            border: '1px solid #cbd5e1', 
                                            fontFamily: 'Outfit, sans-serif',
                                            fontSize: '13px',
                                            outline: 'none',
                                            transition: 'all 0.2s',
                                            boxSizing: 'border-box'
                                        }}
                                        onFocus={e => { e.target.style.borderColor = '#10b981'; e.target.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.1)' }}
                                        onBlur={e => { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'none' }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', alignSelf: 'flex-end' }}>
                            <button 
                                onClick={() => loadGst(1)}
                                style={{
                                    background: '#f8fafc',
                                    color: '#475569',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '6px',
                                    padding: '8px 16px',
                                    fontSize: '13px',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    fontFamily: 'Outfit, sans-serif',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#0f172a'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#475569'; }}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
                                Refresh
                            </button>
                            <button 
                                onClick={handleExportPDF}
                                style={{
                                    background: '#0f172a',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '6px',
                                    padding: '8px 16px',
                                    fontSize: '13px',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    fontFamily: 'Outfit, sans-serif',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    boxShadow: '0 2px 4px -1px rgba(0,0,0,0.1)',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.1)'; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 4px -1px rgba(0,0,0,0.1)'; }}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                Export PDF
                            </button>
                        </div>
                    </div>

                    {/* Summarized GST Collection Figures Box */}
                    <div className="no-print" style={{ 
                        display: 'flex', 
                        gap: '12px' 
                    }}>
                        {[
                            { label: 'Register Sales', value: `₹${grandNet.toFixed(2)}`, bg: '#ecfdf5', iconColor: '#10b981', sub: 'Inclusive Value', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h12"/><path d="M6 8h12"/><path d="m6 13 8.5 8"/><path d="M6 13h3"/><path d="M9 13c6.667 0 6.667-10 0-10"/></svg> },
                            { label: 'Taxable Sales', value: `₹${grandTaxable.toFixed(2)}`, bg: '#f1f5f9', iconColor: '#64748b', sub: 'Exclusive Value', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg> },
                            { label: 'CGST Collected', value: `₹${grandCgst.toFixed(2)}`, bg: '#eff6ff', iconColor: '#3b82f6', sub: 'Central Portion', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg> },
                            { label: 'SGST Collected', value: `₹${grandSgst.toFixed(2)}`, bg: '#f0fdfa', iconColor: '#0ea5e9', sub: 'State Portion', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> },
                            { label: 'IGST Collected', value: `₹${grandIgst.toFixed(2)}`, bg: '#faf5ff', iconColor: '#a855f7', sub: 'Integrated Tax', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg> },
                            { label: 'Total Tax', value: `₹${grandTotalTax.toFixed(2)}`, bg: '#fff7ed', iconColor: '#f97316', sub: 'Accumulated Tax', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg> }
                        ].map((card, i) => (
                            <div key={i} style={{
                                flex: 1,
                                minWidth: 0,
                                background: '#fff',
                                padding: '12px 16px',
                                borderRadius: '12px',
                                border: '1px solid #e2e8f0',
                                boxShadow: '0 2px 4px -1px rgba(0,0,0,0.05)',
                                display: 'flex',
                                flexDirection: 'column'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                    <div style={{ minWidth: '28px', width: '28px', height: '28px', borderRadius: '6px', background: card.bg, color: card.iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {card.icon}
                                    </div>
                                    <span style={{ fontSize: '10.5px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{card.label}</span>
                                </div>
                                <span style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{card.value}</span>
                                <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '500', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{card.sub}</span>
                            </div>
                        ))}
                    </div>

                    {/* Detailed GST Sales Data Grid */}
                    <div className="print-full-width" style={{ 
                        background: '#fff', 
                        borderRadius: '12px', 
                        boxShadow: '0 2px 4px -1px rgba(0,0,0,0.05)', 
                        overflow: 'hidden',
                        border: '1px solid #e2e8f0'
                    }}>
                        {loadingGst ? (
                            <div style={{ padding: '60px', textAlign: 'center', color: '#0f172a', fontFamily: 'Outfit, sans-serif' }}>
                                <div style={{ fontSize: '24px', marginBottom: '8px', animation: 'spin 1s linear infinite', display: 'inline-block' }}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
                                </div>
                                <div style={{ fontSize: '14px', fontWeight: '600' }}>Fetching sales ledger transactions...</div>
                            </div>
                        ) : gstSales.length === 0 ? (
                            <div style={{ padding: '80px', textAlign: 'center', color: '#64748b' }}>
                                <svg style={{ margin: '0 auto 16px auto', color: '#cbd5e1' }} width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                                <p style={{ fontSize: '15px', fontWeight: '600', color: '#0f172a', margin: '0 0 4px 0' }}>No invoice items found in this period</p>
                                <p style={{ fontSize: '13px' }}>Try choosing another date range or adjusting the search term.</p>
                            </div>
                        ) : (
                            <table className="print-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                <thead>
                                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                        <th style={{ padding: '12px', textAlign: 'center', fontWeight: '700', color: '#64748b', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', width: '40px' }}>S.N.</th>
                                        <th style={{ padding: '12px', textAlign: 'left', fontWeight: '700', color: '#64748b', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', width: '80px' }}>Date</th>
                                        <th style={{ padding: '12px', textAlign: 'left', fontWeight: '700', color: '#64748b', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', width: '80px' }}>Invoice No</th>
                                        <th style={{ padding: '12px', textAlign: 'left', fontWeight: '700', color: '#64748b', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Customer Name</th>
                                        <th style={{ padding: '12px', textAlign: 'left', fontWeight: '700', color: '#64748b', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', width: '100px' }}>GSTIN</th>
                                        <th style={{ padding: '12px', textAlign: 'center', fontWeight: '700', color: '#64748b', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', width: '60px' }}>GST %</th>
                                        <th style={{ padding: '12px', textAlign: 'center', fontWeight: '700', color: '#64748b', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', width: '60px' }}>Qty</th>
                                        <th style={{ padding: '12px', textAlign: 'right', fontWeight: '700', color: '#64748b', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', width: '100px' }}>Taxable Value</th>
                                        <th style={{ padding: '12px', textAlign: 'right', fontWeight: '700', color: '#64748b', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', width: '80px' }}>CGST</th>
                                        <th style={{ padding: '12px', textAlign: 'right', fontWeight: '700', color: '#64748b', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', width: '80px' }}>SGST</th>
                                        <th style={{ padding: '12px', textAlign: 'right', fontWeight: '700', color: '#64748b', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', width: '60px' }}>Rnd</th>
                                        <th style={{ padding: '12px', textAlign: 'right', fontWeight: '700', color: '#64748b', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', width: '100px' }}>Total Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {aggregatedRows.map((row, index) => {
                                        if (row.isTotalRow) {
                                            return (
                                                <tr key={`total-${index}`} style={{ background: row.entry_type === 'CREDIT_NOTE' ? '#fef2f2' : (row.bg === '#fff' ? '#f8fafc' : '#f1f5f9'), borderBottom: '1px solid #e2e8f0' }}>
                                                    <td colSpan={4} style={{ padding: '10px 12px' }}></td>
                                                    <td colSpan={2} style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '700', color: row.entry_type === 'CREDIT_NOTE' ? '#dc2626' : '#64748b', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.05em' }}>
                                                        {row.entry_type === 'CREDIT_NOTE' ? 'CR Total =' : 'Total ='}
                                                    </td>
                                                    <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '700', color: '#0f172a' }}>{row.qty}</td>
                                                    <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'Outfit, sans-serif', fontWeight: '600', color: '#475569' }}>₹{row.taxable.toFixed(2)}</td>
                                                    <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'Outfit, sans-serif', fontWeight: '600', color: '#3b82f6' }}>₹{row.cgst.toFixed(2)}</td>
                                                    <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'Outfit, sans-serif', fontWeight: '600', color: '#0ea5e9' }}>₹{row.sgst.toFixed(2)}</td>
                                                    <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'Outfit, sans-serif', fontWeight: '600', color: '#f59e0b' }}>{row.rnd.toFixed(2)}</td>
                                                    <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'Outfit, sans-serif', fontWeight: '700', color: '#10b981', fontSize: '14px' }}>₹{row.net.toFixed(2)}</td>
                                                </tr>
                                            )
                                        }

                                        return (
                                            <tr key={`row-${index}`} style={{ borderTop: row.isFirstRow ? '1px solid #e2e8f0' : 'none', background: row.entry_type === 'CREDIT_NOTE' ? '#fff1f2' : row.bg }}>
                                                <td style={{ padding: '10px 12px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
                                                    {row.isFirstRow ? row.sn : ''}
                                                </td>
                                                <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', color: '#475569', fontSize: '12px' }}>
                                                    {row.isFirstRow ? formatDate(row.created_at) : ''}
                                                </td>
                                                <td style={{ padding: '10px 12px', fontWeight: '600', color: row.entry_type === 'CREDIT_NOTE' ? '#e11d48' : '#0f172a', fontSize: '12px' }}>
                                                    {row.isFirstRow ? (
                                                        <>
                                                            {row.bill_number}
                                                            {row.entry_type === 'CREDIT_NOTE' && (
                                                                <span style={{ marginLeft: '6px', fontSize: '9px', background: '#e11d48', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>CR</span>
                                                            )}
                                                        </>
                                                    ) : ''}
                                                </td>
                                                <td style={{ padding: '10px 12px', color: '#334155', fontWeight: '500', fontSize: '12px' }}>
                                                    {row.isFirstRow ? row.customer_name : ''}
                                                </td>
                                                <td style={{ padding: '10px 12px', color: '#64748b', fontSize: '12px' }}>
                                                    {row.isFirstRow ? row.gstin : ''}
                                                </td>
                                                <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '600', color: '#475569', fontSize: '12px' }}>{row.rate}%</td>
                                                <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '500', color: '#0f172a', fontSize: '12px' }}>{row.qty}</td>
                                                <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'Outfit, sans-serif', color: '#475569', fontSize: '12px' }}>₹{row.taxable.toFixed(2)}</td>
                                                <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'Outfit, sans-serif', color: '#3b82f6', fontSize: '12px' }}>₹{row.cgst.toFixed(2)}</td>
                                                <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'Outfit, sans-serif', color: '#0ea5e9', fontSize: '12px' }}>₹{row.sgst.toFixed(2)}</td>
                                                <td style={{ padding: '10px 12px', textAlign: 'right' }}></td>
                                                <td style={{ padding: '10px 12px', textAlign: 'right' }}></td>
                                            </tr>
                                        )
                                    })}
                                    
                                    {/* Grand Totals Summary Row */}
                                    <tr className="print-grand-total" style={{ background: '#f1f5f9', borderTop: '2px solid #cbd5e1', fontWeight: '800' }}>
                                        <td colSpan={7} style={{ padding: '16px 12px', textAlign: 'right', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569' }}>Register Grand Totals:</td>
                                        <td style={{ padding: '16px 12px', textAlign: 'right', fontFamily: 'Outfit, sans-serif', fontSize: '13px', color: '#0f172a' }}>₹{grandTaxable.toFixed(2)}</td>
                                        <td style={{ padding: '16px 12px', textAlign: 'right', fontFamily: 'Outfit, sans-serif', fontSize: '13px', color: '#3b82f6' }}>₹{grandCgst.toFixed(2)}</td>
                                        <td style={{ padding: '16px 12px', textAlign: 'right', fontFamily: 'Outfit, sans-serif', fontSize: '13px', color: '#0ea5e9' }}>₹{grandSgst.toFixed(2)}</td>
                                        <td style={{ padding: '16px 12px', textAlign: 'right', fontFamily: 'Outfit, sans-serif', fontSize: '13px', color: '#f59e0b' }}></td>
                                        <td style={{ padding: '16px 12px', textAlign: 'right', fontFamily: 'Outfit, sans-serif', fontSize: '15px', color: '#10b981' }}>₹{grandNet.toFixed(2)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        )}
                        
                        {/* Pagination Controls */}
                        {!loadingGst && gstTotalRows > 0 && (
                            <div className="no-print" style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                                <div style={{ color: '#64748b', fontSize: '14px' }}>
                                    Showing {Math.min((gstPage - 1) * gstLimit + 1, gstTotalRows)} to {Math.min(gstPage * gstLimit, gstTotalRows)} of <strong style={{ color: '#0f172a' }}>{gstTotalRows}</strong> invoices
                                </div>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <button 
                                        disabled={gstPage === 1}
                                        onClick={() => loadGst(gstPage - 1)}
                                        style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '4px', background: gstPage === 1 ? '#f1f5f9' : '#fff', color: gstPage === 1 ? '#94a3b8' : '#334155', cursor: gstPage === 1 ? 'not-allowed' : 'pointer', fontWeight: '500' }}>
                                        Previous
                                    </button>
                                    <span style={{ padding: '0 8px', color: '#475569', fontWeight: '500' }}>
                                        Page {gstPage} of {Math.ceil(gstTotalRows / gstLimit) || 1}
                                    </span>
                                    <button 
                                        disabled={gstPage >= (Math.ceil(gstTotalRows / gstLimit) || 1)}
                                        onClick={() => loadGst(gstPage + 1)}
                                        style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '4px', background: gstPage >= (Math.ceil(gstTotalRows / gstLimit) || 1) ? '#f1f5f9' : '#fff', color: gstPage >= (Math.ceil(gstTotalRows / gstLimit) || 1) ? '#94a3b8' : '#334155', cursor: gstPage >= (Math.ceil(gstTotalRows / gstLimit) || 1) ? 'not-allowed' : 'pointer', fontWeight: '500' }}>
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Custom Modal for PDF Export Success */}
            {pdfSuccess && (
                <div className="no-print" style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000,
                    fontFamily: 'Outfit, sans-serif'
                }}>
                    <div style={{
                        background: '#fff', borderRadius: '16px', padding: '30px', width: '480px',
                        textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)'
                    }}>
                        <div style={{
                            width: '60px', height: '60px', borderRadius: '30px', background: '#dcfce7',
                            color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '32px', margin: '0 auto 16px'
                        }}>✓</div>
                        <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0f2d1f', marginBottom: '8px' }}>
                            Register Exported Successfully!
                        </h3>
                        <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>
                            Your GST Sales Register PDF has been saved at:
                        </p>
                        <div style={{
                            background: '#f3f4f6', padding: '12px', borderRadius: '8px', fontSize: '12px',
                            color: '#374151', wordBreak: 'break-all', fontFamily: 'Outfit, sans-serif',
                            textAlign: 'left', marginBottom: '24px', border: '1px solid #e5e7eb'
                        }}>
                            {pdfSuccess}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                            <button 
                                onClick={() => {
                                    navigator.clipboard.writeText(pdfSuccess)
                                }}
                                style={{
                                    padding: '10px 18px', borderRadius: '8px', border: '1px solid #d1d5db',
                                    background: '#fff', color: '#374151', fontSize: '13px', fontWeight: '600',
                                    cursor: 'pointer', fontFamily: 'Outfit, sans-serif'
                                }}
                            >
                                📋 Copy Path
                            </button>
                            <button 
                                onClick={() => setPdfSuccess(null)}
                                style={{
                                    padding: '10px 24px', borderRadius: '8px', border: 'none',
                                    background: '#0f2d1f', color: '#fff', fontSize: '13px', fontWeight: '600',
                                    cursor: 'pointer', fontFamily: 'Outfit, sans-serif'
                                }}
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Modal for PDF Export Error */}
            {pdfError && (
                <div className="no-print" style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000,
                    fontFamily: 'Outfit, sans-serif'
                }}>
                    <div style={{
                        background: '#fff', borderRadius: '16px', padding: '30px', width: '400px',
                        textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)'
                    }}>
                        <div style={{
                            width: '60px', height: '60px', borderRadius: '30px', background: '#fee2e2',
                            color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '32px', margin: '0 auto 16px'
                        }}>✕</div>
                        <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#991b1b', marginBottom: '8px' }}>
                            Export Failed
                        </h3>
                        <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '24px' }}>
                            {pdfError}
                        </p>
                        <button 
                            onClick={() => setPdfError(null)}
                            style={{
                                padding: '10px 24px', borderRadius: '8px', border: 'none',
                                background: '#dc2626', color: '#fff', fontSize: '13px', fontWeight: '600',
                                cursor: 'pointer', width: '100%', fontFamily: 'Outfit, sans-serif'
                            }}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

            {/* Backdrop for PDF Generation */}
            {exportingPdf && (
                <div className="no-print" style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000,
                    fontFamily: 'Outfit, sans-serif'
                }}>
                    <div style={{
                        background: '#fff', borderRadius: '12px', padding: '24px 40px',
                        textAlign: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                        display: 'flex', alignItems: 'center', gap: '16px'
                    }}>
                        <span style={{ fontSize: '24px', animation: 'spin 1s linear infinite' }}>🔄</span>
                        <span style={{ fontSize: '14px', fontWeight: '600', color: '#0f2d1f' }}>Generating PDF file...</span>
                    </div>
                    <style>{`
                        @keyframes spin {
                            from { transform: rotate(0deg); }
                            to { transform: rotate(360deg); }
                        }
                    `}</style>
                </div>
            )}

            {/* --- TAB 3: GST SALES REGISTER (ACCOUNTANT MODE) --- */}
            {activeTab === 'gst-purchase' && (
                <div className="print-full-width" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    {/* Native Document Print Header (ONLY renders on PDF print output) */}
                    <div className="print-header">
                        <div className="print-header-left">
                            <h1>{companyName}</h1>
                            <p style={{ fontWeight: '600' }}>GSTIN: <span style={{ color: '#0f2d1f' }}>{companyGstin}</span></p>
                            <p>Address: {companyAddress}</p>
                        </div>
                        <div className="print-header-right">
                            <h2>GST Purchase Register</h2>
                            <p>Period: {formatDate(fromDate)} to {formatDate(toDate)}</p>
                        </div>
                    </div>

                    {/* Accountant Register Interactive Filter Bar */}
                    <div className="no-print" style={{ 
                        background: '#fff', 
                        borderRadius: '12px', 
                        padding: '16px 20px', 
                        boxShadow: '0 2px 4px -1px rgba(0,0,0,0.05)', 
                        border: '1px solid #e2e8f0',
                        display: 'flex', 
                        flexWrap: 'wrap',
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        gap: '16px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', letterSpacing: '0.05em' }}>FROM DATE</label>
                                <DateInput  
                                    value={fromDate}
                                    onChange={e => setFromDate(e.target.value)}
                                    style={{ 
                                        padding: '8px 12px', 
                                        borderRadius: '6px', 
                                        border: '1px solid #cbd5e1', 
                                        fontFamily: 'Outfit, sans-serif',
                                        fontSize: '13px',
                                        outline: 'none',
                                        transition: 'all 0.2s',
                                        color: '#0f172a'
                                    }}
                                    onFocus={e => { e.target.style.borderColor = '#10b981'; e.target.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.1)' }}
                                    onBlur={e => { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'none' }}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', letterSpacing: '0.05em' }}>TO DATE</label>
                                <DateInput  
                                    value={toDate}
                                    onChange={e => setToDate(e.target.value)}
                                    style={{ 
                                        padding: '8px 12px', 
                                        borderRadius: '6px', 
                                        border: '1px solid #cbd5e1', 
                                        fontFamily: 'Outfit, sans-serif',
                                        fontSize: '13px',
                                        outline: 'none',
                                        transition: 'all 0.2s',
                                        color: '#0f172a'
                                    }}
                                    onFocus={e => { e.target.style.borderColor = '#10b981'; e.target.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.1)' }}
                                    onBlur={e => { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'none' }}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '240px' }}>
                                <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', letterSpacing: '0.05em' }}>SEARCH REGISTER</label>
                                <div style={{ position: 'relative' }}>
                                    <svg style={{ position: 'absolute', left: '10px', top: '9px', color: '#94a3b8' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                                    <input 
                                        type="text" 
                                        value={gstPurchaseSearch}
                                        onChange={e => setGstPurchaseSearch(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && loadGstPurchase(1)}
                                        placeholder="Search invoice or customer..."
                                        style={{ 
                                            width: '100%',
                                            padding: '8px 12px 8px 32px', 
                                            borderRadius: '6px', 
                                            border: '1px solid #cbd5e1', 
                                            fontFamily: 'Outfit, sans-serif',
                                            fontSize: '13px',
                                            outline: 'none',
                                            transition: 'all 0.2s',
                                            boxSizing: 'border-box'
                                        }}
                                        onFocus={e => { e.target.style.borderColor = '#10b981'; e.target.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.1)' }}
                                        onBlur={e => { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'none' }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', alignSelf: 'flex-end' }}>
                            <button 
                                onClick={() => loadGstPurchase(1)}
                                style={{
                                    background: '#f8fafc',
                                    color: '#475569',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '6px',
                                    padding: '8px 16px',
                                    fontSize: '13px',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    fontFamily: 'Outfit, sans-serif',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#0f172a'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#475569'; }}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
                                Refresh
                            </button>
                            <button 
                                onClick={handleExportPDF}
                                style={{
                                    background: '#0f172a',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '6px',
                                    padding: '8px 16px',
                                    fontSize: '13px',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    fontFamily: 'Outfit, sans-serif',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    boxShadow: '0 2px 4px -1px rgba(0,0,0,0.1)',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.1)'; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 4px -1px rgba(0,0,0,0.1)'; }}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                Export PDF
                            </button>
                        </div>
                    </div>

                    {/* Summarized GST Collection Figures Box */}
                    <div className="no-print" style={{ 
                        display: 'flex', 
                        gap: '12px' 
                    }}>
                        {[
                            { label: 'Register Sales', value: `₹${(gstPurchaseTotals.grandNet || 0).toFixed(2)}`, bg: '#ecfdf5', iconColor: '#10b981', sub: 'Inclusive Value', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h12"/><path d="M6 8h12"/><path d="m6 13 8.5 8"/><path d="M6 13h3"/><path d="M9 13c6.667 0 6.667-10 0-10"/></svg> },
                            { label: 'Taxable Sales', value: `₹${(gstPurchaseTotals.grandTaxable || 0).toFixed(2)}`, bg: '#f1f5f9', iconColor: '#64748b', sub: 'Exclusive Value', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg> },
                            { label: 'CGST Collected', value: `₹${(gstPurchaseTotals.grandCgst || 0).toFixed(2)}`, bg: '#eff6ff', iconColor: '#3b82f6', sub: 'Central Portion', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg> },
                            { label: 'SGST Collected', value: `₹${(gstPurchaseTotals.grandSgst || 0).toFixed(2)}`, bg: '#f0fdfa', iconColor: '#0ea5e9', sub: 'State Portion', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> },
                            { label: 'IGST Collected', value: `₹${(gstPurchaseTotals.grandIgst || 0).toFixed(2)}`, bg: '#faf5ff', iconColor: '#a855f7', sub: 'Integrated Tax', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg> },
                            { label: 'Total Tax', value: `₹${(gstPurchaseTotals.totalTax || 0).toFixed(2)}`, bg: '#fff7ed', iconColor: '#f97316', sub: 'Accumulated Tax', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg> }
                        ].map((card, i) => (
                            <div key={i} style={{
                                flex: 1,
                                minWidth: 0,
                                background: '#fff',
                                padding: '12px 16px',
                                borderRadius: '12px',
                                border: '1px solid #e2e8f0',
                                boxShadow: '0 2px 4px -1px rgba(0,0,0,0.05)',
                                display: 'flex',
                                flexDirection: 'column'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                    <div style={{ minWidth: '28px', width: '28px', height: '28px', borderRadius: '6px', background: card.bg, color: card.iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {card.icon}
                                    </div>
                                    <span style={{ fontSize: '10.5px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{card.label}</span>
                                </div>
                                <span style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{card.value}</span>
                                <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '500', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{card.sub}</span>
                            </div>
                        ))}
                    </div>

                    {/* Detailed GST Sales Data Grid */}
                    <div className="print-full-width" style={{ 
                        background: '#fff', 
                        borderRadius: '12px', 
                        boxShadow: '0 2px 4px -1px rgba(0,0,0,0.05)', 
                        overflow: 'hidden',
                        border: '1px solid #e2e8f0'
                    }}>
                        {loadingGstPurchase ? (
                            <div style={{ padding: '60px', textAlign: 'center', color: '#0f172a', fontFamily: 'Outfit, sans-serif' }}>
                                <div style={{ fontSize: '24px', marginBottom: '8px', animation: 'spin 1s linear infinite', display: 'inline-block' }}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
                                </div>
                                <div style={{ fontSize: '14px', fontWeight: '600' }}>Fetching sales ledger transactions...</div>
                            </div>
                        ) : gstPurchases.length === 0 ? (
                            <div style={{ padding: '80px', textAlign: 'center', color: '#64748b' }}>
                                <svg style={{ margin: '0 auto 16px auto', color: '#cbd5e1' }} width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                                <p style={{ fontSize: '15px', fontWeight: '600', color: '#0f172a', margin: '0 0 4px 0' }}>No invoice items found in this period</p>
                                <p style={{ fontSize: '13px' }}>Try choosing another date range or adjusting the search term.</p>
                            </div>
                        ) : (
                            <table className="print-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                <thead>
                                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                        <th style={{ padding: '12px', textAlign: 'center', fontWeight: '700', color: '#64748b', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', width: '40px' }}>S.N.</th>
                                        <th style={{ padding: '12px', textAlign: 'left', fontWeight: '700', color: '#64748b', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', width: '80px' }}>Date</th>
                                        <th style={{ padding: '12px', textAlign: 'left', fontWeight: '700', color: '#64748b', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', width: '80px' }}>Invoice No</th>
                                        <th style={{ padding: '12px', textAlign: 'left', fontWeight: '700', color: '#64748b', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Customer Name</th>
                                        <th style={{ padding: '12px', textAlign: 'left', fontWeight: '700', color: '#64748b', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', width: '100px' }}>GSTIN</th>
                                        <th style={{ padding: '12px', textAlign: 'center', fontWeight: '700', color: '#64748b', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', width: '60px' }}>GST %</th>
                                        <th style={{ padding: '12px', textAlign: 'center', fontWeight: '700', color: '#64748b', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', width: '60px' }}>Qty</th>
                                        <th style={{ padding: '12px', textAlign: 'right', fontWeight: '700', color: '#64748b', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', width: '100px' }}>Taxable Value</th>
                                        <th style={{ padding: '12px', textAlign: 'right', fontWeight: '700', color: '#64748b', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', width: '80px' }}>CGST</th>
                                        <th style={{ padding: '12px', textAlign: 'right', fontWeight: '700', color: '#64748b', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', width: '80px' }}>SGST</th>
                                        <th style={{ padding: '12px', textAlign: 'right', fontWeight: '700', color: '#64748b', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', width: '60px' }}>Rnd</th>
                                        <th style={{ padding: '12px', textAlign: 'right', fontWeight: '700', color: '#64748b', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', width: '100px' }}>Total Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {purchaseAggRows.map((row, index) => {
                                        if (row.isTotalRow) {
                                            return (
                                                <tr key={`total-${index}`} style={{ background: row.entry_type === 'CREDIT_NOTE' ? '#fef2f2' : (row.bg === '#fff' ? '#f8fafc' : '#f1f5f9'), borderBottom: '1px solid #e2e8f0' }}>
                                                    <td colSpan={4} style={{ padding: '10px 12px' }}></td>
                                                    <td colSpan={2} style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '700', color: row.entry_type === 'CREDIT_NOTE' ? '#dc2626' : '#64748b', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.05em' }}>
                                                        {row.entry_type === 'CREDIT_NOTE' ? 'CR Total =' : 'Total ='}
                                                    </td>
                                                    <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '700', color: '#0f172a' }}>{row.qty}</td>
                                                    <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'Outfit, sans-serif', fontWeight: '600', color: '#475569' }}>₹{row.taxable.toFixed(2)}</td>
                                                    <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'Outfit, sans-serif', fontWeight: '600', color: '#3b82f6' }}>₹{row.cgst.toFixed(2)}</td>
                                                    <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'Outfit, sans-serif', fontWeight: '600', color: '#0ea5e9' }}>₹{row.sgst.toFixed(2)}</td>
                                                    <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'Outfit, sans-serif', fontWeight: '600', color: '#f59e0b' }}>{row.rnd.toFixed(2)}</td>
                                                    <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'Outfit, sans-serif', fontWeight: '700', color: '#10b981', fontSize: '14px' }}>₹{row.net.toFixed(2)}</td>
                                                </tr>
                                            )
                                        }

                                        return (
                                            <tr key={`row-${index}`} style={{ borderTop: row.isFirstRow ? '1px solid #e2e8f0' : 'none', background: row.entry_type === 'CREDIT_NOTE' ? '#fff1f2' : row.bg }}>
                                                <td style={{ padding: '10px 12px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
                                                    {row.isFirstRow ? row.sn : ''}
                                                </td>
                                                <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', color: '#475569', fontSize: '12px' }}>
                                                    {row.isFirstRow ? formatDate(row.created_at) : ''}
                                                </td>
                                                <td style={{ padding: '10px 12px', fontWeight: '600', color: row.entry_type === 'CREDIT_NOTE' ? '#e11d48' : '#0f172a', fontSize: '12px' }}>
                                                    {row.isFirstRow ? (
                                                        <>
                                                            {row.bill_number}
                                                            {row.entry_type === 'CREDIT_NOTE' && (
                                                                <span style={{ marginLeft: '6px', fontSize: '9px', background: '#e11d48', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>CR</span>
                                                            )}
                                                        </>
                                                    ) : ''}
                                                </td>
                                                <td style={{ padding: '10px 12px', color: '#334155', fontWeight: '500', fontSize: '12px' }}>
                                                    {row.isFirstRow ? row.customer_name : ''}
                                                </td>
                                                <td style={{ padding: '10px 12px', color: '#64748b', fontSize: '12px' }}>
                                                    {row.isFirstRow ? row.gstin : ''}
                                                </td>
                                                <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '600', color: '#475569', fontSize: '12px' }}>{row.rate}%</td>
                                                <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: '500', color: '#0f172a', fontSize: '12px' }}>{row.qty}</td>
                                                <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'Outfit, sans-serif', color: '#475569', fontSize: '12px' }}>₹{row.taxable.toFixed(2)}</td>
                                                <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'Outfit, sans-serif', color: '#3b82f6', fontSize: '12px' }}>₹{row.cgst.toFixed(2)}</td>
                                                <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'Outfit, sans-serif', color: '#0ea5e9', fontSize: '12px' }}>₹{row.sgst.toFixed(2)}</td>
                                                <td style={{ padding: '10px 12px', textAlign: 'right' }}></td>
                                                <td style={{ padding: '10px 12px', textAlign: 'right' }}></td>
                                            </tr>
                                        )
                                    })}
                                    
                                    {/* Grand Totals Summary Row */}
                                    <tr className="print-grand-total" style={{ background: '#f1f5f9', borderTop: '2px solid #cbd5e1', fontWeight: '800' }}>
                                        <td colSpan={7} style={{ padding: '16px 12px', textAlign: 'right', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569' }}>Register Grand Totals:</td>
                                        <td style={{ padding: '16px 12px', textAlign: 'right', fontFamily: 'Outfit, sans-serif', fontSize: '13px', color: '#0f172a' }}>₹{(gstPurchaseTotals.grandTaxable || 0).toFixed(2)}</td>
                                        <td style={{ padding: '16px 12px', textAlign: 'right', fontFamily: 'Outfit, sans-serif', fontSize: '13px', color: '#3b82f6' }}>₹{(gstPurchaseTotals.grandCgst || 0).toFixed(2)}</td>
                                        <td style={{ padding: '16px 12px', textAlign: 'right', fontFamily: 'Outfit, sans-serif', fontSize: '13px', color: '#0ea5e9' }}>₹{(gstPurchaseTotals.grandSgst || 0).toFixed(2)}</td>
                                        <td style={{ padding: '16px 12px', textAlign: 'right', fontFamily: 'Outfit, sans-serif', fontSize: '13px', color: '#f59e0b' }}></td>
                                        <td style={{ padding: '16px 12px', textAlign: 'right', fontFamily: 'Outfit, sans-serif', fontSize: '15px', color: '#10b981' }}>₹{(gstPurchaseTotals.grandNet || 0).toFixed(2)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        )}
                        
                        {/* Pagination Controls */}
                        {!loadingGstPurchase && gstPurchaseTotalRows > 0 && (
                            <div className="no-print" style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                                <div style={{ color: '#64748b', fontSize: '14px' }}>
                                    Showing {Math.min((gstPurchasePage - 1) * gstLimit + 1, gstPurchaseTotalRows)} to {Math.min(gstPurchasePage * gstLimit, gstPurchaseTotalRows)} of <strong style={{ color: '#0f172a' }}>{gstPurchaseTotalRows}</strong> invoices
                                </div>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <button 
                                        disabled={gstPurchasePage === 1}
                                        onClick={() => loadGstPurchase(gstPurchasePage - 1)}
                                        style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '4px', background: gstPurchasePage === 1 ? '#f1f5f9' : '#fff', color: gstPurchasePage === 1 ? '#94a3b8' : '#334155', cursor: gstPurchasePage === 1 ? 'not-allowed' : 'pointer', fontWeight: '500' }}>
                                        Previous
                                    </button>
                                    <span style={{ padding: '0 8px', color: '#475569', fontWeight: '500' }}>
                                        Page {gstPurchasePage} of {Math.ceil(gstPurchaseTotalRows / gstLimit) || 1}
                                    </span>
                                    <button 
                                        disabled={gstPurchasePage >= (Math.ceil(gstPurchaseTotalRows / gstLimit) || 1)}
                                        onClick={() => loadGstPurchase(gstPurchasePage + 1)}
                                        style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '4px', background: gstPurchasePage >= (Math.ceil(gstPurchaseTotalRows / gstLimit) || 1) ? '#f1f5f9' : '#fff', color: gstPurchasePage >= (Math.ceil(gstPurchaseTotalRows / gstLimit) || 1) ? '#94a3b8' : '#334155', cursor: gstPurchasePage >= (Math.ceil(gstPurchaseTotalRows / gstLimit) || 1) ? 'not-allowed' : 'pointer', fontWeight: '500' }}>
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Custom Modal for PDF Export Success */}
            {pdfSuccess && (
                <div className="no-print" style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000,
                    fontFamily: 'Outfit, sans-serif'
                }}>
                    <div style={{
                        background: '#fff', borderRadius: '16px', padding: '30px', width: '480px',
                        textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)'
                    }}>
                        <div style={{
                            width: '60px', height: '60px', borderRadius: '30px', background: '#dcfce7',
                            color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '32px', margin: '0 auto 16px'
                        }}>✓</div>
                        <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0f2d1f', marginBottom: '8px' }}>
                            Register Exported Successfully!
                        </h3>
                        <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>
                            Your GST Purchase Register PDF has been saved at:
                        </p>
                        <div style={{
                            background: '#f3f4f6', padding: '12px', borderRadius: '8px', fontSize: '12px',
                            color: '#374151', wordBreak: 'break-all', fontFamily: 'Outfit, sans-serif',
                            textAlign: 'left', marginBottom: '24px', border: '1px solid #e5e7eb'
                        }}>
                            {pdfSuccess}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                            <button 
                                onClick={() => {
                                    navigator.clipboard.writeText(pdfSuccess)
                                }}
                                style={{
                                    padding: '10px 18px', borderRadius: '8px', border: '1px solid #d1d5db',
                                    background: '#fff', color: '#374151', fontSize: '13px', fontWeight: '600',
                                    cursor: 'pointer', fontFamily: 'Outfit, sans-serif'
                                }}
                            >
                                📋 Copy Path
                            </button>
                            <button 
                                onClick={() => setPdfSuccess(null)}
                                style={{
                                    padding: '10px 24px', borderRadius: '8px', border: 'none',
                                    background: '#0f2d1f', color: '#fff', fontSize: '13px', fontWeight: '600',
                                    cursor: 'pointer', fontFamily: 'Outfit, sans-serif'
                                }}
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Modal for PDF Export Error */}
            {pdfError && (
                <div className="no-print" style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000,
                    fontFamily: 'Outfit, sans-serif'
                }}>
                    <div style={{
                        background: '#fff', borderRadius: '16px', padding: '30px', width: '400px',
                        textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)'
                    }}>
                        <div style={{
                            width: '60px', height: '60px', borderRadius: '30px', background: '#fee2e2',
                            color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '32px', margin: '0 auto 16px'
                        }}>✕</div>
                        <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#991b1b', marginBottom: '8px' }}>
                            Export Failed
                        </h3>
                        <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '24px' }}>
                            {pdfError}
                        </p>
                        <button 
                            onClick={() => setPdfError(null)}
                            style={{
                                padding: '10px 24px', borderRadius: '8px', border: 'none',
                                background: '#dc2626', color: '#fff', fontSize: '13px', fontWeight: '600',
                                cursor: 'pointer', width: '100%', fontFamily: 'Outfit, sans-serif'
                            }}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

            {/* Backdrop for PDF Generation */}
            {exportingPdf && (
                <div className="no-print" style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000,
                    fontFamily: 'Outfit, sans-serif'
                }}>
                    <div style={{
                        background: '#fff', borderRadius: '12px', padding: '24px 40px',
                        textAlign: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                        display: 'flex', alignItems: 'center', gap: '16px'
                    }}>
                        <span style={{ fontSize: '24px', animation: 'spin 1s linear infinite' }}>🔄</span>
                        <span style={{ fontSize: '14px', fontWeight: '600', color: '#0f2d1f' }}>Generating PDF file...</span>
                    </div>
                    <style>{`
                        @keyframes spin {
                            from { transform: rotate(0deg); }
                            to { transform: rotate(360deg); }
                        }
                    `}</style>
                </div>
            )}

        </div>
    )
}
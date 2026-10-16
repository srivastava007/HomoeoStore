import { useState, useEffect, useRef, useMemo } from 'react'
import html2pdf from 'html2pdf.js'

export default function MonthlyItemSales() {
    const [loading, setLoading] = useState(true)
    const [reportData, setReportData] = useState({
        months: {
            m0: { key: '', label: 'This Month', shortLabel: 'This Month', title: 'This Month' },
            m1: { key: '', label: 'Previous Month', shortLabel: 'Previous Month', title: 'Previous Month' },
            m2: { key: '', label: 'Month Before', shortLabel: 'Month Before', title: 'Month Before' }
        },
        availableMonths: [],
        items: [],
        totals: { distinctItems: 0, totalQtyM0: 0, totalQtyM1: 0, totalQtyM2: 0, grandTotalQty: 0 },
        companies: []
    })

    const [selectedMonth, setSelectedMonth] = useState('')
    const [showAll, setShowAll] = useState(false)
    const [search, setSearch] = useState('')
    const [selectedCompany, setSelectedCompany] = useState('ALL')
    const [stockFilter, setStockFilter] = useState('ALL') // 'ALL', 'LOW_OR_OUT', 'IN_STOCK'
    const [sortBy, setSortBy] = useState('TOTAL_DESC') // 'TOTAL_DESC', 'TOTAL_ASC', 'M0_DESC', 'M1_DESC', 'M2_DESC', 'NAME_ASC', 'STOCK_ASC'
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize] = useState(50)
    const [isExporting, setIsExporting] = useState(false)
    const [toast, setToast] = useState({ show: false, msg: '', type: 'success' })
    const [storeProfile, setStoreProfile] = useState(null)

    const reportRef = useRef(null)

    useEffect(() => {
        loadStoreProfile()
    }, [])

    useEffect(() => {
        loadReport()
    }, [selectedMonth, showAll])

    useEffect(() => {
        setCurrentPage(1)
    }, [search, selectedCompany, stockFilter, sortBy, pageSize])

    function showToast(msg, type = 'success') {
        setToast({ show: true, msg, type })
        setTimeout(() => setToast({ show: false, msg: '', type: 'success' }), 3000)
    }

    async function loadStoreProfile() {
        try {
            if (window.api && window.api.getStoreProfile) {
                const profile = await window.api.getStoreProfile()
                setStoreProfile(profile || null)
            }
        } catch (e) {
            console.warn('Could not load store profile:', e)
        }
    }

    async function loadReport() {
        setLoading(true)
        try {
            if (window.api && window.api.getMonthlyItemSales) {
                const res = await window.api.getMonthlyItemSales({
                    targetMonth: selectedMonth || null,
                    showAll: showAll
                })
                if (res) {
                    setReportData(res)
                }
            }
        } catch (err) {
            console.error('Failed to load monthly item sales:', err)
            showToast('Failed to load sales data: ' + err.message, 'error')
        } finally {
            setLoading(false)
        }
    }

    const { months, items, availableMonths, companies } = reportData

    // Filter & Sort Items
    const filteredAndSortedItems = useMemo(() => {
        let result = items.slice()

        // 1. Text Search
        const q = search.trim().toLowerCase()
        if (q) {
            result = result.filter(item => 
                (item.name || '').toLowerCase().includes(q) ||
                (item.potency || '').toLowerCase().includes(q) ||
                (item.company || '').toLowerCase().includes(q) ||
                (item.category || '').toLowerCase().includes(q)
            )
        }

        // 2. Company Filter
        if (selectedCompany !== 'ALL') {
            result = result.filter(item => item.company === selectedCompany)
        }

        // 3. Stock Filter
        if (stockFilter === 'LOW_OR_OUT') {
            result = result.filter(item => item.current_stock <= (item.low_stock_threshold || 10))
        } else if (stockFilter === 'IN_STOCK') {
            result = result.filter(item => item.current_stock > (item.low_stock_threshold || 10))
        }

        // 4. Sorting
        result.sort((a, b) => {
            switch (sortBy) {
                case 'TOTAL_DESC':
                    return b.total_3m_qty - a.total_3m_qty || a.name.localeCompare(b.name)
                case 'TOTAL_ASC':
                    return a.total_3m_qty - b.total_3m_qty || a.name.localeCompare(b.name)
                case 'M0_DESC':
                    return b.qty_m0 - a.qty_m0 || b.total_3m_qty - a.total_3m_qty
                case 'M1_DESC':
                    return b.qty_m1 - a.qty_m1 || b.total_3m_qty - a.total_3m_qty
                case 'M2_DESC':
                    return b.qty_m2 - a.qty_m2 || b.total_3m_qty - a.total_3m_qty
                case 'NAME_ASC':
                    return a.name.localeCompare(b.name)
                case 'STOCK_ASC':
                    return a.current_stock - b.current_stock
                case 'STOCK_DESC':
                    return b.current_stock - a.current_stock
                default:
                    return b.total_3m_qty - a.total_3m_qty
            }
        })

        return result
    }, [items, search, selectedCompany, stockFilter, sortBy])

    // Filtered Totals
    const filteredTotals = useMemo(() => {
        let totalM0 = 0
        let totalM1 = 0
        let totalM2 = 0
        let grandTotal = 0

        for (const it of filteredAndSortedItems) {
            totalM0 += Number(it.qty_m0 || 0)
            totalM1 += Number(it.qty_m1 || 0)
            totalM2 += Number(it.qty_m2 || 0)
            grandTotal += Number(it.total_3m_qty || 0)
        }

        return {
            count: filteredAndSortedItems.length,
            totalM0,
            totalM1,
            totalM2,
            grandTotal
        }
    }, [filteredAndSortedItems])

    // Pagination
    const totalPages = Math.max(1, Math.ceil(filteredAndSortedItems.length / pageSize))
    const paginatedItems = useMemo(() => {
        if (isExporting) return filteredAndSortedItems
        const start = (currentPage - 1) * pageSize
        return filteredAndSortedItems.slice(start, start + pageSize)
    }, [filteredAndSortedItems, currentPage, pageSize, isExporting])

    // Export to CSV
    function handleExportCSV() {
        try {
            const headers = [
                'Sr No',
                'Medicine Name',
                'Potency',
                'Company',
                'Category',
                'Unit',
                'Current Stock',
                'Low Stock Threshold',
                `Month 3 (${months.m2.shortLabel}) Qty`,
                `Month 2 (${months.m1.shortLabel}) Qty`,
                `Month 1 (${months.m0.shortLabel}) Qty`,
                'Total 3M Qty',
                'Monthly Average',
                'Last Sold Date'
            ]

            const escapeCSV = (val) => {
                if (val === null || val === undefined) return '""'
                const str = String(val).replace(/"/g, '""')
                return `"${str}"`
            }

            const rows = filteredAndSortedItems.map((item, idx) => [
                idx + 1,
                item.name,
                item.potency || '-',
                item.company || '-',
                item.category || '-',
                item.unit || '-',
                item.current_stock,
                item.low_stock_threshold,
                item.qty_m2,
                item.qty_m1,
                item.qty_m0,
                item.total_3m_qty,
                (item.total_3m_qty / 3).toFixed(1),
                item.last_sold_at ? item.last_sold_at.split(' ')[0] : '-'
            ].map(escapeCSV).join(','))

            const csvContent = '\uFEFF' + [headers.map(escapeCSV).join(','), ...rows].join('\r\n')
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            const filename = `Medicine_Sales_3Months_${months.m2.key}_to_${months.m0.key}.csv`
            link.setAttribute('href', url)
            link.setAttribute('download', filename)
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(url)

            showToast('CSV downloaded successfully!', 'success')
        } catch (err) {
            console.error('CSV export failed:', err)
            showToast('Failed to export CSV: ' + err.message, 'error')
        }
    }

    // Export to PDF
    async function handleExportPDF() {
        if (!reportRef.current) return
        setIsExporting(true)

        setTimeout(() => {
            const opt = {
                margin: [8, 8, 8, 8],
                filename: `Medicine_Sales_3Months_${months.m2.key}_to_${months.m0.key}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true, logging: false },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
                pagebreak: { mode: 'css', avoid: 'tr' }
            }

            html2pdf().set(opt).from(reportRef.current).save().then(() => {
                setIsExporting(false)
                showToast('PDF Exported Successfully!', 'success')
            }).catch(err => {
                console.error('PDF export failed:', err)
                setIsExporting(false)
                showToast('Failed to export PDF: ' + err.message, 'error')
            })
        }, 400)
    }

    // Helper for Month Format in dropdown
    const formatMonthOption = (ym) => {
        if (!ym) return ''
        const [y, m] = ym.split('-')
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        const idx = parseInt(m, 10) - 1
        return `${monthNames[idx]} ${y}`
    }

    // Header styling helper
    const getSortIndicator = (colKey) => {
        if (sortBy === `${colKey}_DESC`) return ' ▼'
        if (sortBy === `${colKey}_ASC`) return ' ▲'
        return ''
    }

    const toggleSort = (colKey) => {
        if (sortBy === `${colKey}_DESC`) {
            setSortBy(`${colKey}_ASC`)
        } else {
            setSortBy(`${colKey}_DESC`)
        }
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box', fontFamily: 'Outfit, sans-serif' }}>
            
            {/* Toast Notification */}
            {toast.show && (
                <div style={{
                    position: 'fixed',
                    top: '24px',
                    right: '24px',
                    zIndex: 9999,
                    background: toast.type === 'error' ? '#ef4444' : '#10b981',
                    color: '#ffffff',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                    fontWeight: '600',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    <span>{toast.type === 'error' ? '⚠️' : '✅'}</span>
                    <span>{toast.msg}</span>
                </div>
            )}

            {/* Top Bar / Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <h1 style={{ margin: 0, fontSize: '26px', fontWeight: '800', color: '#0f2d1f', letterSpacing: '-0.02em' }}>
                            Monthly Medicine Sales Report
                        </h1>
                        <span style={{
                            fontSize: '11px',
                            fontWeight: '700',
                            textTransform: 'uppercase',
                            background: '#ecfdf5',
                            color: '#047857',
                            border: '1px solid #a7f3d0',
                            padding: '3px 8px',
                            borderRadius: '12px'
                        }}>
                            Last 3 Months Trend
                        </span>
                    </div>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b', fontWeight: '500' }}>
                        Comparing sales quantities for <strong>{months.m2.label}</strong>, <strong>{months.m1.label}</strong>, and <strong>{months.m0.label}</strong> (To Date)
                    </p>
                </div>

                {/* Top Action Buttons */}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <button
                        onClick={loadReport}
                        disabled={loading || isExporting}
                        style={{
                            background: '#ffffff',
                            color: '#334155',
                            border: '1px solid #cbd5e1',
                            padding: '9px 14px',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: '600',
                            cursor: loading ? 'wait' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                            transition: 'all 0.15s ease'
                        }}
                        title="Reload latest data"
                    >
                        <span>🔄</span> {loading ? 'Loading...' : 'Refresh'}
                    </button>

                    <button
                        onClick={handleExportCSV}
                        disabled={loading || isExporting || filteredAndSortedItems.length === 0}
                        style={{
                            background: '#ffffff',
                            color: '#0f766e',
                            border: '1px solid #99f6e4',
                            padding: '9px 15px',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                            transition: 'all 0.15s ease'
                        }}
                        title="Export current list to CSV/Excel"
                    >
                        <span>📊</span> Export CSV
                    </button>

                    <button
                        onClick={handleExportPDF}
                        disabled={loading || isExporting || filteredAndSortedItems.length === 0}
                        style={{
                            background: '#10b981',
                            color: '#ffffff',
                            border: 'none',
                            padding: '9px 18px',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: '600',
                            cursor: isExporting ? 'wait' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.25)',
                            transition: 'all 0.15s ease'
                        }}
                    >
                        <span>{isExporting ? '⏳' : '📄'}</span> {isExporting ? 'Generating PDF...' : 'Print / Save PDF'}
                    </button>
                </div>
            </div>

            {/* KPI Summary Cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '12px',
                marginBottom: '18px'
            }}>
                {/* Medicines Count */}
                <div style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '14px 18px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Medicines Sold
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>
                        {filteredTotals.count}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                        {showAll ? 'Showing all master items' : 'Distinct medicines in window'}
                    </div>
                </div>

                {/* Month 2 (Month Before That) */}
                <div style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '14px 18px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {months.m2.shortLabel || 'Month -2'} Qty
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#334155', marginTop: '4px' }}>
                        {filteredTotals.totalM2.toLocaleString('en-IN')}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                        Two months ago
                    </div>
                </div>

                {/* Month 1 (Previous Month) */}
                <div style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '14px 18px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {months.m1.shortLabel || 'Month -1'} Qty
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#0284c7', marginTop: '4px' }}>
                        {filteredTotals.totalM1.toLocaleString('en-IN')}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                        Previous full month
                    </div>
                </div>

                {/* Month 0 (This Month) */}
                <div style={{
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '10px',
                    padding: '14px 18px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#166534', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {months.m0.shortLabel || 'This Month'} Qty (To Date)
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#15803d', marginTop: '4px' }}>
                        {filteredTotals.totalM0.toLocaleString('en-IN')}
                    </div>
                    <div style={{ fontSize: '11px', color: '#166534', marginTop: '2px', fontWeight: '500' }}>
                        Current active month
                    </div>
                </div>

                {/* 3-Month Grand Total */}
                <div style={{
                    background: '#faf5ff',
                    border: '1px solid #e9d5ff',
                    borderRadius: '10px',
                    padding: '14px 18px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#7e22ce', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Total Volume (3 Months)
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#6b21a8', marginTop: '4px' }}>
                        {filteredTotals.grandTotal.toLocaleString('en-IN')}
                    </div>
                    <div style={{ fontSize: '11px', color: '#9333ea', marginTop: '2px', fontWeight: '500' }}>
                        Avg {(filteredTotals.grandTotal / 3).toFixed(0)} units / month
                    </div>
                </div>
            </div>

            {/* Filters Bar */}
            <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '14px 16px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
            }}>
                {/* Search Bar */}
                <div style={{ position: 'relative', flex: '1 1 240px', minWidth: '200px' }}>
                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '14px' }}>
                        🔍
                    </span>
                    <input
                        type="text"
                        placeholder="Search medicine name, potency, company..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{
                            width: '100%',
                            boxSizing: 'border-box',
                            padding: '9px 32px 9px 36px',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            fontSize: '13px',
                            fontFamily: 'Outfit, sans-serif',
                            outline: 'none',
                            color: '#1e293b'
                        }}
                    />
                    {search && (
                        <button
                            onClick={() => setSearch('')}
                            style={{
                                position: 'absolute',
                                right: '10px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'transparent',
                                border: 'none',
                                color: '#94a3b8',
                                cursor: 'pointer',
                                fontSize: '14px',
                                padding: 0
                            }}
                        >
                            ✕
                        </button>
                    )}
                </div>

                {/* Reference Month Selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', whiteSpace: 'nowrap' }}>
                        Anchor Month:
                    </label>
                    <select
                        value={selectedMonth || months.m0.key}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            fontSize: '13px',
                            fontFamily: 'Outfit, sans-serif',
                            color: '#1e293b',
                            background: '#ffffff',
                            outline: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        {availableMonths.map(ym => (
                            <option key={ym} value={ym}>
                                {formatMonthOption(ym)} {ym === months.m0.key && !selectedMonth ? '(Current)' : ''}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Company Filter Dropdown */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', whiteSpace: 'nowrap' }}>
                        Company:
                    </label>
                    <select
                        value={selectedCompany}
                        onChange={(e) => setSelectedCompany(e.target.value)}
                        style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            fontSize: '13px',
                            fontFamily: 'Outfit, sans-serif',
                            color: '#1e293b',
                            background: '#ffffff',
                            outline: 'none',
                            cursor: 'pointer',
                            maxWidth: '180px'
                        }}
                    >
                        <option value="ALL">All Companies ({companies.length})</option>
                        {companies.map(c => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                </div>

                {/* Stock Filter Dropdown */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', whiteSpace: 'nowrap' }}>
                        Stock Status:
                    </label>
                    <select
                        value={stockFilter}
                        onChange={(e) => setStockFilter(e.target.value)}
                        style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            fontSize: '13px',
                            fontFamily: 'Outfit, sans-serif',
                            color: '#1e293b',
                            background: '#ffffff',
                            outline: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        <option value="ALL">All Stock Levels</option>
                        <option value="LOW_OR_OUT">⚠️ Low / Out of Stock</option>
                        <option value="IN_STOCK">✅ In Stock</option>
                    </select>
                </div>

                {/* Show All Toggle */}
                <button
                    onClick={() => setShowAll(prev => !prev)}
                    style={{
                        padding: '8px 14px',
                        borderRadius: '8px',
                        border: showAll ? '1px solid #10b981' : '1px solid #cbd5e1',
                        background: showAll ? '#ecfdf5' : '#ffffff',
                        color: showAll ? '#047857' : '#475569',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.15s ease'
                    }}
                    title="Toggle between showing only sold medicines vs all inventory medicines"
                >
                    <span>{showAll ? '✓' : '○'}</span>
                    {showAll ? 'Showing All Master Medicines' : 'Showing Sold Medicines Only'}
                </button>
            </div>

            {/* Printable Report Section */}
            <div style={{
                flex: 1,
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
                <div ref={reportRef} style={{ flex: 1, overflow: 'auto', background: '#ffffff', padding: isExporting ? '20px' : '0' }}>
                    
                    {/* Header visible only during PDF export */}
                    {isExporting && (
                        <div style={{ marginBottom: '20px', borderBottom: '2px solid #0f2d1f', paddingBottom: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#0f2d1f' }}>
                                        {storeProfile?.store_name || 'HOMOEO STORE'}
                                    </h2>
                                    {storeProfile?.address && (
                                        <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#475569' }}>
                                            {storeProfile.address}
                                        </p>
                                    )}
                                    {storeProfile?.gstin && (
                                        <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#475569' }}>
                                            GSTIN: <strong>{storeProfile.gstin}</strong>
                                        </p>
                                    )}
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#1e293b' }}>
                                        Monthly Medicine Sales Report (3 Months)
                                    </h3>
                                    <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#64748b' }}>
                                        Period: {months.m2.label} to {months.m0.label}
                                    </p>
                                    <p style={{ margin: '2px 0 0 0', fontSize: '10px', color: '#94a3b8' }}>
                                        Generated: {new Date().toLocaleString('en-IN')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Table */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                        <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f8fafc' }}>
                            <tr>
                                <th style={thStyle('#')}>#</th>
                                <th 
                                    style={{ ...thStyle('name'), cursor: 'pointer' }}
                                    onClick={() => toggleSort('NAME')}
                                    title="Click to sort by medicine name"
                                >
                                    Medicine Name {getSortIndicator('NAME')}
                                </th>
                                <th style={thStyle('potency')}>Potency</th>
                                <th style={thStyle('company')}>Company</th>
                                <th 
                                    style={{ ...thStyle('stock'), textAlign: 'right', cursor: 'pointer' }}
                                    onClick={() => toggleSort('STOCK')}
                                    title="Click to sort by stock quantity"
                                >
                                    Current Stock {getSortIndicator('STOCK')}
                                </th>
                                
                                {/* Month 2 (Aug) */}
                                <th 
                                    style={{ ...thStyle('m2'), textAlign: 'right', background: '#f1f5f9', cursor: 'pointer' }}
                                    onClick={() => toggleSort('M2')}
                                    title={`Click to sort by ${months.m2.label} sales`}
                                >
                                    {months.m2.shortLabel} Qty {getSortIndicator('M2')}
                                </th>

                                {/* Month 1 (Sep) */}
                                <th 
                                    style={{ ...thStyle('m1'), textAlign: 'right', background: '#f1f5f9', cursor: 'pointer' }}
                                    onClick={() => toggleSort('M1')}
                                    title={`Click to sort by ${months.m1.label} sales`}
                                >
                                    {months.m1.shortLabel} Qty {getSortIndicator('M1')}
                                </th>

                                {/* Month 0 (Oct / This Month) */}
                                <th 
                                    style={{ ...thStyle('m0'), textAlign: 'right', background: '#ecfdf5', color: '#047857', cursor: 'pointer' }}
                                    onClick={() => toggleSort('M0')}
                                    title={`Click to sort by ${months.m0.label} sales`}
                                >
                                    {months.m0.shortLabel} Qty (To Date) {getSortIndicator('M0')}
                                </th>

                                {/* Total 3M */}
                                <th 
                                    style={{ ...thStyle('total'), textAlign: 'right', background: '#faf5ff', color: '#6b21a8', cursor: 'pointer' }}
                                    onClick={() => toggleSort('TOTAL')}
                                    title="Click to sort by 3-Month Total"
                                >
                                    Total Sold (3M) {getSortIndicator('TOTAL')}
                                </th>

                                <th style={{ ...thStyle('avg'), textAlign: 'right' }}>
                                    Monthly Avg
                                </th>

                                <th style={{ ...thStyle('trend'), textAlign: 'center' }}>
                                    Trend
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="11" style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
                                        <div style={{ fontSize: '20px', marginBottom: '8px' }}>🔄</div>
                                        <div style={{ fontWeight: '600' }}>Loading medicine sales data...</div>
                                    </td>
                                </tr>
                            ) : paginatedItems.length === 0 ? (
                                <tr>
                                    <td colSpan="11" style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
                                        <div style={{ fontSize: '24px', marginBottom: '8px' }}>📦</div>
                                        <div style={{ fontWeight: '600', fontSize: '15px', color: '#334155' }}>No medicines found</div>
                                        <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                                            {search ? 'Try clearing your search query or company filter.' : 'No sales recorded for the selected period.'}
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                paginatedItems.map((item, idx) => {
                                    const serial = isExporting 
                                        ? idx + 1 
                                        : (currentPage - 1) * pageSize + idx + 1
                                    
                                    const avgMonthly = (item.total_3m_qty / 3).toFixed(1)
                                    const isLowStock = item.current_stock <= (item.low_stock_threshold || 10)
                                    const isOutOfStock = item.current_stock <= 0
                                    
                                    // Trend comparison: Month 0 vs Month 1
                                    const isRising = item.qty_m0 > item.qty_m1
                                    const isFalling = item.qty_m0 < item.qty_m1

                                    return (
                                        <tr
                                            key={item.id}
                                            style={{
                                                background: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                                                borderBottom: '1px solid #f1f5f9',
                                                pageBreakInside: 'avoid'
                                            }}
                                        >
                                            <td style={tdStyle}>{serial}</td>
                                            
                                            {/* Medicine Name */}
                                            <td style={tdStyle}>
                                                <div style={{ fontWeight: '700', color: '#0f172a' }}>
                                                    {item.name}
                                                </div>
                                                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                                    {item.category && `${item.category} `}
                                                    {item.unit && `• ${item.unit} `}
                                                    {item.last_sold_at && `• Last sold: ${item.last_sold_at.split(' ')[0]}`}
                                                </div>
                                            </td>

                                            {/* Potency */}
                                            <td style={tdStyle}>
                                                {item.potency ? (
                                                    <span style={{
                                                        background: '#f1f5f9',
                                                        color: '#334155',
                                                        padding: '2px 7px',
                                                        borderRadius: '6px',
                                                        fontSize: '11px',
                                                        fontWeight: '700'
                                                    }}>
                                                        {item.potency}
                                                    </span>
                                                ) : '-'}
                                            </td>

                                            {/* Company */}
                                            <td style={tdStyle}>
                                                <span style={{ color: '#475569', fontWeight: '500' }}>
                                                    {item.company || '-'}
                                                </span>
                                            </td>

                                            {/* Current Stock */}
                                            <td style={{ ...tdStyle, textAlign: 'right' }}>
                                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                                    <span style={{
                                                        fontWeight: '700',
                                                        color: isOutOfStock ? '#dc2626' : isLowStock ? '#d97706' : '#15803d'
                                                    }}>
                                                        {item.current_stock}
                                                    </span>
                                                    {isOutOfStock ? (
                                                        <span style={{ fontSize: '9px', background: '#fee2e2', color: '#b91c1c', padding: '1px 5px', borderRadius: '4px', fontWeight: '700' }}>
                                                            OUT
                                                        </span>
                                                    ) : isLowStock ? (
                                                        <span style={{ fontSize: '9px', background: '#fef3c7', color: '#b45309', padding: '1px 5px', borderRadius: '4px', fontWeight: '700' }}>
                                                            LOW
                                                        </span>
                                                    ) : null}
                                                </div>
                                            </td>

                                            {/* Month 2 Qty */}
                                            <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '600', color: item.qty_m2 > 0 ? '#1e293b' : '#94a3b8' }}>
                                                {item.qty_m2}
                                            </td>

                                            {/* Month 1 Qty */}
                                            <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '600', color: item.qty_m1 > 0 ? '#0284c7' : '#94a3b8' }}>
                                                {item.qty_m1}
                                            </td>

                                            {/* Month 0 Qty */}
                                            <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '700', color: item.qty_m0 > 0 ? '#15803d' : '#94a3b8', background: item.qty_m0 > 0 ? '#f0fdf4' : 'transparent' }}>
                                                {item.qty_m0}
                                            </td>

                                            {/* Total 3M Qty */}
                                            <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '800', color: '#6b21a8', background: '#faf5ff' }}>
                                                {item.total_3m_qty}
                                            </td>

                                            {/* Monthly Avg */}
                                            <td style={{ ...tdStyle, textAlign: 'right', color: '#475569', fontWeight: '600' }}>
                                                {avgMonthly}
                                            </td>

                                            {/* Trend Indicator */}
                                            <td style={{ ...tdStyle, textAlign: 'center' }}>
                                                {item.qty_m0 === 0 && item.qty_m1 === 0 ? (
                                                    <span style={{ color: '#94a3b8', fontSize: '11px' }}>—</span>
                                                ) : isRising ? (
                                                    <span style={{ color: '#16a34a', fontSize: '11px', fontWeight: '700', background: '#ecfdf5', padding: '2px 6px', borderRadius: '4px' }}>
                                                        ▲ Up
                                                    </span>
                                                ) : isFalling ? (
                                                    <span style={{ color: '#dc2626', fontSize: '11px', fontWeight: '700', background: '#fef2f2', padding: '2px 6px', borderRadius: '4px' }}>
                                                        ▼ Down
                                                    </span>
                                                ) : (
                                                    <span style={{ color: '#64748b', fontSize: '11px', fontWeight: '600' }}>
                                                        ● Stable
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>

                        {/* Table Footer with Totals */}
                        {!loading && filteredAndSortedItems.length > 0 && (
                            <tfoot style={{ background: '#f1f5f9', fontWeight: '700', borderTop: '2px solid #cbd5e1' }}>
                                <tr>
                                    <td colSpan="5" style={{ ...tdStyle, textAlign: 'right', fontWeight: '800', color: '#1e293b' }}>
                                        Filtered Total Units:
                                    </td>
                                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '800', color: '#1e293b' }}>
                                        {filteredTotals.totalM2.toLocaleString('en-IN')}
                                    </td>
                                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '800', color: '#0284c7' }}>
                                        {filteredTotals.totalM1.toLocaleString('en-IN')}
                                    </td>
                                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '800', color: '#15803d', background: '#dcfce7' }}>
                                        {filteredTotals.totalM0.toLocaleString('en-IN')}
                                    </td>
                                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '900', color: '#6b21a8', background: '#f3e8ff' }}>
                                        {filteredTotals.grandTotal.toLocaleString('en-IN')}
                                    </td>
                                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '700', color: '#475569' }}>
                                        {(filteredTotals.grandTotal / 3).toFixed(1)}
                                    </td>
                                    <td style={tdStyle}></td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>

                {/* Bottom Pagination Bar */}
                {!loading && !isExporting && filteredAndSortedItems.length > 0 && (
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 18px',
                        background: '#f8fafc',
                        borderTop: '1px solid #e2e8f0',
                        flexWrap: 'wrap',
                        gap: '12px'
                    }}>
                        <div style={{ fontSize: '13px', color: '#64748b' }}>
                            Showing <strong>{Math.min(filteredAndSortedItems.length, (currentPage - 1) * pageSize + 1)}</strong> to{' '}
                            <strong>{Math.min(filteredAndSortedItems.length, currentPage * pageSize)}</strong> of{' '}
                            <strong>{filteredAndSortedItems.length}</strong> medicines
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {/* Page size select */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748b' }}>
                                <span>Rows:</span>
                                <select
                                    value={pageSize}
                                    onChange={(e) => setPageSize(Number(e.target.value))}
                                    style={{
                                        padding: '4px 8px',
                                        borderRadius: '6px',
                                        border: '1px solid #cbd5e1',
                                        fontSize: '12px',
                                        background: '#ffffff',
                                        outline: 'none',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <option value={25}>25</option>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                    <option value={250}>250</option>
                                </select>
                            </div>

                            {/* Pagination buttons */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <button
                                    onClick={() => setCurrentPage(1)}
                                    disabled={currentPage === 1}
                                    style={pageBtnStyle(currentPage === 1)}
                                    title="First page"
                                >
                                    ««
                                </button>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    style={pageBtnStyle(currentPage === 1)}
                                    title="Previous page"
                                >
                                    ‹ Prev
                                </button>
                                <span style={{ fontSize: '13px', fontWeight: '700', color: '#334155', padding: '0 8px' }}>
                                    {currentPage} / {totalPages}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages}
                                    style={pageBtnStyle(currentPage === totalPages)}
                                    title="Next page"
                                >
                                    Next ›
                                </button>
                                <button
                                    onClick={() => setCurrentPage(totalPages)}
                                    disabled={currentPage === totalPages}
                                    style={pageBtnStyle(currentPage === totalPages)}
                                    title="Last page"
                                >
                                    »»
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

// Styling Helper Constants
const thStyle = (key) => ({
    padding: '12px 14px',
    fontSize: '11px',
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: '2px solid #cbd5e1',
    userSelect: 'none',
    whiteSpace: 'nowrap'
})

const tdStyle = {
    padding: '11px 14px',
    fontSize: '13px',
    color: '#1e293b',
    verticalAlign: 'middle',
    whiteSpace: 'nowrap'
}

const pageBtnStyle = (disabled) => ({
    padding: '6px 12px',
    background: disabled ? '#f1f5f9' : '#ffffff',
    color: disabled ? '#94a3b8' : '#1e293b',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: '12px',
    fontWeight: '600',
    transition: 'all 0.1s ease'
})

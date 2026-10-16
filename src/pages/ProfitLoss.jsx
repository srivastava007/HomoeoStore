import React, { useState, useEffect, useMemo } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend } from 'recharts'
import { useDialog } from '../context/DialogContext'

export default function ProfitLoss() {
  const { showToast } = useDialog()

  // Preset Date Helper
  const getPresetDates = (preset) => {
    const now = new Date()
    const y = now.getFullYear()
    const m = now.getMonth() // 0-indexed: 0 = Jan, 3 = Apr
    const format = (dt) => dt.toISOString().split('T')[0]

    switch (preset) {
      case 'today': {
        const todayStr = format(now)
        return { from: todayStr, to: todayStr, label: 'Today' }
      }
      case 'yesterday': {
        const yest = new Date(now)
        yest.setDate(yest.getDate() - 1)
        const yestStr = format(yest)
        return { from: yestStr, to: yestStr, label: 'Yesterday' }
      }
      case 'this_week': {
        const curr = new Date(now)
        const first = curr.getDate() - (curr.getDay() === 0 ? 6 : curr.getDay() - 1)
        const monday = new Date(curr.setDate(first))
        return { from: format(monday), to: format(now), label: 'This Week' }
      }
      case 'this_month': {
        const start = new Date(y, m, 1)
        const end = new Date(y, m + 1, 0)
        return { from: format(start), to: format(end), label: 'This Month' }
      }
      case 'last_month': {
        const start = new Date(y, m - 1, 1)
        const end = new Date(y, m, 0)
        return { from: format(start), to: format(end), label: 'Last Month' }
      }
      case 'this_quarter': {
        let qStartM, qEndM, qYear
        if (m >= 3 && m <= 5) { qStartM = 3; qEndM = 5; qYear = y }
        else if (m >= 6 && m <= 8) { qStartM = 6; qEndM = 8; qYear = y }
        else if (m >= 9 && m <= 11) { qStartM = 9; qEndM = 11; qYear = y }
        else { qStartM = 0; qEndM = 2; qYear = y }
        const start = new Date(qYear, qStartM, 1)
        const end = new Date(qYear, qEndM + 1, 0)
        return { from: format(start), to: format(end), label: 'This Quarter' }
      }
      case 'last_fy': {
        const fyStartYear = m >= 3 ? y - 1 : y - 2
        return { from: `${fyStartYear}-04-01`, to: `${fyStartYear + 1}-03-31`, label: `FY ${fyStartYear}-${fyStartYear + 1}` }
      }
      case 'this_fy':
      default: {
        const fyStartYear = m >= 3 ? y : y - 1
        return { from: `${fyStartYear}-04-01`, to: `${fyStartYear + 1}-03-31`, label: `FY ${fyStartYear}-${fyStartYear + 1}` }
      }
    }
  }

  // Calculate prior period dates for comparison
  const getPreviousPeriodDates = (preset, from, to) => {
    if (preset === 'this_fy') return getPresetDates('last_fy')
    if (preset === 'this_month') return getPresetDates('last_month')
    if (preset === 'today') return getPresetDates('yesterday')
    if (from && to) {
      const f = new Date(from)
      const t = new Date(to)
      const diffTime = Math.abs(t - f)
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
      const prevTo = new Date(f)
      prevTo.setDate(prevTo.getDate() - 1)
      const prevFrom = new Date(prevTo)
      prevFrom.setDate(prevFrom.getDate() - diffDays + 1)
      return {
        from: prevFrom.toISOString().split('T')[0],
        to: prevTo.toISOString().split('T')[0],
        label: 'Previous Period'
      }
    }
    return null
  }

  const initialPreset = getPresetDates('this_fy')
  const [periodPreset, setPeriodPreset] = useState('this_fy')
  const [fromDate, setFromDate] = useState(initialPreset.from)
  const [toDate, setToDate] = useState(initialPreset.to)
  const [periodLabel, setPeriodLabel] = useState(initialPreset.label)

  const [data, setData] = useState({
    openingStock: 0,
    purchases: 0,
    purchaseAccounts: [],
    directExpenses: [],
    sales: 0,
    salesAccounts: [],
    indirectExpenses: [],
    indirectIncomes: [],
    closingStock: 0,
    grossProfit: 0,
    netProfit: 0
  })

  const [compareData, setCompareData] = useState(null)
  const [compareWithPrev, setCompareWithPrev] = useState(false)
  const [loading, setLoading] = useState(true)
  const [storeProfile, setStoreProfile] = useState(null)
  const [allLedgers, setAllLedgers] = useState([])

  // UI Toggles
  const [showChart, setShowChart] = useState(false)
  const [hideZeroBalances, setHideZeroBalances] = useState(false)

  // Drill-down Modal State
  const [drillModal, setDrillModal] = useState({
    isOpen: false,
    title: '',
    group: '',
    ledgerId: null,
    loading: false,
    statement: null,
    searchTerm: ''
  })

  // Load Store Profile & Ledgers List once
  useEffect(() => {
    async function initMetadata() {
      try {
        if (window.api.getStoreProfile) {
          const profile = await window.api.getStoreProfile()
          if (profile) setStoreProfile(profile)
        }
        if (window.api.getLedgers) {
          const leds = await window.api.getLedgers()
          if (leds) setAllLedgers(leds)
        }
      } catch (e) {
        console.error('Failed to load store metadata:', e)
      }
    }
    initMetadata()
  }, [])

  // Fetch Report Data
  const loadData = async (from, to, compareActive) => {
    setLoading(true)
    try {
      const res = await window.api.getProfitLoss(from, to)
      if (res) setData(res)

      if (compareActive) {
        const prevDates = getPreviousPeriodDates(periodPreset, from, to)
        if (prevDates) {
          const prevRes = await window.api.getProfitLoss(prevDates.from, prevDates.to)
          if (prevRes) setCompareData(prevRes)
        }
      } else {
        setCompareData(null)
      }
    } catch (e) {
      console.error(e)
      showToast?.('Failed to load Profit & Loss data', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData(fromDate, toDate, compareWithPrev)
  }, [fromDate, toDate, compareWithPrev])

  // Handle Preset Change
  const handlePresetChange = (preset) => {
    setPeriodPreset(preset)
    if (preset === 'custom') return
    const dates = getPresetDates(preset)
    setFromDate(dates.from)
    setToDate(dates.to)
    setPeriodLabel(dates.label)
  }

  // Format Helper
  const fmt = (val) => {
    const n = Number(val || 0)
    return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  // Safe Render for Negative Balance (Accounting convention)
  const renderAmount = (val) => {
    const num = Number(val || 0)
    if (num < 0) {
      return (
        <span style={{ color: '#dc2626', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          ({fmt(Math.abs(num))})
          <span title="Net Debit / Returns exceed balance" style={{ fontSize: '9px', background: '#fee2e2', color: '#991b1b', padding: '1px 5px', borderRadius: '4px', cursor: 'help' }}>
            Net Dr
          </span>
        </span>
      )
    }
    return <span>{fmt(num)}</span>
  }

  // Drill Down into Ledger
  const handleOpenDrillDown = async (name, fallbackGroup, ledgerId) => {
    let targetId = ledgerId

    // If ID not directly provided, lookup from allLedgers list
    if (!targetId && allLedgers.length > 0) {
      const match = allLedgers.find(l => l.ledger_name?.toLowerCase() === name?.toLowerCase()) ||
                    allLedgers.find(l => l.account_group?.toUpperCase() === fallbackGroup?.toUpperCase())
      if (match) targetId = match.id
    }

    setDrillModal({
      isOpen: true,
      title: name,
      group: fallbackGroup,
      ledgerId: targetId,
      loading: true,
      statement: null,
      searchTerm: ''
    })

    if (!targetId) {
      setDrillModal(prev => ({ ...prev, loading: false }))
      return
    }

    try {
      const statement = await window.api.getLedgerStatement(targetId, fromDate, toDate)
      setDrillModal(prev => ({
        ...prev,
        loading: false,
        statement
      }))
    } catch (err) {
      console.error('Failed to load ledger statement:', err)
      setDrillModal(prev => ({ ...prev, loading: false }))
      showToast?.('Could not load ledger transactions', 'error')
    }
  }

  // Export PDF
  const handleExportPdf = async () => {
    try {
      const datesBadge = `${fromDate ? new Date(fromDate).toLocaleDateString('en-IN') : ''} to ${toDate ? new Date(toDate).toLocaleDateString('en-IN') : ''}`
      const fullLabel = `${periodLabel} (${datesBadge})`
      const res = await window.api.exportProfitLossPdf(data, storeProfile, fromDate, toDate, fullLabel)
      if (res && res.success) {
        showToast?.('Profit & Loss PDF Exported Successfully!', 'success')
      } else if (res && !res.canceled) {
        showToast?.('Export failed: ' + (res.error || 'Unknown error'), 'error')
      }
    } catch (e) {
      console.error(e)
      showToast?.('Export to PDF failed', 'error')
    }
  }

  // Export CSV
  const handleExportCsv = () => {
    try {
      const clean = (val) => Number(val || 0).toFixed(2)
      const rows = [
        ['HOMOEOSTORE ERP - PROFIT & LOSS STATEMENT'],
        ['Store Name:', storeProfile?.store_name || 'Homoeo Store'],
        ['Period:', `${periodLabel} (${fromDate} to ${toDate})`],
        ['Generated On:', new Date().toLocaleString('en-IN')],
        [],
        ['PARTICULARS (DR.)', 'AMOUNT (₹)', 'PARTICULARS (CR.)', 'AMOUNT (₹)'],
        ['Opening Stock', clean(data.openingStock), 'Sales Accounts', clean(data.sales)],
        ['Purchase Accounts', clean(data.purchases), 'Closing Stock', clean(data.closingStock)]
      ]

      if (data.directExpenses?.length > 0) {
        rows.push(['Direct Expenses:', '', '', ''])
        data.directExpenses.forEach(exp => {
          rows.push([`  ${exp.name}`, clean(exp.amount), '', ''])
        })
      }

      if (data.grossProfit > 0) {
        rows.push(['Gross Profit c/o', clean(data.grossProfit), '', ''])
      } else if (data.grossProfit < 0) {
        rows.push(['', '', 'Gross Loss c/o', clean(Math.abs(data.grossProfit))])
      }

      if (data.grossProfit < 0) {
        rows.push(['Gross Loss b/f', clean(Math.abs(data.grossProfit)), '', ''])
      } else if (data.grossProfit > 0) {
        rows.push(['', '', 'Gross Profit b/f', clean(data.grossProfit)])
      }

      if (data.indirectExpenses?.length > 0) {
        rows.push(['Indirect Expenses:', '', '', ''])
        data.indirectExpenses.forEach(exp => {
          rows.push([`  ${exp.name}`, clean(exp.amount), '', ''])
        })
      }

      if (data.indirectIncomes?.length > 0) {
        rows.push(['', '', 'Indirect Incomes:', ''])
        data.indirectIncomes.forEach(inc => {
          rows.push(['', '', `  ${inc.name}`, clean(inc.amount)])
        })
      }

      const isLoss = data.netProfit < 0
      if (!isLoss) {
        rows.push(['NET PROFIT', clean(data.netProfit), '', ''])
      } else {
        rows.push(['', '', 'NET LOSS', clean(Math.abs(data.netProfit))])
      }

      const totalPnLDr = (data.indirectExpenses || []).reduce((s, e) => s + e.amount, 0) + (data.grossProfit < 0 ? Math.abs(data.grossProfit) : 0) + (data.netProfit > 0 ? data.netProfit : 0)
      const totalPnLCr = (data.indirectIncomes || []).reduce((s, e) => s + e.amount, 0) + (data.grossProfit > 0 ? data.grossProfit : 0) + (data.netProfit < 0 ? Math.abs(data.netProfit) : 0)
      rows.push(['TOTAL', clean(totalPnLDr), 'TOTAL', clean(totalPnLCr)])

      const csvContent = '\uFEFF' + rows.map(r => r.map(c => `"${(c || '').toString().replace(/"/g, '""')}"`).join(',')).join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute('download', `Profit_and_Loss_${fromDate}_${toDate}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      showToast?.('Excel / CSV Exported Successfully!', 'success')
    } catch (e) {
      console.error(e)
      showToast?.('Export CSV failed', 'error')
    }
  }

  // Print Window
  const handlePrint = () => {
    window.print()
  }

  // KPI Calculations
  const isLoss = data.netProfit < 0
  const isGrossLoss = data.grossProfit < 0

  const totalRevenue = (data.sales || 0) + (data.indirectIncomes || []).reduce((s, i) => s + i.amount, 0)
  const totalDirectCosts = (data.openingStock || 0) + (data.purchases || 0) + (data.directExpenses || []).reduce((s, e) => s + e.amount, 0)
  const totalIndirectCosts = (data.indirectExpenses || []).reduce((s, e) => s + e.amount, 0)
  const totalAllExpenses = totalDirectCosts + totalIndirectCosts

  const gpMargin = data.sales !== 0 ? ((data.grossProfit / Math.abs(data.sales)) * 100).toFixed(1) : '0.0'
  const netMargin = data.sales !== 0 ? ((data.netProfit / Math.abs(data.sales)) * 100).toFixed(1) : '0.0'

  // Totals for balancing
  const totalPnLDr = (data.indirectExpenses || []).reduce((s, e) => s + e.amount, 0) + (data.grossProfit < 0 ? Math.abs(data.grossProfit) : 0) + (data.netProfit > 0 ? data.netProfit : 0)
  const totalPnLCr = (data.indirectIncomes || []).reduce((s, e) => s + e.amount, 0) + (data.grossProfit > 0 ? data.grossProfit : 0) + (data.netProfit < 0 ? Math.abs(data.netProfit) : 0)

  // Chart Data
  const chartData = useMemo(() => [
    { name: 'Turnover & Incomes', amount: totalRevenue > 0 ? totalRevenue : 0, fill: '#059669' },
    { name: 'Purchases & Cost', amount: totalDirectCosts > 0 ? totalDirectCosts : 0, fill: '#d97706' },
    { name: 'Indirect Expenses', amount: totalIndirectCosts > 0 ? totalIndirectCosts : 0, fill: '#6366f1' },
    { name: isLoss ? 'Net Deficit' : 'Net Surplus', amount: Math.abs(data.netProfit), fill: isLoss ? '#e11d48' : '#10b981' }
  ], [totalRevenue, totalDirectCosts, totalIndirectCosts, data.netProfit, isLoss])

  // Filtered transactions in drill-down modal
  const modalTransactions = useMemo(() => {
    if (!drillModal.statement?.transactions) return []
    if (!drillModal.searchTerm) return drillModal.statement.transactions
    const term = drillModal.searchTerm.toLowerCase()
    return drillModal.statement.transactions.filter(t =>
      (t.particulars && t.particulars.toLowerCase().includes(term)) ||
      (t.voucher_type && t.voucher_type.toLowerCase().includes(term)) ||
      (t.voucher_no && t.voucher_no.toString().toLowerCase().includes(term))
    )
  }, [drillModal.statement, drillModal.searchTerm])

  // Render Variance Badge
  const renderVariance = (curr, prev) => {
    if (!compareWithPrev || prev === undefined || prev === null) return null
    const diff = Number(curr || 0) - Number(prev || 0)
    const pct = prev !== 0 ? ((diff / Math.abs(prev)) * 100).toFixed(1) : (curr !== 0 ? '100.0' : '0.0')
    const isUp = diff > 0
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: '90px' }}>
        <span style={{ fontSize: '11px', color: '#64748b' }}>₹ {fmt(prev)}</span>
        <span style={{
          fontSize: '10px',
          fontWeight: '700',
          color: isUp ? '#059669' : '#dc2626',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '2px'
        }}>
          {isUp ? '▲ +' : '▼ '}{pct}%
        </span>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', fontFamily: 'Outfit, sans-serif' }}>
      
      {/* ─── TOP HEADER & ACTIONS ─── */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
              Profit & Loss A/c
            </h1>
            <span style={{ fontSize: '11px', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '2px 8px', borderRadius: '12px', fontWeight: '700' }}>
              {storeProfile?.store_name || 'Trading & Income'}
            </span>
          </div>
          <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', fontWeight: '500' }}>
            Comprehensive Trading & Income Statement &bull; Period: <strong style={{ color: '#0f172a' }}>{periodLabel}</strong> ({fromDate} to {toDate})
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowChart(!showChart)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: showChart ? '#e0e7ff' : '#fff',
              color: showChart ? '#3730a3' : '#475569',
              border: `1px solid ${showChart ? '#c7d2fe' : '#cbd5e1'}`,
              borderRadius: '8px', padding: '7px 12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer'
            }}
          >
            📊 {showChart ? 'Hide Visuals' : 'Show Chart'}
          </button>

          <button
            onClick={() => setHideZeroBalances(!hideZeroBalances)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: hideZeroBalances ? '#f1f5f9' : '#fff',
              color: hideZeroBalances ? '#0f172a' : '#475569',
              border: `1px solid ${hideZeroBalances ? '#94a3b8' : '#cbd5e1'}`,
              borderRadius: '8px', padding: '7px 12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer'
            }}
          >
            {hideZeroBalances ? '👁️ Show Zero Balances' : '🚫 Hide Zero Balances'}
          </button>

          <button
            onClick={() => setCompareWithPrev(!compareWithPrev)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: compareWithPrev ? '#fef3c7' : '#fff',
              color: compareWithPrev ? '#92400e' : '#475569',
              border: `1px solid ${compareWithPrev ? '#fde68a' : '#cbd5e1'}`,
              borderRadius: '8px', padding: '7px 12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer'
            }}
          >
            🔄 {compareWithPrev ? 'Comparing Previous' : 'Compare Previous'}
          </button>

          <div style={{ height: '24px', width: '1px', background: '#e2e8f0', margin: '0 4px' }} />

          <button
            onClick={handleExportPdf}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: '#047857', color: '#fff', border: 'none',
              borderRadius: '8px', padding: '7px 14px', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(4, 120, 87, 0.2)'
            }}
          >
            📑 Export PDF
          </button>

          <button
            onClick={handleExportCsv}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: '#0284c7', color: '#fff', border: 'none',
              borderRadius: '8px', padding: '7px 14px', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(2, 132, 199, 0.2)'
            }}
          >
            📊 Excel / CSV
          </button>

          <button
            onClick={handlePrint}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: '#0f172a', color: '#fff', border: 'none',
              borderRadius: '8px', padding: '7px 14px', fontSize: '12px', fontWeight: '700', cursor: 'pointer'
            }}
          >
            🖨️ Print
          </button>
        </div>
      </div>

      {/* ─── AREA 1: DATE & PERIOD FILTER TOOLBAR ─── */}
      <div className="no-print" style={{
        background: '#fff', padding: '12px 18px', borderRadius: '12px',
        border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
              Period Preset
            </label>
            <select
              value={periodPreset}
              onChange={(e) => handlePresetChange(e.target.value)}
              style={{
                background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px',
                padding: '7px 12px', fontSize: '13px', fontWeight: '600', color: '#0f172a', outline: 'none', cursor: 'pointer'
              }}
            >
              <option value="this_fy">This Financial Year (Default)</option>
              <option value="last_fy">Last Financial Year</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="this_quarter">This Quarter</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
                From Date
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value)
                  setPeriodPreset('custom')
                  setPeriodLabel('Custom Range')
                }}
                style={{
                  background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px',
                  padding: '6px 10px', fontSize: '13px', color: '#0f172a', outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
                To Date
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value)
                  setPeriodPreset('custom')
                  setPeriodLabel('Custom Range')
                }}
                style={{
                  background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px',
                  padding: '6px 10px', fontSize: '13px', color: '#0f172a', outline: 'none'
                }}
              />
            </div>

            <button
              onClick={() => loadData(fromDate, toDate, compareWithPrev)}
              style={{
                marginTop: '18px', background: '#f1f5f9', border: '1px solid #cbd5e1',
                borderRadius: '6px', padding: '7px 14px', fontSize: '12px', fontWeight: '700',
                color: '#1e293b', cursor: 'pointer'
              }}
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* Active Range Pill */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: '#f8fafc', padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0'
        }}>
          <span style={{ fontSize: '14px' }}>📅</span>
          <div style={{ fontSize: '11px', color: '#475569' }}>
            <strong>Selected Range:</strong> {fromDate} &rarr; {toDate}
            {compareWithPrev && <div style={{ color: '#b45309', fontWeight: '700' }}>Comparing with prior period</div>}
          </div>
        </div>
      </div>

      {/* ─── AREA 3: EXECUTIVE KPI SUMMARY CARDS ─── */}
      <div className="no-print" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        
        {/* Card 1: Revenue */}
        <div style={{ background: '#fff', borderRadius: '12px', padding: '14px 18px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase' }}>
            <span>Total Turnover & Income</span>
            <span style={{ background: '#ecfdf5', color: '#059669', padding: '2px 6px', borderRadius: '4px', fontSize: '10px' }}>Inflow</span>
          </div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginTop: '6px' }}>
            ₹ {fmt(totalRevenue)}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
            Sales: ₹{fmt(data.sales)} &bull; Incomes: ₹{fmt((data.indirectIncomes||[]).reduce((s,i)=>s+i.amount,0))}
          </div>
        </div>

        {/* Card 2: Costs & Expenses */}
        <div style={{ background: '#fff', borderRadius: '12px', padding: '14px 18px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase' }}>
            <span>Total Cost & Expenses</span>
            <span style={{ background: '#fff7ed', color: '#c2410c', padding: '2px 6px', borderRadius: '4px', fontSize: '10px' }}>Outflow</span>
          </div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginTop: '6px' }}>
            ₹ {fmt(totalAllExpenses)}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
            Purchases: ₹{fmt(data.purchases)} &bull; Expenses: ₹{fmt(totalDirectCosts - data.purchases - data.openingStock + totalIndirectCosts)}
          </div>
        </div>

        {/* Card 3: Gross Profit */}
        <div style={{ background: '#fff', borderRadius: '12px', padding: '14px 18px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#64748b', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase' }}>
            <span>{isGrossLoss ? 'Gross Loss' : 'Gross Profit'}</span>
            <span style={{
              background: isGrossLoss ? '#ffe4e6' : '#dcfce7',
              color: isGrossLoss ? '#be123c' : '#15803d',
              padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: '700'
            }}>
              Margin: {gpMargin}%
            </span>
          </div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: isGrossLoss ? '#be123c' : '#15803d', marginTop: '6px' }}>
            ₹ {fmt(Math.abs(data.grossProfit))}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
            Trading Profit Before Indirect Items
          </div>
        </div>

        {/* Card 4: Net Profit */}
        <div style={{
          background: isLoss ? 'linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)' : 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
          borderRadius: '12px', padding: '14px 18px',
          border: isLoss ? '1px solid #fecdd3' : '1px solid #bbf7d0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: isLoss ? '#9f1239' : '#166534' }}>
            <span>{isLoss ? 'Net Deficit (Loss)' : 'Net Surplus (Profit)'}</span>
            <span style={{
              background: isLoss ? '#f43f5e' : '#10b981', color: '#fff',
              padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: '800'
            }}>
              {netMargin}%
            </span>
          </div>
          <div style={{ fontSize: '22px', fontWeight: '900', color: isLoss ? '#be123c' : '#15803d', marginTop: '6px' }}>
            ₹ {fmt(Math.abs(data.netProfit))}
          </div>
          <div style={{ fontSize: '11px', color: isLoss ? '#9f1239' : '#166534', marginTop: '4px', fontWeight: '600' }}>
            Final Result After All Incomes & Expenses
          </div>
        </div>

      </div>

      {/* ─── AREA 3: OPTIONAL VISUAL CHART ─── */}
      {showChart && (
        <div className="no-print" style={{
          background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0',
          padding: '18px 24px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
              Financial Performance Distribution (₹)
            </h3>
            <span style={{ fontSize: '11px', color: '#64748b' }}>Comparison of key financial drivers</span>
          </div>
          <div style={{ height: '220px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v) => `₹${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}`} />
                <RechartsTooltip
                  formatter={(val) => [`₹ ${fmt(val)}`, 'Amount']}
                  contentStyle={{ background: '#0f172a', borderRadius: '8px', color: '#fff', border: 'none', fontSize: '12px' }}
                  itemStyle={{ color: '#38bdf8' }}
                />
                <Bar dataKey="amount" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ─── AREA 2: MAIN TWO-COLUMN TRADING & PROFIT/LOSS STATEMENT ─── */}
      <div style={{
        background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0',
        flex: 1, display: 'flex', overflow: 'hidden', boxShadow: '0 2px 8px -2px rgba(0,0,0,0.05)'
      }}>
        
        {/* ═════════ DEBIT COLUMN (EXPENSES / TRADING DR) ═════════ */}
        <div style={{ flex: 1, borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
          
          <div style={{
            padding: '12px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <span style={{ fontSize: '11px', color: '#475569', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Particulars (Dr.)
            </span>
            <div style={{ display: 'flex', gap: '16px' }}>
              {compareWithPrev && <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Prev Period</span>}
              <span style={{ fontSize: '11px', color: '#475569', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Amount (₹)
              </span>
            </div>
          </div>

          <div style={{ padding: '20px 24px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            
            {/* 1. Opening Stock */}
            {(!hideZeroBalances || data.openingStock > 0) && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 0', borderBottom: '1px solid #f1f5f9', color: '#0f172a', fontSize: '13px', fontWeight: '700'
                }}>
                  <span>Opening Stock</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {renderVariance(data.openingStock, compareData?.openingStock)}
                    <span>{fmt(data.openingStock)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* 2. Purchase Accounts (Clickable row for Drill-down) */}
            {(!hideZeroBalances || data.purchases > 0 || data.purchaseAccounts?.length > 0) && (
              <div style={{ marginBottom: '20px' }}>
                <div
                  onClick={() => handleOpenDrillDown('Purchase Accounts', 'PURCHASE ACCOUNTS', data.purchaseAccounts?.[0]?.id)}
                  title="Click to view all Purchase transactions"
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 10px', borderRadius: '6px', borderBottom: '1px solid #f1f5f9',
                    color: '#0f172a', fontSize: '13px', fontWeight: '700', cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0369a1' }}>
                    <span>Purchase Accounts</span>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>🔍</span>
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {renderVariance(data.purchases, compareData?.purchases)}
                    <span>{renderAmount(data.purchases)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* 3. Direct Expenses */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                fontWeight: '800', color: '#334155', marginBottom: '6px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em'
              }}>
                <span>Direct Expenses</span>
                <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '600' }}>
                  {data.directExpenses.filter(e => !hideZeroBalances || e.amount !== 0).length} accounts
                </span>
              </div>

              {data.directExpenses.length === 0 && (
                <div style={{ fontSize: '12px', color: '#94a3b8', padding: '6px 0', fontStyle: 'italic' }}>
                  No direct expenses recorded
                </div>
              )}

              {data.directExpenses.map((exp, idx) => {
                if (hideZeroBalances && exp.amount === 0) return null
                const prevExp = compareData?.directExpenses?.find(e => e.name === exp.name)?.amount || 0
                return (
                  <div
                    key={idx}
                    onClick={() => handleOpenDrillDown(exp.name, 'DIRECT EXPENSES', exp.id)}
                    title={`Click to view ledger for ${exp.name}`}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '8px 10px', borderBottom: '1px solid #f8fafc', color: '#475569',
                      fontSize: '12px', fontWeight: '500', cursor: 'pointer', borderRadius: '6px'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                  >
                    <span style={{ paddingLeft: '8px', color: '#1e293b' }}>
                      {exp.name} <span style={{ fontSize: '10px', color: '#cbd5e1' }}>🔍</span>
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      {renderVariance(exp.amount, prevExp)}
                      <span style={{ fontWeight: '700', color: '#0f172a' }}>{renderAmount(exp.amount)}</span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* 4. Gross Profit c/o */}
            <div style={{
              marginBottom: '24px',
              background: data.grossProfit > 0 ? '#f0fdf4' : '#fff',
              padding: '10px 14px', borderRadius: '8px',
              border: data.grossProfit > 0 ? '1px solid #bbf7d0' : '1px dashed #e2e8f0'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: data.grossProfit > 0 ? '#15803d' : '#94a3b8', fontSize: '13px', fontWeight: '800' }}>
                <span>Gross Profit c/o</span>
                <span>{fmt(data.grossProfit > 0 ? data.grossProfit : 0)}</span>
              </div>
            </div>

            {/* ─── P&L Dr Part ─── */}
            {data.grossProfit < 0 && (
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 14px', background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '8px',
                color: '#be123c', fontSize: '13px', fontWeight: '800', marginBottom: '20px'
              }}>
                <span>Gross Loss b/f</span>
                <span>{fmt(Math.abs(data.grossProfit))}</span>
              </div>
            )}

            {/* 5. Indirect Expenses */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                fontWeight: '800', color: '#334155', marginBottom: '6px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em'
              }}>
                <span>Indirect Expenses</span>
                <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '600' }}>
                  {data.indirectExpenses.filter(e => !hideZeroBalances || e.amount !== 0).length} accounts
                </span>
              </div>

              {data.indirectExpenses.length === 0 && (
                <div style={{ fontSize: '12px', color: '#94a3b8', padding: '6px 0', fontStyle: 'italic' }}>
                  No indirect expenses recorded
                </div>
              )}

              {data.indirectExpenses.map((exp, idx) => {
                if (hideZeroBalances && exp.amount === 0) return null
                const prevExp = compareData?.indirectExpenses?.find(e => e.name === exp.name)?.amount || 0
                return (
                  <div
                    key={idx}
                    onClick={() => handleOpenDrillDown(exp.name, 'INDIRECT EXPENSES', exp.id)}
                    title={`Click to view ledger for ${exp.name}`}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '8px 10px', borderBottom: '1px solid #f8fafc', color: '#475569',
                      fontSize: '12px', fontWeight: '500', cursor: 'pointer', borderRadius: '6px'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                  >
                    <span style={{ paddingLeft: '8px', color: '#1e293b' }}>
                      {exp.name} <span style={{ fontSize: '10px', color: '#cbd5e1' }}>🔍</span>
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      {renderVariance(exp.amount, prevExp)}
                      <span style={{ fontWeight: '700', color: '#0f172a' }}>{renderAmount(exp.amount)}</span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* 6. NET PROFIT (Refined Modern Emerald Card) */}
            <div style={{ marginTop: 'auto', marginBottom: '16px' }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 16px',
                background: !isLoss ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)' : '#f8fafc',
                border: !isLoss ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                borderRadius: '8px',
                color: !isLoss ? '#15803d' : '#94a3b8',
                fontSize: '14px', fontWeight: '800',
                boxShadow: !isLoss ? '0 4px 12px -2px rgba(16, 185, 129, 0.2)' : 'none'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>{!isLoss ? '🏆 NET PROFIT' : 'NET PROFIT'}</span>
                  {!isLoss && <span style={{ fontSize: '10px', background: '#15803d', color: '#fff', padding: '1px 6px', borderRadius: '4px' }}>SURPLUS</span>}
                </div>
                <span>₹ {fmt(!isLoss ? data.netProfit : 0)}</span>
              </div>
            </div>

          </div>

          {/* Dr Total Footer */}
          <div style={{
            padding: '14px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <span style={{ fontSize: '12px', color: '#0f172a', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Total
            </span>
            <span style={{ fontSize: '16px', color: '#0f172a', fontWeight: '800' }}>
              ₹ {fmt(totalPnLDr)}
            </span>
          </div>
        </div>

        {/* ═════════ CREDIT COLUMN (INCOME / TRADING CR) ═════════ */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          
          <div style={{
            padding: '12px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <span style={{ fontSize: '11px', color: '#475569', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Particulars (Cr.)
            </span>
            <div style={{ display: 'flex', gap: '16px' }}>
              {compareWithPrev && <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Prev Period</span>}
              <span style={{ fontSize: '11px', color: '#475569', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Amount (₹)
              </span>
            </div>
          </div>

          <div style={{ padding: '20px 24px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            
            {/* 1. Sales Accounts (Clickable row for Drill-down) */}
            {(!hideZeroBalances || data.sales !== 0 || data.salesAccounts?.length > 0) && (
              <div style={{ marginBottom: '20px' }}>
                <div
                  onClick={() => handleOpenDrillDown('Sales Accounts', 'SALES ACCOUNTS', data.salesAccounts?.[0]?.id)}
                  title="Click to view all Sales transactions & returns"
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 10px', borderRadius: '6px', borderBottom: '1px solid #f1f5f9',
                    color: '#0f172a', fontSize: '13px', fontWeight: '700', cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0369a1' }}>
                    <span>Sales Accounts</span>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>🔍</span>
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {renderVariance(data.sales, compareData?.sales)}
                    <span>{renderAmount(data.sales)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* 2. Closing Stock */}
            {(!hideZeroBalances || data.closingStock > 0) && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 0', borderBottom: '1px solid #f1f5f9', color: '#0f172a', fontSize: '13px', fontWeight: '700'
                }}>
                  <span>Closing Stock</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {renderVariance(data.closingStock, compareData?.closingStock)}
                    <span>{fmt(data.closingStock)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* 3. Gross Loss c/o */}
            <div style={{
              marginBottom: '24px',
              background: data.grossProfit < 0 ? '#fff1f2' : '#fff',
              padding: '10px 14px', borderRadius: '8px',
              border: data.grossProfit < 0 ? '1px solid #fecdd3' : '1px dashed #e2e8f0'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: data.grossProfit < 0 ? '#be123c' : '#94a3b8', fontSize: '13px', fontWeight: '800' }}>
                <span>Gross Loss c/o</span>
                <span>{fmt(data.grossProfit < 0 ? Math.abs(data.grossProfit) : 0)}</span>
              </div>
            </div>

            {/* ─── P&L Cr Part ─── */}
            {data.grossProfit > 0 && (
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px',
                color: '#15803d', fontSize: '13px', fontWeight: '800', marginBottom: '20px'
              }}>
                <span>Gross Profit b/f</span>
                <span>{fmt(data.grossProfit)}</span>
              </div>
            )}

            {/* 4. Indirect Incomes */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                fontWeight: '800', color: '#334155', marginBottom: '6px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em'
              }}>
                <span>Indirect Incomes</span>
                <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '600' }}>
                  {data.indirectIncomes.filter(i => !hideZeroBalances || i.amount !== 0).length} accounts
                </span>
              </div>

              {data.indirectIncomes.length === 0 && (
                <div style={{ fontSize: '12px', color: '#94a3b8', padding: '6px 0', fontStyle: 'italic' }}>
                  No indirect incomes recorded
                </div>
              )}

              {data.indirectIncomes.map((inc, idx) => {
                if (hideZeroBalances && inc.amount === 0) return null
                const prevInc = compareData?.indirectIncomes?.find(i => i.name === inc.name)?.amount || 0
                return (
                  <div
                    key={idx}
                    onClick={() => handleOpenDrillDown(inc.name, 'INDIRECT INCOMES', inc.id)}
                    title={`Click to view ledger for ${inc.name}`}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '8px 10px', borderBottom: '1px solid #f8fafc', color: '#475569',
                      fontSize: '12px', fontWeight: '500', cursor: 'pointer', borderRadius: '6px'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                  >
                    <span style={{ paddingLeft: '8px', color: '#1e293b' }}>
                      {inc.name} <span style={{ fontSize: '10px', color: '#cbd5e1' }}>🔍</span>
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      {renderVariance(inc.amount, prevInc)}
                      <span style={{ fontWeight: '700', color: '#0f172a' }}>{renderAmount(inc.amount)}</span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* 5. NET LOSS (Refined Modern Rose Gradient Card) */}
            <div style={{ marginTop: 'auto', marginBottom: '16px' }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 16px',
                background: isLoss ? 'linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)' : '#f8fafc',
                border: isLoss ? '1px solid #fecdd3' : '1px solid #e2e8f0',
                borderRadius: '8px',
                color: isLoss ? '#be123c' : '#94a3b8',
                fontSize: '14px', fontWeight: '800',
                boxShadow: isLoss ? '0 4px 12px -2px rgba(225, 29, 72, 0.15)' : 'none'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>{isLoss ? '⚠️ NET LOSS' : 'NET LOSS'}</span>
                  {isLoss && <span style={{ fontSize: '10px', background: '#be123c', color: '#fff', padding: '1px 6px', borderRadius: '4px' }}>DEFICIT</span>}
                </div>
                <span>₹ {fmt(isLoss ? Math.abs(data.netProfit) : 0)}</span>
              </div>
            </div>

          </div>

          {/* Cr Total Footer */}
          <div style={{
            padding: '14px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <span style={{ fontSize: '12px', color: '#0f172a', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Total
            </span>
            <span style={{ fontSize: '16px', color: '#0f172a', fontWeight: '800' }}>
              ₹ {fmt(totalPnLCr)}
            </span>
          </div>
        </div>

      </div>

      {/* ─── AREA 2: INTERACTIVE LEDGER DRILL-DOWN MODAL ─── */}
      {drillModal.isOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '24px'
        }}>
          <div style={{
            background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '900px',
            maxHeight: '90vh', display: 'flex', flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden'
          }}>
            
            {/* Modal Header */}
            <div style={{
              padding: '16px 24px', background: '#0f172a', color: '#fff',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: '800', margin: 0 }}>
                    {drillModal.title}
                  </h2>
                  <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.15)', padding: '2px 8px', borderRadius: '6px' }}>
                    {drillModal.group || 'Ledger Account'}
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: '#94a3b8', margin: '4px 0 0 0' }}>
                  Period: {fromDate} to {toDate} &bull; Chronological Statement
                </p>
              </div>

              <button
                onClick={() => setDrillModal(prev => ({ ...prev, isOpen: false }))}
                style={{
                  background: 'transparent', border: 'none', color: '#cbd5e1',
                  fontSize: '20px', cursor: 'pointer', padding: '4px 8px'
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px 24px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {drillModal.loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  Loading ledger transactions...
                </div>
              ) : !drillModal.statement ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  No statement found for this account in the selected period.
                </div>
              ) : (
                <>
                  {/* Ledger Summary Stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                    <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Opening Balance</span>
                      <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>
                        ₹ {fmt(drillModal.statement.opening_balance)} {drillModal.statement.opening_balance_type}
                      </div>
                    </div>

                    <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Total Debits</span>
                      <div style={{ fontSize: '14px', fontWeight: '800', color: '#0369a1', marginTop: '2px' }}>
                        ₹ {fmt(drillModal.statement.transactions.reduce((s, t) => s + (t.dr_amount || 0), 0))}
                      </div>
                    </div>

                    <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Total Credits</span>
                      <div style={{ fontSize: '14px', fontWeight: '800', color: '#047857', marginTop: '2px' }}>
                        ₹ {fmt(drillModal.statement.transactions.reduce((s, t) => s + (t.cr_amount || 0), 0))}
                      </div>
                    </div>

                    <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Closing Balance</span>
                      <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>
                        ₹ {fmt(drillModal.statement.closing_balance)} {drillModal.statement.closing_balance_type}
                      </div>
                    </div>
                  </div>

                  {/* Search Bar inside transactions */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="Search voucher or particulars..."
                      value={drillModal.searchTerm}
                      onChange={(e) => setDrillModal(prev => ({ ...prev, searchTerm: e.target.value }))}
                      style={{
                        padding: '7px 12px', fontSize: '12px', borderRadius: '6px',
                        border: '1px solid #cbd5e1', width: '280px', outline: 'none'
                      }}
                    />
                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                      Showing <strong>{modalTransactions.length}</strong> transactions
                    </span>
                  </div>

                  {/* Transactions Table */}
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                          <th style={{ padding: '8px 12px' }}>Date</th>
                          <th style={{ padding: '8px 12px' }}>Vch Type</th>
                          <th style={{ padding: '8px 12px' }}>Vch No</th>
                          <th style={{ padding: '8px 12px' }}>Particulars</th>
                          <th style={{ padding: '8px 12px', textAlign: 'right' }}>Debit (₹)</th>
                          <th style={{ padding: '8px 12px', textAlign: 'right' }}>Credit (₹)</th>
                          <th style={{ padding: '8px 12px', textAlign: 'right' }}>Running Bal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {modalTransactions.length === 0 ? (
                          <tr>
                            <td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>
                              No transactions match the criteria.
                            </td>
                          </tr>
                        ) : (
                          modalTransactions.map((tx, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '8px 12px', color: '#64748b' }}>
                                {tx.date ? new Date(tx.date).toLocaleDateString('en-IN') : '-'}
                              </td>
                              <td style={{ padding: '8px 12px', fontWeight: '600', color: '#0f172a' }}>
                                {tx.voucher_type}
                              </td>
                              <td style={{ padding: '8px 12px', color: '#64748b' }}>
                                {tx.voucher_no || '-'}
                              </td>
                              <td style={{ padding: '8px 12px', color: '#334155' }}>
                                {tx.particulars || '-'}
                              </td>
                              <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '600', color: tx.dr_amount > 0 ? '#0284c7' : '#94a3b8' }}>
                                {tx.dr_amount > 0 ? fmt(tx.dr_amount) : '-'}
                              </td>
                              <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '600', color: tx.cr_amount > 0 ? '#059669' : '#94a3b8' }}>
                                {tx.cr_amount > 0 ? fmt(tx.cr_amount) : '-'}
                              </td>
                              <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '700', color: '#0f172a' }}>
                                {fmt(tx.running_balance)} {tx.running_balance_type}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '12px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0',
              display: 'flex', justifyContent: 'flex-end', gap: '10px'
            }}>
              <button
                onClick={() => setDrillModal(prev => ({ ...prev, isOpen: false }))}
                style={{
                  background: '#e2e8f0', color: '#334155', border: 'none',
                  borderRadius: '6px', padding: '8px 16px', fontSize: '12px', fontWeight: '700', cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Embedded CSS for Print Mode */}
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: #fff !important;
            padding: 0 !important;
          }
        }
      `}</style>

    </div>
  )
}

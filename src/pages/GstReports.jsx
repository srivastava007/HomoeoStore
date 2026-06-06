import React, { useState, useEffect } from 'react'
import { useDialog } from '../context/DialogContext'
import DateInput from '../components/DateInput'

export default function GstReports() {
  const { showToast } = useDialog()
  const [activeTab, setActiveTab] = useState('gstr1')
  const [b2bInvoices, setB2bInvoices] = useState([])
  const [hsnSummary, setHsnSummary] = useState([])
  const [data, setData] = useState({
    outputTax: 0,
    itc: 0,
    netPayable: 0,
    gstr1: {
      b2b: { count: 0, taxable: 0, igst: 0, cgst: 0, sgst: 0 },
      b2c: { count: 0, taxable: 0, igst: 0, cgst: 0, sgst: 0 },
      nil: { count: 0, taxable: 0, igst: 0, cgst: 0, sgst: 0 }
    }
  })
  
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await window.api.getGstReturns(fromDate || null, toDate || null)
      if (res) setData(res)

      if (window.api.getGstSalesRegisterPaginated && window.api.getLedgers) {
        const [salesRes, ledgersRes] = await Promise.all([
          window.api.getGstSalesRegisterPaginated({ fromDate, toDate, page: 1, limit: 100000 }),
          window.api.getLedgers()
        ])
        
        let b2bList = [];
        let hsnMap = {};

        if (salesRes && salesRes.invoices) {
          salesRes.invoices.forEach(inv => {
            let gstin = null;
            let ledger = ledgersRes.find(l => l.ledger_name === inv.customer_name);
            if (ledger && ledger.gstin && ledger.gstin.trim() !== '') {
              gstin = ledger.gstin.trim();
            }

            let invTaxable = 0;
            let invCgst = 0;
            let invSgst = 0;
            let invTotal = 0;

            if (inv.rates) {
              inv.rates.forEach(r => {
                let rate = r.gst_rate || 0;
                let net = r.net || 0;
                let qty = r.qty || 0;

                let taxable = (net * 100) / (100 + rate);
                let tax = net - taxable;

                invTaxable += taxable;
                invTotal += net;
                invCgst += tax / 2;
                invSgst += tax / 2;

                let hsn = 'Other';
                if (rate === 12) hsn = '3004 (Extrapolated)';
                else if (rate === 5) hsn = '3004 (Extrapolated)';
                else if (rate === 18) hsn = '3306 (Extrapolated)';

                if (!hsnMap[hsn]) {
                  hsnMap[hsn] = { hsn, qty: 0, taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 };
                }
                hsnMap[hsn].qty += qty;
                hsnMap[hsn].taxable += taxable;
                hsnMap[hsn].cgst += tax / 2;
                hsnMap[hsn].sgst += tax / 2;
                hsnMap[hsn].total += net;
              });
            }

            if (gstin) {
              b2bList.push({
                bill_number: inv.bill_number,
                date: inv.created_at,
                customer_name: inv.customer_name,
                gstin: gstin,
                taxable: invTaxable,
                cgst: invCgst,
                sgst: invSgst,
                total: invTotal
              });
            }
          });
        }
        
        setB2bInvoices(b2bList);
        setHsnSummary(Object.values(hsnMap));
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Set default date range to current month
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    
    // Format YYYY-MM-DD (local time)
    const fmtDate = (d) => {
      const offset = d.getTimezoneOffset()
      const modifiedDate = new Date(d.getTime() - (offset*60*1000))
      return modifiedDate.toISOString().split('T')[0]
    }
    
    setFromDate(fmtDate(firstDay))
    setToDate(fmtDate(lastDay))
  }, [])
  
  useEffect(() => {
    if (fromDate && toDate) {
      loadData()
    }
  }, [fromDate, toDate])

  const fmt = (val) => Number(val || 0).toFixed(2)

  const handleExportJson = () => {
    const formatData = (obj) => {
      let newObj = {}
      for (let key in obj) {
        if (typeof obj[key] === 'number') {
          newObj[key] = key === 'count' ? obj[key] : parseFloat(obj[key].toFixed(2))
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          newObj[key] = formatData(obj[key])
        } else {
          newObj[key] = obj[key]
        }
      }
      return newObj
    }

    const rawExportData = {
      period: `${fromDate} to ${toDate}`,
      summary: data.gstr1,
      total_sales_tax: data.outputTax,
      total_purchase_itc: data.itc,
      net_payable: data.netPayable,
      hsn_summary: hsnSummary,
      b2b_invoices: b2bInvoices
    }
    
    const exportData = formatData(rawExportData)
    
    const jsonStr = JSON.stringify(exportData, null, 2)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    
    let prefix = 'GSTR1'
    if (activeTab === 'gstr3b') prefix = 'GSTR3B'
    if (activeTab === 'gstr9') prefix = 'GSTR9'
    
    a.download = `${prefix}_Summary_${fromDate || 'Start'}_to_${toDate || 'End'}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    showToast('JSON Exported Successfully for GST Portal!', 'success')
  }

  const b2b = data.gstr1.b2b
  const b2c = data.gstr1.b2c
  const nil = data.gstr1.nil

  const totalCount = b2b.count + b2c.count + nil.count
  const totalTaxable = b2b.taxable + b2c.taxable + nil.taxable
  const totalIgst = b2b.igst + b2c.igst + nil.igst
  const totalCgst = b2b.cgst + b2c.cgst + nil.cgst
  const totalSgst = b2b.sgst + b2c.sgst + nil.sgst

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%', fontFamily: 'Outfit, sans-serif' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#0f2d1f', margin: '0 0 4px 0', letterSpacing: '-0.5px' }}>GST Returns & Analytics</h1>
          <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>GSTR-1 and GSTR-3B Auto-Computation</p>
        </div>
        
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>From Date</label>
            <DateInput  
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', background: '#fff', color: '#0f172a' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>To Date</label>
            <DateInput  
              value={toDate}
              onChange={e => setToDate(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', background: '#fff', color: '#0f172a' }}
            />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px' }}>
        <div style={{ flex: 1, background: '#fff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>Total Output Tax (Sales)</div>
          <div style={{ fontSize: '32px', fontWeight: '800', color: '#dc2626' }}>₹ {fmt(data.outputTax)}</div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px', fontWeight: '500' }}>Tax collected from B2B & B2C customers</div>
        </div>
        <div style={{ flex: 1, background: '#fff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>Total Input Tax Credit (ITC)</div>
          <div style={{ fontSize: '32px', fontWeight: '800', color: '#16a34a' }}>₹ {fmt(data.itc)}</div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px', fontWeight: '500' }}>Tax paid to Suppliers on Purchases</div>
        </div>
        <div style={{ flex: 1, background: '#0f2d1f', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>Net GST Payable</div>
          <div style={{ fontSize: '32px', fontWeight: '800', color: '#fff' }}>₹ {fmt(data.netPayable)}</div>
          <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '4px', fontWeight: '500' }}>Amount to be paid to Government</div>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
        <div style={{ padding: '20px 24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              onClick={() => setActiveTab('gstr1')} 
              style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: activeTab === 'gstr1' ? '#1e293b' : 'transparent', color: activeTab === 'gstr1' ? '#fff' : '#64748b', fontSize: '14px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              GSTR-1 (Outward)
            </button>
            <button 
              onClick={() => setActiveTab('gstr3b')} 
              style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: activeTab === 'gstr3b' ? '#1e293b' : 'transparent', color: activeTab === 'gstr3b' ? '#fff' : '#64748b', fontSize: '14px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              GSTR-3B (Monthly)
            </button>
            <button 
              onClick={() => setActiveTab('gstr9')} 
              style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: activeTab === 'gstr9' ? '#1e293b' : 'transparent', color: activeTab === 'gstr9' ? '#fff' : '#64748b', fontSize: '14px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              GSTR-9 (Annual)
            </button>
            <button 
              onClick={() => setActiveTab('hsn')} 
              style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: activeTab === 'hsn' ? '#1e293b' : 'transparent', color: activeTab === 'hsn' ? '#fff' : '#64748b', fontSize: '14px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              HSN/SAC Summary
            </button>
            <button 
              onClick={() => setActiveTab('b2b')} 
              style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: activeTab === 'b2b' ? '#1e293b' : 'transparent', color: activeTab === 'b2b' ? '#fff' : '#64748b', fontSize: '14px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              B2B Invoices
            </button>
          </div>
          <button onClick={handleExportJson} style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s ease', opacity: 0.9 }}>
            Export JSON for Portal
          </button>
        </div>
        <div style={{ padding: '0', overflowY: 'auto', flex: 1 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
              <tr>
                <th style={{ padding: '16px 24px', textAlign: 'left', color: '#475569', fontWeight: '700', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {activeTab === 'gstr9' ? 'Description' : activeTab === 'hsn' ? 'HSN Code' : activeTab === 'b2b' ? 'Bill Number' : 'Table Type / Particulars'}
                </th>
                {activeTab === 'gstr1' && <th style={{ padding: '16px 24px', textAlign: 'right', color: '#475569', fontWeight: '700', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>No. of Invoices</th>}
                {activeTab === 'hsn' && <th style={{ padding: '16px 24px', textAlign: 'right', color: '#475569', fontWeight: '700', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Qty</th>}
                {activeTab === 'b2b' && (
                  <>
                    <th style={{ padding: '16px 24px', textAlign: 'left', color: '#475569', fontWeight: '700', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date</th>
                    <th style={{ padding: '16px 24px', textAlign: 'left', color: '#475569', fontWeight: '700', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Customer</th>
                    <th style={{ padding: '16px 24px', textAlign: 'left', color: '#475569', fontWeight: '700', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>GSTIN</th>
                  </>
                )}
                <th style={{ padding: '16px 24px', textAlign: 'right', color: '#475569', fontWeight: '700', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{activeTab === 'gstr9' ? 'Amount (₹)' : 'Taxable Value (₹)'}</th>
                <th style={{ padding: '16px 24px', textAlign: 'right', color: '#475569', fontWeight: '700', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{activeTab === 'b2b' || activeTab === 'hsn' ? 'Total (₹)' : 'IGST (₹)'}</th>
                <th style={{ padding: '16px 24px', textAlign: 'right', color: '#475569', fontWeight: '700', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>CGST (₹)</th>
                <th style={{ padding: '16px 24px', textAlign: 'right', color: '#475569', fontWeight: '700', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>SGST (₹)</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>Calculating GST Returns...</td>
                </tr>
              ) : (
                <>
                  {activeTab === 'gstr1' && (
                    <>
                      <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '16px 24px', fontWeight: '600', color: '#0f172a' }}>4A, 4B, 4C, 6B, 6C - B2B Invoices</td>
                        <td style={{ padding: '16px 24px', textAlign: 'right', color: '#64748b' }}>{b2b.count}</td>
                        <td style={{ padding: '16px 24px', textAlign: 'right', color: '#0f172a', fontWeight: '500' }}>{fmt(b2b.taxable)}</td>
                        <td style={{ padding: '16px 24px', textAlign: 'right', color: '#64748b' }}>{fmt(b2b.igst)}</td>
                        <td style={{ padding: '16px 24px', textAlign: 'right', color: '#64748b' }}>{fmt(b2b.cgst)}</td>
                        <td style={{ padding: '16px 24px', textAlign: 'right', color: '#64748b' }}>{fmt(b2b.sgst)}</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '16px 24px', fontWeight: '600', color: '#0f172a' }}>7 - B2C (Others)</td>
                        <td style={{ padding: '16px 24px', textAlign: 'right', color: '#64748b' }}>{b2c.count}</td>
                        <td style={{ padding: '16px 24px', textAlign: 'right', color: '#0f172a', fontWeight: '500' }}>{fmt(b2c.taxable)}</td>
                        <td style={{ padding: '16px 24px', textAlign: 'right', color: '#64748b' }}>{fmt(b2c.igst)}</td>
                        <td style={{ padding: '16px 24px', textAlign: 'right', color: '#64748b' }}>{fmt(b2c.cgst)}</td>
                        <td style={{ padding: '16px 24px', textAlign: 'right', color: '#64748b' }}>{fmt(b2c.sgst)}</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '16px 24px', fontWeight: '600', color: '#0f172a' }}>8A, 8B, 8C, 8D - Nil Rated, Exempted</td>
                        <td style={{ padding: '16px 24px', textAlign: 'right', color: '#64748b' }}>{nil.count}</td>
                        <td style={{ padding: '16px 24px', textAlign: 'right', color: '#0f172a', fontWeight: '500' }}>{fmt(nil.taxable)}</td>
                        <td style={{ padding: '16px 24px', textAlign: 'right', color: '#64748b' }}>-</td>
                        <td style={{ padding: '16px 24px', textAlign: 'right', color: '#64748b' }}>-</td>
                        <td style={{ padding: '16px 24px', textAlign: 'right', color: '#64748b' }}>-</td>
                      </tr>
                      <tr style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '16px 24px', color: '#0f172a', fontWeight: '800' }}>TOTAL</td>
                        <td style={{ padding: '16px 24px', textAlign: 'right', color: '#0f172a', fontWeight: '800' }}>{totalCount}</td>
                        <td style={{ padding: '16px 24px', textAlign: 'right', color: '#0f172a', fontWeight: '800' }}>{fmt(totalTaxable)}</td>
                        <td style={{ padding: '16px 24px', textAlign: 'right', color: '#0f172a', fontWeight: '800' }}>{fmt(totalIgst)}</td>
                        <td style={{ padding: '16px 24px', textAlign: 'right', color: '#0f172a', fontWeight: '800' }}>{fmt(totalCgst)}</td>
                        <td style={{ padding: '16px 24px', textAlign: 'right', color: '#0f172a', fontWeight: '800' }}>{fmt(totalSgst)}</td>
                      </tr>
                    </>
                  )}

                  {activeTab === 'gstr3b' && (
                    <>
                      <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '16px 24px', fontWeight: '600', color: '#0f172a' }}>3.1 Outward Taxable Supplies</td>
                        <td style={{ padding: '16px 24px', textAlign: 'right', color: '#0f172a', fontWeight: '500' }}>{fmt(totalTaxable)}</td>
                        <td style={{ padding: '16px 24px', textAlign: 'right', color: '#64748b' }}>{fmt(totalIgst)}</td>
                        <td style={{ padding: '16px 24px', textAlign: 'right', color: '#64748b' }}>{fmt(totalCgst)}</td>
                        <td style={{ padding: '16px 24px', textAlign: 'right', color: '#64748b' }}>{fmt(totalSgst)}</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f0fdf4' }}>
                        <td style={{ padding: '16px 24px', fontWeight: '600', color: '#166534' }}>4.0 Eligible ITC (Purchases)</td>
                        <td style={{ padding: '16px 24px', textAlign: 'right', color: '#166534', fontWeight: '500' }}>-</td>
                        <td style={{ padding: '16px 24px', textAlign: 'right', color: '#166534' }}>{fmt(data.itc / 2)}</td>
                        <td style={{ padding: '16px 24px', textAlign: 'right', color: '#166534' }}>{fmt(data.itc / 2)}</td>
                        <td style={{ padding: '16px 24px', textAlign: 'right', color: '#166534' }}>{fmt(data.itc / 2)}</td>
                      </tr>
                      <tr style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '16px 24px', color: '#0f2d1f', fontWeight: '800' }}>6.1 Net Tax Payable</td>
                        <td style={{ padding: '16px 24px', textAlign: 'right', color: '#0f2d1f', fontWeight: '800' }}>-</td>
                        <td colSpan="3" style={{ padding: '16px 24px', textAlign: 'right', color: '#dc2626', fontWeight: '800', fontSize: '16px' }}>₹ {fmt(data.netPayable)}</td>
                      </tr>
                    </>
                  )}

                  {activeTab === 'gstr9' && (
                    <>
                      <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '16px 24px', fontWeight: '600', color: '#0f172a' }}>Total Turnover (Sales)</td>
                        <td style={{ padding: '16px 24px', textAlign: 'right', color: '#0f172a', fontWeight: '500' }}>{fmt(totalTaxable)}</td>
                        <td style={{ padding: '16px 24px', textAlign: 'right', color: '#64748b' }}>{fmt(totalIgst)}</td>
                        <td style={{ padding: '16px 24px', textAlign: 'right', color: '#64748b' }}>{fmt(totalCgst)}</td>
                        <td style={{ padding: '16px 24px', textAlign: 'right', color: '#64748b' }}>{fmt(totalSgst)}</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '16px 24px', fontWeight: '600', color: '#0f172a' }}>Total ITC Availed</td>
                        <td style={{ padding: '16px 24px', textAlign: 'right', color: '#0f172a', fontWeight: '500' }}>-</td>
                        <td style={{ padding: '16px 24px', textAlign: 'right', color: '#64748b' }}>{fmt(data.itc / 2)}</td>
                        <td style={{ padding: '16px 24px', textAlign: 'right', color: '#64748b' }}>{fmt(data.itc / 2)}</td>
                        <td style={{ padding: '16px 24px', textAlign: 'right', color: '#64748b' }}>{fmt(data.itc / 2)}</td>
                      </tr>
                      <tr style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '16px 24px', color: '#0f172a', fontWeight: '800' }}>Total Tax Paid / Payable</td>
                        <td style={{ padding: '16px 24px', textAlign: 'right', color: '#0f172a', fontWeight: '800' }}>-</td>
                        <td colSpan="3" style={{ padding: '16px 24px', textAlign: 'right', color: '#0f172a', fontWeight: '800' }}>₹ {fmt(data.netPayable)}</td>
                      </tr>
                    </>
                  )}

                  {activeTab === 'hsn' && (
                    <>
                      {hsnSummary.length === 0 ? (
                        <tr>
                          <td colSpan="6" style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>No HSN data found for this period.</td>
                        </tr>
                      ) : hsnSummary.map((hsn, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '16px 24px', fontWeight: '600', color: '#0f172a' }}>{hsn.hsn}</td>
                          <td style={{ padding: '16px 24px', textAlign: 'right', color: '#64748b' }}>{hsn.qty}</td>
                          <td style={{ padding: '16px 24px', textAlign: 'right', color: '#0f172a', fontWeight: '500' }}>{fmt(hsn.taxable)}</td>
                          <td style={{ padding: '16px 24px', textAlign: 'right', color: '#0f172a', fontWeight: '500' }}>{fmt(hsn.total)}</td>
                          <td style={{ padding: '16px 24px', textAlign: 'right', color: '#64748b' }}>{fmt(hsn.cgst)}</td>
                          <td style={{ padding: '16px 24px', textAlign: 'right', color: '#64748b' }}>{fmt(hsn.sgst)}</td>
                        </tr>
                      ))}
                    </>
                  )}

                  {activeTab === 'b2b' && (
                    <>
                      {b2bInvoices.length === 0 ? (
                        <tr>
                          <td colSpan="8" style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>No B2B Invoices found for this period.</td>
                        </tr>
                      ) : b2bInvoices.map((inv, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '16px 24px', fontWeight: '600', color: '#0f172a' }}>{inv.bill_number}</td>
                          <td style={{ padding: '16px 24px', color: '#64748b' }}>{new Date(inv.date).toLocaleDateString()}</td>
                          <td style={{ padding: '16px 24px', color: '#0f172a' }}>{inv.customer_name}</td>
                          <td style={{ padding: '16px 24px', color: '#64748b' }}>{inv.gstin}</td>
                          <td style={{ padding: '16px 24px', textAlign: 'right', color: '#0f172a', fontWeight: '500' }}>{fmt(inv.taxable)}</td>
                          <td style={{ padding: '16px 24px', textAlign: 'right', color: '#0f172a', fontWeight: '500' }}>{fmt(inv.total)}</td>
                          <td style={{ padding: '16px 24px', textAlign: 'right', color: '#64748b' }}>{fmt(inv.cgst)}</td>
                          <td style={{ padding: '16px 24px', textAlign: 'right', color: '#64748b' }}>{fmt(inv.sgst)}</td>
                        </tr>
                      ))}
                    </>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}

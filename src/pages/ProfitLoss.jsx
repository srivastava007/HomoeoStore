import React, { useState, useEffect } from 'react'

export default function ProfitLoss() {
  const [data, setData] = useState({
    openingStock: 0,
    purchases: 0,
    directExpenses: [],
    sales: 0,
    indirectExpenses: [],
    indirectIncomes: [],
    closingStock: 0,
    grossProfit: 0,
    netProfit: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await window.api.getProfitLoss()
        if (res) setData(res)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const fmt = (val) => Number(val || 0).toFixed(2)
  const isLoss = data.netProfit < 0
  
  // Totals for P&L Account (Net Profit part)
  const totalPnLDr = data.indirectExpenses.reduce((s, e) => s + e.amount, 0) + (data.grossProfit < 0 ? Math.abs(data.grossProfit) : 0) + (data.netProfit > 0 ? data.netProfit : 0)
  const totalPnLCr = data.indirectIncomes.reduce((s, e) => s + e.amount, 0) + (data.grossProfit > 0 ? data.grossProfit : 0) + (data.netProfit < 0 ? Math.abs(data.netProfit) : 0)

  if (loading) return <div style={{ padding: '24px', color: '#64748b' }}>Loading Profit & Loss...</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%', fontFamily: 'Outfit, sans-serif' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '4px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>Profit & Loss A/c</h1>
          <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', fontWeight: '500' }}>Trading and Income Statement</p>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', flex: 1, display: 'flex', overflow: 'hidden', boxShadow: '0 2px 4px -1px rgba(0,0,0,0.05)' }}>
        
        {/* EXPENSES / TRADING DR */}
        <div style={{ flex: 1, borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '12px 24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Particulars (Dr.)</span>
            <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Amount (₹)</span>
          </div>
          <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
            
            <div style={{ marginBottom: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9', color: '#0f172a', fontSize: '13px', fontWeight: '700' }}>
                <span>Opening Stock</span>
                <span>{fmt(data.openingStock)}</span>
              </div>
            </div>

            <div style={{ marginBottom: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9', color: '#0f172a', fontSize: '13px', fontWeight: '700' }}>
                <span>Purchase Accounts</span>
                <span>{fmt(data.purchases)}</span>
              </div>
            </div>

            <div style={{ marginBottom: '28px' }}>
              <div style={{ fontWeight: '700', color: '#0f172a', marginBottom: '4px', fontSize: '13px' }}>Direct Expenses</div>
              {data.directExpenses.length === 0 && <div style={{ fontSize: '12px', color: '#94a3b8', padding: '10px 0' }}>No direct expenses</div>}
              {data.directExpenses.map((exp, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9', color: '#475569', fontSize: '12px', fontWeight: '500' }}>
                  <span style={{ paddingLeft: '16px' }}>{exp.name}</span>
                  <span style={{ fontWeight: '600', color: '#0f172a' }}>{fmt(exp.amount)}</span>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: '32px', background: data.grossProfit > 0 ? '#f0fdf4' : '#fff', padding: '12px 16px', borderRadius: '8px', border: data.grossProfit > 0 ? '1px solid #bbf7d0' : 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: data.grossProfit > 0 ? '#166534' : '#0f172a', fontSize: '14px', fontWeight: '800' }}>
                <span>Gross Profit c/o</span>
                <span>{fmt(data.grossProfit > 0 ? data.grossProfit : 0)}</span>
              </div>
            </div>

            {/* P&L Part Dr */}
            <div style={{ marginBottom: '28px' }}>
              {data.grossProfit < 0 && (
                 <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9', color: '#ef4444', fontSize: '14px', fontWeight: '800', marginBottom: '16px' }}>
                   <span>Gross Loss b/f</span>
                   <span>{fmt(Math.abs(data.grossProfit))}</span>
                 </div>
              )}
              
              <div style={{ fontWeight: '700', color: '#0f172a', marginBottom: '4px', fontSize: '13px' }}>Indirect Expenses</div>
              {data.indirectExpenses.length === 0 && <div style={{ fontSize: '12px', color: '#94a3b8', padding: '10px 0' }}>No indirect expenses</div>}
              {data.indirectExpenses.map((exp, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9', color: '#475569', fontSize: '12px', fontWeight: '500' }}>
                  <span style={{ paddingLeft: '16px' }}>{exp.name}</span>
                  <span style={{ fontWeight: '600', color: '#0f172a' }}>{fmt(exp.amount)}</span>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: isLoss ? '#fff' : '#10b981', borderRadius: '8px', color: isLoss ? '#0f172a' : '#fff', fontSize: '14px', fontWeight: '800', boxShadow: isLoss ? 'none' : '0 4px 14px 0 rgba(16, 185, 129, 0.39)' }}>
                <span>NET PROFIT</span>
                <span>{fmt(isLoss ? 0 : data.netProfit)}</span>
              </div>
            </div>

          </div>
          <div style={{ padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#0f172a', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total</span>
            <span style={{ fontSize: '16px', color: '#0f172a', fontWeight: '800' }}>{fmt(totalPnLDr)}</span>
          </div>
        </div>

        {/* INCOME / TRADING CR */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '12px 24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Particulars (Cr.)</span>
            <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Amount (₹)</span>
          </div>
          <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
            
            <div style={{ marginBottom: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9', color: '#0f172a', fontSize: '13px', fontWeight: '700' }}>
                <span>Sales Accounts</span>
                <span>{fmt(data.sales)}</span>
              </div>
            </div>

            <div style={{ marginBottom: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9', color: '#0f172a', fontSize: '13px', fontWeight: '700' }}>
                <span>Closing Stock</span>
                <span>{fmt(data.closingStock)}</span>
              </div>
            </div>

            <div style={{ marginBottom: '32px', background: data.grossProfit < 0 ? '#fef2f2' : '#fff', padding: '12px 16px', borderRadius: '8px', border: data.grossProfit < 0 ? '1px solid #fecaca' : 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: data.grossProfit < 0 ? '#b91c1c' : '#0f172a', fontSize: '14px', fontWeight: '800' }}>
                <span>Gross Loss c/o</span>
                <span>{fmt(data.grossProfit < 0 ? Math.abs(data.grossProfit) : 0)}</span>
              </div>
            </div>

            {/* P&L Part Cr */}
            <div style={{ marginBottom: '28px' }}>
              {data.grossProfit > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9', color: '#10b981', fontSize: '14px', fontWeight: '800', marginBottom: '16px' }}>
                  <span>Gross Profit b/f</span>
                  <span>{fmt(data.grossProfit)}</span>
                </div>
              )}

              <div style={{ fontWeight: '700', color: '#0f172a', marginBottom: '4px', fontSize: '13px' }}>Indirect Incomes</div>
              {data.indirectIncomes.length === 0 && <div style={{ fontSize: '12px', color: '#94a3b8', padding: '10px 0' }}>No indirect incomes</div>}
              {data.indirectIncomes.map((inc, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9', color: '#475569', fontSize: '12px', fontWeight: '500' }}>
                  <span style={{ paddingLeft: '16px' }}>{inc.name}</span>
                  <span style={{ fontWeight: '600', color: '#0f172a' }}>{fmt(inc.amount)}</span>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: isLoss ? '#ef4444' : '#fff', borderRadius: '8px', color: isLoss ? '#fff' : '#0f172a', fontSize: '14px', fontWeight: '800', boxShadow: isLoss ? '0 4px 14px 0 rgba(239, 68, 68, 0.39)' : 'none' }}>
                <span>NET LOSS</span>
                <span>{fmt(isLoss ? Math.abs(data.netProfit) : 0)}</span>
              </div>
            </div>

          </div>
          <div style={{ padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#0f172a', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total</span>
            <span style={{ fontSize: '16px', color: '#0f172a', fontWeight: '800' }}>{fmt(totalPnLCr)}</span>
          </div>
        </div>

      </div>
    </div>
  )
}

import React, { useState, useEffect } from 'react'

export default function BalanceSheet() {
  const [data, setData] = useState({
    capital: 0, loans: 0, creditors: 0, duties_taxes: 0,
    fixed_assets: 0, debtors: 0, cash: 0, bank: 0,
    profit_loss: { opening: 0, current: 0 }, closing_stock: 0
  })

  useEffect(() => {
    async function load() {
      const res = await window.api.getBalanceSheet()
      if (res) setData(res)
    }
    load()
  }, [])

  const fmt = (val) => Number(val || 0).toFixed(2)

  const totalLiabilities = data.capital + data.loans + data.creditors + data.duties_taxes + data.profit_loss.opening + data.profit_loss.current
  const totalAssets = data.fixed_assets + data.closing_stock + data.debtors + data.cash + data.bank

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%', fontFamily: 'Outfit, sans-serif' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '4px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>Balance Sheet</h1>
          <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', fontWeight: '500' }}>Statement of Financial Position</p>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', flex: 1, display: 'flex', overflow: 'hidden', boxShadow: '0 2px 4px -1px rgba(0,0,0,0.05)' }}>
        
        {/* LIABILITIES */}
        <div style={{ flex: 1, borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '12px 24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Liabilities</span>
            <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Amount (₹)</span>
          </div>
          <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
            
            <div style={{ marginBottom: '28px' }}>
              <div style={{ fontWeight: '700', color: '#0f172a', marginBottom: '4px', fontSize: '13px' }}>Capital Account</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9', color: '#475569', fontSize: '12px', fontWeight: '500' }}>
                <span style={{ paddingLeft: '16px' }}>Owner's Capital</span>
                <span style={{ fontWeight: '600', color: '#0f172a' }}>{fmt(data.capital)}</span>
              </div>
            </div>

            <div style={{ marginBottom: '28px' }}>
              <div style={{ fontWeight: '700', color: '#0f172a', marginBottom: '4px', fontSize: '13px' }}>Loans (Liability)</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9', color: '#475569', fontSize: '12px', fontWeight: '500' }}>
                <span style={{ paddingLeft: '16px' }}>Bank Loans & Borrowings</span>
                <span style={{ fontWeight: '600', color: '#0f172a' }}>{fmt(data.loans)}</span>
              </div>
            </div>

            <div style={{ marginBottom: '28px' }}>
              <div style={{ fontWeight: '700', color: '#0f172a', marginBottom: '4px', fontSize: '13px' }}>Current Liabilities</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9', color: '#475569', fontSize: '12px', fontWeight: '500' }}>
                <span style={{ paddingLeft: '16px' }}>Sundry Creditors (Suppliers)</span>
                <span style={{ fontWeight: '600', color: '#0f172a' }}>{fmt(data.creditors)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9', color: '#475569', fontSize: '12px', fontWeight: '500' }}>
                <span style={{ paddingLeft: '16px' }}>Duties & Taxes (GST Payable)</span>
                <span style={{ fontWeight: '600', color: '#0f172a' }}>{fmt(data.duties_taxes)}</span>
              </div>
            </div>

            <div style={{ marginBottom: '28px' }}>
              <div style={{ fontWeight: '700', color: '#ef4444', marginBottom: '4px', fontSize: '13px' }}>Profit & Loss A/c</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9', color: '#475569', fontSize: '12px', fontWeight: '500' }}>
                <span style={{ paddingLeft: '16px' }}>Opening Balance</span>
                <span style={{ fontWeight: '600', color: '#0f172a' }}>{fmt(data.profit_loss.opening)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9', color: '#475569', fontSize: '12px', fontWeight: '500' }}>
                <span style={{ paddingLeft: '16px' }}>Current Period</span>
                <span style={{ fontWeight: '600', color: '#0f172a' }}>{fmt(data.profit_loss.current)}</span>
              </div>
            </div>

          </div>
          <div style={{ padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#0f172a', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total</span>
            <span style={{ fontSize: '16px', color: '#10b981', fontWeight: '800' }}>{fmt(totalLiabilities)}</span>
          </div>
        </div>

        {/* ASSETS */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '12px 24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Assets</span>
            <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Amount (₹)</span>
          </div>
          <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
            
            <div style={{ marginBottom: '28px' }}>
              <div style={{ fontWeight: '700', color: '#0f172a', marginBottom: '4px', fontSize: '13px' }}>Fixed Assets</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9', color: '#475569', fontSize: '12px', fontWeight: '500' }}>
                <span style={{ paddingLeft: '16px' }}>All Fixed Assets</span>
                <span style={{ fontWeight: '600', color: '#0f172a' }}>{fmt(data.fixed_assets)}</span>
              </div>
            </div>

            <div style={{ marginBottom: '28px' }}>
              <div style={{ fontWeight: '700', color: '#0f172a', marginBottom: '4px', fontSize: '13px' }}>Current Assets</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9', color: '#475569', fontSize: '12px', fontWeight: '500' }}>
                <span style={{ paddingLeft: '16px' }}>Closing Stock (Inventory)</span>
                <span style={{ fontWeight: '600', color: '#0f172a' }}>{fmt(data.closing_stock)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9', color: '#475569', fontSize: '12px', fontWeight: '500' }}>
                <span style={{ paddingLeft: '16px' }}>Sundry Debtors (Customers)</span>
                <span style={{ fontWeight: '600', color: '#0f172a' }}>{fmt(data.debtors)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9', color: '#475569', fontSize: '12px', fontWeight: '500' }}>
                <span style={{ paddingLeft: '16px' }}>Cash-in-Hand</span>
                <span style={{ fontWeight: '600', color: '#0f172a' }}>{fmt(data.cash)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9', color: '#475569', fontSize: '12px', fontWeight: '500' }}>
                <span style={{ paddingLeft: '16px' }}>Bank Accounts</span>
                <span style={{ fontWeight: '600', color: '#0f172a' }}>{fmt(data.bank)}</span>
              </div>
            </div>

          </div>
          <div style={{ padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#0f172a', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total</span>
            <span style={{ fontSize: '16px', color: '#10b981', fontWeight: '800' }}>{fmt(totalAssets)}</span>
          </div>
        </div>

      </div>
    </div>
  )
}

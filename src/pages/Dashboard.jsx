import { useState, useEffect, useMemo } from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LabelList } from 'recharts'
import './Dashboard.css'

function StatCard({ label, value, sub, color, icon, isPrivate }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className={`stat-card ${isPrivate ? 'pointer' : ''}`}
      style={{ boxShadow: isHovered ? `0 22px 44px -12px ${color}60, 0 0 24px ${color}20` : '' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="stat-card-blur-bg" style={{ background: `radial-gradient(circle, ${color}15 0%, transparent 70%)` }} />

      <div className="stat-card-header">
        <div className="stat-card-icon-container" style={{ 
            background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`, 
            boxShadow: `0 8px 16px ${color}40`
        }}>
            <span className="stat-card-icon">{icon}</span>
        </div>
        {isPrivate && !isHovered && <div className="stat-card-hidden-badge">HIDDEN</div>}
      </div>
      <div className="stat-card-body">
        <div className="stat-card-value">
          {isPrivate && !isHovered ? '••••••' : value}
        </div>
        <div className="stat-card-label">
          {label} {sub && <span className="stat-card-sublabel">({sub})</span>}
        </div>
      </div>
    </div>
  )
}

function ActionButtons({ onNavigate }) {
  return (
    <div className="action-buttons-group">
      <button className="action-button-light" onClick={() => onNavigate('billing')}>
        <span className="action-button-icon">🧾</span> New Bill
      </button>
      <button className="action-button-light" onClick={() => onNavigate('purchase')}>
        <span className="action-button-icon">📦</span> Add Purchase
      </button>
      <button className="action-button-primary" onClick={() => onNavigate('medicines')}>
        <span className="action-button-icon">💊</span> Add Medicine
      </button>
    </div>
  );
}

function SalesAnalyticsChart({ data }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Ensure all 7 continuous days (today and past 6 days) are represented
  const chartData = useMemo(() => {
    const map = new Map();
    if (Array.isArray(data)) {
      data.forEach(item => {
        if (item && item.date) {
          map.set(item.date, Number(item.revenue) || 0);
        }
      });
    }

    const result = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateKey = `${yyyy}-${mm}-${dd}`;

      result.push({
        date: dateKey,
        revenue: map.has(dateKey) ? map.get(dateKey) : 0,
        dayLabel: d.toLocaleDateString('en-IN', { weekday: 'short' }),
        dateLabel: `${d.getDate()}/${d.getMonth() + 1}`,
        fullDateStr: d.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })
      });
    }
    return result;
  }, [data]);

  return (
    <div className="dashboard-panel flex-1-5">
      <div className="panel-header large-margin">
        <div className="panel-indicator-dot" style={{ background: '#3b82f6', boxShadow: '0 0 12px #3b82f6' }} />
        <h2 className="panel-title">Sales (Last 7 Days)</h2>
      </div>
      <div className="chart-wrapper">
        {mounted && (
          <ResponsiveContainer width="99%" height={320}>
            <LineChart data={chartData} margin={{ top: 15, right: 25, left: 10, bottom: 10 }}>
              <defs>
                <filter id="shadow" height="200%">
                  <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#3b82f6" floodOpacity="0.3"/>
                </filter>
              </defs>
              <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="dateLabel" 
                interval={0}
                tick={{fontSize: 12, fill: '#64748b', fontWeight: 600, fontFamily: 'Outfit'}} 
                axisLine={false} 
                tickLine={false} 
                dy={8} 
              />
              <YAxis 
                width={70}
                tick={{fontSize: 12, fill: '#64748b', fontWeight: 600, fontFamily: 'Outfit'}} 
                axisLine={false} 
                tickLine={false} 
                tickFormatter={v => `₹${Number(v).toLocaleString('en-IN')}`} 
              />
              <RechartsTooltip 
                contentStyle={{ 
                  borderRadius: '20px', 
                  border: '1px solid rgba(255,255,255,0.6)', 
                  boxShadow: '0 10px 30px -5px rgba(0,0,0,0.1)', 
                  background: 'rgba(255,255,255,0.9)', 
                  backdropFilter: 'blur(16px)', 
                  WebkitBackdropFilter: 'blur(16px)', 
                  padding: '14px 18px', 
                  fontWeight: '700', 
                  fontFamily: 'Outfit', 
                  color: '#0f172a' 
                }} 
                formatter={(val) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Revenue']} 
                labelFormatter={(label, payload) => {
                  if (payload && payload[0] && payload[0].payload) {
                    return payload[0].payload.fullDateStr;
                  }
                  return label;
                }} 
              />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke="#3b82f6" 
                strokeWidth={5} 
                filter="url(#shadow)" 
                dot={{r: 6, fill: '#ffffff', strokeWidth: 3, stroke: '#3b82f6'}} 
                activeDot={{r: 8, fill: '#3b82f6', strokeWidth: 4, stroke: '#fff', filter: 'drop-shadow(0 0 12px rgba(59,130,246,0.9))'}} 
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function TopSellingChart({ data }) {
  const chartData = (data || []).map(m => ({
    ...m, 
    displayName: `${m.name} ${m.potency || ''} ${m.company ? `(${m.company})` : ''}`.trim()
  }));
  
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const maxQty = Math.max(...chartData.map(d => Number(d.total_qty) || 0), 1);

  return (
    <div className="dashboard-panel">
      <div className="panel-header large-margin">
        <div className="panel-indicator-dot" style={{ background: '#10b981', boxShadow: '0 0 12px #10b981' }} />
        <h2 className="panel-title">Top 5 Selling Medicines</h2>
      </div>
      <div className="chart-wrapper">
        {mounted && (
          <ResponsiveContainer width="99%" height={320}>
            <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 45, left: 10, bottom: 5 }}>
              <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#34d399" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" horizontal={false} stroke="#f1f5f9" />
              <XAxis type="number" domain={[0, Math.ceil(maxQty * 1.3)]} hide />
              <YAxis 
                type="category" 
                dataKey="displayName" 
                width={150} 
                tick={{fontSize: 12, fill: '#64748b', fontWeight: 600, fontFamily: 'Outfit'}} 
                axisLine={false} 
                tickLine={false} 
                tickFormatter={v => v.length > 20 ? `${v.substring(0, 18)}…` : v}
              />
              <RechartsTooltip 
                contentStyle={{ 
                  borderRadius: '20px', 
                  border: '1px solid rgba(255,255,255,0.6)', 
                  boxShadow: '0 10px 30px -5px rgba(0,0,0,0.1)', 
                  background: 'rgba(255,255,255,0.9)', 
                  backdropFilter: 'blur(16px)', 
                  WebkitBackdropFilter: 'blur(16px)', 
                  padding: '12px 16px', 
                  fontWeight: '700', 
                  fontFamily: 'Outfit', 
                  color: '#0f172a' 
                }} 
                cursor={{fill: 'rgba(255, 255, 255, 0.4)', rx: 12}} 
                formatter={(val) => [`${val} pcs`, 'Qty Sold']} 
              />
              <Bar dataKey="total_qty" fill="url(#barGrad)" radius={[0, 10, 10, 0]} barSize={28}>
                <LabelList dataKey="total_qty" position="right" fill="#059669" fontSize={12} fontWeight={700} formatter={v => `${v} sold`} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function LowStockPanel({ items, onNavigate }) {
  return (
    <div className="dashboard-panel">
      <div className="panel-header">
        <div className="panel-title-group">
            <div className="panel-icon-container" style={{ background: 'linear-gradient(135deg, #fde047 0%, #f59e0b 100%)', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)' }}>
              <span>⚠️</span>
            </div>
            <h2 className="panel-title">Low Stock Alerts</h2>
        </div>
        <button className="view-all-button" onClick={() => onNavigate('low-stock-report')}>View All →</button>
      </div>
      {items.length === 0 ? (
        <div className="empty-state">
            <span className="empty-state-icon">✅</span>
            <p className="empty-state-text">All medicines are well stocked</p>
        </div>
      ) : (
        <div className="dashboard-table-container">
          <table className="dashboard-table">
            <thead>
              <tr>
                <th className="text-left">Medicine</th>
                <th className="text-left">Company</th>
                <th className="text-left">Potency</th>
                <th className="text-right">Stock</th>
                <th className="text-right">Min</th>
              </tr>
            </thead>
            <tbody>
              {items.map(m => (
                <tr key={m.id} className="dashboard-table-row">
                  <td className="medicine-name">{m.name}</td>
                  <td className="medicine-company" title={m.company || ''}>{m.company || '—'}</td>
                  <td className="color-muted">{m.potency || '—'}</td>
                  <td className="text-right">
                    <span className={m.stock_quantity === 0 ? 'badge-stock-danger' : 'badge-stock-warning'}>
                      {m.stock_quantity}
                    </span>
                  </td>
                  <td className="text-right color-muted" style={{ fontWeight: 600 }}>{m.low_stock_threshold}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ExpiryAlertsPanel({ items, onNavigate }) {
  return (
    <div className="dashboard-panel">
      <div className="panel-header">
        <div className="panel-title-group">
            <div className="panel-icon-container" style={{ background: 'linear-gradient(135deg, #fca5a5 0%, #ef4444 100%)', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)' }}>
              <span>📅</span>
            </div>
            <h2 className="panel-title">Expiring Next Month</h2>
        </div>
        <button className="view-all-button" onClick={() => onNavigate('expiry-management')}>View All →</button>
      </div>
      {(!items || items.length === 0) ? (
        <div className="empty-state">
            <span className="empty-state-icon">✨</span>
            <p className="empty-state-text">No medicines expiring next month</p>
        </div>
      ) : (
        <div className="dashboard-table-container">
          <table className="dashboard-table">
            <thead>
              <tr>
                <th className="text-left">Medicine</th>
                <th className="text-left">Batch</th>
                <th className="text-center">Stock</th>
                <th className="text-right">Expiry</th>
              </tr>
            </thead>
            <tbody>
              {items.map((m, idx) => {
                const days = Math.ceil((new Date(m.expiry_date) - new Date()) / (1000 * 60 * 60 * 24))
                return (
                  <tr key={idx} className="dashboard-table-row">
                    <td className="medicine-name">{m.name} <span className="medicine-potency">{m.potency}</span></td>
                    <td className="color-muted">{m.batch_number}</td>
                    <td className="text-center">
                      <span className="badge-stock-warning-sm">{m.stock_quantity}</span>
                    </td>
                    <td className="text-right" style={{ fontWeight: 700, color: days <= 15 ? '#ef4444' : '#d97706' }}>
                      {new Date(m.expiry_date).toLocaleDateString('en-IN', {month: 'short', year: '2-digit'})}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function RecentBillsPanel({ items, onNavigate }) {
  return (
    <div className="dashboard-panel">
      <div className="panel-header">
        <div className="panel-title-group">
            <div className="panel-icon-container" style={{ background: 'linear-gradient(135deg, #a7f3d0 0%, #34d399 100%)', boxShadow: '0 4px 12px rgba(52, 211, 153, 0.3)' }}>
              <span>🧾</span>
            </div>
            <h2 className="panel-title">Recent Bills</h2>
        </div>
        <button className="view-all-button" onClick={() => onNavigate('billing')}>View All →</button>
      </div>
      {(!items || items.length === 0) ? (
        <div className="empty-state">
            <span className="empty-state-icon">📭</span>
            <p className="empty-state-text">No recent bills</p>
        </div>
      ) : (
        <div className="recent-bills-list">
          {items.map(b => (
            <div key={b.id} className="bill-item">
              <div className="bill-item-left">
                <div className="bill-avatar">👤</div>
                <div>
                  <div className="bill-number">{b.bill_number}</div>
                  <div className="bill-customer">{b.customer_name || 'Walk-in'}</div>
                </div>
              </div>
              <span className="bill-amount">
                ₹{b.total_amount.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Dashboard({ onNavigate }) {
  const [stats, setStats] = useState(null)
  const [lowStock, setLowStock] = useState([])
  const [expiry, setExpiry] = useState([])
  const [bills, setBills] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [s, ls, ex, b] = await Promise.all([
          window.api.getDashboardStats(),
          window.api.getLowStock(),
          window.api.getExpiryAlerts(),
          window.api.getBills(),
        ])
        setStats(s)
        setLowStock(ls)
        setExpiry(ex)
        setBills(b.slice(0, 6))
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#6b7280' }}>
      Loading...
    </div>
  )

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Dashboard</h1>
          <p className="dashboard-date">{today}</p>
        </div>
        <ActionButtons onNavigate={onNavigate} />
      </div>

      {/* Stat Cards */}
      <div className="stat-cards-group">
        <StatCard
          label="Today's Sales"
          value={stats?.todaySales?.count ?? 0}
          sub="bills"
          color="#10b981"
          icon="🧾"
        />
        <StatCard
          label="Today's Revenue"
          value={`₹${(stats?.todaySales?.revenue ?? 0).toFixed(2)}`}
          color="#3b82f6"
          icon="💰"
          isPrivate={true}
        />
        <StatCard
          label="Low Stock Items"
          value={stats?.lowStock?.count ?? 0}
          sub="reorder"
          color="#f59e0b"
          icon="⚠️"
        />
        <StatCard
          label="Expiring Soon"
          value={stats?.expiryAlerts?.count ?? 0}
          sub="< 60 days"
          color="#ef4444"
          icon="📅"
        />
      </div>

      {/* Analytics Charts */}
      <div className="charts-group">
        <SalesAnalyticsChart data={stats?.salesLast7Days || []} />
        <TopSellingChart data={stats?.topMedicines || []} />
      </div>

      {/* Bottom Two Panels */}
      <div className="charts-group" style={{ animationDelay: '0.3s' }}>
        <LowStockPanel items={lowStock} onNavigate={onNavigate} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <ExpiryAlertsPanel items={stats?.expiringNextMonth || []} onNavigate={onNavigate} />
          <RecentBillsPanel items={bills} onNavigate={onNavigate} />
        </div>
      </div>
    </div>
  )
}
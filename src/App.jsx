import { useState, useEffect } from 'react'
import { useCache } from './context/CacheContext'
import { OrbitProgress } from 'react-loading-indicators'
import Dashboard from './pages/Dashboard'
import Medicines from './pages/Medicines'
import Billing from './pages/RetailBilling'
import WholesaleBilling from './pages/WholesaleBilling'
import IssueSlip from './pages/IssueSlip'
import PartyMaintenance from './pages/PartyMaintenance'
import VoucherEntry from './pages/VoucherEntry'
import ExpiryManagement from './pages/ExpiryManagement'
import Companies from './pages/Companies'
import Reports from './pages/Reports'
import LowStockReport from './pages/LowStockReport'
import StockRegister from './pages/StockRegister'
import ItemLedger from './pages/ItemLedger'
import SalesReturn from './pages/SalesReturn'
import PurchaseReturn from './pages/PurchaseReturn'
import WholesaleReturn from './pages/WholesaleReturn'
import MRMaster from './pages/MRMaster'
import ComingSoon from './pages/ComingSoon'
import BalanceSheet from './pages/BalanceSheet'
import ProfitLoss from './pages/ProfitLoss'
import GstReports from './pages/GstReports'
import LedgerMaster from './pages/LedgerMaster'
import AccountGroups from './pages/AccountGroups'
import HsnSacMaster from './pages/HsnSacMaster'
import FYSelector from './pages/FYSelector'
import CategoryMaster from './pages/CategoryMaster'
import PowerMaster from './pages/PowerMaster'
import PackingMaster from './pages/PackingMaster'
import StockUpdate from './pages/StockUpdate'
import GodownMaster from './pages/GodownMaster'
import StoreProfile from './pages/StoreProfile'
import LedgerBook from './pages/LedgerBook'
import PurchaseEntry from './pages/PurchaseEntry'
import BackupSetup from './pages/BackupSetup'
import Login from './pages/Login'
import DayBook from './pages/DayBook'

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  {
    id: 'billing-returns', label: 'Billing & Returns', icon: '🛒',
    children: [
      { id: 'billing', label: 'Retail Bill (F8)' },
      { id: 'wholesale-billing', label: 'Wholesale Bill' },
      { id: 'issue-slip', label: 'Issue Slips' },
      { id: 'sales-return', label: 'Sales Return (B2C)' },
      { id: 'wholesale-return', label: 'Wholesale Return (B2B)' },
      { id: 'purchase', label: 'Purchase Bill (F9)' },
      { id: 'purchase-return', label: 'Purchase Return (To Supplier)' }
    ]
  },
  {
    id: 'accounts-payments', label: 'Accounts & Payments', icon: '💸',
    children: [
      { id: 'voucher-entry', label: 'Voucher Entry' },
      { id: 'party-maintenance', label: 'Party / Account Maintenance' },
      { id: 'ledger-book', label: 'Ledger Book (Passbook)' },
      { id: 'ledger-master', label: 'Ledger Balances' },
    ]
  },
  {
    id: 'inventory-expiry', label: 'Inventory & Expiry', icon: '📦',
    children: [
      { id: 'medicines', label: 'Item Master' },
      { id: 'stock-update', label: 'Stock Update (F3)' },
      { id: 'expiry-management', label: 'Expiry Management' },
      { id: 'godown-master', label: 'Godown Master' },
    ]
  },
  {
    id: 'reports-analytics', label: 'Reports & Analytics', icon: '📈',
    children: [
      { id: 'reports', label: 'Sales / Business Report' },
      { id: 'stock_register', label: 'Stock Register (Closing)' },
      { id: 'item_ledger', label: 'Item Ledger (In/Out)' },
      { id: 'low-stock-report', label: 'Low Stock Report' },
      { id: 'balance-sheet', label: 'Balance Sheet' },
      { id: 'pl', label: 'Profit & Loss A/c' },
      { id: 'day-book', label: 'Day Book (Daily Txns)' },
      { id: 'gst-dashboard', label: 'GST Returns & Analytics' },
    ]
  },
  {
    id: 'settings-masters', label: 'Settings & Masters', icon: '⚙️',
    children: [
      { id: 'store-profile', label: 'Store Profile' },
      { id: 'companies', label: 'Company Master' },
      { id: 'mr-master', label: 'Reference Master' },
      { id: 'account-groups', label: 'Account Groups' },
      { id: 'category-master', label: 'Category Master' },
      { id: 'power-master', label: 'Power (Potency) Master' },
      { id: 'packing-master', label: 'Packing Master' },
      { id: 'hsn-sac-master', label: 'HSN/SAC Master' },
      { id: 'cloud-backup', label: 'Cloud Backup Setup' }
    ]
  }
]

const ICON_MAP = {
  'dashboard': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>,
  'billing-returns': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>,
  'accounts-payments': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect><line x1="12" y1="4" x2="12" y2="20"></line></svg>,
  'inventory-expiry': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"></line><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>,
  'reports-analytics': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>,
  'settings-masters': <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
}

export default function App() {
  const { initializeCache, isCacheLoading } = useCache()
  const [selectedFY, setSelectedFY] = useState(true)
  const [fyInitialized, setFyInitialized] = useState(false)
  const [userRole, setUserRole] = useState(null) // 'admin' or 'cashier'
  const [active, setActive] = useState('dashboard')
  const [expanded, setExpanded] = useState({ masters: false, transactions: false, inventory: false, network: false })
  const [netStatus, setNetStatus] = useState({ mode: null, ip: null, connected: false })
  const [currentFYData, setCurrentFYData] = useState(null)
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
  
  const [prevMode, setPrevMode] = useState(null)
  const [prevIp, setPrevIp] = useState(null)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  useEffect(() => {
    let timer;
    if (isCacheLoading || !fyInitialized) {
      timer = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => clearInterval(timer);
  }, [isCacheLoading, fyInitialized]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (window.api) {
      console.log('[Cache] Initializing database cache on startup...');
      initializeCache();
    }
  }, [initializeCache]);

  useEffect(() => {
    if (netStatus.mode === null || (netStatus.mode === 'CLIENT' && !netStatus.connected)) {
      return;
    }
    
    const modeKey = `last_selected_fy_${netStatus.mode}`;
    
    // Migrate legacy year selection for convenience
    const legacyFY = localStorage.getItem('last_selected_fy');
    if (legacyFY && !localStorage.getItem(modeKey)) {
      localStorage.setItem(modeKey, legacyFY);
    }

    const lastFY = localStorage.getItem(modeKey);
    if (lastFY) {
      if (!selectedFY) return; // Wait if UI explicitly triggers selection reset
      
      window.api.getFinancialYears().then(years => {
        const fy = years.find(y => y.dbName === lastFY);
        if (fy) {
          setCurrentFYData(fy);
          window.api.selectFinancialYear(lastFY).then(() => {
            setSelectedFY(true);
            setFyInitialized(true);
          }).catch(err => {
            console.error("Failed to select financial year on server:", err);
            setSelectedFY(true);
            setFyInitialized(true);
          });
        } else {
          // If the DB was renamed or removed, clear the invalid selection
          localStorage.removeItem(modeKey);
          setSelectedFY(false);
          setFyInitialized(true); // Let FYSelector handle it
        }
      }).catch(err => {
        console.error("Failed to get financial years from server:", err);
        // Do not delete stored year during network failure
        setSelectedFY(false);
        setFyInitialized(true);
      });
    } else {
      setSelectedFY(false);
      setFyInitialized(true);
    }
  }, [selectedFY, netStatus.connected, netStatus.mode]);

  useEffect(() => {
    if (netStatus.mode === null) return;
    
    if (prevMode === null) {
      setPrevMode(netStatus.mode);
      setPrevIp(netStatus.ip);
      return;
    }

    let shouldRefresh = false;
    if (netStatus.mode !== prevMode) {
      shouldRefresh = true;
    } else if (netStatus.mode === 'CLIENT' && netStatus.ip !== prevIp && netStatus.ip) {
      shouldRefresh = true;
    }

    if (shouldRefresh) {
      console.log(`[Cache] Re-initializing cache due to network shift (Mode: ${prevMode} -> ${netStatus.mode}, IP: ${prevIp} -> ${netStatus.ip})`);
      initializeCache();
      setPrevMode(netStatus.mode);
      setPrevIp(netStatus.ip);
    }
  }, [netStatus.mode, netStatus.ip, prevMode, prevIp, initializeCache]);

  useEffect(() => {
    if (!window.api) return;
    window.api.getNetworkStatus().then(status => setNetStatus(status));
    const intv = setInterval(() => {
      window.api.getNetworkStatus().then(status => setNetStatus(status));
    }, 3000);
    return () => clearInterval(intv);
  }, []);

  const handleModeChange = (newMode) => {
    window.api.setNetworkMode(newMode);
    setTimeout(() => {
      window.location.reload();
    }, 500);
  }

  // Global keyboard shortcuts for navigation
  useEffect(() => {
    function handleShortcuts(e) {
      // Alt + B or F8 to open Retail Billing
      if ((e.altKey && e.key?.toLowerCase() === 'b') || e.key === 'F8') {
        e.preventDefault();
        setActive('billing');
        setExpanded(prev => ({ ...prev, 'billing-returns': true }));
      }
      // Alt + W to open Wholesale Billing
      if (e.altKey && e.key?.toLowerCase() === 'w') {
        e.preventDefault();
        setActive('wholesale-billing');
        setExpanded(prev => ({ ...prev, 'billing-returns': true }));
      }
      // Alt + P or F9 to open Purchase
      if ((e.altKey && e.key?.toLowerCase() === 'p') || e.key === 'F9') {
        e.preventDefault();
        setActive('purchase');
        setExpanded(prev => ({ ...prev, 'billing-returns': true }));
      }
      // Alt + S or F3 to open Stock Update
      if ((e.altKey && e.key?.toLowerCase() === 's') || e.key === 'F3') {
        e.preventDefault();
        setActive('stock-update');
        setExpanded(prev => ({ ...prev, 'inventory-expiry': true }));
      }

    }
    window.addEventListener('keydown', handleShortcuts);
    return () => window.removeEventListener('keydown', handleShortcuts);
  }, []);

  if (isCacheLoading || !fyInitialized) {
    return (
      <div style={{ height: '100vh', width: '100vw', position: 'relative', overflow: 'hidden', fontFamily: 'Outfit, sans-serif', background: '#ffffff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        {/* Animated Background Orbs (matching login style) */}
        <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '60vw', height: '60vw', background: 'radial-gradient(circle, rgba(16,185,129,0.04) 0%, rgba(255,255,255,0) 70%)', filter: 'blur(80px)', zIndex: 0 }} />
        <div style={{ position: 'absolute', bottom: '-20%', right: '-10%', width: '70vw', height: '70vw', background: 'radial-gradient(circle, rgba(20,184,166,0.03) 0%, rgba(255,255,255,0) 70%)', filter: 'blur(100px)', zIndex: 0 }} />

        <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '36px', fontWeight: '800', margin: 0, color: '#10b981', letterSpacing: '-1px' }}>
            HomoeoStore ERP
          </h1>
          <div style={{ background: '#f8fafc', padding: '32px 48px', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <OrbitProgress variant="spokes" color="#10b981" size="medium" />
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#64748b', marginTop: '8px' }}>
              {!fyInitialized ? "Initializing Financial Year..." : "Loading System Cache..."}
              <span style={{ marginLeft: '8px', color: '#10b981', fontWeight: '700' }}>({elapsedSeconds}s)</span>
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '500' }}>
              Please wait while we prepare your dashboard
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!userRole) {
    return <Login onLogin={(role) => setUserRole(role)} />
  }

  // Filter NAV for Cashiers
  const visibleNav = userRole === 'admin' ? NAV : NAV.filter(item => item.id === 'billing-returns' || item.id === 'inventory-expiry');

  const toggleExpand = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }))

  const handleNavigate = (pageId) => {
    setActive(pageId)
    NAV.forEach(cat => {
      if (cat.children && cat.children.some(c => c.id === pageId)) {
        setExpanded(prev => ({ ...prev, [cat.id]: true }))
      }
    })
  }

  const renderPage = () => {
    switch (active) {
      case 'dashboard': return <Dashboard onNavigate={handleNavigate} />
      case 'ledger-master': return <LedgerMaster />
      case 'hsn-sac-master': return <HsnSacMaster />
      case 'category-master': return <CategoryMaster />
      case 'power-master': return <PowerMaster />
      case 'packing-master': return <PackingMaster />
      case 'medicines': return <Medicines />
      case 'billing': return <Billing isYearLocked={!!currentFYData?.is_locked} />
      case 'wholesale-billing': return <WholesaleBilling isYearLocked={!!currentFYData?.is_locked} />
      case 'issue-slip': return <IssueSlip isYearLocked={!!currentFYData?.is_locked} />
      case 'item_ledger': return <ItemLedger />
      case 'sales-return': return <SalesReturn />
      case 'purchase-return': return <PurchaseReturn />
      case 'wholesale-return': return <WholesaleReturn />
      case 'stock-register': return <StockRegister />
      case 'purchase': return <PurchaseEntry isYearLocked={!!currentFYData?.is_locked} />
      case 'voucher-entry': return <VoucherEntry />
      case 'stock-update': return <StockUpdate />
      case 'godown-master': return <GodownMaster />
      case 'companies': return <Companies />
      case 'mr-master': return <MRMaster />
      case 'party-maintenance': return <PartyMaintenance />
      case 'reports': return <Reports />
      case 'low-stock-report': return <LowStockReport />
      case 'balance-sheet': return <BalanceSheet />
      case 'pl': return <ProfitLoss />
      case 'day-book': return <DayBook />
      case 'gst-dashboard': return <GstReports />
      case 'ledger-book': return <LedgerBook onNavigate={handleNavigate} />
      case 'expiry-management': return <ExpiryManagement />
      case 'store-profile': return <StoreProfile />
      case 'account-groups': return <AccountGroups />
      case 'cloud-backup': return <BackupSetup />
      default: {
        let title = 'Under Development'
        NAV.forEach(cat => {
          if (cat.id === active) title = cat.label
          if (cat.children) {
            cat.children.forEach(child => {
              if (child.id === active) title = child.label
            })
          }
        })
        return <ComingSoon title={title} />
      }
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>

      {/* ── Top Header ── */}
      <header style={{
        background: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        borderBottom: '1px solid #e2e8f0',
        zIndex: 100100,
        position: 'relative'
      }}>
        {/* Row 1: Logo & Controls Area */}
        <div style={{
          height: '46px',
          minHeight: '46px',
          display: 'flex',
          alignItems: 'center',
          padding: '0 140px 0 16px', // 140px right padding prevents overlap with Windows Native Window Controls
          WebkitAppRegion: 'drag', // Make the top row draggable
        }}>
          {/* Logo & Badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f2d1f', whiteSpace: 'nowrap', letterSpacing: '-0.5px' }}>
                🌿 HomoeoStore
              </div>
              <div style={{ fontSize: '10px', color: '#0f2d1f', marginLeft: '8px', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '700', opacity: 0.8, background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px' }}>
                ERP
              </div>
            </div>
          </div>
          
          <div style={{ flex: 1 }} />

          {/* Right aligned actions & status pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', WebkitAppRegion: 'no-drag' }}>
            
            {/* FY Pill */}
            {currentFYData && (
              <div onClick={() => setSelectedFY(false)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '5px 12px', borderRadius: '20px', cursor: 'pointer', transition: 'all 0.2s' }} title="Click to change Financial Year" onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'} onMouseLeave={e => e.currentTarget.style.background = '#f1f5f9'}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#475569', fontFamily: 'Outfit, sans-serif' }}>{currentFYData.name}</span>
                {currentFYData.is_locked && <span style={{ fontSize: '9px', fontWeight: '700', background: '#fee2e2', color: '#ef4444', padding: '1px 5px', borderRadius: '4px', marginLeft: '4px' }}>Locked</span>}
              </div>
            )}

            {/* Administrator / User Role Pill */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '5px 12px', borderRadius: '20px' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#475569', fontFamily: 'Outfit, sans-serif' }}>
                {userRole === 'admin' ? 'Administrator' : 'Cashier'}
              </span>
            </div>

            {/* Online Status / Network Mode Pill */}
            <div style={{ position: 'relative' }}>
              <div 
                style={{ display: 'flex', alignItems: 'center', gap: '6px', background: isOnline ? '#d1fae5' : '#fee2e2', border: isOnline ? '1px solid #a7f3d0' : '1px solid #fca5a5', padding: '5px 12px', borderRadius: '20px', cursor: 'pointer' }}
                onClick={() => setExpanded(prev => ({ ...prev, network: !prev.network }))}
                title="Click to change Network Mode"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={isOnline ? "#065f46" : "#b91c1c"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                <span style={{ fontSize: '11px', fontWeight: '700', color: isOnline ? '#065f46' : '#b91c1c', fontFamily: 'Outfit, sans-serif' }}>
                  {isOnline ? `Online (${netStatus.mode || '...'})` : 'Offline'}
                </span>
              </div>
              
              {expanded.network && (
                <div style={{ position: 'absolute', top: '105%', right: 0, marginTop: '4px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px', minWidth: '220px', zIndex: 100001, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#475569', fontWeight: '700' }}>Network Mode</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <button onClick={() => { handleModeChange('LOCAL'); setExpanded(prev => ({...prev, network: false})) }} style={{ padding: '8px', background: netStatus.mode === 'LOCAL' ? '#f1f5f9' : 'transparent', color: '#1e293b', border: 'none', borderRadius: '4px', textAlign: 'left', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }} onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'} onMouseLeave={e => { if (netStatus.mode !== 'LOCAL') e.currentTarget.style.background = 'transparent' }}>💻 Local (Standalone)</button>
                    <button onClick={() => { handleModeChange('SERVER'); setExpanded(prev => ({...prev, network: false})) }} style={{ padding: '8px', background: netStatus.mode === 'SERVER' ? '#ecfdf5' : 'transparent', color: '#1e293b', border: 'none', borderRadius: '4px', textAlign: 'left', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }} onMouseEnter={e => e.currentTarget.style.background = '#ecfdf5'} onMouseLeave={e => { if (netStatus.mode !== 'SERVER') e.currentTarget.style.background = 'transparent' }}>📡 Main Server</button>
                    <button onClick={() => { handleModeChange('CLIENT'); setExpanded(prev => ({...prev, network: false})) }} style={{ padding: '8px', background: netStatus.mode === 'CLIENT' ? '#fef9c3' : 'transparent', color: '#1e293b', border: 'none', borderRadius: '4px', textAlign: 'left', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }} onMouseEnter={e => e.currentTarget.style.background = '#fef9c3'} onMouseLeave={e => { if (netStatus.mode !== 'CLIENT') e.currentTarget.style.background = 'transparent' }}>🔗 Client Node</button>
                  </div>
                  {netStatus.mode === 'SERVER' && <div style={{ marginTop: '12px', fontSize: '10px', color: '#64748b' }}>IP: {netStatus.ip}</div>}
                  {netStatus.mode === 'CLIENT' && <div style={{ marginTop: '12px', fontSize: '10px', color: '#64748b' }}>Connected To: {netStatus.ip || 'Searching...'}</div>}
                </div>
              )}
            </div>

            {/* Profile Dropdown Trigger */}
            <div style={{ position: 'relative' }}>
              <button 
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '3px 8px 3px 4px',
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontFamily: 'Outfit, sans-serif',
                  transition: 'all 0.2s',
                }}
              >
                <svg width="24" height="24" viewBox="0 0 32 32" style={{ borderRadius: '50%' }}>
                  <circle cx="16" cy="16" r="16" fill="#e2e8f0" />
                  <circle cx="16" cy="12" r="5" fill="#fdba74" />
                  <path d="M11 12c0-3.5 2.5-5 5-5s5 1.5 5 5c0 0.5-0.5 1-1 1s-1-0.5-1-1c0-1.5-1.5-2-3-2s-3 0.5-3 2c0 0.5-0.5 1-1 1s-1-0.5-1-1z" fill="#78350f" />
                  <path d="M8 27c0-5 4-8 8-8s8 3 8 8z" fill="#1e3a8a" />
                  <path d="M16 19l2 4-2 2-2-2z" fill="#ea580c" />
                  <path d="M15 19h2v2h-2z" fill="#fff" />
                </svg>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#1e293b' }}>
                  {userRole === 'admin' ? 'Administrator' : 'Cashier'}
                </span>
                <span style={{ fontSize: '9px', color: '#64748b' }}>▼</span>
              </button>

              {userDropdownOpen && (
                <div style={{
                  position: 'absolute',
                  top: '105%',
                  right: 0,
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
                  padding: '4px',
                  minWidth: '130px',
                  zIndex: 100000,
                }}>
                  <button
                    onClick={() => {
                      setUserRole(null);
                      setUserDropdownOpen(false);
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontFamily: 'Outfit, sans-serif',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#ef4444',
                      textAlign: 'left',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                      <polyline points="16 17 21 12 16 7"></polyline>
                      <line x1="21" y1="12" x2="9" y2="12"></line>
                    </svg>
                    Logout
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Row 2: Navigation Menu & User Actions */}
        <nav style={{
          height: '46px',
          minHeight: '46px',
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          gap: '8px',
          borderTop: '1px solid #e2e8f0',
          background: '#ffffff',
          WebkitAppRegion: 'no-drag', // Nav bar should not be draggable
        }}>
          {/* Horizontal Nav Items */}
          <div style={{ flex: 1, display: 'flex', gap: '8px' }}>
            {visibleNav.map(item => {
              const hasChildren = !!item.children;
              const isHovered = expanded[item.id];
              // Check if active page is this item or any of its children
              const isItemActive = active === item.id || (hasChildren && item.children.some(c => c.id === active));

              return (
                <div 
                  key={item.id} 
                  style={{ position: 'relative' }}
                  onMouseEnter={() => hasChildren && setExpanded(prev => ({ ...prev, [item.id]: true }))}
                  onMouseLeave={() => hasChildren && setExpanded(prev => ({ ...prev, [item.id]: false }))}
                >
                  <button
                    onClick={() => !hasChildren && setActive(item.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      background: isItemActive ? '#ecfdf5' : (isHovered ? '#f1f5f9' : 'transparent'),
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontFamily: 'Outfit, sans-serif',
                      fontWeight: isItemActive ? '700' : '600',
                      color: isItemActive ? '#0f2d1f' : (isHovered ? '#0f2d1f' : '#64748b'),
                      transition: 'all 0.2s ease',
                      position: 'relative',
                      height: '36px',
                      boxSizing: 'border-box'
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {ICON_MAP[item.id] || item.icon}
                    </span>
                    {item.label}
                    {hasChildren && (
                      <span style={{ fontSize: '9px', opacity: 0.6, marginLeft: '4px' }}>▼</span>
                    )}
                    {isItemActive && (
                      <div style={{
                        position: 'absolute',
                        bottom: '-5px',
                        left: '12px',
                        right: '12px',
                        height: '3px',
                        background: '#10b981',
                        borderRadius: '2px'
                      }} />
                    )}
                  </button>

                  {/* Dropdown Menu */}
                  {hasChildren && isHovered && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '8px',
                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
                      minWidth: '220px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      zIndex: 100005,
                    }}>
                      {item.children.map(child => (
                        <button
                          key={child.id}
                          onClick={(e) => {
                            if (child.id === 'change-fy') {
                              setSelectedFY(false);
                            } else {
                              setActive(child.id);
                            }
                            setExpanded({});
                            setTimeout(() => setExpanded({}), 50);
                          }}
                          style={{
                            width: '100%',
                            display: 'block',
                            padding: '10px 14px',
                            background: active === child.id ? '#ecfdf5' : 'transparent',
                            borderRadius: '6px',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontFamily: 'Outfit, sans-serif',
                            fontWeight: active === child.id ? '600' : '500',
                            color: active === child.id ? '#0f2d1f' : '#334155',
                            textAlign: 'left',
                            transition: 'all 0.1s ease',
                          }}
                          onMouseEnter={e => {
                            if (active !== child.id) {
                              e.currentTarget.style.background = '#f1f5f9';
                              e.currentTarget.style.color = '#0f2d1f';
                            }
                          }}
                          onMouseLeave={e => {
                            if (active !== child.id) {
                              e.currentTarget.style.background = 'transparent';
                              e.currentTarget.style.color = '#334155';
                            }
                          }}
                        >
                          {child.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </nav>
      </header>

      {/* ── Main Content ── */}
      <main style={{
        flex: 1,
        overflow: 'auto',
        background: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{ flex: 1, padding: '16px', overflow: 'auto' }}>
          {renderPage()}
        </div>
      </main>

      {/* Financial Year Selector Modal */}
      {!selectedFY && (
        <FYSelector 
          onSelect={() => setSelectedFY(true)} 
          onClose={localStorage.getItem('last_selected_fy_' + (netStatus.mode || 'LOCAL')) ? () => setSelectedFY(true) : null} 
        />
      )}

    </div>
  )
}
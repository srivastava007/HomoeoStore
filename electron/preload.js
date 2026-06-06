const { contextBridge, ipcRenderer } = require('electron')

// This is the secure bridge — React can only call what's listed here
contextBridge.exposeInMainWorld('api', {
  // ─── Financial Years ───
  getFinancialYears: () => ipcRenderer.invoke('get-financial-years'),
  selectFinancialYear: (dbName) => ipcRenderer.invoke('select-financial-year', dbName),
  createFinancialYear: (data) => ipcRenderer.invoke('create-financial-year', data),

  // ─── Medicines ───
  getMedicines: () => ipcRenderer.invoke('get-medicines'),
  getItemLedger: (id) => ipcRenderer.invoke('get-item-ledger', id),
  searchMedicinesPaginated: (params) => ipcRenderer.invoke('search-medicines-paginated', params),
  addMedicine: (data) => ipcRenderer.invoke('add-medicine', data),
  updateMedicine: (data) => ipcRenderer.invoke('update-medicine', data),
  deleteMedicine: (id) => ipcRenderer.invoke('delete-medicine', id),

  // ─── Stock ───
  getLowStock: () => ipcRenderer.invoke('get-low-stock'),
  updateStock: (data) => ipcRenderer.invoke('update-stock', data),

  // ─── Billing ───
  createBill: (data) => ipcRenderer.invoke('create-bill', data),
  getBills: () => ipcRenderer.invoke('get-bills'),
  getBillById: (id) => ipcRenderer.invoke('get-bill-by-id', id),
  createWholesaleBill: (data) => ipcRenderer.invoke('create-wholesale-bill', data),
  searchWholesaleBillsPaginated: (data) => ipcRenderer.invoke('search-wholesale-bills-paginated', data),
  getWholesaleBills: () => ipcRenderer.invoke('get-wholesale-bills'),
  getWholesaleBillById: (id) => ipcRenderer.invoke('get-wholesale-bill-by-id', id),
  updateWholesaleBill: (data) => ipcRenderer.invoke('update-wholesale-bill', data),
  getNextWholesaleBillNumber: () => ipcRenderer.invoke('get-next-wholesale-bill-number'),
  exportWholesalePdf: (billData, storeData, copyType) => ipcRenderer.invoke('export-wholesale-pdf', billData, storeData, copyType),
  exportEwayJson: (billData, storeProfile) => ipcRenderer.invoke('export-eway-json', billData, storeProfile),
  exportPoPdf: (poData, storeData) => ipcRenderer.invoke('export-po-pdf', poData, storeData),
  createIssueSlip: (data) => ipcRenderer.invoke('create-issue-slip', data),
  getIssueSlips: () => ipcRenderer.invoke('get-issue-slips'),
  getIssueSlipById: (id) => ipcRenderer.invoke('get-issue-slip-by-id', id),
  getNextIssueSlipNumber: () => ipcRenderer.invoke('get-next-issue-slip-number'),

  // ─── Purchase Bills ───
  createPurchaseBill: (data) => ipcRenderer.invoke('create-purchase-bill', data),
  getPurchaseBills: () => ipcRenderer.invoke('get-purchase-bills'),
  getPurchaseBillById: (id) => ipcRenderer.invoke('get-purchase-bill-by-id', id),
  decodeQR: (base64Str) => ipcRenderer.invoke('decode-qr', base64Str),

  // ─── Suppliers ───
  getSuppliers: () => ipcRenderer.invoke('get-suppliers'),
  addSupplier: (data) => ipcRenderer.invoke('add-supplier', data),

  // ─── Companies ───
  getCompanies: () => ipcRenderer.invoke('get-companies'),
  addCompany: (data) => ipcRenderer.invoke('add-company', data),
  updateCompany: (data) => ipcRenderer.invoke('update-company', data),
  deleteCompany: (id) => ipcRenderer.invoke('delete-company', id),

  // ─── Medical Reps ───
  getMRs: () => ipcRenderer.invoke('get-mrs'),
  addMR: (data) => ipcRenderer.invoke('add-mr', data),
  updateMR: (data) => ipcRenderer.invoke('update-mr', data),
  deleteMR: (id) => ipcRenderer.invoke('delete-mr', id),

  // ─── Ledgers ───
  getLedgers: () => ipcRenderer.invoke('get-ledgers'),
  addLedger: (data) => ipcRenderer.invoke('add-ledger', data),
  updateLedger: (data) => ipcRenderer.invoke('update-ledger', data),
  deleteLedger: (id) => ipcRenderer.invoke('delete-ledger', id),
  addVoucher: (data) => ipcRenderer.invoke('add-voucher', data),
  getLedgerStatement: (ledger_id, fromDate, toDate) => ipcRenderer.invoke('get-ledger-statement', { ledger_id, fromDate, toDate }),
  getDayBook: (date) => ipcRenderer.invoke('get-day-book', date),

  // ─── HSN/SAC ───
  getHsnSac: () => ipcRenderer.invoke('get-hsn-sac'),
  addHsnSac: (data) => ipcRenderer.invoke('add-hsn-sac', data),
  updateHsnSac: (data) => ipcRenderer.invoke('update-hsn-sac', data),
  deleteHsnSac: (id) => ipcRenderer.invoke('delete-hsn-sac', id),

  // ─── Category Master ───
  getCategories: () => ipcRenderer.invoke('get-categories'),
  addCategory: (data) => ipcRenderer.invoke('add-category', data),
  updateCategory: (data) => ipcRenderer.invoke('update-category', data),
  deleteCategory: (id) => ipcRenderer.invoke('delete-category', id),

  // ─── Power Master ───
  getPowers: () => ipcRenderer.invoke('get-powers'),
  addPower: (data) => ipcRenderer.invoke('add-power', data),
  updatePower: (data) => ipcRenderer.invoke('update-power', data),
  deletePower: (id) => ipcRenderer.invoke('delete-power', id),

  // ─── Packing Master ───
  getPackings: () => ipcRenderer.invoke('get-packings'),
  addPacking: (data) => ipcRenderer.invoke('add-packing', data),
  updatePacking: (data) => ipcRenderer.invoke('update-packing', data),
  deletePacking: (id) => ipcRenderer.invoke('delete-packing', id),
  getAccountGroups: () => ipcRenderer.invoke('get-account-groups'),
  addAccountGroup: (data) => ipcRenderer.invoke('add-account-group', data),
  deleteAccountGroup: (id) => ipcRenderer.invoke('delete-account-group', id),

  // ─── Purchase Orders ───
  createPurchaseOrder: (data) => ipcRenderer.invoke('create-purchase-order', data),
  getPurchaseOrders: () => ipcRenderer.invoke('get-purchase-orders'),

  // ─── Reports ───
  getSalesReport: (range) => ipcRenderer.invoke('get-sales-report', range),
  getGstSalesRegisterPaginated: (data) => ipcRenderer.invoke('get-gst-sales-register-paginated', data),
  getGstPurchaseRegisterPaginated: (data) => ipcRenderer.invoke('get-gst-purchase-register-paginated', data),
  getGstReturns: (fromDate, toDate) => ipcRenderer.invoke('get-gst-returns', fromDate, toDate),
  // ─── Print & PDF ───
  saveToPdf: (defaultName, title, autoSave, margins) => ipcRenderer.invoke('save-to-pdf', defaultName, title, autoSave, margins),
  exportLedgerPdf: (statement, storeData, fromDate, toDate) => ipcRenderer.invoke('export-ledger-pdf', statement, storeData, fromDate, toDate),
  printWindow: () => ipcRenderer.invoke('print-window'),
  getPrinters: () => ipcRenderer.invoke('get-printers'),
  printReceipt: (data) => ipcRenderer.invoke('print-receipt', data),
  // ─── Expiry ───
  getExpiryAlerts: () => ipcRenderer.invoke('get-expiry-alerts'),
  getExpiringBatches: (days) => ipcRenderer.invoke('get-expiring-batches', days),

  // ─── Dashboard ───
  getDashboardStats: () => ipcRenderer.invoke('get-dashboard-stats'),
  getBalanceSheet: () => ipcRenderer.invoke('get-balance-sheet'),
  getProfitLoss: () => ipcRenderer.invoke('get-profit-loss'),

  // ─── Godown Master ───
  getGodowns: () => ipcRenderer.invoke('get-godowns'),
  addGodown: (data) => ipcRenderer.invoke('add-godown', data),
  deleteGodown: (id) => ipcRenderer.invoke('delete-godown', id),

  // ─── Stock Batches ───
  addStockBatch: (data) => ipcRenderer.invoke('add-stock-batch', data),
  getStockBatches: (medicineId) => ipcRenderer.invoke('get-stock-batches', medicineId),
  getAllStockBatches: () => ipcRenderer.invoke('get-all-stock-batches'),
  updateStockBatch: (data) => ipcRenderer.invoke('update-stock-batch', data),
  deleteStockBatch: (id) => ipcRenderer.invoke('delete-stock-batch', id),
  resetAllStock: () => ipcRenderer.invoke('reset-all-stock'),

  // ─── Store Profile (Registered To) ───
  getStoreProfile: () => ipcRenderer.invoke('get-store-profile'),
  updateStoreProfile: (data) => ipcRenderer.invoke('update-store-profile', data),
  isCurrentYearLocked: () => ipcRenderer.invoke('is-current-year-locked'),
  
  verifyAdminPin: (pin) => ipcRenderer.invoke('verify-admin-pin', pin),
  updateAdminPin: (pin) => ipcRenderer.invoke('update-admin-pin', pin),
  verifyCashierPin: (pin) => ipcRenderer.invoke('verify-cashier-pin', pin),
  updateCashierPin: (pin) => ipcRenderer.invoke('update-cashier-pin', pin),


  // Returns Management
  getSalesBillForReturn: (bill_number) => ipcRenderer.invoke('get-sales-bill-for-return', bill_number),
  getPurchaseBillForReturn: (invoice_number) => ipcRenderer.invoke('get-purchase-bill-for-return', invoice_number),
  createSalesReturn: (data) => ipcRenderer.invoke('create-sales-return', data),
  createPurchaseReturn: (data) => ipcRenderer.invoke('create-purchase-return', data),
  getSalesReturns: () => ipcRenderer.invoke('get-sales-returns'),
  getPurchaseReturns: () => ipcRenderer.invoke('get-purchase-returns'),
  getWholesaleBillForReturn: (bill_number) => ipcRenderer.invoke('get-wholesale-bill-for-return', bill_number),
  createWholesaleReturn: (data) => ipcRenderer.invoke('create-wholesale-return', data),
  getWholesaleReturns: () => ipcRenderer.invoke('get-wholesale-returns'),

  // Settings & Backups
  getSetting: (key) => ipcRenderer.invoke('get-setting', key),
  setSetting: (key, value) => ipcRenderer.invoke('set-setting', key, value),
  pickBackupFolder: () => ipcRenderer.invoke('pick-backup-folder'),

  // Network Modes
  getNetworkStatus: () => ipcRenderer.invoke('get-network-status'),
  setNetworkMode: (mode) => ipcRenderer.invoke('set-network-mode', mode),

  // Renderer logging to server file
  logRendererEvent: (level, message) => ipcRenderer.invoke('log-renderer-event', level, message)
})
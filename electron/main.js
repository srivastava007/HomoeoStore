const logger = require('./logger')
const { app, BrowserWindow, ipcMain, Menu, dialog, Tray, nativeImage } = require('electron')
const path = require('path')
const os = require('os')
const fs = require('fs')
const qrcode = require('qrcode')
const zlib = require('zlib')
const db = require('./database/db')
const network = require('./network')
const axios = require('axios')

network.init()

let mainWindow = null
let tray = null

async function handleDb(action, ...args) {
    if (network.getMode() === 'CLIENT') {
        const ip = network.getServerIp();
        if (!ip) throw new Error("No Main System found on network yet. Please wait...");
        try {
            const res = await axios.post(`http://${ip}:4000/api/${action}`, { args }, { timeout: 5000 });
            if (!res.data.success) throw new Error(res.data.error);
            return res.data.data;
        } catch (e) {
            console.error(`[Network Error] ${action}:`, e.message);
            throw new Error(`Network Error: Cannot connect to Main System (${ip})`);
        }
    }
    return db[action](...args);
}

const isDev = process.env.NODE_ENV === 'development'

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    icon: path.join(__dirname, 'logo.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'HomoeoStore',
    show: false,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#ffffff',
      symbolColor: '#334155',
      height: 46,
    },
    backgroundColor: '#ffffff',
  })
  mainWindow.maximize()

  if (isDev) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    if (!process.argv.includes('--hidden')) {
      mainWindow.show()
    }
  })

  mainWindow.on('close', (event) => {
    if (!global.isQuitting) {
      event.preventDefault()
      mainWindow.hide()
    }
  })
}

// ─── Financial Year Handlers ───
ipcMain.handle('get-financial-years', () => handleDb('getFinancialYears'))
ipcMain.handle('select-financial-year', (_, dbName) => handleDb('selectFinancialYear', dbName))
ipcMain.handle('create-financial-year', (_, data) => handleDb('createFinancialYear', data))

app.commandLine.appendSwitch('lang', 'en-GB');

function updateTray() {
  if (!tray) return
  const currentMode = network.getMode()
  
  let tooltip = 'HomoeoStore'
  let quitLabel = 'Quit'
  
  if (currentMode === 'SERVER') {
    tooltip = 'HomoeoStore Server'
    quitLabel = 'Quit Server'
  } else if (currentMode === 'CLIENT') {
    tooltip = 'HomoeoStore Client'
    quitLabel = 'Quit Client'
  }
  
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show HomoeoStore', click: () => { if (mainWindow) mainWindow.show() } },
    { type: 'separator' },
    { label: quitLabel, click: () => { 
        global.isQuitting = true; 
        app.quit(); 
      } 
    }
  ])
  
  tray.setToolTip(tooltip)
  tray.setContextMenu(contextMenu)
}

app.whenReady().then(() => {
  checkAndSyncFromCloud()
  
  app.setLoginItemSettings({
    openAtLogin: true,
    path: app.getPath('exe'),
    args: ['--hidden']
  })

  Menu.setApplicationMenu(null)
  
  const iconPath = path.join(__dirname, 'logo.ico')
  tray = new Tray(nativeImage.createFromPath(iconPath))
  updateTray()
  tray.on('double-click', () => {
    if (mainWindow) mainWindow.show()
  })

  createWindow()
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    } else if (mainWindow) {
      mainWindow.show()
    }
  })
})

// ─── Cloud Auto-Sync & Backup ───
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const API_KEY = process.env.FIREBASE_API_KEY || "";
const BUCKET = process.env.FIREBASE_BUCKET || "";
function getCloudFolderName() {
  const profile = db.getStoreProfile();
  if (profile && profile.phone && profile.phone.trim() !== '') {
    return profile.phone.replace(/[^0-9]/g, '');
  }
  if (profile && profile.store_name && profile.store_name.trim() !== '') {
    return profile.store_name.replace(/[^a-zA-Z0-9]/g, '_');
  }
  return 'UnknownStore';
}

async function performCloudBackup() {
  try {
    console.log('[Cloud Backup] Starting...');
    const folderName = getCloudFolderName();
    
    const authRes = await axios.post(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, { returnSecureToken: true });
    const idToken = authRes.data.idToken;
    
    const userDataPath = app.getPath('userData');
    const files = fs.readdirSync(userDataPath);
    
    for (const file of files) {
      if (file.endsWith('.db') && !file.includes('.syncbak')) {
        const filePath = path.join(userDataPath, file);
        const dbBuffer = fs.readFileSync(filePath);
        // Overwrite by using standard name without timestamp
        const cloudPath = encodeURIComponent(`backups/${folderName}/backup_${file}`);
        
        await axios.post(`https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o?name=${cloudPath}`, dbBuffer, {
          headers: { 'Authorization': `Bearer ${idToken}`, 'Content-Type': 'application/x-sqlite3' },
          maxBodyLength: Infinity, maxContentLength: Infinity
        });
        console.log('[Cloud Backup] ✅ Success! Uploaded:', cloudPath);
      }
    }
  } catch (cloudErr) {
    console.error('[Cloud Backup] ❌ Failed:', cloudErr.message);
  }
}

async function checkAndSyncFromCloud() {
  try {
    console.log('[Cloud Sync] Checking for newer database...');
    const folderName = getCloudFolderName();
    
    const authRes = await axios.post(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, { returnSecureToken: true }, { timeout: 4000 });
    const idToken = authRes.data.idToken;
    
    const prefix = encodeURIComponent(`backups/${folderName}/backup_`);
    const listRes = await axios.get(`https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o?prefix=${prefix}`, {
      headers: { 'Authorization': `Bearer ${idToken}` },
      timeout: 4000
    });
    
    if (!listRes.data || !listRes.data.items || listRes.data.items.length === 0) return;
    
    let anySynced = false;
    
    for (const item of listRes.data.items) {
      const parts = item.name.split('/');
      let actualFilename = parts[parts.length - 1];
      
      // Ignore old timestamped backups
      if (actualFilename.match(/^backup_\d{4}-\d{2}-\d{2}_/)) {
         continue; 
      }
      
      if (actualFilename.startsWith('backup_')) {
          actualFilename = actualFilename.replace('backup_', '');
      } else {
          continue;
      }
      
      const targetPath = path.join(app.getPath('userData'), actualFilename);
      
      let localMtime = 0;
      if (fs.existsSync(targetPath)) {
        localMtime = fs.statSync(targetPath).mtimeMs;
      }
      const cloudMtime = new Date(item.updated).getTime();
      
      if (cloudMtime > localMtime + 120000) {
        console.log(`[Cloud Sync] Downloading newer database for ${actualFilename}...`);
        const tmpDbPath = targetPath + '.tmp';
        const downloadRes = await axios.get(`https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(item.name)}?alt=media`, {
          headers: { 'Authorization': `Bearer ${idToken}` },
          responseType: 'arraybuffer',
          timeout: 10000
        });
        fs.writeFileSync(tmpDbPath, downloadRes.data);

        const dateStr = new Date().toISOString().split('T')[0];
        const syncbakPath = targetPath + `.syncbak_${dateStr}`;
        
        if (fs.existsSync(targetPath)) {
           if (fs.existsSync(syncbakPath)) {
               fs.unlinkSync(syncbakPath); 
           }
           fs.renameSync(targetPath, syncbakPath);
        }

        fs.renameSync(tmpDbPath, targetPath);
        
        const dir = path.dirname(targetPath);
        const allFiles = fs.readdirSync(dir);
        const now = Date.now();
        allFiles.forEach(f => {
           if (f.includes('.syncbak_')) {
               const stat = fs.statSync(path.join(dir, f));
               if (now - stat.mtimeMs > 24 * 60 * 60 * 1000) {
                   try { fs.unlinkSync(path.join(dir, f)); } catch(e){}
               }
           }
        });
        
        anySynced = true;
      }
    }

    if (anySynced) {
      console.log('[Cloud Sync] ✅ Database restored successfully!');
      dialog.showMessageBoxSync({
        type: 'info',
        buttons: ['OK'],
        title: 'Sync Complete',
        message: 'Database synced successfully!',
        detail: 'Starting application with the latest data...'
      });
      app.relaunch();
      app.exit(0);
    } else {
      console.log('[Cloud Sync] Local database is already up to date.');
    }
  } catch (err) {
    console.error('[Cloud Sync] ❌ Check failed:', err.message);
  }
}

// ─── Scheduled Daily Backup at 1:00 PM ───
function startScheduledBackup() {
  function msUntilNext1PM() {
    const now = new Date();
    const target = new Date(now);
    target.setHours(13, 0, 0, 0); // 1:00 PM
    if (now >= target) {
      target.setDate(target.getDate() + 1); // Next day 1 PM
    }
    return target.getTime() - now.getTime();
  }

  const msToNext = msUntilNext1PM();
  const hoursLeft = (msToNext / 1000 / 60 / 60).toFixed(1);
  console.log(`[Scheduler] Next cloud backup in ${hoursLeft} hours (at 1:00 PM)`);

  setTimeout(() => {
    performCloudBackup(); // Run at first 1 PM
    setInterval(() => {
      performCloudBackup(); // Then every 24 hours
    }, 24 * 60 * 60 * 1000);
  }, msToNext);
}

startScheduledBackup();

app.on('before-quit', async (e) => {
  if (!global.isQuitting) {
    e.preventDefault()
    
    // 1. Local Backup
    try {
      const backupPath = db.getSetting('backup_path')
      if (backupPath) {
        console.log('Starting auto-backup on close to:', backupPath)
        db.performBackup(backupPath)
        console.log('Local backup successful')
      }
    } catch (err) {
      console.error('Local backup failed:', err)
    }

    // 2. Cloud Backup on quit too
    await performCloudBackup();
    
    global.isQuitting = true
    app.quit()
  }
})

ipcMain.handle('decode-qr', async (event, base64Str) => {
  try {
    const inflated = zlib.inflateSync(Buffer.from(base64Str, 'base64')).toString('utf-8');
    return { success: true, data: JSON.parse(inflated) };
  } catch (error) {
    console.error('Failed to decode QR:', error);
    return { success: false, error: error.message };
  }
})

// === System Shutdown Handling ===
app.on('window-all-closed', () => {
  // Do nothing. Keep server running in background.
})

// ─── IPC Handlers ─────────────────────────────────────────

// Renderer logs handler
ipcMain.handle('log-renderer-event', (_, level, message) => {
  logger.log(level.toUpperCase(), `[RENDERER] ${message}`)
})

// Medicines
ipcMain.handle('get-medicines', () => handleDb('getMedicines'))
ipcMain.handle('search-medicines-paginated', (_, params) => handleDb('searchMedicinesPaginated', params))
ipcMain.handle('add-medicine', (_, data) => handleDb('addMedicine', data))
ipcMain.handle('update-medicine', (_, data) => handleDb('updateMedicine', data))
ipcMain.handle('delete-medicine', (_, id) => handleDb('deleteMedicine', id))

// Stock
ipcMain.handle('get-low-stock', () => handleDb('getLowStock'))
ipcMain.handle('update-stock', (_, data) => handleDb('updateStock', data))

// Billing
ipcMain.handle('create-bill', (_, data) => handleDb('createBill', data))
ipcMain.handle('get-bills', () => handleDb('getBills'))
ipcMain.handle('get-bill-by-id', (_, id) => handleDb('getBillById', id))

// Suppliers
ipcMain.handle('get-suppliers', () => handleDb('getSuppliers'))
ipcMain.handle('add-supplier', (_, data) => handleDb('addSupplier', data))

// Companies
ipcMain.handle('get-companies', () => handleDb('getCompanies'))
ipcMain.handle('add-company', (_, data) => handleDb('addCompany', data))
ipcMain.handle('update-company', (_, data) => handleDb('updateCompany', data))
ipcMain.handle('delete-company', (_, id) => handleDb('deleteCompany', id))

// Medical Reps (MR)
ipcMain.handle('get-mrs', () => handleDb('getMRs'))
ipcMain.handle('add-mr', (_, data) => handleDb('addMR', data))
ipcMain.handle('update-mr', (_, data) => handleDb('updateMR', data))
ipcMain.handle('delete-mr', (_, id) => handleDb('deleteMR', id))

// Ledgers
ipcMain.handle('get-ledgers', () => handleDb('getLedgers'))
ipcMain.handle('add-ledger', (_, data) => handleDb('addLedger', data))
ipcMain.handle('update-ledger', (_, data) => handleDb('updateLedger', data))
ipcMain.handle('delete-ledger', (_, id) => handleDb('deleteLedger', id))
ipcMain.handle('add-voucher', (_, data) => handleDb('addVoucher', data))
ipcMain.handle('get-ledger-statement', (_, args) => handleDb('getLedgerStatement', args.ledger_id, args.fromDate, args.toDate))
ipcMain.handle('get-day-book', (_, date) => handleDb('getDayBook', date))

// HSN/SAC
ipcMain.handle('get-hsn-sac', () => handleDb('getHsnSac'))
ipcMain.handle('add-hsn-sac', (_, data) => handleDb('addHsnSac', data))
ipcMain.handle('update-hsn-sac', (_, data) => handleDb('updateHsnSac', data))
ipcMain.handle('delete-hsn-sac', (_, id) => handleDb('deleteHsnSac', id))

// Settings & Backups
ipcMain.handle('get-setting', (_, key) => db.getSetting(key))
ipcMain.handle('set-setting', (_, key, value) => db.setSetting(key, value))
ipcMain.handle('pick-backup-folder', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  const result = await dialog.showOpenDialog(win, {
    properties: ['openDirectory'],
    title: 'Select Backup Folder (Pendrive / Google Drive)'
  })
  if (result.canceled) return null
  return result.filePaths[0]
})

// Category Master
ipcMain.handle('get-categories', () => handleDb('getCategories'))
ipcMain.handle('add-category', (_, data) => handleDb('addCategory', data))
ipcMain.handle('update-category', (_, data) => handleDb('updateCategory', data))
ipcMain.handle('delete-category', (_, id) => handleDb('deleteCategory', id))

// Power Master
ipcMain.handle('get-powers', () => handleDb('getPowers'))
ipcMain.handle('add-power', (_, data) => handleDb('addPower', data))
ipcMain.handle('update-power', (_, data) => handleDb('updatePower', data))
ipcMain.handle('delete-power', (_, id) => handleDb('deletePower', id))

// Packing Master
ipcMain.handle('get-packings', () => handleDb('getPackings'))
ipcMain.handle('add-packing', (_, data) => handleDb('addPacking', data))
ipcMain.handle('update-packing', (_, data) => handleDb('updatePacking', data))
ipcMain.handle('delete-packing', (_, id) => handleDb('deletePacking', id))

// Account Groups
ipcMain.handle('get-account-groups', () => handleDb('getAccountGroups'))
ipcMain.handle('add-account-group', (_, data) => handleDb('addAccountGroup', data))
ipcMain.handle('delete-account-group', (_, id) => handleDb('deleteAccountGroup', id))

// Purchase Orders
ipcMain.handle('create-purchase-order', (_, data) => handleDb('createPurchaseOrder', data))
ipcMain.handle('get-purchase-orders', () => handleDb('getPurchaseOrders'))

// Reports & Alerts
ipcMain.handle('get-sales-report', (_, range) => handleDb('getSalesReport', range))
ipcMain.handle('get-gst-sales-register-paginated', (_, data) => handleDb('getGstSalesRegisterPaginated', data))
ipcMain.handle('get-gst-purchase-register-paginated', (_, data) => handleDb('getGstPurchaseRegisterPaginated', data))
ipcMain.handle('save-to-pdf', async (event, defaultName, dialogTitle, landscape, pageSize) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  const isLandscape = landscape !== undefined ? (landscape === true) : true
  const title = dialogTitle || 'Export PDF'
  const { filePath, canceled } = await dialog.showSaveDialog(win, {
    title: title,
    defaultPath: defaultName || (isLandscape ? 'GST_Sales_Register.pdf' : 'Invoice.pdf'),
    filters: [
      { name: 'PDF Files', extensions: ['pdf'] }
    ]
  })
  
  if (canceled || !filePath) {
    return { success: false, canceled: true }
  }
  
  const options = {
    marginsType: 1, // 0 for default, 1 for no margins, 2 for minimum margins
    pageSize: pageSize || 'A4',
    printBackground: true,
    landscape: isLandscape,
    preferCSSPageSize: true
  }
  
  try {
    const data = await event.sender.printToPDF(options)
    fs.writeFileSync(filePath, data)
    return { success: true, filePath }
  } catch (error) {
    console.error('Failed to save PDF:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('print-window', (event) => {
  return new Promise((resolve) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return resolve({ success: false, error: 'Window not found' })
    
    win.webContents.print({ silent: false, printBackground: true, color: true }, (success, failureReason) => {
      if (success) {
        resolve({ success: true })
      } else {
        console.error('Print failed:', failureReason)
        resolve({ success: false, error: failureReason })
      }
    })
  })
})

// Purchase Bills
ipcMain.handle('create-purchase-bill', (_, data) => handleDb('createPurchaseBill', data))
ipcMain.handle('get-purchase-bills', () => handleDb('getPurchaseBills'))
ipcMain.handle('get-purchase-bill-by-id', (_, id) => handleDb('getPurchaseBillById', id))

ipcMain.handle('create-wholesale-bill', (_, data) => handleDb('createWholesaleBill', data))
ipcMain.handle('search-wholesale-bills-paginated', (_, data) => handleDb('searchWholesaleBillsPaginated', data))
ipcMain.handle('get-wholesale-bills', () => handleDb('getWholesaleBills'))
ipcMain.handle('get-wholesale-bill-by-id', (_, id) => handleDb('getWholesaleBillById', id))
ipcMain.handle('update-wholesale-bill', (_, data) => handleDb('updateWholesaleBill', data))
ipcMain.handle('get-next-wholesale-bill-number', () => handleDb('getNextWholesaleBillNumber'))

// Issue Slips
ipcMain.handle('create-issue-slip', (event, data) => handleDb('createIssueSlip', data))
ipcMain.handle('get-issue-slips', () => handleDb('getIssueSlips'))
ipcMain.handle('get-issue-slip-by-id', (event, id) => handleDb('getIssueSlipById', id))
ipcMain.handle('get-next-issue-slip-number', () => handleDb('getNextIssueSlipNumber'))

// ─── E-Way Bill JSON Export ───
ipcMain.handle('export-eway-json', async (event, billData, storeProfile) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  
  const defaultFileName = `EWAY_${(billData.bill_number || 'bill').split('/').join('_')}.json`
  const { filePath, canceled } = await dialog.showSaveDialog(win, {
    title: 'Export E-Way JSON for NIC Portal',
    defaultPath: defaultFileName,
    filters: [{ name: 'JSON Files', extensions: ['json'] }]
  })
  
  if (canceled || !filePath) return { success: false, canceled: true }
  
  try {
    let cgstVal = 0, sgstVal = 0, igstVal = 0;
    const itemList = (billData.items || []).map(i => {
      let cgst = 0, sgst = 0, igst = 0;
      let totalTax = i.total_price - i.gross_total;
      if (billData.sale_destination === 'in_state') {
        cgst = totalTax / 2;
        sgst = totalTax / 2;
        cgstVal += cgst;
        sgstVal += sgst;
      } else {
        igst = totalTax;
        igstVal += igst;
      }
      return {
        productName: i.medicine_name,
        productDesc: i.medicine_name,
        hsnCode: i.hsn_code || 3004,
        quantity: i.quantity,
        qtyUnit: "NOS",
        cgstRate: i.cgst_rate,
        sgstRate: i.sgst_rate,
        igstRate: i.igst_rate,
        cessRate: 0,
        cessAdvol: 0,
        taxableAmount: i.gross_total
      }
    });

    const payload = {
      version: "1.0.0121",
      billLists: [
        {
          userGstin: storeProfile?.gstin || "URP",
          supplyType: "O",
          subSupplyType: 1,
          documentType: "INV",
          documentNo: billData.bill_number,
          documentDate: new Date(billData.bill_date).toLocaleDateString('en-GB'),
          fromGstin: storeProfile?.gstin || "URP",
          fromTrdName: storeProfile?.store_name || "Store",
          fromAddr1: storeProfile?.address_line1 || "",
          fromAddr2: storeProfile?.address_line2 || "",
          fromPlace: "Delhi",
          fromPincode: 110001,
          fromStateCode: 7,
          toGstin: billData.gstin || "URP",
          toTrdName: billData.party_name || "",
          toAddr1: billData.address || "",
          toAddr2: "",
          toPlace: "Destination",
          toPincode: 110001,
          toStateCode: billData.sale_destination === 'in_state' ? 7 : 99,
          totalValue: billData.total_amount,
          cgstValue: Number(cgstVal.toFixed(2)),
          sgstValue: Number(sgstVal.toFixed(2)),
          igstValue: Number(igstVal.toFixed(2)),
          cessValue: 0,
          totInvValue: billData.net_amount,
          transporterId: billData.eway_transporter_id || "",
          transporterName: billData.eway_transporter || "",
          transDocNo: "",
          transMode: 1,
          transDistance: billData.eway_distance ? Number(billData.eway_distance) : 0,
          transDocDate: "",
          vehicleNo: billData.eway_vehicle_no || "",
          vehicleType: "R",
          itemList: itemList
        }
      ]
    }
    
    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2))
    return { success: true, filePath }
  } catch (error) {
    console.error('Eway export error:', error)
    return { success: false, error: error.message }
  }
})

// ─── Wholesale Invoice PDF Export (dedicated hidden window) ───
ipcMain.handle('export-wholesale-pdf', async (event, billData, storeData, copyType = 'Original') => {
  const win = BrowserWindow.fromWebContents(event.sender)
  
  const { filePath, canceled } = await dialog.showSaveDialog(win, {
    title: 'Save Invoice as PDF',
    defaultPath: `Wholesale_Invoice_${(billData.bill_number || '').split('/').join('_')}.pdf`,
    filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
  })
  
  if (canceled || !filePath) return { success: false, canceled: true }
  
  try {
    const isDelhi = storeData.state_code === '07' || (storeData.address_line3 && storeData.address_line3.toLowerCase().includes('delhi'))
    const storeStateStr = `State: ${isDelhi ? 'Delhi' : (storeData.state || 'Unknown')} (Code: ${storeData.state_code || '00'})`
    
    let copyLabel = 'Original for Recipient'
    if (copyType === 'Duplicate') copyLabel = 'Duplicate for Supplier'
    if (copyType === 'Triplicate') copyLabel = 'Triplicate for Transporter'

    const receiverSigHtml = copyType === 'Triplicate' ? `<div class="sig-block"><div class="sig-line">Receiver's Signature</div></div>` : '<div></div>'
    
    // Group GST Breakup
    const gstBreakup = {}

    // Build items table rows
    let itemRows = ''
    let totalQty = 0
    let taxableSubtotal = 0

    if (billData.items) {
      billData.items.forEach((item, idx) => {
        const dis = (item.discount_percent || 0) + (item.scheme_discount_percent || 0)
        const gst = (item.cgst_rate || 0) + (item.sgst_rate || 0) + (item.igst_rate || 0)
        
        const qty = Number(item.quantity || 0)
        totalQty += qty
        
        // Accumulate GST Breakup
        const grossAfterDis = Number(item.gross_total || 0) // this is amount before tax
        taxableSubtotal += grossAfterDis
        
        if (!gstBreakup[gst]) {
            gstBreakup[gst] = { taxableVal: 0, cgstAmt: 0, sgstAmt: 0, igstAmt: 0, totalTax: 0 }
        }
        gstBreakup[gst].taxableVal += grossAfterDis
        
        let cgstRate = '0.00', cgstAmt = '0.00'
        let sgstRate = '0.00', sgstAmt = '0.00'
        let igstRate = '0.00', igstAmt = '0.00'

        let itemTotalTax = 0;

        if (billData.sale_destination === 'in_state') {
          const halfGst = gst / 2
          cgstRate = halfGst.toFixed(2)
          sgstRate = halfGst.toFixed(2)
          
          const cgstVal = Math.round(grossAfterDis * (halfGst / 100) * 100) / 100
          const sgstVal = Math.round(grossAfterDis * (halfGst / 100) * 100) / 100
          
          cgstAmt = cgstVal.toFixed(2)
          sgstAmt = sgstVal.toFixed(2)
          
          gstBreakup[gst].cgstAmt += cgstVal
          gstBreakup[gst].sgstAmt += sgstVal
          
          itemTotalTax = cgstVal + sgstVal;
        } else {
          igstRate = gst.toFixed(2)
          
          const igstVal = Math.round(grossAfterDis * (gst / 100) * 100) / 100
          igstAmt = igstVal.toFixed(2)
          
          gstBreakup[gst].igstAmt += igstVal
          itemTotalTax = igstVal;
        }

        gstBreakup[gst].totalTax += itemTotalTax;
        const medicineCell = `<div style="font-weight:700; color:#1e3b2e">${item.medicine_name || ''}</div><div style="font-size:9px; color:#6b7280">${item.company || ''}</div>`

        const formatTax = (rate, amt) => rate === '0.00' ? '-' : `<span style="font-size:9px; color:#6b7280">${rate}%</span><br><span style="font-weight:600; color:#1a1a1a">${amt}</span>`

        itemRows += `<tr>
          <td style="text-align:center">${idx+1}</td>
          <td style="text-align:center">${item.hsn_code || '-'}</td>
          <td style="padding-left:8px;">${medicineCell}</td>
          <td style="text-align:center; font-weight:600">${qty}</td>
          <td style="text-align:right">${Number(item.unit_price || 0).toFixed(2)}</td>
          <td style="text-align:center">${dis ? dis.toFixed(2) : '-'}</td>
          <td style="text-align:right; font-weight:600">${grossAfterDis.toFixed(2)}</td>
          <td style="text-align:right">${formatTax(cgstRate, cgstAmt)}</td>
          <td style="text-align:right">${formatTax(sgstRate, sgstAmt)}</td>
          <td style="text-align:right">${formatTax(igstRate, igstAmt)}</td>
          <td style="text-align:right"><strong style="color:#14452f">${Number(item.total_price || 0).toFixed(2)}</strong></td>
        </tr>`
      })
    }
    
    const totalTaxable = Object.values(gstBreakup).reduce((acc, curr) => acc + curr.taxableVal, 0)
    const totalCgst = Object.values(gstBreakup).reduce((acc, curr) => acc + curr.cgstAmt, 0)
    const totalSgst = Object.values(gstBreakup).reduce((acc, curr) => acc + curr.sgstAmt, 0)
    const totalIgst = Object.values(gstBreakup).reduce((acc, curr) => acc + curr.igstAmt, 0)
    const totalAllTax = Object.values(gstBreakup).reduce((acc, curr) => acc + curr.totalTax, 0)

    // Number to words
    function numToWords(n) {
      if (n === 0) return 'Zero'
      const s=['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine']
      const d=['Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen']
      const t=['','Ten','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety']
      let str=String(Math.round(n)),w=[]
      for(let i=str.length-1;i>=0;i--){let c=str[i]-0,nx=i>0?str[i-1]-0:0
        switch(str.length-i-1){
          case 0:w.push((c!=0&&nx!=1?' '+s[c]:''));break
          case 1:w.push(c==0?'':' '+(c==1?d[str[i+1]]:(t[c])));break
          case 2:w.push(c!=0?' '+s[c]+' Hundred':'');break
          case 3:w.push((c!=0&&nx!=1?' '+s[c]:'')+((nx!=0||c>0)?' Thousand':''));break
          case 4:w.push(c==0?'':' '+(c==1?d[str[i+1]]:(t[c])));break
          case 5:w.push((c!=0&&nx!=1?' '+s[c]:'')+((nx!=0||c>0)?' Lakh':''));break
          case 6:w.push(c==0?'':' '+(c==1?d[str[i+1]]:(t[c])));break
          case 7:w.push((c!=0&&nx!=1?' '+s[c]:'')+((nx!=0||c>0)?' Crore':''));break
        }}
      
      const words = w.reverse().join('').trim()
      return words
    }

    const netAmount = Number(billData.net_amount || 0)
    const roundOff = Number(billData.round_off || 0)

    let qrDataUrl = '';
    try {
      const payloadObj = {
        v: 1,
        bn: billData.bill_number || '',
        dt: billData.bill_date || '',
        tot: netAmount,
        gst: storeData.gstin || '',
        pn: storeData.store_name || '',
        i: (billData.items || []).map(it => ({
          n: it.medicine_name || '',
          c: it.company || '',
          p: it.potency || '',
          pk: it.unit || '',
          ty: it.category || '',
          b: it.batch_no || '',
          em: it.expiry_month || '',
          ey: it.expiry_year || '',
          hsn: it.hsn_code || '',
          q: Number(it.quantity || 0),
          fq: Number(it.free_quantity || 0),
          r: Number(it.unit_price || 0),
          d: Number(it.discount_percent || 0),
          g: (it.cgst_rate||0) + (it.sgst_rate||0) + (it.igst_rate||0)
        }))
      };
      
      const jsonStr = JSON.stringify(payloadObj);
      const compressed = zlib.deflateSync(Buffer.from(jsonStr)).toString('base64');
      qrDataUrl = await qrcode.toDataURL(compressed, { errorCorrectionLevel: 'L', margin: 1, scale: 3 });
    } catch (e) {
      console.error('QR Generate Error:', e);
    }

    const fullHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  @page { size: A4; margin: 0; }
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Outfit', Arial, sans-serif; width: 210mm; min-height: 297mm; padding: 12mm; color: #1f2937; background: #fff; }
  
  .wrapper {
      border: 1px solid #d1d5db;
      border-radius: 12px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      min-height: 273mm;
  }

  /* Modern Header */
  .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 12px; border-bottom: 2px solid #e5e7eb; margin-bottom: 12px; position: relative; }
  
  .header-brand { display: flex; flex-direction: column; }
  .header-brand h1 { font-size: 24px; font-weight: 800; color: #14452f; margin-bottom: 4px; letter-spacing: -0.5px; }
  .header-brand p { font-size: 11px; color: #4b5563; line-height: 1.4; }
  
  .header-meta { text-align: right; }
  .tax-invoice-badge { display: inline-block; background: #e8f5e9; color: #14452f; font-size: 14px; font-weight: 800; padding: 6px 12px; border-radius: 6px; letter-spacing: 0.5px; border: 1px solid #c8e6c9; margin-bottom: 8px; }
  .original-label { display: block; font-size: 10px; font-weight: 700; color: #6b7280; text-transform: uppercase; margin-bottom: 8px; }
  .header-meta p { font-size: 11px; font-weight: 600; color: #374151; margin-bottom: 3px; }

  /* Info Grids */
  .info-container { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
  
  .info-box { background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; }
  .info-title { font-size: 10px; font-weight: 800; color: #14452f; text-transform: uppercase; margin-bottom: 8px; border-bottom: 1px dashed #d1d5db; padding-bottom: 6px; }
  
  .info-row { display: flex; margin-bottom: 5px; font-size: 11px; }
  .info-label { font-weight: 600; color: #6b7280; min-width: 90px; }
  .info-val { font-weight: 700; color: #1f2937; }

  .party-name { font-size: 14px; font-weight: 800; color: #111827; margin-bottom: 4px; }
  .party-addr { font-size: 11px; color: #4b5563; margin-bottom: 8px; line-height: 1.4; }

  /* Items Table */
  .table-wrapper { border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; margin-bottom: 0; }
  table.items-table { width: 100%; border-collapse: collapse; }
  table.items-table thead { background: #14452f; color: #fff; }
  table.items-table th { padding: 8px 4px; font-size: 10px; font-weight: 600; text-align: center; border-right: 1px solid rgba(255,255,255,0.1); }
  table.items-table th:last-child { border-right: none; }
  
  table.items-table tbody tr:nth-child(even) { background: #f8fafc; }
  table.items-table td { padding: 6px 4px; font-size: 11px; color: #374151; border-right: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb; vertical-align: middle; }
  table.items-table td:last-child { border-right: none; }

  /* Totals Bar */
  .total-bar { display: flex; background: #e8f5e9; border: 1px solid #c8e6c9; border-top: none; border-radius: 0 0 8px 8px; font-size: 11px; font-weight: 700; color: #14452f; margin-bottom: 16px; }
  .total-bar .cell { padding: 8px; border-right: 1px solid #c8e6c9; }
  .total-bar .cell:last-child { border-right: none; }

  /* Bottom Section */
  .bottom-section { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; flex-grow: 1; align-items: end; }
  
  .bottom-left { display: flex; flex-direction: column; gap: 12px; }
  .amount-words { background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; }
  .amount-words .lbl { font-size: 10px; font-weight: 700; color: #6b7280; margin-bottom: 4px; }
  .amount-words .val { font-size: 12px; font-weight: 800; color: #1f2937; }

  .gst-summary-box { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
  .gst-summary-box .header-row { background: #f3f4f6; padding: 6px 12px; font-size: 10px; font-weight: 700; color: #4b5563; border-bottom: 1px solid #e5e7eb; }
  table.compact-gst { width: 100%; border-collapse: collapse; font-size: 10px; }
  table.compact-gst th { background: #f8fafc; padding: 6px 4px; color: #6b7280; font-weight: 600; border-bottom: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb; }
  table.compact-gst td { border-bottom: 1px solid #e5e7eb; }

  .bottom-right { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; display: flex; flex-direction: column; }
  .summary-row { display: flex; justify-content: space-between; font-size: 11px; font-weight: 600; color: #4b5563; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px dashed #e5e7eb; }
  .summary-row.bold { font-weight: 800; color: #1f2937; }
  
  .net-payable { background: #14452f; color: #fff; padding: 12px; border-radius: 8px; display: flex; justify-content: space-between; font-size: 16px; font-weight: 800; margin-top: 8px; box-shadow: 0 4px 6px -1px rgba(20, 69, 47, 0.2); }

  /* Footer */
  .footer { display: flex; justify-content: space-between; margin-top: 16px; padding-top: 16px; border-top: 2px solid #e5e7eb; }
  .footer-left { flex: 1.5; font-size: 10px; color: #6b7280; }
  .footer-left strong { color: #374151; font-weight: 700; }
  .terms { margin-top: 8px; }
  .terms ul { padding-left: 14px; margin-top: 4px; }
  
  .signatures { flex: 1; display: flex; justify-content: space-between; align-items: flex-end; padding-left: 20px; text-align: center; }
  .sig-block { font-size: 10px; font-weight: 600; color: #6b7280; }
  .sig-line { border-top: 1px dashed #9ca3af; padding-top: 6px; margin-top: 40px; width: 120px; }
  .sig-auth { color: #14452f; font-weight: 800; font-size: 11px; white-space: nowrap; }

</style>
</head><body>
  <div class="wrapper">
    <!-- Header -->
    <div class="header">
      <div class="header-brand">
        <h1>${(storeData.store_name || 'STORE NAME').toUpperCase()}</h1>
        <p>${storeData.address_line1 || ''}</p>
        <p>${storeData.address_line2 || ''}, ${storeData.address_line3 || ''}</p>
        <p><strong>Mobile:</strong> ${storeData.phone || ''} ${storeData.email ? ` | <strong>Email:</strong> ${storeData.email}` : ''}</p>
        <p><strong>GSTIN:</strong> ${storeData.gstin || ''} | <strong>DL No:</strong> ${storeData.dl_number || ''}</p>
        <p><strong>${storeStateStr}</strong></p>
      </div>
      <div style="display:flex; gap:16px;">
        ${qrDataUrl ? `<div style="text-align: center;">
            <img src="${qrDataUrl}" style="width: 80px; height: 80px; border: 1px solid #e5e7eb; border-radius: 4px;" />
            <div style="font-size: 8px; color: #6b7280; margin-top: 2px;">Scan to Auto-Feed</div>
          </div>` : ''}
        <div class="header-meta">
          <div class="tax-invoice-badge">TAX INVOICE</div>
          <span class="original-label">${copyLabel}</span>
          <p>Invoice No: ${(billData.bill_number||'').toUpperCase()}</p>
          <p>Date: ${new Date(billData.bill_date).toLocaleDateString('en-IN')}</p>
        </div>
      </div>
    </div>

    <!-- Parties Info -->
    <div class="info-container">
      <div class="info-box">
        <div class="info-title">Billed To</div>
        <div class="party-name">${billData.party_name || 'Cash'}</div>
        <div class="party-addr">${billData.party_address || ''}</div>
        <div class="info-row"><div class="info-label">GSTIN:</div><div class="info-val">${billData.gstin || '-'}</div></div>
        <div class="info-row"><div class="info-label">DL No:</div><div class="info-val">${billData.dl_no || '-'}</div></div>
        <div class="info-row"><div class="info-label">State of Supply:</div><div class="info-val">${billData.sale_destination === 'in_state' ? storeStateStr : 'Out of State'}</div></div>
      </div>
      <div class="info-box">
        <div class="info-title">E-Way Bill Details</div>
        <div class="info-row"><div class="info-label">E-Way Bill No:</div><div class="info-val">${billData.eway_bill_no || '-'}</div></div>
        <div class="info-row"><div class="info-label">Transporter:</div><div class="info-val">${billData.eway_transporter || '-'}</div></div>
        <div class="info-row"><div class="info-label">Vehicle No:</div><div class="info-val">${billData.eway_vehicle_no || '-'}</div></div>
      </div>
    </div>

    <!-- Items Table -->
    <div class="table-wrapper">
      <table class="items-table">
        <thead>
          <tr>
            <th style="width:3%">S.No</th>
            <th style="width:6%">HSN/SAC</th>
            <th style="width:23%; text-align:left; padding-left:8px;">Description of Goods</th>
            <th style="width:6%">Qty</th>
            <th style="width:7%">Rate</th>
            <th style="width:6%">Dis%</th>
            <th style="width:8%">Taxable</th>
            <th style="width:11%">CGST</th>
            <th style="width:11%">SGST</th>
            <th style="width:11%">IGST</th>
            <th style="width:8%">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
        </tbody>
      </table>
    </div>

    <div class="total-bar">
      <div class="cell" style="width:32%; text-align:right">Total:</div>
      <div class="cell" style="width:6%; text-align:center">${totalQty}</div>
      <div class="cell" style="width:7%"></div>
      <div class="cell" style="width:6%"></div>
      <div class="cell" style="width:8%; text-align:right">₹${totalTaxable.toFixed(2)}</div>
      <div class="cell" style="width:11%; text-align:right">₹${totalCgst.toFixed(2)}</div>
      <div class="cell" style="width:11%; text-align:right">₹${totalSgst.toFixed(2)}</div>
      <div class="cell" style="width:11%; text-align:right">₹${totalIgst.toFixed(2)}</div>
      <div class="cell" style="width:8%; text-align:right; border-right:none">₹${netAmount.toFixed(2)}</div>
    </div>

    <!-- Bottom Section -->
    <div class="bottom-section">
      <div class="bottom-left">
        <div class="amount-words">
          <div class="lbl">Total Invoice Amount in Words</div>
          <div class="val">Rupees ${numToWords(netAmount)} Only</div>
        </div>

        <div class="gst-summary-box">
          <div class="header-row">GST Breakup Summary</div>
          <table class="compact-gst">
            <thead>
              <tr>
                <th style="text-align:left">Tax Rate</th>
                <th style="text-align:right">Taxable Amt</th>
                <th style="text-align:right">CGST</th>
                <th style="text-align:right">SGST</th>
                <th style="text-align:right">IGST</th>
                <th style="text-align:right">Total Tax</th>
              </tr>
            </thead>
            <tbody>
              ${Object.keys(gstBreakup).map(rate => {
                const d = gstBreakup[rate]
                return `<tr>
                  <td style="padding:6px; font-weight:600">${rate}%</td>
                  <td style="text-align:right; padding:6px">₹${d.taxableVal.toFixed(2)}</td>
                  <td style="text-align:right; padding:6px">₹${d.cgstAmt.toFixed(2)}</td>
                  <td style="text-align:right; padding:6px">₹${d.sgstAmt.toFixed(2)}</td>
                  <td style="text-align:right; padding:6px">₹${d.igstAmt.toFixed(2)}</td>
                  <td style="text-align:right; padding:6px; font-weight:600">₹${d.totalTax.toFixed(2)}</td>
                </tr>`
              }).join('')}
              <tr style="background:#f8fafc; font-weight:700">
                <td style="padding:6px; border-bottom:none">Total</td>
                <td style="text-align:right; padding:6px; border-bottom:none">₹${totalTaxable.toFixed(2)}</td>
                <td style="text-align:right; padding:6px; border-bottom:none">₹${totalCgst.toFixed(2)}</td>
                <td style="text-align:right; padding:6px; border-bottom:none">₹${totalSgst.toFixed(2)}</td>
                <td style="text-align:right; padding:6px; border-bottom:none">₹${totalIgst.toFixed(2)}</td>
                <td style="text-align:right; padding:6px; border-bottom:none">₹${totalAllTax.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
      <div class="bottom-right">
        <div class="summary-row"><span>Total Taxable Value</span><span>₹${totalTaxable.toFixed(2)}</span></div>
        <div class="summary-row"><span>Add: CGST</span><span>₹${totalCgst.toFixed(2)}</span></div>
        <div class="summary-row"><span>Add: SGST</span><span>₹${totalSgst.toFixed(2)}</span></div>
        <div class="summary-row"><span>Add: IGST</span><span>₹${totalIgst.toFixed(2)}</span></div>
        <div class="summary-row"><span>Total Tax Amount</span><span>₹${totalAllTax.toFixed(2)}</span></div>
        <div class="summary-row"><span>Round Off</span><span>${roundOff > 0 ? '+' : ''}${roundOff.toFixed(2)}</span></div>
        <div class="net-payable">
          <span>Net Amount</span>
          <span>₹${netAmount.toFixed(2)}</span>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div class="footer-left">
        <strong>Bank Details:</strong><br>
        A/C Name: ${storeData.bank_account_name || 'N/A'} | A/C No: ${storeData.bank_account_number || 'N/A'}<br>
        Bank: ${storeData.bank_name || 'N/A'} | IFSC: ${storeData.bank_ifsc || 'N/A'}
        <div class="terms">
          <strong>Terms & Conditions:</strong>
          <ul>
            <li>Goods once sold will not be taken back.</li>
            <li>Subject to ${storeData.address_line3 || 'local'} jurisdiction only.</li>
            <li>Interest @24% p.a. will be charged if payment is delayed.</li>
          </ul>
        </div>
      </div>
      <div class="signatures">
        ${receiverSigHtml}
        <div class="sig-block">
          <div class="sig-auth">For ${(storeData.store_name||'').toUpperCase()}</div>
          <div class="sig-line">Authorized Signatory</div>
        </div>
      </div>
    </div>
  </div>
</body></html>`

    const tmpFile = path.join(os.tmpdir(), `wholesale_${Date.now()}.html`)
    fs.writeFileSync(tmpFile, fullHtml, 'utf-8')
    
    const pdfWin = new BrowserWindow({
      width: 794,
      height: 1123,
      show: false,
      webPreferences: { nodeIntegration: false, contextIsolation: true }
    })
    
    await pdfWin.loadFile(tmpFile)
    
    const pdfData = await pdfWin.webContents.printToPDF({
      marginsType: 1,
      pageSize: 'A4',
      printBackground: true,
      landscape: false,
      preferCSSPageSize: true
    })
    
    fs.writeFileSync(filePath, pdfData)
    pdfWin.close()
    try { fs.unlinkSync(tmpFile) } catch(e) {}
    
    return { success: true, filePath }
  } catch (error) {
    console.error('Failed to export Wholesale PDF:', error)
    return { success: false, error: error.message }
  }
})



// ─── Ledger Statement PDF Export ───
ipcMain.handle('export-ledger-pdf', async (event, statement, storeData, fromDate, toDate) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  
  const safeName = (statement.ledger.ledger_name || 'Ledger').replace(/[^a-zA-Z0-9]/g, '_')
  const defaultPath = `${safeName}_Statement_${new Date().toISOString().split('T')[0]}.pdf`
  
  const { filePath, canceled } = await dialog.showSaveDialog(win, {
    title: 'Export Ledger Statement PDF',
    defaultPath: defaultPath,
    filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
  })
  
  if (canceled || !filePath) return { success: false, canceled: true }
  
  try {
    let itemRows = ''
    
    // Opening balance row
    itemRows += `<tr>
      <td style="text-align:center">${fromDate ? new Date(fromDate).toLocaleDateString('en-IN') : 'Opening'}</td>
      <td style="padding-left:8px; font-weight:600;">By Opening Balance</td>
      <td style="text-align:center">-</td>
      <td style="text-align:center">-</td>
      <td style="text-align:right">${statement.opening_balance_type === 'Dr' ? statement.opening_balance.toLocaleString('en-IN', {minimumFractionDigits: 2}) : ''}</td>
      <td style="text-align:right">${statement.opening_balance_type === 'Cr' ? statement.opening_balance.toLocaleString('en-IN', {minimumFractionDigits: 2}) : ''}</td>
      <td style="text-align:right; font-weight:700;">${statement.opening_balance.toLocaleString('en-IN', {minimumFractionDigits: 2})} ${statement.opening_balance_type}</td>
    </tr>`

    // Transactions
    statement.transactions.forEach(tx => {
      itemRows += `<tr>
        <td style="text-align:center">${new Date(tx.date).toLocaleDateString('en-IN')}</td>
        <td style="padding-left:8px;">${tx.particulars}</td>
        <td style="text-align:center">${tx.voucher_type}</td>
        <td style="text-align:center">${tx.voucher_no || '-'}</td>
        <td style="text-align:right">${tx.dr_amount ? tx.dr_amount.toLocaleString('en-IN', {minimumFractionDigits: 2}) : ''}</td>
        <td style="text-align:right">${tx.cr_amount ? tx.cr_amount.toLocaleString('en-IN', {minimumFractionDigits: 2}) : ''}</td>
        <td style="text-align:right; font-weight:700;">${tx.running_balance.toLocaleString('en-IN', {minimumFractionDigits: 2})} ${tx.running_balance_type}</td>
      </tr>`
    })

    // Totals
    const totalDr = statement.transactions.reduce((s, t) => s + t.dr_amount, 0)
    const totalCr = statement.transactions.reduce((s, t) => s + t.cr_amount, 0)
    itemRows += `<tr style="background:#f3f4f6; font-weight:800;">
      <td colspan="4" style="text-align:right; padding-right:12px;">TOTALS:</td>
      <td style="text-align:right">${totalDr.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
      <td style="text-align:right">${totalCr.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
      <td style="text-align:right; color: #14452f;">${statement.closing_balance.toLocaleString('en-IN', {minimumFractionDigits: 2})} ${statement.closing_balance_type}</td>
    </tr>`

    const fullHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  @page { size: A4; margin: 0; }
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Outfit', Arial, sans-serif; width: 210mm; min-height: 297mm; padding: 12mm; color: #1f2937; background: #fff; }
  
  .wrapper { border: 1px solid #d1d5db; border-radius: 12px; padding: 16px; display: flex; flex-direction: column; min-height: 273mm; }

  .header { display: flex; justify-content: space-between; align-items: flex-end; padding-bottom: 12px; border-bottom: 2px solid #e5e7eb; margin-bottom: 20px; }
  
  table.items-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
  table.items-table thead { background: #14452f; color: #fff; }
  table.items-table th { padding: 8px 4px; font-size: 11px; font-weight: 600; text-align: center; border-right: 1px solid rgba(255,255,255,0.1); }
  table.items-table th:last-child { border-right: none; }
  
  table.items-table tbody tr:nth-child(even) { background: #f8fafc; }
  table.items-table td { padding: 8px 4px; font-size: 11px; color: #374151; border-right: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb; vertical-align: middle; }
  table.items-table td:last-child { border-right: none; }
</style>
</head><body>
  <div class="wrapper">
    <div class="header">
      <div>
        <h1 style="font-size: 26px; font-weight: 800; color: #14452f; margin: 0; letter-spacing: -0.5px;">${(storeData.store_name||'').toUpperCase()}</h1>
        <p style="font-size: 13px; color: #4b5563; line-height: 1.5; margin: 0;">${storeData.address_line1||''}, ${storeData.address_line2||''}</p>
        <p style="font-size: 13px; color: #4b5563; line-height: 1.5; margin: 0;"><strong>Mob:</strong> ${storeData.phone||''}</p>
      </div>
      <div style="text-align: right;">
        <h2 style="font-size: 20px; font-weight: 800; color: #0369a1; margin: 0 0 4px 0;">STATEMENT OF ACCOUNT</h2>
        <p style="font-size: 13px; font-weight: 600; color: #374151; margin: 0;">${fromDate ? new Date(fromDate).toLocaleDateString('en-IN') : 'Start'} to ${toDate ? new Date(toDate).toLocaleDateString('en-IN') : 'End'}</p>
      </div>
    </div>

    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px; margin-bottom: 16px;">
      <h3 style="margin: 0 0 4px 0; font-size: 16px; color: #166534;">Party: ${statement.ledger.ledger_name}</h3>
      <p style="margin: 0; font-size: 13px; color: #15803d;">Group: ${statement.ledger.account_group}</p>
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th style="width:10%">DATE</th>
          <th style="width:30%">PARTICULARS</th>
          <th style="width:12%">VCH TYPE</th>
          <th style="width:12%">VCH NO.</th>
          <th style="width:12%">DEBIT (₹)</th>
          <th style="width:12%">CREDIT (₹)</th>
          <th style="width:12%">BALANCE</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
      </tbody>
    </table>
    
    <div style="margin-top: auto; padding-top: 16px; font-size: 10px; color: #6b7280; text-align: center; border-top: 1px solid #e5e7eb;">
      This is a computer generated statement.
    </div>
  </div>
</body></html>`

    const os = require('os')
    const tmpFile = path.join(os.tmpdir(), `ledger_${Date.now()}.html`)
    fs.writeFileSync(tmpFile, fullHtml, 'utf-8')
    
    const pdfWin = new BrowserWindow({
      width: 794,
      height: 1123,
      show: false,
      webPreferences: { nodeIntegration: false, contextIsolation: true }
    })
    
    await pdfWin.loadFile(tmpFile)
    
    const pdfData = await pdfWin.webContents.printToPDF({
      marginsType: 1,
      pageSize: 'A4',
      printBackground: true,
      landscape: false,
      preferCSSPageSize: true
    })
    
    fs.writeFileSync(filePath, pdfData)
    pdfWin.close()
    try { fs.unlinkSync(tmpFile) } catch(e) {}
    
    return { success: true, filePath }
  } catch (error) {
    console.error('Failed to export Ledger PDF:', error)
    return { success: false, error: error.message }
  }
})

// Expiry
ipcMain.handle('get-expiry-alerts', () => handleDb('getExpiryAlerts'))
ipcMain.handle('get-expiring-batches', (_, days) => handleDb('getExpiringBatches', days))

// Returns Management
ipcMain.handle('get-sales-bill-for-return', (_, bill_number) => handleDb('getSalesBillForReturn', bill_number))
ipcMain.handle('get-purchase-bill-for-return', (_, invoice_number) => handleDb('getPurchaseBillForReturn', invoice_number))
ipcMain.handle('create-sales-return', (_, data) => handleDb('createSalesReturn', data))
ipcMain.handle('create-purchase-return', (_, data) => handleDb('createPurchaseReturn', data))
ipcMain.handle('get-sales-returns', () => handleDb('getSalesReturns'))
ipcMain.handle('get-purchase-returns', () => handleDb('getPurchaseReturns'))
ipcMain.handle('get-wholesale-bill-for-return', (_, bill_number) => handleDb('getWholesaleBillForReturn', bill_number))
ipcMain.handle('create-wholesale-return', (_, data) => handleDb('createWholesaleReturn', data))
ipcMain.handle('get-wholesale-returns', () => handleDb('getWholesaleReturns'))

// Dashboard & Reports
ipcMain.handle('get-dashboard-stats', () => handleDb('getDashboardStats'))
ipcMain.handle('get-balance-sheet', () => handleDb('getBalanceSheetData'))
ipcMain.handle('get-profit-loss', () => handleDb('getProfitLossData'))
ipcMain.handle('get-gst-returns', (_, fromDate, toDate) => handleDb('getGstReturnsData', fromDate, toDate))

// Godown Master
ipcMain.handle('get-godowns', () => handleDb('getGodowns'))
ipcMain.handle('add-godown', (_, data) => handleDb('addGodown', data))
ipcMain.handle('delete-godown', (_, id) => handleDb('deleteGodown', id))

// Stock Batches
ipcMain.handle('add-stock-batch', (_, data) => handleDb('addStockBatch', data))
ipcMain.handle('get-stock-batches', (_, medicineId) => handleDb('getStockBatches', medicineId))
ipcMain.handle('get-all-stock-batches', () => handleDb('getAllStockBatches'))
ipcMain.handle('update-stock-batch', (_, data) => handleDb('updateStockBatch', data))
ipcMain.handle('delete-stock-batch', (_, id) => handleDb('deleteStockBatch', id))
ipcMain.handle('get-item-ledger', (_, medicineId) => handleDb('getItemLedger', medicineId))
ipcMain.handle('reset-all-stock', () => handleDb('resetAllStock'))

// Store Profile
ipcMain.handle('get-store-profile', () => handleDb('getStoreProfile'))
ipcMain.handle('update-store-profile', (_, data) => handleDb('updateStoreProfile', data))
ipcMain.handle('is-current-year-locked', () => handleDb('isCurrentYearLocked'))
ipcMain.handle('verify-admin-pin', (_, pin) => handleDb('verifyAdminPin', pin))
ipcMain.handle('update-admin-pin', (_, pin) => handleDb('updateAdminPin', pin))
ipcMain.handle('verify-cashier-pin', (_, pin) => handleDb('verifyCashierPin', pin))
ipcMain.handle('update-cashier-pin', (_, pin) => handleDb('updateCashierPin', pin))


// POS Printer
ipcMain.handle('get-printers', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (!win) return []
  return await win.webContents.getPrintersAsync()
})

ipcMain.handle('print-receipt', async (event, receiptData) => {
  console.log('\n========== [THERMAL PRINT JOB] ==========');
  const os = require('os')
  const { execSync } = require('child_process')
  const fs = require('fs')

  try {
    const printerName = db.getSetting('thermal_printer_name') || 'Champ RP Series'
    const pageSize = db.getSetting('thermal_printer_size') || '80mm'
    
    // Driver paper sizes (from Windows): 72mm printable width
    const driverWidthMM = pageSize === '58mm' ? 48 : 72
    const widthPx = pageSize === '58mm' ? 219 : 302

    console.log(`> Target Printer : ${printerName}`);
    console.log(`> Page Size      : ${pageSize} (Printable ${driverWidthMM}mm)`);
    console.log(`> Items          : ${receiptData.length}`);

    // 1) Build HTML receipt
    let htmlBody = ''
    for (const item of receiptData) {
      if (item.type === 'text') {
        const style = item.style || {}
        let css = `margin:0; padding:0;`
        if (style.fontWeight) css += `font-weight:${style.fontWeight};`
        if (style.textAlign) css += `text-align:${style.textAlign};`
        if (style.fontSize) css += `font-size:${style.fontSize};`
        if (style.marginTop) css += `margin-top:${style.marginTop};`
        htmlBody += `<p style="${css}">${item.value || ''}</p>\n`
      } else if (item.type === 'html') {
        htmlBody += item.value + '\n'
      } else if (item.type === 'table') {
        const style = item.style || {}
        let tableCss = `width:100%; border-collapse:collapse;`
        if (style.fontSize) tableCss += `font-size:${style.fontSize};`
        const headerStyle = item.tableHeaderStyle || {}
        let thCss = `padding:2px 4px; text-align:left;`
        if (headerStyle.backgroundColor) thCss += `background:${headerStyle.backgroundColor};`
        if (headerStyle.color) thCss += `color:${headerStyle.color};`
        if (headerStyle.fontSize) thCss += `font-size:${headerStyle.fontSize};`

        htmlBody += `<table style="${tableCss}">\n<thead><tr>`
        for (const h of (item.tableHeader || [])) {
          htmlBody += `<th style="${thCss}">${h}</th>`
        }
        htmlBody += `</tr></thead>\n<tbody>`
        for (const row of (item.tableBody || [])) {
          htmlBody += `<tr>`
          for (const cell of row) {
            htmlBody += `<td style="padding:2px 4px; border-bottom:1px solid #ddd;">${cell}</td>`
          }
          htmlBody += `</tr>\n`
        }
        htmlBody += `</tbody></table>\n`
      }
    }

    const fullHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  @page { margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; color: #000; }
  body { font-family: 'Arial', 'Helvetica', sans-serif; font-weight: 600; width: ${driverWidthMM}mm; padding: 2mm; font-size: 11px; }
  p { line-height: 1.3; }
  table { margin: 4px 0; }
  .solid-border { border-top: 1px solid #000; border-bottom: 1px solid #000; }
</style>
</head><body>${htmlBody}</body></html>`

    // 2) Save to temp file
    const tmpFile = path.join(os.tmpdir(), `homoeo_receipt_${Date.now()}.html`)
    fs.writeFileSync(tmpFile, fullHtml, 'utf-8')
    console.log(`> Temp file: ${tmpFile}`);

    // 3) Create hidden window and load from file
    const printWin = new BrowserWindow({
      width: widthPx,
      height: 800,
      show: false,
      webPreferences: { nodeIntegration: false, contextIsolation: true }
    })

    await printWin.loadFile(tmpFile)
    console.log('> Receipt rendered in hidden window');

    // 4) Print silently
    const printOptions = {
      silent: true,
      printBackground: true,
      deviceName: printerName,
      copies: 1,
      margins: { marginType: 'none' }
    }
    console.log('> Print options:', JSON.stringify(printOptions, null, 2));

    const result = await new Promise((resolve, reject) => {
      printWin.webContents.print(printOptions, (success, failureReason) => {
        console.log(`> Electron callback: success=${success}, failureReason=${failureReason}`);
        printWin.close()
        try { fs.unlinkSync(tmpFile) } catch(e) {}

        if (success) {
          resolve({ success: true })
        } else {
          reject(new Error(failureReason || 'Print failed'))
        }
      })
    })

    // 5) Wait and check queue
    await new Promise(r => setTimeout(r, 2000))
    try {
      const psCmd = `Get-PrintJob -PrinterName '${printerName.replace(/'/g, "''")}' | Select-Object -First 3 Id, DocumentName, JobStatus, Size, TotalPages | Format-List`
      const spoolerResult = execSync(`powershell.exe -NoProfile -Command "${psCmd}"`, { encoding: 'utf-8', timeout: 5000 })
      if (spoolerResult.trim()) {
        console.log('> Windows Print Queue:');
        console.log(spoolerResult.trim());
      } else {
        console.log('> Print Queue: Empty (job completed or cleared)');
      }
    } catch (e) {
      console.log('> Could not query print queue:', e.message?.substring(0, 200))
    }

    console.log('==========================================\n');
    return result;
  } catch (error) {
    console.error('> PRINT ERROR:', error.message);
    console.error('> Stack:', error.stack);
    console.log('==========================================\n');
    return { success: false, error: error.message || String(error) };
  }
});

// Network Modes
ipcMain.handle('get-network-status', () => network.getStatus())
ipcMain.handle('set-network-mode', (_, mode) => {
  network.setMode(mode)
  updateTray()
  return network.getStatus()
})


// ─── Purchase Order PDF Export ───
ipcMain.handle('export-po-pdf', async (event, poData, storeData) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  
  const dateStr = new Date().toISOString().split('T')[0]
  const defaultFileName = `Purchase_Order_${(poData.supplier_name||'Distributor').replace(/[^a-zA-Z0-9]/g, '_')}_${dateStr}.pdf`

  const { filePath, canceled } = await dialog.showSaveDialog(win, {
    title: 'Save Purchase Order as PDF',
    defaultPath: defaultFileName,
    filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
  })
  
  if (canceled || !filePath) return { success: false, canceled: true }
  
  try {
    let itemRows = ''
    if (poData.items) {
      poData.items.forEach((item, idx) => {
        itemRows += `<tr>
          <td style="text-align:center; padding: 8px;">${idx+1}</td>
          <td style="padding: 8px;">${item.company || '-'}</td>
          <td style="padding: 8px; font-weight: 600;">${item.medicine_name}</td>
          <td style="padding: 8px;">${item.potency || '-'}</td>
          <td style="padding: 8px;">${item.packing || '-'}</td>
          <td style="text-align:center; padding: 8px; font-weight: 700; color: #0f2d1f;">${item.quantity}</td>
          <td style="text-align:center; padding: 8px;"><div style="width: 16px; height: 16px; border: 2px solid #9ca3af; border-radius: 4px; display: inline-block; vertical-align: middle;"></div></td>
        </tr>`
      })
    }
    
    const fullHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  @page { size: A4; margin: 0; }
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Outfit', Arial, sans-serif; width: 210mm; min-height: 297mm; padding: 15mm; color: #1f2937; background: #fff; }
  
  .wrapper { border: 1px solid #d1d5db; border-radius: 12px; padding: 20px; display: flex; flex-direction: column; min-height: 267mm; }
  table.items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  table.items-table th { background: #14452f; color: #fff; padding: 10px 8px; font-size: 12px; font-weight: 600; text-align: left; }
  table.items-table th:first-child, table.items-table th:last-child { text-align: center; }
  table.items-table tr:nth-child(even) { background: #f8fafc; }
  table.items-table td { padding: 8px; font-size: 13px; color: #374151; border-bottom: 1px solid #e5e7eb; }
  
  .footer { margin-top: auto; padding-top: 20px; border-top: 2px solid #e5e7eb; font-size: 12px; color: #6b7280; text-align: center; }
  .notes { margin-top: 20px; font-size: 13px; background: #fefce8; padding: 12px; border: 1px solid #fef08a; border-radius: 8px; color: #854d0e; }
</style>
</head><body>
  <div class="wrapper">
    <div class="header" style="padding-bottom: 12px; border-bottom: 2px solid #e5e7eb; margin-bottom: 20px;">
      <div style="display: flex; flex-direction: column; align-items: flex-start; gap: 8px; margin-bottom: 12px;">
          <h1 style="font-size: 26px; font-weight: 800; color: #14452f; margin: 0; letter-spacing: -0.5px;">${(storeData.store_name||'').toUpperCase()}</h1>
          <div style="background: #e0f2fe; color: #0369a1; font-size: 14px; font-weight: 800; padding: 4px 12px; border-radius: 4px; letter-spacing: 1px; border: 1px solid #bae6fd; margin: 0; white-space: nowrap;">PURCHASE ORDER</div>
      </div>
      <p style="font-size: 13px; color: #4b5563; line-height: 1.5; margin: 0;">${storeData.address_line1||''}, ${storeData.address_line2||''}, ${storeData.address_line3||''}</p>
      <p style="font-size: 13px; color: #4b5563; line-height: 1.5; margin: 0;"><strong>Mob:</strong> ${storeData.phone||''}</p>
      <p style="font-size: 13px; font-weight: 600; color: #374151; margin-top: 4px;"><strong>Date:</strong> ${new Date().toLocaleDateString('en-IN')}</p>
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th style="width:5%">SNo</th>
          <th style="width:20%">Company</th>
          <th style="width:30%">Medicine Name</th>
          <th style="width:15%">Potency</th>
          <th style="width:10%">Packing</th>
          <th style="width:10%">Qty</th>
          <th style="width:10%; text-align:center;">Done</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
      </tbody>
    </table>
    
    ${poData.notes ? `<div class="notes"><strong>Notes:</strong><br>${poData.notes}</div>` : ''}

    <div class="footer">
      <p>This is a system generated purchase order.</p>
    </div>
  </div>
</body></html>`

    const os = require('os')
    const tmpFile = path.join(os.tmpdir(), `po_${Date.now()}.html`)
    fs.writeFileSync(tmpFile, fullHtml, 'utf-8')
    
    const pdfWin = new BrowserWindow({
      width: 794,
      height: 1123,
      show: false,
      webPreferences: { nodeIntegration: false, contextIsolation: true }
    })
    
    await pdfWin.loadFile(tmpFile)
    
    const pdfData = await pdfWin.webContents.printToPDF({
      marginsType: 1,
      pageSize: 'A4',
      printBackground: true,
      landscape: false,
      preferCSSPageSize: true
    })
    
    fs.writeFileSync(filePath, pdfData)
    pdfWin.close()
    try { fs.unlinkSync(tmpFile) } catch(e) {}
    
    return { success: true, filePath }
  } catch (error) {
    console.error('Failed to export PO PDF:', error)
    return { success: false, error: error.message }
  }
})

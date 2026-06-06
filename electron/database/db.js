const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')
const { app } = require('electron')

// Copy seed database files if they do not exist in userData directory
function checkAndCopySeeds() {
  const userDataPath = app.getPath('userData')
  const seedDir = path.join(__dirname, '..', 'seed')
  
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true })
  }
  
  const filesToCopy = ['homoeostore_master.db']
  filesToCopy.forEach(file => {
    const destPath = path.join(userDataPath, file)
    const srcPath = path.join(seedDir, file)
    
    if (!fs.existsSync(destPath)) {
      if (fs.existsSync(srcPath)) {
        try {
          fs.copyFileSync(srcPath, destPath)
          console.log(`✅ Copied seed file to userData: ${file}`)
        } catch (err) {
          console.error(`❌ Failed to copy seed file ${file}:`, err)
        }
      } else {
        console.warn(`⚠️ Seed file ${file} not found in ${seedDir}`)
      }
    }
  })
}

try {
  checkAndCopySeeds()
} catch (e) {
  console.error('Failed to copy seed files:', e)
}

// System Configuration File (to track FYs)
const SCHEMA_PATH = path.join(__dirname, 'schema.sql')
const CONFIG_PATH = path.join(app.getPath('userData'), 'system_config.json')

let currentDbName = 'homoeostore.db'
try {
  if (fs.existsSync(CONFIG_PATH)) {
    const conf = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'))
    if (conf && conf.financialYears && conf.financialYears.length > 0) {
      currentDbName = conf.financialYears[conf.financialYears.length - 1].dbName
    }
  }
} catch (e) {}
let db = null
let allDbsMigrated = false

function getSystemConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    const defaultConfig = {
      financialYears: [
        { id: '2024-2025', dbName: 'homoeostore.db', name: 'FY 2024 - 2025', startDate: '2024-04-01', endDate: '2025-03-31' }
      ]
    }
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(defaultConfig, null, 2))
    return defaultConfig
  }
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'))
}

function saveSystemConfig(config) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2))
}

function getFinancialYears() {
  return getSystemConfig().financialYears
}

function selectFinancialYear(dbName) {
  if (db) {
    db.close()
    db = null
  }
  currentDbName = dbName
  return true
}

function runMigrations(database) {
  // Drop legacy placeholder and dormant clinical tables if they exist in the local database
  try {
    database.exec("DROP TABLE IF EXISTS main.companies");
    database.exec("DROP TABLE IF EXISTS main.dispensing_rates");
    database.exec("DROP TABLE IF EXISTS main.prescriptions");
    database.exec("DROP TABLE IF EXISTS main.prescription_items");
    console.log("Successfully dropped local legacy and clinical tables.");
  } catch (e) {
    console.error("Failed to drop local legacy/clinical tables:", e);
  }

  // ─── Migrate local stock_batches table to master database ───
  try {
    const tableType = database.prepare("SELECT type FROM sqlite_master WHERE name = 'stock_batches'").get()?.type;
    if (tableType === 'table') {
      console.log('Migrating local stock_batches table to master database...');
      database.exec("INSERT OR IGNORE INTO master.stock_batches SELECT * FROM stock_batches");
      console.log("Successfully copied local stock batches to master database.");
      database.exec("DROP TABLE stock_batches");
      console.log("Successfully dropped local stock_batches table.");
    }
  } catch (e) {
    console.error("Failed to migrate stock_batches to master database:", e);
  }

  // Safely add columns to existing tables (won't error if column already exists)
  const addCol = (table, col, type) => {
    try { database.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`) } catch(e) {}
  }

  addCol('wholesale_bills', 'medical_rep', 'TEXT')
  addCol('wholesale_bills', 'eway_bill_no', 'TEXT')
  addCol('wholesale_bills', 'eway_vehicle_no', 'TEXT')
  addCol('wholesale_bills', 'eway_transporter', 'TEXT')
  addCol('wholesale_bills', 'eway_transporter_id', 'TEXT')
  addCol('wholesale_bills', 'eway_distance', 'INTEGER')
  
  addCol('wholesale_bill_items', 'hsn_code', 'TEXT')
  
  addCol('store_profile', 'bank_name', 'TEXT')
  addCol('store_profile', 'account_number', 'TEXT')
  addCol('store_profile', 'ifsc_code', 'TEXT')
  addCol('store_profile', 'qr_code', 'TEXT')

  // Create settings table if not exists
  database.exec('CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)');
  
  // GST Sales migrations
  addCol('master.medicines', 'hsn_code', 'TEXT')
  addCol('bill_items', 'gst_rate', 'REAL DEFAULT 5')
  addCol('bill_items', 'cgst_amount', 'REAL DEFAULT 0')
  addCol('bill_items', 'sgst_amount', 'REAL DEFAULT 0')
  addCol('bill_items', 'igst_amount', 'REAL DEFAULT 0')

  // Wholesale Returns migrations
  database.exec(`
    CREATE TABLE IF NOT EXISTS wholesale_returns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      return_number TEXT UNIQUE NOT NULL,
      ledger_id INTEGER NOT NULL,
      bill_number TEXT,
      return_date DATE NOT NULL,
      total_amount REAL DEFAULT 0,
      reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ledger_id) REFERENCES ledgers(id)
    );
    CREATE TABLE IF NOT EXISTS wholesale_return_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wholesale_return_id INTEGER NOT NULL,
      medicine_id INTEGER NOT NULL,
      batch_id INTEGER,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      total_price REAL NOT NULL,
      gst_rate REAL DEFAULT 5,
      FOREIGN KEY (wholesale_return_id) REFERENCES wholesale_returns(id),
      FOREIGN KEY (medicine_id) REFERENCES medicines(id)
    );
  `)

  // Create store_profile table if not exists (for existing databases)
  database.exec(`
    CREATE TABLE IF NOT EXISTS store_profile (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      store_name TEXT NOT NULL,
      address_line1 TEXT,
      address_line2 TEXT,
      address_line3 TEXT,
      phone TEXT,
      email TEXT,
      gstin TEXT,
      dl_no TEXT,
      dl_expiry DATE,
      mfg_lic_no TEXT,
      admin_pin TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
  
  addCol('store_profile', 'admin_pin', 'TEXT')

  // Transactions migrations
  database.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date DATE NOT NULL,
      ledger_id INTEGER NOT NULL,
      voucher_type TEXT NOT NULL,
      voucher_no TEXT,
      particulars TEXT,
      dr_amount REAL DEFAULT 0,
      cr_amount REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ledger_id) REFERENCES ledgers(id)
    );
  `)

  // Purchase Bills migrations
  database.exec(`
    CREATE TABLE IF NOT EXISTS purchase_bills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supplier_id INTEGER NOT NULL,
      invoice_number TEXT NOT NULL,
      invoice_date DATE NOT NULL,
      total_amount REAL DEFAULT 0,
      discount REAL DEFAULT 0,
      round_off REAL DEFAULT 0,
      net_amount REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (supplier_id) REFERENCES ledgers(id)
    );
  `)

  database.exec(`
    CREATE TABLE IF NOT EXISTS purchase_bill_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_bill_id INTEGER NOT NULL,
      medicine_id INTEGER NOT NULL,
      batch_number TEXT,
      expiry_month INTEGER,
      expiry_year INTEGER,
      quantity INTEGER DEFAULT 0,
      free_quantity INTEGER DEFAULT 0,
      purchase_rate REAL DEFAULT 0,
      mrp REAL DEFAULT 0,
      discount_percent REAL DEFAULT 0,
      gst_rate REAL DEFAULT 0,
      total_price REAL DEFAULT 0,
      FOREIGN KEY (purchase_bill_id) REFERENCES purchase_bills(id),
      FOREIGN KEY (medicine_id) REFERENCES medicines(id)
    );
  `)

  // Return Tables Migrations
  database.exec(`
    CREATE TABLE IF NOT EXISTS sales_returns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      return_number TEXT UNIQUE NOT NULL,
      bill_number TEXT,
      customer_name TEXT,
      customer_phone TEXT,
      total_amount REAL DEFAULT 0,
      reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS sales_return_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sales_return_id INTEGER NOT NULL,
      medicine_id INTEGER NOT NULL,
      batch_id INTEGER,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      total_price REAL NOT NULL,
      gst_rate REAL DEFAULT 5,
      FOREIGN KEY (sales_return_id) REFERENCES sales_returns(id),
      FOREIGN KEY (medicine_id) REFERENCES medicines(id)
    );
    CREATE TABLE IF NOT EXISTS purchase_returns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      return_number TEXT UNIQUE NOT NULL,
      supplier_id INTEGER NOT NULL,
      invoice_number TEXT,
      return_date DATE NOT NULL,
      total_amount REAL DEFAULT 0,
      reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (supplier_id) REFERENCES ledgers(id)
    );
    CREATE TABLE IF NOT EXISTS purchase_return_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_return_id INTEGER NOT NULL,
      medicine_id INTEGER NOT NULL,
      batch_number TEXT,
      batch_id INTEGER,
      quantity INTEGER DEFAULT 0,
      purchase_rate REAL DEFAULT 0,
      gst_rate REAL DEFAULT 0,
      total_price REAL DEFAULT 0,
      FOREIGN KEY (purchase_return_id) REFERENCES purchase_returns(id),
      FOREIGN KEY (medicine_id) REFERENCES medicines(id)
    );
    CREATE TABLE IF NOT EXISTS issue_slips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      issue_number TEXT UNIQUE NOT NULL,
      ledger_id INTEGER NOT NULL,
      issue_date DATE NOT NULL,
      total_items INTEGER DEFAULT 0,
      total_qty INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ledger_id) REFERENCES ledgers(id)
    );
    CREATE TABLE IF NOT EXISTS issue_slip_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      issue_slip_id INTEGER NOT NULL,
      medicine_id INTEGER NOT NULL,
      batch_id INTEGER,
      quantity INTEGER NOT NULL,
      mrp REAL DEFAULT 0,
      discount_rs REAL DEFAULT 0,
      FOREIGN KEY (issue_slip_id) REFERENCES issue_slips(id),
      FOREIGN KEY (medicine_id) REFERENCES medicines(id)
    );
  `)
  
  addCol('bill_items', 'batch_id', 'INTEGER')

  let cashLedgerId = database.prepare(`SELECT id FROM ledgers WHERE ledger_name = 'CASH' AND account_group = 'CASH IN HAND'`).get()?.id
  if (!cashLedgerId) {
    const result = database.prepare(`
      INSERT INTO ledgers (ledger_name, account_group, opening_balance, dr_cr, ledger_category, ledger_type)
      VALUES ('CASH', 'CASH IN HAND', 0, 'Dr', 'OTHERS', 'UNREGISTERED')
    `).run()
    cashLedgerId = result.lastInsertRowid
  }

  // Ensure Purchase and Sales accounts exist
  let purchaseLedger = database.prepare(`SELECT id FROM ledgers WHERE ledger_name = 'Purchase Account'`).get()
  if (!purchaseLedger) {
    database.prepare(`
      INSERT INTO ledgers (ledger_name, account_group, opening_balance, dr_cr, ledger_category, ledger_type)
      VALUES ('Purchase Account', 'PURCHASE ACCOUNTS', 0, 'Dr', 'OTHERS', 'UNREGISTERED')
    `).run()
  }

  let salesLedger = database.prepare(`SELECT id FROM ledgers WHERE ledger_name = 'Sales Account'`).get()
  if (!salesLedger) {
    database.prepare(`
      INSERT INTO ledgers (ledger_name, account_group, opening_balance, dr_cr, ledger_category, ledger_type)
      VALUES ('Sales Account', 'SALES ACCOUNTS', 0, 'Cr', 'OTHERS', 'UNREGISTERED')
    `).run()
  }

  // Backfill old bills into transactions
  if (cashLedgerId) {
    const oldBills = database.prepare(`
      SELECT * FROM bills 
      WHERE bill_number NOT IN (
        SELECT voucher_no FROM transactions WHERE voucher_type = 'Sale'
      )
    `).all()
    
    if (oldBills.length > 0) {
      const insertTx = database.prepare(`
        INSERT INTO transactions (date, ledger_id, voucher_type, voucher_no, particulars, dr_amount, cr_amount, created_at)
        VALUES (DATE(@created_at), @ledger_id, 'Sale', @bill_number, @particulars, @total_amount, 0, @created_at)
      `)
      
      database.transaction(() => {
        for (const bill of oldBills) {
          insertTx.run({
            ledger_id: cashLedgerId,
            bill_number: bill.bill_number,
            particulars: `Cash Sale to ${bill.customer_name || 'Walk-in'}`,
            total_amount: bill.total_amount,
            created_at: bill.created_at
          })
        }
      })()
    }
  }

  // Seed default store profile if empty
  const profileCount = database.prepare('SELECT COUNT(*) as count FROM master.store_profile').get().count
  if (profileCount === 0) {
    database.prepare(`
      INSERT INTO master.store_profile (store_name, address_line1, address_line2, address_line3, phone, email, gstin, dl_no)
      VALUES (
        'HOMOEOSTORE', 
        'Budha Bazar, Near Nangloi', 
        'New Delhi', 
        'Delhi - 110041', 
        '9876543210', 
        'info@homoeostore.com', 
        '07AACCR1234F1Z5', 
        'DL-12345/W'
      )
    `).run()
    console.log('✅ Seeded default store profile')
  }

  // One-time stock reset migration for stock batches update
  const userVersion = database.pragma('user_version', { simple: true })
  if (userVersion < 1) {
    try {
      database.exec('UPDATE master.medicines SET stock_quantity = 0')
      database.pragma('user_version = 1')
      console.log('✅ Stock quantities reset to 0 (one-time migration)')
    } catch (e) {
      console.error('Failed to reset stock quantities:', e)
    }
  }

  // Fix negative stock values (one-time migration)
  const userVersion2 = database.pragma('user_version', { simple: true })
  if (userVersion2 < 2) {
    try {
      database.exec('UPDATE master.medicines SET stock_quantity = 0 WHERE stock_quantity < 0')
      database.pragma('user_version = 2')
      console.log('✅ Fixed negative stock quantities to 0 (one-time migration)')
    } catch (e) {
      console.error('Failed to fix negative stock:', e)
    }
  }

  const userVersion3 = database.pragma('user_version', { simple: true })
  if (userVersion3 < 3) {
      try {
          const meds = database.prepare("SELECT id FROM master.medicines WHERE name LIKE '%LIV T%'").all();
          for (const med of meds) {
              database.prepare("DELETE FROM master.stock_batches WHERE medicine_id = ?").run(med.id);
          }
          database.prepare("DELETE FROM master.medicines WHERE name LIKE '%LIV T%'").run();
          database.pragma('user_version = 3')
          console.log('✅ Deleted LIV T entry')
      } catch(e){}
  }


  try { database.exec(`CREATE INDEX IF NOT EXISTS idx_bills_created_at ON bills(created_at DESC);`); } catch(e) {}
  try { database.exec(`CREATE INDEX IF NOT EXISTS idx_bills_bill_number ON bills(bill_number);`); } catch(e) {}
  try { database.exec(`CREATE INDEX IF NOT EXISTS idx_bill_items_bill_id ON bill_items(bill_id);`); } catch(e) {}
  
  try { database.exec(`CREATE INDEX IF NOT EXISTS idx_wholesale_bills_created_at ON wholesale_bills(created_at DESC);`); } catch(e) {}
  try { database.exec(`CREATE INDEX IF NOT EXISTS idx_wholesale_bills_bill_number ON wholesale_bills(bill_number);`); } catch(e) {}
  try { database.exec(`CREATE INDEX IF NOT EXISTS idx_wholesale_bill_items_bill_id ON wholesale_bill_items(wholesale_bill_id);`); } catch(e) {}
  
  try { database.exec(`CREATE INDEX IF NOT EXISTS master.idx_stock_batches_medicine_id ON stock_batches(medicine_id);`); } catch(e) {}
  try { database.exec(`CREATE INDEX IF NOT EXISTS idx_mr_ledgers ON mrs(ledger_id);`); } catch(e) {}
  
  try { database.exec(`CREATE INDEX IF NOT EXISTS master.idx_medicines_name ON medicines(name);`); } catch(e) {}
  try { database.exec(`CREATE INDEX IF NOT EXISTS master.idx_medicines_supplier_id ON medicines(supplier_id);`); } catch(e) {}
  try { database.exec(`CREATE INDEX IF NOT EXISTS master.idx_ledgers_name ON ledgers(ledger_name);`); } catch(e) {}
}

function getDB() {
  if (!db) {
    const DB_PATH = path.join(app.getPath('userData'), currentDbName)
    const MASTER_PATH = path.join(app.getPath('userData'), 'homoeostore_master.db')
    
    // Self-healing check for master database file
    if (!fs.existsSync(MASTER_PATH)) {
      console.log('⚠️ master database not found in userData. Bootstrapping a new one...');
      let tempMasterDb = null;
      try {
        tempMasterDb = new Database(MASTER_PATH);
        const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
        tempMasterDb.exec(schema);
        
        // Create stock_batches table in master since it's global
        tempMasterDb.exec(`
          CREATE TABLE IF NOT EXISTS stock_batches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            medicine_id INTEGER NOT NULL,
            company TEXT,
            batch_no TEXT,
            quantity INTEGER DEFAULT 0,
            mrp REAL DEFAULT 0,
            dis_percent REAL DEFAULT 0,
            expiry_month INTEGER,
            expiry_year INTEGER,
            godown TEXT DEFAULT 'G1',
            location_type TEXT DEFAULT 'BOX',
            location_value TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (medicine_id) REFERENCES medicines(id)
          );
        `);
        console.log('✅ Successfully bootstrapped new empty master database.');
      } catch (err) {
        console.error('❌ Failed to bootstrap master database:', err);
      } finally {
        if (tempMasterDb) {
          try { tempMasterDb.close(); } catch(e) {}
        }
      }
    }

    db = new Database(DB_PATH)

    const config = getSystemConfig();
    global.activeFinancialYear = config.financialYears.find(f => f.dbName === currentDbName) || null;

    try {
      if (fs.existsSync(MASTER_PATH)) {
        const masterPathStr = MASTER_PATH.replace(/\\/g, '/')
        db.exec(`ATTACH DATABASE '${masterPathStr}' AS master`)
        
        // Ensure master tables exist with full schema
        db.exec(`
          CREATE TABLE IF NOT EXISTS master.store_profile (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            store_name TEXT NOT NULL,
            address_line1 TEXT,
            address_line2 TEXT,
            address_line3 TEXT,
            phone TEXT,
            email TEXT,
            gstin TEXT,
            dl_no TEXT,
            dl_expiry DATE,
            mfg_lic_no TEXT,
            admin_pin TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            bank_name TEXT,
            account_number TEXT,
            ifsc_code TEXT,
            qr_code TEXT
          );
          CREATE TABLE IF NOT EXISTS master.settings (key TEXT PRIMARY KEY, value TEXT);
          CREATE TABLE IF NOT EXISTS master.stock_batches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            medicine_id INTEGER NOT NULL,
            company TEXT,
            batch_no TEXT,
            quantity INTEGER DEFAULT 0,
            mrp REAL DEFAULT 0,
            dis_percent REAL DEFAULT 0,
            expiry_month INTEGER,
            expiry_year INTEGER,
            godown TEXT DEFAULT 'G1',
            location_type TEXT DEFAULT 'BOX',
            location_value TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (medicine_id) REFERENCES medicines(id)
          );
        `)
      }
    } catch(e) {
      console.error('Failed to attach master DB', e)
    }

    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = OFF')

    const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8')
    db.exec(schema)

    // Run migrations for existing databases (add missing columns)
    runMigrations(db)

    // Automatically migrate stock batches from other financial year databases on startup
    if (!allDbsMigrated) {
      allDbsMigrated = true
      try {
        if (config && config.financialYears) {
          for (const fy of config.financialYears) {
            if (fy.dbName === currentDbName) continue;
            const fyPath = path.join(app.getPath('userData'), fy.dbName)
            if (fs.existsSync(fyPath)) {
              let tempDb = null
              try {
                tempDb = new Database(fyPath)
                if (fs.existsSync(MASTER_PATH)) {
                  const masterPathStr = MASTER_PATH.replace(/\\/g, '/')
                  tempDb.exec(`ATTACH DATABASE '${masterPathStr}' AS master`)
                  runMigrations(tempDb)
                }
              } catch (tempErr) {
                console.error(`Failed to migrate stock batches from ${fy.dbName}:`, tempErr)
              } finally {
                if (tempDb) {
                  try { tempDb.close() } catch(e) {}
                }
              }
            }
          }
        }
      } catch (err) {
        console.error('Failed to run multi-database migration loop:', err)
      }
    }
    
    // Copy data from local DB if master is empty
    try {
      const profileCount = db.prepare('SELECT COUNT(*) as count FROM master.store_profile').get().count
      if (profileCount === 0) {
        db.exec('INSERT INTO master.store_profile SELECT * FROM store_profile')
      }
      const settingsCount = db.prepare('SELECT COUNT(*) as count FROM master.settings').get().count
      if (settingsCount === 0) {
        db.exec('INSERT INTO master.settings SELECT * FROM settings')
      }
    } catch(e) {}
    
    // Migrate ledgers from master to main if main.ledgers is empty
    try {
      const mainLedgersCount = db.prepare('SELECT COUNT(*) as count FROM ledgers').get().count;
      if (mainLedgersCount === 0) {
        const masterLedgersExists = db.prepare("SELECT name FROM master.sqlite_master WHERE type='table' AND name='ledgers'").get();
        if (masterLedgersExists) {
          db.exec('INSERT INTO ledgers SELECT * FROM master.ledgers');
        }
      }
    } catch(migErr) {
      console.error('Failed to migrate ledgers from master', migErr);
    }

    // Sync stock_quantity with master.stock_batches quantities automatically
    try {
      db.exec(`
        UPDATE master.medicines 
        SET stock_quantity = (
          SELECT COALESCE(SUM(quantity), 0) 
          FROM master.stock_batches 
          WHERE medicine_id = medicines.id
        )
        WHERE id IN (
          SELECT DISTINCT medicine_id FROM master.stock_batches
        )
      `)
    } catch(e) {
      console.error('Error syncing stock quantities:', e)
    }

    console.log('✅ Database connected at:', DB_PATH)
  }
  return db
}

function createFinancialYear(data) {
  const config = getSystemConfig()
  const dbName = `FY_${data.id.replace('-', '_')}.db`
  
  if (config.financialYears.find(f => f.id === data.id)) {
    throw new Error('Financial year already exists')
  }

  // Get previous FY DB name
  let oldDbName = null;
  if (config.financialYears.length > 0) {
    oldDbName = config.financialYears[config.financialYears.length - 1].dbName;
    config.financialYears[config.financialYears.length - 1].is_locked = true;
  }

  // Register in config
  config.financialYears.push({
    id: data.id,
    dbName: dbName,
    name: data.name,
    startDate: data.startDate,
    endDate: data.endDate,
    is_locked: false
  })
  saveSystemConfig(config)

  // Initialize new DB
  const NEW_DB_PATH = path.join(app.getPath('userData'), dbName)
  const newDb = new Database(NEW_DB_PATH)
  const txSchemaPath = path.join(__dirname, 'tx_schema.sql')
  const schema = fs.readFileSync(txSchemaPath, 'utf-8')
  newDb.exec(schema)
  
  // Carry Forward Ledgers from Previous FY
  if (oldDbName) {
    try {
      const oldDbPath = path.join(app.getPath('userData'), oldDbName);
      if (fs.existsSync(oldDbPath)) {
        const oldDb = new Database(oldDbPath);
        const oldLedgers = oldDb.prepare(`
          SELECT l.*, 
                 (l.opening_balance * CASE WHEN l.dr_cr = 'Dr' THEN 1 ELSE -1 END) 
                 + COALESCE(SUM(t.dr_amount), 0) - COALESCE(SUM(t.cr_amount), 0) as current_balance_raw
          FROM ledgers l
          LEFT JOIN transactions t ON l.id = t.ledger_id
          GROUP BY l.id
        `).all();
        
        const insertLedger = newDb.prepare(`
          INSERT INTO ledgers (
            ledger_name, station, account_group, balancing_method, opening_balance, dr_cr,
            mail_to, address, pin_code, email, website, contact_person, designation,
            phone_office, phone_res, mobile, fax, dl_no, dl_expiry, gst_heading, gstin, pan_no,
            ledger_category, state, country, ledger_type
          ) VALUES (
            @ledger_name, @station, @account_group, @balancing_method, @opening_balance, @dr_cr,
            @mail_to, @address, @pin_code, @email, @website, @contact_person, @designation,
            @phone_office, @phone_res, @mobile, @fax, @dl_no, @dl_expiry, @gst_heading, @gstin, @pan_no,
            @ledger_category, @state, @country, @ledger_type
          )
        `);
        
        newDb.transaction(() => {
          for (const l of oldLedgers) {
            const currentBalRaw = l.current_balance_raw || 0;
            const newOpeningBal = Math.abs(currentBalRaw);
            const newDrCr = currentBalRaw >= 0 ? 'Dr' : 'Cr';
            
            insertLedger.run({
              ledger_name: l.ledger_name,
              station: l.station,
              account_group: l.account_group,
              balancing_method: l.balancing_method,
              opening_balance: newOpeningBal,
              dr_cr: newDrCr,
              mail_to: l.mail_to,
              address: l.address,
              pin_code: l.pin_code,
              email: l.email,
              website: l.website,
              contact_person: l.contact_person,
              designation: l.designation,
              phone_office: l.phone_office,
              phone_res: l.phone_res,
              mobile: l.mobile,
              fax: l.fax,
              dl_no: l.dl_no,
              dl_expiry: l.dl_expiry,
              gst_heading: l.gst_heading,
              gstin: l.gstin,
              pan_no: l.pan_no,
              ledger_category: l.ledger_category,
              state: l.state,
              country: l.country,
              ledger_type: l.ledger_type
            });
          }
        })();
        
        oldDb.close();
      }
    } catch(err) {
      console.error('Failed to carry forward ledgers', err);
    }
  }

  newDb.close()
  return true
}

// ─── Account Groups ───────────────────────────────────────
function getAccountGroups() {
  return getDB().prepare('SELECT * FROM master.account_groups ORDER BY name ASC').all()
}



function addAccountGroup(data) {
  const stmt = getDB().prepare('INSERT INTO master.account_groups (name, type, desc, is_custom) VALUES (@name, @type, @desc, 1)')
  return stmt.run(data)
}

function deleteAccountGroup(id) {
  return getDB().prepare('DELETE FROM master.account_groups WHERE id = ? AND is_custom = 1').run(id)
}

// ─── Medicines ────────────────────────────────────────────
function getMedicines() {
  return getDB().prepare(`
    SELECT m.*, s.name as supplier_name 
    FROM master.medicines m
    LEFT JOIN master.suppliers s ON m.supplier_id = s.id
    ORDER BY m.name ASC
  `).all()
}

function searchMedicinesPaginated({ search = '', page = 1, limit = 50 }) {
  const db = getDB()
  const offset = (page - 1) * limit
  let queryBase = `
    FROM master.medicines m
    LEFT JOIN master.suppliers s ON m.supplier_id = s.id
  `
  let params = []
  
  if (search.trim() !== '') {
    const terms = search.trim().split(/\s+/)
    const conditions = []
    for (const term of terms) {
      conditions.push(`(m.name LIKE ? OR m.company LIKE ?)`)
      params.push(`%${term}%`, `%${term}%`)
    }
    queryBase += ` WHERE ${conditions.join(' AND ')} `
  }

  const countRow = db.prepare(`SELECT COUNT(*) as total ${queryBase}`).get(...params)
  
  const data = db.prepare(`
    SELECT m.*, s.name as supplier_name 
    ${queryBase}
    ORDER BY m.name ASC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset)

  return { data, total: countRow.total, page, limit }
}

function addMedicine(data) {
  const stmt = getDB().prepare(`
    INSERT INTO master.medicines 
    (name, company, category, potency, unit, purchase_price, selling_price, stock_quantity, low_stock_threshold, expiry_date, supplier_id, gst_rate, hsn_code)
    VALUES (@name, @company, @category, @potency, @unit, @purchase_price, @selling_price, @stock_quantity, @low_stock_threshold, @expiry_date, @supplier_id, @gst_rate, @hsn_code)
  `)
  return stmt.run(data)
}

function updateMedicine(data) {
  const stmt = getDB().prepare(`
    UPDATE master.medicines SET
      name=@name, company=@company, category=@category, potency=@potency,
      unit=@unit, purchase_price=@purchase_price, selling_price=@selling_price,
      stock_quantity=@stock_quantity, low_stock_threshold=@low_stock_threshold,
      expiry_date=@expiry_date, supplier_id=@supplier_id, gst_rate=@gst_rate, hsn_code=@hsn_code
    WHERE id=@id
  `)
  return stmt.run(data)
}

function deleteMedicine(id) {
  return getDB().prepare(`DELETE FROM master.medicines WHERE id=?`).run(id)
}

function getLowStock() {
  return getDB().prepare(`
    SELECT m.*,
      (
        SELECT COALESCE(SUM(sb.quantity), 0)
        FROM master.stock_batches sb
        WHERE sb.medicine_id = m.id 
          AND sb.quantity > 0
          AND sb.expiry_year IS NOT NULL AND sb.expiry_year != ''
          AND sb.expiry_month IS NOT NULL AND sb.expiry_month != ''
          AND date(printf('%04d-%02d-01', CAST(sb.expiry_year AS INTEGER), CAST(sb.expiry_month AS INTEGER))) < date('now')
      ) as expired_quantity
    FROM master.medicines m
    WHERE m.stock_quantity <= m.low_stock_threshold
    AND m.id IN (SELECT DISTINCT medicine_id FROM master.stock_batches)
    ORDER BY m.stock_quantity ASC
  `).all()
}

function updateStock(data) {
  return getDB().prepare(`
    UPDATE master.medicines SET stock_quantity = stock_quantity + @quantity WHERE id = @id
  `).run(data)
}

// ─── Suppliers ────────────────────────────────────────────
function getSuppliers() {
  return getDB().prepare('SELECT * FROM master.suppliers ORDER BY name ASC').all()
}

function addSupplier(data) {
  return getDB().prepare(`
    INSERT INTO master.suppliers (name, phone, email, address)
    VALUES (@name, @phone, @email, @address)
  `).run(data)
}

// ─── Companies ────────────────────────────────────────────
function getCompanies() {
  return getDB().prepare(`SELECT * FROM master.companies ORDER BY name ASC`).all()
}

function addCompany(data) {
  return getDB().prepare(`
    INSERT INTO master.companies (name, address1, address2, address3, phone, branch_code, fax, website, email, country, state, business_type, working_style, gstin, vat_no, dl_no, dl_expiry, mfg_lic_no, mfg_lic_expiry, lst_no, lst_expiry, service_tax, service_tax_expiry, food_lic_no, food_lic_expiry, jurisdiction, tax_structure, company_type, valuation, password)
    VALUES (@name, @address1, @address2, @address3, @phone, @branch_code, @fax, @website, @email, @country, @state, @business_type, @working_style, @gstin, @vat_no, @dl_no, @dl_expiry, @mfg_lic_no, @mfg_lic_expiry, @lst_no, @lst_expiry, @service_tax, @service_tax_expiry, @food_lic_no, @food_lic_expiry, @jurisdiction, @tax_structure, @company_type, @valuation, @password)
  `).run(data)
}

function updateCompany(data) {
  const db = getDB()
  const oldRecord = db.prepare('SELECT name FROM master.companies WHERE id = ?').get(data.id)
  
  const result = db.prepare(`
    UPDATE master.companies SET
      name=@name, address1=@address1, address2=@address2, address3=@address3,
      phone=@phone, branch_code=@branch_code, fax=@fax, website=@website, email=@email,
      country=@country, state=@state, business_type=@business_type, working_style=@working_style,
      gstin=@gstin, vat_no=@vat_no, dl_no=@dl_no, dl_expiry=@dl_expiry,
      mfg_lic_no=@mfg_lic_no, mfg_lic_expiry=@mfg_lic_expiry,
      lst_no=@lst_no, lst_expiry=@lst_expiry,
      service_tax=@service_tax, service_tax_expiry=@service_tax_expiry,
      food_lic_no=@food_lic_no, food_lic_expiry=@food_lic_expiry,
      jurisdiction=@jurisdiction, tax_structure=@tax_structure,
      company_type=@company_type, valuation=@valuation, password=@password
    WHERE id=@id
  `).run(data)

  // Cascade update to medicines
  if (oldRecord && oldRecord.name) {
    db.prepare(`
      UPDATE master.medicines 
      SET company = ? 
      WHERE supplier_id = ? OR company = ?
    `).run(data.name, data.id, oldRecord.name)
    try {
      db.prepare(`
        UPDATE master.stock_batches 
        SET company = ? 
        WHERE company = ?
      `).run(data.name, oldRecord.name)
    } catch(e) {}
  }

  return result
}

function deleteCompany(id) {
  return getDB().prepare(`DELETE FROM master.companies WHERE id=?`).run(id)
}

// ─── Ledgers ──────────────────────────────────────────────
function getLedgers() {
  const db = getDB()
  const ledgers = db.prepare(`
    SELECT l.*, 
           (l.opening_balance * CASE WHEN l.dr_cr = 'Dr' THEN 1 ELSE -1 END) 
           + COALESCE(SUM(t.dr_amount), 0) - COALESCE(SUM(t.cr_amount), 0) as current_balance_raw,
           (SELECT COUNT(*) FROM purchase_bills pb WHERE pb.supplier_id = l.id) as pb_count,
           (SELECT COUNT(*) FROM transactions tr WHERE tr.ledger_id = l.id) as tr_count
    FROM ledgers l
    LEFT JOIN transactions t ON l.id = t.ledger_id
    GROUP BY l.id
    ORDER BY l.ledger_name ASC
  `).all()

  return ledgers.map(l => {
    const bal = l.current_balance_raw || 0
    const isSystemLedger = ['CASH', 'Purchase Account', 'Sales Account'].includes(l.ledger_name)
    const hasTransactions = l.pb_count > 0 || l.tr_count > 0
    return {
      ...l,
      current_balance: Math.abs(bal),
      current_balance_type: bal >= 0 ? 'Dr' : 'Cr',
      is_deletable: !isSystemLedger && !hasTransactions
    }
  })
}

function addLedger(data) {
  return getDB().prepare(`
    INSERT INTO ledgers (
      ledger_name, station, account_group, balancing_method, opening_balance, dr_cr,
      mail_to, address, pin_code, email, website, contact_person, designation,
      phone_office, phone_res, mobile, fax, dl_no, dl_expiry, gst_heading, gstin, pan_no,
      ledger_category, state, country, ledger_type
    ) VALUES (
      @ledger_name, @station, @account_group, @balancing_method, @opening_balance, @dr_cr,
      @mail_to, @address, @pin_code, @email, @website, @contact_person, @designation,
      @phone_office, @phone_res, @mobile, @fax, @dl_no, @dl_expiry, @gst_heading, @gstin, @pan_no,
      @ledger_category, @state, @country, @ledger_type
    )
  `).run(data)
}

function updateLedger(data) {
  const stmt = getDB().prepare(`
    UPDATE ledgers SET
      ledger_name=@ledger_name, station=@station, account_group=@account_group,
      balancing_method=@balancing_method, opening_balance=@opening_balance, dr_cr=@dr_cr,
      mail_to=@mail_to, address=@address, pin_code=@pin_code, email=@email, website=@website,
      contact_person=@contact_person, designation=@designation, phone_office=@phone_office,
      phone_res=@phone_res, mobile=@mobile, fax=@fax, dl_no=@dl_no, dl_expiry=@dl_expiry,
      gst_heading=@gst_heading, gstin=@gstin, pan_no=@pan_no, ledger_category=@ledger_category,
      state=@state, country=@country, ledger_type=@ledger_type
    WHERE id=@id
  `)
  return stmt.run(data)
}

function deleteLedger(id) {
  const db = getDB()
  
  // Safety Check: Check if ledger is used in purchase bills
  const purchaseCount = db.prepare('SELECT COUNT(*) as count FROM purchase_bills WHERE supplier_id = ?').get(id).count
  if (purchaseCount > 0) {
    throw new Error('Cannot delete: This ledger is associated with existing purchase bills.')
  }
  
  // Safety Check: Check if ledger is used in transactions
  const transCount = db.prepare('SELECT COUNT(*) as count FROM transactions WHERE ledger_id = ?').get(id).count
  if (transCount > 0) {
    throw new Error('Cannot delete: This ledger is associated with existing transactions.')
  }

  // Safety Check: Check if ledger is used in wholesale bills
  const wholesaleCount = db.prepare('SELECT COUNT(*) as count FROM wholesale_bills WHERE ledger_id = ?').get(id).count
  if (wholesaleCount > 0) {
    throw new Error('Cannot delete: This ledger is associated with existing wholesale bills.')
  }

  // Safety Check: Check if ledger is used in issue slips
  const issueCount = db.prepare('SELECT COUNT(*) as count FROM issue_slips WHERE ledger_id = ?').get(id).count
  if (issueCount > 0) {
    throw new Error('Cannot delete: This ledger is associated with existing issue slips.')
  }

  return db.prepare(`DELETE FROM ledgers WHERE id=?`).run(id)
}

function addVoucher(data) {
  const db = getDB()
  const { date, voucher_type, debit_ledger_id, credit_ledger_id, amount, particulars } = data
  
  if (!debit_ledger_id || !credit_ledger_id || !amount || amount <= 0) {
    throw new Error('Invalid voucher data. Ensure Debit Account, Credit Account, and a valid Amount are provided.')
  }

  const insert = db.prepare(`
    INSERT INTO transactions (date, voucher_type, voucher_no, particulars, ledger_id, dr_amount, cr_amount)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)

  const prefix = voucher_type.substring(0, 3).toUpperCase()
  const voucher_no = `${prefix}-${Date.now().toString().slice(-6)}`

  const drLedger = db.prepare('SELECT ledger_name FROM ledgers WHERE id = ?').get(debit_ledger_id)
  const crLedger = db.prepare('SELECT ledger_name FROM ledgers WHERE id = ?').get(credit_ledger_id)

  const drParticulars = particulars ? `To ${crLedger.ledger_name} - ${particulars}` : `To ${crLedger.ledger_name}`
  const crParticulars = particulars ? `By ${drLedger.ledger_name} - ${particulars}` : `By ${drLedger.ledger_name}`

  db.transaction(() => {
    // 1. Debit Entry
    insert.run(date, voucher_type, voucher_no, drParticulars, debit_ledger_id, amount, 0)
    // 2. Credit Entry
    insert.run(date, voucher_type, voucher_no, crParticulars, credit_ledger_id, 0, amount)
  })()

  return { success: true, voucher_no }
}

// ─── HSN/SAC Master ───────────────────────────────────────
function getHsnSac() {
  return getDB().prepare(`SELECT * FROM master.hsn_sac_master ORDER BY hsn_code ASC`).all()
}

function addHsnSac(data) {
  return getDB().prepare(`
    INSERT INTO master.hsn_sac_master (hsn_code, short_name, sgst, cgst, igst, type, uqc, cess)
    VALUES (@hsn_code, @short_name, @sgst, @cgst, @igst, @type, @uqc, @cess)
  `).run(data)
}

function updateHsnSac(data) {
  const db = getDB()
  
  // Get old HSN code before updating
  const oldRecord = db.prepare('SELECT hsn_code FROM master.hsn_sac_master WHERE id = ?').get(data.id)
  
  const result = db.prepare(`
    UPDATE master.hsn_sac_master SET
      hsn_code=@hsn_code, short_name=@short_name, sgst=@sgst,
      cgst=@cgst, igst=@igst, type=@type, uqc=@uqc, cess=@cess
    WHERE id=@id
  `).run(data)

  // Cascade update to medicines
  if (oldRecord && oldRecord.hsn_code) {
    db.prepare(`
      UPDATE master.medicines 
      SET hsn_code = ?, gst_rate = ?
      WHERE hsn_code = ?
    `).run(data.hsn_code, data.igst || 0, oldRecord.hsn_code)
  }

  return result
}

function deleteHsnSac(id) {
  return getDB().prepare(`DELETE FROM master.hsn_sac_master WHERE id=?`).run(id)
}

// ─── Category Master ──────────────────────────────────────
function getCategories() {
  return getDB().prepare(`SELECT * FROM master.category_master ORDER BY name ASC`).all()
}

function addCategory(data) {
  return getDB().prepare(`INSERT INTO master.category_master (name) VALUES (@name)`).run(data)
}

function updateCategory(data) {
  const db = getDB()
  const oldRecord = db.prepare('SELECT name FROM master.category_master WHERE id = ?').get(data.id)
  
  const result = db.prepare(`UPDATE master.category_master SET name=@name WHERE id=@id`).run(data)

  // Cascade update to medicines
  if (oldRecord && oldRecord.name) {
    db.prepare(`
      UPDATE master.medicines 
      SET category = ? 
      WHERE category = ?
    `).run(data.name, oldRecord.name)
  }

  return result
}

function deleteCategory(id) {
  return getDB().prepare(`DELETE FROM master.category_master WHERE id=?`).run(id)
}

// ─── Power Master ─────────────────────────────────────────
function getPowers() {
  const db = getDB()
  return db.prepare(`SELECT * FROM master.power_master ORDER BY name ASC`).all()
}

function addPower(data) {
  return getDB().prepare(`INSERT INTO master.power_master (name) VALUES (@name)`).run(data)
}

function updatePower(data) {
  const db = getDB()
  const oldRecord = db.prepare('SELECT name FROM master.power_master WHERE id = ?').get(data.id)
  
  const result = db.prepare(`UPDATE master.power_master SET name=@name WHERE id=@id`).run(data)

  // Cascade update to medicines
  if (oldRecord && oldRecord.name) {
    db.prepare(`
      UPDATE master.medicines 
      SET potency = ? 
      WHERE potency = ?
    `).run(data.name, oldRecord.name)
  }

  return result
}

function deletePower(id) {
  return getDB().prepare(`DELETE FROM master.power_master WHERE id=?`).run(id)
}

// ─── Packing Master ───────────────────────────────────────
function getPackings() {
  return getDB().prepare(`SELECT * FROM master.packing_master ORDER BY name ASC`).all()
}

function addPacking(data) {
  return getDB().prepare(`INSERT INTO master.packing_master (name) VALUES (@name)`).run(data)
}

function updatePacking(data) {
  const db = getDB()
  const oldRecord = db.prepare('SELECT name FROM master.packing_master WHERE id = ?').get(data.id)
  
  const result = db.prepare(`UPDATE master.packing_master SET name=@name WHERE id=@id`).run(data)

  // Cascade update to medicines
  if (oldRecord && oldRecord.name) {
    db.prepare(`
      UPDATE master.medicines 
      SET unit = ? 
      WHERE unit = ?
    `).run(data.name, oldRecord.name)
  }

  return result
}

function deletePacking(id) {
  return getDB().prepare(`DELETE FROM master.packing_master WHERE id=?`).run(id)
}

// ─── Billing ─────────────────────────────────────────────
function createBill(data) {
  const { bill_number, customer_name, customer_phone, total_amount, discount, paid_amount, items } = data
  const db = getDB()

  const insertBill = db.transaction(() => {
    // Check stock availability BEFORE creating the bill (aggregate by medicine first)
    const requiredStock = {}
    for (const item of items) {
      requiredStock[item.medicine_id] = (requiredStock[item.medicine_id] || 0) + Number(item.quantity)
    }
    
    for (const medId in requiredStock) {
      const med = db.prepare(`SELECT name, stock_quantity FROM master.medicines WHERE id = ?`).get(medId)
      if (med && med.stock_quantity < requiredStock[medId]) {
        throw new Error(`Insufficient stock for "${med.name}". Available: ${med.stock_quantity}, Requested: ${requiredStock[medId]}`)
      }
    }

    // Check batch availability if batches are selected
    const requiredBatchStock = {}
    for (const item of items) {
      if (item.batch_id) {
        requiredBatchStock[item.batch_id] = (requiredBatchStock[item.batch_id] || 0) + Number(item.quantity)
      }
    }
    for (const batchId in requiredBatchStock) {
      const batch = db.prepare(`SELECT batch_no, quantity FROM master.stock_batches WHERE id = ?`).get(batchId)
      if (batch && batch.quantity < requiredBatchStock[batchId]) {
        throw new Error(`Insufficient stock in location/batch "${batch.batch_no}". Available: ${batch.quantity}, Requested: ${requiredBatchStock[batchId]}`)
      }
    }

    const bill = db.prepare(`
      INSERT INTO bills (bill_number, customer_name, customer_phone, total_amount, discount, paid_amount)
      VALUES (@bill_number, @customer_name, @customer_phone, @total_amount, @discount, @paid_amount)
    `).run({ bill_number, customer_name, customer_phone, total_amount, discount, paid_amount })

    const billId = bill.lastInsertRowid

    for (const item of items) {
      db.prepare(`
        INSERT INTO bill_items (bill_id, medicine_id, batch_id, quantity, unit_price, total_price, gst_rate)
        VALUES (@bill_id, @medicine_id, @batch_id, @quantity, @unit_price, @total_price, @gst_rate)
      `).run({ bill_id: billId, ...item, batch_id: item.batch_id || null })

      // Deduct stock automatically
      db.prepare(`
        UPDATE master.medicines SET stock_quantity = stock_quantity - ? WHERE id = ?
      `).run(item.quantity, item.medicine_id)

      if (item.batch_id) {
        db.prepare(`
          UPDATE master.stock_batches SET quantity = quantity - ? WHERE id = ?
        `).run(item.quantity, item.batch_id)
      }
    }

    // Add CASH transaction
    const cashLedger = db.prepare(`SELECT id FROM ledgers WHERE ledger_name = 'CASH' AND account_group = 'CASH IN HAND'`).get()
    if (cashLedger && total_amount > 0) {
      db.prepare(`
        INSERT INTO transactions (date, ledger_id, voucher_type, voucher_no, particulars, dr_amount, cr_amount)
        VALUES (DATE('now'), ?, 'Sale', ?, ?, ?, 0)
      `).run(cashLedger.id, bill_number, `Cash Sale to ${customer_name || 'Walk-in'}`, total_amount)
    }

    return billId
  })

  return insertBill()
}

function createPurchaseBill(data) {
  const { supplier_id, invoice_number, invoice_date, total_amount, discount, round_off, net_amount, items } = data
  const db = getDB()

  const insertBill = db.transaction(() => {
    // 1. Insert into purchase_bills
    const bill = db.prepare(`
      INSERT INTO purchase_bills (supplier_id, invoice_number, invoice_date, total_amount, discount, round_off, net_amount)
      VALUES (@supplier_id, @invoice_number, @invoice_date, @total_amount, @discount, @round_off, @net_amount)
    `).run({ supplier_id, invoice_number, invoice_date, total_amount, discount, round_off, net_amount })

    const billId = bill.lastInsertRowid

    // 2. Insert items and update stock
    for (const item of items) {
      db.prepare(`
        INSERT INTO purchase_bill_items (purchase_bill_id, medicine_id, batch_number, expiry_month, expiry_year, quantity, free_quantity, purchase_rate, mrp, discount_percent, gst_rate, total_price)
        VALUES (@purchase_bill_id, @medicine_id, @batch_number, @expiry_month, @expiry_year, @quantity, @free_quantity, @purchase_rate, @mrp, @discount_percent, @gst_rate, @total_price)
      `).run({ purchase_bill_id: billId, ...item })

      // Stock is updated manually via Stock Update page, not here.
      // Purchase price is also not updated here as per user request.
    }

    // 3. Update Ledger Transactions (Credit the Supplier)
    db.prepare(`
      INSERT INTO transactions (date, ledger_id, voucher_type, voucher_no, particulars, dr_amount, cr_amount)
      VALUES (?, ?, 'Purchase', ?, ?, 0, ?)
    `).run(invoice_date, supplier_id, invoice_number, `Purchase Bill ${invoice_number}`, net_amount)

    // Ensure "Purchase Account" Ledger exists
    let purchaseLedger = db.prepare(`SELECT id FROM ledgers WHERE ledger_name = 'Purchase Account'`).get()
    if (!purchaseLedger) {
      const res = db.prepare(`
        INSERT INTO ledgers (ledger_name, account_group, opening_balance, dr_cr, ledger_category, ledger_type)
        VALUES ('Purchase Account', 'PURCHASE ACCOUNTS', 0, 'Dr', 'OTHERS', 'UNREGISTERED')
      `).run()
      purchaseLedger = { id: res.lastInsertRowid }
    }

    // Debit the "Purchase Account"
    db.prepare(`
      INSERT INTO transactions (date, ledger_id, voucher_type, voucher_no, particulars, dr_amount, cr_amount)
      VALUES (?, ?, 'Purchase', ?, ?, ?, 0)
    `).run(invoice_date, purchaseLedger.id, invoice_number, `Purchase from Supplier`, net_amount)

    return billId
  })

  return insertBill()
}

function getPurchaseBills() {
  return getDB().prepare(`
    SELECT pb.*, l.ledger_name as supplier_name, (SELECT SUM(mrp * (quantity + free_quantity)) FROM purchase_bill_items WHERE purchase_bill_id = pb.id) as total_mrp FROM purchase_bills pb LEFT JOIN ledgers l ON pb.supplier_id = l.id
    ORDER BY pb.created_at DESC LIMIT 100
  `).all()
}

function getPurchaseBillById(id) {
  const db = getDB()
  const bill = db.prepare(`
    SELECT pb.*, l.ledger_name as supplier_name, (SELECT SUM(mrp * (quantity + free_quantity)) FROM purchase_bill_items WHERE purchase_bill_id = pb.id) as total_mrp FROM purchase_bills pb LEFT JOIN ledgers l ON pb.supplier_id = l.id
    WHERE pb.id = ?
  `).get(id)
  
  if (!bill) return null;

  const items = db.prepare(`
    SELECT pbi.*, m.name as medicine_name, m.company, m.potency, m.unit
    FROM purchase_bill_items pbi
    LEFT JOIN master.medicines m ON pbi.medicine_id = m.id
    WHERE pbi.purchase_bill_id = ?
  `).all(id)

  return { ...bill, items }
}

function getBills() {
  return getDB().prepare(`
    SELECT * FROM bills ORDER BY created_at DESC LIMIT 100
  `).all()
}

function searchRetailBillsPaginated({ search = '', page = 1, limit = 50 }) {
  const db = getDB()
  const offset = (page - 1) * limit
  let queryBase = ` FROM bills b `
  let params = []

  if (search.trim() !== '') {
    const terms = search.trim().split(/\s+/)
    const conditions = []
    for (const term of terms) {
      conditions.push(`(b.bill_number LIKE ? OR b.customer_name LIKE ?)`)
      params.push(`%${term}%`, `%${term}%`)
    }
    queryBase += ` WHERE ${conditions.join(' AND ')} `
  }

  const countRow = db.prepare(`SELECT COUNT(*) as total ${queryBase}`).get(...params)

  const data = db.prepare(`
    SELECT b.* ${queryBase}
    ORDER BY b.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset)

  return {
    bills: data,
    total: countRow.total,
    page,
    limit
  }
}

function getBillById(id) {
  const db = getDB()
  const bill = db.prepare(`SELECT * FROM bills WHERE id=?`).get(id)
  const items = db.prepare(`
    SELECT bi.*, m.name as medicine_name, m.company, m.potency, m.unit, 
           sb.batch_no, sb.godown, sb.location_type, sb.location_value
    FROM bill_items bi
    JOIN master.medicines m ON bi.medicine_id = m.id
    LEFT JOIN master.stock_batches sb ON bi.batch_id = sb.id
    WHERE bi.bill_id = ?
  `).all(id)
  return { ...bill, items }
}

// ─── Purchase Orders ──────────────────────────────────────
function createPurchaseOrder(data) {
  const { supplier_id, notes, items } = data
  const db = getDB()

  const total_amount = items.reduce((sum, i) => sum + (i.quantity_ordered * i.unit_price), 0)

  const insertOrder = db.transaction(() => {
    const order = db.prepare(`
      INSERT INTO purchase_orders (supplier_id, notes, total_amount)
      VALUES (@supplier_id, @notes, @total_amount)
    `).run({ supplier_id, notes, total_amount })

    const orderId = order.lastInsertRowid

    for (const item of items) {
      db.prepare(`
        INSERT INTO purchase_order_items (order_id, medicine_id, quantity_ordered, unit_price)
        VALUES (@order_id, @medicine_id, @quantity_ordered, @unit_price)
      `).run({ order_id: orderId, ...item })
    }

    return orderId
  })

  return insertOrder()
}

function getPurchaseOrders() {
  return getDB().prepare(`
    SELECT po.*, s.name as supplier_name
    FROM purchase_orders po
    LEFT JOIN master.suppliers s ON po.supplier_id = s.id
    ORDER BY po.ordered_at DESC
  `).all()
}

// ─── Reports & Alerts ─────────────────────────────────────
function getExpiryAlerts() {
  return getDB().prepare(`
    SELECT * FROM master.medicines
    WHERE expiry_date IS NOT NULL
    AND expiry_date <= date('now', '+60 days')
    ORDER BY expiry_date ASC
  `).all()
}

function getExpiringBatches(days = 30) {
  const db = getDB()
  return db.prepare(`
    SELECT 
      sb.*, 
      m.name as medicine_name,
      l.ledger_name as supplier_name
    FROM master.stock_batches sb
    JOIN master.medicines m ON sb.medicine_id = m.id
    LEFT JOIN purchase_bill_items pbi ON sb.medicine_id = pbi.medicine_id AND sb.batch_no = pbi.batch_number
    LEFT JOIN purchase_bills pb ON pbi.purchase_bill_id = pb.id
    LEFT JOIN ledgers l ON pb.supplier_id = l.id
    WHERE 
      sb.quantity > 0
      AND sb.expiry_year IS NOT NULL AND sb.expiry_year != ''
      AND sb.expiry_month IS NOT NULL AND sb.expiry_month != ''
      AND date(printf('%04d-%02d-01', CAST(sb.expiry_year AS INTEGER), CAST(sb.expiry_month AS INTEGER))) <= date('now', '+' || ? || ' days')
    GROUP BY sb.id
    ORDER BY CAST(sb.expiry_year AS INTEGER) ASC, CAST(sb.expiry_month AS INTEGER) ASC
  `).all(days)
}

function getSalesReport(range = '7') {
  return getDB().prepare(`
    SELECT 
      date as date,
      COUNT(*) as total_bills,
      SUM(revenue) as revenue,
      SUM(net_revenue) as net_revenue
    FROM (
      SELECT date(created_at) as date, total_amount as revenue, (total_amount - discount) as net_revenue 
      FROM bills 
      WHERE created_at >= date('now', '-' || ? || ' days')
      
      UNION ALL
      
      SELECT date(created_at) as date, total_amount as revenue, net_amount as net_revenue 
      FROM wholesale_bills 
      WHERE created_at >= date('now', '-' || ? || ' days')
    )
    GROUP BY date
    ORDER BY date ASC
  `).all(range, range)
}

function getGstSalesRegisterPaginated({ fromDate, toDate, search = '', page = 1, limit = 50 }) {
  const db = getDB();
  const offset = (page - 1) * limit;

  const fromDateFull = fromDate ? `${fromDate} 00:00:00` : null;
  const toDateFull = toDate ? `${toDate} 23:59:59` : null;

  let salesQuery = `
    SELECT b.bill_number, b.created_at, b.customer_name, 'SALE' as entry_type, 
           bi.quantity, bi.total_price as net_amount, bi.gst_rate
    FROM bill_items bi JOIN bills b ON bi.bill_id = b.id
    WHERE 1=1
  `;
  let returnQuery = `
    SELECT sr.return_number as bill_number, sr.created_at, sr.customer_name, 'CREDIT_NOTE' as entry_type,
           -(sri.quantity) as quantity, -(sri.total_price) as net_amount, sri.gst_rate
    FROM sales_return_items sri JOIN sales_returns sr ON sri.sales_return_id = sr.id
    WHERE 1=1
  `;
  let wholesaleQuery = `
    SELECT b.bill_number, b.created_at, l.ledger_name as customer_name, 'WHOLESALE' as entry_type,
           bi.quantity, bi.total_price as net_amount, (IFNULL(bi.cgst_rate, 0) + IFNULL(bi.sgst_rate, 0) + IFNULL(bi.igst_rate, 0)) as gst_rate
    FROM wholesale_bill_items bi JOIN wholesale_bills b ON bi.wholesale_bill_id = b.id LEFT JOIN ledgers l ON b.ledger_id = l.id
    WHERE 1=1
  `;

  const params = [];
  if (fromDateFull) {
    salesQuery += ` AND b.created_at >= ?`;
    returnQuery += ` AND sr.created_at >= ?`;
    wholesaleQuery += ` AND b.created_at >= ?`;
    params.push(fromDateFull);
  }
  if (toDateFull) {
    salesQuery += ` AND b.created_at <= ?`;
    returnQuery += ` AND sr.created_at <= ?`;
    wholesaleQuery += ` AND b.created_at <= ?`;
    params.push(toDateFull);
  }

  const fullItemsQuery = `SELECT * FROM (${salesQuery} UNION ALL ${returnQuery} UNION ALL ${wholesaleQuery})`;
  const allParams = [...params, ...params, ...params];

  // 1. Calculate Grand Totals
  const grandTotals = db.prepare(`
      SELECT 
          SUM(net_amount) as grandNet,
          SUM(net_amount / (1 + (gst_rate / 100.0))) as grandTaxable
      FROM (${fullItemsQuery})
  `).get(...allParams);
  
  const grandNet = grandTotals?.grandNet || 0;
  const grandTaxable = grandTotals?.grandTaxable || 0;
  const totalTax = grandNet - grandTaxable;
  const grandCgst = totalTax / 2;
  const grandSgst = totalTax / 2;
  const totals = { grandNet, grandTaxable, grandCgst, grandSgst, grandIgst: 0, totalTax };

  // 2. Pagination and Search
  let searchCond = '';
  const searchParams = [];
  if (search.trim()) {
      searchCond = ` WHERE (bill_number LIKE ? OR customer_name LIKE ?) `;
      searchParams.push(`%${search}%`, `%${search}%`);
  }

  const totalInvoices = db.prepare(`
      SELECT COUNT(*) as total FROM (
          SELECT DISTINCT bill_number, customer_name FROM (${fullItemsQuery})
      ) ${searchCond}
  `).get(...allParams, ...searchParams).total;

  const paginatedBills = db.prepare(`
      SELECT bill_number, created_at, customer_name, entry_type
      FROM (
          SELECT DISTINCT bill_number, created_at, customer_name, entry_type 
          FROM (${fullItemsQuery})
      ) ${searchCond}
      ORDER BY created_at ASC, bill_number ASC
      LIMIT ? OFFSET ?
  `).all(...allParams, ...searchParams, limit, offset);

  // Fetch aggregated rates for these paginated bills
  const invoices = [];
  if (paginatedBills.length > 0) {
      // Need a dynamic IN clause since SQLite limits parameters
      const billNumbers = paginatedBills.map(b => `'${b.bill_number}'`).join(',');
      const rates = db.prepare(`
          SELECT bill_number, gst_rate, SUM(quantity) as qty, SUM(net_amount) as net
          FROM (${fullItemsQuery})
          WHERE bill_number IN (${billNumbers})
          GROUP BY bill_number, gst_rate
      `).all(...allParams);

      paginatedBills.forEach(bill => {
          const billRates = rates.filter(r => r.bill_number === bill.bill_number);
          invoices.push({
              ...bill,
              rates: billRates
          });
      });
  }

  return { totals, invoices, total: totalInvoices, page, limit };
}

// ─── Issue Slips ──────────────────────────────────────────
function getNextIssueSlipNumber() {
  const db = getDB()
  const result = db.prepare(`SELECT issue_number FROM issue_slips ORDER BY id DESC LIMIT 1`).get()
  if (!result) return '1'
  const nextNum = parseInt(result.issue_number, 10) + 1
  return nextNum.toString()
}

function createIssueSlip(data) {
  const { ledger_id, issue_date, items } = data
  const db = getDB()
  
  const issue_number = getNextIssueSlipNumber()
  let total_items = items.length
  let total_qty = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)

  const insertIssueSlip = db.transaction(() => {
    // Check stock availability BEFORE creating the issue slip
    const requiredStock = {}
    const requiredBatchStock = {}
    for (const item of items) {
      if (item.medicine_id) {
        requiredStock[item.medicine_id] = (requiredStock[item.medicine_id] || 0) + Number(item.quantity)
      }
      if (item.batch_id) {
        requiredBatchStock[item.batch_id] = (requiredBatchStock[item.batch_id] || 0) + Number(item.quantity)
      }
    }
    
    for (const medId in requiredStock) {
      const med = db.prepare(`SELECT name, stock_quantity FROM master.medicines WHERE id = ?`).get(medId)
      if (med && med.stock_quantity < requiredStock[medId]) {
        throw new Error(`Insufficient stock for "${med.name}". Available: ${med.stock_quantity}, Requested: ${requiredStock[medId]}`)
      }
    }
    for (const batchId in requiredBatchStock) {
      const batch = db.prepare(`SELECT batch_no, quantity FROM master.stock_batches WHERE id = ?`).get(batchId)
      if (batch && batch.quantity < requiredBatchStock[batchId]) {
        throw new Error(`Insufficient stock in location/batch "${batch.batch_no}". Available: ${batch.quantity}, Requested: ${requiredBatchStock[batchId]}`)
      }
    }
    const res = db.prepare(`
      INSERT INTO issue_slips (issue_number, ledger_id, issue_date, total_items, total_qty)
      VALUES (?, ?, ?, ?, ?)
    `).run(issue_number, ledger_id, issue_date, total_items, total_qty)
    const issueId = res.lastInsertRowid

    for (const item of items) {
      db.prepare(`
        INSERT INTO issue_slip_items (issue_slip_id, medicine_id, batch_id, quantity, mrp, discount_rs)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(issueId, item.medicine_id, item.batch_id, item.quantity, item.mrp || 0, item.discount_rs || 0)

      // Deduct stock from master.stock_batches if batch_id exists
      if (item.batch_id) {
        db.prepare(`
          UPDATE master.stock_batches 
          SET quantity = quantity - ? 
          WHERE id = ?
        `).run(item.quantity, item.batch_id)
      }
      // Regardless, deduct from total medicine stock_quantity
      if (item.medicine_id) {
        db.prepare(`
          UPDATE master.medicines 
          SET stock_quantity = stock_quantity - ? 
          WHERE id = ?
        `).run(item.quantity, item.medicine_id)
      }
    }
    return issueId
  })

  return insertIssueSlip()
}

function getIssueSlips() {
  const db = getDB()
  return db.prepare(`
    SELECT i.*, l.ledger_name as party_name 
    FROM issue_slips i 
    LEFT JOIN ledgers l ON i.ledger_id = l.id 
    ORDER BY i.id DESC
  `).all()
}

function getIssueSlipById(id) {
  const db = getDB()
  const slip = db.prepare(`
    SELECT i.*, l.ledger_name as party_name
    FROM issue_slips i 
    LEFT JOIN ledgers l ON i.ledger_id = l.id 
    WHERE i.id = ?
  `).get(id)
  
  if (slip) {
    slip.items = db.prepare(`
      SELECT isi.*, m.name as medicine_name, m.company, m.potency, m.unit as packing, sb.batch_no as batch_number, sb.expiry_month, sb.expiry_year, sb.godown, sb.location_type, sb.location_value
      FROM issue_slip_items isi
      JOIN master.medicines m ON isi.medicine_id = m.id
      LEFT JOIN master.stock_batches sb ON isi.batch_id = sb.id
      WHERE isi.issue_slip_id = ?
    `).all(slip.id)
  }
  return slip
}

function getDashboardStats() {
  const db = getDB()

  const todaySales = db.prepare(`
    SELECT COUNT(*) as count, COALESCE(SUM(total_amount),0) as revenue
    FROM bills WHERE date(created_at, 'localtime') = date('now', 'localtime')
  `).get()

  const lowStock = db.prepare(`
    SELECT COUNT(*) as count FROM master.medicines 
    WHERE stock_quantity <= low_stock_threshold
    AND id IN (SELECT DISTINCT medicine_id FROM master.stock_batches)
  `).get()

  const expiryAlerts = db.prepare(`
    SELECT COUNT(*) as count FROM master.medicines
    WHERE expiry_date IS NOT NULL AND expiry_date <= date('now', '+60 days')
  `).get()

  const totalMedicines = db.prepare(`SELECT COUNT(*) as count FROM master.medicines`).get()

  const topMedicines = db.prepare(`
    SELECT m.name, m.potency, m.company, SUM(bi.quantity) as total_qty
    FROM bill_items bi
    JOIN master.medicines m ON bi.medicine_id = m.id
    GROUP BY bi.medicine_id
    ORDER BY total_qty DESC
    LIMIT 5
  `).all()

  const salesLast7Days = db.prepare(`
    SELECT date(created_at, 'localtime') as date, COALESCE(SUM(total_amount), 0) as revenue
    FROM bills 
    WHERE date(created_at, 'localtime') >= date('now', 'localtime', '-6 days')
    GROUP BY date(created_at, 'localtime')
    ORDER BY date(created_at, 'localtime') ASC
  `).all()

  const expiringNextMonth = db.prepare(`
    SELECT m.name, m.potency, sb.batch_no as batch_number, 
           printf('%04d-%02d-01', CAST(sb.expiry_year AS INTEGER), CAST(sb.expiry_month AS INTEGER)) as expiry_date, 
           sb.quantity as stock_quantity
    FROM master.stock_batches sb
    JOIN master.medicines m ON sb.medicine_id = m.id
    WHERE sb.quantity > 0 
      AND sb.expiry_year IS NOT NULL AND sb.expiry_year != ''
      AND sb.expiry_month IS NOT NULL AND sb.expiry_month != ''
      AND date(printf('%04d-%02d-01', CAST(sb.expiry_year AS INTEGER), CAST(sb.expiry_month AS INTEGER))) <= date('now', '+30 days')
    ORDER BY CAST(sb.expiry_year AS INTEGER) ASC, CAST(sb.expiry_month AS INTEGER) ASC
  `).all()

  return { todaySales, lowStock, expiryAlerts, totalMedicines, topMedicines, salesLast7Days, expiringNextMonth }
}

// ─── Godown Master ────────────────────────────────────────
function getGodowns() {
  const db = getDB()
  const rows = db.prepare(`SELECT * FROM master.godown_master ORDER BY name ASC`).all()
  // Seed default G1 if empty
  if (rows.length === 0) {
    db.prepare(`INSERT INTO master.godown_master (name, description) VALUES ('G1', 'Main Godown')`).run()
    return db.prepare(`SELECT * FROM master.godown_master ORDER BY name ASC`).all()
  }
  return rows
}

function addGodown(data) {
  return getDB().prepare(`INSERT INTO master.godown_master (name, description) VALUES (@name, @description)`).run(data)
}

function deleteGodown(id) {
  return getDB().prepare(`DELETE FROM master.godown_master WHERE id=?`).run(id)
}

// ─── Stock Batches ────────────────────────────────────────
function addStockBatch(data) {
  const db = getDB()
  const insert = db.transaction(() => {
    // Check if there's a negative stock deficit to absorb
    const medicine = db.prepare(`SELECT stock_quantity FROM master.medicines WHERE id = @medicine_id`).get(data)
    let batchQtyToInsert = Number(data.quantity)
    if (medicine && medicine.stock_quantity < 0) {
      batchQtyToInsert = Math.max(0, batchQtyToInsert + medicine.stock_quantity)
    }

    // Insert the batch record
    const result = db.prepare(`
      INSERT INTO master.stock_batches 
      (medicine_id, company, batch_no, quantity, mrp, dis_percent, expiry_month, expiry_year, godown, location_type, location_value)
      VALUES (@medicine_id, @company, @batch_no, @batchQtyToInsert, @mrp, @dis_percent, @expiry_month, @expiry_year, @godown, @location_type, @location_value)
    `).run({ ...data, batchQtyToInsert })

    // Sync: increment the medicines.stock_quantity
    db.prepare(`UPDATE master.medicines SET stock_quantity = stock_quantity + @quantity WHERE id = @medicine_id`).run(data)

    // Sync MRP to selling_price (FIFO Logic)
    // Set selling price to the MRP of the oldest available batch
    const oldestBatch = db.prepare(`
      SELECT mrp FROM master.stock_batches 
      WHERE medicine_id = @medicine_id AND quantity > 0
      ORDER BY id ASC LIMIT 1
    `).get(data)

    const newSellingPrice = oldestBatch && oldestBatch.mrp ? oldestBatch.mrp : data.mrp

    if (newSellingPrice) {
      db.prepare(`UPDATE master.medicines SET selling_price = ? WHERE id = ?`).run(newSellingPrice, data.medicine_id)
    }

    return result
  })
  return insert()
}

function getStockBatches(medicineId) {
  return getDB().prepare(`
    SELECT sb.*, m.name as medicine_name, m.category, m.potency, m.unit
    FROM master.stock_batches sb
    JOIN master.medicines m ON sb.medicine_id = m.id
    WHERE sb.medicine_id = ? AND sb.quantity > 0
    ORDER BY sb.created_at DESC
  `).all(medicineId)
}

function getAllStockBatches() {
  return getDB().prepare(`
    SELECT sb.*, m.name as medicine_name, m.category, m.potency, m.unit, m.purchase_price
    FROM master.stock_batches sb
    JOIN master.medicines m ON sb.medicine_id = m.id
    WHERE sb.quantity > 0
    ORDER BY sb.created_at DESC
  `).all()
}

function updateStockBatch(data) {
  const db = getDB()
  const update = db.transaction(() => {
    // Get the old quantity to calculate diff
    const old = db.prepare(`SELECT quantity, medicine_id FROM master.stock_batches WHERE id = ?`).get(data.id)
    if (!old) throw new Error('Stock batch not found')

    const diff = Number(data.quantity) - Number(old.quantity)

    // Update the batch record
    db.prepare(`
      UPDATE master.stock_batches SET
        batch_no=@batch_no, quantity=@quantity, mrp=@mrp, dis_percent=@dis_percent,
        expiry_month=@expiry_month, expiry_year=@expiry_year, godown=@godown,
        location_type=@location_type, location_value=@location_value
      WHERE id=@id
    `).run(data)

    // Sync: adjust the medicines.stock_quantity by the diff
    db.prepare(`UPDATE master.medicines SET stock_quantity = stock_quantity + ? WHERE id = ?`).run(diff, old.medicine_id)
  })
  return update()
}

function deleteStockBatch(id) {
  const db = getDB()
  const remove = db.transaction(() => {
    // Get the quantity before deleting
    const batch = db.prepare(`SELECT quantity, medicine_id FROM master.stock_batches WHERE id = ?`).get(id)
    if (!batch) throw new Error('Stock batch not found')

    // Delete the batch
    db.prepare(`DELETE FROM master.stock_batches WHERE id = ?`).run(id)

    // Sync: decrement the medicines.stock_quantity
    db.prepare(`UPDATE master.medicines SET stock_quantity = stock_quantity - ? WHERE id = ?`).run(batch.quantity, batch.medicine_id)
  })
  return remove()
}

function resetAllStock() {
  return getDB().prepare(`UPDATE master.medicines SET stock_quantity = 0`).run()
}

function getStoreProfile() {
  const db = getDB()
  let profile = db.prepare('SELECT * FROM master.store_profile ORDER BY id ASC LIMIT 1').get()
  if (!profile) {
    db.prepare(`
      INSERT INTO master.store_profile (store_name, address_line1, address_line2, address_line3, phone, email, gstin, dl_no)
      VALUES (
        'HOMOEOSTORE', 
        'Budha Bazar, Near Nangloi', 
        'New Delhi', 
        'Delhi - 110041', 
        '9876543210', 
        'info@homoeostore.com', 
        '07AACCR1234F1Z5', 
        'DL-12345/W'
      )
    `).run()
    profile = db.prepare('SELECT * FROM master.store_profile ORDER BY id ASC LIMIT 1').get()
  }
  return profile
}

function verifyAdminPin(pin) {
  const profile = getStoreProfile()
  if (!profile.admin_pin) return { success: true, message: 'No PIN set' } // If no PIN is set, allow access
  return { success: profile.admin_pin === pin }
}

function updateAdminPin(pin) {
  const db = getDB()
  const result = db.prepare(`UPDATE master.store_profile SET admin_pin = ? WHERE id = (SELECT MIN(id) FROM master.store_profile)`).run(pin)
  return { success: result.changes > 0 }
}

function verifyCashierPin(pin) {
  let cashierPin = getSetting('cashier_pin')
  if (!cashierPin) cashierPin = '1234' // Default pin
  
  if (cashierPin === pin) return { success: true }
  return { success: false, message: 'Incorrect Cashier PIN' }
}

function updateCashierPin(pin) {
  setSetting('cashier_pin', pin)
  return { success: true }
}

function getLedgerStatement(ledger_id, fromDate, toDate) {
  const db = getDB()
  
  const ledger = db.prepare(`SELECT * FROM ledgers WHERE id = ?`).get(ledger_id)
  if (!ledger) throw new Error('Ledger not found')

  let runningBal = ledger.dr_cr === 'Dr' ? ledger.opening_balance : -ledger.opening_balance

  if (fromDate) {
    const priorTx = db.prepare(`
      SELECT SUM(dr_amount) as total_dr, SUM(cr_amount) as total_cr 
      FROM transactions 
      WHERE ledger_id = ? AND date < ?
    `).get(ledger_id, fromDate)

    if (priorTx) {
      runningBal += (priorTx.total_dr || 0) - (priorTx.total_cr || 0)
    }
  }

  const openingBalSnapshot = runningBal

  let query = `SELECT * FROM transactions WHERE ledger_id = ?`
  const params = [ledger_id]

  if (fromDate) { query += ` AND date >= ?`; params.push(fromDate) }
  if (toDate) { query += ` AND date <= ?`; params.push(toDate) }
  query += ` ORDER BY date ASC, id ASC`

  const transactions = db.prepare(query).all(...params)

  const statement = transactions.map(tx => {
    runningBal += tx.dr_amount - tx.cr_amount
    const balType = runningBal >= 0 ? 'Dr' : 'Cr'
    return {
      ...tx,
      running_balance: Math.abs(runningBal),
      running_balance_type: balType
    }
  })

  return {
    ledger,
    opening_balance: Math.abs(openingBalSnapshot),
    opening_balance_type: openingBalSnapshot >= 0 ? 'Dr' : 'Cr',
    closing_balance: Math.abs(runningBal),
    closing_balance_type: runningBal >= 0 ? 'Dr' : 'Cr',
    transactions: statement
  }
}

function updateStoreProfile(data) {
  const db = getDB()
  const profile = getStoreProfile()
  return db.prepare(`
    UPDATE master.store_profile SET
      store_name = @store_name,
      address_line1 = @address_line1,
      address_line2 = @address_line2,
      address_line3 = @address_line3,
      phone = @phone,
      email = @email,
      gstin = @gstin,
      dl_no = @dl_no,
      dl_expiry = @dl_expiry,
      mfg_lic_no = @mfg_lic_no,
      bank_name = @bank_name,
      account_number = @account_number,
      ifsc_code = @ifsc_code,
      qr_code = @qr_code
    WHERE id = ?
  `).run(data, profile.id)
}


// ─── Returns Management ──────────────────────────────────
function getSalesBillForReturn(bill_number) {
  const db = getDB()
  let searchVal = String(bill_number || '').trim()
  let isNum = /^\d+$/.test(searchVal)
  let padded = isNum ? searchVal.padStart(4, '0') : searchVal

  const bill = db.prepare(`
    SELECT * FROM bills 
    WHERE bill_number = ? 
       OR bill_number LIKE ? 
       OR bill_number LIKE ? 
    ORDER BY created_at DESC LIMIT 1
  `).get(searchVal, `%/${searchVal}`, `%/${padded}`)
  
  if (!bill) return null
  const items = db.prepare(`
    SELECT bi.*, m.name as medicine_name, m.company, m.potency, m.unit,
           sb.batch_no, sb.expiry_month, sb.expiry_year, sb.godown, sb.location_value as rack
    FROM bill_items bi
    JOIN master.medicines m ON bi.medicine_id = m.id
    LEFT JOIN master.stock_batches sb ON bi.batch_id = sb.id
    WHERE bi.bill_id = ?
  `).all(bill.id)
  const returnedItems = db.prepare(`
    SELECT sri.medicine_id, sri.batch_id, SUM(sri.quantity) as returned_qty
    FROM sales_return_items sri
    JOIN sales_returns sr ON sri.sales_return_id = sr.id
    WHERE sr.bill_number = ?
    GROUP BY sri.medicine_id, sri.batch_id
  `).all(bill.bill_number)

  items.forEach(item => {
    const returned = returnedItems.find(r => r.medicine_id === item.medicine_id && r.batch_id === item.batch_id)
    if (returned) {
      item.quantity -= returned.returned_qty
    }
  })

  const remainingItems = items.filter(item => item.quantity > 0)
  if (remainingItems.length === 0) {
    throw new Error('This bill has already been fully returned.')
  }

  return { ...bill, items: remainingItems }
}

function getPurchaseBillForReturn(invoice_number) {
  const db = getDB()
  let searchVal = String(invoice_number || '').trim()
  let isNum = /^\d+$/.test(searchVal)
  let padded = isNum ? searchVal.padStart(4, '0') : searchVal

  const bill = db.prepare(`
    SELECT pb.*, l.ledger_name as supplier_name 
    FROM purchase_bills pb 
    JOIN ledgers l ON pb.supplier_id = l.id
    WHERE pb.invoice_number = ? 
       OR pb.invoice_number LIKE ?
       OR pb.invoice_number LIKE ?
       OR pb.invoice_number LIKE ?
       OR pb.invoice_number LIKE ?
    ORDER BY pb.created_at DESC LIMIT 1
  `).get(searchVal, `%/${searchVal}`, `%/${padded}`, `%-${searchVal}`, `%-${padded}`)
  
  if (!bill) return null
  const items = db.prepare(`
    SELECT pbi.*, m.name as medicine_name, m.company, m.potency, m.unit
    FROM purchase_bill_items pbi
    JOIN master.medicines m ON pbi.medicine_id = m.id
    WHERE pbi.purchase_bill_id = ?
  `).all(bill.id)
  const returnedItems = db.prepare(`
    SELECT pri.medicine_id, pri.batch_id, SUM(pri.quantity) as returned_qty
    FROM purchase_return_items pri
    JOIN purchase_returns pr ON pri.purchase_return_id = pr.id
    WHERE pr.invoice_number = ?
    GROUP BY pri.medicine_id, pri.batch_id
  `).all(bill.invoice_number)

  items.forEach(item => {
    const returned = returnedItems.find(r => r.medicine_id === item.medicine_id && r.batch_id === item.batch_id)
    if (returned) {
      item.quantity -= returned.returned_qty
    }
    
    // Fetch current available stock for this item
    if (item.batch_id) {
        const batchRow = db.prepare('SELECT quantity FROM master.stock_batches WHERE id = ?').get(item.batch_id)
        item.available_stock = batchRow ? batchRow.quantity : 0
    } else {
        const medRow = db.prepare('SELECT stock_quantity FROM master.medicines WHERE id = ?').get(item.medicine_id)
        item.available_stock = medRow ? medRow.stock_quantity : 0
    }
  })

  const remainingItems = items.filter(item => item.quantity > 0)
  if (remainingItems.length === 0) {
    throw new Error('This invoice has already been fully returned.')
  }

  return { ...bill, items: remainingItems }
}

function createSalesReturn(data) {
  const { return_number, bill_number, customer_name, customer_phone, total_amount, reason, stock_action, new_location, items } = data
  const db = getDB()
  const cashLedger = db.prepare("SELECT id FROM ledgers WHERE ledger_name = 'CASH'").get()
  
  const tx = db.transaction(() => {
    const insertRes = db.prepare(`
      INSERT INTO sales_returns (return_number, bill_number, customer_name, customer_phone, total_amount, reason)
      VALUES (@return_number, @bill_number, @customer_name, @customer_phone, @total_amount, @reason)
    `).run({ return_number, bill_number, customer_name, customer_phone, total_amount, reason })
    
    const returnId = insertRes.lastInsertRowid
    
    for (const item of items) {
      db.prepare(`
        INSERT INTO sales_return_items (sales_return_id, medicine_id, batch_id, quantity, unit_price, total_price, gst_rate)
        VALUES (@return_id, @medicine_id, @batch_id, @quantity, @unit_price, @total_price, @gst_rate)
      `).run({ return_id: returnId, ...item })
      
      // Stock Actions
      if (stock_action === 'original') {
        db.prepare('UPDATE master.medicines SET stock_quantity = stock_quantity + ? WHERE id = ?').run(item.quantity, item.medicine_id)
        if (item.batch_id) {
          db.prepare('UPDATE master.stock_batches SET quantity = quantity + ? WHERE id = ?').run(item.quantity, item.batch_id)
        }
      } else if (stock_action === 'new') {
        db.prepare('UPDATE master.medicines SET stock_quantity = stock_quantity + ? WHERE id = ?').run(item.quantity, item.medicine_id)
        let origBatch = item.batch_id ? db.prepare('SELECT * FROM master.stock_batches WHERE id = ?').get(item.batch_id) : null;
        db.prepare(`
          INSERT INTO master.stock_batches (medicine_id, company, batch_no, quantity, mrp, expiry_month, expiry_year, godown, location_type, location_value)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'BOX', ?)
        `).run(
          item.medicine_id,
          origBatch ? origBatch.company : '',
          origBatch ? origBatch.batch_no : '',
          item.quantity,
          origBatch ? origBatch.mrp : 0,
          origBatch ? origBatch.expiry_month : null,
          origBatch ? origBatch.expiry_year : null,
          new_location ? new_location.godown : 'G1',
          new_location ? new_location.box : ''
        )
      }
      // If stock_action === 'none' (or undefined for backward compatibility where we might want to do 'none'), we do nothing.
      // Wait, earlier the default behavior was adding it back. I should fallback to 'original' if stock_action is completely missing, 
      // just in case an old client sends a request without it.
      else if (!stock_action) {
        db.prepare('UPDATE master.medicines SET stock_quantity = stock_quantity + ? WHERE id = ?').run(item.quantity, item.medicine_id)
        if (item.batch_id) {
          db.prepare('UPDATE master.stock_batches SET quantity = quantity + ? WHERE id = ?').run(item.quantity, item.batch_id)
        }
      }
    }
    
    // Ledger entry for Sales Return
    db.prepare(`
      INSERT INTO transactions (date, ledger_id, voucher_type, voucher_no, particulars, dr_amount, cr_amount)
      VALUES (DATE('now', 'localtime'), @ledger_id, 'Sales Return', @return_number, @particulars, 0, @amount)
    `).run({ 
      ledger_id: cashLedger ? cashLedger.id : 1, 
      return_number, 
      particulars: `Sales Return for Bill ${bill_number || 'N/A'} - ${reason || ''}`, 
      amount: total_amount 
    })
    
    return returnId
  })
  
  return tx()
}

function createPurchaseReturn(data) {
  const { return_number, supplier_id, invoice_number, total_amount, reason, items } = data
  const db = getDB()
  
  const tx = db.transaction(() => {
    const insertRes = db.prepare(`
      INSERT INTO purchase_returns (return_number, supplier_id, invoice_number, return_date, total_amount, reason)
      VALUES (@return_number, @supplier_id, @invoice_number, DATE('now', 'localtime'), @total_amount, @reason)
    `).run({ return_number, supplier_id, invoice_number, total_amount, reason })
    
    const returnId = insertRes.lastInsertRowid
    
    for (const item of items) {
      db.prepare(`
        INSERT INTO purchase_return_items (purchase_return_id, medicine_id, batch_number, batch_id, quantity, purchase_rate, gst_rate, total_price)
        VALUES (@return_id, @medicine_id, @batch_number, @batch_id, @quantity, @purchase_rate, @gst_rate, @total_price)
      `).run({ return_id: returnId, ...item })
      
      // Deduct stock
      db.prepare('UPDATE master.medicines SET stock_quantity = stock_quantity - ? WHERE id = ?').run(item.quantity, item.medicine_id)
      if (item.batch_id) {
        db.prepare('UPDATE master.stock_batches SET quantity = quantity - ? WHERE id = ?').run(item.quantity, item.batch_id)
      } else if (item.batch_number) {
        db.prepare('UPDATE master.stock_batches SET quantity = quantity - ? WHERE medicine_id = ? AND batch_no = ?').run(item.quantity, item.medicine_id, item.batch_number)
      }
    }
    
    // Ledger entry for Purchase Return
    db.prepare(`
      INSERT INTO transactions (date, ledger_id, voucher_type, voucher_no, particulars, dr_amount, cr_amount)
      VALUES (DATE('now', 'localtime'), @ledger_id, 'Purchase Return', @return_number, @particulars, @amount, 0)
    `).run({ 
      ledger_id: supplier_id, 
      return_number, 
      particulars: `Purchase Return for Inv ${invoice_number || 'N/A'} - ${reason || ''}`, 
      amount: total_amount 
    })
    
    return returnId
  })
  
  return tx()
}

function getSalesReturns() {
  return getDB().prepare(`
    SELECT * FROM sales_returns ORDER BY created_at DESC, id DESC LIMIT 100
  `).all()
}

function getPurchaseReturns() {
  const db = getDB()
  return db.prepare(`
    SELECT pr.*, l.ledger_name as supplier_name,
           json_group_array(json_object(
             'medicine_name', m.name,
             'quantity', pri.quantity,
             'total_price', pri.total_price
           )) as items
    FROM purchase_returns pr
    JOIN purchase_return_items pri ON pr.id = pri.purchase_return_id
    JOIN master.medicines m ON pri.medicine_id = m.id
    JOIN ledgers l ON pr.supplier_id = l.id
    GROUP BY pr.id
    ORDER BY pr.created_at DESC
  `).all().map(r => ({...r, items: JSON.parse(r.items)}))
}

function getWholesaleBillForReturn(bill_number) {
  const db = getDB()
  let searchVal = String(bill_number || '').trim()
  let isNum = /^\d+$/.test(searchVal)
  let padded = isNum ? searchVal.padStart(4, '0') : searchVal

  const bill = db.prepare(`
    SELECT * FROM wholesale_bills 
    WHERE bill_number = ? 
       OR bill_number LIKE ? 
       OR bill_number LIKE ? 
    ORDER BY created_at DESC LIMIT 1
  `).get(searchVal, `%/${searchVal}`, `%/${padded}`)
  
  if (!bill) return null
  const items = db.prepare(`
    SELECT bi.*, m.name as medicine_name, m.company, m.potency, m.unit,
           sb.batch_no, sb.expiry_month, sb.expiry_year, sb.godown, sb.location_value as rack
    FROM wholesale_bill_items bi
    JOIN master.medicines m ON bi.medicine_id = m.id
    LEFT JOIN master.stock_batches sb ON bi.batch_id = sb.id
    WHERE bi.wholesale_bill_id = ?
  `).all(bill.id)
  
  bill.items = items
  return bill
}

function createWholesaleReturn(data) {
  const db = getDB()
  const { return_number, ledger_id, bill_number, total_amount, reason, items, stock_action, new_location } = data
  
  const insertRes = db.prepare(`
    INSERT INTO wholesale_returns (return_number, ledger_id, bill_number, return_date, total_amount, reason)
    VALUES (@return_number, @ledger_id, @bill_number, DATE('now', 'localtime'), @total_amount, @reason)
  `).run({ return_number, ledger_id, bill_number, total_amount, reason })
  
  const returnId = insertRes.lastInsertRowid
  
  for (const item of items) {
    db.prepare(`
      INSERT INTO wholesale_return_items (wholesale_return_id, medicine_id, batch_id, quantity, unit_price, total_price, gst_rate)
      VALUES (@return_id, @medicine_id, @batch_id, @quantity, @unit_price, @total_price, @gst_rate)
    `).run({ return_id: returnId, ...item, gst_rate: (item.cgst_rate || 0) + (item.sgst_rate || 0) + (item.igst_rate || 0) })
    
    // Stock Actions
    if (stock_action === 'original') {
      db.prepare('UPDATE master.medicines SET stock_quantity = stock_quantity + ? WHERE id = ?').run(item.quantity, item.medicine_id)
      if (item.batch_id) {
        db.prepare('UPDATE master.stock_batches SET quantity = quantity + ? WHERE id = ?').run(item.quantity, item.batch_id)
      }
    } else if (stock_action === 'new') {
      db.prepare('UPDATE master.medicines SET stock_quantity = stock_quantity + ? WHERE id = ?').run(item.quantity, item.medicine_id)
      let origBatch = item.batch_id ? db.prepare('SELECT * FROM master.stock_batches WHERE id = ?').get(item.batch_id) : null;
      db.prepare(`
        INSERT INTO master.stock_batches (medicine_id, company, batch_no, quantity, mrp, expiry_month, expiry_year, godown, location_type, location_value)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'BOX', ?)
      `).run(
        item.medicine_id,
        origBatch ? origBatch.company : '',
        origBatch ? origBatch.batch_no : '',
        item.quantity,
        origBatch ? origBatch.mrp : 0,
        origBatch ? origBatch.expiry_month : null,
        origBatch ? origBatch.expiry_year : null,
        new_location ? new_location.godown : 'G1',
        new_location ? new_location.box : ''
      )
    } else if (!stock_action) {
      db.prepare('UPDATE master.medicines SET stock_quantity = stock_quantity + ? WHERE id = ?').run(item.quantity, item.medicine_id)
      if (item.batch_id) {
        db.prepare('UPDATE master.stock_batches SET quantity = quantity + ? WHERE id = ?').run(item.quantity, item.batch_id)
      }
    }
  }

  // Generate transaction (Credit Customer since they returned items)
  db.prepare(`
    INSERT INTO transactions (date, ledger_id, voucher_type, voucher_no, particulars, dr_amount, cr_amount)
    VALUES (DATE('now', 'localtime'), ?, 'Sales Return', ?, ?, 0, ?)
  `).run(ledger_id, return_number, `Wholesale Return - ${reason || 'Returned'}`, total_amount)

  return returnId
}

function getWholesaleReturns() {
  const db = getDB()
  return db.prepare(`
    SELECT r.*, l.ledger_name as party_name,
           json_group_array(json_object(
             'medicine_name', m.name,
             'quantity', ri.quantity,
             'total_price', ri.total_price
           )) as items
    FROM wholesale_returns r
    JOIN wholesale_return_items ri ON r.id = ri.wholesale_return_id
    JOIN master.medicines m ON ri.medicine_id = m.id
    LEFT JOIN ledgers l ON r.ledger_id = l.id
    GROUP BY r.id
    ORDER BY r.created_at DESC
  `).all().map(r => ({...r, items: JSON.parse(r.items)}))
}

function getSetting(key) {
  const db = getDB()
  const row = db.prepare('SELECT value FROM master.settings WHERE key = ?').get(key)
  return row ? row.value : null
}

function setSetting(key, value) {
  const db = getDB()
  db.prepare('INSERT OR REPLACE INTO master.settings (key, value) VALUES (?, ?)').run(key, value)
  return true
}

function getProfitLossData() {
  const db = getDB()
  
  const ledgers = db.prepare(`
    SELECT 
      l.account_group,
      l.ledger_name,
      l.opening_balance,
      l.dr_cr,
      IFNULL(SUM(t.dr_amount), 0) as total_dr,
      IFNULL(SUM(t.cr_amount), 0) as total_cr
    FROM ledgers l
    LEFT JOIN transactions t ON l.id = t.ledger_id
    GROUP BY l.id
  `).all()

  let data = {
    openingStock: 0,
    purchases: 0,
    directExpenses: [],
    sales: 0,
    indirectExpenses: [],
    indirectIncomes: [],
    closingStock: 0,
    grossProfit: 0,
    netProfit: 0
  }

  for (const l of ledgers) {
    let openingDr = l.dr_cr === 'Dr' ? l.opening_balance : 0;
    let openingCr = l.dr_cr === 'Cr' ? l.opening_balance : 0;
    let netDebit = (openingDr - openingCr) + (l.total_dr - l.total_cr);
    
    let group = l.account_group ? l.account_group.toUpperCase() : '';
    
    if (group === 'PURCHASE ACCOUNTS') {
      data.purchases += netDebit;
    } else if (group === 'DIRECT EXPENSES') {
      data.directExpenses.push({ name: l.ledger_name, amount: netDebit });
    } else if (group === 'SALES ACCOUNTS') {
      data.sales += -netDebit; // Credit balance
    } else if (group === 'INDIRECT EXPENSES') {
      data.indirectExpenses.push({ name: l.ledger_name, amount: netDebit });
    } else if (group === 'INDIRECT INCOMES' || group === 'DIRECT INCOMES') {
      data.indirectIncomes.push({ name: l.ledger_name, amount: -netDebit }); // Credit balance
    }
  }

  const stockInfo = db.prepare(`SELECT SUM(stock_quantity * purchase_price) as total_val FROM master.medicines WHERE stock_quantity > 0`).get()
  data.closingStock = stockInfo?.total_val || 0;
  
  // Calculate Profits
  const totalDirectExpenses = data.directExpenses.reduce((sum, e) => sum + e.amount, 0);
  data.grossProfit = (data.sales + data.closingStock) - (data.openingStock + data.purchases + totalDirectExpenses);
  
  const totalIndirectExpenses = data.indirectExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalIndirectIncomes = data.indirectIncomes.reduce((sum, e) => sum + e.amount, 0);
  data.netProfit = data.grossProfit + totalIndirectIncomes - totalIndirectExpenses;

  return data
}

function getBalanceSheetData() {
  const db = getDB()
  
  const ledgers = db.prepare(`
    SELECT 
      l.account_group,
      l.opening_balance,
      l.dr_cr,
      IFNULL(SUM(t.dr_amount), 0) as total_dr,
      IFNULL(SUM(t.cr_amount), 0) as total_cr
    FROM ledgers l
    LEFT JOIN transactions t ON l.id = t.ledger_id
    GROUP BY l.id
  `).all()

  let data = {
    capital: 0,
    loans: 0,
    creditors: 0,
    duties_taxes: 0,
    fixed_assets: 0,
    debtors: 0,
    cash: 0,
    bank: 0,
    profit_loss: { opening: 0, current: 0 },
    closing_stock: 0
  }

  let totalIncome = 0;
  let totalExpenses = 0;

  for (const l of ledgers) {
    let openingDr = l.dr_cr === 'Dr' ? l.opening_balance : 0;
    let openingCr = l.dr_cr === 'Cr' ? l.opening_balance : 0;
    let netDebit = (openingDr - openingCr) + (l.total_dr - l.total_cr);
    
    let group = l.account_group ? l.account_group.toUpperCase() : '';
    
    if (group === 'CAPITAL ACCOUNT') data.capital += -netDebit;
    else if (['LOANS (LIABILITY)', 'SECURED LOANS', 'UNSECURED LOANS'].includes(group)) data.loans += -netDebit;
    else if (group === 'SUNDRY CREDITORS') data.creditors += -netDebit;
    else if (group === 'DUTIES & TAXES' || group === 'PROVISIONS') data.duties_taxes += -netDebit;
    else if (group === 'FIXED ASSETS') data.fixed_assets += netDebit;
    else if (group === 'SUNDRY DEBTORS') data.debtors += netDebit;
    else if (group === 'CASH IN HAND' || group === 'CASH-IN-HAND') data.cash += netDebit;
    else if (group === 'BANK ACCOUNTS') data.bank += netDebit;
    
    else if (['SALES ACCOUNTS', 'DIRECT INCOMES', 'INDIRECT INCOMES'].includes(group)) {
      totalIncome += -netDebit;
    }
    else if (['PURCHASE ACCOUNTS', 'DIRECT EXPENSES', 'INDIRECT EXPENSES'].includes(group)) {
      totalExpenses += netDebit;
    }
  }

  const stockInfo = db.prepare(`SELECT SUM(stock_quantity * purchase_price) as total_val FROM master.medicines WHERE stock_quantity > 0`).get()
  data.closing_stock = stockInfo?.total_val || 0;

  data.profit_loss.current = (totalIncome + data.closing_stock) - totalExpenses;

  return data
}

function getGstReturnsData(fromDate, toDate) {
  const db = getDB()

  let salesQuery = `
    SELECT 
      b.id as bill_id,
      bi.total_price,
      bi.gst_rate
    FROM bill_items bi
    JOIN bills b ON bi.bill_id = b.id
    WHERE 1=1
  `
  let salesReturnQuery = `
    SELECT 
      sr.id as return_id,
      sri.total_price,
      sri.gst_rate
    FROM sales_return_items sri
    JOIN sales_returns sr ON sri.sales_return_id = sr.id
    WHERE 1=1
  `
  let purQuery = `
    SELECT 
      pb.id as pb_id,
      pbi.total_price,
      pbi.gst_rate
    FROM purchase_bill_items pbi
    JOIN purchase_bills pb ON pbi.purchase_bill_id = pb.id
    WHERE 1=1
  `
  let purReturnQuery = `
    SELECT 
      pr.id as pr_id,
      pri.total_price,
      pri.gst_rate
    FROM purchase_return_items pri
    JOIN purchase_returns pr ON pri.purchase_return_id = pr.id
    WHERE 1=1
  `
  let wholesaleQuery = `
    SELECT 
      wb.id as bill_id,
      l.gstin,
      wbi.total_price,
      (IFNULL(wbi.cgst_rate, 0) + IFNULL(wbi.sgst_rate, 0) + IFNULL(wbi.igst_rate, 0)) as gst_rate
    FROM wholesale_bill_items wbi
    JOIN wholesale_bills wb ON wbi.wholesale_bill_id = wb.id
    LEFT JOIN ledgers l ON wb.ledger_id = l.id
    WHERE 1=1
  `

  const params = []
  if (fromDate) {
    salesQuery += ` AND date(b.created_at) >= date(?) `
    salesReturnQuery += ` AND date(sr.created_at) >= date(?) `
    purQuery += ` AND date(pb.created_at) >= date(?) `
    purReturnQuery += ` AND date(pr.return_date) >= date(?) `
    wholesaleQuery += ` AND date(wb.created_at) >= date(?) `
    params.push(fromDate)
  }
  if (toDate) {
    salesQuery += ` AND date(b.created_at) <= date(?) `
    salesReturnQuery += ` AND date(sr.created_at) <= date(?) `
    purQuery += ` AND date(pb.created_at) <= date(?) `
    purReturnQuery += ` AND date(pr.return_date) <= date(?) `
    wholesaleQuery += ` AND date(wb.created_at) <= date(?) `
    params.push(toDate)
  }

  const sales = db.prepare(salesQuery).all(...params)
  const salesRet = db.prepare(salesReturnQuery).all(...params)
  const purchases = db.prepare(purQuery).all(...params)
  const purRet = db.prepare(purReturnQuery).all(...params)
  const wholesale = db.prepare(wholesaleQuery).all(...params)

  let data = {
    outputTax: 0,
    itc: 0,
    netPayable: 0,
    gstr1: {
      b2b: { count: 0, taxable: 0, igst: 0, cgst: 0, sgst: 0, invoiceIds: new Set() },
      b2c: { count: 0, taxable: 0, igst: 0, cgst: 0, sgst: 0, invoiceIds: new Set() },
      nil: { count: 0, taxable: 0, igst: 0, cgst: 0, sgst: 0, invoiceIds: new Set() }
    }
  }

  const processSaleItem = (item, isReturn = false) => {
    let mul = isReturn ? -1 : 1;
    let inclusiveTotal = item.total_price * mul;
    let rate = item.gst_rate || 0;
    
    let taxable = (inclusiveTotal * 100) / (100 + rate);
    let taxAmt = inclusiveTotal - taxable;
    
    let cgst = taxAmt / 2;
    let sgst = taxAmt / 2;
    
    data.outputTax += taxAmt;

    let target = rate === 0 ? data.gstr1.nil : data.gstr1.b2c;
    if (item.gstin && item.gstin.trim() !== '') {
      target = data.gstr1.b2b;
    }
    
    target.taxable += taxable;
    target.cgst += cgst;
    target.sgst += sgst;
    
    if (!isReturn && item.bill_id) {
      if (item.gstin && item.gstin.trim() !== '') {
        data.gstr1.b2b.invoiceIds.add('wb_' + item.bill_id);
      } else if (rate === 0) {
        data.gstr1.nil.invoiceIds.add((item.gstin === undefined ? 'rb_' : 'wb_') + item.bill_id);
      } else {
        data.gstr1.b2c.invoiceIds.add((item.gstin === undefined ? 'rb_' : 'wb_') + item.bill_id);
      }
    }
  }

  sales.forEach(s => processSaleItem(s, false));
  salesRet.forEach(s => processSaleItem(s, true));
  wholesale.forEach(w => processSaleItem(w, false));

  const processPurchaseItem = (item, isReturn = false) => {
    let mul = isReturn ? -1 : 1;
    let inclusiveTotal = item.total_price * mul;
    let rate = item.gst_rate || 0;
    
    let taxable = (inclusiveTotal * 100) / (100 + rate);
    let taxAmt = inclusiveTotal - taxable;
    
    data.itc += taxAmt;
  }

  purchases.forEach(p => processPurchaseItem(p, false));
  purRet.forEach(p => processPurchaseItem(p, true));

  data.netPayable = data.outputTax - data.itc;

  data.gstr1.b2b.count = data.gstr1.b2b.invoiceIds.size;
  data.gstr1.b2c.count = data.gstr1.b2c.invoiceIds.size;
  data.gstr1.nil.count = data.gstr1.nil.invoiceIds.size;

  delete data.gstr1.b2b.invoiceIds;
  delete data.gstr1.b2c.invoiceIds;
  delete data.gstr1.nil.invoiceIds;

  return data;
}

function performBackup(backupPath) {
  const db = getDB()
  const fs = require('fs')
  const path = require('path')
  
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(backupPath, { recursive: true })
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const fileName = `homoeostore_backup_${timestamp}.db`
  const destPath = path.join(backupPath, fileName)

  // Use SQLite's VACUUM INTO to create a safe, single-file backup
  db.prepare(`VACUUM INTO '${destPath.replace(/'/g, "''")}'`).run()

  // Cleanup old backups (older than 30 days OR keep max 20 backups)
  const allFiles = fs.readdirSync(backupPath)
    .filter(f => f.startsWith('homoeostore_backup_') && f.endsWith('.db'))
    .map(f => path.join(backupPath, f))
  
  allFiles.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)

  const now = Date.now()
  const thirtyDays = 30 * 24 * 60 * 60 * 1000

  allFiles.forEach((file, index) => {
    const stats = fs.statSync(file)
    if (now - stats.mtimeMs > thirtyDays || index >= 10) {
      try { fs.unlinkSync(file) } catch(e) {}
    }
  })

  return destPath
}

// ─── Wholesale Bills ──────────────────────────────────────
function getNextWholesaleBillNumber() {
  const db = getDB()
  const currentYear = new Date().getFullYear()
  const prefix = `NHP/${currentYear}/WS/`

  const result = db.prepare(`SELECT bill_number FROM wholesale_bills WHERE bill_number LIKE ? ORDER BY id DESC LIMIT 1`).get(`${prefix}%`)
  if (!result) return `${prefix}0001`
  
  const parts = result.bill_number.split('/')
  const lastPart = parts[parts.length - 1]

  if (!isNaN(lastPart)) {
    const nextNum = parseInt(lastPart, 10) + 1
    return `${prefix}${nextNum.toString().padStart(4, '0')}`
  }
  return `${prefix}${Date.now().toString().slice(-4)}` // Fallback
}

function createWholesaleBill(data) {
  const { ledger_id, bill_number, bill_date, bill_type, challan_no, challan_date, order_no, order_date, gr_no, gr_date, reference, gst_acc, sale_register, send_through, documents_through, sale_destination, remark, medical_rep, eway_bill_no, eway_vehicle_no, eway_transporter, eway_transporter_id, eway_distance, total_amount, total_discount, round_off, net_amount, items } = data
  const db = getDB()

  const insertWholesaleBill = db.transaction(() => {
    // 1. Insert Wholesale Bill
    const billRes = db.prepare(`
      INSERT INTO wholesale_bills (
        bill_number, ledger_id, bill_date, bill_type, challan_no, challan_date, order_no, order_date, gr_no, gr_date, reference, gst_acc, sale_register, send_through, documents_through, sale_destination, remark, medical_rep, eway_bill_no, eway_vehicle_no, eway_transporter, eway_transporter_id, eway_distance, total_amount, total_discount, round_off, net_amount
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      bill_number, ledger_id, bill_date, bill_type, challan_no, challan_date, order_no, order_date, gr_no, gr_date, reference, gst_acc, sale_register, send_through, documents_through, sale_destination, remark, medical_rep, eway_bill_no, eway_vehicle_no, eway_transporter, eway_transporter_id, eway_distance, total_amount, total_discount, round_off, net_amount
    )
    const billId = billRes.lastInsertRowid

    // 2. Insert Items (No stock deduction for wholesale as requested)
    for (const item of items) {
      db.prepare(`
        INSERT INTO wholesale_bill_items (
          wholesale_bill_id, medicine_id, batch_id, hsn_code, quantity, free_quantity, unit_price, discount_percent, scheme_discount_percent, box, gross_total, cgst_rate, sgst_rate, igst_rate, total_price
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        billId, item.medicine_id, item.batch_id, item.hsn_code, item.quantity, item.free_quantity, item.unit_price, item.discount_percent, item.scheme_discount_percent, item.box, item.gross_total, item.cgst_rate, item.sgst_rate, item.igst_rate, item.total_price
      )
    }

    // 3. Ledger Transactions (Debit Customer)
    db.prepare(`
      INSERT INTO transactions (date, ledger_id, voucher_type, voucher_no, particulars, dr_amount, cr_amount)
      VALUES (?, ?, 'Sales', ?, ?, ?, 0)
    `).run(bill_date || new Date().toISOString(), ledger_id, bill_number, `Wholesale Bill ${bill_number}`, net_amount)

    // Ensure "Sales Account" Ledger exists
    let salesLedger = db.prepare(`SELECT id FROM ledgers WHERE ledger_name = 'Sales Account'`).get()
    if (!salesLedger) {
      const res = db.prepare(`
        INSERT INTO ledgers (ledger_name, account_group, opening_balance, dr_cr, ledger_category, ledger_type)
        VALUES ('Sales Account', 'SALES ACCOUNTS', 0, 'Cr', 'OTHERS', 'UNREGISTERED')
      `).run()
      salesLedger = { id: res.lastInsertRowid }
    }

    // Credit "Sales Account"
    db.prepare(`
      INSERT INTO transactions (date, ledger_id, voucher_type, voucher_no, particulars, dr_amount, cr_amount)
      VALUES (?, ?, 'Sales', ?, ?, 0, ?)
    `).run(bill_date || new Date().toISOString(), salesLedger.id, bill_number, `Sale to Customer`, net_amount)

    return billId
  })

  return insertWholesaleBill()
}

function updateWholesaleBill(billData) {
  const db = getDB()
  const { id, bill_number, ledger_id, bill_date, bill_type, challan_no, challan_date, order_no, order_date, gr_no, gr_date, reference, gst_acc, sale_register, send_through, documents_through, sale_destination, remark, medical_rep, eway_bill_no, eway_vehicle_no, eway_transporter, eway_transporter_id, eway_distance, items, total_amount, total_discount, round_off, net_amount } = billData

  const updateTx = db.transaction(() => {
    // 1. Update main bill
    db.prepare(`
      UPDATE wholesale_bills SET 
        bill_number=?, ledger_id=?, bill_date=?, bill_type=?, challan_no=?, challan_date=?, order_no=?, order_date=?, gr_no=?, gr_date=?, reference=?, gst_acc=?, sale_register=?, send_through=?, documents_through=?, sale_destination=?, remark=?, medical_rep=?, eway_bill_no=?, eway_vehicle_no=?, eway_transporter=?, eway_transporter_id=?, eway_distance=?, total_amount=?, total_discount=?, round_off=?, net_amount=?
      WHERE id=?
    `).run(
      bill_number, ledger_id, bill_date, bill_type, challan_no, challan_date, order_no, order_date, gr_no, gr_date, reference, gst_acc, sale_register, send_through, documents_through, sale_destination, remark, medical_rep, eway_bill_no, eway_vehicle_no, eway_transporter, eway_transporter_id, eway_distance, total_amount, total_discount, round_off, net_amount, id
    )

    // 2. Delete old items and insert new ones
    db.prepare(`DELETE FROM wholesale_bill_items WHERE wholesale_bill_id=?`).run(id)
    for (const item of items) {
      db.prepare(`
        INSERT INTO wholesale_bill_items (
          wholesale_bill_id, medicine_id, batch_id, hsn_code, quantity, free_quantity, unit_price, discount_percent, scheme_discount_percent, box, gross_total, cgst_rate, sgst_rate, igst_rate, total_price
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, item.medicine_id, item.batch_id, item.hsn_code, item.quantity, item.free_quantity, item.unit_price, item.discount_percent, item.scheme_discount_percent, item.box, item.gross_total, item.cgst_rate, item.sgst_rate, item.igst_rate, item.total_price
      )
    }

    // 3. Update Ledger Transactions
    // Delete old transactions for this bill
    db.prepare(`DELETE FROM transactions WHERE voucher_type='Sales' AND voucher_no=?`).run(bill_number)

    // Re-insert transactions (Debit Customer)
    db.prepare(`
      INSERT INTO transactions (date, ledger_id, voucher_type, voucher_no, particulars, dr_amount, cr_amount)
      VALUES (?, ?, 'Sales', ?, ?, ?, 0)
    `).run(bill_date || new Date().toISOString(), ledger_id, bill_number, `Wholesale Bill ${bill_number}`, net_amount)

    // Ensure Sales Account exists
    let salesLedger = db.prepare(`SELECT id FROM ledgers WHERE ledger_name = 'Sales Account'`).get()
    if (!salesLedger) {
      const res = db.prepare(`
        INSERT INTO ledgers (ledger_name, account_group, opening_balance, dr_cr, ledger_category, ledger_type)
        VALUES ('Sales Account', 'SALES ACCOUNTS', 0, 'Cr', 'OTHERS', 'UNREGISTERED')
      `).run()
      salesLedger = { id: res.lastInsertRowid }
    }

    // Credit Sales Account
    db.prepare(`
      INSERT INTO transactions (date, ledger_id, voucher_type, voucher_no, particulars, dr_amount, cr_amount)
      VALUES (?, ?, 'Sales', ?, ?, 0, ?)
    `).run(bill_date || new Date().toISOString(), salesLedger.id, bill_number, `Sale to Customer`, net_amount)

    return id
  })

  return updateTx()
}

function searchWholesaleBillsPaginated({ search = '', page = 1, limit = 50 }) {
  const db = getDB()
  const offset = (page - 1) * limit
  let queryBase = `
    FROM wholesale_bills wb
    LEFT JOIN ledgers l ON wb.ledger_id = l.id
  `
  let params = []
  
  if (search.trim() !== '') {
    const terms = search.trim().split(/\s+/)
    const conditions = []
    for (const term of terms) {
      conditions.push(`(wb.bill_number LIKE ? OR l.ledger_name LIKE ?)`)
      params.push(`%${term}%`, `%${term}%`)
    }
    queryBase += ` WHERE ${conditions.join(' AND ')} `
  }

  const countRow = db.prepare(`SELECT COUNT(*) as total ${queryBase}`).get(...params)
  
  const data = db.prepare(`
    SELECT wb.*, l.ledger_name as party_name 
    ${queryBase}
    ORDER BY wb.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset)

  return { data, total: countRow.total, page, limit }
}

function getWholesaleBills() {
  return getDB().prepare(`
    SELECT wb.*, l.ledger_name as party_name 
    FROM wholesale_bills wb 
    LEFT JOIN ledgers l ON wb.ledger_id = l.id
    ORDER BY wb.created_at DESC LIMIT 100
  `).all()
}

function getWholesaleBillById(id) {
  const db = getDB()
  const bill = db.prepare(`
    SELECT wb.*, l.ledger_name as party_name, l.address, l.gstin, l.dl_no 
    FROM wholesale_bills wb 
    LEFT JOIN ledgers l ON wb.ledger_id = l.id
    WHERE wb.id = ?
  `).get(id)
  
  if (!bill) return null;

  const items = db.prepare(`
    SELECT wbi.*, m.name as medicine_name, m.company, m.potency, m.unit, m.category,
           sb.batch_no, sb.expiry_month, sb.expiry_year
    FROM wholesale_bill_items wbi
    LEFT JOIN master.medicines m ON wbi.medicine_id = m.id
    LEFT JOIN master.stock_batches sb ON wbi.batch_id = sb.id
    WHERE wbi.wholesale_bill_id = ?
  `).all(id)

  return { ...bill, items }
}
// --- MR Master ---
function getMRs() {
  return db.prepare('SELECT * FROM master.medical_reps ORDER BY name ASC').all()
}
function addMR(mr) {
  const stmt = db.prepare('INSERT INTO master.medical_reps (name, company, phone, email, notes) VALUES (?, ?, ?, ?, ?)')
  return stmt.run(mr.name, mr.company, mr.phone, mr.email, mr.notes)
}
function updateMR(mr) {
  const stmt = db.prepare('UPDATE master.medical_reps SET name=?, company=?, phone=?, email=?, notes=? WHERE id=?')
  return stmt.run(mr.name, mr.company, mr.phone, mr.email, mr.notes, mr.id)
}
function deleteMR(id) {
  return db.prepare('DELETE FROM master.medical_reps WHERE id=?').run(id)
}

function getDayBook(dateStr) {
  const db = getDB();
  
  // 1. Find Cash Ledger
  const cashLedger = db.prepare(`SELECT * FROM ledgers WHERE ledger_name = 'CASH' AND account_group = 'CASH IN HAND' LIMIT 1`).get();
  let openingCash = 0;
  
  if (cashLedger) {
    let baseOp = cashLedger.opening_balance || 0;
    if (cashLedger.dr_cr === 'Cr') baseOp = -baseOp;
    
    const prevTx = db.prepare(`
      SELECT SUM(dr_amount) as total_dr, SUM(cr_amount) as total_cr
      FROM transactions
      WHERE ledger_id = ? AND date(date) < date(?)
    `).get(cashLedger.id, dateStr);
    
    openingCash = baseOp + (prevTx?.total_dr || 0) - (prevTx?.total_cr || 0);
  }

  // 2. Fetch transactions, filtering out counter-entries and normalizing voucher types
  const transactions = db.prepare(`
    SELECT t.id, t.date, t.ledger_id, t.voucher_no, t.particulars,
           t.dr_amount, t.cr_amount, t.created_at,
           l.ledger_name,
           CASE 
             WHEN t.voucher_type = 'Sale' THEN 'Retail Sale'
             WHEN t.voucher_type = 'Sales' THEN 'Wholesale Sale'
             ELSE t.voucher_type
           END as voucher_type
    FROM transactions t
    LEFT JOIN ledgers l ON t.ledger_id = l.id
    WHERE date(t.date) = date(?)
      AND COALESCE(l.ledger_name, '') NOT IN ('Sales Account', 'Purchase Account')
    ORDER BY t.created_at ASC, t.id ASC
  `).all(dateStr);

  return { openingCash, cashLedgerId: cashLedger?.id, transactions };
}

function getItemLedger(medicine_id) {
  const db = getDB();
  const stmt = db.prepare(`
    SELECT * FROM (
      -- 1. Purchases (IN)
      SELECT 
        pb.invoice_date as date,
        pb.created_at as exact_time,
        'Purchase' as type,
        pb.invoice_number as reference,
        l.ledger_name as party_name,
        pbi.batch_number as batch,
        pbi.quantity as qty_in,
        0 as qty_out
      FROM purchase_bill_items pbi
      JOIN purchase_bills pb ON pbi.purchase_bill_id = pb.id
      LEFT JOIN ledgers l ON pb.supplier_id = l.id
      WHERE pbi.medicine_id = ?
      
      UNION ALL

      -- 2. Retail Bills (OUT)
      SELECT 
        DATE(b.created_at) as date,
        b.created_at as exact_time,
        'Retail Sale' as type,
        b.bill_number as reference,
        b.customer_name as party_name,
        NULL as batch,
        0 as qty_in,
        bi.quantity as qty_out
      FROM bill_items bi
      JOIN bills b ON bi.bill_id = b.id
      WHERE bi.medicine_id = ?

      UNION ALL

      -- 3. Issue Slips / Wholesale (OUT)
      SELECT
        i.issue_date as date,
        i.created_at as exact_time,
        'Issue Slip (B2B)' as type,
        i.issue_number as reference,
        l.ledger_name as party_name,
        sb.batch_no as batch,
        0 as qty_in,
        isi.quantity as qty_out
      FROM issue_slip_items isi
      JOIN issue_slips i ON isi.issue_slip_id = i.id
      LEFT JOIN ledgers l ON i.ledger_id = l.id
      LEFT JOIN master.stock_batches sb ON isi.batch_id = sb.id
      WHERE isi.medicine_id = ?

      UNION ALL

      -- 4. Sales Returns (Retail IN)
      SELECT
        DATE(sr.created_at) as date,
        sr.created_at as exact_time,
        'Sales Return' as type,
        sr.return_number as reference,
        sr.customer_name as party_name,
        sb.batch_no as batch,
        sri.quantity as qty_in,
        0 as qty_out
      FROM sales_return_items sri
      JOIN sales_returns sr ON sri.sales_return_id = sr.id
      LEFT JOIN master.stock_batches sb ON sri.batch_id = sb.id
      WHERE sri.medicine_id = ?

      UNION ALL

      -- 5. Purchase Returns (Supplier OUT)
      SELECT
        pr.return_date as date,
        pr.created_at as exact_time,
        'Purchase Return' as type,
        pr.return_number as reference,
        l.ledger_name as party_name,
        pri.batch_number as batch,
        0 as qty_in,
        pri.quantity as qty_out
      FROM purchase_return_items pri
      JOIN purchase_returns pr ON pri.purchase_return_id = pr.id
      LEFT JOIN ledgers l ON pr.supplier_id = l.id
      WHERE pri.medicine_id = ?
      
      UNION ALL

      -- 6. Wholesale Returns (B2B IN)
      SELECT
        wr.return_date as date,
        wr.created_at as exact_time,
        'Wholesale Return' as type,
        wr.return_number as reference,
        l.ledger_name as party_name,
        sb.batch_no as batch,
        wri.quantity as qty_in,
        0 as qty_out
      FROM wholesale_return_items wri
      JOIN wholesale_returns wr ON wri.wholesale_return_id = wr.id
      LEFT JOIN ledgers l ON wr.ledger_id = l.id
      LEFT JOIN master.stock_batches sb ON wri.batch_id = sb.id
      WHERE wri.medicine_id = ?
    )
    ORDER BY exact_time ASC
  `);
  return stmt.all(medicine_id, medicine_id, medicine_id, medicine_id, medicine_id, medicine_id);
}


function getGstPurchaseRegisterPaginated({ fromDate, toDate, search = '', page = 1, limit = 50 }) {
  const db = getDB();
  const offset = (page - 1) * limit;

  let purchaseQuery = `
    SELECT pb.invoice_number as bill_number, pb.invoice_date as created_at, l.ledger_name as customer_name, 'PURCHASE' as entry_type, 
           pbi.quantity, pbi.total_price as net_amount, pbi.gst_rate
    FROM purchase_bill_items pbi JOIN purchase_bills pb ON pbi.purchase_bill_id = pb.id
    LEFT JOIN ledgers l ON pb.supplier_id = l.id
    WHERE 1=1
  `;
  let returnQuery = `
    SELECT pr.return_number as bill_number, pr.return_date as created_at, l.ledger_name as customer_name, 'DEBIT_NOTE' as entry_type,
           -(pri.quantity) as quantity, -(pri.total_price) as net_amount, pri.gst_rate
    FROM purchase_return_items pri JOIN purchase_returns pr ON pri.purchase_return_id = pr.id
    LEFT JOIN ledgers l ON pr.supplier_id = l.id
    WHERE 1=1
  `;

  const params = [];
  if (fromDate) {
    purchaseQuery += ` AND pb.invoice_date >= ?`;
    returnQuery += ` AND pr.return_date >= ?`;
    params.push(fromDate);
  }
  if (toDate) {
    purchaseQuery += ` AND pb.invoice_date <= ?`;
    returnQuery += ` AND pr.return_date <= ?`;
    params.push(toDate);
  }

  const fullItemsQuery = `SELECT * FROM (${purchaseQuery} UNION ALL ${returnQuery})`;
  const allParams = [...params, ...params];

  // 1. Calculate Grand Totals
  const grandTotals = db.prepare(`
      SELECT 
          SUM(net_amount) as grandNet,
          SUM(net_amount / (1 + (gst_rate / 100.0))) as grandTaxable
      FROM (${fullItemsQuery})
  `).get(...allParams);
  
  const grandNet = grandTotals?.grandNet || 0;
  const grandTaxable = grandTotals?.grandTaxable || 0;
  const totalTax = grandNet - grandTaxable;
  const grandCgst = totalTax / 2;
  const grandSgst = totalTax / 2;
  const totals = { grandNet, grandTaxable, grandCgst, grandSgst, grandIgst: 0, totalTax };

  // 2. Pagination and Search
  let searchCond = '';
  const searchParams = [];
  if (search.trim()) {
      searchCond = ` WHERE (bill_number LIKE ? OR customer_name LIKE ?) `;
      searchParams.push(`%${search}%`, `%${search}%`);
  }

  const totalInvoices = db.prepare(`
      SELECT COUNT(*) as total FROM (
          SELECT DISTINCT bill_number, customer_name FROM (${fullItemsQuery})
      ) ${searchCond}
  `).get(...allParams, ...searchParams).total;

  const paginatedBills = db.prepare(`
      SELECT bill_number, created_at, customer_name, entry_type
      FROM (
          SELECT DISTINCT bill_number, created_at, customer_name, entry_type 
          FROM (${fullItemsQuery})
      ) ${searchCond}
      ORDER BY created_at ASC, bill_number ASC
      LIMIT ? OFFSET ?
  `).all(...allParams, ...searchParams, limit, offset);

  // Fetch aggregated rates for these paginated bills
  const invoices = [];
  if (paginatedBills.length > 0) {
      const billNumbers = paginatedBills.map(b => `'${b.bill_number}'`).join(',');
      const rates = db.prepare(`
          SELECT bill_number, gst_rate, SUM(quantity) as qty, SUM(net_amount) as net
          FROM (${fullItemsQuery})
          WHERE bill_number IN (${billNumbers})
          GROUP BY bill_number, gst_rate
      `).all(...allParams);

      paginatedBills.forEach(bill => {
          const billRates = rates.filter(r => r.bill_number === bill.bill_number);
          invoices.push({
              ...bill,
              rates: billRates
          });
      });
  }

  return { totals, invoices, total: totalInvoices, page, limit };
}

module.exports = {

  getItemLedger,
  getDB,
  getNextIssueSlipNumber,
  createIssueSlip,
  getIssueSlips,
  getIssueSlipById,
  getSetting, setSetting, performBackup,
  getMedicines, searchMedicinesPaginated, addMedicine, updateMedicine, deleteMedicine,
  getLowStock, updateStock,
  getSuppliers, addSupplier,
  getCompanies, addCompany, updateCompany, deleteCompany,
  getLedgers, addLedger, updateLedger, deleteLedger,
  addVoucher, getLedgerStatement,
  getHsnSac, addHsnSac, updateHsnSac, deleteHsnSac,
  getCategories, addCategory, updateCategory, deleteCategory,
  getPowers, addPower, updatePower, deletePower,
  getPackings, addPacking, updatePacking, deletePacking,
  getAccountGroups, addAccountGroup, deleteAccountGroup,
  createBill, getBills, getBillById, searchRetailBillsPaginated,
  createPurchaseBill, getPurchaseBills, getPurchaseBillById,
  updateWholesaleBill,
  createWholesaleBill, searchWholesaleBillsPaginated, getWholesaleBills, getWholesaleBillById, getNextWholesaleBillNumber,
  createPurchaseOrder, getPurchaseOrders,
  getSalesReport, getGstSalesRegisterPaginated, getGstPurchaseRegisterPaginated, getExpiryAlerts, getExpiringBatches,
  getDashboardStats,
  getFinancialYears, selectFinancialYear, createFinancialYear,
  getGodowns, addGodown, deleteGodown,
  addStockBatch, getStockBatches, getAllStockBatches, updateStockBatch, deleteStockBatch,
  resetAllStock, getStoreProfile, updateStoreProfile, verifyAdminPin, updateAdminPin,
  verifyCashierPin, updateCashierPin,
  getSalesReturns, getPurchaseReturns, getBalanceSheetData, getProfitLossData, getGstReturnsData, getDayBook,
  getSalesBillForReturn, getPurchaseBillForReturn, createSalesReturn, createPurchaseReturn,
  getWholesaleBillForReturn, createWholesaleReturn, getWholesaleReturns,
  getMRs, addMR, updateMR, deleteMR,
  closeDB, getCurrentDbName, isCurrentYearLocked
}

function isCurrentYearLocked() {
  return global.activeFinancialYear ? !!global.activeFinancialYear.is_locked : false;
}

function closeDB() {
  if (db) {
    db.close()
    db = null
  }
}

function getCurrentDbName() {
  return currentDbName;
}


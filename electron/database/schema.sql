-- ─── Suppliers ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS suppliers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ─── Ledgers ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ledgers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ledger_name TEXT NOT NULL,
  station TEXT,
  account_group TEXT,
  balancing_method TEXT,
  opening_balance REAL DEFAULT 0,
  dr_cr TEXT,
  mail_to TEXT,
  address TEXT,
  pin_code TEXT,
  email TEXT,
  website TEXT,
  contact_person TEXT,
  designation TEXT,
  phone_office TEXT,
  phone_res TEXT,
  mobile TEXT,
  fax TEXT,
  dl_no TEXT,
  dl_expiry DATE,
  gst_heading TEXT,
  gstin TEXT,
  pan_no TEXT,
  ledger_category TEXT,
  state TEXT,
  country TEXT,
  ledger_type TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ─── HSN/SAC Master ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS hsn_sac_master (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hsn_code TEXT NOT NULL,
  short_name TEXT,
  sgst REAL DEFAULT 0,
  cgst REAL DEFAULT 0,
  igst REAL DEFAULT 0,
  type TEXT DEFAULT 'Goods',
  uqc TEXT,
  cess REAL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ─── Category Master ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS category_master (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ─── Power (Potency) Master ──────────────────────────────
CREATE TABLE IF NOT EXISTS power_master (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ─── Packing Master ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS packing_master (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ─── Account Groups ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS account_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  desc TEXT,
  is_custom BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ─── Medicines (Local Placeholder to satisfy foreign key constraints) ────
CREATE TABLE IF NOT EXISTS medicines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL
);

-- ─── Bills (Sales) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS bills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bill_number TEXT UNIQUE NOT NULL,
  customer_name TEXT,
  customer_phone TEXT,
  total_amount REAL DEFAULT 0,
  discount REAL DEFAULT 0,
  paid_amount REAL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ─── Bill Items ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bill_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bill_id INTEGER NOT NULL,
  medicine_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price REAL NOT NULL,
  total_price REAL NOT NULL,
  gst_rate REAL DEFAULT 5,
  FOREIGN KEY (bill_id) REFERENCES bills(id),
  FOREIGN KEY (medicine_id) REFERENCES medicines(id)
);

-- ─── Purchase Orders ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS purchase_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  supplier_id INTEGER,
  status TEXT DEFAULT 'pending',
  total_amount REAL DEFAULT 0,
  notes TEXT,
  ordered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  received_at DATETIME,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);

-- ─── Purchase Order Items ─────────────────────────────────
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  medicine_id INTEGER NOT NULL,
  quantity_ordered INTEGER NOT NULL,
  quantity_received INTEGER DEFAULT 0,
  unit_price REAL DEFAULT 0,
  FOREIGN KEY (order_id) REFERENCES purchase_orders(id),
  FOREIGN KEY (medicine_id) REFERENCES medicines(id)
);

-- ─── Godown Master ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS godown_master (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);



-- ─── Store Profile ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

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
);

-- ─── Transactions ──────────────────────────────────────────
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

-- ─── Purchase Bills ──────────────────────────────────────
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

-- ─── Purchase Bill Items ──────────────────────────────────
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

-- ─── Sales Returns ───────────────────────────────────────
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

-- ─── Sales Return Items ──────────────────────────────────
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

-- ─── Purchase Returns ─────────────────────────────────────
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

-- ─── Purchase Return Items ────────────────────────────────
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

-- ─── Wholesale Bills (B2B) ──────────────────────────────
CREATE TABLE IF NOT EXISTS wholesale_bills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bill_number TEXT UNIQUE NOT NULL,
  ledger_id INTEGER NOT NULL,
  bill_date DATE,
  bill_type TEXT DEFAULT 'WS',
  challan_no TEXT,
  challan_date DATE,
  order_no TEXT,
  order_date DATE,
  gr_no TEXT,
  gr_date DATE,
  reference TEXT,
  gst_acc TEXT,
  sale_register TEXT,
  send_through TEXT,
  documents_through TEXT,
  sale_destination TEXT,
  remark TEXT,
  eway_bill_no TEXT,
  eway_vehicle_no TEXT,
  eway_transporter TEXT,
  eway_transporter_id TEXT,
  eway_distance INTEGER,
  total_amount REAL DEFAULT 0,
  total_discount REAL DEFAULT 0,
  round_off REAL DEFAULT 0,
  net_amount REAL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ledger_id) REFERENCES ledgers(id)
);

-- ─── Wholesale Bill Items ────────────────────────────────
CREATE TABLE IF NOT EXISTS wholesale_bill_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wholesale_bill_id INTEGER NOT NULL,
  medicine_id INTEGER NOT NULL,
  batch_id INTEGER,
  quantity INTEGER NOT NULL,
  free_quantity INTEGER DEFAULT 0,
  unit_price REAL NOT NULL,
  discount_percent REAL DEFAULT 0,
  scheme_discount_percent REAL DEFAULT 0,
  box INTEGER DEFAULT 0,
  gross_total REAL DEFAULT 0,
  cgst_rate REAL DEFAULT 0,
  sgst_rate REAL DEFAULT 0,
  igst_rate REAL DEFAULT 0,
  total_price REAL NOT NULL,
  FOREIGN KEY (wholesale_bill_id) REFERENCES wholesale_bills(id),
  FOREIGN KEY (medicine_id) REFERENCES medicines(id),
  FOREIGN KEY (batch_id) REFERENCES stock_batches(id)
);

-- ─── Medical Reps (MR Master) ───────────────────────────
CREATE TABLE IF NOT EXISTS medical_reps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  company TEXT,
  phone TEXT,
  email TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
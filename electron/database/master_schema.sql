-- ─── Suppliers ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS suppliers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ─── Companies ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS companies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  address1 TEXT,
  address2 TEXT,
  address3 TEXT,
  phone TEXT,
  branch_code TEXT,
  fax TEXT,
  website TEXT,
  email TEXT,
  country TEXT DEFAULT 'India',
  state TEXT,
  business_type TEXT,
  working_style TEXT,
  gstin TEXT,
  vat_no TEXT,
  dl_no TEXT,
  dl_expiry DATE,
  mfg_lic_no TEXT,
  mfg_lic_expiry DATE,
  lst_no TEXT,
  lst_expiry DATE,
  service_tax TEXT,
  service_tax_expiry DATE,
  food_lic_no TEXT,
  food_lic_expiry DATE,
  jurisdiction TEXT,
  tax_structure TEXT DEFAULT 'Product Wise',
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

-- ─── Medicines ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS medicines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  company TEXT,
  category TEXT,
  potency TEXT,
  unit TEXT DEFAULT 'bottle',
  purchase_price REAL DEFAULT 0,
  selling_price REAL DEFAULT 0,
  stock_quantity INTEGER DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 10,
  expiry_date DATE,
  supplier_id INTEGER,
  gst_rate REAL DEFAULT 5,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
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


# HomoeoStore ERP - System Design Document

This document outlines the architecture, database schema organization, performance optimizations, and user interface layering system for **HomoeoStore ERP**, a lightweight desktop software designed for Homeopathic pharmacies.

---

## 1. System Architecture

HomoeoStore ERP is built on the **Electron** platform, separating concerns between a secure, system-level Main Process and a responsive, dynamic React Renderer Process.

```mermaid
graph TD
    subgraph Renderer Process (React UI)
        UI[User Interface Components]
        Cache[CacheContext React State]
        UI -->|Reads From| Cache
    end

    subgraph Main Process (Electron NodeJS)
        IPC[IPC Bridge preload.js / main.js]
        DB[Database connection engine]
        Sync[Cloud Auto-Sync & Backup]
        
        IPC -->|Commands| DB
        IPC -->|Commands| Sync
    end

    subgraph Storage Layer (Local Disk)
        MasterDB[(homoeostore_master.db)]
        LocalDB[(FY_2025_2026.db)]
        
        DB -->|Attach & Query| MasterDB
        DB -->|Query| LocalDB
    end

    UI -->|IPC Invocation| IPC
    Sync -->|Atomic VACUUM INTO| MasterDB
    Sync -->|Atomic VACUUM INTO| LocalDB
```

---

## 2. Database Design & Relocation Strategy

To support multi-year accounting while maintaining a global product catalog and stock levels, the application implements a **Split-Database Architecture** via SQLite's `ATTACH DATABASE` utility.

### 2.1. Global Master Database (`homoeostore_master.db`)
Stores global resources that span across all financial years. This prevents users from having to re-key catalogs or inventory when starting a new financial year.
* **`medicines`**: Master product catalog including name, category, potency, and current total stock.
* **`companies`**: Medicine manufacturers and properties.
* **`suppliers`**: Wholesale distributors and vendor records.
* **`stock_batches`**: Global inventory listing (batch numbers, expiry dates, quantities, and locations).
* **`store_profile` & `settings`**: Store layout details, DL numbers, and configuration flags.

### 2.2. Financial Year Database (`FY_YYYY_YYYY.db`)
Stores transaction ledgers specific to the active accounting period.
* **`bills` & `bill_items`**: Retail consumer invoices.
* **`wholesale_bills` & `wholesale_bill_items`**: B2B wholesale transactions.
* **`ledgers`**: Party account details and initial opening balances.
* **`transactions`**: Double-entry bookkeeping journal entries (Debit/Credit).
* **`purchase_bills` & `purchase_bill_items`**: Inward stock arrivals.

---

## 3. Caching & UI Performance Strategy

Since querying thousands of medicines over Electron IPC on every keystroke causes rendering delays, the app utilizes an **Active Startup Caching Strategy**.

1. **Complete Startup Cache Load:** During the premium launch screen, [CacheContext.jsx](file:///c:/Users/anmol/OneDrive/Desktop/Homoeo%20store/src/context/CacheContext.jsx) loads all master tables into React memory state concurrently.
2. **Reference-Stable Cache Methods:** To prevent infinite re-render loops in components consuming the cache, all refresh and initialization routines are wrapped in `useCallback` hooks:
   ```javascript
   const refreshMedicines = useCallback(async () => {
     const data = await window.api.getMedicines();
     setMedicines(processed(data));
   }, []);
   ```
3. **High-Capacity Autocomplete Inputs:** Input fields default to displaying up to 50 items for standard selections to optimize rendering performance, but increase dynamically to **1,000 items** (via `maxItems={1000}`) for high-density listings (such as Company and Medicine inputs) once data is fully cached.

---

## 4. UI Layering & Stacking Context

To prevent overlay components from clashing visually, the application maintains a strict **z-index hierarchy**:

| Component Layer | Position Type | Z-Index | Purpose |
| :--- | :--- | :--- | :--- |
| **Draggable Header & Nav Menus** | `relative` | `100100` | Navigation dropdowns must display on top of all page content. |
| **Cloud Sync Status Dropdown** | `absolute` | `100001` | Cloud activity details overlay. |
| **User Dropdown** | `absolute` | `100000` | Account control dropdown. |
| **Medicine Dropdown List** | `absolute` | `99999` | Inline autocomplete search overlay inside page forms. |
| **Page Content Backgrounds** | `relative` | `0` | Default page text and containers. |

---

## 5. Security & Backup Pipeline

1. **Atomic Local Backups:** The app triggers local backups on quit. It uses SQLite’s native `VACUUM INTO` command to construct a clean, single-file snapshot to prevent corruption from write interrupts.
2. **FIFO Cleanup Policy:** The database engine maintains a clean disk footprint by automatically purging backups older than **30 days** or keeping a maximum of the **last 10 files**.
3. **Automated Cloud Backup:** Upon daily schedule and app shutdown, local database buffers are securely synced to Firebase Cloud Storage under matching encrypted store name folders.

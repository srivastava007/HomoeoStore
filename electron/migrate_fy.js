const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const userDataPath = "C:\\Users\\anmol\\AppData\\Roaming\\HomoeoStore";
const oldDbPath = path.join(userDataPath, "FY_2025_2026.db");
const newDbPath = path.join(userDataPath, "FY_2026_2027.db");

console.log("Backing up databases...");
fs.copyFileSync(oldDbPath, oldDbPath + ".bak");
fs.copyFileSync(newDbPath, newDbPath + ".bak");

const oldDb = new Database(oldDbPath);
const newDb = new Database(newDbPath);

oldDb.pragma('foreign_keys = OFF');
newDb.pragma('foreign_keys = OFF');

function migrateTable(tableName, dateCol, dateThreshold, isDateTime) {
    let oldRows;
    if (isDateTime) {
       oldRows = oldDb.prepare(`SELECT * FROM ${tableName} WHERE date(${dateCol}) >= ?`).all(dateThreshold);
    } else {
       oldRows = oldDb.prepare(`SELECT * FROM ${tableName} WHERE ${dateCol} >= ?`).all(dateThreshold);
    }
    
    console.log(`Migrating ${oldRows.length} rows from ${tableName}...`);
    if (oldRows.length === 0) return [];
    
    const keys = Object.keys(oldRows[0]);
    const insertStmt = newDb.prepare(`INSERT OR REPLACE INTO ${tableName} (${keys.join(',')}) VALUES (${keys.map(k => '@'+k).join(',')})`);
    
    newDb.transaction(() => {
        for (const row of oldRows) {
            insertStmt.run(row);
        }
    })();
    
    // delete from oldDb safely using parameter binding limit workaround (SQLite max vars is usually 999 or 32766)
    // we delete one by one or in small batches
    const ids = oldRows.map(r => r.id);
    const deleteStmt = oldDb.prepare(`DELETE FROM ${tableName} WHERE id = ?`);
    oldDb.transaction(() => {
        for (const id of ids) {
            deleteStmt.run(id);
        }
    })();
    
    return ids;
}

function migrateChildTable(tableName, parentCol, parentIds) {
    if (parentIds.length === 0) return;
    
    console.log(`Migrating child table ${tableName}...`);
    
    const rows = [];
    const selectStmt = oldDb.prepare(`SELECT * FROM ${tableName} WHERE ${parentCol} = ?`);
    for (const pid of parentIds) {
        rows.push(...selectStmt.all(pid));
    }
    
    console.log(`Found ${rows.length} rows for ${tableName}...`);
    if (rows.length === 0) return;
    
    const keys = Object.keys(rows[0]);
    const insertStmt = newDb.prepare(`INSERT OR REPLACE INTO ${tableName} (${keys.join(',')}) VALUES (${keys.map(k => '@'+k).join(',')})`);
    
    newDb.transaction(() => {
        for (const row of rows) {
            insertStmt.run(row);
        }
    })();
    
    const deleteStmt = oldDb.prepare(`DELETE FROM ${tableName} WHERE ${parentCol} = ?`);
    oldDb.transaction(() => {
        for (const pid of parentIds) {
            deleteStmt.run(pid);
        }
    })();
}

try {
    const threshold = '2026-04-01';

    // Bills
    const billIds = migrateTable('bills', 'created_at', threshold, true);
    migrateChildTable('bill_items', 'bill_id', billIds);

    // Wholesale Bills
    const wsIds = migrateTable('wholesale_bills', 'bill_date', threshold, false);
    migrateChildTable('wholesale_bill_items', 'wholesale_bill_id', wsIds);

    // Purchase Bills
    const pbIds = migrateTable('purchase_bills', 'invoice_date', threshold, false);
    migrateChildTable('purchase_bill_items', 'purchase_bill_id', pbIds);

    // Sales Returns
    const srIds = migrateTable('sales_returns', 'created_at', threshold, true);
    migrateChildTable('sales_return_items', 'sales_return_id', srIds);

    // Purchase Returns
    const prIds = migrateTable('purchase_returns', 'return_date', threshold, false);
    migrateChildTable('purchase_return_items', 'purchase_return_id', prIds);

    // Purchase Orders
    const poIds = migrateTable('purchase_orders', 'ordered_at', threshold, true);
    migrateChildTable('purchase_order_items', 'order_id', poIds);

    // Transactions
    migrateTable('transactions', 'date', threshold, false);

    console.log("Recalculating ledger opening balances in FY 2026-2027...");
    const oldLedgers = oldDb.prepare(`
        SELECT l.id, l.opening_balance, l.dr_cr,
               COALESCE(SUM(t.dr_amount), 0) as total_dr,
               COALESCE(SUM(t.cr_amount), 0) as total_cr
        FROM ledgers l
        LEFT JOIN transactions t ON l.id = t.ledger_id
        GROUP BY l.id
    `).all();

    const updateLedger = newDb.prepare(`
        UPDATE ledgers SET opening_balance = @ob, dr_cr = @dr_cr WHERE id = @id
    `);

    newDb.transaction(() => {
        for (const l of oldLedgers) {
            const obRaw = l.opening_balance * (l.dr_cr === 'Dr' ? 1 : -1);
            const currentBalRaw = obRaw + l.total_dr - l.total_cr;
            
            const newOb = Math.abs(currentBalRaw);
            const newDrCr = currentBalRaw >= 0 ? 'Dr' : 'Cr';
            
            updateLedger.run({ ob: newOb, dr_cr: newDrCr, id: l.id });
        }
    })();

    console.log("Migration completed successfully.");
} catch (err) {
    console.error("Migration failed:", err);
} finally {
    oldDb.close();
    newDb.close();
}

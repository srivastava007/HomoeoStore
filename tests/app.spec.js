const { test, expect, _electron: electron } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

test.describe.configure({ mode: 'serial' });

let electronApp;
let page;

test.beforeAll(async () => {
  const testUserDataDir = path.join(__dirname, 'test-user-data');
  
  // Clean and recreate the test user data directory
  if (fs.existsSync(testUserDataDir)) {
    try {
      fs.rmSync(testUserDataDir, { recursive: true, force: true });
    } catch (e) {
      console.warn("Could not remove test-user-data directory: ", e.message);
    }
  }
  fs.mkdirSync(testUserDataDir, { recursive: true });

  // Copy seed database to the test user data directory
  const seedDbPath = path.join(__dirname, '../electron/seed/homoeostore_master.db');
  const targetDbPath = path.join(testUserDataDir, 'homoeostore_master.db');
  
  if (fs.existsSync(seedDbPath)) {
    fs.copyFileSync(seedDbPath, targetDbPath);
    console.log("✅ Copied seed database to test directory");
    
    // Clear the admin PIN in the copied database using Python to force Onboarding Welcome screen
    try {
      const pyCmd = `python -c "import sqlite3; conn = sqlite3.connect(r'${targetDbPath}'); conn.execute('UPDATE store_profile SET admin_pin = NULL'); conn.commit(); conn.close()"`;
      execSync(pyCmd);
      console.log("✅ Cleared admin PIN in test database to trigger onboarding");
    } catch (dbErr) {
      console.error("❌ Failed to clear admin PIN in test database:", dbErr.message);
    }
  } else {
    console.warn("⚠️ Seed database not found at " + seedDbPath);
  }

  // Launch Electron App
  electronApp = await electron.launch({
    args: [
      path.join(__dirname, '../electron/main.js'),
      '--user-data-dir=' + testUserDataDir,
    ],
  });

  page = await electronApp.firstWindow();
  await page.waitForLoadState('domcontentloaded');
});

test.afterAll(async () => {
  if (electronApp) {
    await electronApp.close();
  }
});

test('1. Onboarding & PIN Setup', async () => {
  // Wait for Onboarding Welcome screen to load
  await page.waitForSelector('text="System Configuration Setup"');
  
  // Select standalone mode configuration
  await page.click('text="Standalone (Single PC)"');
  
  // Wait for Set Admin Master PIN screen to load
  await page.waitForSelector('text="Set Admin Master PIN"');
  
  // Setup the PIN to 12345
  await page.fill('input[placeholder="Create new PIN"]', '12345');
  
  // Submit onboarding form
  await page.click('text="Save PIN & Start Application"');
  
  // Wait for Financial Year Selector modal to pop up
  await page.waitForSelector('text="Select Financial Year"');
  
  // Click on the default financial year 'FY 2024 - 2025'
  await page.click('text="FY 2024 - 2025"');
  
  // Financial Year Selection causes reload. Let's wait for page to reload and stabilize.
  await page.waitForLoadState('domcontentloaded');
});

test('2. Authentication Checks', async () => {
  // Wait for role selection page after window reload
  await page.waitForSelector('text="Select your role"');
  
  // Click 'Login as Admin'
  await page.click('text="Login as Admin"');
  
  // Wait for Admin Login form
  await page.waitForSelector('text="Admin Login"');
  
  // Test invalid PIN
  const pinInput = page.locator('input[placeholder="Enter PIN"]');
  await pinInput.fill('99999');
  
  // Since verification is triggered immediately when length equals 5,
  // the app will reject the PIN, clear the input, and stay on the login screen.
  // Let's assert that the input value becomes empty.
  await expect(pinInput).toHaveValue('', { timeout: 10000 });
  
  // Now enter valid PIN 12345
  await pinInput.fill('12345');
  
  // Wait for authentication and landing on dashboard
  await page.waitForSelector('text="Dashboard"');
  
  // Verify that Admin role pill is displayed in the header
  await expect(page.locator('text="Administrator"').first()).toBeVisible();
});

test('3. Sidebar Navigation', async () => {
  // Hover over Settings & Masters category
  await page.hover('text="Settings & Masters"');
  
  // Click Company Master link
  await page.click('text="Company Master"');
  
  // Verify we navigated to Company Master page
  await page.waitForSelector('h1:has-text("Company Master")');
});

test('4. Company & Medicine CRUD', async () => {
  // Click on + New Company button
  await page.click('text="+ New Company"');
  
  // Fill the basic company form
  await page.fill('input[placeholder="Legal entity name"]', 'SBL');
  await page.fill('input[placeholder="Line 1 (Shop/Building)"]', 'Office Delhi');
  await page.fill('input[placeholder="Line 2 (Locality)"]', 'Nangloi');
  await page.fill('input[placeholder="Type or select state..."]', '07-Delhi');
  
  // Save company
  await page.click('text="Save Company"');
  
  // Use search bar to locate SBL (handling pagination)
  await page.fill('input[placeholder="Search company..."]', 'SBL');
  
  // Verify company is listed
  await page.waitForSelector('td:has-text("SBL")');
  
  // Hover over Inventory & Expiry category
  await page.hover('text="Inventory & Expiry"');
  
  // Click on Item Master link
  await page.click('text="Item Master"');
  
  // Wait for Medicines Directory page
  await page.waitForSelector('h1:has-text("Medicines Directory")');
  
  // Click on Add Medicine button
  await page.click('text="Add Medicine"');
  
  // Wait for medicine creation modal
  await page.waitForSelector('#medicine-company-input');
  
  // Fill Company input (using SearchableCombobox)
  await page.fill('#medicine-company-input', 'SBL');
  await page.press('#medicine-company-input', 'Enter');
  
  // Fill Medicine Name
  await page.fill('#medicine-name-input', 'Arnica Montana');
  await page.press('#medicine-name-input', 'Enter');
  
  // Fill Category
  await page.fill('#medicine-type-input', 'Dilution');
  await page.press('#medicine-type-input', 'Enter');
  
  // Fill Power
  await page.fill('#medicine-power-input', '30 CH');
  await page.press('#medicine-power-input', 'Enter');
  
  // Fill Packing
  await page.fill('#medicine-packing-input', '30ml');
  await page.press('#medicine-packing-input', 'Enter');
  
  // Save new medicine
  await page.click('#medicine-save-btn');
  
  // Use search bar to locate Arnica Montana (handling pagination)
  await page.fill('input[placeholder="Search by name or company..."]', 'Arnica Montana');
  
  // Verify medicine is listed in the directory
  await page.waitForSelector('td:has-text("Arnica Montana")');
});

test('5. Stock Update Entry', async () => {
  // Hover over Inventory & Expiry category
  await page.hover('text="Inventory & Expiry"');
  
  // Click on Stock Update (F3) link
  await page.click('text="Stock Update (F3)"');
  
  // Wait for Stock Update page
  await page.waitForSelector('h1:has-text("Stock Update")');
  
  // Select Company
  await page.fill('#stock-company-input', 'SBL');
  await page.press('#stock-company-input', 'Enter');

  // Search for our medicine
  await page.fill('#stock-medicine-input', 'Arnica Montana');
  
  // Wait for dropdown suggestion and click it
  await page.waitForSelector('#stock-med-item-0');
  await page.click('#stock-med-item-0');
  
  // Fill Location No.
  await page.fill('#stock-loc-value', '1');
  
  // Fill stock quantity
  await page.fill('#stock-qty-input', '100');
  
  // Fill Batch No.
  await page.fill('#stock-batch-input', 'B123');
  
  // Fill Expiry MM/YYYY
  await page.fill('#stock-expm-input', '12');
  await page.fill('#stock-expy-input', '2030');
  
  // Fill MRP
  await page.fill('#stock-mrp-input', '150');
  
  // Click Add Stock button
  await page.click('#stock-add-btn');
  
  // Verification: stock input should clear upon successful database insertion
  await expect(page.locator('#stock-medicine-input')).toHaveValue('');
});

test('6. POS Retail Billing Checkout', async () => {
  // Hover over Billing & Returns category
  await page.hover('text="Billing & Returns"');
  await page.waitForTimeout(500);
  
  // Click Retail Bill (F8) link
  await page.click('text="Retail Bill (F8)"');
  
  // Wait for POS Billing page to load
  await page.waitForSelector('text="Bill Summary"');
  
  // Select Company
  await page.fill('#billing-company-input', 'SBL');
  await page.press('#billing-company-input', 'Enter');
  
  // Submit company type select (Sealed) by pressing Enter
  await page.press('#billing-company-type-select', 'Enter');
  
  // Search for the medicine
  await page.fill('#billing-medicine-input', 'Arnica Montana');
  await page.waitForSelector('#billing-med-item-0');
  await page.click('#billing-med-item-0');

  
  // Wait for Batch/Location Selection Modal to appear
  await page.waitForSelector('#batch-row-0');
  
  // Click on first batch row to select the batch we created
  await page.click('#batch-row-0');
  
  // Fill checkout quantity
  await page.fill('#billing-qty-input', '2');
  
  // Click Add button to add item to the cart
  await page.click('#billing-add-btn');
  
  // Finalise the checkout
  await page.click('#billing-finalize-btn');
  
  // Wait for Success Modal
  await page.waitForSelector('#billing-ok-btn');
  
  // Click OK on Success Modal to complete invoice checkout
  await page.click('#billing-ok-btn');
  
  // Verify cart is cleared (showing Empty Cart state)
  await page.waitForSelector('text="Empty Cart"');
});

-- ─────────────────────────────────────────────────────────────────────────────
--  S M R I T I - O S   ||   E N T E R P R I S E   E D I T I O N
--  "ERP Simplified. Run Your Entire Business on Memory, Not Code."
-- ─────────────────────────────────────────────────────────────────────────────
--  System Architect  : Jawahar R Mallah
--  Parent Org        : AITDL NETWORK
--  Copyright         : © 2026 AITDL.com & AITDL.in. All Rights Reserved.
--
--  Product Name      : SMRITI-OS
--  Modules Included  : SmritiERP, SmritiBusinessPlusRetail, SmritiNotes
--  Architecture      : Zero Upfront Cost, Offline-First WASM, Cloudflare Edge
--  Platform Core     : POS Billing, Till Management, Stock Procurement, 
--                      Loyalty CRM, Tally Integration, Offline Day Sync.
-- 
--  Classification    : PROPRIETARY & CONFIDENTIAL
--                   
--  AUTHORIZATION     : This file and its contents are the intellectual property
--                      of AITDL NETWORK. Unauthorized copying, reproduction,
--                      or distribution of this architecture, via any medium,
--                      is strictly prohibited.
--  CONTACT           : aitdlnetwork@outlook.com | jawahar@aitdl.in
-- ─────────────────────────────────────────────────────────────────────────────

-- ==============================================================================
-- SMRITI-OS: Unified Retail & Procurement Database Schema (SQLite WASM)
-- Architecture: SQLite (Offline-First Edge Compatibility)
-- ==============================================================================

-- 1. ENTERPRISE MASTERS

CREATE TABLE vendors (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    gstin TEXT,
    contact_details TEXT, -- Stored as JSON string
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sales_personnel (
    id TEXT PRIMARY KEY,
    store_id TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE customers (
    id TEXT PRIMARY KEY,
    phone_number TEXT UNIQUE NOT NULL,
    name TEXT,
    loyalty_membership_status INTEGER DEFAULT 0,
    loyalty_tier TEXT DEFAULT 'BRONZE',
    customer_price_group_id TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE items (
    id TEXT PRIMARY KEY,
    sku TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    style TEXT,
    model TEXT,
    mrp REAL DEFAULT 0.00,
    sale_price REAL DEFAULT 0.00,
    hsn_code TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE barcodes (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    barcode TEXT UNIQUE NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 2. TALLY INTERFACE INTEGRATION

CREATE TABLE tally_ledger_mappings (
    id TEXT PRIMARY KEY,
    local_ledger_name TEXT UNIQUE NOT NULL,
    tally_ledger_name TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tally_hsn_mappings (
    id TEXT PRIMARY KEY,
    local_hsn_code TEXT UNIQUE NOT NULL,
    tally_tax_class TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tally_sync_logs (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    sync_status TEXT DEFAULT 'PENDING',
    xml_payload TEXT,
    error_message TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 3. HOUSEKEEPING (Day Open/Close)

CREATE TABLE store_days (
    id TEXT PRIMARY KEY,
    store_id TEXT NOT NULL,
    business_date TEXT NOT NULL,
    status TEXT DEFAULT 'OPEN',
    opened_at TEXT DEFAULT CURRENT_TIMESTAMP,
    closed_at TEXT,
    UNIQUE(store_id, business_date)
);

-- 4. LOYALTY & PROMOTIONS

CREATE TABLE sales_promotions (
    id TEXT PRIMARY KEY,
    promo_code TEXT UNIQUE NOT NULL,
    description TEXT,
    discount_type TEXT,
    discount_value REAL DEFAULT 0.00,
    is_active INTEGER DEFAULT 1,
    start_date TEXT,
    end_date TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE loyalty_transactions (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL REFERENCES customers(id),
    transaction_type TEXT NOT NULL,
    points REAL NOT NULL,
    reference_invoice_id TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 5. PROCUREMENT & STOCK

CREATE TABLE purchase_orders (
    id TEXT PRIMARY KEY,
    vendor_id TEXT NOT NULL REFERENCES vendors(id),
    po_number TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'DRAFT',
    total_amount REAL DEFAULT 0.00,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE po_items (
    id TEXT PRIMARY KEY,
    po_id TEXT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL REFERENCES items(id),
    quantity REAL NOT NULL,
    rate REAL NOT NULL
);

CREATE TABLE goods_inward (
    id TEXT PRIMARY KEY,
    vendor_id TEXT NOT NULL REFERENCES vendors(id),
    grn_number TEXT UNIQUE NOT NULL,
    po_id TEXT REFERENCES purchase_orders(id),
    status TEXT DEFAULT 'POSTED',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE goods_inward_items (
    id TEXT PRIMARY KEY,
    gi_id TEXT NOT NULL REFERENCES goods_inward(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL REFERENCES items(id),
    quantity REAL NOT NULL,
    rate REAL NOT NULL
);

CREATE TABLE goods_outward (
    id TEXT PRIMARY KEY,
    dispatch_number TEXT UNIQUE NOT NULL,
    destination TEXT,
    status TEXT DEFAULT 'POSTED',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE goods_outward_items (
    id TEXT PRIMARY KEY,
    go_id TEXT NOT NULL REFERENCES goods_outward(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL REFERENCES items(id),
    quantity REAL NOT NULL
);

CREATE TABLE stock_ledger (
    id TEXT PRIMARY KEY,
    store_id TEXT NOT NULL,
    item_id TEXT NOT NULL REFERENCES items(id),
    movement_type TEXT NOT NULL,
    quantity_change REAL NOT NULL,
    reference_id TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 6. TILL & CASH MANAGEMENT

CREATE TABLE tills (
    id TEXT PRIMARY KEY,
    store_id TEXT NOT NULL,
    till_name TEXT NOT NULL,
    is_active INTEGER DEFAULT 1
);

CREATE TABLE till_sessions (
    id TEXT PRIMARY KEY,
    till_id TEXT NOT NULL REFERENCES tills(id),
    store_day_id TEXT NOT NULL REFERENCES store_days(id),
    salesman_id TEXT REFERENCES sales_personnel(id),
    opening_balance REAL DEFAULT 0.00,
    closing_balance REAL,
    status TEXT DEFAULT 'OPEN',
    opened_at TEXT DEFAULT CURRENT_TIMESTAMP,
    closed_at TEXT,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cash_transactions (
    id TEXT PRIMARY KEY,
    till_session_id TEXT NOT NULL REFERENCES till_sessions(id),
    transaction_type TEXT NOT NULL,
    amount REAL NOT NULL,
    remarks TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 7. RETAIL SALES

CREATE TABLE sales_invoices (
    id TEXT PRIMARY KEY,
    store_day_id TEXT NOT NULL REFERENCES store_days(id),
    till_session_id TEXT NOT NULL REFERENCES till_sessions(id),
    salesman_id TEXT NOT NULL REFERENCES sales_personnel(id),
    customer_id TEXT REFERENCES customers(id),
    invoice_number TEXT UNIQUE NOT NULL,
    subtotal REAL DEFAULT 0.00,
    discount_amount REAL DEFAULT 0.00,
    tax_amount REAL DEFAULT 0.00,
    net_total REAL DEFAULT 0.00,
    status TEXT DEFAULT 'POSTED',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sales_items (
    id TEXT PRIMARY KEY,
    invoice_id TEXT NOT NULL REFERENCES sales_invoices(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL REFERENCES items(id),
    quantity REAL NOT NULL,
    mrp REAL NOT NULL,
    rate REAL NOT NULL,
    discount_amount REAL DEFAULT 0.00,
    tax_amount REAL DEFAULT 0.00,
    total REAL NOT NULL
);

CREATE TABLE sales_payments (
    id TEXT PRIMARY KEY,
    invoice_id TEXT NOT NULL REFERENCES sales_invoices(id) ON DELETE CASCADE,
    payment_mode TEXT NOT NULL,
    amount REAL NOT NULL,
    transaction_reference TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- SQLITE TRIGGERS & VIEWS
-- ==============================================================================

-- VIEW: Real-Time Stock Ledger Computation
CREATE VIEW IF NOT EXISTS current_stock_vw AS
SELECT 
    store_id,
    item_id,
    SUM(quantity_change) as current_quantity
FROM stock_ledger
GROUP BY store_id, item_id;

-- TRIGGER: Auto-Award Loyalty Points on Sale
CREATE TRIGGER IF NOT EXISTS trg_award_loyalty_points
AFTER INSERT ON sales_invoices
WHEN NEW.status = 'POSTED' AND NEW.customer_id IS NOT NULL AND EXISTS (SELECT 1 FROM customers WHERE id = NEW.customer_id AND loyalty_membership_status = 1)
BEGIN
    INSERT INTO loyalty_transactions (id, customer_id, transaction_type, points, reference_invoice_id, created_at, updated_at)
    SELECT 
        lower(hex(randomblob(16))),
        NEW.customer_id, 
        'EARN', 
        CAST((NEW.net_total / 100) AS INTEGER), 
        NEW.id,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    WHERE CAST((NEW.net_total / 100) AS INTEGER) > 0;
END;

-- TRIGGER: Auto-Post Sales to Stock Ledger
CREATE TRIGGER IF NOT EXISTS trg_post_sale_to_stock_ledger
AFTER INSERT ON sales_items
BEGIN
    INSERT INTO stock_ledger (id, store_id, item_id, movement_type, quantity_change, reference_id, created_at)
    SELECT
        lower(hex(randomblob(16))),
        sd.store_id,
        NEW.item_id,
        'SALE',
        -NEW.quantity,
        NEW.invoice_id,
        CURRENT_TIMESTAMP
    FROM sales_invoices si
    JOIN store_days sd ON si.store_day_id = sd.id
    WHERE si.id = NEW.invoice_id;
END;

-- ==============================================================================
-- SMRITI-OS: Unified Retail & Procurement Database Schema (SQLite WASM)
-- Architecture: SQLite (Offline-First Edge Compatibility)
-- Consolidated Enterprise Edition v2.0 (Audit Hardened)
-- ==============================================================================

-- 1. ENTERPRISE MASTERS

CREATE TABLE IF NOT EXISTS vendors (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    gstin TEXT,
    contact_details TEXT, 
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sales_personnel (
    id TEXT PRIMARY KEY,
    store_id TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'INTERNAL',
    contact_details TEXT, 
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customer_groups (
    id TEXT PRIMARY KEY,
    group_code TEXT UNIQUE NOT NULL,   -- e.g., 'B2C-RETAIL', 'B2B-WHOLESALE'
    group_name TEXT NOT NULL,          -- e.g., 'Standard Walk-in', 'Registered Distributors'
    tax_type TEXT DEFAULT 'INCLUSIVE', -- 'INCLUSIVE' or 'EXCLUSIVE'
    destination_code TEXT NOT NULL,    -- 'LOC' (Local), 'OUT' (Outstation)
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    group_id TEXT REFERENCES customer_groups(id), 
    phone_number TEXT UNIQUE NOT NULL,
    name TEXT,
    gstin TEXT,                        -- 15-digit GSTIN
    state_code TEXT,                   -- 2-digit State Code (e.g. '29' for Karnataka)
    is_b2b INTEGER DEFAULT 0,
    loyalty_membership_status INTEGER DEFAULT 0,
    loyalty_tier TEXT DEFAULT 'BRONZE',
    customer_price_group_id TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- SOVEREIGN CATALOGUE HIERARCHY
CREATE TABLE IF NOT EXISTS style_master (
    id TEXT PRIMARY KEY,
    style_code TEXT UNIQUE NOT NULL,
    description TEXT NOT NULL,
    brand_code TEXT,
    class_code TEXT,
    subclass_code TEXT,
    department_code TEXT,
    season_code TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS size_groups (
    id TEXT PRIMARY KEY,
    group_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    sizes_json TEXT NOT NULL, -- e.g. ["S", "M", "L", "XL"]
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- UNIVERSAL CATEGORY LOOKUP (GenLookup)
CREATE TABLE IF NOT EXISTS general_lookups (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL, -- BRAND, COLOR, MATERIAL, FABRIC, SEASON, TAX_DESTINATION etc.
    code TEXT NOT NULL,     -- Unique within category
    description TEXT,
    is_system INTEGER DEFAULT 0, -- Locked core categories
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(category, code)
);

-- INITIAL SEEDING
INSERT OR IGNORE INTO general_lookups (id, category, code, description, is_system) VALUES 
('LK-001', 'TAX_DESTINATION', 'LOC', 'Local (Intra-state)', 1),
('LK-002', 'TAX_DESTINATION', 'OUT', 'Outstation (Inter-state)', 1);

INSERT OR IGNORE INTO customer_groups (id, group_code, group_name, tax_type, destination_code) VALUES 
('CG-001', 'B2C-RETAIL', 'Retail Customer', 'INCLUSIVE', 'LOC'),
('CG-002', 'B2B-WHOLESALE', 'Wholesale Partner', 'EXCLUSIVE', 'LOC');

CREATE TABLE IF NOT EXISTS item_master (
    id TEXT PRIMARY KEY,
    style_id TEXT REFERENCES style_master(id), -- Link to Parent Style
    item_code TEXT UNIQUE NOT NULL,    
    description TEXT NOT NULL,         
    brand_code TEXT,                   
    class_code TEXT,                   
    subclass_code TEXT,                
    style_code TEXT,                   
    fabric_code TEXT,                  
    color_code TEXT,                   
    shade_code TEXT,                   
    size_code TEXT,                    
    fit_code TEXT,                     
    uom TEXT DEFAULT 'PCS',            
    vendor_id TEXT REFERENCES vendors(id), 
    reorder_level REAL DEFAULT 0,      
    max_level REAL DEFAULT 0,          
    purchase_price REAL DEFAULT 0,     
    cost_price REAL DEFAULT 0,         
    dealer_price REAL DEFAULT 0,       
    mrp REAL NOT NULL,                 
    mop REAL NOT NULL,                 
    hsn_sac_code TEXT,                 
    tax_pct REAL DEFAULT 0,            
    cess_pct REAL DEFAULT 0,           
    allow_discount INTEGER DEFAULT 1,  
    is_active INTEGER DEFAULT 1,       
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS barcodes (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL REFERENCES item_master(id) ON DELETE CASCADE,
    barcode TEXT UNIQUE NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 2. SALES PROMOTION ENGINE (Shoper 9 Grade)

CREATE TABLE IF NOT EXISTS sales_promotions (
    id TEXT PRIMARY KEY,
    promo_code TEXT UNIQUE NOT NULL,
    description TEXT,
    promo_type TEXT NOT NULL, -- ITEM_DISCOUNT, BILL_DISCOUNT, BOGO, BUNDLE
    priority INTEGER DEFAULT 10,
    start_date TEXT, 
    end_date TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS promotion_rules (
    id TEXT PRIMARY KEY,
    promo_id TEXT NOT NULL REFERENCES sales_promotions(id) ON DELETE CASCADE,
    rule_type TEXT NOT NULL, 
    rule_value REAL NOT NULL,
    target_type TEXT, 
    target_value REAL,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS promotion_assignments (
    id TEXT PRIMARY KEY,
    promo_id TEXT NOT NULL REFERENCES sales_promotions(id) ON DELETE CASCADE,
    assign_type TEXT NOT NULL, 
    assign_value TEXT NOT NULL, 
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 3. PROCUREMENT & STOCK

CREATE TABLE IF NOT EXISTS purchase_orders (
    id TEXT PRIMARY KEY,
    vendor_id TEXT NOT NULL REFERENCES vendors(id),
    po_number TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'DRAFT',
    total_amount REAL DEFAULT 0.00,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS po_items (
    id TEXT PRIMARY KEY,
    po_id TEXT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL REFERENCES item_master(id),
    quantity REAL NOT NULL,
    rate REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS goods_inward (
    id TEXT PRIMARY KEY,
    vendor_id TEXT NOT NULL REFERENCES vendors(id),
    grn_number TEXT UNIQUE NOT NULL,
    po_id TEXT REFERENCES purchase_orders(id),
    invoice_no TEXT,
    gate_entry_no TEXT,
    freight_charges REAL DEFAULT 0.00,
    status TEXT DEFAULT 'POSTED',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS goods_inward_items (
    id TEXT PRIMARY KEY,
    gi_id TEXT NOT NULL REFERENCES goods_inward(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL REFERENCES item_master(id),
    billed_qty REAL NOT NULL,
    received_qty REAL NOT NULL,
    rejected_qty REAL DEFAULT 0.00,
    rate REAL NOT NULL,
    tax_pct REAL DEFAULT 0,
    tax_amt REAL DEFAULT 0,
    landed_rate REAL NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stock_ledger (
    id TEXT PRIMARY KEY,
    store_id TEXT NOT NULL,
    item_id TEXT NOT NULL REFERENCES item_master(id),
    movement_type TEXT NOT NULL,
    quantity_change REAL NOT NULL,
    reference_id TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- PERFORMANCE INDICES (Essential for high-scale audits)
CREATE INDEX IF NOT EXISTS idx_stock_ledger_item ON stock_ledger(item_id, store_id);
CREATE INDEX IF NOT EXISTS idx_gi_items_gi_id ON goods_inward_items(gi_id);

-- 4. HOUSEKEEPING & TILL MANAGEMENT

CREATE TABLE IF NOT EXISTS store_days (
    id TEXT PRIMARY KEY,
    store_id TEXT NOT NULL,
    business_date TEXT NOT NULL,
    status TEXT DEFAULT 'OPEN',
    opened_at TEXT DEFAULT CURRENT_TIMESTAMP,
    closed_at TEXT,
    UNIQUE(store_id, business_date)
);

CREATE TABLE IF NOT EXISTS till_sessions (
    id TEXT PRIMARY KEY,
    till_id TEXT NOT NULL,
    store_day_id TEXT NOT NULL REFERENCES store_days(id),
    salesman_id TEXT REFERENCES sales_personnel(id),
    opening_balance REAL DEFAULT 0.00,
    closing_balance REAL,
    status TEXT DEFAULT 'OPEN',
    opened_at TEXT DEFAULT CURRENT_TIMESTAMP,
    closed_at TEXT,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 5. RETAIL SALES

CREATE TABLE IF NOT EXISTS sales_invoices (
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
    tax_type TEXT DEFAULT 'LOCAL',     -- LOCAL | OUTSTATION
    billing_type TEXT DEFAULT 'B2C',   -- B2B | B2C
    buyer_gstin TEXT,
    status TEXT DEFAULT 'POSTED',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sales_items (
    id TEXT PRIMARY KEY,
    invoice_id TEXT NOT NULL REFERENCES sales_invoices(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL REFERENCES item_master(id),
    quantity REAL NOT NULL,
    mrp REAL NOT NULL,
    rate REAL NOT NULL,
    discount_amount REAL DEFAULT 0.00,
    tax_amount REAL DEFAULT 0.00,
    cgst_amt REAL DEFAULT 0.00,
    sgst_amt REAL DEFAULT 0.00,
    igst_amt REAL DEFAULT 0.00,
    total REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS sales_payments (
    id TEXT PRIMARY KEY,
    invoice_id TEXT NOT NULL REFERENCES sales_invoices(id) ON DELETE CASCADE,
    payment_mode TEXT NOT NULL,
    amount REAL NOT NULL,
    transaction_reference TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 6. INVENTORY AUDIT (Shoper 9 Trail)

CREATE TABLE IF NOT EXISTS inventory_audits (
    id TEXT PRIMARY KEY,
    title TEXT,
    audit_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    scope TEXT, -- 'FULL', 'CATEGORY', 'BRAND'
    status TEXT -- 'OPEN', 'POSTED', 'CANCELLED'
);

CREATE TABLE IF NOT EXISTS inventory_audit_items (
    id TEXT PRIMARY KEY,
    audit_id TEXT NOT NULL REFERENCES inventory_audits(id),
    item_id TEXT NOT NULL REFERENCES item_master(id),
    system_qty REAL,
    physical_qty REAL DEFAULT 0,
    variance REAL
);

-- 7. BARCODE TEMPLATES (Universal Engine)

CREATE TABLE IF NOT EXISTS barcode_templates (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    type TEXT DEFAULT 'ZPL',  
    raw_content TEXT NOT NULL, 
    is_default INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 8. SYSTEM CONFIGURATIONS (Hardened Setups)

CREATE TABLE IF NOT EXISTS store_profile (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    address_line1 TEXT, address_line2 TEXT,
    city TEXT, state TEXT, pincode TEXT,
    gstin TEXT, pan_no TEXT, phone TEXT, email TEXT,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS configurations (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    data_type TEXT DEFAULT 'BOOLEAN', 
    description TEXT,
    is_locked INTEGER DEFAULT 0, 
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS numbering_prefixes (
    entity_code TEXT PRIMARY KEY, 
    prefix TEXT NOT NULL,        
    suffix TEXT,
    start_number INTEGER DEFAULT 1,
    current_number INTEGER DEFAULT 1,
    padding INTEGER DEFAULT 4,    
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
-- ── I N V E N T O R Y  L O C K D O W N  ( S T O C K  T A K E ) ──
CREATE TABLE IF NOT EXISTS stock_audit_sessions (
    id TEXT PRIMARY KEY,
    session_code TEXT UNIQUE NOT NULL,
    start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    end_time DATETIME,
    status TEXT DEFAULT 'IN_PROGRESS', -- IN_PROGRESS, FINALIZED, CANCELLED
    scope_category TEXT, -- BRAND, DEPARTMENT, or NULL for FULL_STORE
    scope_value TEXT,
    created_by TEXT
);

CREATE TABLE IF NOT EXISTS stock_audit_scans (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    scan_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    device_id TEXT,
    FOREIGN KEY (session_id) REFERENCES stock_audit_sessions(id),
    FOREIGN KEY (item_id) REFERENCES item_master(id)
);

-- ── S T O C K   L E D G E R   E N H A N C E M E N T ──
-- Ensure entry_type supports ADJUSTMENT
-- (item_id, qty, rate, entry_type, ref_id)

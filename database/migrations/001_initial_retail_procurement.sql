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
-- SMRITI-OS: Unified Retail & Procurement Database Schema
-- Architecture: Supabase/PostgreSQL (Multi-Engine Compatible)
-- Philosophy: "Memory, Not Code" (Logic in DB, not Application)
-- ==============================================================================

-- ==============================================================================
-- UP
-- ==============================================================================

-- 1. BASE FUNCTIONS
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. ENTERPRISE MASTERS

CREATE TABLE vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    gstin VARCHAR(50),
    contact_details JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE sales_personnel (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL, -- Assuming multi-store
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255),
    loyalty_membership_status BOOLEAN DEFAULT false,
    loyalty_tier VARCHAR(50) DEFAULT 'BRONZE',
    customer_price_group_id UUID,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    style VARCHAR(100),
    model VARCHAR(100),
    mrp DECIMAL(12,2) DEFAULT 0.00,
    sale_price DECIMAL(12,2) DEFAULT 0.00,
    hsn_code VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE barcodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    barcode VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TALLY INTERFACE INTEGRATION

CREATE TABLE tally_ledger_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    local_ledger_name VARCHAR(100) UNIQUE NOT NULL,
    tally_ledger_name VARCHAR(255) NOT NULL, -- Exact string Tally expects
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE tally_hsn_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    local_hsn_code VARCHAR(50) UNIQUE NOT NULL,
    tally_tax_class VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE tally_sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL, -- 'SALES', 'RECEIPT', 'PAYOUT'
    entity_id UUID NOT NULL,
    sync_status VARCHAR(50) DEFAULT 'PENDING', -- 'PENDING', 'SYNCED', 'FAILED'
    xml_payload TEXT,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. HOUSEKEEPING (Day Open/Close)

CREATE TABLE store_days (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL,
    business_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'OPEN', -- 'OPEN', 'CLOSED'
    opened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    closed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(store_id, business_date)
);

-- 5. LOYALTY & PROMOTIONS

CREATE TABLE sales_promotions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    promo_code VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    discount_type VARCHAR(50), -- 'PERCENTAGE', 'FLAT', 'BOGO'
    discount_value DECIMAL(12,2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT true,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE loyalty_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id),
    transaction_type VARCHAR(50) NOT NULL, -- 'EARN', 'BURN'
    points DECIMAL(12,2) NOT NULL,
    reference_invoice_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. PROCUREMENT & STOCK

CREATE TABLE purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL REFERENCES vendors(id),
    po_number VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'DRAFT', -- 'DRAFT', 'APPROVED', 'CLOSED'
    total_amount DECIMAL(12,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE po_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(id),
    quantity DECIMAL(12,3) NOT NULL,
    rate DECIMAL(12,2) NOT NULL
);

CREATE TABLE goods_inward (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL REFERENCES vendors(id),
    grn_number VARCHAR(100) UNIQUE NOT NULL,
    po_id UUID REFERENCES purchase_orders(id), -- Optional strict linkage
    status VARCHAR(50) DEFAULT 'POSTED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE goods_inward_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gi_id UUID NOT NULL REFERENCES goods_inward(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(id),
    quantity DECIMAL(12,3) NOT NULL,
    rate DECIMAL(12,2) NOT NULL
);

CREATE TABLE goods_outward (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispatch_number VARCHAR(100) UNIQUE NOT NULL,
    destination VARCHAR(255),
    status VARCHAR(50) DEFAULT 'POSTED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE goods_outward_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    go_id UUID NOT NULL REFERENCES goods_outward(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(id),
    quantity DECIMAL(12,3) NOT NULL
);

CREATE TABLE stock_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL,
    item_id UUID NOT NULL REFERENCES items(id),
    movement_type VARCHAR(50) NOT NULL, -- 'INWARD', 'OUTWARD', 'SALE', 'RETURN', 'ADJUSTMENT'
    quantity_change DECIMAL(12,3) NOT NULL, -- Positive for in, negative for out
    reference_id UUID NOT NULL, -- ID of the GI, GO, or POS transaction
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. TILL & CASH MANAGEMENT

CREATE TABLE tills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL,
    till_name VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE till_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    till_id UUID NOT NULL REFERENCES tills(id),
    store_day_id UUID NOT NULL REFERENCES store_days(id),
    salesman_id UUID REFERENCES sales_personnel(id),
    opening_balance DECIMAL(12,2) DEFAULT 0.00,
    closing_balance DECIMAL(12,2),
    status VARCHAR(50) DEFAULT 'OPEN', -- 'OPEN', 'CLOSED'
    opened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    closed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE cash_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    till_session_id UUID NOT NULL REFERENCES till_sessions(id),
    transaction_type VARCHAR(50) NOT NULL, -- 'PAYOUT', 'RECEIPT', 'LIFT'
    amount DECIMAL(12,2) NOT NULL,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. RETAIL SALES

CREATE TABLE sales_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_day_id UUID NOT NULL REFERENCES store_days(id),
    till_session_id UUID NOT NULL REFERENCES till_sessions(id),
    salesman_id UUID NOT NULL REFERENCES sales_personnel(id),
    customer_id UUID REFERENCES customers(id), -- Optional (Walk-in)
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    subtotal DECIMAL(12,2) DEFAULT 0.00,
    discount_amount DECIMAL(12,2) DEFAULT 0.00,
    tax_amount DECIMAL(12,2) DEFAULT 0.00,
    net_total DECIMAL(12,2) DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'POSTED', -- 'POSTED', 'VOID', 'RETURNED'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE sales_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES sales_invoices(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(id),
    quantity DECIMAL(12,3) NOT NULL,
    mrp DECIMAL(12,2) NOT NULL,
    rate DECIMAL(12,2) NOT NULL,
    discount_amount DECIMAL(12,2) DEFAULT 0.00,
    tax_amount DECIMAL(12,2) DEFAULT 0.00,
    total DECIMAL(12,2) NOT NULL
);

CREATE TABLE sales_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES sales_invoices(id) ON DELETE CASCADE,
    payment_mode VARCHAR(50) NOT NULL, -- 'CASH', 'CREDIT_CARD', 'UPI', 'LOYALTY_POINTS'
    amount DECIMAL(12,2) NOT NULL,
    transaction_reference VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================================
-- TRIGGERS & VIEWS (Memory, Not Code Engine)
-- ==============================================================================

-- Attach updated_at triggers to all core tables
CREATE TRIGGER set_updated_at_vendors BEFORE UPDATE ON vendors FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_items BEFORE UPDATE ON items FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_customers BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_sales_invoices BEFORE UPDATE ON sales_invoices FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_till_sessions BEFORE UPDATE ON till_sessions FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- VIEW: Real-Time Stock Ledger Computation
CREATE OR REPLACE VIEW current_stock_vw AS
SELECT 
    store_id,
    item_id,
    SUM(quantity_change) as current_quantity
FROM stock_ledger
GROUP BY store_id, item_id;

-- TRIGGER: Auto-Award Loyalty Points on Sale
CREATE OR REPLACE FUNCTION award_loyalty_points()
RETURNS TRIGGER AS $$
DECLARE
    pts_to_award DECIMAL(12,2);
BEGIN
    IF NEW.status = 'POSTED' AND NEW.customer_id IS NOT NULL THEN
        -- Check if customer is loyalty member
        IF EXISTS (SELECT 1 FROM customers WHERE id = NEW.customer_id AND loyalty_membership_status = true) THEN
            -- Simple rule: 1 point per 100 currency units
            pts_to_award := TRUNC(NEW.net_total / 100);
            IF pts_to_award > 0 THEN
                INSERT INTO loyalty_transactions (customer_id, transaction_type, points, reference_invoice_id)
                VALUES (NEW.customer_id, 'EARN', pts_to_award, NEW.id);
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_award_loyalty_points
AFTER INSERT ON sales_invoices
FOR EACH ROW
EXECUTE FUNCTION award_loyalty_points();

-- TRIGGER: Auto-Post Sales to Stock Ledger
CREATE OR REPLACE FUNCTION post_sale_to_stock_ledger()
RETURNS TRIGGER AS $$
DECLARE
    v_store_id UUID;
BEGIN
    -- Get store_id from invoice
    SELECT sd.store_id INTO v_store_id FROM sales_invoices si JOIN store_days sd ON si.store_day_id = sd.id WHERE si.id = NEW.invoice_id;
    
    INSERT INTO stock_ledger (store_id, item_id, movement_type, quantity_change, reference_id)
    VALUES (v_store_id, NEW.item_id, 'SALE', -NEW.quantity, NEW.invoice_id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_post_sale_to_stock_ledger
AFTER INSERT ON sales_items
FOR EACH ROW
EXECUTE FUNCTION post_sale_to_stock_ledger();

-- ==============================================================================
-- DOWN (Rollback)
-- ==============================================================================
/*
DROP TRIGGER IF EXISTS trg_post_sale_to_stock_ledger ON sales_items;
DROP FUNCTION IF EXISTS post_sale_to_stock_ledger();

DROP TRIGGER IF EXISTS trg_award_loyalty_points ON sales_invoices;
DROP FUNCTION IF EXISTS award_loyalty_points();

DROP VIEW IF EXISTS current_stock_vw;

DROP TABLE IF EXISTS sales_payments;
DROP TABLE IF EXISTS sales_items;
DROP TABLE IF EXISTS sales_invoices;
DROP TABLE IF EXISTS cash_transactions;
DROP TABLE IF EXISTS till_sessions;
DROP TABLE IF EXISTS tills;
DROP TABLE IF EXISTS stock_ledger;
DROP TABLE IF EXISTS goods_outward_items;
DROP TABLE IF EXISTS goods_outward;
DROP TABLE IF EXISTS goods_inward_items;
DROP TABLE IF EXISTS goods_inward;
DROP TABLE IF EXISTS po_items;
DROP TABLE IF EXISTS purchase_orders;
DROP TABLE IF EXISTS loyalty_transactions;
DROP TABLE IF EXISTS sales_promotions;
DROP TABLE IF EXISTS store_days;
DROP TABLE IF EXISTS tally_sync_logs;
DROP TABLE IF EXISTS tally_hsn_mappings;
DROP TABLE IF EXISTS tally_ledger_mappings;
DROP TABLE IF EXISTS barcodes;
DROP TABLE IF EXISTS items;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS sales_personnel;
DROP TABLE IF EXISTS vendors;

DROP FUNCTION IF EXISTS set_updated_at();
*/

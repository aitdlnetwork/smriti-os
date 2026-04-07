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

-- SHARD 3: SMRITI-OS Retail Transactions Database
-- This database handles high-velocity stock movements and billing logic.

CREATE TABLE IF NOT EXISTS inventory_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    quantity_change INTEGER NOT NULL,
    transaction_type VARCHAR(50) NOT NULL,
    reference_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    -- Note: Because product_id lives in another DB entirely, standard FOREIGN KEY constraints 
    -- cannot be defined across SQLite files. It is structurally enforced by our FastAPI routing and triggers.
);

-- ==========================================
-- FEDERATED CROSS-DATABASE TRIGGERS
-- ==========================================
-- SMRITI-OS Intelligence Principle: Memory, Not Code.
-- These triggers assume that the 'master.db' has been ATTACHED as 'master_db' 
-- by the connection engine prior to executing the INSERT.

CREATE TRIGGER IF NOT EXISTS prevent_negative_stock BEFORE INSERT ON inventory_transactions
BEGIN
    SELECT RAISE(ABORT, 'Transaction failed: Insufficient stock exists in Master DB for this movement')
    WHERE (SELECT stock FROM master_db.products WHERE id = NEW.product_id) + NEW.quantity_change < 0;
END;

CREATE TRIGGER IF NOT EXISTS adjust_master_stock AFTER INSERT ON inventory_transactions
BEGIN
    UPDATE master_db.products
    SET stock = stock + NEW.quantity_change
    WHERE id = NEW.product_id;
END;

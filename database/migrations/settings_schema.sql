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

-- SHARD 2: SMRITI-OS Business Settings Database
-- This database stores global configurations and tax rules. High security, low write operations.

CREATE TABLE IF NOT EXISTS global_config (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    description VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS tax_matrices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tax_code VARCHAR(50) UNIQUE NOT NULL,
    percentage DECIMAL(5, 2) NOT NULL
);

-- DYNAMIC UI CONFIGURATION TABLES (Shoper 9 Config Parity)
CREATE TABLE IF NOT EXISTS ui_grid_configs (
    module_id VARCHAR(50) PRIMARY KEY,
    grid_schema_json TEXT NOT NULL,
    allow_pdt_load BOOLEAN DEFAULT FALSE,
    stock_validation_level INTEGER DEFAULT 0 -- 0=None, 1=Warn, 2=Block, 3=Strict Lock
);

CREATE TABLE IF NOT EXISTS system_parameters (
    parameter_group VARCHAR(50) NOT NULL,
    parameter_key VARCHAR(100) NOT NULL,
    parameter_value TEXT,
    PRIMARY KEY (parameter_group, parameter_key)
);

-- Insert default configurations
INSERT OR IGNORE INTO global_config (key, value, description) VALUES 
('company_name', 'SMRITI-OS Retailer', 'Set the receipt header standard.'),
('currency', 'INR', 'Default system currency.');

-- Defaults for Purchase Order Grid based on Shoper 9 Defaults
INSERT OR IGNORE INTO ui_grid_configs (module_id, grid_schema_json, allow_pdt_load, stock_validation_level) VALUES 
('PO', '[{"id":"itemCode","label":"Stock No","type":"text","mandatory":true,"visible":true},{"id":"description","label":"Desc","type":"text","mandatory":false,"visible":true},{"id":"class1","label":"Class1","type":"text","mandatory":false,"visible":false},{"id":"size","label":"Size","type":"text","mandatory":false,"visible":false},{"id":"qty","label":"Qty","type":"numeric","mandatory":true,"visible":true},{"id":"rate","label":"Rate","type":"numeric","mandatory":true,"visible":true}]', FALSE, 0),
('GRN', '[{"id":"itemCode","label":"Stock No","type":"text","mandatory":true,"visible":true},{"id":"description","label":"Desc","type":"text","mandatory":false,"visible":true},{"id":"size","label":"Size","type":"text","mandatory":false,"visible":false},{"id":"docQty","label":"Doc Qty","type":"numeric","mandatory":false,"visible":true},{"id":"actQty","label":"Act Qty","type":"numeric","mandatory":true,"visible":true}]', TRUE, 1);

INSERT OR IGNORE INTO system_parameters (parameter_group, parameter_key, parameter_value) VALUES 
('Outwards', 'import_goods_inwards_into_outwards', 'TRUE'),
('Outwards', 'enable_lsq', 'FALSE');


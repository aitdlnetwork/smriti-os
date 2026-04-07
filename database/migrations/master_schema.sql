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

-- SHARD 1: SMRITI-OS Master Inventory Database
-- This database stores truth tables (products, SKUs, core prices).

CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sku VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    standard_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    stock INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  S M R I T I - O S   ||   E N T E R P R I S E   E D I T I O N
 *  "ERP Simplified. Run Your Entire Business on Memory, Not Code."
 * ─────────────────────────────────────────────────────────────────────────────
 *  System Architect  : Jawahar R Mallah
 *  Parent Org        : AITDL NETWORK
 *  Copyright         : © 2026 AITDL.com & AITDL.in. All Rights Reserved.
 *
 *  Database Engine   : Sovereign WASM SQLite (Offline-First)
 *  Persistence Layer : IndexedDB via localForage
 * ─────────────────────────────────────────────────────────────────────────────
 */

import initSqlJs, { Database, SqlJsStatic } from "sql.js";
import localforage from "localforage";

const DB_NAME = "smriti_os_enterprise_v2";
const DB_KEY = "database_data";

class SmritiDatabase {
  private static instance: SmritiDatabase;
  private db: Database | null = null;
  public isInitialized = false;

  private constructor() {}

  public static getInstance(): SmritiDatabase {
    if (!SmritiDatabase.instance) {
      SmritiDatabase.instance = new SmritiDatabase();
    }
    return SmritiDatabase.instance;
  }

  /**
   * Initializes the SQL.js engine, loads existing database from IndexedDB,
   * or creates a new one and applies the schema from public/001_retail_schema.sql.
   */
  public async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const SQL: SqlJsStatic = await initSqlJs({
        locateFile: (file) => `/${file}`,
      });

      const savedData: Uint8Array | null = await localforage.getItem(DB_KEY);

      if (savedData) {
        console.log("[SMRITI-OS DB] Restoring database from local storage...");
        this.db = new SQL.Database(savedData);
      } else {
        console.log("[SMRITI-OS DB] Creating fresh sovereign database...");
        this.db = new SQL.Database();
        await this.populateInitialSchema();
      }

      await this.syncSchema();
      this.isInitialized = true;
      console.log("[SMRITI-OS DB] Engine online.");
    } catch (err) {
      console.error("[SMRITI-OS DB] Initialization failed:", err);
      throw err;
    }
  }

  private async populateInitialSchema(): Promise<void> {
    if (!this.db) return;
    const response = await fetch("/001_retail_schema.sql");
    if (!response.ok) {
      throw new Error(`Schema fetch failed: ${response.status} ${response.statusText}`);
    }
    const schemaSql = await response.text();
    this.db.run(schemaSql);
    console.log("[SMRITI-OS DB] Initial Retail/Procurement schema populated.");
  }

  /**
   * S Y N C   S C H E M A
   * Ensures that new tables/columns added in previous updates are present
   * in the user's existing IndexedDB instance.
   */
  /**
   * Checks if a table has a specific column. Used to detect stale schemas from
   * the old PostgreSQL-syntax initial file and rebuild them safely.
   */
  private tableHasColumn(table: string, col: string): boolean {
    try {
      const cols = this.exec(`PRAGMA table_info(${table})`).map((r: unknown) => (r as Record<string, unknown>).name as string);
      return cols.includes(col);
    } catch { return false; }
  }

  private tableExists(table: string): boolean {
    try {
      const r = this.exec(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`, [table]);
      return r.length > 0;
    } catch { return false; }
  }

  /**
   * Drops a table only if it exists with an INCOMPATIBLE schema (missing a
   * required column). Safe because these tables never had valid data in them.
   */
  private rebuildIfStale(table: string, requiredCol: string, createSql: string): void {
    if (this.tableExists(table) && !this.tableHasColumn(table, requiredCol)) {
      console.log(`[SMRITI-OS DB] Stale table detected: ${table}. Rebuilding…`);
      this.db!.run(`DROP TABLE IF EXISTS ${table}`);
    }
    this.db!.run(createSql);
  }

  private async syncSchema(): Promise<void> {
    if (!this.db) return;
    console.log("[SMRITI-OS DB] Synchronizing enterprise catalogue schema v4…");

    // ── MIGRATION 1: Core tables (safe, idempotent) ───────────────────────────
    this.db.run(`
      CREATE TABLE IF NOT EXISTS general_lookups (
        id TEXT PRIMARY KEY, category TEXT NOT NULL, code TEXT NOT NULL,
        description TEXT, sort_order INTEGER DEFAULT 0, is_system INTEGER DEFAULT 0,
        UNIQUE(category, code)
      );
      CREATE TABLE IF NOT EXISTS stock_audit_sessions (
        id TEXT PRIMARY KEY, session_code TEXT UNIQUE NOT NULL,
        start_time DATETIME DEFAULT CURRENT_TIMESTAMP, end_time DATETIME,
        status TEXT DEFAULT 'IN_PROGRESS', scope_category TEXT, scope_value TEXT, created_by TEXT
      );
      CREATE TABLE IF NOT EXISTS stock_audit_scans (
        id TEXT PRIMARY KEY, session_id TEXT NOT NULL, item_id TEXT NOT NULL,
        scan_time DATETIME DEFAULT CURRENT_TIMESTAMP, device_id TEXT,
        FOREIGN KEY (session_id) REFERENCES stock_audit_sessions(id),
        FOREIGN KEY (item_id) REFERENCES item_master(id)
      );
    `);

    // ── MIGRATION 2: Item Classification (4-Level Hierarchy) ─────────────────
    this.db.run(`
      CREATE TABLE IF NOT EXISTS item_classifications (
        id TEXT PRIMARY KEY,
        level INTEGER NOT NULL CHECK(level IN (1,2,3,4)),
        code TEXT NOT NULL, name TEXT NOT NULL,
        parent_id TEXT REFERENCES item_classifications(id),
        size_group_id TEXT, sort_order INTEGER DEFAULT 0, is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(level, code)
      );
    `);

    // ── MIGRATION 3: Tax Codes ────────────────────────────────────────────────
    this.db.run(`
      CREATE TABLE IF NOT EXISTS tax_codes (
        id TEXT PRIMARY KEY, code TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
        hsn_code TEXT DEFAULT '', gst_rate REAL DEFAULT 0,
        cgst_rate REAL DEFAULT 0, sgst_rate REAL DEFAULT 0,
        igst_rate REAL DEFAULT 0, cess_rate REAL DEFAULT 0,
        tax_type TEXT DEFAULT 'GST', is_inclusive INTEGER DEFAULT 0, is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ── MIGRATION 4: Payment Modes ────────────────────────────────────────────
    this.db.run(`
      CREATE TABLE IF NOT EXISTS payment_modes (
        id TEXT PRIMARY KEY, code TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
        mode_type TEXT NOT NULL, config_json TEXT DEFAULT '{}',
        sort_order INTEGER DEFAULT 0, is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ── MIGRATION 5: Price Revisions ──────────────────────────────────────────
    this.db.run(`
      CREATE TABLE IF NOT EXISTS price_revisions (
        id TEXT PRIMARY KEY, revision_code TEXT UNIQUE NOT NULL,
        reason TEXT, effective_date TEXT NOT NULL,
        status TEXT DEFAULT 'DRAFT',
        authorized_by TEXT, authorized_at TEXT,
        created_by TEXT DEFAULT 'ADMIN',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS price_revision_items (
        id TEXT PRIMARY KEY,
        revision_id TEXT NOT NULL REFERENCES price_revisions(id) ON DELETE CASCADE,
        item_id TEXT NOT NULL REFERENCES item_master(id),
        old_mrp REAL DEFAULT 0, new_mrp REAL DEFAULT 0,
        old_dealer_price REAL DEFAULT 0, new_dealer_price REAL DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_pri_revision ON price_revision_items(revision_id);
    `);

    // ── MIGRATION 6: item_master column extensions (safe ALTER TABLE) ─────────
    const imCols = this.exec(`PRAGMA table_info(item_master)`).map((r: any) => r.name as string);
    const newCols: Array<[string, string]> = [
      ["hsn_code","TEXT DEFAULT ''"], ["dealer_price","REAL DEFAULT 0"],
      ["cost_price","REAL DEFAULT 0"], ["weight_grams","REAL DEFAULT 0"],
      ["allow_returns","INTEGER DEFAULT 1"], ["is_combo","INTEGER DEFAULT 0"],
      ["classification_id","TEXT"], ["tax_code_id","TEXT"], ["barcode","TEXT DEFAULT ''"],
      ["department_code","TEXT DEFAULT ''"], ["collection_code","TEXT DEFAULT ''"],
      ["fit_code","TEXT DEFAULT ''"], ["fabric_code","TEXT DEFAULT ''"],
      ["gender_code","TEXT DEFAULT ''"], ["tax_pct","REAL DEFAULT 0"],
      ["uom","TEXT DEFAULT 'PCS'"],
    ];
    for (const [col, def] of newCols) {
      if (!imCols.includes(col)) {
        try { this.db.run(`ALTER TABLE item_master ADD COLUMN ${col} ${def}`); } catch {}
      }
    }

    // ── MIGRATION 7: general_lookups sort_order column ────────────────────────
    const glCols = this.exec(`PRAGMA table_info(general_lookups)`).map((r: any) => r.name as string);
    if (!glCols.includes("sort_order")) {
      try { this.db.run(`ALTER TABLE general_lookups ADD COLUMN sort_order INTEGER DEFAULT 0`); } catch {}
    }

    // ── SEED: Rich General Lookups ────────────────────────────────────────────
    const gl = `INSERT OR IGNORE INTO general_lookups (id,category,code,description,sort_order,is_system) VALUES`;
    this.db.run(`${gl} ('glb1','BRAND','ADIDAS','Adidas Originals',1,0),('glb2','BRAND','NIKE','Nike Sportswear',2,0),('glb3','BRAND','PUMA','Puma Sports',3,0),('glb4','BRAND','LEVIS','Levis Denim',4,0),('glb5','BRAND','ALLEN_SOLLY','Allen Solly',5,0),('glb6','BRAND','PETER_ENGLAND','Peter England',6,0),('glb7','BRAND','VAN_HEUSEN','Van Heusen',7,0),('glb8','BRAND','ARROW','Arrow',8,0);`);
    this.db.run(`${gl} ('glc1','COLOR','RED','Classic Red',1,0),('glc2','COLOR','BLUE','Navy Blue',2,0),('glc3','COLOR','BLACK','Jet Black',3,0),('glc4','COLOR','WHITE','Optical White',4,0),('glc5','COLOR','GREEN','Forest Green',5,0),('glc6','COLOR','GREY','Charcoal Grey',6,0),('glc7','COLOR','PINK','Rose Pink',7,0),('glc8','COLOR','BROWN','Chocolate Brown',8,0),('glc9','COLOR','MAROON','Maroon',9,0),('glc10','COLOR','YELLOW','Sunshine Yellow',10,0);`);
    this.db.run(`${gl} ('gls1','SEASON','SS2024','Spring Summer 2024',1,0),('gls2','SEASON','AW2024','Autumn Winter 2024',2,0),('gls3','SEASON','SS2025','Spring Summer 2025',3,0),('gls4','SEASON','FESTIVE24','Festive 2024',4,0);`);
    this.db.run(`${gl} ('gld1','DEPARTMENT','MENS','Mens',1,0),('gld2','DEPARTMENT','WOMENS','Womens',2,0),('gld3','DEPARTMENT','KIDS','Kids',3,0),('gld4','DEPARTMENT','UNISEX','Unisex',4,0);`);
    this.db.run(`${gl} ('glcl1','CLASS','APPAREL','Apparel',1,0),('glcl2','CLASS','FOOTWEAR','Footwear',2,0),('glcl3','CLASS','ACCESSORIES','Accessories',3,0),('glcl4','CLASS','BAGS','Bags',4,0);`);
    this.db.run(`${gl} ('glsc1','SUB_CLASS','TSHIRTS','T-Shirts',1,0),('glsc2','SUB_CLASS','SHIRTS','Shirts',2,0),('glsc3','SUB_CLASS','TROUSERS','Trousers',3,0),('glsc4','SUB_CLASS','JEANS','Jeans',4,0),('glsc5','SUB_CLASS','JACKETS','Jackets',5,0),('glsc6','SUB_CLASS','DRESSES','Dresses',6,0);`);
    this.db.run(`${gl} ('glm1','MATERIAL','COTTON','100% Cotton',1,0),('glm2','MATERIAL','POLYESTER','Polyester',2,0),('glm3','MATERIAL','LINEN','Pure Linen',3,0),('glm4','MATERIAL','DENIM','Denim Twill',4,0),('glm5','MATERIAL','WOOL','Merino Wool',5,0);`);
    this.db.run(`${gl} ('glf1','FIT','REGULAR','Regular Fit',1,0),('glf2','FIT','SLIM','Slim Fit',2,0),('glf3','FIT','RELAXED','Relaxed Fit',3,0),('glf4','FIT','OVERSIZED','Oversized',4,0);`);
    this.db.run(`${gl} ('glg1','GENDER','M','Male',1,0),('glg2','GENDER','F','Female',2,0),('glg3','GENDER','U','Unisex',3,0);`);
    this.db.run(`${gl} ('glu1','UOM','PCS','Pieces',1,1),('glu2','UOM','PAIR','Pair',2,1),('glu3','UOM','SET','Set',3,1),('glu4','UOM','BOX','Box',4,1);`);
    this.db.run(`${gl} ('glk1','COLLECTION','CLASSIC','Classic Collection',1,0),('glk2','COLLECTION','PREMIUM','Premium Collection',2,0),('glk3','COLLECTION','SPORT','Sport Collection',3,0),('glk4','COLLECTION','FESTIVE','Festive Collection',4,0);`);
    this.db.run(`${gl} ('glfa1','FABRIC','COTTON_BLEND','Cotton Blend',1,0),('glfa2','FABRIC','PURE_COTTON','Pure Cotton',2,0),('glfa3','FABRIC','POLYESTER_BLEND','Polyester Blend',3,0);`);

    // ── SEED: Item Classifications ────────────────────────────────────────────
    this.db.run(`
      INSERT OR IGNORE INTO item_classifications (id,level,code,name,parent_id,size_group_id,sort_order) VALUES
        ('ic_sc1',1,'MW','Menswear',NULL,NULL,1),
        ('ic_sc2',1,'WW','Womenswear',NULL,NULL,2),
        ('ic_sc3',1,'KD','Kids',NULL,NULL,3),
        ('ic_c1',2,'APL','Apparel','ic_sc1',NULL,1),
        ('ic_c2',2,'FWT','Footwear','ic_sc1',NULL,2),
        ('ic_c3',2,'ACC','Accessories','ic_sc1',NULL,3),
        ('ic_s1',3,'TSH','T-Shirts','ic_c1','sg1',1),
        ('ic_s2',3,'SHT','Shirts','ic_c1','sg1',2),
        ('ic_s3',3,'TRS','Trousers','ic_c1',NULL,3),
        ('ic_s4',3,'JNS','Jeans','ic_c1',NULL,4),
        ('ic_s5',3,'JKT','Jackets','ic_c1',NULL,5);
    `);

    // ── SEED: Tax Codes (India GST) ───────────────────────────────────────────
    this.db.run(`
      INSERT OR IGNORE INTO tax_codes (id,code,name,gst_rate,cgst_rate,sgst_rate,igst_rate,tax_type,is_inclusive) VALUES
        ('tc_nil','NIL','Nil Rate (0%)',0,0,0,0,'NIL',0),
        ('tc_5','GST5','GST 5%',5,2.5,2.5,5,'GST',0),
        ('tc_12','GST12','GST 12%',12,6,6,12,'GST',0),
        ('tc_18','GST18','GST 18%',18,9,9,18,'GST',0),
        ('tc_28','GST28','GST 28%',28,14,14,28,'GST',0),
        ('tc_ex','EXEMPT','Exempt',0,0,0,0,'EXEMPT',0);
    `);

    // ── SEED: Payment Modes ───────────────────────────────────────────────────
    this.db.run(`
      INSERT OR IGNORE INTO payment_modes (id,code,name,mode_type,config_json,sort_order) VALUES
        ('pm_cash','CASH','Cash','CASH','{"denominations":true}',1),
        ('pm_card','CARD','Credit / Debit Card','CARD','{"requires_reference":true}',2),
        ('pm_upi','UPI','UPI Transfer','UPI','{"requires_reference":true}',3),
        ('pm_gc','GIFT_COUPON','Gift Coupon','COUPON','{"allow_partial":false}',4),
        ('pm_cn','CREDIT_NOTE','Credit Note','CREDIT_NOTE','{}',5),
        ('pm_wallet','WALLET','Store Wallet','WALLET','{}',6);
    `);

    // ── SEED: Size Groups ─────────────────────────────────────────────────────
    this.db.run(`
      INSERT OR IGNORE INTO size_groups (id, group_code, name, sizes_json) VALUES
        ('sg1','APPAREL_STD','Standard Apparel','["XS","S","M","L","XL","XXL","3XL"]'),
        ('sg2','FOOTWEAR_STD','Standard Footwear','["6","7","8","9","10","11","12"]'),
        ('sg3','FREE_SIZE','Free Size','["FREE"]'),
        ('sg4','KIDS_AGE','Kids Age','["2Y","4Y","6Y","8Y","10Y","12Y"]'),
        ('sg5','NUMERIC_28_38','Bottom Numeric','["28","30","32","34","36","38","40"]');
    `);

    // ── SEED: Core Store + Numbering ──────────────────────────────────────────
    this.db.run(`
      INSERT OR IGNORE INTO style_master (id, style_code, description, brand_code, class_code, subclass_code, department_code, season_code)
      VALUES ('s1', 'POLO-TSHIRT', 'Premium Cotton Polo', 'ADIDAS', 'APPAREL', 'TSHIRTS', 'MENS', 'SS2024');
      INSERT OR IGNORE INTO item_master (id, style_id, item_code, description, brand_code, color_code, shade_code, size_code, mrp, mop, uom)
      VALUES ('i1', 's1', 'MW/APL/TSH/RED/S', 'Premium Polo Red S', 'ADIDAS', 'RED', 'RD01', 'S', 1299, 999, 'PCS'),
             ('i2', 's1', 'MW/APL/TSH/RED/M', 'Premium Polo Red M', 'ADIDAS', 'RED', 'RD01', 'M', 1299, 999, 'PCS'),
             ('i3', 's1', 'MW/APL/TSH/BLUE/S', 'Premium Polo Blue S', 'ADIDAS', 'BLUE', 'BL01', 'S', 1299, 999, 'PCS');
      INSERT OR IGNORE INTO store_profile (id, name, city, state) VALUES ('store-001', 'SMRITI APPARELS', 'MUMBAI', 'MAHARASHTRA');
      INSERT OR IGNORE INTO numbering_prefixes (entity_code, prefix, current_number) VALUES ('RETAIL_BILL', 'SMR/SL/2024-25/', 1);
      INSERT OR IGNORE INTO numbering_prefixes (entity_code, prefix, current_number) VALUES ('PURCHASE_GRN', 'SMR/GRN/', 1);
      INSERT OR IGNORE INTO numbering_prefixes (entity_code, prefix, current_number) VALUES ('PRICE_REV', 'PR/', 1);
    `);

    // ── MIGRATION 8: Procurement + Stock Ledger + Billing + Config Engine ────────
    // Safe tables (brand new, never in the old PostgreSQL schema):
    this.db.run(`
      CREATE TABLE IF NOT EXISTS ui_grid_configs (
        module_id TEXT PRIMARY KEY,
        grid_schema_json TEXT NOT NULL DEFAULT '[]',
        allow_pdt_load INTEGER DEFAULT 0,
        stock_validation_level INTEGER DEFAULT 1
      );
      CREATE TABLE IF NOT EXISTS system_parameters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL,
        param_key TEXT NOT NULL,
        param_value TEXT NOT NULL DEFAULT '',
        description TEXT DEFAULT '',
        attribute_type TEXT DEFAULT 'Variable',
        UNIQUE(category, param_key)
      );
      CREATE TABLE IF NOT EXISTS purchase_orders (
        id TEXT PRIMARY KEY,
        po_number TEXT UNIQUE NOT NULL,
        po_date TEXT NOT NULL,
        vendor_code TEXT DEFAULT '',
        vendor_name TEXT DEFAULT '',
        expected_delivery_date TEXT DEFAULT '',
        status TEXT DEFAULT 'OPEN',
        total_value REAL DEFAULT 0,
        remarks TEXT DEFAULT '',
        created_by TEXT DEFAULT 'ADMIN',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS tills (
        id TEXT PRIMARY KEY,
        till_code TEXT UNIQUE NOT NULL,
        till_name TEXT NOT NULL,
        node_id TEXT DEFAULT '',
        is_active INTEGER DEFAULT 1,
        cash_limit REAL DEFAULT 50000
      );
      CREATE TABLE IF NOT EXISTS till_sessions (
        id TEXT PRIMARY KEY,
        till_id TEXT NOT NULL REFERENCES tills(id),
        opened_by TEXT NOT NULL,
        opened_at TEXT DEFAULT CURRENT_TIMESTAMP,
        closed_at TEXT,
        opening_balance REAL DEFAULT 0,
        closing_balance REAL,
        status TEXT DEFAULT 'OPEN'
      );
    `);

    // Stale-safe tables: detect if old PostgreSQL schema created them with wrong columns.
    // rebuildIfStale() drops only if the key canonical column is missing.
    this.rebuildIfStale("po_items", "po_id", `CREATE TABLE IF NOT EXISTS po_items (
      id TEXT PRIMARY KEY,
      po_id TEXT NOT NULL,
      item_code TEXT NOT NULL,
      description TEXT DEFAULT '',
      hsn_code TEXT DEFAULT '',
      qty_ordered REAL DEFAULT 0,
      qty_received REAL DEFAULT 0,
      unit_rate REAL DEFAULT 0,
      discount_pct REAL DEFAULT 0,
      tax_code TEXT DEFAULT '',
      tax_pct REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      line_total REAL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);
    try { this.db.run(`CREATE INDEX IF NOT EXISTS idx_po_items_po ON po_items(po_id)`); } catch {}

    this.rebuildIfStale("goods_inward", "grn_number", `CREATE TABLE IF NOT EXISTS goods_inward (
      id TEXT PRIMARY KEY,
      grn_number TEXT UNIQUE NOT NULL,
      grn_date TEXT NOT NULL,
      vendor_code TEXT DEFAULT '',
      vendor_name TEXT DEFAULT '',
      supplier_invoice_no TEXT DEFAULT '',
      supplier_invoice_date TEXT DEFAULT '',
      po_reference TEXT DEFAULT '',
      status TEXT DEFAULT 'POSTED',
      total_amount REAL DEFAULT 0,
      remarks TEXT DEFAULT '',
      created_by TEXT DEFAULT 'ADMIN',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    this.rebuildIfStale("goods_inward_items", "grn_id", `CREATE TABLE IF NOT EXISTS goods_inward_items (
      id TEXT PRIMARY KEY,
      grn_id TEXT NOT NULL,
      item_code TEXT NOT NULL,
      description TEXT DEFAULT '',
      hsn_code TEXT DEFAULT '',
      qty_ordered REAL DEFAULT 0,
      qty_received REAL DEFAULT 0,
      qty_accepted REAL DEFAULT 0,
      unit_cost REAL DEFAULT 0,
      discount_pct REAL DEFAULT 0,
      tax_code TEXT DEFAULT '',
      tax_pct REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      total_amount REAL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);
    try { this.db.run(`CREATE INDEX IF NOT EXISTS idx_grn_items_grn ON goods_inward_items(grn_id)`); } catch {}

    this.rebuildIfStale("goods_outward", "go_number", `CREATE TABLE IF NOT EXISTS goods_outward (
      id TEXT PRIMARY KEY,
      document_type TEXT NOT NULL,
      go_number TEXT UNIQUE NOT NULL,
      reference_no TEXT DEFAULT '',
      destination_code TEXT DEFAULT '',
      destination_name TEXT DEFAULT '',
      total_qty REAL DEFAULT 0,
      total_value REAL DEFAULT 0,
      status TEXT DEFAULT 'DRAFT',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    this.rebuildIfStale("goods_outward_items", "go_id", `CREATE TABLE IF NOT EXISTS goods_outward_items (
      id TEXT PRIMARY KEY,
      go_id TEXT NOT NULL,
      item_code TEXT NOT NULL,
      reason_code TEXT DEFAULT '',
      qty_issued REAL DEFAULT 0,
      unit_cost REAL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);
    try { this.db.run(`CREATE INDEX IF NOT EXISTS idx_go_items_go ON goods_outward_items(go_id)`); } catch {}

    this.rebuildIfStale("stock_ledger", "document_number", `CREATE TABLE IF NOT EXISTS stock_ledger (
      id TEXT PRIMARY KEY,
      item_code TEXT NOT NULL,
      movement_type TEXT NOT NULL,
      document_type TEXT NOT NULL,
      document_id TEXT NOT NULL,
      document_number TEXT NOT NULL,
      movement_date TEXT NOT NULL,
      qty_in REAL DEFAULT 0,
      qty_out REAL DEFAULT 0,
      unit_cost REAL DEFAULT 0,
      reference_note TEXT DEFAULT '',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);
    try {
      this.db.run(`CREATE INDEX IF NOT EXISTS idx_stock_ledger_item ON stock_ledger(item_code)`);
      this.db.run(`CREATE INDEX IF NOT EXISTS idx_stock_ledger_doc ON stock_ledger(document_id)`);
    } catch {}

    this.rebuildIfStale("sales_invoices", "invoice_number", `CREATE TABLE IF NOT EXISTS sales_invoices (
      id TEXT PRIMARY KEY,
      store_day_id TEXT DEFAULT '',
      till_session_id TEXT DEFAULT '',
      salesman_id TEXT DEFAULT '',
      customer_id TEXT DEFAULT '',
      invoice_number TEXT DEFAULT '',
      bill_number TEXT UNIQUE NOT NULL,
      bill_date TEXT NOT NULL,
      customer_code TEXT DEFAULT '',
      customer_name TEXT DEFAULT '',
      salesman_code TEXT DEFAULT '',
      subtotal REAL DEFAULT 0,
      discount_amount REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      round_off REAL DEFAULT 0,
      net_amount REAL DEFAULT 0,
      net_total REAL DEFAULT 0,
      tax_type TEXT DEFAULT 'LOCAL',
      billing_type TEXT DEFAULT 'B2C',
      buyer_gstin TEXT DEFAULT '',
      payment_status TEXT DEFAULT 'PAID',
      status TEXT DEFAULT 'POSTED',
      bill_type TEXT DEFAULT 'CASH',
      created_by TEXT DEFAULT 'ADMIN',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    this.rebuildIfStale("sales_invoice_items", "item_id", `CREATE TABLE IF NOT EXISTS sales_invoice_items (
      id TEXT PRIMARY KEY,
      invoice_id TEXT NOT NULL,
      item_id TEXT DEFAULT '',
      item_code TEXT NOT NULL,
      description TEXT DEFAULT '',
      qty REAL DEFAULT 1,
      quantity REAL DEFAULT 1,
      mrp REAL DEFAULT 0,
      rate REAL DEFAULT 0,
      discount_pct REAL DEFAULT 0,
      discount_amount REAL DEFAULT 0,
      tax_pct REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      cgst_amt REAL DEFAULT 0,
      sgst_amt REAL DEFAULT 0,
      igst_amt REAL DEFAULT 0,
      line_total REAL DEFAULT 0,
      total REAL DEFAULT 0,
      salesman_code TEXT DEFAULT ''
    )`);
    try { this.db.run(`CREATE INDEX IF NOT EXISTS idx_si_items_inv ON sales_invoice_items(invoice_id)`); } catch {}

    this.rebuildIfStale("sales_payments", "reference_no", `CREATE TABLE IF NOT EXISTS sales_payments (
      id TEXT PRIMARY KEY,
      invoice_id TEXT NOT NULL,
      payment_mode TEXT NOT NULL,
      amount REAL NOT NULL,
      reference_no TEXT DEFAULT '',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    // ── SEED: ui_grid_configs ─────────────────────────────────────────────────
    this.db.run(`
      INSERT OR IGNORE INTO ui_grid_configs (module_id, grid_schema_json, allow_pdt_load, stock_validation_level) VALUES
      ('GRN', '[
        {"id":"item_code","label":"Item Code","type":"text","mandatory":true,"visible":true},
        {"id":"description","label":"Description","type":"text","mandatory":false,"visible":true},
        {"id":"hsn_code","label":"HSN","type":"text","mandatory":false,"visible":true},
        {"id":"qty_ordered","label":"PO Qty","type":"numeric","mandatory":false,"visible":true},
        {"id":"qty_received","label":"Rcvd Qty","type":"numeric","mandatory":true,"visible":true},
        {"id":"qty_accepted","label":"Accptd Qty","type":"numeric","mandatory":true,"visible":true},
        {"id":"unit_cost","label":"Unit Cost","type":"numeric","mandatory":true,"visible":true},
        {"id":"discount_pct","label":"Disc %","type":"numeric","mandatory":false,"visible":true},
        {"id":"tax_pct","label":"Tax %","type":"numeric","mandatory":false,"visible":true}
      ]', 1, 1),
      ('PO', '[
        {"id":"item_code","label":"Item Code","type":"text","mandatory":true,"visible":true},
        {"id":"description","label":"Description","type":"text","mandatory":false,"visible":true},
        {"id":"hsn_code","label":"HSN","type":"text","mandatory":false,"visible":true},
        {"id":"qty_ordered","label":"Qty","type":"numeric","mandatory":true,"visible":true},
        {"id":"unit_rate","label":"Rate","type":"numeric","mandatory":true,"visible":true},
        {"id":"discount_pct","label":"Disc %","type":"numeric","mandatory":false,"visible":true},
        {"id":"tax_pct","label":"Tax %","type":"numeric","mandatory":false,"visible":true}
      ]', 0, 0),
      ('GO_MISC_ISSUE', '[
        {"id":"item_code","label":"Item Code","type":"text","mandatory":true,"visible":true},
        {"id":"description","label":"Description","type":"text","mandatory":false,"visible":true},
        {"id":"qty_out","label":"Issue Qty","type":"numeric","mandatory":true,"visible":true},
        {"id":"reason_code","label":"Reason","type":"text","mandatory":true,"visible":true}
      ]', 1, 2),
      ('STOCK_TAKE', '[
        {"id":"item_code","label":"Item Code","type":"text","mandatory":true,"visible":true},
        {"id":"description","label":"Description","type":"text","mandatory":false,"visible":true},
        {"id":"physical_qty","label":"Physical Qty","type":"numeric","mandatory":true,"visible":true},
        {"id":"location","label":"Location","type":"text","mandatory":false,"visible":true}
      ]', 1, 0);
    `);

    // ── SEED: system_parameters (Shoper 9 parity) ────────────────────────────
    const sp = `INSERT OR IGNORE INTO system_parameters (category, param_key, param_value, description, attribute_type) VALUES`;
    // Billing
    this.db.run(`${sp}
      ('Billing','accept_customer_id','1','Accept customer ID in billing','Variable'),
      ('Billing','customer_selection_mandatory','0','Make customer selection mandatory','Variable'),
      ('Billing','customer_insertion_mode','4','1=No new, 2=Full, 3=MaxSwipe, 4=Anonymous name','Variable'),
      ('Billing','allow_rate_alteration','0','Allow rate change during product billing','Variable'),
      ('Billing','allow_rate_alteration_service','0','Allow rate change during service billing','Variable'),
      ('Billing','club_duplicate_items','1','Merge duplicate scans into one row','Variable'),
      ('Billing','check_stock_on_item_selection','1','Validate stock at scan time','Variable'),
      ('Billing','stock_out_action','2','1=Warn, 2=Disallow, 3=Stop bill update','Variable'),
      ('Billing','allow_service_billing','1','Enable service bill generation','Variable'),
      ('Billing','credit_billing_allowed','0','Allow credit bill generation','Variable'),
      ('Billing','apply_lsq_on_selection','0','Apply Least Saleable Quantity on selection','Variable'),
      ('Billing','allow_customer_classification','1','Allow Alt+C for customer classification','Variable'),
      ('Billing','validate_qty_rate_range','1','Validate quantity and rate range','Variable'),
      ('Billing','salesman_selection_mandatory','0','Mandate salesman selection on bill','Variable'),
      ('Billing','salesman_context_level','BILL','ITEM or BILL level commission','Variable');
    `);
    // Discounts
    this.db.run(`${sp}
      ('Discounts','apply_bill_discount_first','0','Apply bill-level discount before item discount','Variable'),
      ('Discounts','promo_selection_mode','AUTO','AUTO or MANUAL coupon/scheme selection','Variable'),
      ('Discounts','free_item_selection_mandatory','1','Mandate selection of free items in promo','Variable');
    `);
    // Inwards (GRN/Procurement)
    this.db.run(`${sp}
      ('Inwards','allow_po_indent_configuration','1','Allow PO column config at entry time','Variable'),
      ('Inwards','default_po_entry_mode','NORMAL','NORMAL or SIZEWISE entry mode','Variable'),
      ('Inwards','advanced_item_search','0','Use advanced search instead of standard F2 browse','Variable'),
      ('Inwards','allow_pdt_loading','1','Allow PDT file loading in GI/GO','Variable'),
      ('Inwards','import_goods_inwards','1','Allow import of GI into GO documents','Variable'),
      ('Inwards','enable_lsq','0','Enforce Least Saleable Quantity on inwards','Variable');
    `);
    // Outwards (GO)
    this.db.run(`${sp}
      ('Outwards','stock_check_misc_issue','2','Stock validation level for Misc Issue','Variable'),
      ('Outwards','stock_check_purchase_returns','1','Stock validation level for Purchase Returns','Variable'),
      ('Outwards','stock_check_transfer_out','2','Stock validation level for Transfer Out','Variable'),
      ('Outwards','lsq_on_misc_issue','0','Enforce LSQ for Misc Issues','Variable'),
      ('Outwards','lsq_on_purchase_returns','0','Enforce LSQ for Purchase Returns','Variable'),
      ('Outwards','lsq_on_transfer_out','0','Enforce LSQ for Transfer Out','Variable'),
      ('Outwards','pdt_loading_applicable','1','Allow PDT file loading in GO','Variable'),
      ('Outwards','default_format_applicable','1','Use a constant default PDT file format','Variable'),
      ('Outwards','pdt_default_format','2','1=StockNo, 2=StockNo+ActQty, 3=+Rate, 4=+DocQty, 5=Full','Variable'),
      ('Outwards','pdt_loading_order','3','1=Ascending, 2=Descending, 3=File Order','Variable');
    `);
    // Price Revision
    this.db.run(`${sp}
      ('PriceRevision','activate_at_day_begin','0','Apply price revisions at Day Begin','Variable'),
      ('PriceRevision','activate_at_import','1','Apply price revisions at import time','Variable'),
      ('PriceRevision','activate_at_authorization','1','Apply price revisions at supervisor auth','Variable');
    `);
    // Till Management
    this.db.run(`${sp}
      ('TillManagement','enable_till_management','1','Enable cash till management','Variable'),
      ('TillManagement','cash_limit_per_till','50000','Maximum cash allowed in a till before lift','Variable'),
      ('TillManagement','require_opening_balance','1','Require opening balance at session start','Variable');
    `);
    // Document Numbering
    this.db.run(`${sp}
      ('DocumentPrefix','grn_prefix','GRN/','GRN document number prefix','Installation'),
      ('DocumentPrefix','po_prefix','PO/','PO document number prefix','Installation'),
      ('DocumentPrefix','go_prefix','GO/','Goods Outward document prefix','Installation'),
      ('DocumentPrefix','bill_prefix','SMR/SL/','Sales bill number prefix','Installation'),
      ('DocumentPrefix','credit_note_prefix','CN/','Credit note prefix','Installation');
    `);
    // System / Nodes
    this.db.run(`${sp}
      ('System','node_id','NODE-01','Physical POS terminal identifier','Installation'),
      ('System','node_name','Main Counter','Display name of this terminal','Variable'),
      ('System','day_begin_required','1','Enforce Day Begin before operations','Variable'),
      ('System','multi_currency_support','0','Enable multi-currency cash tendering','Variable'),
      ('System','tally_cost_centre_mapping','1','Map departments to Tally Cost Centres','Variable'),
      ('System','require_supervisor_login_for_registry','1','Require supervisor registry login','Variable'),
      ('System','strict_override_hierarchy','1','Strict override hierarchy','Variable');
    `);
    // StockTake
    this.db.run(`${sp}
      ('StockTake','pms_update_mode','Replace','Update mode: Replace or Adjustment','Variable');
    `);
    // Promotions
    this.db.run(`${sp}
      ('Promotions','allow_cross_class_promos','0','Allow cross-class promotions','Variable');
    `);
    // Tax
    this.db.run(`${sp}
      ('Tax','enable_hsn_overrides','1','Enable HSN specific tax overrides','Variable');
    `);
    // ModeOfPayment
    this.db.run(`${sp}
      ('ModeOfPayment','mandate_gift_voucher_prefix','1','Mandate gift voucher prefix tracking','Variable'),
      ('ModeOfPayment','verify_advance_receipt_customer','1','Verify advance receipt vs customer ID','Variable'),
      ('ModeOfPayment','enable_on_account_credit','0','Enable on-account credit rails','Variable');
    `);
    // Returns
    this.db.run(`${sp}
      ('Returns','return_price_mode','Current_MRP','Return price mode (Original/Current_MRP/Lowest)','Variable'),
      ('Returns','strict_cash_memo_validation','1','Strict validation of cash memo on returns','Variable'),
      ('Returns','slip_expiry_days','30','Days after which hold slips expire','Variable');
    `);
    // PrintEngine
    this.db.run(`${sp}
      ('PrintEngine','print_engine_dll','StandardEscPos.dll','Receipt printer driver DLL','Installation'),
      ('PrintEngine','renderer_namespace','SMRITI.Print','Namespace for customized renderer','Installation'),
      ('PrintEngine','renderer_classname','PosEngine','Class name for customized renderer','Installation');
    `);
    // Financial Sync
    this.db.run(`${sp}
      ('FinancialSync','flat_file_price_export_order','Retail_Price,Dealer_Price,CurrentCost,LastPurchPrice','Flat file price export order','Variable');
    `);

    // ── SEED: Document numbering prefixes ─────────────────────────────────────────────
    this.db.run(`
      INSERT OR IGNORE INTO numbering_prefixes (entity_code, prefix, current_number)
      VALUES 
        ('PURCHASE_PO', 'PO/', 1),
        ('INVENTORY_GO', 'GO/', 1);
    `);

    // ── SEED: Default Till ────────────────────────────────────────────────────
    this.db.run(`
      INSERT OR IGNORE INTO tills (id, till_code, till_name, node_id, cash_limit)
      VALUES ('till-001', 'T01', 'Main Counter Till', 'NODE-01', 50000);
    `);

    // ── MIGRATION 9: Party Masters (Vendor & Customer Extensions) ─────────────
    this.db.run(`
      CREATE TABLE IF NOT EXISTS vendor_master (
        id TEXT PRIMARY KEY,
        vendor_id TEXT UNIQUE NOT NULL,
        vendor_name TEXT NOT NULL,
        vendor_type TEXT DEFAULT '',
        tin_number TEXT DEFAULT '',
        cst_number TEXT DEFAULT '',
        partial_supply_allowed INTEGER DEFAULT 1,
        tax_inclusive INTEGER DEFAULT 1,
        address1 TEXT DEFAULT '',
        address2 TEXT DEFAULT '',
        city TEXT DEFAULT '',
        state TEXT DEFAULT '',
        pincode TEXT DEFAULT '',
        phone TEXT DEFAULT '',
        email TEXT DEFAULT '',
        gstin TEXT DEFAULT '',
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Seed Shoper 9 Customer/Vendor specific parameters 
    // Used for dynamic naming of address fields & custom policies
    this.db.run(`${sp}
      ('Customer','customer_code_user_assigned','1','Allow manual entry of customer codes','Variable'),
      ('Customer','caption_address1','Billing Address','Caption for Address Line 1','Variable'),
      ('Customer','caption_address2','Mailing Address','Caption for Address Line 2','Variable'),
      ('Customer','caption_address3','Shipping Address','Caption for Address Line 3','Variable'),
      ('Customer','caption_address4','Street Address 4','Caption for Address Line 4','Variable'),
      ('Customer','caption_address5','Attention','Caption for Address Line 5','Variable');
    `);

    // Seed Prism Design System UI parameters
    this.db.run(`${sp}
      ('UI','theme_accent_primary','#6366f1','SMRITI primary brand color (hex)','Color'),
      ('UI','theme_accent_secondary','#8b5cf6','Secondary accent color (hex)','Color'),
      ('UI','theme_radius_scale','md','Corner roundness: sharp/sm/md/lg/xl','Select'),
      ('UI','theme_font_family','Inter','UI font: Inter/DM Sans/Geist/Outfit','Select'),
      ('UI','theme_surface_opacity','0.6','Surface glass opacity 0.0 to 1.0','Variable'),
      ('UI','sidebar_collapsed_default','0','1 = start collapsed by default','Toggle'),
      ('UI','table_row_density','normal','Table row density: compact/normal/comfortable','Select'),
      ('UI','enable_animations','1','Enable micro-animations: 1=on 0=off','Toggle');
    `);

    this.db.run("SELECT 1"); // warm-up
    this.isInitialized = true;
  }

  public async save(): Promise<void> {
    if (!this.db) return;
    const data = this.db.export();
    await localforage.setItem(DB_KEY, data);
  }

  public run(sql: string, params?: (string | number | null | Uint8Array)[]): void {
    if (!this.db) throw new Error("DB not initialized.");
    this.db.run(sql, params);
  }

  public exec(sql: string, params?: (string | number | null | Uint8Array)[]): Record<string, unknown>[] {
    if (!this.db) throw new Error("DB not initialized.");
    const results = this.db.exec(sql, params);
    if (results.length === 0) return [];
    const { columns, values } = results[0];
    return values.map(row => {
      const obj: Record<string, unknown> = {};
      columns.forEach((col, idx) => { obj[col] = row[idx]; });
      return obj;
    });
  }
}

export const localDB = SmritiDatabase.getInstance();

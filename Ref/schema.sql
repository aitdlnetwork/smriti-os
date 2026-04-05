-- ============================================================
-- NEXUS SALES SYSTEM — Database Schema
-- All business logic lives HERE, not in the frontend
-- ============================================================

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

-- ── TABLES ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS customers (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    email       TEXT    UNIQUE,
    phone       TEXT,
    address     TEXT,
    credit_limit REAL   DEFAULT 50000,
    created_at  TEXT    DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS products (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    sku         TEXT    UNIQUE NOT NULL,
    name        TEXT    NOT NULL,
    category    TEXT    NOT NULL,
    price       REAL    NOT NULL CHECK(price > 0),
    stock       INTEGER NOT NULL DEFAULT 0 CHECK(stock >= 0),
    tax_rate    REAL    DEFAULT 18.0,
    active      INTEGER DEFAULT 1,
    created_at  TEXT    DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS bills (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    bill_no      TEXT    UNIQUE NOT NULL,
    customer_id  INTEGER REFERENCES customers(id),
    status       TEXT    DEFAULT 'draft' CHECK(status IN ('draft','confirmed','paid','cancelled')),
    subtotal     REAL    DEFAULT 0,
    tax_amount   REAL    DEFAULT 0,
    discount     REAL    DEFAULT 0,
    total        REAL    DEFAULT 0,
    notes        TEXT,
    created_at   TEXT    DEFAULT (datetime('now','localtime')),
    updated_at   TEXT    DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS bill_items (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    bill_id     INTEGER NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    product_id  INTEGER NOT NULL REFERENCES products(id),
    qty         INTEGER NOT NULL CHECK(qty > 0),
    unit_price  REAL    NOT NULL,
    tax_rate    REAL    NOT NULL,
    line_total  REAL    GENERATED ALWAYS AS (ROUND(qty * unit_price, 2)) STORED,
    tax_amount  REAL    GENERATED ALWAYS AS (ROUND(qty * unit_price * tax_rate / 100, 2)) STORED
);

CREATE TABLE IF NOT EXISTS payments (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    bill_id     INTEGER NOT NULL REFERENCES bills(id),
    amount      REAL    NOT NULL CHECK(amount > 0),
    method      TEXT    DEFAULT 'cash' CHECK(method IN ('cash','upi','card','bank')),
    reference   TEXT,
    paid_at     TEXT    DEFAULT (datetime('now','localtime'))
);

-- ── BILL NUMBER SEQUENCE ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS sequences (
    name    TEXT PRIMARY KEY,
    val     INTEGER DEFAULT 0
);
INSERT OR IGNORE INTO sequences VALUES ('bill_no', 1000);

-- ── VIEWS (computed data, zero frontend math) ────────────────

CREATE VIEW IF NOT EXISTS v_bill_summary AS
SELECT
    b.id,
    b.bill_no,
    b.status,
    COALESCE(c.name, 'Walk-in') AS customer_name,
    b.subtotal,
    b.tax_amount,
    b.discount,
    b.total,
    COALESCE(SUM(p.amount),0) AS amount_paid,
    b.total - COALESCE(SUM(p.amount),0) AS balance_due,
    COUNT(bi.id) AS item_count,
    b.created_at
FROM bills b
LEFT JOIN customers c ON c.id = b.customer_id
LEFT JOIN bill_items bi ON bi.bill_id = b.id
LEFT JOIN payments p ON p.bill_id = b.id
GROUP BY b.id;

CREATE VIEW IF NOT EXISTS v_dashboard AS
SELECT
    (SELECT COUNT(*) FROM bills WHERE status != 'cancelled') AS total_bills,
    (SELECT COALESCE(SUM(total),0) FROM bills WHERE status IN ('confirmed','paid')) AS total_revenue,
    (SELECT COALESCE(SUM(total),0) FROM bills WHERE status='paid') AS collected,
    (SELECT COALESCE(SUM(total),0) FROM bills WHERE status IN ('confirmed','paid'))
    - (SELECT COALESCE(SUM(amount),0) FROM payments) AS outstanding,
    (SELECT COUNT(*) FROM customers) AS total_customers,
    (SELECT COUNT(*) FROM products WHERE active=1) AS active_products,
    (SELECT COUNT(*) FROM products WHERE stock < 10 AND active=1) AS low_stock_count,
    (SELECT COUNT(*) FROM bills WHERE status='draft') AS draft_bills;

CREATE VIEW IF NOT EXISTS v_top_products AS
SELECT
    p.id, p.name, p.category,
    COALESCE(SUM(bi.qty),0) AS units_sold,
    COALESCE(SUM(bi.line_total),0) AS revenue
FROM products p
LEFT JOIN bill_items bi ON bi.product_id = p.id
LEFT JOIN bills b ON b.id = bi.bill_id AND b.status != 'cancelled'
GROUP BY p.id
ORDER BY revenue DESC
LIMIT 10;

-- ── TRIGGERS (business logic in DB) ─────────────────────────

-- Auto-recalculate bill totals whenever items change
CREATE TRIGGER IF NOT EXISTS trg_recalc_on_insert
AFTER INSERT ON bill_items BEGIN
    UPDATE bills SET
        subtotal   = (SELECT COALESCE(SUM(line_total),0) FROM bill_items WHERE bill_id=NEW.bill_id),
        tax_amount = (SELECT COALESCE(SUM(tax_amount),0) FROM bill_items WHERE bill_id=NEW.bill_id),
        total      = subtotal + tax_amount - discount,
        updated_at = datetime('now','localtime')
    WHERE id = NEW.bill_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_recalc_on_delete
AFTER DELETE ON bill_items BEGIN
    UPDATE bills SET
        subtotal   = (SELECT COALESCE(SUM(line_total),0) FROM bill_items WHERE bill_id=OLD.bill_id),
        tax_amount = (SELECT COALESCE(SUM(tax_amount),0) FROM bill_items WHERE bill_id=OLD.bill_id),
        total      = subtotal + tax_amount - discount,
        updated_at = datetime('now','localtime')
    WHERE id = OLD.bill_id;
END;

-- Deduct stock when bill is confirmed
CREATE TRIGGER IF NOT EXISTS trg_deduct_stock
AFTER UPDATE OF status ON bills
WHEN NEW.status = 'confirmed' AND OLD.status = 'draft' BEGIN
    UPDATE products SET stock = stock - (
        SELECT qty FROM bill_items WHERE bill_id=NEW.id AND product_id=products.id
    )
    WHERE id IN (SELECT product_id FROM bill_items WHERE bill_id=NEW.id);
END;

-- Restore stock on cancellation
CREATE TRIGGER IF NOT EXISTS trg_restore_stock
AFTER UPDATE OF status ON bills
WHEN NEW.status = 'cancelled' AND OLD.status IN ('confirmed','paid') BEGIN
    UPDATE products SET stock = stock + (
        SELECT qty FROM bill_items WHERE bill_id=NEW.id AND product_id=products.id
    )
    WHERE id IN (SELECT product_id FROM bill_items WHERE bill_id=NEW.id);
END;

-- Auto-mark bill as paid when fully settled
CREATE TRIGGER IF NOT EXISTS trg_auto_paid
AFTER INSERT ON payments BEGIN
    UPDATE bills SET status='paid', updated_at=datetime('now','localtime')
    WHERE id=NEW.bill_id
      AND status='confirmed'
      AND (SELECT COALESCE(SUM(amount),0) FROM payments WHERE bill_id=NEW.bill_id) >= total;
END;

-- ── SEED DATA ────────────────────────────────────────────────

INSERT OR IGNORE INTO customers(name,email,phone,address) VALUES
    ('Rahul Enterprises','rahul@example.com','9876543210','Mumbai, MH'),
    ('Priya Traders','priya@example.com','9845612345','Pune, MH'),
    ('Aakash Stores','aakash@example.com','9812345678','Delhi, DL'),
    ('Meera General','meera@example.com','9801234567','Chennai, TN');

INSERT OR IGNORE INTO products(sku,name,category,price,stock,tax_rate) VALUES
    ('EL001','Samsung 55" 4K TV','Electronics',45999,15,18),
    ('EL002','iPhone 15 Pro','Electronics',134900,8,18),
    ('EL003','Dell Laptop i7','Electronics',78500,12,18),
    ('EL004','Sony Headphones','Electronics',3499,30,18),
    ('EL005','Smart Watch Series 9','Electronics',41999,20,18),
    ('HO001','Prestige Induction','Home Appliances',3299,25,12),
    ('HO002','Philips Air Fryer','Home Appliances',6499,18,12),
    ('HO003','Kent RO Purifier','Home Appliances',12999,10,12),
    ('FU001','Wooden Study Table','Furniture',8999,6,5),
    ('FU002','Office Chair Ergo','Furniture',12500,9,5),
    ('ST001','A4 Paper Box','Stationery',450,100,5),
    ('ST002','Pen Set Premium','Stationery',299,200,5);

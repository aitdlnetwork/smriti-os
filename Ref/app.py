"""
NEXUS Sales & Billing System
Flask Backend — All logic is DB-driven via SQLite views, triggers & procedures
"""

import sqlite3, os, json
from flask import Flask, g, jsonify, request, render_template

app = Flask(__name__)
DB_PATH = os.path.join(os.path.dirname(__file__), "nexus.db")

# ── DB CONNECTION ────────────────────────────────────────────

def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys = ON")
        g.db.execute("PRAGMA journal_mode = WAL")
    return g.db

@app.teardown_appcontext
def close_db(e=None):
    db = g.pop("db", None)
    if db: db.close()

def db_one(sql, params=()):
    row = get_db().execute(sql, params).fetchone()
    return dict(row) if row else None

def db_all(sql, params=()):
    return [dict(r) for r in get_db().execute(sql, params).fetchall()]

def db_run(sql, params=()):
    db = get_db()
    cur = db.execute(sql, params)
    db.commit()
    return cur.lastrowid

# ── INIT DB ──────────────────────────────────────────────────

def init_db():
    if not os.path.exists(DB_PATH):
        with app.app_context():
            db = get_db()
            with open(os.path.join(os.path.dirname(__file__), "schema.sql")) as f:
                db.executescript(f.read())
            db.commit()

# ── PAGES ────────────────────────────────────────────────────

@app.route("/")
def index():
    return render_template("index.html")

# ── DASHBOARD API ────────────────────────────────────────────

@app.route("/api/dashboard")
def dashboard():
    stats   = db_one("SELECT * FROM v_dashboard")
    monthly = db_all("""
        SELECT strftime('%Y-%m', created_at) AS month,
               COUNT(*) AS bills, ROUND(SUM(total),2) AS revenue
        FROM bills WHERE status != 'cancelled'
        GROUP BY month ORDER BY month DESC LIMIT 6
    """)
    top_products = db_all("SELECT * FROM v_top_products LIMIT 5")
    recent_bills = db_all("SELECT * FROM v_bill_summary ORDER BY created_at DESC LIMIT 6")
    return jsonify(stats=stats, monthly=monthly, top_products=top_products, recent=recent_bills)

# ── CUSTOMERS ────────────────────────────────────────────────

@app.route("/api/customers")
def customers():
    q = request.args.get("q","")
    if q:
        rows = db_all("SELECT * FROM customers WHERE name LIKE ? OR phone LIKE ? ORDER BY name",
                      (f"%{q}%", f"%{q}%"))
    else:
        rows = db_all("SELECT * FROM customers ORDER BY name")
    return jsonify(rows)

@app.route("/api/customers", methods=["POST"])
def add_customer():
    d = request.json
    cid = db_run("INSERT INTO customers(name,email,phone,address) VALUES(?,?,?,?)",
                 (d["name"], d.get("email"), d.get("phone"), d.get("address")))
    return jsonify(db_one("SELECT * FROM customers WHERE id=?", (cid,)))

# ── PRODUCTS ─────────────────────────────────────────────────

@app.route("/api/products")
def products():
    q   = request.args.get("q","")
    cat = request.args.get("cat","")
    sql = "SELECT * FROM products WHERE active=1"
    p   = []
    if q:   sql += " AND (name LIKE ? OR sku LIKE ?)"; p += [f"%{q}%",f"%{q}%"]
    if cat: sql += " AND category=?";                  p += [cat]
    sql += " ORDER BY name"
    return jsonify(db_all(sql, p))

@app.route("/api/products", methods=["POST"])
def add_product():
    d = request.json
    pid = db_run(
        "INSERT INTO products(sku,name,category,price,stock,tax_rate) VALUES(?,?,?,?,?,?)",
        (d["sku"], d["name"], d["category"], d["price"], d.get("stock",0), d.get("tax_rate",18))
    )
    return jsonify(db_one("SELECT * FROM products WHERE id=?", (pid,)))

@app.route("/api/products/<int:pid>", methods=["PATCH"])
def update_stock(pid):
    d = request.json
    db_run("UPDATE products SET stock=stock+? WHERE id=?", (d["delta"], pid))
    return jsonify(db_one("SELECT * FROM products WHERE id=?", (pid,)))

# ── BILLS ────────────────────────────────────────────────────

@app.route("/api/bills")
def bills():
    status = request.args.get("status","")
    sql = "SELECT * FROM v_bill_summary"
    p   = []
    if status: sql += " WHERE status=?"; p = [status]
    sql += " ORDER BY created_at DESC"
    return jsonify(db_all(sql, p))

@app.route("/api/bills", methods=["POST"])
def create_bill():
    d   = request.json
    db  = get_db()
    # Generate bill number atomically in DB
    db.execute("UPDATE sequences SET val=val+1 WHERE name='bill_no'")
    seq = db.execute("SELECT val FROM sequences WHERE name='bill_no'").fetchone()["val"]
    bill_no = f"NX-{seq:04d}"
    cur  = db.execute(
        "INSERT INTO bills(bill_no,customer_id,discount,notes) VALUES(?,?,?,?)",
        (bill_no, d.get("customer_id"), d.get("discount",0), d.get("notes",""))
    )
    bill_id = cur.lastrowid
    for item in d.get("items", []):
        prod = db.execute("SELECT price,tax_rate FROM products WHERE id=?",
                          (item["product_id"],)).fetchone()
        db.execute(
            "INSERT INTO bill_items(bill_id,product_id,qty,unit_price,tax_rate) VALUES(?,?,?,?,?)",
            (bill_id, item["product_id"], item["qty"],
             item.get("unit_price", prod["price"]), prod["tax_rate"])
        )
    db.commit()
    return jsonify(db_one("SELECT * FROM v_bill_summary WHERE id=?", (bill_id,)))

@app.route("/api/bills/<int:bid>")
def get_bill(bid):
    bill  = db_one("SELECT * FROM v_bill_summary WHERE id=?", (bid,))
    items = db_all("""
        SELECT bi.*, p.name AS product_name, p.sku
        FROM bill_items bi JOIN products p ON p.id=bi.product_id
        WHERE bi.bill_id=?
    """, (bid,))
    payments = db_all("SELECT * FROM payments WHERE bill_id=? ORDER BY paid_at", (bid,))
    return jsonify(bill=bill, items=items, payments=payments)

@app.route("/api/bills/<int:bid>/confirm", methods=["POST"])
def confirm_bill(bid):
    # Check stock availability via DB
    shortage = db_all("""
        SELECT p.name, bi.qty, p.stock
        FROM bill_items bi JOIN products p ON p.id=bi.product_id
        WHERE bi.bill_id=? AND p.stock < bi.qty
    """, (bid,))
    if shortage:
        return jsonify(error="Insufficient stock", items=shortage), 400
    db_run("UPDATE bills SET status='confirmed' WHERE id=? AND status='draft'", (bid,))
    return jsonify(db_one("SELECT * FROM v_bill_summary WHERE id=?", (bid,)))

@app.route("/api/bills/<int:bid>/cancel", methods=["POST"])
def cancel_bill(bid):
    db_run("UPDATE bills SET status='cancelled' WHERE id=? AND status IN ('draft','confirmed')", (bid,))
    return jsonify(db_one("SELECT * FROM v_bill_summary WHERE id=?", (bid,)))

@app.route("/api/bills/<int:bid>/pay", methods=["POST"])
def add_payment(bid):
    d = request.json
    db_run("INSERT INTO payments(bill_id,amount,method,reference) VALUES(?,?,?,?)",
           (bid, d["amount"], d.get("method","cash"), d.get("reference","")))
    return jsonify(db_one("SELECT * FROM v_bill_summary WHERE id=?", (bid,)))

# ── REPORTS ──────────────────────────────────────────────────

@app.route("/api/reports/sales")
def sales_report():
    period = request.args.get("period","month")
    fmt = "%Y-%m" if period=="month" else "%Y-%W"
    data = db_all(f"""
        SELECT strftime('{fmt}', b.created_at) AS period,
               COUNT(DISTINCT b.id) AS bills,
               ROUND(SUM(b.subtotal),2) AS subtotal,
               ROUND(SUM(b.tax_amount),2) AS tax,
               ROUND(SUM(b.total),2) AS total
        FROM bills b WHERE b.status != 'cancelled'
        GROUP BY period ORDER BY period DESC LIMIT 12
    """)
    categories = db_all("""
        SELECT p.category,
               ROUND(SUM(bi.line_total),2) AS revenue,
               SUM(bi.qty) AS units
        FROM bill_items bi
        JOIN products p ON p.id=bi.product_id
        JOIN bills b ON b.id=bi.bill_id AND b.status != 'cancelled'
        GROUP BY p.category ORDER BY revenue DESC
    """)
    return jsonify(sales=data, categories=categories)

if __name__ == "__main__":
    init_db()
    app.run(debug=True, port=5050)

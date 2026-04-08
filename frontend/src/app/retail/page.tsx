/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  S M R I T I - O S   ||   E N T E R P R I S E   E D I T I O N
 *  "ERP Simplified. Run Your Entire Business on Memory, Not Code."
 * ─────────────────────────────────────────────────────────────────────────────
 *  System Architect  : Jawahar R Mallah
 *  Parent Org        : AITDL NETWORK
 *  Copyright         : © 2026 AITDL.com & AITDL.in. All Rights Reserved.
 *  Classification    : PROPRIETARY & CONFIDENTIAL
 *  CONTACT           : aitdlnetwork@outlook.com | jawahar@aitdl.in
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *  Module : SmritiBusinessPlusRetail — POS Billing Terminal
 *  Style  : Advanced Shoper 9 Edge UX + Enterprise Customer 360 & Multi-Tender
 * ─────────────────────────────────────────────────────────────────────────────
 */

"use client";

import { useState, useRef, useEffect, useCallback, KeyboardEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSmritiDB } from "@/lib/useSmritiDB";
import { localDB } from "@/lib/db";
import pricingService from "@/lib/services/pricingService";

// ─── Types ────────────────────────────────────────────────────────────────────
interface CartRow {
  id: string;
  sno: number;
  itemCode: string;
  description: string;
  size: string;
  stock: number;
  qty: number;
  mrp: number;
  rate: number;
  discPct: number;
  discAmt: number;
  taxPct: number;
  taxAmt: number;
  cgstAmt: number;
  sgstAmt: number;
  igstAmt: number;
  salesman: string;
  amount: number;
  flashKey?: number;
}

interface SuspendedBill {
  id: string;
  timestamp: number;
  customer: string;
  salesman: string;
  rows: CartRow[];
  totalAmt: number;
}

interface CustomerProfile {
  id?: string;
  name: string;
  phone: string;
  tier: "PLATINUM" | "GOLD" | "SILVER" | "REGULAR" | "BRONZE";
  lifetimeSpend: number;
  lastVisit: string;
  points: number;
  taxType: "INCLUSIVE" | "EXCLUSIVE";
  destCode: "LOC" | "OUT";
  isB2B: boolean;
  gstin?: string;
  pgAllowCredit: boolean;
  pgCreditLimit: number;
}

type PayMode = "CASH" | "CREDIT CARD" | "DEBIT CARD" | "UPI" | "LOYALTY PTS" | "CHEQUE" | "STORE CREDIT";

interface TenderLine {
  id: string;
  mode: PayMode;
  amount: number;
}

let rowIdCounter = 0;
function nextRowId(): string {
  return `row-${++rowIdCounter}-${Date.now()}`;
}

function calcRow(row: CartRow, profile: CustomerProfile | null): CartRow {
  return pricingService.calculateRow(row, profile);
}
function blankRow(sno: number): CartRow {
  return { id: nextRowId(), sno, itemCode: "", description: "", size: "", stock: 0, qty: 0, mrp: 0, rate: 0, discPct: 0, discAmt: 0, taxPct: 0, taxAmt: 0,  cgstAmt: 0, sgstAmt: 0, igstAmt: 0, salesman: "", amount: 0 };
}

const formatDate = () => new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
const formatTime = () => new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });

async function getNextBillNo(): Promise<string> {
  if (!localDB.isInitialized) return `BL-${Date.now().toString().slice(-6)}`;
  try {
    const res = localDB.exec("SELECT prefix, current_number, padding FROM numbering_prefixes WHERE entity_code = 'RETAIL_BILL'");
    if (res && res.length > 0) {
      const row = res[0] as any;
      return `${row.prefix}${row.current_number.toString().padStart(row.padding, '0')}`;
    }
  } catch (e) {
    console.error(e);
  }
  return `BL-${Date.now().toString().slice(-6)}`;
}

export default function RetailPOS() {
  const router = useRouter();
  const { isReady, error } = useSmritiDB();

  // ─── Headers & Meta ───
  const [billNo, setBillNo] = useState("LOADING...");
  const [storeName, setStoreName] = useState("SMRITI RETAIL");
  const [billDate, setBillDate] = useState(formatDate);
  const [billTime, setBillTime] = useState(formatTime);
  const [customer, setCustomer] = useState("");
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(null);
  const [billSalesman, setBillSalesman] = useState("");
  const [isReturnMode, setIsReturnMode] = useState(false);
  const [billType, setBillType] = useState<"CASH" | "CREDIT">("CASH");

  // ─── Grid State ───
  const [rows, setRows] = useState<CartRow[]>([blankRow(1), blankRow(2), blankRow(3), blankRow(4), blankRow(5)]);
  const [activeRow, setActiveRow] = useState(0);
  const [previewItem, setPreviewItem] = useState<any>(null);
  const [scanInput, setScanInput] = useState("");
  const scanRef = useRef<HTMLInputElement>(null);

  // ─── Payment & Interactions ───
  const [showPayModal, setShowPayModal] = useState(false);
  const [showRecallModal, setShowRecallModal] = useState(false);
  const [showOmniModal, setShowOmniModal] = useState(false);
  const [omniQuery, setOmniQuery] = useState("");
  const [omniResults, setOmniResults] = useState<any[]>([]);
  const [focusedContext, setFocusedContext] = useState<"ITEMS" | "CUSTOMERS" | "SALESMEN">("ITEMS");
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ phone: "", name: "" });
  const [suspendedQueue, setSuspendedQueue] = useState<SuspendedBill[]>([]);
  const [invoiceDone, setInvoiceDone] = useState<any>(null);

  const [tenders, setTenders] = useState<TenderLine[]>([]);
  const [activePayMode, setActivePayMode] = useState<PayMode>("CASH");
  const [activeTenderAmt, setActiveTenderAmt] = useState("");

  // ─── Till Status ───
  const [showTillStatus, setShowTillStatus] = useState(false);
  const [tillData, setTillData] = useState<any>(null);

  // ─── Customer History ───
  const [showCustomerHistory, setShowCustomerHistory] = useState(false);
  const [customerHistoryData, setCustomerHistoryData] = useState<any[]>([]);

  // ─── Lifecycle / Boot ───
  useEffect(() => {
    if (isReady && localDB.isInitialized) {
      getNextBillNo().then(setBillNo);
      localDB.run("CREATE TABLE IF NOT EXISTS suspended_bills (id TEXT PRIMARY KEY, timestamp INTEGER, payload TEXT)");
      const profile = localDB.exec("SELECT name FROM store_profile LIMIT 1");
      if (profile && profile.length > 0) setStoreName((profile[0] as any).name);
    }
  }, [isReady]);

  useEffect(() => {
    const clock = setInterval(() => setBillTime(formatTime()), 60000);
    return () => clearInterval(clock);
  }, []);

  useEffect(() => {
    if (previewItem) {
      const timer = setTimeout(() => setPreviewItem(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [previewItem]);

  // ─── Calculations ───
  const activeItems = rows.filter(r => r.itemCode !== "");
  const totalQty = activeItems.reduce((s, r) => s + r.qty, 0);
  const subtotal = activeItems.reduce((s, r) => s + (r.rate - r.discAmt) * r.qty, 0);
  const totalDisc = activeItems.reduce((s, r) => s + r.discAmt * r.qty, 0);
  const totalTax = activeItems.reduce((s, r) => s + r.taxAmt, 0);
  const exactNet = subtotal + totalTax;
  const netTotal = Math.round(exactNet);
  const roundOff = netTotal - exactNet;

  // Tender Calculations
  const totalTendered = tenders.reduce((s, t) => s + t.amount, 0);
  const remainingDue = Math.max(0, netTotal - totalTendered);
  const changeDue = Math.max(0, totalTendered - netTotal);
  const progressPct = netTotal > 0 ? Math.min(100, (totalTendered / netTotal) * 100) : 0;

  // Auto-fill active tender input when modal opens
  useEffect(() => {
    if (showPayModal) {
      setTenders([]);
      setActiveTenderAmt(netTotal.toString());
      setActivePayMode("CASH");
    }
  }, [showPayModal, netTotal]);

  function ensureBlankRows(currentRows: CartRow[]): CartRow[] {
    const blankCount = currentRows.filter(r => r.itemCode === "").length;
    if (blankCount >= 5) return currentRows;
    const needed = 5 - blankCount;
    const newBlanks = Array.from({ length: needed }, (_, i) => blankRow(currentRows.length + 1 + i));
    return [...currentRows, ...newBlanks];
  }

  // Customer 360 Logic
  const handleCustomerChange = (val: string) => {
    setCustomer(val);
    if (!localDB.isInitialized) return;
    if (val.length >= 4) {
      // Fallback query matching both old `customers` table and new `customer_master` table fields if aliased
      const res = localDB.exec(`
        SELECT c.*, c.phone as phone_number, c.loyalty_points
        FROM customer_master c 
        WHERE c.phone = ? OR c.customer_code = ? LIMIT 1
      `, [val, val]);

      if (res.length > 0) {
        const c = res[0] as any;

        const metrics = localDB.exec("SELECT SUM(net_total) as lt_spend, MAX(created_at) as last_visit FROM sales_invoices WHERE customer_id = ?", [c.id]);
        
        // Fetch new price group details
        const pgRes = localDB.exec("SELECT * FROM customer_price_groups WHERE id = ? LIMIT 1", [c.price_group_id]);
        const pg = pgRes.length > 0 ? (pgRes[0] as any) : { discount_pct: 0, allow_credit: 1, credit_limit: 50000 };

        let lt_spend = 0;
        let last_visit = "First Visit";
        if (metrics && metrics.length > 0) {
           const mt = metrics[0] as any;
           lt_spend = Number(mt.lt_spend) || 0;
           last_visit = mt.last_visit ? new Date(mt.last_visit as string).toLocaleDateString("en-IN") : "First Visit";
        }

        const profileData: CustomerProfile = {
          id: c.id,
          name: c.name || "UNNAMED",
          phone: c.phone_number || val,
          tier: (c.loyalty_tier || "BRONZE") as any,
          lifetimeSpend: lt_spend,
          lastVisit: last_visit,
          points: c.loyalty_points || Math.floor(lt_spend * 0.05),
          taxType: "INCLUSIVE",
          destCode: "LOC",
          isB2B: c.is_b2b === 1 || false,
          gstin: c.gstin,
          pgAllowCredit: pg.allow_credit === 1,
          pgCreditLimit: pg.credit_limit || 50000
        };
        setCustomerProfile(profileData);
        setRows(prev => prev.map(r => r.itemCode ? calcRow(r, profileData) : r));
      } else {
        setCustomerProfile(null);
        setRows(prev => prev.map(r => r.itemCode ? calcRow(r, null) : r));
      }
    } else {
      setCustomerProfile(null);
      setRows(prev => prev.map(r => r.itemCode ? calcRow(r, null) : r));
    }
  };

  const updateRow = (index: number, field: keyof CartRow, value: any) => {
    setRows(prev => {
      const newRows = [...prev];
      newRows[index] = { ...newRows[index], [field]: value };
      newRows[index] = calcRow(newRows[index], customerProfile);
      return newRows;
    });
  };

  const handleGridKeyDown = async (e: React.KeyboardEvent<HTMLDivElement>, index: number) => {
    if (e.key === "Enter" || e.key === "Tab") {
      const row = rows[index];
      if (row.itemCode.length >= 2) {
        const itemRes = localDB.exec("SELECT * FROM item_master WHERE item_code = ? LIMIT 1", [row.itemCode]);
        if (itemRes.length > 0) {
          const item = itemRes[0] as any;
          const updatedRow = { 
            ...row, 
            description: item.description, 
            mrp: Number(item.mrp),
            rate: Number(item.mop), 
            taxPct: Number(item.tax_pct || 0) 
          };
          const nextRows = [...rows];
          nextRows[index] = calcRow(updatedRow, customerProfile);
          setRows(ensureBlankRows(nextRows));
          setActiveRow(index + 1);
        }
      }
    }
  };

  const handleCustomerKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && customer.length >= 4 && !customerProfile) {
       setNewCustomer({ phone: customer, name: "" });
       setShowCustomerForm(true);
    }
  };

  const saveNewCustomer = async () => {
    if(!newCustomer.phone || !newCustomer.name) return;
    try {
      const cid = crypto.randomUUID();
      localDB.run("INSERT INTO customers (id, phone_number, name, loyalty_tier) VALUES (?, ?, ?, 'BRONZE')", 
        [cid, newCustomer.phone, newCustomer.name]);
      await localDB.save();
      setShowCustomerForm(false);
      handleCustomerChange(newCustomer.phone); 
    } catch(e) { console.error(e); alert("Failed to save customer."); }
  };

  // ─── Scan Logic ───
  const handleScan = useCallback((code: string) => {
    if (!localDB.isInitialized || !code.trim()) return;
    const trimmed = code.trim().toUpperCase();

    let result = localDB.exec(`
      SELECT m.*, COALESCE(SUM(s.qty_in - s.qty_out), 0) as stock_qty 
      FROM item_master m 
      LEFT JOIN stock_ledger s ON m.item_code = s.item_code 
      WHERE m.item_code = ? OR m.barcode = ? 
      GROUP BY m.id LIMIT 1`, [trimmed, trimmed]);

    if (result.length === 0) return;
    const dbItem = result[0];
    const qtySign = isReturnMode ? -1 : 1;

    const found = {
      itemCode: dbItem.item_code as string,
      description: dbItem.description as string,
      size: (dbItem.size_code as string) || "OS",
      stock: Number(dbItem.stock_qty) || 0,
      qty: qtySign,
      mrp: Number(dbItem.mrp) || 0,
      rate: Number(dbItem.mop) || 0,
      taxPct: Number(dbItem.tax_pct) || 0,
      salesman: billSalesman 
    };

    setPreviewItem(found);

    setRows(prev => {
      const idx = prev.findIndex(r => r.itemCode === found.itemCode);
      let updated: CartRow[];
      if (idx !== -1) {
        updated = [...prev];
        updated[idx] = calcRow({ ...updated[idx], qty: updated[idx].qty + qtySign, flashKey: Date.now() }, customerProfile);
      } else {
        const bIdx = prev.findIndex(r => r.itemCode === "");
        if (bIdx === -1) return prev;
        updated = [...prev];
        updated[bIdx] = calcRow({ ...blankRow(prev[bIdx].sno), ...found, id: prev[bIdx].id, sno: prev[bIdx].sno, flashKey: Date.now() }, customerProfile);
        setActiveRow(bIdx + 1);
      }
      return ensureBlankRows(updated);
    });

    setScanInput("");
    scanRef.current?.focus();
  }, [isReturnMode, billSalesman]);

  const handleOmniSearch = (query: string, contextOverride?: string) => {
    const ctx = contextOverride || focusedContext;
    setOmniQuery(query);
    if (!localDB.isInitialized) return;
    
    let res;
    if (ctx === "CUSTOMERS") {
        if (query.trim() === "") {
          res = localDB.exec(`SELECT phone_number, name, loyalty_tier FROM customers LIMIT 50`);
        } else {
          const sq = `%${query.trim()}%`;
          res = localDB.exec(`SELECT phone_number, name, loyalty_tier FROM customers WHERE phone_number LIKE ? OR name LIKE ? LIMIT 50`, [sq, sq]);
        }
    } else if (ctx === "SALESMEN") {
        if (query.trim() === "") {
          res = localDB.exec(`SELECT code, name FROM sales_personnel LIMIT 50`);
        } else {
          const sq = `%${query.trim()}%`;
          res = localDB.exec(`SELECT code, name FROM sales_personnel WHERE code LIKE ? OR name LIKE ? LIMIT 50`, [sq, sq]);
        }
    } else {
        if (query.trim().length === 0) {
          res = localDB.exec(`
            SELECT m.item_code, m.description, m.size_code, m.mrp, COALESCE(SUM(s.qty_in - s.qty_out), 0) as stock_qty 
            FROM item_master m 
            LEFT JOIN stock_ledger s ON m.item_code = s.item_code 
            GROUP BY m.id LIMIT 50`);
        } else {
          const safeQ = `%${query.trim()}%`;
          res = localDB.exec(`
            SELECT m.item_code, m.description, m.size_code, m.mrp, COALESCE(SUM(s.qty_in - s.qty_out), 0) as stock_qty 
            FROM item_master m 
            LEFT JOIN stock_ledger s ON m.item_code = s.item_code 
            WHERE m.item_code LIKE ? OR m.description LIKE ? OR m.barcode LIKE ?
            GROUP BY m.id LIMIT 50`, [safeQ, safeQ, safeQ]);
        }
    }
    setOmniResults(res || []);
  };

  // ─── Action Handlers ───
  const handleHoldBill = async () => {
    if (activeItems.length === 0) return;
    const payload: SuspendedBill = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      customer: customer || "WALK-IN",
      salesman: billSalesman || "UNASSIGNED",
      rows: rows,
      totalAmt: netTotal
    };

    try {
      localDB.run("INSERT INTO suspended_bills (id, timestamp, payload) VALUES (?, ?, ?)", 
        [payload.id, payload.timestamp, JSON.stringify(payload)]
      );
      await localDB.save();
      
      setRows([blankRow(1), blankRow(2), blankRow(3), blankRow(4), blankRow(5)]);
      setCustomer("");
      setCustomerProfile(null);
      setBillSalesman("");
      setActiveRow(0);
      setScanInput("");
      
      setPreviewItem({ itemCode: "SYS-001", description: "BILL SUSPENDED (HELD)", mrp: netTotal });
    } catch (e) { console.error(e); alert("Failed to hold bill to local storage."); }
  };

  const fetchSuspendedBills = () => {
    const res = localDB.exec("SELECT * FROM suspended_bills ORDER BY timestamp DESC");
    if (res) {
      const parsed = res.map((r: any) => JSON.parse(r.payload));
      setSuspendedQueue(parsed);
    }
    setShowRecallModal(true);
  };

  const handleRecallSelect = async (held: SuspendedBill) => {
    localDB.run("DELETE FROM suspended_bills WHERE id = ?", [held.id]);
    await localDB.save();

    handleCustomerChange(held.customer);
    setBillSalesman(held.salesman);
    setRows(held.rows);
    setShowRecallModal(false);
    scanRef.current?.focus();
  };

  const handleClear = () => {
    if (confirm("Clear current transaction?")) window.location.reload();
  };

  const handleSaveInvoice = async (tenders: { mode: string; amount: number }[]) => {
    if (activeItems.length === 0) return;
    try {
      const invId = crypto.randomUUID();
      const billNo = "BN-" + Date.now();
      
      const finalCustomerId = customerProfile ? customerProfile.id : (customer || 'WALK-IN');
      const taxType = customerProfile?.destCode === 'OUT' ? 'OUTSTATION' : 'LOCAL';
      const billingType = customerProfile?.isB2B ? 'B2B' : 'B2C';

      localDB.run(`INSERT INTO sales_invoices (id, store_day_id, till_session_id, salesman_id, customer_id, invoice_number, bill_number, bill_date, subtotal, tax_amount, discount_amount, net_total, tax_type, billing_type, buyer_gstin, bill_type, status) VALUES (?, 'DAY-01', 'TILL-01', ?, ?, ?, ?, date('now'), ?, ?, ?, ?, ?, ?, ?, ?, 'POSTED')`,
        [invId, billSalesman || 'SM-01', finalCustomerId || 'WALK-IN', billNo, billNo, subtotal, totalTax, totalDisc, netTotal, taxType, billingType, customerProfile?.gstin || null, billType]);

      for (const t of tenders) {
        localDB.run(`INSERT INTO sales_payments (id, invoice_id, payment_mode, amount) VALUES (?, ?, ?, ?)`,
          [crypto.randomUUID(), invId, t.mode, t.amount]);
      }
      
      for (const item of activeItems) {
        localDB.run(`INSERT INTO sales_invoice_items (id, invoice_id, item_code, quantity, qty, mrp, rate, discount_amount, tax_amount, cgst_amt, sgst_amt, igst_amt, total, line_total) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [crypto.randomUUID(), invId, item.itemCode, item.qty, item.qty, item.mrp, item.rate, item.discAmt, item.taxAmt, item.cgstAmt, item.sgstAmt, item.igstAmt, item.amount, item.amount]);
      }

      await localDB.save();
      setInvoiceDone({ id: invId, number: billNo, amount: netTotal } as any);
      setShowPayModal(false);
      handleClear();
    } catch(e) { console.error(e); alert("Settlement Failure: " + e); }
  };

  const addTenderLine = () => {
    const amt = parseFloat(activeTenderAmt);
    if (!amt || amt <= 0) return;
    setTenders(prev => [...prev, { id: crypto.randomUUID(), mode: activePayMode, amount: amt }]);
    
    // Auto-calculate new remaining
    const newTotal = totalTendered + amt;
    const newRem = Math.max(0, netTotal - newTotal);
    setActiveTenderAmt(newRem > 0 ? newRem.toString() : "");
  };



  const fetchTillStatus = () => {
    if (!localDB.isInitialized) return;
    try {
      const invoices = localDB.exec("SELECT COUNT(id) as bills, SUM(net_total) as net, SUM(discount_amount) as discount FROM sales_invoices WHERE date(created_at) = date('now')");
      const items = localDB.exec("SELECT SUM(quantity) as items FROM sales_items WHERE invoice_id IN (SELECT id FROM sales_invoices WHERE date(created_at) = date('now'))");
      const tenders = localDB.exec("SELECT payment_mode, SUM(amount) as total FROM sales_payments WHERE invoice_id IN (SELECT id FROM sales_invoices WHERE date(created_at) = date('now')) GROUP BY payment_mode");
      
      setTillData({
        bills: invoices[0]?.bills || 0,
        net: invoices[0]?.net || 0,
        discount: invoices[0]?.discount || 0,
        items: items[0]?.items || 0,
        tenders: tenders || []
      });
      setShowTillStatus(true);
    } catch(err) {
      console.error("Failed to fetch Till Status", err);
    }
  };

  const fetchCustomerHistory = () => {
    if (!localDB.isInitialized || !customerProfile?.id) {
       alert("No fully registered customer profile attached!");
       return;
    }
    try {
      const invoices = localDB.exec("SELECT * FROM sales_invoices WHERE customer_id = ? ORDER BY created_at DESC LIMIT 15", [customerProfile.id]);
      
      const history = invoices.map((inv: any) => {
         // Join exactly how Shoper trails data
         const items = localDB.exec(`
            SELECT i.quantity, i.rate, i.total, m.item_code, m.description 
            FROM sales_items i
            JOIN item_master m ON i.item_id = m.id
            WHERE i.invoice_id = ?
         `, [inv.id]);
         const payments = localDB.exec(`
            SELECT payment_mode, amount 
            FROM sales_payments
            WHERE invoice_id = ?
         `, [inv.id]);
         return { ...inv, _items: items || [], _payments: payments || [] };
      });
      
      setCustomerHistoryData(history);
      setShowCustomerHistory(true);
    } catch(err) {
      console.error(err);
      alert("Error fetching history");
    }
  };

  const handleOpenTender = () => {
    if (activeItems.length === 0) {
      alert("Cart is empty!");
      return;
    }
    if (billType === "CREDIT") {
       if (!customerProfile) {
          alert("CUSTOMER IS MANDATORY FOR CREDIT BILLING");
          return;
       }
       if (!customerProfile.pgAllowCredit) {
          alert("CREDIT NOT ALLOWED FOR THIS PRICE GROUP!");
          return;
       }
       if (netTotal > customerProfile.pgCreditLimit) {
          const proceed = confirm(`SOFT WARNING: Credit limit of ₹${customerProfile.pgCreditLimit} exceeded! Proceed anyway?`);
          if (!proceed) return;
       }
    }
    setShowPayModal(true);
  };

  // ─── Global Keyboard Shortcuts ───
  useEffect(() => {
    const handleGlobalKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "F2") { e.preventDefault(); setShowOmniModal(true); handleOmniSearch(""); }
      if (e.key === "F7") { e.preventDefault(); fetchTillStatus(); }
      if (e.key === "F8") { e.preventDefault(); handleHoldBill(); }
      if (e.key === "F10" && !showPayModal) { e.preventDefault(); handleOpenTender(); }
      if (e.key === "Enter" && showPayModal && remainingDue === 0) { e.preventDefault(); handleSaveInvoice(tenders); }
      if (e.key === "Escape") { e.preventDefault(); 
        if (showPayModal || showRecallModal || showOmniModal || showCustomerForm || showTillStatus || showCustomerHistory) { setShowPayModal(false); setShowRecallModal(false); setShowOmniModal(false); setShowCustomerForm(false); setShowTillStatus(false); setShowCustomerHistory(false); }
        else { handleClear(); }
      }
    };
    window.addEventListener("keydown", handleGlobalKey);
    return () => window.removeEventListener("keydown", handleGlobalKey);
  }, [rows, customer, billSalesman, subtotal, totalTax, totalDisc, netTotal, tenders, remainingDue, showPayModal, showRecallModal, showOmniModal]);

  if (!isReady) return <div className="pos-loading">Initializing Advanced POS...</div>;

  return (
    <div className="pos-ultra-shell">
      {/* ── Scan Preview Toast ── */}
      {previewItem && (
        <div className="scan-toast">
           <div className="st-icon">✓</div>
           <div className="st-details">
              <div className="st-sku">{previewItem.itemCode}</div>
              <div className="st-desc">{previewItem.description}</div>
           </div>
           <div className="st-price">₹{previewItem.mrp}</div>
           <div className="combo-alert">⚡ BUY 2 GET 1 ELIGIBLE</div>
        </div>
      )}

      {/* ── Top Data Header (Shoper 9 Dense Layout) ── */}
      <header className="shoper-header">
        <div className="sh-left">
           <div className="sh-brand">
             SMRITI RETAIL 
             <div className="hw-telemetry">
                <span className="hw-dot on"></span> PNTR 
                <span className="hw-dot on"></span> SCAN 
                <span className="hw-dot on"></span> AWS 
             </div>
           </div>
           <div className="sh-doc-details">
              <span>
                <strong>Type:</strong> 
                <select 
                    value={billType} 
                    onChange={(e) => setBillType(e.target.value as "CASH" | "CREDIT")}
                    style={{ background: 'transparent', border: '1px solid #334155', color: '#38bdf8', fontSize: '10px', padding: '2px 4px', borderRadius: '4px', marginLeft: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                  <option value="CASH">CASH BILL</option>
                  <option value="CREDIT">CREDIT BILL</option>
                </select>
              </span>
              <span><strong>Doc:</strong> {isReturnMode ? "SALES RETURN" : "RETAIL SALES"}</span>
              <span><strong>Bill No:</strong> <span className="emerald">{billNo}</span></span>
              <span><strong>Date:</strong> {billDate}</span>
              <span><strong>Time:</strong> {billTime}</span>
              <span><strong>Term:</strong> POS-01</span>
           </div>
        </div>
        <div className="sh-right">
           <div className="sh-input-group relative">
              <label>Customer [F3] {billType === "CREDIT" && <span style={{color: '#f87171'}}>* REQUIRED</span>}</label>
              <input 
                style={{ borderColor: (billType === "CREDIT" && !customerProfile) ? '#f87171' : undefined }}
                value={customer} 
                onChange={e => handleCustomerChange(e.target.value)} 
                onFocus={() => setFocusedContext("CUSTOMERS")}
                onKeyDown={handleCustomerKeyDown}
                placeholder={billType === "CREDIT" ? "CREDIT ID REQUIRED" : "SEARCH / ENTER NEW"} 
              />
           </div>
           <div className="sh-input-group">
              <label>Salesman [F4]</label>
              <input 
                 value={billSalesman} 
                 onChange={e => setBillSalesman(e.target.value)} 
                 onFocus={() => setFocusedContext("SALESMEN")}
                 placeholder="BILL LEVEL" 
              />
           </div>
           <div className="sh-points-badge">★ {customerProfile ? customerProfile.points : "0.00"} Pts</div>
        </div>
      </header>

      {/* ── Main Workspace ── */}
      <main className="pos-ultra-main">
        {/* Left: Expansive High-Density Grid */}
        <section className="ultra-grid-zone">
           <div className="ultra-grid-header">
              <div className="col sn">#</div>
              <div className="col ic">ITEM CODE</div>
              <div className="col ds">DESCRIPTION</div>
              <div className="col sz">SIZE</div>
              <div className="col st">STOCK</div>
              <div className="col sm">S/MAN</div>
              <div className="col qt">QTY</div>
              <div className="col pr">MRP</div>
              <div className="col pr">RATE</div>
              <div className="col dc">L.DISC</div>
              <div className="col tx">TAX%</div>
              <div className="col am">NET AMT</div>
           </div>
           <div className="ultra-grid-body">
              {rows.map((r, i) => (
                 <div key={r.id} className={`grid-row ${i === activeRow ? "is-active" : ""} ${r.itemCode !== "" ? "has-data" : ""}`} onClick={() => setActiveRow(i)} style={{ position: 'relative' }}>
                    {r.flashKey && <div key={r.flashKey} className="row-flash" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', borderRadius: '6px' }} />}
                    <div className="col sn">{r.sno}</div>
                    <div className="col ic">
                       <input 
                         className="ghost-input"
                         value={r.itemCode} 
                         onChange={e => {
                           const val = e.target.value;
                           const newRows = [...rows];
                           newRows[i] = { ...r, itemCode: val };
                           setRows(newRows);
                         }} 
                         onKeyDown={e => e.key === "Enter" && handleScan(r.itemCode)}
                         placeholder={i === activeRow ? "..." : ""}
                         disabled={i !== activeRow && r.itemCode !== ""}
                       />
                    </div>
                    <div className="col ds">{r.description}</div>
                    <div className="col sz">{r.size}</div>
                    <div className="col st">{r.itemCode ? r.stock : ""}</div>
                    <div className="col sm">
                       <input 
                         className="ghost-input salesman-input" 
                         value={r.salesman} 
                         onChange={e => {
                           const newRows = [...rows];
                           newRows[i] = { ...r, salesman: e.target.value };
                           setRows(newRows);
                         }} 
                         disabled={!r.itemCode}
                       />
                    </div>
                    <div className="col qt">
                       {r.itemCode ? (
                         <input className="ghost-number" type="number" value={r.qty} onChange={e => {
                            updateRow(i, 'qty', Number(e.target.value));
                         }} />
                       ) : ""}
                    </div>
                    <div className="col pr">{r.itemCode ? r.mrp.toFixed(2) : ""}</div>
                    <div className="col pr">
                       {r.itemCode ? (
                          pricingService.canAlterRate() ? (
                            <input className="ghost-number" type="number" value={r.rate} onChange={e => {
                               updateRow(i, 'rate', Number(e.target.value));
                            }} style={{ width: '80%' }} />
                          ) : (
                            r.rate.toFixed(2)
                          )
                       ) : ""}
                    </div>
                    <div className="col dc">{r.itemCode ? (r.discPct !== 0 ? `${r.discPct}%` : "0%") : ""}</div>
                    <div className="col tx">{r.itemCode ? (r.taxPct !== 0 ? `${r.taxPct}%` : "0%") : ""}</div>
                    <div className="col am row-amt">{r.amount > 0 ? r.amount.toFixed(2) : ""}</div>
                 </div>
              ))}
           </div>
        </section>

        {/* Right: Data Totals Console */}
        <aside className="ultra-console-zone">
           {/* Scanner Command Line */}
           <div className="console-panel scan-panel">
              <label>OMNI COMMAND [F2]</label>
              <input 
                ref={scanRef}
                className="scanner-input"
                placeholder="READY TO SCAN" 
                value={scanInput}
                onChange={e => setScanInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleScan(scanInput)}
                onFocus={() => setFocusedContext("ITEMS")}
                autoFocus
              />
              <div className="scanner-status">
                 <div className="pulse"></div> SCANNER ONLINE
              </div>
           </div>

           {/* Customer HUD (Active Only when Attached) */}
           {customerProfile && (
             <div className="console-panel customer-panel" style={{ padding: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                   <strong style={{ color: '#10b981', fontSize: '15px', letterSpacing: '0.5px' }}>{customerProfile.name.toUpperCase()}</strong>
                   <span className={`c3-badge ${customerProfile.tier.toLowerCase()}`} style={{ fontSize: '10px', padding: '2px 6px' }}>{customerProfile.tier}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px', color: '#94a3b8' }}>
                   <div><span style={{color: '#64748b'}}>LAST:</span> <span style={{color: '#cbd5e1'}}>{customerProfile.lastVisit}</span></div>
                   <div style={{textAlign: 'right'}}><span style={{color: '#64748b'}}>LTV:</span> <span style={{color: '#cbd5e1'}}>₹{customerProfile.lifetimeSpend.toLocaleString()}</span></div>
                   
                   <div style={{ background: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.2)', padding: '4px', borderRadius: '4px', fontSize: '10px', color: '#fbbf24', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginTop: '4px' }}>
                      <span style={{width: 6, height: 6, borderRadius: '50%', background: '#fbbf24'}}></span>
                      {customerProfile.taxType} TAX [STRICT]
                   </div>
                   <div style={{ background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.2)', padding: '4px', borderRadius: '4px', fontSize: '10px', color: '#38bdf8', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginTop: '4px' }}>
                      <span style={{width: 6, height: 6, borderRadius: '50%', background: '#38bdf8'}}></span>
                      {customerProfile.destCode === 'LOC' ? 'LOCAL REGION' : 'OUTSTATION'}
                   </div>

                   <div style={{gridColumn: 'span 2', background: '#050a14', padding: '6px', borderRadius: '4px', textAlign: 'center', marginTop: '8px'}}>
                     <span className="amber font-bold" style={{ fontSize: '14px' }}>★ {customerProfile.points} PTS AVAILABLE</span>
                   </div>
                   {billType === "CREDIT" && (
                   <div style={{gridColumn: 'span 2', background: customerProfile.pgAllowCredit ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', border: customerProfile.pgAllowCredit ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)', padding: '6px', borderRadius: '4px', textAlign: 'center', marginTop: '4px'}}>
                     {customerProfile.pgAllowCredit ? (
                       <span style={{ color: '#10b981', fontSize: '12px', fontWeight: 'bold' }}>CREDIT APPROVED: Lmt ₹{customerProfile.pgCreditLimit.toLocaleString()}</span>
                     ) : (
                       <span style={{ color: '#ef4444', fontSize: '12px', fontWeight: 'bold' }}>CREDIT NOT ALLOWED IN PRICE GROUP</span>
                     )}
                   </div>
                   )}
                </div>
                <button 
                  style={{ width: '100%', marginTop: '12px', padding: '8px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#60a5fa', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', fontWeight: 800, letterSpacing: '1px' }}
                  onClick={fetchCustomerHistory}
                >
                  VIEW PURCHASE HISTORY
                </button>
             </div>
           )}

           {/* Core Totals */}
           <div className="console-panel totals-panel">
              <div className="tp-row items-row">
                 <span>T. Items: <strong className="amber">{activeItems.length}</strong></span>
                 <span>T. Qty: <strong className="amber">{totalQty}</strong></span>
              </div>
              <div className="tp-divider"></div>
              <div className="tp-row">
                 <span>Gross Value</span>
                 <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="tp-row">
                 <span>Bill Discount [F6]</span>
                 <span className="amber">- ₹{totalDisc.toFixed(2)}</span>
              </div>
              <div className="tp-row">
                 <span>Tax Value</span>
                 <span>+ ₹{totalTax.toFixed(2)}</span>
              </div>
              <div className="tp-row">
                 <span>Round Off</span>
                 <span className="subtext">{roundOff > 0 ? "+" : ""}₹{roundOff.toFixed(2)}</span>
              </div>
              <div className="tp-divider"></div>
              <div className="tp-row grand-total">
                 <span>NET PAYABLE</span>
                 <span className="emerald">₹{netTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
           </div>
        </aside>
      </main>

      {/* ── Bottom Ribbon ── */}
      <footer className="pos-ribbon">
         <div className="ribbon-btn" onClick={() => { setShowOmniModal(true); handleOmniSearch(""); }}><span>[F2]</span> OMNI SRCH</div>
         <div className="ribbon-btn" onClick={() => {}}><span>[F3]</span> CUST</div>
         <div className="ribbon-btn" onClick={() => {}}><span>[F4]</span> SMAN</div>
         <div className="ribbon-btn" onClick={() => {}}><span>[F6]</span> B.DISC</div>
         <div className="ribbon-btn warning" onClick={handleHoldBill}><span>[F8]</span> HOLD BN</div>
         <div className="ribbon-btn" onClick={fetchSuspendedBills}><span>[F9]</span> Rcl BN</div>
         <div className="ribbon-btn success" onClick={handleOpenTender}><span>[F10]</span> TENDER</div>
         <div className="ribbon-btn danger" onClick={handleClear}><span>[ESC]</span> CLEAR</div>
      </footer>

      {/* ── Multi-Tender Settlement Modal ── */}
      {showPayModal && (
        <div className="ultra-modal-overlay">
           <div className="ultra-modal settle-modal multi-tender">
              <div className="um-header">
                 <div className="flex-col">
                    <h2>MULTI-TENDER ENGINE [F10]</h2>
                    <span className="subtext">Verify payment allocations before posting.</span>
                 </div>
                 <button className="close-btn" onClick={() => setShowPayModal(false)}>✕</button>
              </div>
              <div className="um-body tender-body">
                 
                 {/* Progress Bar & Goals */}
                 <div className="mt-progress-container">
                    <div className="mt-labels">
                       <span className="subtext">Target: ₹{netTotal.toLocaleString()}</span>
                       <span className={remainingDue === 0 ? "emerald font-bold" : "amber"}>
                         {remainingDue === 0 ? "FULLY TENDERED" : `DUE: ₹${remainingDue.toLocaleString()}`}
                       </span>
                    </div>
                    <div className="mt-bar-bg">
                       <div className="mt-bar-fill" style={{width: `${progressPct}%`, background: remainingDue === 0 ? '#10b981' : '#3b82f6'}}></div>
                    </div>
                 </div>

                 {/* Existing Tenders */}
                 <div className="tender-list">
                    {tenders.length === 0 && <div className="tl-empty">No payments received yet.</div>}
                    {tenders.map((t, idx) => (
                       <div key={t.id} className="tl-row">
                          <span className="tl-mode">{idx+1}. {t.mode}</span>
                          <span className="tl-amt">₹{t.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                          <button className="tl-del" onClick={() => setTenders(tenders.filter(x => x.id !== t.id))}>✕</button>
                       </div>
                    ))}
                 </div>

                 {/* New Tender Input */}
                 {remainingDue > 0 && (
                   <div className="mt-add-box">
                      <div className="mt-inputs">
                         <select className="mt-select" value={activePayMode} onChange={e => setActivePayMode(e.target.value as PayMode)}>
                            <option>CASH</option><option>CREDIT CARD</option><option>DEBIT CARD</option><option>UPI</option><option>STORE CREDIT</option><option>LOYALTY PTS</option>
                         </select>
                         <input 
                           type="number" 
                           className="mt-input" 
                           value={activeTenderAmt} 
                           onChange={e => setActiveTenderAmt(e.target.value)} 
                           onKeyDown={e => e.key === "Enter" && addTenderLine()}
                           autoFocus
                         />
                      </div>
                      <button className="mt-add-btn" onClick={addTenderLine}>+ ADD TENDER</button>
                   </div>
                 )}

                 {/* Footers */}
                 <div className="change-section mt-change">
                    <span>CHANGE DUE TO CUSTOMER</span>
                    <span className={`change-val ${changeDue > 0 ? "amber" : "subtext"}`}>
                       ₹{changeDue.toFixed(2)}
                    </span>
                 </div>
              </div>
              
              <div className="um-footer">
                 {remainingDue === 0 ? (
                   <button className="action-btn w-full cta success" onClick={() => handleSaveInvoice(tenders)}>
                      POST INVOICE <span className="hotkey">[ENTER]</span>
                   </button>
                 ) : (
                   <button className="action-btn w-full cta" disabled style={{opacity: 0.5}}>
                      FUNDS INSUFFICIENT
                   </button>
                 )}
              </div>
           </div>
        </div>
      )}

      {/* ── Recall Modal ── */}
      {showRecallModal && (
        <div className="ultra-modal-overlay">
           <div className="ultra-modal recall-modal">
              <div className="um-header">
                 <h2>RECALL BILL [F9]</h2>
                 <button className="close-btn" onClick={() => setShowRecallModal(false)}>✕</button>
              </div>
              <div className="um-body">
                 {suspendedQueue.length === 0 ? (
                    <div style={{color: "#64748b", textAlign: "center", padding: "20px"}}>No Suspended Bills Found.</div>
                 ) : (
                    <div className="recall-list">
                       {suspendedQueue.map(b => (
                          <div key={b.id} className="recall-item" onClick={() => handleRecallSelect(b)}>
                             <div className="ri-meta">
                                <strong>{b.customer}</strong>
                                <span className="subtext">{new Date(b.timestamp).toLocaleTimeString()}</span>
                             </div>
                             <div className="ri-amt emerald">₹{b.totalAmt.toFixed(2)}</div>
                          </div>
                       ))}
                    </div>
                 )}
              </div>
           </div>
        </div>
      )}

      {/* ── Omni Search F2 Modal ── */}
      {showOmniModal && (
        <div className="ultra-modal-overlay">
           <div className="ultra-modal omni-modal multi-tender">
              <div className="um-header" style={{borderBottom: '2px solid #38bdf8'}}>
                 <h2>{focusedContext === "CUSTOMERS" ? "CUSTOMER SEARCH [F2]" : focusedContext === "SALESMEN" ? "SALESMAN SEARCH [F2]" : "GLOBAL INVENTORY SEARCH [F2]"}</h2>
                 <button className="close-btn" onClick={() => setShowOmniModal(false)}>✕</button>
              </div>
              <div className="um-body tender-body">
                 <input 
                   className="mt-input w-full" 
                   style={{textAlign: 'left'}}
                   placeholder="Search..." 
                   value={omniQuery} 
                   onChange={e => handleOmniSearch(e.target.value)}
                   autoFocus
                 />
                 <div className="tender-list" style={{maxHeight: '300px'}}>
                    {omniResults.length === 0 ? (
                      <div className="tl-empty">Type to query...</div>
                    ) : (
                      omniResults.map((itm, i) => {
                        if(focusedContext === "CUSTOMERS") {
                           return (
                             <div key={i} className="tl-row" style={{cursor: 'pointer'}} onClick={() => { handleCustomerChange(itm.phone_number); setShowOmniModal(false); }}>
                                <span className="tl-mode" style={{width: '120px', color: '#38bdf8'}}>{itm.phone_number}</span>
                                <span className="tl-mode" style={{color:'#fff', flex: 1}}>{itm.name}</span>
                                <span className="tl-amt" style={{width: '70px', fontSize: '11px'}}>{itm.loyalty_tier}</span>
                             </div>
                           );
                        }
                        if(focusedContext === "SALESMEN") {
                           return (
                             <div key={i} className="tl-row" style={{cursor: 'pointer'}} onClick={() => { setBillSalesman(itm.code); setShowOmniModal(false); }}>
                                <span className="tl-mode" style={{width: '120px', color: '#38bdf8'}}>{itm.code}</span>
                                <span className="tl-mode" style={{color:'#fff', flex: 1}}>{itm.name}</span>
                             </div>
                           );
                        }
                        return (
                          <div key={i} className="tl-row" style={{cursor: 'pointer'}} onClick={() => { handleScan(itm.item_code as string); setShowOmniModal(false); }}>
                             <span className="tl-mode" style={{width: '80px', color: '#38bdf8'}}>{itm.item_code}</span>
                             <span className="tl-mode" style={{color:'#fff', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden'}}>{itm.description}</span>
                             <span className="tl-mode" style={{width: '30px', textAlign: 'center'}}>{itm.size_code || "OS"}</span>
                             <span className="tl-amt" style={{width: '50px'}}>₹{Number(itm.mrp)}</span>
                             <span className={`tl-amt ${Number(itm.stock_qty) > 0 ? "emerald font-bold" : "amber"}`} style={{width: '70px', fontSize: '11px'}}>
                                STK: {itm.stock_qty}
                             </span>
                          </div>
                        );
                      })
                    )}
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* ── Customer Form Overlay ── */}
      {showCustomerForm && (
        <div className="ultra-modal-overlay">
           <div className="ultra-modal settle-modal multi-tender" style={{width:'400px'}}>
              <div className="um-header">
                 <h2>NEW CUSTOMER ONBOARDING</h2>
                 <button className="close-btn" onClick={() => setShowCustomerForm(false)}>✕</button>
              </div>
              <div className="um-body tender-body">
                 <div className="mt-add-box" style={{borderTop: 'none', paddingTop: 0}}>
                    <label style={{fontSize:'11px', color:'#94a3b8', fontWeight:'bold', marginBottom:'4px'}}>PHONE NUMBER</label>
                    <input 
                      className="mt-input w-full" 
                      style={{textAlign: 'left', marginBottom:'12px'}}
                      value={newCustomer.phone}
                      onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})}
                      disabled
                    />
                    <label style={{fontSize:'11px', color:'#94a3b8', fontWeight:'bold', marginBottom:'4px'}}>CUSTOMER NAME</label>
                    <input 
                      className="mt-input w-full" 
                      style={{textAlign: 'left'}}
                      placeholder="e.g. Jawahar R Mallah"
                      value={newCustomer.name}
                      onChange={e => setNewCustomer({...newCustomer, name: e.target.value})}
                      onKeyDown={e => e.key === "Enter" && saveNewCustomer()}
                      autoFocus
                    />
                 </div>
              </div>
              <div className="um-footer">
                 <button className="action-btn w-full cta success" onClick={saveNewCustomer}>
                    SAVE CUSTOMER <span className="hotkey">[ENTER]</span>
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* ── Success Modal ── */}
      {invoiceDone && (
        <div className="ultra-modal-overlay success-overlay">
           <div className="ultra-modal success-modal">
              <div className="sm-icon">✓</div>
              <h2>INVOICE {billNo} POSTED</h2>
              <p>Atomic transaction committed to Sovereign DB.</p>
              <button className="action-btn w-full" onClick={() => window.location.reload()}>Next Bill</button>
           </div>
        </div>
      )}

      {/* ── Till Status (Z-Report) Modal ── */}
      {showTillStatus && tillData && (
        <div className="ultra-modal-overlay" onClick={() => setShowTillStatus(false)}>
           <div className="ultra-modal shp-glass popup" onClick={e => e.stopPropagation()} style={{ width: 500 }}>
              <div className="um-header">
                 <h2>SESSION TILL STATUS</h2>
                 <span className="hotkey">[ESC] to Close</span>
              </div>
              <div className="um-body">
                 <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
                    <div style={{ background: "#0a0a0a", border: "1px solid #1e293b", padding: "16px", borderRadius: "12px", textAlign: "center" }}>
                       <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 800 }}>BILLS GENERATED</div>
                       <div style={{ fontSize: "28px", color: "#10b981", fontWeight: 900 }}>{tillData.bills}</div>
                    </div>
                    <div style={{ background: "#0a0a0a", border: "1px solid #1e293b", padding: "16px", borderRadius: "12px", textAlign: "center" }}>
                       <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 800 }}>ITEMS SOLD</div>
                       <div style={{ fontSize: "28px", color: "#38bdf8", fontWeight: 900 }}>{tillData.items}</div>
                    </div>
                 </div>

                 <div style={{ background: "#060a14", border: "1px solid #1e293b", borderRadius: "12px", padding: "16px", marginBottom: "20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", borderBottom: "1px dashed #334155", paddingBottom: "8px" }}>
                       <span style={{ fontSize: "13px", color: "#94a3b8" }}>GROSS SALES:</span>
                       <strong style={{ fontSize: "15px", color: "#f8fafc" }}>₹{(tillData.net + tillData.discount).toLocaleString("en-IN")}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", borderBottom: "1px dashed #334155", paddingBottom: "8px" }}>
                       <span style={{ fontSize: "13px", color: "#ef4444" }}>(-) DISCOUNT:</span>
                       <strong style={{ fontSize: "15px", color: "#ef4444" }}>₹{(tillData.discount).toLocaleString("en-IN")}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: "12px" }}>
                       <span style={{ fontSize: "16px", color: "#64748b", fontWeight: 900 }}>NET SALES:</span>
                       <strong style={{ fontSize: "24px", color: "#fbbf24", letterSpacing: "1px" }}>₹{(tillData.net).toLocaleString("en-IN")}</strong>
                    </div>
                 </div>

                 <div style={{ border: "1px solid #1e293b", borderRadius: "12px", overflow: "hidden" }}>
                    <div style={{ background: "#1e293b", padding: "8px 16px", fontSize: "11px", fontWeight: 800, color: "#94a3b8" }}>TENDER BREAKDOWN</div>
                    {tillData.tenders && tillData.tenders.length > 0 ? (
                       <div style={{ background: "#0a0a0a", padding: "12px 16px" }}>
                          {tillData.tenders.map((t: any, i: number) => (
                             <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                                <span style={{ fontSize: "12px", color: "#f8fafc", fontWeight: 700 }}>{t.payment_mode}</span>
                                <strong style={{ fontSize: "14px", color: "#38bdf8" }}>₹{t.total.toLocaleString("en-IN")}</strong>
                             </div>
                          ))}
                       </div>
                    ) : (
                       <div style={{ padding: "16px", textAlign: "center", fontSize: "12px", color: "#64748b" }}>No active tenders today.</div>
                    )}
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* ── Customer History Modal ── */}
      {showCustomerHistory && customerProfile && (
        <div className="ultra-modal-overlay" onClick={() => setShowCustomerHistory(false)}>
           <div className="ultra-modal shp-glass popup" onClick={e => e.stopPropagation()} style={{ width: 700, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
              <div className="um-header" style={{ paddingBottom: '16px', borderBottom: '1px solid #1e293b' }}>
                 <div className="flex-col">
                    <h2>PURCHASE HISTORY</h2>
                    <span style={{ color: '#94a3b8', fontSize: '13px' }}>{customerProfile.name.toUpperCase()} • {customerProfile.phone}</span>
                 </div>
                 <button className="close-btn" onClick={() => setShowCustomerHistory(false)}>✕</button>
              </div>
              <div className="um-body" style={{ overflowY: 'auto', flex: 1, padding: '16px 8px', marginTop: '8px' }}>
                 {customerHistoryData.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>No past transactions found on this node.</div>
                 ) : (
                    customerHistoryData.map((inv: any, idx: number) => (
                       <div key={idx} style={{ background: "#0a0a0a", border: "1px solid #1e293b", borderRadius: "8px", padding: "16px", marginBottom: "16px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(30, 41, 59, 0.5)", paddingBottom: "12px", marginBottom: "12px" }}>
                             <div>
                                <div style={{ fontSize: "14px", fontWeight: 800, color: "#f8fafc" }}>Bill: {inv.invoice_number}</div>
                                <div style={{ fontSize: "12px", color: "#64748b", marginTop: '4px' }}>{new Date(inv.created_at).toLocaleString("en-IN")}</div>
                             </div>
                             <div style={{ textAlign: "right" }}>
                                <div style={{ fontSize: "16px", fontWeight: 800, color: "#10b981" }}>₹{inv.net_total.toLocaleString()}</div>
                                <div style={{ fontSize: "12px", color: "#64748b", marginTop: '4px' }}>{inv._items.length} Unique Items</div>
                             </div>
                          </div>
                          
                          <table style={{ width: "100%", fontSize: "12px", textAlign: "left", borderCollapse: "collapse" }}>
                             <thead>
                                <tr style={{ color: "#64748b", borderBottom: "1px dashed #1e293b" }}>
                                   <th style={{ paddingBottom: "6px" }}>ITEM CODE</th>
                                   <th style={{ paddingBottom: "6px" }}>DESCRIPTION</th>
                                   <th style={{ paddingBottom: "6px", textAlign: "right" }}>QTY</th>
                                   <th style={{ paddingBottom: "6px", textAlign: "right" }}>RATE</th>
                                   <th style={{ paddingBottom: "6px", textAlign: "right" }}>TOTAL</th>
                                </tr>
                             </thead>
                             <tbody>
                                {inv._items.map((it: any, i2: number) => (
                                   <tr key={i2} style={{ borderBottom: "1px solid rgba(30,41,59,0.3)" }}>
                                      <td style={{ padding: "8px 0", color: "#94a3b8", fontFamily: "monospace" }}>{it.item_code}</td>
                                      <td style={{ padding: "8px 0", color: "#cbd5e1" }}>{it.description}</td>
                                      <td style={{ padding: "8px 0", color: "#f8fafc", textAlign: "right" }}>{it.quantity}</td>
                                      <td style={{ padding: "8px 0", color: "#64748b", textAlign: "right" }}>₹{it.rate}</td>
                                      <td style={{ padding: "8px 0", color: "#f8fafc", textAlign: "right" }}>₹{it.total}</td>
                                   </tr>
                                ))}
                             </tbody>
                          </table>
                          
                          {inv._payments && inv._payments.length > 0 && (
                            <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px dashed #1e293b", display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
                               <span style={{ fontSize: "11px", fontWeight: 800, color: "#64748b" }}>TENDERS:</span>
                               {inv._payments.map((p: any, i3: number) => (
                                 <span key={i3} style={{ fontSize: "12px", color: p.payment_mode === "CASH" ? "#10b981" : "#38bdf8", background: p.payment_mode === "CASH" ? "rgba(16, 185, 129, 0.1)" : "rgba(56, 189, 248, 0.1)", border: `1px solid ${p.payment_mode === "CASH" ? "rgba(16, 185, 129, 0.3)" : "rgba(56, 189, 248, 0.3)"}`, padding: "2px 8px", borderRadius: "4px" }}>
                                    {p.payment_mode}: ₹{Number(p.amount).toLocaleString("en-IN")}
                                 </span>
                               ))}
                            </div>
                          )}
                       </div>
                    ))
                 )}
              </div>
           </div>
        </div>
      )}

      {/* ── Ultra-Premium P2 POS Styling ── */}
      <style jsx>{`
        /* Global Shell */
        .pos-ultra-shell {
          background: #02050f;
          color: #f1f5f9;
          position: fixed;
          inset: 0;
          display: flex;
          flex-direction: column;
          font-family: 'Outfit', 'Inter', -apple-system, sans-serif;
          overflow: hidden;
          z-index: 9999;
        }
        /* Ambient Backgrounds */
        .pos-ultra-shell::before, .pos-ultra-shell::after {
          content: ''; position: absolute; border-radius: 50%; filter: blur(140px); pointer-events: none; z-index: 0;
        }
        .pos-ultra-shell::before {
          width: 800px; height: 800px; top: -300px; left: -100px; background: radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 60%);
        }
        .pos-ultra-shell::after {
          width: 700px; height: 700px; bottom: -200px; right: -100px; background: radial-gradient(circle, rgba(56,189,248,0.06) 0%, transparent 60%);
        }

        .emerald { color: #10b981 !important; }
        .amber { color: #fbbf24 !important; }
        .subtext { color: rgba(148,163,184,0.6); }
        .font-bold { font-weight: 800; }
        .flex-col { display: flex; flex-direction: column; }
        .relative { position: relative; z-index: 1; }

        /* Modern Dense Header */
        .shoper-header {
          display: flex; justify-content: space-between;
          background: rgba(2, 5, 15, 0.85); backdrop-filter: blur(20px) saturate(180%);
          border-bottom: 1px solid rgba(255,255,255,0.06);
          padding: 8px 24px; min-height: 60px; z-index: 10;
        }
        .sh-left { display: flex; flex-direction: column; justify-content: center; gap: 6px; }
        .sh-brand { font-size: 16px; font-weight: 900; letter-spacing: 2.5px; color: #38bdf8; display: flex; align-items: center; justify-content: space-between; text-transform: uppercase; }
        .hw-telemetry { display: flex; gap: 14px; font-size: 9px; color: rgba(148,163,184,0.6); font-weight: 800; letter-spacing: 1.5px; align-items: center; }
        .hw-dot { width: 6px; height: 6px; background: rgba(51,65,85,0.5); border-radius: 50%; display: inline-block; margin-right: 5px; }
        .hw-dot.on { background: #10b981; box-shadow: 0 0 8px #10b981; animation: pulse 2s infinite; }

        .sh-doc-details { display: flex; gap: 20px; font-size: 11.5px; color: rgba(148,163,184,0.7); font-weight: 500; font-family: 'JetBrains Mono', monospace; }
        .sh-doc-details strong { color: #e2e8f0; font-weight: 600; margin-right: 4px; }
        
        .sh-right { display: flex; gap: 24px; align-items: center; }
        .sh-input-group { display: flex; flex-direction: column; gap: 4px; }
        .sh-input-group label { font-size: 9px; color: rgba(148,163,184,0.8); font-weight: 800; letter-spacing: 1px; text-transform: uppercase; }
        .sh-input-group input { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); color: #f8fafc; padding: 6px 10px; border-radius: 6px; font-family: inherit; font-size: 12px; font-weight: 600; outline: none; width: 160px; transition: all 0.2s; }
        .sh-input-group input:focus { background: rgba(56,189,248,0.05); border-color: rgba(56,189,248,0.4); box-shadow: 0 0 0 3px rgba(56,189,248,0.1); }
        .sh-points-badge { background: rgba(251, 191, 36, 0.1); color: #fbbf24; border: 1px solid rgba(251, 191, 36, 0.25); padding: 5px 16px; border-radius: 50px; font-size: 12.5px; font-weight: 800; letter-spacing: 0.5px; }

        /* Main Workspace */
        .pos-ultra-main { flex: 1; display: flex; overflow: hidden; position: relative; z-index: 1; }
        .ultra-grid-zone { flex: 1; display: flex; flex-direction: column; background: transparent; }
        .ultra-console-zone { width: 340px; background: rgba(4, 8, 20, 0.7); backdrop-filter: blur(12px); border-left: 1px solid rgba(255,255,255,0.06); display: flex; flex-direction: column; padding: 20px; gap: 16px; z-index: 10; }

        /* High-Density Grid */
        .ultra-grid-header { display: flex; padding: 10px 24px; background: rgba(0,0,0,0.3); border-bottom: 1px solid rgba(255,255,255,0.08); font-size: 10px; font-weight: 800; color: rgba(148,163,184,0.7); letter-spacing: 1px; font-family: 'JetBrains Mono', monospace; text-transform: uppercase; }
        .ultra-grid-body { flex: 1; overflow-y: auto; padding: 12px 24px; display: flex; flex-direction: column; }
        .grid-row { display: flex; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.03); font-size: 13px; font-family: 'JetBrains Mono', monospace; font-weight: 500; color: rgba(148,163,184,0.7); align-items: center; transition: all 0.2s cubic-bezier(0.4,0,0.2,1); border-radius: 6px; }
        .grid-row.has-data { color: #e2e8f0; }
        .grid-row.is-active { background: rgba(56, 189, 248, 0.05); border-color: transparent; box-shadow: inset 0 0 0 1px rgba(56, 189, 248, 0.3); transform: scale(1.002); }
        .grid-row.is-active .sn { color: #38bdf8; font-weight: 900; }
        .row-flash { animation: scanFlash 0.5s ease-out; }
        @keyframes scanFlash { 0% { background: rgba(16,185,129,0.3); box-shadow: 0 0 20px rgba(16,185,129,0.2); } 100% { background: transparent; } }

        /* Columns */
        .col { padding: 0 10px; }
        .col.sn { width: 34px; font-weight: 800; text-align: center; }
        .col.ic { width: 140px; }
        .col.ds { flex: 1; min-width: 150px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-family: 'Outfit', sans-serif; font-size: 14px; font-weight: 500; }
        .col.sz { width: 54px; text-align: center; }
        .col.st { width: 50px; text-align: center; color: rgba(56,189,248,0.8); font-weight: 700;}
        .col.sm { width: 90px; }
        .col.qt { width: 54px; text-align: center; }
        .col.pr { width: 74px; text-align: right; }
        .col.dc { width: 60px; text-align: right; }
        .col.tx { width: 50px; text-align: right; }
        .col.am { width: 90px; text-align: right; font-weight: 800; }
        .row-amt { color: #10b981; font-size: 14px; }

        /* Ghost Inputs */
        .ghost-input { background: transparent; border: none; color: inherit; font-family: inherit; font-size: inherit; font-weight: inherit; outline: none; width: 100%; border-bottom: 1px solid transparent; padding: 2px 0; transition: 0.2s; }
        .grid-row.is-active .ghost-input { border-bottom: 1px dashed rgba(56,189,248,0.5); color: #38bdf8; }
        .ghost-input.salesman-input { border-bottom: 1px dashed rgba(255,255,255,0.1); }
        .ghost-number { background: transparent; border: none; color: inherit; font-family: inherit; font-size: inherit; outline: none; width: 100%; text-align: center; border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; padding: 2px 0;}
        .grid-row.is-active .ghost-number { border-color: rgba(56,189,248,0.4); color: #38bdf8; font-weight: 900; background: rgba(56,189,248,0.05); }

        /* Console Panels (Premium Glassmorphic) */
        .console-panel { background: rgba(10,15,35,0.6); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; padding: 20px; display: flex; flex-direction: column; position: relative; overflow: hidden; backdrop-filter: blur(8px); }
        .console-panel label { font-size: 9px; font-weight: 800; color: rgba(148,163,184,0.6); letter-spacing: 1.5px; text-transform: uppercase; }
        .scan-panel { border: 1px solid rgba(56,189,248,0.3); background: rgba(12,25,48,0.7); box-shadow: inset 0 0 40px rgba(56,189,248,0.03); }
        .scan-panel::before { content: ''; position: absolute; top: -50px; right: -50px; width: 100px; height: 100px; background: rgba(56,189,248,0.2); filter: blur(40px); border-radius: 50%; }
        .scanner-input { background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.08); color: #38bdf8; font-size: 18px; font-weight: 900; font-family: 'JetBrains Mono', monospace; margin: 12px 0; outline: none; width: 100%; padding: 12px; border-radius: 8px; text-align: center; transition: 0.2s; letter-spacing: 1px; }
        .scanner-input:focus { border-color: rgba(56,189,248,0.5); background: rgba(56,189,248,0.05); box-shadow: 0 0 0 3px rgba(56,189,248,0.1); transform: scale(1.02); }
        .scanner-status { display: flex; align-items: center; gap: 8px; font-size: 9px; font-weight: 900; color: #38bdf8; justify-content: center; letter-spacing: 1px; }

        .totals-panel { gap: 12px; margin-top: auto; border: 1px solid rgba(16,185,129,0.2); background: rgba(4,18,12,0.6); box-shadow: inset 0 0 40px rgba(16,185,129,0.02); }
        .totals-panel::before { content: ''; position: absolute; bottom: -50px; left: -50px; width: 120px; height: 120px; background: rgba(16,185,129,0.15); filter: blur(50px); border-radius: 50%; }
        .items-row { background: rgba(255,255,255,0.02); padding: 10px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.03); }
        .tp-row { display: flex; justify-content: space-between; font-size: 13px; color: rgba(148,163,184,0.8); align-items: center; font-weight: 500; }
        .tp-divider { height: 1px; background: rgba(255,255,255,0.06); margin: 6px 0; }
        .grand-total { font-size: 16px; font-weight: 800; color: #f8fafc; }
        .grand-total .emerald { font-size: 32px; font-weight: 900; font-family: 'JetBrains Mono', monospace; text-shadow: 0 0 20px rgba(16,185,129,0.4); line-height: 1;}

        /* Ribbon Footer */
        .pos-ribbon { display: flex; background: rgba(2, 5, 15, 0.9); border-top: 1px solid rgba(255,255,255,0.06); height: 52px; z-index: 10; font-family: 'Outfit', sans-serif;}
        .ribbon-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; border-right: 1px solid rgba(255,255,255,0.04); font-size: 11.5px; font-weight: 700; color: rgba(148,163,184,0.8); cursor: pointer; transition: all 0.2s; letter-spacing: 0.5px;}
        .ribbon-btn:hover { background: rgba(255,255,255,0.02); color: #f8fafc; }
        .ribbon-btn span { background: rgba(255,255,255,0.06); padding: 3px 6px; border-radius: 4px; font-size: 9.5px; font-family: 'JetBrains Mono', monospace;}
        .ribbon-btn.warning { color: #fbbf24; }
        .ribbon-btn.warning span { background: rgba(251, 191, 36, 0.15); border: 1px solid rgba(251, 191, 36, 0.3); }
        .ribbon-btn.success { color: #10b981; }
        .ribbon-btn.success span { background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16,185,129,0.3); }
        .ribbon-btn.danger { color: #ef4444; }
        .ribbon-btn.danger span { background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); }

        /* Pulse */
        .pulse { width: 6px; height: 6px; background: #38bdf8; border-radius: 50%; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite; }
        @keyframes ping { 75%, 100% { transform: scale(2.5); opacity: 0; } }

        /* Toast */
        .scan-toast { position: fixed; top: 90px; left: 50%; transform: translateX(-50%); background: rgba(15,23,42, 0.85); border: 1px solid rgba(16,185,129,0.5); backdrop-filter: blur(16px); padding: 12px 24px; border-radius: 50px; display: flex; align-items: center; gap: 16px; z-index: 100; animation: slideDown 0.3s cubic-bezier(0.4,0,0.2,1); box-shadow: 0 10px 40px rgba(16,185,129,0.2); }
        @keyframes slideDown { from { transform: translate(-50%, -20px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
        .st-icon { width: 24px; height: 24px; background: linear-gradient(135deg, #10b981, #059669); color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 12px; box-shadow: 0 0 10px rgba(16,185,129,0.4);}
        .st-details { display: flex; flex-direction: column; }
        .st-sku { font-size: 10px; font-weight: 800; color: #10b981; font-family: 'JetBrains Mono', monospace;}
        .st-desc { font-size: 13px; color: #f8fafc; font-weight: 700; max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;}
        .st-price { font-size: 16px; font-weight: 900; color: #fff; margin-left: 16px; margin-right: 16px; font-family: 'JetBrains Mono', monospace;}
        .combo-alert { background: rgba(251,191,36,0.1); color: #fbbf24; border: 1px solid rgba(251,191,36,0.3); padding: 5px 10px; border-radius: 6px; font-size: 9px; font-weight: 900; letter-spacing: 1px; }

        /* Modals (Standardized) */
        .ultra-modal-overlay { position: fixed; inset: 0; background: rgba(2, 6, 23, 0.7); backdrop-filter: blur(8px); z-index: 1000; display: flex; align-items: center; justify-content: center; }
        .ultra-modal { background: rgba(10,15,35,0.9); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; width: 440px; box-shadow: 0 40px 100px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.03); animation: scaleIn 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275); position: relative; overflow: hidden; }
        .ultra-modal::before { content: ''; position: absolute; top: -50px; left: -50px; width: 150px; height: 150px; background: rgba(99,102,241,0.1); filter: blur(50px); border-radius: 50%; pointer-events: none;}
        .ultra-modal.multi-tender { width: 500px; }
        @keyframes scaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        
        .um-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid rgba(255,255,255,0.05); position: relative; z-index: 1;}
        .um-header h2 { margin: 0; font-size: 15px; font-weight: 800; color: #f8fafc; letter-spacing: -0.3px;}
        .close-btn { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.05); color: rgba(148,163,184,0.8); font-size: 16px; cursor: pointer; width: 28px; height: 28px; border-radius: 6px; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
        .close-btn:hover { background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.3); color: #ef4444; }
        .um-footer { padding: 20px 24px; background: rgba(0,0,0,0.3); border-top: 1px solid rgba(255,255,255,0.05); position: relative; z-index: 1;}
        
        /* Multi-Tender Specific */
        .tender-body { padding: 24px; display: flex; flex-direction: column; gap: 24px; position: relative; z-index: 1;}
        
        .mt-progress-container { display: flex; flex-direction: column; gap: 10px; }
        .mt-labels { display: flex; justify-content: space-between; font-size: 12px; font-weight: 800; color: rgba(148,163,184,0.8); text-transform: uppercase; letter-spacing: 1px;}
        .mt-bar-bg { height: 10px; background: rgba(255,255,255,0.05); border-radius: 5px; overflow: hidden; box-shadow: inset 0 1px 3px rgba(0,0,0,0.5);}
        .mt-bar-fill { height: 100%; transition: width 0.4s cubic-bezier(0.4,0,0.2,1), background 0.4s ease; box-shadow: 0 0 10px rgba(0,0,0,0.2);}
        
        .tender-list { display: flex; flex-direction: column; gap: 8px; min-height: 80px; max-height: 220px; overflow-y: auto; background: rgba(0,0,0,0.4); padding: 12px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.03); }
        .tl-empty { text-align: center; color: rgba(148,163,184,0.5); font-size: 12px; margin-top: 20px; font-style: italic; }
        .tl-row { display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.03); padding: 10px 14px; border-radius: 6px; font-size: 13px; font-weight: 700; color: #e2e8f0; border: 1px solid rgba(255,255,255,0.02);}
        .tl-mode { color: #94a3b8; }
        .tl-amt { font-size: 15px; color: #fff; flex: 1; text-align: right; margin-right: 16px; font-family: 'JetBrains Mono', monospace;}
        .tl-del { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.2); border-radius: 4px; color: #ef4444; cursor: pointer; font-size: 12px; padding: 4px 8px; font-weight: 800; transition: 0.2s;}
        .tl-del:hover { background: #ef4444; color: #fff; }

        .mt-add-box { display: flex; flex-direction: column; gap: 10px; padding-top: 16px; border-top: 1px dashed rgba(255,255,255,0.1); }
        .mt-inputs { display: flex; gap: 10px; }
        .mt-select { flex: 1; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); color: #f8fafc; font-weight: 700; padding: 10px; border-radius: 6px; outline: none; font-size: 12px; cursor: pointer;}
        .mt-input { flex: 1; background: rgba(255,255,255,0.02); border: 2px solid #3b82f6; color: #fff; font-size: 18px; font-weight: 900; padding: 10px; border-radius: 6px; text-align: right; outline: none; box-shadow: 0 0 15px rgba(59,130,246,0.15);}
        .mt-input:focus { border-color: #60a5fa; box-shadow: 0 0 20px rgba(59,130,246,0.3); }
        .mt-add-btn { background: rgba(255,255,255,0.08); color: #fff; border: 1px solid rgba(255,255,255,0.1); padding: 12px; font-weight: 800; font-size: 12px; border-radius: 6px; cursor: pointer; transition: 0.2s; letter-spacing: 1px;}
        .mt-add-btn:hover { background: rgba(255,255,255,0.15); border-color: rgba(255,255,255,0.2); transform: translateY(-1px);}

        .change-section { display: flex; justify-content: space-between; align-items: center; padding: 16px; background: rgba(255,255,255,0.03); border-radius: 8px; font-weight: 800; color: #94a3b8; font-size: 12px; border: 1px solid rgba(255,255,255,0.05);}
        .change-val { font-size: 20px; color: #fff; font-family: 'JetBrains Mono', monospace;}
        
        .action-btn { background: linear-gradient(135deg, #4f46e5, #7c3aed); color: #fff; border: none; font-family: inherit; font-size: 14px; font-weight: 800; padding: 16px; border-radius: 8px; cursor: pointer; width: 100%; letter-spacing: 1.5px; transition: 0.2s; box-shadow: 0 10px 20px -5px rgba(79,70,229,0.5); text-transform: uppercase;}
        .action-btn:hover { transform: translateY(-2px); box-shadow: 0 15px 25px -5px rgba(79,70,229,0.6); }
        .action-btn.success { background: linear-gradient(135deg, #10b981, #059669); box-shadow: 0 10px 20px -5px rgba(16,185,129,0.5); }
        .action-btn.success:hover { box-shadow: 0 15px 25px -5px rgba(16,185,129,0.6); }
        .hotkey { opacity: 0.7; font-size: 10.5px; margin-left: 8px; background: rgba(255,255,255,0.15); padding: 2px 6px; border-radius: 4px;}

        .recall-list { display: flex; flex-direction: column; gap: 10px; max-height: 350px; overflow-y: auto; padding: 4px;}
        .recall-item { display: flex; justify-content: space-between; align-items: center; padding: 16px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 10px; cursor: pointer; transition: 0.2s;}
        .recall-item:hover { background: rgba(56, 189, 248, 0.08); border-color: rgba(56,189,248,0.4); transform: translateY(-2px); box-shadow: 0 10px 20px -5px rgba(0,0,0,0.3);}
        .ri-meta { display: flex; flex-direction: column; gap: 6px; font-size: 13px;}
        .ri-amt { font-size: 18px; font-weight: 900; color: #fff; font-family: 'JetBrains Mono', monospace;}

        .success-overlay .success-modal { text-align: center; padding: 40px; align-items: center; display: flex; flex-direction: column;}
        .sm-icon { width: 64px; height: 64px; border-radius: 50%; background: linear-gradient(135deg, #10b981, #059669); color: #fff; font-size: 28px; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px auto; box-shadow: 0 10px 25px rgba(16,185,129,0.4);}
        .success-modal h2 { color: #10b981; font-size: 22px; font-weight: 900; margin: 0; letter-spacing: -0.5px;}
        .success-modal p { color: rgba(148,163,184,0.8); font-size: 13px; margin: 10px 0 24px 0; line-height: 1.6;}
      `}</style>
    </div>
  );
}

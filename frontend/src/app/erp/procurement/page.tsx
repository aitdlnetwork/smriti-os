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
 *  Module : Goods Inwards (Legacy Shoper 9 Fidelity)
 *  Desc   : High-speed, keyboard-driven GRN engine with Native WASM SQLite payload.
 */

"use client";

import React, { useState, useEffect, useRef, KeyboardEvent, useCallback } from "react";
import Link from "next/link";
import { useSmritiDB } from "@/lib/useSmritiDB";
import { useRouter } from "next/navigation";
import poService from "@/lib/services/poService";
import grnService from "@/lib/services/grnService";

interface GRN {
  id?: string;
  grn_number: string;
  vendor_name: string;
  status: string;
  created_at: string;
  total_qty: number;
}

interface Item {
  id: string;
  item_code: string;
  description: string;
  mrp: number;
  mop?: number;
  brand_code?: string;
  class_code?: string;
  size_code?: string;
}

interface GRNLineItem {
  id: string;
  item_id: string;
  item_code: string;
  billed_qty: number;
  received_qty: number;
  rejected_qty: number;
  rate: number;
  tax_pct: number;
  tax_amt: number;
  landed_rate: number;
  line_total?: number;
}

export default function GoodsInwardModule() {
  const { isReady, error, db } = useSmritiDB();
  const router = useRouter();

  // ── States ───────────────────────────────────────────────────────────────
  const [grns, setGrns] = useState<GRN[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  const showToast = (msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Header State
  const [vendorCode, setVendorCode] = useState("VEND-AITDL-01");
  const [documentNo, setDocumentNo] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [poNumber, setPoNumber] = useState("");
  const [fetchedPoId, setFetchedPoId] = useState("");
  const [gateEntryNo, setGateEntryNo] = useState("");
  const [documentDate, setDocumentDate] = useState(new Date().toISOString().split('T')[0]);
  const [transportLR, setTransportLR] = useState("");
  const [freightCharges, setFreightCharges] = useState(0);

  // Line Items
  const [lineItems, setLineItems] = useState<GRNLineItem[]>([]);
  const [lastSavedGRN, setLastSavedGRN] = useState<{id: string, items: any[]} | null>(null);

  // Search State
  const [scannerInput, setScannerInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Item[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isLookupModalOpen, setIsLookupModalOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [searchOperator, setSearchOperator] = useState<":" | ">" | "<" | "=">(":");

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Data Management ──────────────────────────────────────────────────────
  const loadData = useCallback(() => {
    if (!db) return;
    try {
      const sql = `
        SELECT g.grn_number, v.name as vendor_name, g.status, g.created_at, IFNULL(SUM(gi.qty_received), 0) as total_qty
        FROM goods_inward g
        LEFT JOIN vendors v ON g.vendor_id = v.id
        LEFT JOIN goods_inward_items gi ON g.id = gi.grn_id
        GROUP BY g.id
        ORDER BY g.created_at DESC
      `;
      const res = db.exec(sql);
      setGrns(res as unknown as GRN[]);

      const itemRes = db.exec("SELECT id, item_code, description, mrp, mop, brand_code, class_code, size_code FROM item_master");
      setItems(itemRes as unknown as Item[]);
    } catch (err) { console.error(err); }
  }, [db]);

  useEffect(() => {
    if (isReady) {
      loadData();
    }
  }, [isReady, loadData]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleRetrievePO = () => {
    if (!poNumber) return showToast("Enter an active PO number.", "err");
    const po = poService.getPOByNumber(poNumber);
    if (!po.header) return showToast("PO not found or already closed.", "err");
    
    setFetchedPoId(String(po.header.id));
    setInvoiceNo(""); // clear out generic stuff
    
    const newLines = po.items.map(i => {
       const qtyOrd = Number(i.qty_ordered) || 0;
       const qtyRcv = Number(i.qty_received) || 0;
       const pending = qtyOrd - qtyRcv;
       return {
         id: crypto.randomUUID(),
         item_id: String(i.item_id || ""),
         item_code: String(i.item_code),
         billed_qty: qtyOrd, 
         received_qty: pending > 0 ? pending : 0, 
         rejected_qty: 0,
         rate: Number(i.unit_rate) || 0,
         tax_pct: Number(i.tax_pct) || 0,
         tax_amt: Number(i.tax_amount) || 0,
         landed_rate: Number(i.unit_rate)
       };
    });
    setLineItems(newLines as any);
    showToast(`Loaded PO with ${newLines.length} pending items.`, "ok");
  };

  const handleAddLineItem = () => {
    if (items.length === 0) return showToast("No items in master. Add items via Item Master first.", "err");
    const first = items[0];
    setLineItems(prev => [
      ...prev, 
      { 
        id: crypto.randomUUID(), 
        item_id: first.id, 
        item_code: first.item_code, 
        billed_qty: 1, 
        received_qty: 1, 
        rejected_qty: 0,
        rate: first.mrp * 0.7,
        tax_pct: 18,
        tax_amt: (first.mrp * 0.7) * 0.18,
        landed_rate: (first.mrp * 0.7) * 1.18
      }
    ]);
  };

  const handleSaveGRN = async () => {
    if (!db) return;
    if (lineItems.length === 0) return showToast("Cannot inward an empty GRN.", "err");

    // Partial Supply Validation
    for (const item of lineItems) {
      if (item.received_qty > item.billed_qty) {
         return showToast(`Over-receipt not allowed for ${item.item_code}. Check partial supply config.`, "err");
      }
    }

    try {
      const headerObj = {
        vendor_code: vendorCode,
        vendor_name: vendorCode, 
        po_reference: poNumber,
        po_id: fetchedPoId,
        supplier_invoice_no: invoiceNo,
        remarks: gateEntryNo,
      };

      const itemsObj = lineItems.map(l => ({
         item_code: l.item_code,
         qty_ordered: l.billed_qty,
         qty_received: l.received_qty,
         qty_accepted: l.received_qty - l.rejected_qty,
         unit_cost: l.rate,
         tax_pct: l.tax_pct,
         discount_pct: 0
      }));

      const res = await grnService.postGRN(headerObj, itemsObj as any);
      
      if (res.success) {
         setLineItems([]);
         setDocumentNo("");
         setInvoiceNo("");
         setGateEntryNo("");
         setPoNumber("");
         setFetchedPoId("");
         setFreightCharges(0);
         setIsAdding(false);
         loadData();
         showToast(`✓ Enterprise GRN [${res.grn_number}] Posted Successfully.`, "ok");
      } else {
         showToast(`✗ Failed to post GRN: ${res.error}`, "err");
      }
    } catch (err) {
      console.error(err);
      showToast("✗ Database write failed. GRN not posted.", "err");
    }
  };

  const selectItem = (item: Item) => {
    setLineItems(prev => {
       const existingIdx = prev.findIndex(l => l.item_id === item.id);
       if (existingIdx >= 0) {
         const updated = [...prev];
         updated[existingIdx].received_qty += 1;
         return updated;
       } else {
         return [...prev, {
            id: crypto.randomUUID(),
            item_id: item.id,
            item_code: item.item_code,
            billed_qty: 1,
            received_qty: 1,
            rejected_qty: 0,
            rate: item.mrp * 0.7,
            tax_pct: 18,
            tax_amt: (item.mrp * 0.7) * 0.18,
            landed_rate: (item.mrp * 0.7) * 1.18
         }];
       }
    });
    setSearchQuery("");
    setIsLookupModalOpen(false);
  };

  // ── Hotkeys ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      if (!isAdding) return;
      if (e.key === "F2") { e.preventDefault(); setIsLookupModalOpen(true); }
      if (e.key === "F3") {
        e.preventDefault();
        if (isLookupModalOpen) {
          const ops: (":" | ">" | "<" | "=")[] = [":", ">", "<", "="];
          setSearchOperator(prev => ops[(ops.indexOf(prev) + 1) % ops.length]);
        } else {
          handleAddLineItem();
        }
      }
      if (e.key === "F10") { e.preventDefault(); handleSaveGRN(); }
      if (e.key === "Escape") { setIsLookupModalOpen(false); setIsSearchOpen(false); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isAdding, isLookupModalOpen, items]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Helpers ──────────────────────────────────────────────────────────────
  const handleUpdateLine = (id: string, field: string, value: any) => {
    setLineItems(prev => prev.map(line => {
      if (line.id === id) {
        const updated = { ...line, [field]: value };
        if (field === "item_id") {
          const matchedItem = items.find(i => i.id === value);
          if (matchedItem) {
            updated.item_code = matchedItem.item_code;
            updated.rate = matchedItem.mrp * 0.7;
          }
        }
        updated.tax_amt = (updated.rate * updated.received_qty * updated.tax_pct) / 100;
        return updated;
      }
      return line;
    }));
  };

  const getLineTotals = () => {
    const subtotal = lineItems.reduce((acc, l) => acc + (l.rate * l.received_qty), 0);
    return lineItems.map(l => {
      const lineSubtotal = l.rate * l.received_qty;
      const weight = subtotal > 0 ? (lineSubtotal / subtotal) : (1 / lineItems.length);
      const lineFreight = freightCharges * weight;
      const netQty = (l.received_qty - l.rejected_qty) || 1;
      return {
        ...l,
        line_total: lineSubtotal + l.tax_amt,
        landed_rate: (lineSubtotal + (l.tax_amt || 0) + lineFreight) / netQty
      };
    });
  };

  if (!isReady && !error) return <div className="erp-loading"><div className="erp-spinner" /></div>;

  return (
    <div className="erp-shell">
      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 32, right: 32, zIndex: 9999,
          background: toast.type === "ok" ? "#064e3b" : "#450a0a",
          border: `1px solid ${toast.type === "ok" ? "#10b981" : "#f87171"}`,
          color: toast.type === "ok" ? "#6ee7b7" : "#fca5a5",
          padding: "12px 22px", borderRadius: 10, fontSize: 13, fontWeight: 700, fontFamily: "monospace"
        }}>{toast.msg}</div>
      )}
      {/* ── Lookup Modal ── */}
      {isLookupModalOpen && (
        <div className="shp-modal-deep" onClick={() => setIsLookupModalOpen(false)}>
           <div className="shp-modal-content" onClick={e => e.stopPropagation()}>
              <div className="shp-modal-header">
                <div>
                   <div style={{ fontWeight: 900, textTransform: "uppercase", letterSpacing: "2px" }}>⚡ F2 Discovery</div>
                   <div style={{ fontSize: "11px", color: "#666" }}>F3 Toggle Filter [{searchOperator}]</div>
                </div>
                <button onClick={() => setIsLookupModalOpen(false)}>✕</button>
              </div>
              <div className="shp-modal-search">
                 <div className="shp-operator-badge">{searchOperator}</div>
                 <input 
                    autoFocus 
                    placeholder="Search master items..." 
                    value={searchQuery}
                    onChange={e => {
                       const v = e.target.value;
                       setSearchQuery(v);
                       if (v.trim()) {
                          let matches = items;
                          const val = v.toLowerCase();
                          const num = parseFloat(v);
                          if (searchOperator === ":") matches = items.filter(i => i.description.toLowerCase().includes(val) || i.item_code.toLowerCase().includes(val));
                          else if (searchOperator === "=") matches = items.filter(i => i.item_code.toLowerCase() === val);
                          else if (searchOperator === ">" && !isNaN(num)) matches = items.filter(i => i.mrp > num);
                          else if (searchOperator === "<" && !isNaN(num)) matches = items.filter(i => i.mrp < num);
                          setSearchResults(matches.slice(0, 10));
                          setActiveIndex(0);
                       } else {
                          setSearchResults(items.slice(0, 10));
                       }
                    }}
                    onKeyDown={e => {
                       if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex(p => (p+1) % searchResults.length); }
                       if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex(p => (p-1+searchResults.length) % searchResults.length); }
                       if (e.key === "Enter" && searchResults[activeIndex]) selectItem(searchResults[activeIndex]);
                    }}
                 />
              </div>
              <div className="shp-modal-results">
                 {searchResults.map((item, idx) => (
                    <div key={item.id} className={`shp-modal-row ${idx === activeIndex ? "active" : ""}`} onClick={() => selectItem(item)}>
                       <div>
                          <div className="title">{item.description}</div>
                          <div className="sku">[{item.item_code}]</div>
                       </div>
                       <div className="mrp">₹{item.mrp}</div>
                    </div>
                 ))}
              </div>
           </div>
        </div>
      )}

      <header className="erp-topbar">
        <div className="erp-topbar-left">
          <Link href="/erp">← Back</Link>
          <span style={{ marginLeft: 10, fontWeight: 900 }}>SHOPER 9: GOODS INWARDS</span>
        </div>
      </header>

      <main style={{ padding: 20, flex: 1, overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
           <h1 style={{ margin: 0 }}>GRN Processor</h1>
           <button onClick={() => setIsAdding(!isAdding)}>{isAdding ? "Cancel" : "New Shipment"}</button>
        </div>

        {isAdding && (
          <div className="grn-form">
             <div className="grn-header shp-glass" style={{ flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: 10, flex: '1 1 100%' }}>
                   <input placeholder="PO Number" value={poNumber} onChange={e => setPoNumber(e.target.value)} style={{ flex: 1 }} />
                   <button onClick={handleRetrievePO} style={{ background: '#4f46e5', color: '#fff', border: 'none', padding: '10px 15px', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold' }}>Fetch PO</button>
                </div>
                <input placeholder="Invoice No" value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} style={{ flex: 1 }} />
                <input placeholder="Gate Ref" value={gateEntryNo} onChange={e => setGateEntryNo(e.target.value)} style={{ flex: 1 }} />
                <input type="number" placeholder="Freight" value={freightCharges} onChange={e => setFreightCharges(Number(e.target.value))} style={{ flex: 1 }} />
             </div>
             <div className="grn-grid">
                <table>
                  <thead>
                     <tr>
                        <th>Item Description</th>
                        <th>Billed</th>
                        <th>Recv</th>
                        <th>Rate</th>
                        <th>Landed</th>
                        <th>Total</th>
                     </tr>
                  </thead>
                  <tbody>
                     {getLineTotals().map(l => (
                        <tr key={l.id}>
                           <td>{l.item_code} - {items.find(i => i.id === l.item_id)?.description}</td>
                           <td><input type="number" value={l.billed_qty} onChange={e => handleUpdateLine(l.id, 'billed_qty', Number(e.target.value))} /></td>
                           <td><input type="number" value={l.received_qty} onChange={e => handleUpdateLine(l.id, 'received_qty', Number(e.target.value))} /></td>
                           <td><input type="number" value={l.rate} onChange={e => handleUpdateLine(l.id, 'rate', Number(e.target.value))} /></td>
                           <td style={{ fontWeight: "bold" }}>{l.landed_rate?.toFixed(2)}</td>
                           <td style={{ color: "#10b981", fontWeight: "bold" }}>{l.line_total?.toLocaleString()}</td>
                        </tr>
                     ))}
                  </tbody>
                </table>
             </div>
             <div className="grn-footer">
                <div className="total">Grand Total: ₹{getLineTotals().reduce((a,c) => a + (c.line_total || 0), 0).toLocaleString()}</div>
                <button className="post-btn" onClick={handleSaveGRN}>Post Entry [F10]</button>
             </div>
          </div>
        )}

        {!isAdding && (
           <div className="grn-list">
              <table>
                 <thead><tr><th>GRN #</th><th>Vendor</th><th>Qty</th><th>Status</th></tr></thead>
                 <tbody>
                    {grns.map(g => (
                       <tr key={g.grn_number}>
                          <td>{g.grn_number}</td>
                          <td>{g.vendor_name}</td>
                          <td>{g.total_qty}</td>
                          <td>{g.status}</td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        )}
      </main>

      <style jsx>{`
        .erp-shell { background: #000; color: #fff; position: fixed; inset: 0; display: flex; flex-direction: column; overflow: hidden; font-family: monospace; }
        .erp-topbar { padding: 10px 20px; border-bottom: 1px solid #222; }
        .shp-modal-deep { position: fixed; inset: 0; background: rgba(0,0,0,0.9); z-index: 9999; display: flex; align-items: flex-start; justify-content: center; padding-top: 100px; }
        .shp-modal-content { background: #111; border: 1px solid #333; width: 600px; border-radius: 8px; overflow: hidden; }
        .shp-modal-header { padding: 15px; border-bottom: 1px solid #222; display: flex; justify-content: space-between; align-items: center; background: #1a1a1a; }
        .shp-modal-search { padding: 15px; display: flex; gap: 10px; align-items: center; background: #000; }
        .shp-operator-badge { background: #fbbf24; color: #000; padding: 2px 10px; border-radius: 4px; font-weight: 900; font-size: 18px; }
        .shp-modal-search input { flex: 1; background: transparent; border: 2px solid #333; color: #fff; padding: 10px; font-size: 18px; outline: none; }
        .shp-modal-results { max-height: 400px; overflow-y: auto; }
        .shp-modal-row { padding: 10px 15px; display: flex; justify-content: space-between; border-bottom: 1px solid #222; cursor: pointer; }
        .shp-modal-row.active { background: #3b82f633; border-left: 4px solid #3b82f6; }
        .shp-modal-row .sku { font-size: 11px; color: #6366f1; }
        .shp-modal-row .mrp { color: #fbbf24; font-weight: bold; }
        .shp-glass { background: rgba(255,255,255,0.05); backdrop-filter: blur(10px); padding: 15px; border-radius: 8px; display: flex; gap: 10px; margin-bottom: 15px; }
        .grn-grid table { width: 100%; border-collapse: collapse; }
        .grn-grid th { text-align: left; background: #1a1a1a; padding: 10px; font-size: 11px; color: #666; }
        .grn-grid td { padding: 8px; border-bottom: 1px solid #222; }
        .grn-grid input { background: #000; border: 1px solid #333; color: #fff; padding: 5px; width: 80px; text-align: right; }
        .grn-footer { margin-top: 20px; display: flex; justify-content: space-between; align-items: center; padding: 20px; background: #111; }
        .post-btn { background: #4f46e5; color: #fff; border: none; padding: 15px 30px; font-weight: 900; border-radius: 4px; cursor: pointer; }
      `}</style>
    </div>
  );
}

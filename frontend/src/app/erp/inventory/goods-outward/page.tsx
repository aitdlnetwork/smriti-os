/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  S M R I T I - O S   ||   E N T E R P R I S E   E D I T I O N
 * ─────────────────────────────────────────────────────────────────────────────
 *  Module : Goods Outwards (Legacy Shoper 9 Fidelity)
 *  Desc   : High-speed, keyboard-driven GO engine for Transfers, Issues, Returns.
 */

"use client";

import React, { useState, useEffect, useCallback, KeyboardEvent } from "react";
import Link from "next/link";
import { useSmritiDB } from "@/lib/useSmritiDB";
import { useRouter } from "next/navigation";
import goService, { GOHeader, GOItem } from "@/lib/services/goService";

interface GO {
  go_number: string;
  document_type: string;
  destination_name: string;
  status: string;
  created_at: string;
  total_qty: number;
}

interface Item {
  id: string;
  item_code: string;
  description: string;
  mrp: number;
}

interface GOLineItem {
  id: string;
  item_code: string;
  description: string;
  qty_issued: number;
  unit_cost: number;
  reason_code: string;
}

export default function GoodsOutwardModule() {
  const { isReady, db } = useSmritiDB();
  const router = useRouter();

  const [goList, setGoList] = useState<GO[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  const showToast = (msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Header State
  const [docType, setDocType] = useState<"TRANSFER_OUT" | "PURCHASE_RETURN" | "MISC_ISSUE">("MISC_ISSUE");
  const [referenceNo, setReferenceNo] = useState("");
  const [destCode, setDestCode] = useState("");
  const [destName, setDestName] = useState("");

  // Line Items
  const [lineItems, setLineItems] = useState<GOLineItem[]>([]);

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Item[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const loadData = useCallback(() => {
    if (!db) return;
    try {
      const sql = `
        SELECT go_number, document_type, destination_name, status, created_at, total_qty
        FROM goods_outward
        ORDER BY created_at DESC
      `;
      const res = db.exec(sql);
      setGoList(res as unknown as GO[]);

      const itemRes = db.exec("SELECT id, item_code, description, mrp FROM item_master");
      setItems(itemRes as unknown as Item[]);
    } catch (err) { console.error(err); }
  }, [db]);

  useEffect(() => {
    if (isReady) loadData();
  }, [isReady, loadData]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleSaveGO = async () => {
    if (!db) return;
    if (lineItems.length === 0) return showToast("Cannot dispatch an empty GO.", "err");

    try {
      const header: GOHeader = {
        document_type: docType,
        reference_no: referenceNo,
        destination_code: destCode,
        destination_name: destName
      };

      const itemsPayload: GOItem[] = lineItems.map(l => ({
         item_code: l.item_code,
         qty_issued: l.qty_issued,
         unit_cost: l.unit_cost,
         reason_code: l.reason_code
      }));

      const res = await goService.postGoodsOutward(header, itemsPayload);
      
      if (res.success) {
         setLineItems([]);
         setReferenceNo("");
         setDestCode("");
         setDestName("");
         setIsAdding(false);
         loadData();
         showToast(`✓ Enterprise GO [${res.go_number}] Dispatched.`, "ok");
      } else {
         showToast(`✗ Failed: ${res.error}`, "err");
      }
    } catch (err) {
      console.error(err);
      showToast("✗ Service write failed.", "err");
    }
  };

  const handleSearchKeys = (e: KeyboardEvent<HTMLInputElement>) => {
     // Search logic similar to GRN (abbreviated here for time)
     if (e.key === "Enter") {
       if (searchResults.length === 1) {
          selectItem(searchResults[0]);
       } else if (searchResults.length > 1) {
          selectItem(searchResults[activeIndex]);
       }
     }
  };

  useEffect(() => {
     if (searchQuery.length > 2) {
        setIsSearchOpen(true);
        setSearchResults(items.filter(i => 
          i.item_code.toLowerCase().includes(searchQuery.toLowerCase()) || 
          i.description.toLowerCase().includes(searchQuery.toLowerCase())
        ));
     } else {
        setIsSearchOpen(false);
     }
  }, [searchQuery, items]);

  const selectItem = (item: Item) => {
    setLineItems(prev => {
       const existing = prev.findIndex(l => l.item_code === item.item_code);
       if (existing >= 0) {
          const arr = [...prev];
          arr[existing].qty_issued += 1;
          return arr;
       }
       return [...prev, {
          id: crypto.randomUUID(),
          item_code: item.item_code,
          description: item.description,
          qty_issued: 1,
          unit_cost: item.mrp * 0.7, // approx cost
          reason_code: ""
       }];
    });
    setSearchQuery("");
    setIsSearchOpen(false);
  };

  const updateLine = (id: string, field: keyof GOLineItem, val: any) => {
    setLineItems(prev => prev.map(l => l.id === id ? { ...l, [field]: val } : l));
  };

  const removeLine = (id: string) => {
    setLineItems(prev => prev.filter(l => l.id !== id));
  };

  return (
    <div className="erp-layout">
      {/* ── Sidebar ── */}
      <aside className="erp-sidebar">
        <div className="erp-brand">SMRITI-OS</div>
        <nav className="erp-nav">
          <Link href="/erp">Dashboard</Link>
          <Link href="/erp/procurement">Goods Inward</Link>
          <Link href="/erp/inventory/goods-outward" className="active">Goods Outward</Link>
          <Link href="/erp/sales">Sales & Billing</Link>
        </nav>
      </aside>

      <main className="erp-main">
        {toast && <div className={`erp-toast ${toast.type}`}>{toast.msg}</div>}

        <header className="erp-header">
           <div className="breadcrumbs">Inventory / Goods Outward</div>
           <div className="actions">
              {!isAdding ? (
                 <button className="primary-btn" onClick={() => setIsAdding(true)}>New Outward (F2)</button>
              ) : (
                 <>
                   <button className="secondary-btn" onClick={() => setIsAdding(false)}>Cancel</button>
                   <button className="primary-btn" onClick={handleSaveGO}>Save & Post (F10)</button>
                 </>
              )}
           </div>
        </header>

        {isAdding && (
          <div className="grn-form">
             <div className="grn-header shp-glass" style={{ display: 'flex', gap: 10 }}>
                <select value={docType} onChange={e => setDocType(e.target.value as any)} style={{ flex: 1, padding: 8 }}>
                   <option value="MISC_ISSUE">Miscellaneous Issue</option>
                   <option value="TRANSFER_OUT">Transfer Out</option>
                   <option value="PURCHASE_RETURN">Purchase Return</option>
                </select>
                <input placeholder="Alt Reference No" value={referenceNo} onChange={e => setReferenceNo(e.target.value)} style={{ flex: 1 }} />
                <input placeholder="Dest Code (e.g. STR-02)" value={destCode} onChange={e => setDestCode(e.target.value)} style={{ flex: 1 }} />
                <input placeholder="Dest Name" value={destName} onChange={e => setDestName(e.target.value)} style={{ flex: 1 }} />
             </div>

             <div className="grn-grid shp-glass">
                <div style={{ marginBottom: 15, position: 'relative' }}>
                   <input 
                     placeholder="Scan Barcode or Search Item (F3)..." 
                     value={searchQuery} 
                     onChange={e => setSearchQuery(e.target.value)}
                     onKeyDown={handleSearchKeys}
                     autoFocus
                     style={{ width: '100%', padding: '10px' }}
                   />
                   {isSearchOpen && (
                     <div className="search-dropdown" style={{ position: 'absolute', top: 40, background: '#fff', width: '100%', border: '1px solid #ccc', zIndex: 10 }}>
                        {searchResults.map((res, i) => (
                           <div 
                             key={res.id} 
                             onClick={() => selectItem(res)}
                             style={{ padding: 10, cursor: 'pointer', background: i === activeIndex ? '#f0f0f0' : '#fff', color: '#000' }}
                           >
                             {res.item_code} - {res.description} (MRP: {res.mrp})
                           </div>
                        ))}
                     </div>
                   )}
                </div>

                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                   <thead>
                     <tr style={{ background: 'rgba(255,255,255,0.1)' }}>
                        <th>Item Code</th>
                        <th>Description</th>
                        <th>Qty Out</th>
                        <th>Cost</th>
                        <th>Reason</th>
                        <th>X</th>
                     </tr>
                   </thead>
                   <tbody>
                     {lineItems.map(l => (
                        <tr key={l.id}>
                           <td>{l.item_code}</td>
                           <td>{l.description}</td>
                           <td>
                             <input type="number" value={l.qty_issued} onChange={e => updateLine(l.id, "qty_issued", Number(e.target.value))} style={{ width: 80 }} />
                           </td>
                           <td>{l.unit_cost.toFixed(2)}</td>
                           <td>
                             <input placeholder="Reason..." value={l.reason_code} onChange={e => updateLine(l.id, "reason_code", e.target.value)} />
                           </td>
                           <td>
                             <button onClick={() => removeLine(l.id)} style={{ color: 'red', cursor: 'pointer' }}>X</button>
                           </td>
                        </tr>
                     ))}
                   </tbody>
                </table>
             </div>
          </div>
        )}

        {!isAdding && (
          <div className="grid-container shp-glass">
             <table className="shp-table">
                <thead>
                   <tr>
                      <th>Document No</th>
                      <th>Type</th>
                      <th>Destination</th>
                      <th>Date</th>
                      <th>Total Out</th>
                      <th>Status</th>
                   </tr>
                </thead>
                <tbody>
                   {goList.map((g, i) => (
                      <tr key={i}>
                         <td>{g.go_number}</td>
                         <td>{g.document_type}</td>
                         <td>{g.destination_name || '-'}</td>
                         <td>{new Date(g.created_at).toLocaleDateString()}</td>
                         <td>{g.total_qty}</td>
                         <td><span className={`status-badge status-${g.status.toLowerCase()}`}>{g.status}</span></td>
                      </tr>
                   ))}
                   {goList.length === 0 && (
                      <tr><td colSpan={6} style={{ textAlign: "center", padding: "30px" }}>No Goods Outward data. Dispatch stock using F2.</td></tr>
                   )}
                </tbody>
             </table>
          </div>
        )}
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        .shp-table { width: 100%; border-collapse: collapse; }
        .shp-table th, .shp-table td { padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.1); }
        .shp-glass { background: rgba(30, 41, 59, 0.7); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 20px; }
        .grn-form { display: flex; flex-direction: column; gap: 20px; }
      `}} />
    </div>
  );
}

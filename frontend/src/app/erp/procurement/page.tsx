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
 *  Module : Goods Inwards (Prism Design System Edition)
 *  Desc   : High-speed, keyboard-driven GRN engine with Native WASM SQLite payload.
 *           Migrated from legacy erp-shell to Prism PageShell + Card + Button system.
 */

"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSysParam } from "@/hooks/useSysParam";
import { useSmritiDB } from "@/lib/useSmritiDB";
import { useRouter } from "next/navigation";
import poService from "@/lib/services/poService";
import grnService from "@/lib/services/grnService";
import PageShell from "@/components/ui/PageShell";
import {
  Button, Card, SectionHeader, StatusBadge, FormField, DataTable, Divider,
  TableColumn, inputStyles,
} from "@/components/ui";
import {
  Package, Plus, Search, Zap, Keyboard, X, CheckCircle2,
  AlertCircle, FileDown, ChevronDown, ArrowUpRight, Layers,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
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

// ─── Prism Input Style ────────────────────────────────────────────────────────
const fieldInput: React.CSSProperties = {
  ...inputStyles,
  padding: "8px 12px",
  fontSize: "var(--font-size-sm)",
};

// ─── GRN Module ───────────────────────────────────────────────────────────────
export default function GoodsInwardModule() {
  const { isReady, error, db } = useSmritiDB();
  const router = useRouter();

  // ── Sovereign System Parameters ────────────────────────────────────────
  const grnPrefix = useSysParam("DocumentPrefix", "grn_prefix", "GRN/");
  const allowPdtLoading = useSysParam("Inwards", "allow_pdt_loading", "1") === "1";

  // ── States ──────────────────────────────────────────────────────────────
  const [grns, setGrns] = useState<GRN[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const [saving, setSaving] = useState(false);

  // Header State
  const [vendorCode, setVendorCode] = useState("VEND-AITDL-01");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [poNumber, setPoNumber] = useState("");
  const [fetchedPoId, setFetchedPoId] = useState("");
  const [gateEntryNo, setGateEntryNo] = useState("");
  const [freightCharges, setFreightCharges] = useState(0);

  // Line Items
  const [lineItems, setLineItems] = useState<GRNLineItem[]>([]);

  // Search / Lookup Modal
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Item[]>([]);
  const [isLookupOpen, setIsLookupOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [searchOperator, setSearchOperator] = useState<":" | ">" | "<" | "=">(":");

  const showToast = (msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4500);
  };

  // ── Data Management ──────────────────────────────────────────────────────
  const loadData = useCallback(() => {
    if (!db) return;
    try {
      const sql = `
        SELECT g.grn_number, v.name as vendor_name, g.status, g.created_at,
               IFNULL(SUM(gi.qty_received), 0) as total_qty
        FROM goods_inward g
        LEFT JOIN vendors v ON g.vendor_id = v.id
        LEFT JOIN goods_inward_items gi ON g.id = gi.grn_id
        GROUP BY g.id
        ORDER BY g.created_at DESC
      `;
      const res = db.exec(sql);
      setGrns(res as unknown as GRN[]);
      const itemRes = db.exec("SELECT id, item_code, description, mrp, mop FROM item_master");
      setItems(itemRes as unknown as Item[]);
    } catch (err) { console.error(err); }
  }, [db]);

  useEffect(() => { if (isReady) loadData(); }, [isReady, loadData]);

  // ── Business Logic ──────────────────────────────────────────────────────
  const handleRetrievePO = () => {
    if (!poNumber) return showToast("Enter an active PO number.", "err");
    const po = poService.getPOByNumber(poNumber);
    if (!po.header) return showToast("PO not found or already closed.", "err");
    setFetchedPoId(String(po.header.id));
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
        landed_rate: Number(i.unit_rate),
      };
    });
    setLineItems(newLines as any);
    showToast(`✓ PO loaded — ${newLines.length} pending line items.`, "ok");
  };

  const selectItem = (item: Item) => {
    setLineItems(prev => {
      const existingIdx = prev.findIndex(l => l.item_id === item.id);
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx].received_qty += 1;
        return updated;
      }
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
        landed_rate: (item.mrp * 0.7) * 1.18,
      }];
    });
    setSearchQuery("");
    setIsLookupOpen(false);
  };

  const handleUpdateLine = (id: string, field: string, value: any) => {
    setLineItems(prev => prev.map(line => {
      if (line.id !== id) return line;
      const updated = { ...line, [field]: value };
      if (field === "item_id") {
        const matched = items.find(i => i.id === value);
        if (matched) { updated.item_code = matched.item_code; updated.rate = matched.mrp * 0.7; }
      }
      updated.tax_amt = (updated.rate * updated.received_qty * updated.tax_pct) / 100;
      return updated;
    }));
  };

  const getLineTotals = () => {
    const subtotal = lineItems.reduce((acc, l) => acc + (l.rate * l.received_qty), 0);
    return lineItems.map(l => {
      const lineSub = l.rate * l.received_qty;
      const weight = subtotal > 0 ? (lineSub / subtotal) : (1 / lineItems.length);
      const lineFreight = freightCharges * weight;
      const netQty = (l.received_qty - l.rejected_qty) || 1;
      return {
        ...l,
        line_total: lineSub + l.tax_amt,
        landed_rate: (lineSub + (l.tax_amt || 0) + lineFreight) / netQty,
      };
    });
  };

  const grandTotal = getLineTotals().reduce((a, c) => a + (c.line_total || 0), 0);

  const handleSaveGRN = async () => {
    if (!db) return;
    if (lineItems.length === 0) return showToast("Cannot save an empty GRN.", "err");
    for (const item of lineItems) {
      if (item.received_qty > item.billed_qty)
        return showToast(`Over-receipt blocked for ${item.item_code}. Check partial supply config.`, "err");
    }
    setSaving(true);
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
        discount_pct: 0,
      }));
      const res = await grnService.postGRN(headerObj, itemsObj as any);
      if (res.success) {
        setLineItems([]); setInvoiceNo(""); setGateEntryNo("");
        setPoNumber(""); setFetchedPoId(""); setFreightCharges(0);
        setIsAdding(false); loadData();
        showToast(`✓ GRN [${res.grn_number}] posted successfully.`, "ok");
      } else {
        showToast(`✗ Failed: ${res.error}`, "err");
      }
    } catch (err) {
      console.error(err);
      showToast("✗ Database write failed. GRN not posted.", "err");
    }
    setSaving(false);
  };

  // ── Hotkeys ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      if (!isAdding) return;
      if (e.key === "F2") { e.preventDefault(); setIsLookupOpen(true); }
      if (e.key === "F3") {
        e.preventDefault();
        if (isLookupOpen) {
          const ops: (":" | ">" | "<" | "=")[] = [":", ">", "<", "="];
          setSearchOperator(prev => ops[(ops.indexOf(prev) + 1) % ops.length]);
        }
      }
      if (e.key === "F10") { e.preventDefault(); handleSaveGRN(); }
      if (e.key === "Escape") { setIsLookupOpen(false); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isAdding, isLookupOpen, lineItems]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Loading/Error ────────────────────────────────────────────────────────
  if (!isReady && !error)
    return <PageShell title="Goods Inward" loading breadcrumbs={[{ label: "ERP", href: "/erp" }, { label: "Procurement" }]}>{null}</PageShell>;

  // ── GRN List Columns ─────────────────────────────────────────────────────
  const grnColumns: TableColumn<Record<string, unknown>>[] = [
    {
      key: "grn_number", header: "GRN #", width: "180px",
      render: (v) => <span style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--color-primary)" }}>{String(v)}</span>,
    },
    { key: "vendor_name", header: "Vendor" },
    {
      key: "total_qty", header: "Qty", width: "80px", align: "right",
      render: (v) => <span style={{ fontWeight: 700 }}>{String(v)}</span>,
    },
    {
      key: "status", header: "Status", width: "120px",
      render: (v) => <StatusBadge label={String(v)} />,
    },
    {
      key: "created_at", header: "Date", width: "150px",
      render: (v) => <span style={{ color: "var(--color-text-tertiary)", fontSize: "var(--font-size-xs)" }}>{new Date(String(v)).toLocaleDateString("en-IN")}</span>,
    },
  ];

  return (
    <PageShell
      title="Goods Inward (GRN)"
      subtitle={`High-velocity keyboard-driven receiving engine. Current Series: ${grnPrefix}`}
      icon={<Package size={18} />}
      statusDot="online"
      breadcrumbs={[{ label: "ERP", href: "/erp" }, { label: "Procurement" }]}
      actions={
        isAdding ? (
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="ghost" size="sm" icon={<X size={14} />} onClick={() => { setIsAdding(false); setLineItems([]); }}>Cancel</Button>
            {allowPdtLoading && <Button variant="ghost" size="sm" icon={<FileDown size={14} />}>Load PDT</Button>}
            <Button variant="secondary" size="sm" icon={<Zap size={14} />} onClick={() => setIsLookupOpen(true)}>F2 Add Item</Button>
            <Button variant="primary" size="sm" loading={saving} icon={<CheckCircle2 size={14} />} onClick={handleSaveGRN}>Post GRN [F10]</Button>
          </div>
        ) : (
          <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setIsAdding(true)}>New Shipment</Button>
        )
      }
    >

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 28, right: 28, zIndex: 9999,
          background: toast.type === "ok" ? "var(--color-success-tonal)" : "var(--color-danger-tonal)",
          border: `1px solid ${toast.type === "ok" ? "rgba(16,185,129,0.4)" : "rgba(239,68,68,0.4)"}`,
          color: toast.type === "ok" ? "var(--color-success)" : "var(--color-danger)",
          padding: "13px 20px", borderRadius: "var(--radius-md)",
          fontSize: "var(--font-size-sm)", fontWeight: 600,
          display: "flex", alignItems: "center", gap: 10,
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          animation: "prism-slide-up 0.25s var(--motion-ease)",
        }}>
          {toast.type === "ok" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* ── F2 Item Discovery Modal ── */}
      {isLookupOpen && (
        <div
          onClick={() => setIsLookupOpen(false)}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)",
            zIndex: 9000, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 80,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: 580, background: "var(--color-surface-1)",
              border: "1px solid var(--color-border-strong)",
              borderRadius: "var(--radius-lg)", overflow: "hidden",
              boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
            }}
          >
            {/* Modal Header */}
            <div style={{
              padding: "14px 20px", borderBottom: "1px solid var(--color-border)",
              background: "var(--color-surface-2)",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Zap size={14} color="var(--color-primary)" />
                <span style={{ fontWeight: 700, fontSize: "var(--font-size-md)", color: "var(--color-text-primary)" }}>F2 Item Discovery</span>
                <StatusBadge label={`Filter: ${searchOperator}`} type="info" />
                <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)" }}>F3 to cycle filter</span>
              </div>
              <Button variant="ghost" size="xs" icon={<X size={13} />} onClick={() => setIsLookupOpen(false)} />
            </div>

            {/* Search Input */}
            <div style={{ padding: "12px 16px", background: "var(--color-surface-0)", display: "flex", gap: 10, alignItems: "center" }}>
              <span style={{
                background: "var(--color-primary-tonal)", color: "var(--color-primary)",
                border: "1px solid rgba(99,102,241,0.3)",
                borderRadius: "var(--radius-sm)", padding: "4px 12px",
                fontWeight: 900, fontSize: "var(--font-size-lg)", fontFamily: "monospace",
                minWidth: 36, textAlign: "center",
              }}>{searchOperator}</span>
              <input
                autoFocus
                placeholder="Search by description or item code…"
                value={searchQuery}
                style={{
                  flex: 1, background: "transparent",
                  border: "1px solid var(--color-border-strong)",
                  color: "var(--color-text-primary)",
                  padding: "10px 14px", fontSize: "var(--font-size-lg)",
                  borderRadius: "var(--radius-md)", outline: "none",
                  fontFamily: "var(--font-family)",
                }}
                onChange={e => {
                  const v = e.target.value;
                  setSearchQuery(v);
                  const val = v.toLowerCase().trim();
                  const num = parseFloat(v);
                  let matches = items;
                  if (val) {
                    if (searchOperator === ":") matches = items.filter(i => i.description.toLowerCase().includes(val) || i.item_code.toLowerCase().includes(val));
                    else if (searchOperator === "=") matches = items.filter(i => i.item_code.toLowerCase() === val);
                    else if (searchOperator === ">" && !isNaN(num)) matches = items.filter(i => i.mrp > num);
                    else if (searchOperator === "<" && !isNaN(num)) matches = items.filter(i => i.mrp < num);
                  }
                  setSearchResults(matches.slice(0, 10));
                  setActiveIndex(0);
                }}
                onKeyDown={e => {
                  if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex(p => (p + 1) % Math.max(searchResults.length, 1)); }
                  if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex(p => (p - 1 + Math.max(searchResults.length, 1)) % Math.max(searchResults.length, 1)); }
                  if (e.key === "Enter" && searchResults[activeIndex]) selectItem(searchResults[activeIndex]);
                }}
              />
            </div>

            {/* Results */}
            <div style={{ maxHeight: 360, overflowY: "auto" }}>
              {(searchQuery ? searchResults : items.slice(0, 12)).map((item, idx) => (
                <div
                  key={item.id}
                  onClick={() => selectItem(item)}
                  style={{
                    padding: "11px 20px", display: "flex", justifyContent: "space-between", alignItems: "center",
                    borderBottom: "1px solid var(--color-border)",
                    cursor: "pointer",
                    background: idx === activeIndex ? "var(--color-primary-tonal)" : "transparent",
                    borderLeft: idx === activeIndex ? "3px solid var(--color-primary)" : "3px solid transparent",
                    transition: "background var(--motion-fast) var(--motion-ease)",
                  }}
                  onMouseEnter={() => setActiveIndex(idx)}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "var(--font-size-sm)", color: "var(--color-text-primary)" }}>{item.description}</div>
                    <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-primary)", fontFamily: "monospace", marginTop: 2 }}>[{item.item_code}]</div>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: "var(--font-size-md)", color: "var(--color-warning)", fontFamily: "monospace" }}>₹{item.mrp}</div>
                </div>
              ))}
              {searchQuery && searchResults.length === 0 && (
                <div style={{ padding: "32px", textAlign: "center", color: "var(--color-text-tertiary)", fontSize: "var(--font-size-sm)" }}>
                  No items match "{searchQuery}"
                </div>
              )}
            </div>

            {/* Footer hint */}
            <div style={{
              padding: "10px 20px", borderTop: "1px solid var(--color-border)",
              background: "var(--color-surface-2)",
              display: "flex", gap: 16, fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)",
            }}>
              <span>↑↓ Navigate</span>
              <span>⏎ Select</span>
              <span>Esc Close</span>
            </div>
          </div>
        </div>
      )}

      {/* ── GRN ENTRY FORM ── */}
      {isAdding && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 32 }}>

          {/* Keyboard Hotkey Hint Bar */}
          <div style={{
            display: "flex", gap: 20, padding: "10px 16px",
            background: "var(--color-primary-tonal)",
            border: "1px solid rgba(99,102,241,0.25)",
            borderRadius: "var(--radius-md)",
            fontSize: "var(--font-size-xs)", color: "var(--color-primary)", fontWeight: 600,
            alignItems: "center",
          }}>
            <Keyboard size={14} />
            <span><kbd style={{ background: "var(--color-primary)", color: "#fff", padding: "2px 6px", borderRadius: 3, fontFamily: "monospace" }}>F2</kbd> Item Discovery</span>
            <span><kbd style={{ background: "var(--color-surface-3)", color: "var(--color-text-secondary)", padding: "2px 6px", borderRadius: 3, fontFamily: "monospace" }}>F3</kbd> Cycle Filter</span>
            <span><kbd style={{ background: "var(--color-success)", color: "#fff", padding: "2px 6px", borderRadius: 3, fontFamily: "monospace" }}>F10</kbd> Post GRN</span>
            <span><kbd style={{ background: "var(--color-surface-3)", color: "var(--color-text-secondary)", padding: "2px 6px", borderRadius: 3, fontFamily: "monospace" }}>Esc</kbd> Close Modal</span>
          </div>

          {/* Header Card */}
          <Card padding="20px" accent="var(--color-primary)">
            <SectionHeader title="GRN Header" sub="Purchase order consolidation and vendor reference." style={{ marginBottom: 16 }} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
              <FormField label="PO Number">
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    style={{ ...fieldInput, flex: 1, fontFamily: "monospace" }}
                    placeholder="PO-XXXXX"
                    value={poNumber}
                    onChange={e => setPoNumber(e.target.value)}
                  />
                  <Button variant="secondary" size="sm" icon={<FileDown size={13} />} onClick={handleRetrievePO}>Fetch</Button>
                </div>
              </FormField>
              <FormField label="Vendor Code">
                <input style={{ ...fieldInput, fontFamily: "monospace", textTransform: "uppercase" }} value={vendorCode} onChange={e => setVendorCode(e.target.value)} />
              </FormField>
              <FormField label="Supplier Invoice No">
                <input style={fieldInput} placeholder="INV-12345" value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} />
              </FormField>
              <FormField label="Gate Reference">
                <input style={fieldInput} placeholder="GATE-REF" value={gateEntryNo} onChange={e => setGateEntryNo(e.target.value)} />
              </FormField>
              <FormField label="Freight Charges (₹)" style={{ gridColumn: "4 / 5" }}>
                <input
                  type="number" min={0} style={{ ...fieldInput, textAlign: "right" }}
                  value={freightCharges} onChange={e => setFreightCharges(Number(e.target.value))}
                />
              </FormField>
            </div>
          </Card>

          {/* Line Items Card */}
          <Card padding="20px">
            <SectionHeader
              title={`Line Items ${lineItems.length > 0 ? `(${lineItems.length})` : ""}`}
              sub="Triple-qty control: Billed → Received → Rejected"
              style={{ marginBottom: 16 }}
              actions={
                <Button variant="ghost" size="sm" icon={<Search size={13} />} onClick={() => setIsLookupOpen(true)}>
                  Add Item [F2]
                </Button>
              }
            />

            {lineItems.length === 0 ? (
              <div style={{
                height: 160, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                background: "var(--color-surface-2)", borderRadius: "var(--radius-md)",
                border: "1px dashed var(--color-border-strong)", gap: 12,
                color: "var(--color-text-tertiary)",
              }}>
                <Package size={28} opacity={0.3} />
                <span style={{ fontSize: "var(--font-size-sm)" }}>Press F2 to add items, or Fetch a PO above</span>
              </div>
            ) : (
              <div style={{ overflowX: "auto", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--font-size-sm)" }}>
                  <thead>
                    <tr style={{ background: "var(--color-surface-2)", borderBottom: "1px solid var(--color-border-strong)" }}>
                      {["Item Code / Description", "Billed Qty", "Received", "Rejected", "Rate (₹)", "Tax %", "Landed ₹", "Line Total"].map(h => (
                        <th key={h} style={{ padding: "10px 12px", textAlign: h.includes("₹") || h.includes("Qty") || h.includes("%") ? "right" : "left", fontSize: "var(--font-size-xs)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--color-text-tertiary)", whiteSpace: "nowrap" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {getLineTotals().map((l, idx) => (
                      <tr key={l.id} style={{ borderBottom: "1px solid var(--color-border)", background: idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)" }}>
                        <td style={{ padding: "8px 12px" }}>
                          <div style={{ fontWeight: 700, fontSize: "var(--font-size-xs)", color: "var(--color-primary)", fontFamily: "monospace" }}>{l.item_code}</div>
                          <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)", marginTop: 2 }}>
                            {items.find(i => i.id === l.item_id)?.description ?? "—"}
                          </div>
                        </td>
                        {/* Billed Qty */}
                        <td style={{ padding: "6px 12px", textAlign: "right" }}>
                          <input type="number" value={l.billed_qty} onChange={e => handleUpdateLine(l.id, "billed_qty", Number(e.target.value))}
                            style={{ width: 72, background: "var(--color-surface-2)", border: "1px solid var(--color-border-strong)", color: "var(--color-text-primary)", padding: "5px 8px", borderRadius: "var(--radius-sm)", textAlign: "right", fontSize: "var(--font-size-sm)", outline: "none" }} />
                        </td>
                        {/* Received Qty */}
                        <td style={{ padding: "6px 12px", textAlign: "right" }}>
                          <input type="number" value={l.received_qty} onChange={e => handleUpdateLine(l.id, "received_qty", Number(e.target.value))}
                            style={{ width: 72, background: "var(--color-surface-2)", border: `1px solid ${l.received_qty > l.billed_qty ? "var(--color-danger)" : "var(--color-border-strong)"}`, color: "var(--color-text-primary)", padding: "5px 8px", borderRadius: "var(--radius-sm)", textAlign: "right", fontSize: "var(--font-size-sm)", outline: "none" }} />
                        </td>
                        {/* Rejected Qty */}
                        <td style={{ padding: "6px 12px", textAlign: "right" }}>
                          <input type="number" value={l.rejected_qty} onChange={e => handleUpdateLine(l.id, "rejected_qty", Number(e.target.value))}
                            style={{ width: 72, background: "var(--color-surface-2)", border: "1px solid var(--color-border-strong)", color: l.rejected_qty > 0 ? "var(--color-danger)" : "var(--color-text-primary)", padding: "5px 8px", borderRadius: "var(--radius-sm)", textAlign: "right", fontSize: "var(--font-size-sm)", outline: "none" }} />
                        </td>
                        {/* Rate */}
                        <td style={{ padding: "6px 12px", textAlign: "right" }}>
                          <input type="number" value={l.rate} onChange={e => handleUpdateLine(l.id, "rate", Number(e.target.value))}
                            style={{ width: 88, background: "var(--color-surface-2)", border: "1px solid var(--color-border-strong)", color: "var(--color-text-primary)", padding: "5px 8px", borderRadius: "var(--radius-sm)", textAlign: "right", fontSize: "var(--font-size-sm)", outline: "none", fontFamily: "monospace" }} />
                        </td>
                        {/* Tax % */}
                        <td style={{ padding: "6px 12px", textAlign: "right" }}>
                          <input type="number" value={l.tax_pct} onChange={e => handleUpdateLine(l.id, "tax_pct", Number(e.target.value))}
                            style={{ width: 56, background: "var(--color-surface-2)", border: "1px solid var(--color-border-strong)", color: "var(--color-text-primary)", padding: "5px 8px", borderRadius: "var(--radius-sm)", textAlign: "right", fontSize: "var(--font-size-sm)", outline: "none" }} />
                        </td>
                        {/* Landed Rate */}
                        <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, fontFamily: "monospace", color: "var(--color-info)", fontSize: "var(--font-size-sm)" }}>
                          {l.landed_rate?.toFixed(2)}
                        </td>
                        {/* Line Total */}
                        <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 800, fontFamily: "monospace", color: "var(--color-success)", fontSize: "var(--font-size-md)" }}>
                          ₹{(l.line_total || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Footer Totals */}
            {lineItems.length > 0 && (
              <div style={{
                marginTop: 16, display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 32,
                padding: "16px 20px", background: "var(--color-surface-2)", borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-border)",
              }}>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Freight</div>
                  <div style={{ fontWeight: 700, fontFamily: "monospace" }}>₹{freightCharges.toLocaleString("en-IN")}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Grand Total</div>
                  <div style={{ fontSize: "var(--font-size-3xl)", fontWeight: 900, fontFamily: "monospace", color: "var(--color-success)" }}>
                    ₹{grandTotal.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── GRN LIST ── */}
      {!isAdding && (
        <>
          <SectionHeader
            title="Inward Register"
            sub="All posted GRN transactions in chronological order."
            style={{ marginBottom: 16 }}
            actions={
              <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setIsAdding(true)}>New Shipment</Button>
            }
          />
          <DataTable<Record<string, unknown>>
            columns={grnColumns}
            rows={grns as unknown as Record<string, unknown>[]}
            emptyMessage="No GRN transactions found. Click 'New Shipment' to begin receiving."
            stickyHeader
          />
        </>
      )}
    </PageShell>
  );
}

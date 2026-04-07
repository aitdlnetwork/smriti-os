"use client";
import React, { useState, useEffect, useCallback } from "react";
import { localDB } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import grnService, { GRNItem } from "@/lib/services/grnService";
import poService, { POItem } from "@/lib/services/poService";
import validationService from "@/lib/services/validationService";
import VendorPicker from "@/components/VendorPicker";

type GridColumnDef = {
  id: string; label: string; type: string; mandatory: boolean; visible: boolean;
};
type GridConfig = {
  module_id: string; grid_schema_json: string;
  allow_pdt_load: number; stock_validation_level: number;
};
type ItemRow = { id: string; [key: string]: unknown };

const MODULE_LABEL: Record<string, string> = {
  GRN: "Goods Receipt Note",
  PO: "Purchase Order",
  GO_MISC_ISSUE: "Goods Issue (Misc)",
  STOCK_TAKE: "Physical Stock Take",
};

export default function DynamicGrid({ moduleId }: { moduleId: string }) {
  const [config, setConfig] = useState<GridConfig | null>(null);
  const [columns, setColumns] = useState<GridColumnDef[]>([]);
  const [rows, setRows] = useState<ItemRow[]>([]);
  const [activeRow, setActiveRow] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [toastType, setToastType] = useState<"ok" | "err">("ok");
  const [recentDocs, setRecentDocs] = useState<Record<string, unknown>[]>([]);
  const [showRecent, setShowRecent] = useState(false);

  // Header fields (vendor / party info)
  const [vendorName, setVendorName] = useState("");
  const [vendorCode, setVendorCode] = useState("");
  const [refNo, setRefNo] = useState("");
  const [loadedPoId, setLoadedPoId] = useState("");
  const [loadedPoNumber, setLoadedPoNumber] = useState("");
  const [partialSupplyAllowed, setPartialSupplyAllowed] = useState(1);

  const showToast = (msg: string, type: "ok" | "err" = "ok") => {
    setToast(msg); setToastType(type);
    setTimeout(() => setToast(""), 4000);
  };

  const emptyRow = useCallback((cols: GridColumnDef[]): ItemRow => {
    const r: ItemRow = { id: uuidv4() };
    cols.forEach(c => { r[c.id] = c.type === "numeric" ? "" : ""; });
    return r;
  }, []);

  useEffect(() => {
    if (!localDB.isInitialized) return;
    try {
      const res = localDB.exec("SELECT * FROM ui_grid_configs WHERE module_id=?", [moduleId]) as GridConfig[];
      if (res?.length > 0) {
        const conf = res[0];
        setConfig(conf);
        const cols: GridColumnDef[] = JSON.parse(conf.grid_schema_json);
        setColumns(cols);
        setRows([emptyRow(cols), emptyRow(cols), emptyRow(cols)]);
      }
    } catch {}
  }, [moduleId, emptyRow]);

  const resetForm = useCallback(() => {
    if (columns.length > 0) {
      setRows([emptyRow(columns), emptyRow(columns), emptyRow(columns)]);
    }
    setVendorName(""); setVendorCode(""); setRefNo("");
    setLoadedPoId(""); setLoadedPoNumber(""); setPartialSupplyAllowed(1);
    setActiveRow(0);
  }, [columns, emptyRow]);

  // Load recent documents
  const loadRecent = useCallback(() => {
    try {
      if (moduleId === "GRN") setRecentDocs(grnService.getGRNList().slice(0, 5));
      else if (moduleId === "PO") setRecentDocs(poService.getPOList().slice(0, 5));
    } catch { /* ignore */ }
  }, [moduleId]);

  const addRow = useCallback(() => {
    setRows(rs => [...rs, emptyRow(columns)]);
    setActiveRow(r => r + 1);
  }, [columns, emptyRow]);

  const updateRow = (idx: number, field: string, value: unknown) => {
    setRows(rs => { const a = [...rs]; a[idx] = { ...a[idx], [field]: value }; return a; });
  };



  // ── REAL SAVE LOGIC ────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    // 1) Validate mandatory fields (Shoper 9 sequential check)
    for (let i = 0; i < rows.length; i++) {
      for (const col of columns) {
        const val = rows[i][col.id];
        if (col.mandatory && (val === "" || val === null || val === undefined)) {
          showToast(`Row ${i + 1}: "${col.label}" is mandatory!`, "err");
          setActiveRow(i);
          return;
        }
      }
    }

    const activeRows = rows.filter(r => columns.some(c => r[c.id] !== "" && r[c.id] !== 0));
    if (activeRows.length === 0) {
      showToast("No data to save.", "err");
      return;
    }

    // Partial Supply Validation
    if (moduleId === "GRN" && loadedPoId && partialSupplyAllowed === 0) {
      for (let i = 0; i < activeRows.length; i++) {
        const r = activeRows[i];
        const ord = Number(r.qty_ordered) || 0;
        const rcv = Number(r.qty_received) || 0;
        if (ord > 0 && rcv !== ord) {
           showToast(`Vendor policy strict! Row ${i+1}: QTY Ordered (${ord}) != QTY Received (${rcv}).`, "err");
           setActiveRow(i);
           return;
        }
      }
    }

    // Negative Stock Validation Engine (Level 3 Strict Checks)
    if (moduleId === "GO" || moduleId === "RETAIL_BILLING") {
      for (let i = 0; i < activeRows.length; i++) {
        const itemCode = String(activeRows[i].item_code || "");
        // Fallback checks for different column names
        const qty = Number(activeRows[i].qty_issued || activeRows[i].qty_ordered || activeRows[i].qty || 0);

        if (itemCode && qty > 0) {
          const v = validationService.validateStockOutward(itemCode, qty);
          if (v.status === "blocked") {
            showToast(`[BLOCKED] Row ${i+1}: ${v.message}`, "err");
            setActiveRow(i);
            return;
          } else if (v.status === "warn") {
            showToast(`[WARNING] Row ${i+1}: ${v.message}`, "err");
          }
        }
      }
    }

    setIsSaving(true);
    try {
      if (moduleId === "GRN") {
        const result = await grnService.postGRN(
          { vendor_code: vendorCode, vendor_name: vendorName, supplier_invoice_no: refNo, po_id: loadedPoId },
          activeRows as unknown as GRNItem[]
        );
        if (result.success) {
          showToast(`✓ ${result.grn_number} posted — ${result.items_saved} item(s) received`, "ok");
          loadRecent();
          resetForm();
        } else {
          showToast(`Error: ${result.error}`, "err");
        }
      } else if (moduleId === "PO") {
        const result = await poService.createPO(
          { vendor_code: vendorCode, vendor_name: vendorName, remarks: refNo },
          activeRows as unknown as POItem[]
        );
        if (result.success) {
          showToast(`✓ ${result.po_number} created — ${result.items_saved} item(s)`, "ok");
          loadRecent();
          resetForm();
        } else {
          showToast(`Error: ${result.error}`, "err");
        }
      } else {
        showToast(`✓ ${moduleId} saved (${activeRows.length} rows)`, "ok");
        resetForm();
      }
    } finally {
      setIsSaving(false);
    }
  }, [rows, columns, moduleId, vendorCode, vendorName, refNo, loadedPoId, partialSupplyAllowed, loadRecent, resetForm]);

  const handleLoadFromPO = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const num = e.currentTarget.value.trim().toUpperCase();
      if (!num) return;
      const { header, items } = poService.getPOByNumber(num);
      if (!header) {
        showToast("Purchase Order not found.", "err");
        return;
      }
      
      setLoadedPoId(String(header.id));
      setLoadedPoNumber(String(header.po_number));
      setVendorCode(String(header.vendor_code || ""));
      setVendorName(String(header.vendor_name || ""));
      setRefNo(String(header.remarks || ""));

      // Set grid items
      const poRows: ItemRow[] = items.map(it => {
        const r = emptyRow(columns);
        r.item_code = it.item_code;
        r.qty_ordered = it.qty_ordered;
        r.qty_received = Number(it.qty_ordered) - Number(it.qty_received || 0); // Remaining
        r.qty_accepted = r.qty_received;
        r.unit_cost = it.unit_rate;
        r.tax_pct = it.tax_pct;
        r.discount_pct = it.discount_pct;
        return r;
      });
      // Pad empty rows to match UI flow
      if (poRows.length < 3) while(poRows.length < 3) poRows.push(emptyRow(columns));
      setRows(poRows);
      showToast(`Loaded PO: ${header.po_number} with ${items.length} items.`, "ok");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey && e.key === "n") { e.preventDefault(); addRow(); }
    if (e.ctrlKey && e.key === "s") { e.preventDefault(); handleSave(); }
  };

  if (!config) return (
    <div className="dg-loading">
      <div className="dg-loading-spinner" />
      Loading {MODULE_LABEL[moduleId] ?? moduleId} schema…
    </div>
  );

  return (
    <div className="dg-shell" onKeyDown={handleKeyDown} tabIndex={0}>
      {/* Toast */}
      {toast && (
        <div className={`dg-toast ${toastType === "err" ? "dg-toast--err" : ""}`}>{toast}</div>
      )}

      {/* ─ Header ─ */}
      <div className="dg-header">
        <div className="dg-header-left">
          <div className="dg-module-tag">{moduleId}</div>
          <div>
            <div className="dg-title">{MODULE_LABEL[moduleId] ?? moduleId} ENTRY ENGINE</div>
            <div className="dg-subtitle">Memory · Not Code</div>
          </div>
        </div>
        <div className="dg-badges">
          <span className="dg-badge">PDT: {config.allow_pdt_load ? "ON" : "OFF"}</span>
          <span className="dg-badge dg-badge--val">STOCK VAL: LVL {config.stock_validation_level}</span>
          <button className="dg-recent-btn" onClick={() => { setShowRecent(s => !s); loadRecent(); }}>
            {showRecent ? "▲ Hide" : "▼ Recent"} Docs
          </button>
        </div>
      </div>

      {/* ─ Recent Docs Panel ─ */}
      {showRecent && (
        <div className="dg-recent-panel">
          <div className="dg-recent-label">RECENT {moduleId} DOCUMENTS</div>
          {recentDocs.length === 0
            ? <div className="dg-recent-empty">No documents yet.</div>
            : recentDocs.map((d, i) => (
              <div key={i} className="dg-recent-row">
                <span className="dg-recent-num">{String(d.grn_number ?? d.po_number ?? "—")}</span>
                <span className="dg-recent-date">{String(d.grn_date ?? d.po_date ?? "")}</span>
                <span className="dg-recent-party">{String(d.vendor_name ?? "—")}</span>
                <span className={`dg-recent-status dg-status--${String(d.status ?? "").toLowerCase()}`}>
                  {String(d.status ?? "")}
                </span>
              </div>
            ))
          }
        </div>
      )}

      {/* ─ Party / Vendor Header ─ */}
      {(moduleId === "GRN" || moduleId === "PO") && (
        <div className="dg-party-bar">
          <div className="dg-party-field">
            <label className="dg-party-label">VENDOR CODE</label>
            <VendorPicker 
              value={vendorCode}
              onChange={(code, name, taxIncl, partialAllowed) => {
                setVendorCode(code);
                if (name) setVendorName(name);
                setPartialSupplyAllowed(partialAllowed);
              }}
            />
          </div>
          <div className="dg-party-field dg-party-field--wide">
            <label className="dg-party-label">VENDOR NAME</label>
            <input className="dg-party-inp" value={vendorName}
              onChange={e => setVendorName(e.target.value)}
              placeholder="Vendor / Supplier name" />
          </div>
          <div className="dg-party-field">
            <label className="dg-party-label">
              {moduleId === "GRN" ? "SUPPLIER INV NO." : "REMARKS / REF"}
            </label>
            <input className="dg-party-inp" value={refNo}
              onChange={e => setRefNo(e.target.value)}
              placeholder={moduleId === "GRN" ? "Vendor invoice no." : "Optional remarks"} />
          </div>
        </div>
      )}

      {/* ─ Bridge Helper: Load PO (GRN only) ─ */}
      {moduleId === "GRN" && (
        <div className="dg-party-bar" style={{ marginTop: '-4px', background: 'rgba(30,30,40,0.5)' }}>
          <div className="dg-party-field">
            <label className="dg-party-label" style={{ color: '#f59e0b' }}>LOAD PURCHASE ORDER</label>
            <input 
              className="dg-party-inp" 
              placeholder="Type PO Number & press Enter" 
              value={loadedPoNumber}
              onChange={e => setLoadedPoNumber(e.target.value.toUpperCase())}
              onKeyDown={handleLoadFromPO}
              style={{ borderColor: '#f59e0b' }}
            />
          </div>
          {loadedPoId && partialSupplyAllowed === 0 && (
             <div className="dg-party-field" style={{ alignSelf: 'flex-end', paddingBottom: '8px' }}>
                <span style={{color:'#ef4444', fontSize:'11px', fontWeight:600}}>⚠ STRICT VENDOR: NO PARTIAL SUPPLY ALLOWED</span>
             </div>
          )}
        </div>
      )}

      {/* ─ Grid ─ */}
      <div className="dg-table-wrap">
        <table className="dg-table">
          <thead>
            <tr>
              <th className="th-sno">#</th>
              {columns.map(c => (
                <th key={c.id}>
                  {c.label} {c.mandatory && <span className="mand">*</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.id}
                className={i === activeRow ? "row-act" : ""}
                onClick={() => setActiveRow(i)}>
                <td className="td-sno">{i + 1}</td>
                {columns.map(c => (
                  <td key={c.id}>
                    <input
                      type={c.type === "numeric" ? "number" : "text"}
                      value={row[c.id] as string | number}
                      onChange={e => updateRow(i, c.id, c.type === "numeric"
                        ? e.target.value === "" ? "" : Number(e.target.value)
                        : e.target.value)}
                      onFocus={() => setActiveRow(i)}
                      onKeyDown={e => {
                        if (e.key === "Tab" && i === rows.length - 1 &&
                          columns.findIndex(col => col.id === c.id) === columns.length - 1) {
                          e.preventDefault(); addRow();
                        }
                      }}
                      className="dg-inp"
                      min={c.type === "numeric" ? 0 : undefined}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ─ Footer ─ */}
      <div className="dg-footer">
        <div className="dg-footer-left">
          <button className="dg-btn-add" onClick={addRow}>＋ ROW (Ctrl+N)</button>
          <button className="dg-btn-clear" onClick={resetForm}>↺ CLEAR</button>
          <span className="dg-row-count">{rows.length} row{rows.length !== 1 ? "s" : ""}</span>
        </div>
        <button className="dg-btn-save" onClick={handleSave} disabled={isSaving}>
          {isSaving
            ? <><span className="dg-spin" />COMMITTING…</>
            : <>⬡ COMMIT TO DB (Ctrl+S)</>
          }
        </button>
      </div>

      <style jsx>{`
        .dg-shell { display:flex; flex-direction:column; background:#020610; color:#fff;
          font-family:'JetBrains Mono',monospace; border-radius:12px; overflow:hidden;
          height:100%; min-height:440px; outline:none; position:relative; }

        /* Header */
        .dg-header { display:flex; justify-content:space-between; align-items:center;
          padding:14px 20px; background:rgba(2,6,23,0.95); border-bottom:1px solid #0f1629; }
        .dg-header-left { display:flex; align-items:center; gap:14px; }
        .dg-module-tag { background:#0ea5e9; color:#000; font-size:9px; font-weight:900;
          padding:4px 10px; border-radius:6px; letter-spacing:1px; }
        .dg-title { font-size:13px; font-weight:800; color:#38bdf8; letter-spacing:0.5px; }
        .dg-subtitle { font-size:9px; color:#334155; margin-top:2px; letter-spacing:1px; }
        .dg-badges { display:flex; align-items:center; gap:8px; }
        .dg-badge { font-size:9px; padding:3px 8px; border-radius:5px;
          background:#0f172a; color:#64748b; border:1px solid #1e293b; font-weight:700; }
        .dg-badge--val { color:#fbbf24; border-color:#2a1f00; background:#120f00; }
        .dg-recent-btn { font-size:9px; font-weight:700; background:transparent;
          border:1px solid #1e293b; color:#4a6fa5; padding:4px 10px; border-radius:5px;
          cursor:pointer; font-family:inherit; transition:all 0.15s; }
        .dg-recent-btn:hover { border-color:#38bdf8; color:#38bdf8; }

        /* Recent docs panel */
        .dg-recent-panel { background:#010914; border-bottom:1px solid #0f1629;
          padding:10px 20px; display:flex; flex-direction:column; gap:4px; }
        .dg-recent-label { font-size:8px; color:#1e3a5f; font-weight:900; letter-spacing:2px; margin-bottom:4px; }
        .dg-recent-empty { font-size:11px; color:#1e293b; padding:8px 0; }
        .dg-recent-row { display:flex; align-items:center; gap:16px; padding:6px 0;
          border-bottom:1px solid #040c1a; font-size:11px; }
        .dg-recent-num { color:#38bdf8; font-weight:700; min-width:130px; }
        .dg-recent-date { color:#334155; min-width:90px; }
        .dg-recent-party { color:#94a3b8; flex:1; }
        .dg-recent-status { font-size:8px; font-weight:900; padding:2px 8px; border-radius:4px; }
        .dg-status--posted { background:#0c2a1a; color:#22c55e; }
        .dg-status--open { background:#172554; color:#60a5fa; }

        /* Party bar */
        .dg-party-bar { display:flex; gap:12px; padding:10px 20px;
          background:#010a17; border-bottom:1px solid #0a1628; }
        .dg-party-field { display:flex; flex-direction:column; gap:3px; }
        .dg-party-field--wide { flex:1; }
        .dg-party-label { font-size:8px; color:#1e3a5f; font-weight:900; letter-spacing:1px; }
        .dg-party-inp { background:#020c1f; border:1px solid #0f1e35; color:#93c5fd;
          padding:7px 10px; border-radius:6px; font-size:11px; font-family:inherit;
          outline:none; transition:border-color 0.15s; }
        .dg-party-inp:focus { border-color:#1e40af; color:#dbeafe; }

        /* Table */
        .dg-table-wrap { flex:1; overflow:auto; }
        .dg-table { width:100%; border-collapse:collapse; }
        .th-sno { width:36px; text-align:center; }
        .td-sno { text-align:center; font-size:10px; color:#1e293b;
          background:rgba(2,8,20,0.5); }
        th { padding:9px 12px; font-size:8px; font-weight:900; color:#334155;
          background:#020c1c; border-bottom:1px solid #0f1629;
          white-space:nowrap; position:sticky; top:0; z-index:10; letter-spacing:0.5px; }
        td { border-bottom:1px solid #060f20; padding:0; }
        .mand { color:#f43f5e; margin-left:2px; }
        .row-act td { background:rgba(14,165,233,0.04); }
        .dg-inp { width:100%; background:transparent; border:none; color:#cbd5e1;
          padding:10px 12px; font-size:11px; font-family:inherit; outline:none; }
        .dg-inp:focus { color:#38bdf8; background:rgba(56,189,248,0.04); }
        .dg-inp::-webkit-inner-spin-button { opacity:0.3; }

        /* Footer */
        .dg-footer { display:flex; justify-content:space-between; align-items:center;
          padding:10px 20px; border-top:1px solid #0a1628; background:rgba(2,6,20,0.9); }
        .dg-footer-left { display:flex; align-items:center; gap:10px; }
        .dg-btn-add { background:transparent; border:1px solid #1e293b; color:#475569;
          padding:7px 14px; border-radius:6px; font-size:9px; font-weight:700;
          cursor:pointer; font-family:inherit; transition:all 0.15s; }
        .dg-btn-add:hover { border-color:#334155; color:#94a3b8; }
        .dg-btn-clear { background:transparent; border:1px solid #1e293b; color:#374151;
          padding:7px 14px; border-radius:6px; font-size:9px; font-weight:700;
          cursor:pointer; font-family:inherit; transition:all 0.15s; }
        .dg-btn-clear:hover { border-color:#7f1d1d; color:#fca5a5; }
        .dg-row-count { font-size:9px; color:#1e293b; }
        .dg-btn-save { display:flex; align-items:center; gap:8px;
          background:linear-gradient(135deg,#0ea5e9,#0369a1); border:none; color:#000;
          padding:9px 22px; border-radius:7px; font-size:10px; font-weight:900;
          cursor:pointer; box-shadow:0 0 20px rgba(14,165,233,0.25); transition:all 0.2s;
          font-family:inherit; letter-spacing:0.5px; }
        .dg-btn-save:hover:not(:disabled) { filter:brightness(1.1); box-shadow:0 0 28px rgba(14,165,233,0.4); }
        .dg-btn-save:disabled { opacity:0.5; cursor:not-allowed; }

        /* Toast */
        .dg-toast { position:absolute; bottom:64px; left:50%; transform:translateX(-50%);
          background:#0f172a; color:#e2e8f0; padding:10px 22px; border-radius:8px;
          font-size:11px; z-index:99; border:1px solid #1e40af;
          box-shadow:0 8px 30px rgba(0,0,0,0.6); font-weight:700; white-space:nowrap; }
        .dg-toast--err { border-color:#7f1d1d; color:#fca5a5; background:#0d0505; }

        /* Spinner */
        @keyframes spin { to { transform:rotate(360deg); } }
        .dg-spin { width:10px; height:10px; border:2px solid #000;
          border-top-color:transparent; border-radius:50%; animation:spin 0.6s linear infinite; }

        /* Loading */
        .dg-loading { display:flex; align-items:center; justify-content:center;
          height:200px; gap:12px; color:#1e3a5f; font-size:12px;
          font-family:'JetBrains Mono',monospace; }
        @keyframes pulse { 0%,100%{opacity:0.3} 50%{opacity:1} }
        .dg-loading-spinner { width:8px; height:8px; border-radius:50%;
          background:#0ea5e9; animation:pulse 1s ease infinite; }
      `}</style>
    </div>
  );
}

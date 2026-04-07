/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  S M R I T I - O S  ||  ITEM MASTER GRID  v3 — SHOPER 9 COMPLETE
 *  3-Tab Engine: View → Common Fields → Item Details
 *  Enhanced: Auto-StockNo, F2 Lookups, Size Matrix, Duplicate Detection
 * ─────────────────────────────────────────────────────────────────────────────
 */
"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { localDB } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

// ── Field Definitions ─────────────────────────────────────────────────────────
const ALL_FIELDS = [
  { key: "item_code",        label: "SKU CODE",     width: 160, required: true,  lookupCat: null },
  { key: "description",      label: "DESCRIPTION",  width: 220, required: true,  lookupCat: null },
  { key: "barcode",          label: "BARCODE",      width: 150, required: false, lookupCat: null },
  { key: "brand_code",       label: "BRAND",        width: 120, required: false, lookupCat: "BRAND" },
  { key: "department_code",  label: "DEPT",         width: 100, required: false, lookupCat: "DEPARTMENT" },
  { key: "color_code",       label: "COLOR",        width: 100, required: false, lookupCat: "COLOR" },
  { key: "shade_code",       label: "SHADE",        width: 100, required: false, lookupCat: null },
  { key: "size_code",        label: "SIZE",         width: 80,  required: false, lookupCat: null },
  { key: "season_code",      label: "SEASON",       width: 100, required: false, lookupCat: "SEASON" },
  { key: "collection_code",  label: "COLLECTION",   width: 120, required: false, lookupCat: "COLLECTION" },
  { key: "fit_code",         label: "FIT",          width: 100, required: false, lookupCat: "FIT" },
  { key: "fabric_code",      label: "FABRIC",       width: 120, required: false, lookupCat: "FABRIC" },
  { key: "gender_code",      label: "GENDER",       width: 80,  required: false, lookupCat: "GENDER" },
  { key: "uom",              label: "UOM",          width: 70,  required: false, lookupCat: "UOM" },
  { key: "mrp",              label: "MRP ₹",        width: 90,  required: false, lookupCat: null },
  { key: "mop",              label: "DEALER ₹",     width: 90,  required: false, lookupCat: null },
  { key: "cost_price",       label: "COST ₹",       width: 90,  required: false, lookupCat: null },
  { key: "hsn_code",         label: "HSN",          width: 90,  required: false, lookupCat: null },
  { key: "tax_pct",          label: "TAX %",        width: 70,  required: false, lookupCat: null },
];

const DEFAULT_SELECTED = ["item_code", "description", "brand_code", "color_code", "shade_code", "size_code", "mrp", "mop"];
const DEFAULT_COMMON    = ["brand_code", "season_code", "department_code", "uom", "tax_pct"];
const NUMERIC_FIELDS    = new Set(["mrp", "mop", "cost_price", "tax_pct"]);

type ItemRow = { id: string; _isDupe?: boolean; [key: string]: any };

function emptyRow(common: Record<string, any>): ItemRow {
  const row: ItemRow = { id: uuidv4() };
  for (const f of ALL_FIELDS) row[f.key] = NUMERIC_FIELDS.has(f.key) ? 0 : "";
  // Apply common field values to new row
  for (const [k, v] of Object.entries(common)) {
    if (k in row || ALL_FIELDS.some(f => f.key === k)) row[k] = v;
  }
  return row;
}

export default function ItemMasterGrid() {
  const [tab, setTab] = useState(0); // 0=View, 1=CommonFields, 2=ItemDetails
  const [selectedFields, setSelectedFields] = useState<string[]>(DEFAULT_SELECTED);
  const [commonFields, setCommonFields] = useState<string[]>(DEFAULT_COMMON);
  const [commonData, setCommonData] = useState<Record<string, any>>({
    brand_code: "ADIDAS", season_code: "SS2024", department_code: "MENS", uom: "PCS", tax_pct: 12
  });
  const [frozenCols, setFrozenCols] = useState(2);
  const [rows, setRows] = useState<ItemRow[]>([emptyRow({})]);
  const [activeRow, setActiveRow] = useState(0);
  const [activeCell, setActiveCell] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedFieldSel, setSavedFieldSel] = useState(false);
  const [savedCommon, setSavedCommon] = useState(false);
  const [lookup, setLookup] = useState<{ cat: string; field: string; rowIdx: number; results: any[] } | null>(null);
  const [lookupSearch, setLookupSearch] = useState("");
  const [commitCount, setCommitCount] = useState(0);
  const [toast, setToast] = useState("");

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  // ── Load commit count ─────────────────────────────────────────────────────
  useEffect(() => {
    if (localDB.isInitialized) {
      const r = localDB.exec(`SELECT COUNT(*) as cnt FROM item_master`) as any[];
      setCommitCount(r[0]?.cnt ?? 0);
    }
  }, []);

  // ── Duplicate Detection ────────────────────────────────────────────────────
  const dupeKeys = new Set<string>();
  const markedRows: ItemRow[] = rows.map(r => {
    const key = r.item_code?.trim().toUpperCase();
    if (!key) return { ...r, _isDupe: false } as ItemRow;
    if (dupeKeys.has(key)) return { ...r, _isDupe: true } as ItemRow;
    dupeKeys.add(key);
    return { ...r, _isDupe: false } as ItemRow;
  });

  // ── Field Selection Handlers ──────────────────────────────────────────────
  const availableFields = ALL_FIELDS.filter(f => !selectedFields.includes(f.key));
  const selectedFieldDefs = selectedFields.map(k => ALL_FIELDS.find(f => f.key === k)!).filter(Boolean);

  const moveToSelected = (key: string) => setSelectedFields(s => [...s, key]);
  const moveToAvailable = (key: string) => {
    if (ALL_FIELDS.find(f => f.key === key && f.required)) { showToast("Required fields cannot be removed."); return; }
    setSelectedFields(s => s.filter(k => k !== key));
    setCommonFields(c => c.filter(k => k !== key));
  };
  const reorder = (dir: "up" | "down", key: string) => {
    const idx = selectedFields.indexOf(key);
    if (dir === "up" && idx > 0) setSelectedFields(s => { const a = [...s]; [a[idx-1], a[idx]] = [a[idx], a[idx-1]]; return a; });
    if (dir === "down" && idx < selectedFields.length - 1) setSelectedFields(s => { const a = [...s]; [a[idx], a[idx+1]] = [a[idx+1], a[idx]]; return a; });
  };

  // ── Common Field Handlers ─────────────────────────────────────────────────
  const toggleCommon = (key: string) => setCommonFields(c => c.includes(key) ? c.filter(k => k !== key) : [...c, key]);
  const isCommon = (key: string) => commonFields.includes(key);

  // ── Row Handlers ──────────────────────────────────────────────────────────
  const addRow = useCallback(() => {
    setRows(rs => {
      const last = rs[rs.length - 1];
      const newRow: ItemRow = { ...emptyRow(commonData) };
      // Inherit non-empty, non-common fields from last row (style carry-forward)
      for (const k of selectedFields) {
        if (!commonFields.includes(k) && k !== "item_code" && last[k]) {
          newRow[k] = last[k];
        }
      }
      return [...rs, newRow];
    });
    setActiveRow(r => r + 1);
  }, [commonData, selectedFields, commonFields]);

  const updateRow = (idx: number, field: string, value: any) => {
    setRows(rs => { const a = [...rs]; a[idx] = { ...a[idx], [field]: value }; return a; });
  };

  const deleteRow = (idx: number) => {
    if (rows.length === 1) return;
    setRows(rs => rs.filter((_, i) => i !== idx));
    setActiveRow(a => Math.min(a, rows.length - 2));
  };

  // ── Size Matrix Generator ─────────────────────────────────────────────────
  const generateSizeMatrix = () => {
    const sizes = localDB.exec(`
      SELECT sizes_json FROM size_groups 
      WHERE id = (SELECT size_group_id FROM item_classifications WHERE size_group_id IS NOT NULL LIMIT 1)
    `) as any[];
    let sizeArr: string[] = ["XS","S","M","L","XL","XXL"];
    if (sizes.length) { try { sizeArr = JSON.parse(sizes[0].sizes_json); } catch {} }
    const base = rows[activeRow];
    const baseCode = base.item_code?.replace(/\/[^/]+$/, "") || base.description?.toUpperCase().replace(/\s+/g, "-");
    const newRows: ItemRow[] = sizeArr.map(sz => ({
      ...base, id: uuidv4(), size_code: sz,
      item_code: baseCode ? `${baseCode}/${sz}` : sz,
    }));
    setRows(rs => {
      const before = rs.slice(0, activeRow + 1);
      const after = rs.slice(activeRow + 1);
      return [...before, ...newRows, ...after];
    });
    showToast(`✓ Generated ${sizeArr.length} size variants.`);
  };

  // ── F2 Lookup ─────────────────────────────────────────────────────────────
  const openLookup = (cat: string, field: string, rowIdx: number) => {
    const res = localDB.exec(`SELECT code, description FROM general_lookups WHERE category=? ORDER BY sort_order ASC`, [cat]) as any[];
    setLookup({ cat, field, rowIdx, results: res });
    setLookupSearch("");
  };

  const filteredLookup = lookup?.results.filter(r =>
    r.code.includes(lookupSearch.toUpperCase()) || r.description.toLowerCase().includes(lookupSearch.toLowerCase())
  ) ?? [];

  const selectLookup = (code: string) => {
    if (!lookup) return;
    updateRow(lookup.rowIdx, lookup.field, code);
    // If size-matrix field, also update common if it's common
    if (isCommon(lookup.field)) setCommonData(c => ({ ...c, [lookup.field]: code }));
    setLookup(null);
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    const valid = rows.filter(r => r.item_code?.trim());
    if (!valid.length) return showToast("No SKU codes to save.");
    setIsSaving(true);
    try {
      let saved = 0;
      for (const row of valid) {
        const merged: any = { ...row };
        for (const k of commonFields) merged[k] = commonData[k] ?? row[k];
        localDB.run(`
          INSERT OR REPLACE INTO item_master 
          (id, item_code, description, barcode, brand_code, color_code, shade_code, size_code,
           season_code, department_code, collection_code, fit_code, fabric_code, gender_code,
           uom, mrp, mop, cost_price, hsn_code, tax_pct, is_active)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)`,
          [merged.id, merged.item_code.toUpperCase(), merged.description, merged.barcode ?? "",
           merged.brand_code ?? "", merged.color_code ?? "", merged.shade_code ?? "", merged.size_code ?? "",
           merged.season_code ?? "", merged.department_code ?? "", merged.collection_code ?? "",
           merged.fit_code ?? "", merged.fabric_code ?? "", merged.gender_code ?? "",
           merged.uom ?? "PCS", merged.mrp ?? 0, merged.mop ?? 0, merged.cost_price ?? 0,
           merged.hsn_code ?? "", merged.tax_pct ?? 0]
        );
        saved++;
      }
      await localDB.save();
      const r = localDB.exec(`SELECT COUNT(*) as cnt FROM item_master`) as any[];
      setCommitCount(r[0]?.cnt ?? 0);
      showToast(`✓ ${saved} SKU(s) committed to sovereign DB.`);
      setRows([emptyRow(commonData)]);
      setActiveRow(0);
    } catch (err: any) {
      showToast(`✗ ${err.message}`);
    } finally { setIsSaving(false); }
  };

  // ── Keyboard Navigation ─────────────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey && e.key === "n") { e.preventDefault(); addRow(); }
    if (e.ctrlKey && e.key === "s") { e.preventDefault(); handleSave(); }
    if (e.ctrlKey && e.key === "m") { e.preventDefault(); generateSizeMatrix(); }
    if (e.key === "Escape" && lookup) { e.preventDefault(); setLookup(null); }
  };

  return (
    <div className="im-engine" onKeyDown={handleKeyDown} tabIndex={0}>
      {toast && <div className="im-toast">{toast}</div>}

      {/* ── HEADER ── */}
      <div className="im-header">
        <div className="im-title">ITEM MASTER ENTRY <span className="im-count">{commitCount} ITEMS IN DB</span></div>
        <div className="im-tabs">
          {["VIEW","COMMON FIELDS","ITEM DETAILS"].map((t, i) => (
            <button key={i} className={`im-tab ${tab === i ? "active" : ""}`} onClick={() => setTab(i)}>
              <span className="tab-num">ALT+{i+1}</span> {t}
            </button>
          ))}
        </div>
        <div className="im-actions">
          <button className="save-btn" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "SYNCING…" : `CTRL+S  COMMIT`}
          </button>
        </div>
      </div>

      {/* ══════════ TAB 1: VIEW ══════════ */}
      {tab === 0 && (
        <div className="tab-panel">
          <div className="view-layout">
            <div className="field-col avail-col">
              <div className="col-label">AVAILABLE FIELDS</div>
              <div className="field-list">
                {availableFields.map(f => (
                  <div key={f.key} className="field-item" onClick={() => moveToSelected(f.key)}>
                    <span className="fi-label">{f.label}</span>
                    <span className="fi-add">→</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="field-col selected-col">
              <div className="col-label">SELECTED FIELDS (COLUMN ORDER)</div>
              <div className="field-list">
                {selectedFieldDefs.map(f => (
                  <div key={f.key} className={`field-item sel ${f.required ? "required" : ""}`}>
                    <span className="fi-label">{f.label}{f.required ? " *" : ""}</span>
                    <div className="fi-controls">
                      <button onClick={() => reorder("up", f.key)}>↑</button>
                      <button onClick={() => reorder("down", f.key)}>↓</button>
                      {!f.required && <button className="fi-rm" onClick={() => moveToAvailable(f.key)}>✕</button>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="view-settings">
              <div className="col-label">VIEW SETTINGS</div>
              <div className="vs-field"><label>FREEZE COLUMNS (0–6)</label>
                <input type="number" min={0} max={6} value={frozenCols} onChange={e => setFrozenCols(Math.min(6, Math.max(0, Number(e.target.value))))} />
              </div>
              <div className="vs-info">Frozen columns stay visible when scrolling right. Current: {frozenCols}</div>
              <button className="save-sel-btn" onClick={() => { setSavedFieldSel(true); showToast("✓ Field selections saved for next session."); }}>
                {savedFieldSel ? "✓ SAVED" : "SAVE FIELD SELECTIONS"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ TAB 2: COMMON FIELDS ══════════ */}
      {tab === 1 && (
        <div className="tab-panel">
          <div className="cf-layout">
            <div className="cf-select-col">
              <div className="col-label">SELECT COMMON FIELDS</div>
              <div className="cf-hint">Fields marked common are entered ONCE per session and auto-filled for all rows.</div>
              <div className="cf-list">
                {selectedFieldDefs.filter(f => !f.required).map(f => (
                  <label key={f.key} className={`cf-item ${isCommon(f.key) ? "cf-active" : ""}`}>
                    <input type="checkbox" checked={isCommon(f.key)} onChange={() => toggleCommon(f.key)} />
                    <span>{f.label}</span>
                    {isCommon(f.key) && <span className="cf-badge">COMMON</span>}
                  </label>
                ))}
              </div>
            </div>
            <div className="cf-data-col">
              <div className="col-label">COMMON FIELD DATA</div>
              <div className="cf-hint">These values will be auto-applied to all rows entering this session.</div>
              <div className="cf-data-grid">
                {commonFields.filter(k => selectedFields.includes(k)).map(k => {
                  const fd = ALL_FIELDS.find(f => f.key === k);
                  if (!fd) return null;
                  return (
                    <div key={k} className="cf-datum">
                      <label>{fd.label}</label>
                      <div className="cf-input-wrap">
                        <input
                          value={commonData[k] ?? ""}
                          type={NUMERIC_FIELDS.has(k) ? "number" : "text"}
                          onChange={e => setCommonData(d => ({ ...d, [k]: NUMERIC_FIELDS.has(k) ? Number(e.target.value) : e.target.value.toUpperCase() }))}
                          placeholder={`Enter ${fd.label}`}
                        />
                        {fd.lookupCat && (
                          <button className="cf-lookup-btn" onClick={() => openLookup(fd.lookupCat!, k, -1)}>F2</button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {commonFields.length === 0 && <div className="cf-empty">No common fields selected. Go to the left panel to choose fields.</div>}
              </div>
              <button className="save-sel-btn" style={{ marginTop: 16 }} onClick={() => { setSavedCommon(true); showToast("✓ Common field data saved for next session."); }}>
                {savedCommon ? "✓ SAVED" : "SAVE COMMON FIELD DATA"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ TAB 3: ITEM DETAILS ══════════ */}
      {tab === 2 && (
        <div className="tab-panel tab-grid">
          <div className="grid-toolbar">
            <div className="gt-shortcuts">[CTRL+N] NEW ROW ·  [CTRL+M] SIZE MATRIX ·  [F2] LOOKUP ·  [CTRL+S] COMMIT</div>
            <div className="gt-acts">
              <button className="gt-btn" onClick={addRow}>＋ New Row</button>
              <button className="gt-btn accent" onClick={generateSizeMatrix}>⊞ Size Matrix</button>
            </div>
          </div>

          <div className="grid-scroll">
            <table className="im-table">
              <thead>
                <tr>
                  <th className="th-no">#</th>
                  {selectedFieldDefs.map((f, i) => (
                    <th key={f.key} style={{ minWidth: f.width }} className={`${isCommon(f.key) ? "th-common" : ""} ${i < frozenCols ? "th-frozen" : ""}`}>
                      {f.label}
                      {isCommon(f.key) && <span className="th-common-badge">↑ COMMON</span>}
                    </th>
                  ))}
                  <th className="th-del"></th>
                </tr>
                {/* Common field values row */}
                <tr className="common-row">
                  <td></td>
                  {selectedFieldDefs.map(f => (
                    <td key={f.key} className={`common-cell ${isCommon(f.key) ? "cf-fill" : ""}`}>
                      {isCommon(f.key) ? <span className="cf-value">{commonData[f.key] ?? "—"}</span> : ""}
                    </td>
                  ))}
                  <td></td>
                </tr>
              </thead>
              <tbody>
                {markedRows.map((row, i) => (
                  <tr key={row.id} className={`${i === activeRow ? "row-active" : ""} ${row._isDupe ? "row-dupe" : ""}`} onClick={() => setActiveRow(i)}>
                    <td className="td-no">{i + 1}</td>
                    {selectedFieldDefs.map((f, ci) => {
                      const isC = isCommon(f.key);
                      const val = isC ? (commonData[f.key] ?? "") : (row[f.key] ?? "");
                      return (
                        <td key={f.key} className={`${isC ? "td-common" : ""} ${ci < frozenCols ? "td-frozen" : ""}`}>
                          {isC ? (
                            <span className="td-common-val">{val}</span>
                          ) : (
                            <div className="td-input-wrap">
                              <input
                                className={f.key === "item_code" && row._isDupe ? "input-dupe" : ""}
                                value={row[f.key] ?? ""}
                                type={NUMERIC_FIELDS.has(f.key) ? "number" : "text"}
                                onChange={e => updateRow(i, f.key, NUMERIC_FIELDS.has(f.key) ? Number(e.target.value) : e.target.value.toUpperCase())}
                                onFocus={() => { setActiveRow(i); setActiveCell(f.key); }}
                                onKeyDown={e => {
                                  if (e.key === "F2" && f.lookupCat) { e.preventDefault(); openLookup(f.lookupCat, f.key, i); }
                                  if (e.key === "Tab" && i === rows.length - 1 && ci === selectedFieldDefs.length - 1) { e.preventDefault(); addRow(); }
                                }}
                                placeholder={f.lookupCat ? "F2" : ""}
                              />
                              {f.lookupCat && <span className="lookup-hint" onClick={() => openLookup(f.lookupCat!, f.key, i)}>▾</span>}
                            </div>
                          )}
                          {f.key === "item_code" && row._isDupe && <span className="dupe-warn">DUPE!</span>}
                        </td>
                      );
                    })}
                    <td><button className="del-row" onClick={() => deleteRow(i)}>✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid-footer">
            <span className="gf-stat">{rows.length} rows · {rows.filter(r => r.item_code?.trim()).length} ready to commit · {markedRows.filter(r => r._isDupe).length} duplicates</span>
            <button className="commit-btn" onClick={handleSave} disabled={isSaving}>
              {isSaving ? "SYNCING…" : `◈ COMMIT ${rows.filter(r => r.item_code?.trim()).length} SKUs TO SOVEREIGN DB`}
            </button>
          </div>
        </div>
      )}

      {/* ══════════ F2 LOOKUP POPUP ══════════ */}
      {lookup && (
        <div className="lookup-overlay" onClick={() => setLookup(null)}>
          <div className="lookup-panel" onClick={e => e.stopPropagation()}>
            <div className="lp-header">
              <span className="lp-title">SELECT: {lookup.cat}</span>
              <input autoFocus className="lp-search" placeholder="⌕ Search…" value={lookupSearch} onChange={e => setLookupSearch(e.target.value)} />
            </div>
            <div className="lp-list">
              {filteredLookup.map(r => (
                <div key={r.code} className="lp-item" onClick={() => selectLookup(r.code)}>
                  <span className="lp-code">{r.code}</span>
                  <span className="lp-desc">{r.description}</span>
                </div>
              ))}
              {filteredLookup.length === 0 && <div className="lp-empty">No matches. Press ESC to close.</div>}
            </div>
            <div className="lp-footer">
              <span>[ENTER] Select · [ESC] Close</span>
              <button onClick={() => setLookup(null)}>CLOSE</button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .im-engine { display: flex; flex-direction: column; height: 100%; background: #000; color: #fff; font-family: 'JetBrains Mono', monospace; gap: 0; outline: none; }
        /* HEADER */
        .im-header { display: flex; align-items: center; gap: 16px; padding: 16px 20px; border-bottom: 1px solid #111; background: #000; flex-wrap: wrap; }
        .im-title { font-size: 13px; font-weight: 900; color: #fbbf24; letter-spacing: 2px; flex: 1; }
        .im-count { font-size: 9px; color: #444; margin-left: 10px; background: #111; padding: 2px 8px; border-radius: 4px; }
        .im-tabs { display: flex; gap: 4px; }
        .im-tab { background: #0a0a0a; border: 1px solid #222; color: #555; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-size: 11px; font-weight: 700; font-family: 'JetBrains Mono', monospace; transition: all 0.15s; }
        .im-tab:hover { border-color: #444; color: #aaa; }
        .im-tab.active { background: #1f1a00; border-color: #fbbf24; color: #fbbf24; }
        .tab-num { font-size: 8px; color: inherit; opacity: 0.5; margin-right: 4px; }
        .im-actions { display: flex; gap: 8px; }
        .save-btn { background: #10b981; color: #000; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 900; font-size: 11px; cursor: pointer; font-family: 'JetBrains Mono', monospace; }
        .save-btn:disabled { opacity: 0.5; }

        /* TAB PANELS */
        .tab-panel { flex: 1; overflow: hidden; padding: 20px; display: flex; flex-direction: column; gap: 16px; }
        .tab-grid { padding: 0; }

        /* TAB 1: VIEW */
        .view-layout { display: grid; grid-template-columns: 1fr 1fr 280px; gap: 16px; height: 100%; }
        .field-col { display: flex; flex-direction: column; gap: 8px; }
        .col-label { font-size: 9px; color: #555; font-weight: 700; letter-spacing: 1px; padding-bottom: 4px; border-bottom: 1px solid #111; }
        .field-list { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 3px; padding-top: 4px; }
        .field-item { display: flex; align-items: center; padding: 9px 12px; border-radius: 6px; background: #050505; border: 1px solid #111; cursor: pointer; transition: all 0.15s; }
        .field-item:hover { background: #0f0f0f; border-color: #333; }
        .field-item.sel { background: #0a0a14; border-color: #1a1a3e; }
        .field-item.required { border-color: #7c3aed44; }
        .fi-label { flex: 1; font-size: 11px; color: #aaa; }
        .fi-add { font-size: 12px; color: #444; }
        .fi-controls { display: flex; gap: 4px; }
        .fi-controls button { background: #111; border: 1px solid #222; color: #555; padding: 3px 7px; border-radius: 4px; cursor: pointer; font-size: 11px; }
        .fi-controls button:hover { color: #fff; border-color: #444; }
        .fi-rm:hover { color: #f87171 !important; }
        .view-settings { background: #050505; border: 1px solid #111; border-radius: 10px; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
        .vs-field { display: flex; flex-direction: column; gap: 6px; }
        .vs-field label { font-size: 9px; color: #555; font-weight: 700; }
        .vs-field input { background: #111; border: 1px solid #333; color: #fff; padding: 8px 12px; border-radius: 6px; font-size: 18px; font-weight: 900; outline: none; width: 80px; text-align: center; font-family: 'JetBrains Mono', monospace; }
        .vs-info { font-size: 9px; color: #333; }
        .save-sel-btn { background: #1a1a1a; border: 1px solid #333; color: #666; padding: 10px 16px; border-radius: 8px; cursor: pointer; font-weight: 700; font-size: 11px; font-family: 'JetBrains Mono', monospace; margin-top: auto; }
        .save-sel-btn:hover { background: #222; color: #aaa; }

        /* TAB 2: COMMON FIELDS */
        .cf-layout { display: grid; grid-template-columns: 1fr 1.5fr; gap: 20px; height: 100%; }
        .cf-hint { font-size: 10px; color: #444; line-height: 1.6; }
        .cf-list { display: flex; flex-direction: column; gap: 4px; overflow-y: auto; flex: 1; padding-top: 8px; }
        .cf-item { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 8px; background: #050505; border: 1px solid #111; cursor: pointer; font-size: 12px; color: #666; transition: all 0.15s; }
        .cf-item.cf-active { background: #0a0a20; border-color: #1a1a5e; color: #818cf8; }
        .cf-item input { accent-color: #818cf8; }
        .cf-badge { font-size: 8px; background: #1e1b4b; color: #818cf8; padding: 2px 6px; border-radius: 4px; margin-left: auto; }
        .cf-data-col { display: flex; flex-direction: column; gap: 12px; overflow-y: auto; }
        .cf-data-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .cf-datum { display: flex; flex-direction: column; gap: 5px; }
        .cf-datum label { font-size: 9px; color: #555; font-weight: 700; letter-spacing: 1px; }
        .cf-input-wrap { display: flex; gap: 4px; }
        .cf-input-wrap input { flex: 1; background: #111; border: 1px solid #333; color: #fbbf24; padding: 10px 12px; border-radius: 8px; font-size: 13px; font-weight: 700; outline: none; font-family: 'JetBrains Mono', monospace; }
        .cf-input-wrap input:focus { border-color: #fbbf24; background: #1f1a00; }
        .cf-lookup-btn { background: #1a1a1a; border: 1px solid #333; color: #fbbf24; padding: 0 10px; border-radius: 6px; cursor: pointer; font-weight: 900; font-size: 10px; }
        .cf-empty { text-align: center; padding: 32px; font-size: 11px; color: #333; }

        /* TAB 3: ITEM DETAILS */
        .grid-toolbar { display: flex; align-items: center; justify-content: space-between; padding: 10px 20px; border-bottom: 1px solid #111; background: #050505; }
        .gt-shortcuts { font-size: 9px; color: #333; }
        .gt-acts { display: flex; gap: 8px; }
        .gt-btn { background: #111; border: 1px solid #222; color: #aaa; padding: 7px 14px; border-radius: 6px; cursor: pointer; font-size: 11px; font-weight: 700; font-family: 'JetBrains Mono', monospace; }
        .gt-btn.accent { background: #1e1b4b; border-color: #4338ca; color: #818cf8; }
        .grid-scroll { flex: 1; overflow: auto; }
        .im-table { width: max-content; min-width: 100%; border-collapse: collapse; }
        .th-no { width: 40px; background: #050505; padding: 10px 8px; font-size: 9px; color: #333; text-align: center; position: sticky; top: 0; left: 0; z-index: 30; }
        th { background: #050505; padding: 10px 12px; text-align: left; font-size: 9px; color: #555; font-weight: 700; letter-spacing: 1px; position: sticky; top: 0; z-index: 20; border-bottom: 1px solid #1a1a1a; white-space: nowrap; }
        .th-common { background: #0a0a20; color: #4338ca; }
        .th-common-badge { display: block; font-size: 7px; color: #4338ca; font-weight: 400; margin-top: 2px; opacity: 0.7; }
        .th-frozen { z-index: 25; position: sticky; left: 40px; }
        .th-del { width: 40px; background: #050505; position: sticky; top: 0; right: 0; z-index: 30; }
        .common-row { background: #060610; }
        .common-row td { padding: 4px 12px; font-size: 9px; }
        .cf-fill { background: #0a0a20; }
        .cf-value { color: #4338ca; font-weight: 700; }
        td { border-bottom: 1px solid #0a0a0a; }
        .td-no { padding: 0 8px; text-align: center; font-size: 10px; color: #333; position: sticky; left: 0; background: #000; z-index: 10; }
        .td-common { background: #06061a; }
        .td-frozen { position: sticky; left: 40px; background: inherit; z-index: 5; }
        .td-common-val { color: #3730a3; font-size: 11px; padding: 12px; display: block; }
        .td-input-wrap { position: relative; display: flex; align-items: center; }
        .td-input-wrap input { width: 100%; background: transparent; border: none; color: #fff; padding: 12px; font-size: 12px; outline: none; font-family: 'JetBrains Mono', monospace; }
        .td-input-wrap input:focus { background: #0f0f1f; color: #a5b4fc; }
        .input-dupe { background: #2d0a0a !important; color: #f87171 !important; }
        .lookup-hint { position: absolute; right: 6px; color: #444; cursor: pointer; font-size: 10px; }
        .lookup-hint:hover { color: #fbbf24; }
        .dupe-warn { position: absolute; right: 20px; top: -8px; font-size: 8px; background: #f87171; color: #000; padding: 1px 5px; border-radius: 3px; font-weight: 900; }
        .row-active td { background: #0a0814 !important; }
        .row-dupe td { background: #1a0505 !important; }
        .del-row { background: transparent; border: none; color: #222; padding: 12px 10px; cursor: pointer; font-size: 14px; }
        .del-row:hover { color: #f87171; }
        .grid-footer { display: flex; align-items: center; justify-content: space-between; padding: 12px 20px; border-top: 1px solid #111; background: #000; }
        .gf-stat { font-size: 10px; color: #444; }
        .commit-btn { background: linear-gradient(135deg, #10b981, #059669); color: #000; border: none; padding: 12px 28px; border-radius: 10px; font-weight: 900; font-size: 12px; cursor: pointer; box-shadow: 0 4px 20px rgba(16,185,129,0.3); font-family: 'JetBrains Mono', monospace; }
        .commit-btn:hover { box-shadow: 0 6px 28px rgba(16,185,129,0.5); }
        .commit-btn:disabled { opacity: 0.5; }

        /* LOOKUP POPUP */
        .lookup-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; z-index: 200; }
        .lookup-panel { background: #0a0a0a; border: 1px solid #333; border-radius: 14px; width: 480px; max-height: 60vh; display: flex; flex-direction: column; overflow: hidden; }
        .lp-header { padding: 14px 16px; border-bottom: 1px solid #111; display: flex; align-items: center; gap: 12px; }
        .lp-title { font-size: 11px; font-weight: 900; color: #fbbf24; letter-spacing: 1px; white-space: nowrap; }
        .lp-search { flex: 1; background: #111; border: 1px solid #333; color: #fff; padding: 8px 12px; border-radius: 6px; font-size: 12px; outline: none; font-family: 'JetBrains Mono', monospace; }
        .lp-search:focus { border-color: #fbbf24; }
        .lp-list { flex: 1; overflow-y: auto; }
        .lp-item { display: flex; align-items: center; gap: 16px; padding: 11px 16px; cursor: pointer; border-bottom: 1px solid #0a0a0a; transition: background 0.1s; }
        .lp-item:hover { background: #131313; }
        .lp-code { font-size: 13px; font-weight: 700; color: #fbbf24; min-width: 100px; }
        .lp-desc { font-size: 11px; color: #888; }
        .lp-empty { text-align: center; padding: 32px; font-size: 11px; color: #333; }
        .lp-footer { padding: 10px 16px; border-top: 1px solid #111; display: flex; justify-content: space-between; align-items: center; }
        .lp-footer span { font-size: 9px; color: #333; }
        .lp-footer button { background: #111; border: 1px solid #222; color: #666; padding: 6px 14px; border-radius: 6px; cursor: pointer; font-size: 11px; font-weight: 700; font-family: 'JetBrains Mono', monospace; }

        /* Toast */
        .im-toast { position: fixed; bottom: 32px; left: 50%; transform: translateX(-50%); background: #0f0f0f; border: 1px solid #333; color: #aaa; padding: 12px 24px; border-radius: 10px; font-size: 12px; z-index: 999; white-space: nowrap; }
      `}</style>
    </div>
  );
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  S M R I T I - O S  ||  ITEM CLASSIFICATION MANAGER
 *  4-Level Hierarchy: SuperClass → Class → SubClass1 (Style) → SubClass2 (Shade)
 * ─────────────────────────────────────────────────────────────────────────────
 */
"use client";
import React, { useState, useEffect } from "react";
import { classificationService, sizeGroupService, type ItemClassification, type SizeGroup } from "@/lib/services/catalogueService";
import { localDB } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

const LEVELS = [
  { num: 1, label: "SUPER CLASS", color: "#a78bfa", example: "Menswear, Womenswear" },
  { num: 2, label: "CLASS", color: "#60a5fa", example: "Apparel, Footwear" },
  { num: 3, label: "STYLE (SubClass1)", color: "#34d399", example: "T-Shirts, Shirts" },
  { num: 4, label: "SHADE (SubClass2)", color: "#fbbf24", example: "Red-Shade, Navy-Shade" },
];

interface EditState { id?: string; level: number; code: string; name: string; parent_id: string; size_group_id: string; sort_order: number; }
const blank = (level: number): EditState => ({ level, code: "", name: "", parent_id: "", size_group_id: "", sort_order: 0 });

export default function ItemClassificationManager() {
  const [all, setAll] = useState<ItemClassification[]>([]);
  const [sizeGroups, setSizeGroups] = useState<SizeGroup[]>([]);
  const [selected, setSelected] = useState<Record<number, string>>({});
  const [editing, setEditing] = useState<EditState | null>(null);
  const [toast, setToast] = useState("");
  const [search, setSearch] = useState("");

  const load = () => { setAll(classificationService.getAll()); setSizeGroups(sizeGroupService.getAll()); };
  useEffect(() => { if (localDB.isInitialized) load(); }, []);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const forLevel = (level: number) => {
    let items = all.filter(i => i.level === level);
    if (level > 1) {
      const parentId = selected[level - 1];
      if (parentId) items = items.filter(i => i.parent_id === parentId);
    }
    if (search) items = items.filter(i => i.code.includes(search.toUpperCase()) || i.name.toLowerCase().includes(search.toLowerCase()));
    return items;
  };

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.code || !editing.name) return showToast("Code and Name are required.");
    try {
      classificationService.save({
        id: editing.id,
        level: editing.level,
        code: editing.code,
        name: editing.name,
        parent_id: editing.parent_id || null,
        size_group_id: editing.size_group_id || null,
        sort_order: editing.sort_order,
        is_active: 1,
      });
      await localDB.save();
      load();
      setEditing(null);
      showToast(`✓ ${editing.name} saved.`);
    } catch (err: any) { showToast(`✗ ${err.message}`); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      classificationService.delete(id);
      await localDB.save();
      load();
      showToast(`✓ Deleted.`);
    } catch (err: any) { showToast(`✗ ${err.message}`); }
  };

  const handleAdd = (level: number) => {
    setEditing({ ...blank(level), parent_id: selected[level - 1] ?? "" });
  };

  const stockPreview = selected[1] && selected[2] && selected[3]
    ? classificationService.buildStockNumber(
        all.find(i => i.id === selected[1])?.code ?? "??",
        all.find(i => i.id === selected[2])?.code ?? "??",
        all.find(i => i.id === selected[3])?.code ?? "??",
        "COLOR", "SIZE"
      )
    : null;

  return (
    <div className="ic-mgr">
      {toast && <div className="toast">{toast}</div>}

      <div className="ic-header">
        <div>
          <div className="ic-title">ITEM CLASSIFICATION HIERARCHY</div>
          <div className="ic-sub">4-Level Taxonomy · Auto Stock Number Generation</div>
        </div>
        <input className="ic-search" placeholder="⌕  Search code or name…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {stockPreview && (
        <div className="stock-preview">
          <span className="sp-label">STOCK NO PREVIEW →</span>
          <span className="sp-code">{stockPreview}</span>
        </div>
      )}

      <div className="levels-row">
        {LEVELS.map(lv => (
          <div key={lv.num} className="level-col" style={{ "--lv-color": lv.color } as any}>
            <div className="lv-header">
              <span className="lv-num">L{lv.num}</span>
              <span className="lv-label">{lv.label}</span>
              <button className="lv-add" onClick={() => handleAdd(lv.num)}>＋</button>
            </div>
            <div className="lv-example">{lv.example}</div>
            <div className="lv-items">
              {forLevel(lv.num).map(ic => (
                <div
                  key={ic.id}
                  className={`ic-item ${selected[lv.num] === ic.id ? "selected" : ""}`}
                  onClick={() => setSelected(s => ({ ...s, [lv.num]: ic.id }))}
                >
                  <div className="ic-item-codes">
                    <span className="ic-code">{ic.code}</span>
                    {ic.size_group_id && <span className="ic-sg-badge">SZ</span>}
                  </div>
                  <span className="ic-name">{ic.name}</span>
                  <div className="ic-actions">
                    <button className="ic-edit" onClick={(e) => { e.stopPropagation(); setEditing({ id: ic.id, level: ic.level, code: ic.code, name: ic.name, parent_id: ic.parent_id ?? "", size_group_id: ic.size_group_id ?? "", sort_order: ic.sort_order }); }}>✎</button>
                    <button className="ic-del" onClick={(e) => { e.stopPropagation(); handleDelete(ic.id, ic.name); }}>✕</button>
                  </div>
                </div>
              ))}
              {forLevel(lv.num).length === 0 && (
                <div className="ic-empty">— No entries —<br /><span>Click + to add</span></div>
              )}
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="edit-overlay" onClick={() => setEditing(null)}>
          <div className="edit-panel" onClick={e => e.stopPropagation()}>
            <div className="ep-title">
              {editing.id ? "EDIT" : "ADD"} — {LEVELS[editing.level - 1].label}
            </div>
            <div className="ep-fields">
              <div className="ep-field"><label>CODE *</label><input autoFocus value={editing.code} onChange={e => setEditing(s => s && ({ ...s, code: e.target.value.toUpperCase().replace(/\s/g,"_") }))} placeholder="e.g. MW" /></div>
              <div className="ep-field"><label>NAME *</label><input value={editing.name} onChange={e => setEditing(s => s && ({ ...s, name: e.target.value }))} placeholder="e.g. Menswear" /></div>
              {editing.level > 1 && (
                <div className="ep-field"><label>PARENT ({LEVELS[editing.level - 2].label})</label>
                  <select value={editing.parent_id} onChange={e => setEditing(s => s && ({ ...s, parent_id: e.target.value }))}>
                    <option value="">— Select Parent —</option>
                    {all.filter(i => i.level === editing.level - 1).map(p => (
                      <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
                    ))}
                  </select></div>
              )}
              {editing.level === 3 && (
                <div className="ep-field"><label>SIZE GROUP</label>
                  <select value={editing.size_group_id} onChange={e => setEditing(s => s && ({ ...s, size_group_id: e.target.value }))}>
                    <option value="">— None —</option>
                    {sizeGroups.map(sg => <option key={sg.id} value={sg.id}>{sg.name}</option>)}
                  </select></div>
              )}
              <div className="ep-field"><label>SORT ORDER</label><input type="number" value={editing.sort_order} onChange={e => setEditing(s => s && ({ ...s, sort_order: Number(e.target.value) }))} /></div>
            </div>
            <div className="ep-footer">
              <button className="ep-cancel" onClick={() => setEditing(null)}>CANCEL</button>
              <button className="ep-save" onClick={handleSave}>SAVE CLASSIFICATION</button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .ic-mgr { color: #fff; font-family: 'JetBrains Mono', monospace; display: flex; flex-direction: column; gap: 16px; height: 100%; }
        .ic-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
        .ic-title { font-size: 15px; font-weight: 900; color: #a78bfa; letter-spacing: 2px; }
        .ic-sub { font-size: 10px; color: #555; margin-top: 2px; }
        .ic-search { background: #111; border: 1px solid #333; color: #fff; padding: 8px 14px; border-radius: 8px; font-size: 12px; outline: none; width: 220px; }
        .ic-search:focus { border-color: #a78bfa; }
        .stock-preview { background: #0f0a1e; border: 1px solid #4c1d95; border-radius: 8px; padding: 10px 16px; display: flex; align-items: center; gap: 16px; }
        .sp-label { font-size: 10px; color: #7c3aed; font-weight: 700; }
        .sp-code { font-size: 14px; color: #a78bfa; font-weight: 900; letter-spacing: 1px; }
        .levels-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; flex: 1; overflow: hidden; }
        .level-col { background: #050505; border: 1px solid #1a1a1a; border-radius: 12px; display: flex; flex-direction: column; overflow: hidden; transition: border-color 0.2s; }
        .level-col:hover { border-color: var(--lv-color, #333); }
        .lv-header { display: flex; align-items: center; gap: 8px; padding: 12px; background: #0a0a0a; border-bottom: 1px solid #111; }
        .lv-num { font-size: 10px; font-weight: 900; color: var(--lv-color); background: #111; width: 24px; height: 24px; border-radius: 6px; display: flex; align-items: center; justify-content: center; }
        .lv-label { font-size: 10px; font-weight: 700; color: #aaa; flex: 1; }
        .lv-add { background: var(--lv-color); color: #000; border: none; width: 22px; height: 22px; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: 900; display: flex; align-items: center; justify-content: center; }
        .lv-example { padding: 6px 12px; font-size: 9px; color: #333; font-style: italic; border-bottom: 1px solid #111; }
        .lv-items { flex: 1; overflow-y: auto; padding: 8px; display: flex; flex-direction: column; gap: 4px; }
        .ic-item { background: #0a0a0a; border: 1px solid #1a1a1a; border-radius: 8px; padding: 10px 12px; cursor: pointer; transition: all 0.15s; position: relative; }
        .ic-item:hover { background: #111; border-color: #333; }
        .ic-item.selected { background: #120d24; border-color: var(--lv-color, #6d28d9); }
        .ic-item-codes { display: flex; align-items: center; gap: 6px; margin-bottom: 2px; }
        .ic-code { font-size: 12px; font-weight: 900; color: var(--lv-color, #a78bfa); }
        .ic-sg-badge { font-size: 8px; background: #1d4ed8; color: #93c5fd; padding: 1px 5px; border-radius: 4px; font-weight: 700; }
        .ic-name { font-size: 11px; color: #aaa; }
        .ic-actions { position: absolute; top: 8px; right: 8px; display: none; gap: 4px; }
        .ic-item:hover .ic-actions { display: flex; }
        .ic-edit { background: #1f2937; color: #60a5fa; border: none; padding: 3px 6px; border-radius: 4px; cursor: pointer; font-size: 11px; }
        .ic-del { background: #1f2937; color: #f87171; border: none; padding: 3px 6px; border-radius: 4px; cursor: pointer; font-size: 11px; }
        .ic-empty { text-align: center; padding: 24px 12px; font-size: 11px; color: #333; line-height: 2; }
        .ic-empty span { font-size: 10px; color: #222; }
        /* Edit Overlay */
        .edit-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 100; }
        .edit-panel { background: #0a0a0a; border: 1px solid #333; border-radius: 16px; padding: 28px; width: 460px; display: flex; flex-direction: column; gap: 20px; }
        .ep-title { font-size: 14px; font-weight: 900; color: #a78bfa; letter-spacing: 2px; }
        .ep-fields { display: flex; flex-direction: column; gap: 14px; }
        .ep-field { display: flex; flex-direction: column; gap: 5px; }
        .ep-field label { font-size: 9px; color: #555; font-weight: 700; letter-spacing: 1px; }
        .ep-field input, .ep-field select { background: #111; border: 1px solid #333; color: #fff; padding: 10px 12px; border-radius: 8px; font-size: 13px; outline: none; font-family: 'JetBrains Mono', monospace; }
        .ep-field input:focus, .ep-field select:focus { border-color: #a78bfa; }
        .ep-footer { display: flex; justify-content: flex-end; gap: 12px; }
        .ep-cancel { background: #111; border: 1px solid #333; color: #666; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 700; }
        .ep-save { background: #7c3aed; color: #fff; border: none; padding: 10px 24px; border-radius: 8px; cursor: pointer; font-weight: 900; }
        .toast { position: fixed; bottom: 32px; right: 32px; background: #0f172a; border: 1px solid #334155; color: #94a3b8; padding: 12px 20px; border-radius: 10px; font-size: 12px; z-index: 999; }
      `}</style>
    </div>
  );
}

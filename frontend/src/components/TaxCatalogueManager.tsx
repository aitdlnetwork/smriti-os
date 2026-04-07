/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  S M R I T I - O S  ||  TAX CATALOGUE MANAGER
 *  GST Slab Configuration · HSN Mapping · Compound Formula Builder
 * ─────────────────────────────────────────────────────────────────────────────
 */
"use client";
import React, { useState, useEffect } from "react";
import { taxService, type TaxCode } from "@/lib/services/catalogueService";
import { localDB } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

const TAX_TYPES = ["GST", "NIL", "EXEMPT", "COMPOUND"];
const blank = (): Partial<TaxCode> => ({ code: "", name: "", hsn_code: "", gst_rate: 0, cgst_rate: 0, sgst_rate: 0, igst_rate: 0, cess_rate: 0, tax_type: "GST", is_inclusive: 0, is_active: 1 });

export default function TaxCatalogueManager() {
  const [codes, setCodes] = useState<TaxCode[]>([]);
  const [editing, setEditing] = useState<Partial<TaxCode> | null>(null);
  const [toast, setToast] = useState("");

  const load = () => { setCodes(taxService.getAll()); };
  useEffect(() => { if (localDB.isInitialized) load(); }, []);
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const handleGstChange = (rate: number) => {
    if (!editing) return;
    setEditing(e => e ? { ...e, gst_rate: rate, cgst_rate: rate/2, sgst_rate: rate/2, igst_rate: rate } : e);
  };

  const handleSave = async () => {
    if (!editing || !editing.code || !editing.name) return showToast("Code and Name required.");
    try {
      taxService.save(editing as any);
      await localDB.save();
      load();
      setEditing(null);
      showToast("✓ Tax code saved.");
    } catch (err: any) { showToast(`✗ ${err.message}`); }
  };

  const handleDelete = async (tc: TaxCode) => {
    try {
      taxService.delete(tc.id);
      await localDB.save();
      load();
      showToast("✓ Deleted.");
    } catch (err: any) { showToast(`✗ ${err.message}`); }
  };

  const typeColor: Record<string, string> = { GST: "#10b981", NIL: "#6b7280", EXEMPT: "#3b82f6", COMPOUND: "#f59e0b" };

  return (
    <div className="tax-mgr">
      {toast && <div className="toast">{toast}</div>}
      <div className="tax-header">
        <div>
          <div className="tax-title">TAX CATALOGUE</div>
          <div className="tax-sub">GST Slabs · HSN Mapping · Inclusive/Exclusive</div>
        </div>
        <button className="add-btn" onClick={() => setEditing(blank())}>＋ ADD TAX CODE</button>
      </div>

      <div className="gst-grid">
        {codes.map(tc => (
          <div key={tc.id} className={`gst-card ${!tc.is_active ? "inactive" : ""}`}>
            <div className="gc-top">
              <span className="gc-type" style={{ background: typeColor[tc.tax_type] + "22", color: typeColor[tc.tax_type] }}>{tc.tax_type}</span>
              {tc.is_inclusive ? <span className="gc-incl">INCL</span> : <span className="gc-excl">EXCL</span>}
              <div className="gc-acts">
                <button onClick={() => setEditing({ ...tc })}>✎</button>
                <button className="del-btn" onClick={() => handleDelete(tc)}>✕</button>
              </div>
            </div>
            <div className="gc-rate">{tc.gst_rate > 0 ? `${tc.gst_rate}%` : tc.tax_type}</div>
            <div className="gc-name">{tc.name}</div>
            {tc.hsn_code && <div className="gc-hsn">HSN: {tc.hsn_code}</div>}
            <div className="gc-breakdown">
              {tc.cgst_rate > 0 && <span>CGST {tc.cgst_rate}%</span>}
              {tc.sgst_rate > 0 && <span>SGST {tc.sgst_rate}%</span>}
              {tc.igst_rate > 0 && <span>IGST {tc.igst_rate}%</span>}
              {tc.cess_rate > 0 && <span>CESS {tc.cess_rate}%</span>}
            </div>
          </div>
        ))}
        <div className="gst-card add-card" onClick={() => setEditing(blank())}>
          <div className="add-card-inner">＋<br />Add Tax Code</div>
        </div>
      </div>

      {editing && (
        <div className="edit-overlay" onClick={() => setEditing(null)}>
          <div className="edit-panel" onClick={e => e.stopPropagation()}>
            <div className="ep-title">{editing.id ? "EDIT TAX CODE" : "ADD TAX CODE"}</div>
            <div className="ep-grid">
              <div className="ep-field"><label>CODE *</label><input autoFocus value={editing.code ?? ""} onChange={e => setEditing(p => p && ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="GST18" /></div>
              <div className="ep-field"><label>NAME *</label><input value={editing.name ?? ""} onChange={e => setEditing(p => p && ({ ...p, name: e.target.value }))} placeholder="GST 18%" /></div>
              <div className="ep-field"><label>TAX TYPE</label>
                <select value={editing.tax_type ?? "GST"} onChange={e => setEditing(p => p && ({ ...p, tax_type: e.target.value }))}>
                  {TAX_TYPES.map(t => <option key={t}>{t}</option>)}
                </select></div>
              <div className="ep-field"><label>HSN CODE</label><input value={editing.hsn_code ?? ""} onChange={e => setEditing(p => p && ({ ...p, hsn_code: e.target.value }))} placeholder="6109" /></div>
              <div className="ep-field full">
                <label>GST RATE (%) — auto-splits CGST/SGST</label>
                <div className="quick-rates">
                  {[0,5,12,18,28].map(r => <button key={r} className={`qr-btn ${editing.gst_rate === r ? "qr-active" : ""}`} onClick={() => handleGstChange(r)}>{r}%</button>)}
                </div>
                <input type="number" value={editing.gst_rate ?? 0} onChange={e => handleGstChange(Number(e.target.value))} />
              </div>
              <div className="ep-field"><label>CGST %</label><input type="number" value={editing.cgst_rate ?? 0} onChange={e => setEditing(p => p && ({ ...p, cgst_rate: Number(e.target.value) }))} /></div>
              <div className="ep-field"><label>SGST %</label><input type="number" value={editing.sgst_rate ?? 0} onChange={e => setEditing(p => p && ({ ...p, sgst_rate: Number(e.target.value) }))} /></div>
              <div className="ep-field"><label>IGST %</label><input type="number" value={editing.igst_rate ?? 0} onChange={e => setEditing(p => p && ({ ...p, igst_rate: Number(e.target.value) }))} /></div>
              <div className="ep-field"><label>CESS %</label><input type="number" value={editing.cess_rate ?? 0} onChange={e => setEditing(p => p && ({ ...p, cess_rate: Number(e.target.value) }))} /></div>
              <div className="ep-field ep-toggle">
                <label>TAX INCLUSIVE IN MRP?</label>
                <div className="toggle-row">
                  <button className={`toggle-btn ${!editing.is_inclusive ? "tog-active" : ""}`} onClick={() => setEditing(p => p && ({ ...p, is_inclusive: 0 }))}>EXCLUSIVE</button>
                  <button className={`toggle-btn ${editing.is_inclusive ? "tog-active" : ""}`} onClick={() => setEditing(p => p && ({ ...p, is_inclusive: 1 }))}>INCLUSIVE</button>
                </div>
              </div>
            </div>
            {(editing.gst_rate ?? 0) > 0 && (
              <div className="tax-preview">
                <span>On ₹1000 MRP:</span>
                <span>Tax = ₹{(editing.is_inclusive ? (1000 * (editing.gst_rate ?? 0) / (100 + (editing.gst_rate ?? 0))) : (1000 * (editing.gst_rate ?? 0) / 100)).toFixed(2)}</span>
                {!editing.is_inclusive && <span>Total = ₹{(1000 * (1 + (editing.gst_rate ?? 0)/100)).toFixed(2)}</span>}
              </div>
            )}
            <div className="ep-footer">
              <button className="ep-cancel" onClick={() => setEditing(null)}>CANCEL</button>
              <button className="ep-save" onClick={handleSave}>SAVE TAX CODE</button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .tax-mgr { color: #fff; font-family: 'JetBrains Mono', monospace; display: flex; flex-direction: column; gap: 20px; }
        .tax-header { display: flex; align-items: center; justify-content: space-between; }
        .tax-title { font-size: 15px; font-weight: 900; color: #10b981; letter-spacing: 2px; }
        .tax-sub { font-size: 10px; color: #555; margin-top: 2px; }
        .add-btn { background: #10b981; color: #000; border: none; padding: 10px 18px; border-radius: 8px; font-weight: 900; font-size: 12px; cursor: pointer; }
        .gst-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 14px; }
        .gst-card { background: #050505; border: 1px solid #1a1a1a; border-radius: 12px; padding: 16px; display: flex; flex-direction: column; gap: 8px; transition: all 0.2s; }
        .gst-card:hover { border-color: #10b981; }
        .gst-card.inactive { opacity: 0.4; }
        .gc-top { display: flex; align-items: center; gap: 6px; }
        .gc-type { font-size: 9px; font-weight: 900; padding: 3px 7px; border-radius: 4px; }
        .gc-incl { font-size: 8px; background: #064e3b; color: #6ee7b7; padding: 2px 6px; border-radius: 4px; }
        .gc-excl { font-size: 8px; background: #1a1a1a; color: #555; padding: 2px 6px; border-radius: 4px; }
        .gc-acts { margin-left: auto; display: flex; gap: 4px; opacity: 0; transition: opacity 0.15s; }
        .gst-card:hover .gc-acts { opacity: 1; }
        .gc-acts button { background: #1a1a1a; border: none; color: #aaa; padding: 4px 7px; border-radius: 4px; cursor: pointer; }
        .del-btn:hover { color: #f87171 !important; }
        .gc-rate { font-size: 28px; font-weight: 900; color: #10b981; }
        .gc-name { font-size: 12px; color: #aaa; }
        .gc-hsn { font-size: 10px; color: #555; }
        .gc-breakdown { display: flex; flex-wrap: wrap; gap: 4px; }
        .gc-breakdown span { font-size: 9px; background: #111; color: #666; padding: 2px 6px; border-radius: 4px; }
        .add-card { border: 1px dashed #222; cursor: pointer; align-items: center; justify-content: center; min-height: 140px; }
        .add-card:hover { border-color: #10b981; background: #0a1a14; }
        .add-card-inner { text-align: center; font-size: 22px; color: #333; line-height: 1.8; }
        /* Edit Panel */
        .edit-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 100; }
        .edit-panel { background: #0a0a0a; border: 1px solid #222; border-radius: 16px; padding: 28px; width: 580px; max-height: 85vh; overflow-y: auto; display: flex; flex-direction: column; gap: 20px; }
        .ep-title { font-size: 14px; font-weight: 900; color: #10b981; letter-spacing: 2px; }
        .ep-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .ep-field { display: flex; flex-direction: column; gap: 5px; }
        .ep-field.full { grid-column: 1 / -1; }
        .ep-field label { font-size: 9px; color: #555; font-weight: 700; letter-spacing: 1px; }
        .ep-field input, .ep-field select { background: #111; border: 1px solid #333; color: #fff; padding: 9px 12px; border-radius: 8px; font-size: 13px; outline: none; font-family: 'JetBrains Mono', monospace; }
        .ep-field input:focus, .ep-field select:focus { border-color: #10b981; }
        .quick-rates { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; }
        .qr-btn { background: #111; border: 1px solid #333; color: #666; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 700; }
        .qr-btn.qr-active { background: #10b981; color: #000; border-color: #10b981; }
        .ep-toggle { grid-column: 1 / -1; }
        .toggle-row { display: flex; gap: 8px; }
        .toggle-btn { flex: 1; padding: 8px; background: #111; border: 1px solid #333; color: #555; border-radius: 6px; cursor: pointer; font-weight: 700; font-size: 11px; }
        .toggle-btn.tog-active { background: #064e3b; border-color: #10b981; color: #10b981; }
        .tax-preview { background: #0a1a14; border: 1px solid #064e3b; border-radius: 8px; padding: 10px 14px; display: flex; gap: 24px; font-size: 12px; color: #6ee7b7; }
        .ep-footer { display: flex; justify-content: flex-end; gap: 12px; }
        .ep-cancel { background: #111; border: 1px solid #333; color: #666; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 700; }
        .ep-save { background: #10b981; color: #000; border: none; padding: 10px 24px; border-radius: 8px; cursor: pointer; font-weight: 900; }
        .toast { position: fixed; bottom: 32px; right: 32px; background: #0f172a; border: 1px solid #334155; color: #94a3b8; padding: 12px 20px; border-radius: 10px; font-size: 12px; z-index: 999; }
      `}</style>
    </div>
  );
}

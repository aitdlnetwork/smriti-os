/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  S M R I T I - O S  ||  PAYMENT MODE MANAGER
 *  Tender Configuration: Cash · Card · UPI · Coupon · Credit Note · Wallet
 * ─────────────────────────────────────────────────────────────────────────────
 */
"use client";
import React, { useState, useEffect } from "react";
import { paymentModeService, type PaymentMode } from "@/lib/services/catalogueService";
import { localDB } from "@/lib/db";

const MODE_TYPES = ["CASH", "CARD", "UPI", "COUPON", "CREDIT_NOTE", "WALLET", "CHEQUE", "NEFT"];
const MODE_ICONS: Record<string, string> = {
  CASH: "💵", CARD: "💳", UPI: "📱", COUPON: "🎫", CREDIT_NOTE: "📋", WALLET: "👜", CHEQUE: "🏦", NEFT: "🔁",
};
const MODE_COLORS: Record<string, string> = {
  CASH: "#10b981", CARD: "#3b82f6", UPI: "#a78bfa", COUPON: "#f59e0b", CREDIT_NOTE: "#ec4899", WALLET: "#06b6d4", CHEQUE: "#6b7280", NEFT: "#84cc16",
};
const blank = (): Partial<PaymentMode> => ({ code: "", name: "", mode_type: "CASH", config_json: "{}", sort_order: 99, is_active: 1 });

export default function PaymentModeManager() {
  const [modes, setModes] = useState<PaymentMode[]>([]);
  const [editing, setEditing] = useState<Partial<PaymentMode> | null>(null);
  const [toast, setToast] = useState("");

  const load = () => setModes(paymentModeService.getAll());
  useEffect(() => { if (localDB.isInitialized) load(); }, []);
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const handleSave = async () => {
    if (!editing || !editing.code || !editing.name || !editing.mode_type) return showToast("Required fields missing.");
    try {
      let cfg = editing.config_json ?? "{}";
      try { JSON.parse(cfg); } catch { cfg = "{}"; }
      paymentModeService.save({ ...editing as any, config_json: cfg });
      await localDB.save();
      load();
      setEditing(null);
      showToast("✓ Payment mode saved.");
    } catch (err: any) { showToast(`✗ ${err.message}`); }
  };

  const handleToggle = async (pm: PaymentMode) => {
    paymentModeService.toggle(pm.id, pm.is_active ? 0 : 1);
    await localDB.save();
    load();
  };

  return (
    <div className="pm-mgr">
      {toast && <div className="toast">{toast}</div>}
      <div className="pm-header">
        <div>
          <div className="pm-title">PAYMENT MODE CATALOGUE</div>
          <div className="pm-sub">Tender Types · Denomination · Gateway Config</div>
        </div>
        <button className="add-btn" onClick={() => setEditing(blank())}>＋ ADD MODE</button>
      </div>

      <div className="pm-grid">
        {modes.map(pm => {
          const cfg = (() => { try { return JSON.parse(pm.config_json); } catch { return {}; } })();
          return (
            <div key={pm.id} className={`pm-card ${!pm.is_active ? "inactive" : ""}`} style={{ "--pm-color": MODE_COLORS[pm.mode_type] ?? "#555" } as any}>
              <div className="pm-icon">{MODE_ICONS[pm.mode_type] ?? "💰"}</div>
              <div className="pm-info">
                <div className="pm-name">{pm.name}</div>
                <div className="pm-code">{pm.code}</div>
                <div className="pm-type-badge">{pm.mode_type}</div>
              </div>
              <div className="pm-cfg">
                {cfg.denominations && <span className="cfg-chip">Denominations</span>}
                {cfg.requires_reference && <span className="cfg-chip">Ref. No.</span>}
                {cfg.allow_partial === false && <span className="cfg-chip">No Split</span>}
              </div>
              <div className="pm-footer-row">
                <label className="pm-toggle">
                  <input type="checkbox" checked={!!pm.is_active} onChange={() => handleToggle(pm)} />
                  <span className="pm-toggle-label">{pm.is_active ? "ACTIVE" : "INACTIVE"}</span>
                </label>
                <div className="pm-acts">
                  <button onClick={() => setEditing({ ...pm })}>Edit</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {editing && (
        <div className="edit-overlay" onClick={() => setEditing(null)}>
          <div className="edit-panel" onClick={e => e.stopPropagation()}>
            <div className="ep-title">{editing.id ? "EDIT PAYMENT MODE" : "ADD PAYMENT MODE"}</div>
            <div className="ep-fields">
              <div className="ep-row">
                <div className="ep-field"><label>MODE CODE *</label><input autoFocus value={editing.code ?? ""} onChange={e => setEditing(p => p && ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="CASH" /></div>
                <div className="ep-field"><label>DISPLAY NAME *</label><input value={editing.name ?? ""} onChange={e => setEditing(p => p && ({ ...p, name: e.target.value }))} placeholder="Cash" /></div>
              </div>
              <div className="ep-field"><label>TYPE</label>
                <div className="type-grid">
                  {MODE_TYPES.map(t => (
                    <button key={t} className={`type-btn ${editing.mode_type === t ? "type-active" : ""}`} style={{ "--tc": MODE_COLORS[t] ?? "#555" } as any} onClick={() => setEditing(p => p && ({ ...p, mode_type: t }))}>
                      {MODE_ICONS[t]} {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="ep-field"><label>SORT ORDER</label><input type="number" value={editing.sort_order ?? 99} onChange={e => setEditing(p => p && ({ ...p, sort_order: Number(e.target.value) }))} /></div>
              <div className="ep-field"><label>CONFIG JSON (advanced)</label><textarea className="cfg-ta" value={editing.config_json ?? "{}"} rows={4} onChange={e => setEditing(p => p && ({ ...p, config_json: e.target.value }))} /></div>
              <div className="config-help">
                <div className="ch-title">Common Config Keys:</div>
                <div className="ch-chips">
                  <span onClick={() => setEditing(p => { const c = JSON.parse(p?.config_json || "{}"); return p && ({ ...p, config_json: JSON.stringify({ ...c, denominations: true }, null, 2) }); })}>+ denominations</span>
                  <span onClick={() => setEditing(p => { const c = JSON.parse(p?.config_json || "{}"); return p && ({ ...p, config_json: JSON.stringify({ ...c, requires_reference: true }, null, 2) }); })}>+ requires_reference</span>
                  <span onClick={() => setEditing(p => { const c = JSON.parse(p?.config_json || "{}"); return p && ({ ...p, config_json: JSON.stringify({ ...c, allow_partial: false }, null, 2) }); })}>+ no_split</span>
                </div>
              </div>
            </div>
            <div className="ep-footer">
              <button className="ep-cancel" onClick={() => setEditing(null)}>CANCEL</button>
              <button className="ep-save" onClick={handleSave}>SAVE MODE</button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .pm-mgr { color: #fff; font-family: 'JetBrains Mono', monospace; display: flex; flex-direction: column; gap: 20px; }
        .pm-header { display: flex; align-items: center; justify-content: space-between; }
        .pm-title { font-size: 15px; font-weight: 900; color: #3b82f6; letter-spacing: 2px; }
        .pm-sub { font-size: 10px; color: #555; margin-top: 2px; }
        .add-btn { background: #3b82f6; color: #fff; border: none; padding: 10px 18px; border-radius: 8px; font-weight: 900; font-size: 12px; cursor: pointer; }
        .pm-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 14px; }
        .pm-card { background: #050505; border: 1px solid #111; border-radius: 14px; padding: 18px; display: flex; flex-direction: column; gap: 10px; border-left: 3px solid var(--pm-color, #333); transition: all 0.2s; }
        .pm-card:hover { background: #0a0a0a; border-left-color: var(--pm-color, #555); box-shadow: 0 4px 20px var(--pm-color, #000)22; }
        .pm-card.inactive { opacity: 0.4; filter: grayscale(1); }
        .pm-icon { font-size: 28px; }
        .pm-name { font-size: 15px; font-weight: 800; color: #fff; }
        .pm-code { font-size: 10px; color: var(--pm-color, #555); font-weight: 700; }
        .pm-type-badge { display: inline-block; font-size: 9px; background: #111; color: #555; padding: 2px 7px; border-radius: 4px; margin-top: 2px; }
        .pm-cfg { display: flex; flex-wrap: wrap; gap: 4px; }
        .cfg-chip { font-size: 9px; background: var(--pm-color, #111)22; color: var(--pm-color, #555); border: 1px solid var(--pm-color, #222)44; padding: 2px 7px; border-radius: 4px; }
        .pm-footer-row { display: flex; align-items: center; justify-content: space-between; border-top: 1px solid #111; padding-top: 10px; }
        .pm-toggle { display: flex; align-items: center; gap: 6px; cursor: pointer; }
        .pm-toggle input { accent-color: var(--pm-color, #10b981); }
        .pm-toggle-label { font-size: 10px; color: #555; font-weight: 700; }
        .pm-acts button { background: #111; border: 1px solid #222; color: #aaa; padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 11px; }
        /* Edit */
        .edit-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 100; }
        .edit-panel { background: #0a0a0a; border: 1px solid #222; border-radius: 16px; padding: 28px; width: 560px; max-height: 85vh; overflow-y: auto; display: flex; flex-direction: column; gap: 20px; }
        .ep-title { font-size: 14px; font-weight: 900; color: #3b82f6; letter-spacing: 2px; }
        .ep-fields { display: flex; flex-direction: column; gap: 14px; }
        .ep-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .ep-field { display: flex; flex-direction: column; gap: 5px; }
        .ep-field label { font-size: 9px; color: #555; font-weight: 700; letter-spacing: 1px; }
        .ep-field input { background: #111; border: 1px solid #333; color: #fff; padding: 9px 12px; border-radius: 8px; font-size: 13px; outline: none; font-family: 'JetBrains Mono', monospace; }
        .ep-field input:focus { border-color: #3b82f6; }
        .type-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
        .type-btn { background: #111; border: 1px solid #222; color: #555; padding: 8px 4px; border-radius: 6px; cursor: pointer; font-size: 9px; font-weight: 700; transition: all 0.15s; }
        .type-btn:hover { border-color: var(--tc, #555); color: var(--tc, #fff); }
        .type-btn.type-active { background: var(--tc, #333)22; border-color: var(--tc, #555); color: var(--tc, #fff); }
        .cfg-ta { width: 100%; background: #111; border: 1px solid #333; color: #6ee7b7; padding: 10px 12px; border-radius: 8px; font-size: 11px; outline: none; resize: vertical; font-family: 'JetBrains Mono', monospace; }
        .config-help { background: #050505; border: 1px solid #111; border-radius: 8px; padding: 10px 12px; }
        .ch-title { font-size: 9px; color: #444; margin-bottom: 8px; }
        .ch-chips { display: flex; gap: 6px; flex-wrap: wrap; }
        .ch-chips span { font-size: 10px; color: #3b82f6; cursor: pointer; background: #0c1929; padding: 3px 8px; border-radius: 4px; border: 1px solid #1e3a5f; }
        .ch-chips span:hover { background: #1e3a5f; }
        .ep-footer { display: flex; justify-content: flex-end; gap: 12px; }
        .ep-cancel { background: #111; border: 1px solid #333; color: #666; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 700; }
        .ep-save { background: #3b82f6; color: #fff; border: none; padding: 10px 24px; border-radius: 8px; cursor: pointer; font-weight: 900; }
        .toast { position: fixed; bottom: 32px; right: 32px; background: #0f172a; border: 1px solid #334155; color: #94a3b8; padding: 12px 20px; border-radius: 10px; font-size: 12px; z-index: 999; }
      `}</style>
    </div>
  );
}

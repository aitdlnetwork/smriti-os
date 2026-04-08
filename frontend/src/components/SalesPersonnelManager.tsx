"use client";
import React, { useState, useEffect, useCallback } from "react";
import { localDB } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

interface Salesman {
  id: string;
  salesman_code: string;
  name: string;
  commission_pct: number;
  is_active: number;
}

export default function SalesPersonnelManager() {
  const [salesmen, setSalesmen] = useState<Salesman[]>([]);
  const [viewState, setViewState] = useState<"LIST" | "FORM">("LIST");
  const [form, setForm] = useState<Partial<Salesman>>({
    salesman_code: "", name: "", commission_pct: 0, is_active: 1
  });
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  const loadData = useCallback(() => {
    try {
      const rows = localDB.exec("SELECT * FROM salesman_master ORDER BY salesman_code");
      setSalesmen(rows as unknown as Salesman[]);
    } catch {}
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const showToast = (msg: string, type: "ok" | "err") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = async () => {
    if (!form.salesman_code || !form.name) return showToast("Salesman Code and Name are mandatory.", "err");
    
    try {
        if (form.id) {
            localDB.run(
                "UPDATE salesman_master SET salesman_code=?, name=?, commission_pct=?, is_active=? WHERE id=?",
                [form.salesman_code.toUpperCase(), form.name, Number(form.commission_pct), form.is_active ?? 1, form.id]
            );
        } else {
            localDB.run(
                "INSERT INTO salesman_master (id, salesman_code, name, commission_pct, is_active) VALUES (?,?,?,?,?)",
                [uuidv4(), form.salesman_code.toUpperCase(), form.name, Number(form.commission_pct), form.is_active ?? 1]
            );
        }
        await localDB.save();
        showToast("Salesman saved successfully", "ok");
        loadData();
        setViewState("LIST");
    } catch (e: any) {
        showToast("Error saving Salesman: " + e.message, "err");
    }
  };

  const updateField = (f: keyof Salesman, val: any) => setForm(s => ({ ...s, [f]: val }));

  return (
    <div className="mgr-container">
      {toast && <div className={`mgr-toast ${toast.type === "err" ? "err" : ""}`}>{toast.msg}</div>}
      
      <div className="mgr-header">
        <div>
          <h2>SALES PERSONNEL MASTER</h2>
          <p>Shoper9 Cashier and Sales Staff Directory</p>
        </div>
        <div className="mgr-actions">
          {viewState === "LIST" ? (
             <button className="mgr-btn-primary" onClick={() => { setForm({salesman_code: "", name: "", commission_pct: 0, is_active: 1}); setViewState("FORM"); }}>+ ADD PERSONNEL</button>
          ) : (
             <button className="mgr-btn-secondary" onClick={() => setViewState("LIST")}>← BACK</button>
          )}
        </div>
      </div>

      {viewState === "LIST" && (
        <div className="mgr-table-container">
          <table className="mgr-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Commission %</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {salesmen.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: "center", padding: "20px" }}>No personnel found.</td></tr>
              ) : salesmen.map(s => (
                <tr key={s.id} onClick={() => { setForm(s); setViewState("FORM"); }} style={{ cursor: "pointer" }}>
                  <td style={{ color: "var(--color-primary)", fontWeight: "bold" }}>{s.salesman_code}</td>
                  <td>{s.name}</td>
                  <td>{s.commission_pct}%</td>
                  <td>
                    <span style={{
                      padding: "4px 8px", borderRadius: "4px", fontSize: "10px", fontWeight: "bold",
                      background: s.is_active ? "var(--color-success-tonal)" : "var(--color-danger-tonal)",
                      color: s.is_active ? "var(--color-success)" : "var(--color-danger)"
                    }}>
                      {s.is_active ? "ACTIVE" : "INACTIVE"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {viewState === "FORM" && (
        <div className="mgr-form-scroll">
            <div className="mgr-form-section">
                <h3 className="section-title">Personnel Details</h3>
                <div className="mgr-form-grid">
                    <div className="mgr-field">
                        <label>SALESMAN CODE *</label>
                        <input value={form.salesman_code} onChange={e => updateField("salesman_code", e.target.value)} disabled={!!form.id} placeholder="e.g. EMP001" />
                    </div>
                    <div className="mgr-field mgr-wide">
                        <label>FULL NAME *</label>
                        <input value={form.name} onChange={e => updateField("name", e.target.value)} placeholder="e.g. John Doe" />
                    </div>
                    <div className="mgr-field">
                        <label>COMMISSION PCT (%)</label>
                        <input type="number" step="0.1" value={form.commission_pct} onChange={e => updateField("commission_pct", e.target.value)} />
                    </div>
                </div>
            </div>
            
            <div className="mgr-form-actions" style={{ justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input type="checkbox" id="active-cb" checked={form.is_active === 1} onChange={e => updateField("is_active", e.target.checked ? 1 : 0)} />
                    <label htmlFor="active-cb" style={{ fontSize: "12px", color: "var(--color-text-tertiary)" }}>IS ACTIVE</label>
                </div>
                <button className="mgr-btn-primary" onClick={handleSave}>⬡ COMMIT TO DB (CTRL+S)</button>
            </div>
        </div>
      )}

      {/* Reuse prism styles from SizeManager template */}
      <style jsx>{`
        .mgr-container { display: flex; flex-direction: column; height: 100%; background: var(--color-bg); color: var(--color-text-primary); font-family: var(--font-family); }
        .mgr-header { padding: 20px 24px; border-bottom: 1px solid var(--color-border); display: flex; justify-content: space-between; align-items: center; background: var(--color-surface-2); }
        .mgr-header h2 { font-size: 16px; margin: 0; color: var(--color-primary); font-weight: 800; }
        .mgr-header p { font-size: 12px; margin: 4px 0 0; color: var(--color-text-tertiary); }
        
        .mgr-btn-primary { background: var(--color-primary); color: #fff; border: none; padding: 8px 16px; font-size: 12px; font-weight: 700; border-radius: 6px; cursor: pointer; transition: 0.2s; }
        .mgr-btn-primary:hover { opacity: 0.8; }
        .mgr-btn-secondary { background: transparent; border: 1px solid var(--color-border-strong); color: var(--color-text-primary); padding: 8px 16px; font-size: 12px; font-weight: 700; border-radius: 6px; cursor: pointer; transition: 0.2s; }
        
        .mgr-table-container { flex: 1; overflow: auto; padding: 20px; }
        .mgr-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .mgr-table th { text-align: left; padding: 12px; border-bottom: 2px solid var(--color-border-strong); color: var(--color-text-tertiary); font-weight: 700; }
        .mgr-table td { padding: 12px; border-bottom: 1px solid var(--color-border); }
        .mgr-table tr:hover td { background: var(--color-surface-1); }
        
        .mgr-form-scroll { flex: 1; overflow-y: auto; padding: 20px 24px; display: flex; flex-direction: column; gap: 24px; }
        .mgr-form-section { background: var(--color-surface-1); border: 1px solid var(--color-border); border-radius: 8px; padding: 20px; }
        .section-title { font-size: 13px; font-weight: 700; color: var(--color-text-secondary); margin: 0 0 16px 0; padding-bottom: 8px; border-bottom: 1px dashed var(--color-border-strong); }
        
        .mgr-form-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
        .mgr-wide { grid-column: 1 / -1; }
        
        .mgr-field { display: flex; flex-direction: column; gap: 6px; }
        .mgr-field label { font-size: 11px; color: var(--color-text-tertiary); font-weight: 700; }
        .mgr-field input { background: var(--color-surface-0); border: 1px solid var(--color-border-strong); color: var(--color-text-primary); padding: 10px; border-radius: 6px; font-size: 13px; outline: none; }
        .mgr-field input:focus { border-color: var(--color-primary); }
        .mgr-field input:disabled { opacity: 0.5; cursor: not-allowed; }
        
        .mgr-form-actions { display: flex; align-items: center; padding-top: 16px; border-top: 1px solid var(--color-border); margin-top: 8px; }
        
        .mgr-toast { position: absolute; top: 20px; right: 20px; background: var(--color-success-tonal); color: var(--color-success); padding: 12px 20px; border-radius: 6px; font-size: 13px; font-weight: 700; z-index: 100; border: 1px solid var(--color-success); }
        .mgr-toast.err { background: var(--color-danger-tonal); color: var(--color-danger); border-color: var(--color-danger); }
      `}</style>
    </div>
  );
}

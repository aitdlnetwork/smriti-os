"use client";
import React, { useState, useEffect, useCallback } from "react";
import { localDB } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

interface SalesFactor {
  id: string;
  factor_code: string;
  description: string;
  factor_type: string;
  default_value: number;
}

export default function SalesFactorManager() {
  const [factors, setFactors] = useState<SalesFactor[]>([]);
  const [viewState, setViewState] = useState<"LIST" | "FORM">("LIST");
  const [form, setForm] = useState<Partial<SalesFactor>>({ factor_code: "", description: "", factor_type: "Discount", default_value: 0 });
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  const loadData = useCallback(() => {
    try {
      const rows = localDB.exec("SELECT * FROM sales_factors ORDER BY factor_code");
      setFactors(rows as unknown as SalesFactor[]);
    } catch {}
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const showToast = (msg: string, type: "ok" | "err") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = async () => {
    if (!form.factor_code || !form.description) return showToast("Factor Code and Description are mandatory.", "err");
    try {
        if (form.id) {
            localDB.run(
                "UPDATE sales_factors SET factor_code=?, description=?, factor_type=?, default_value=? WHERE id=?",
                [form.factor_code.toUpperCase(), form.description, form.factor_type || "", Number(form.default_value), form.id]
            );
        } else {
            localDB.run(
                "INSERT INTO sales_factors (id, factor_code, description, factor_type, default_value) VALUES (?,?,?,?,?)",
                [uuidv4(), form.factor_code.toUpperCase(), form.description, form.factor_type || "", Number(form.default_value)]
            );
        }
        await localDB.save();
        showToast("Sales Factor saved successfully", "ok");
        loadData();
        setViewState("LIST");
    } catch (e: any) {
        showToast("Error saving factor: " + e.message, "err");
    }
  };

  const updateField = (f: keyof SalesFactor, val: any) => setForm(s => ({ ...s, [f]: val }));

  return (
    <div className="mgr-container">
      {toast && <div className={`mgr-toast ${toast.type === "err" ? "err" : ""}`}>{toast.msg}</div>}
      
      <div className="mgr-header">
        <div>
          <h2>SALES FACTORS</h2>
          <p>Shoper9 Point Of Sale Discount & Markup Definitions</p>
        </div>
        <div className="mgr-actions">
          {viewState === "LIST" ? (
             <button className="mgr-btn-primary" onClick={() => { setForm({factor_code: "", description: "", factor_type: "Discount", default_value: 0}); setViewState("FORM"); }}>+ ADD SALES FACTOR</button>
          ) : (
             <button className="mgr-btn-secondary" onClick={() => setViewState("LIST")}>← BACK</button>
          )}
        </div>
      </div>

      {viewState === "LIST" && (
        <div className="mgr-table-container">
          <table className="mgr-table">
            <thead>
              <tr><th>Factor Code</th><th>Description</th><th>Type</th><th>Default %</th></tr>
            </thead>
            <tbody>
              {factors.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: "center", padding: "20px" }}>No sales factors found.</td></tr>
              ) : factors.map(f => (
                <tr key={f.id} onClick={() => { setForm(f); setViewState("FORM"); }} style={{ cursor: "pointer" }}>
                  <td style={{ color: "var(--color-primary)", fontWeight: "bold" }}>{f.factor_code}</td>
                  <td>{f.description}</td>
                  <td>{f.factor_type}</td>
                  <td style={{ color: "var(--color-warning)", fontWeight: "bold" }}>{f.default_value}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {viewState === "FORM" && (
        <div className="mgr-form-scroll">
            <div className="mgr-form-section">
                <h3 className="section-title">Sales Factor Configuration</h3>
                <div className="mgr-form-grid">
                    <div className="mgr-field">
                        <label>FACTOR CODE *</label>
                        <input value={form.factor_code} onChange={e => updateField("factor_code", e.target.value)} disabled={!!form.id} placeholder="e.g. FESTIVE_DISC" />
                    </div>
                    <div className="mgr-field mgr-wide">
                        <label>DESCRIPTION *</label>
                        <input value={form.description} onChange={e => updateField("description", e.target.value)} placeholder="Diwali Festival Discount" />
                    </div>
                    <div className="mgr-field">
                        <label>FACTOR TYPE</label>
                        <select value={form.factor_type} onChange={e => updateField("factor_type", e.target.value)}>
                            <option value="Discount">Discount (-)</option>
                            <option value="Surcharge">Surcharge (+)</option>
                        </select>
                    </div>
                    <div className="mgr-field">
                        <label>DEFAULT VALUE (%)</label>
                        <input type="number" step="0.1" value={form.default_value} onChange={e => updateField("default_value", e.target.value)} />
                    </div>
                </div>
            </div>
            <div className="mgr-form-actions" style={{ justifyContent: "flex-end" }}>
                <button className="mgr-btn-primary" onClick={handleSave}>⬡ COMMIT TO DB (CTRL+S)</button>
            </div>
        </div>
      )}

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
        .mgr-field input, .mgr-field select { background: var(--color-surface-0); border: 1px solid var(--color-border-strong); color: var(--color-text-primary); padding: 10px; border-radius: 6px; font-size: 13px; outline: none; }
        .mgr-field input:focus, .mgr-field select:focus { border-color: var(--color-primary); }
        .mgr-field input:disabled { opacity: 0.5; cursor: not-allowed; }
        
        .mgr-form-actions { display: flex; align-items: center; padding-top: 16px; border-top: 1px solid var(--color-border); margin-top: 8px; }
        
        .mgr-toast { position: absolute; top: 20px; right: 20px; background: var(--color-success-tonal); color: var(--color-success); padding: 12px 20px; border-radius: 6px; font-size: 13px; font-weight: 700; z-index: 100; border: 1px solid var(--color-success); }
        .mgr-toast.err { background: var(--color-danger-tonal); color: var(--color-danger); border-color: var(--color-danger); }
      `}</style>
    </div>
  );
}

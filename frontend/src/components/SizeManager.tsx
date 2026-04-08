"use client";
import React, { useState, useEffect, useCallback } from "react";
import { localDB } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

interface SizeGroup {
  id: string;
  group_code: string;
  name: string;
  sizes_json: string;
}

export default function SizeManager() {
  const [groups, setGroups] = useState<SizeGroup[]>([]);
  const [viewState, setViewState] = useState<"LIST" | "FORM">("LIST");
  const [form, setForm] = useState<Partial<SizeGroup>>({
    group_code: "", name: "", sizes_json: '[]'
  });
  const [sizesInput, setSizesInput] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  const loadData = useCallback(() => {
    try {
      const rows = localDB.exec("SELECT * FROM size_master ORDER BY group_code");
      setGroups(rows as unknown as SizeGroup[]);
    } catch {}
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const showToast = (msg: string, type: "ok" | "err") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleEdit = (v: SizeGroup) => {
    setForm(v);
    try {
        const arr = JSON.parse(v.sizes_json);
        setSizesInput(Array.isArray(arr) ? arr.join(", ") : "");
    } catch {
        setSizesInput("");
    }
    setViewState("FORM");
  };

  const handleSave = async () => {
    if (!form.group_code || !form.name) return showToast("Group Code and Name are mandatory.", "err");
    
    // Parse sizes input into JSON array
    const sizesArray = sizesInput.split(",").map(s => s.trim()).filter(Boolean);
    const sizesJson = JSON.stringify(sizesArray);

    try {
        if (form.id) {
            localDB.run(
                "UPDATE size_master SET group_code=?, name=?, sizes_json=? WHERE id=?",
                [form.group_code.toUpperCase(), form.name, sizesJson, form.id]
            );
        } else {
            localDB.run(
                "INSERT INTO size_master (id, group_code, name, sizes_json) VALUES (?,?,?,?)",
                [uuidv4(), form.group_code.toUpperCase(), form.name, sizesJson]
            );
        }
        await localDB.save();
        showToast("Size group saved successfully", "ok");
        loadData();
        setViewState("LIST");
    } catch (e: any) {
        showToast("Error saving size group: " + e.message, "err");
    }
  };

  const updateField = (f: keyof SizeGroup, val: any) => setForm(s => ({ ...s, [f]: val }));

  return (
    <div className="mgr-container">
      {toast && <div className={`mgr-toast ${toast.type === "err" ? "err" : ""}`}>{toast.msg}</div>}
      
      <div className="mgr-header">
        <div>
          <h2>SIZE GROUPS CATALOGUE</h2>
          <p>Shoper9 Sequence Definitions</p>
        </div>
        <div className="mgr-actions">
          {viewState === "LIST" ? (
             <button className="mgr-btn-primary" onClick={() => { setForm({group_code: "", name: ""}); setSizesInput(""); setViewState("FORM"); }}>+ NEW SIZE GROUP</button>
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
                <th>Group Code</th>
                <th>Description</th>
                <th>Size Sequence</th>
              </tr>
            </thead>
            <tbody>
              {groups.length === 0 ? (
                <tr><td colSpan={3} style={{ textAlign: "center", padding: "20px" }}>No size groups found.</td></tr>
              ) : groups.map(g => (
                <tr key={g.id} onClick={() => handleEdit(g)} style={{ cursor: "pointer" }}>
                  <td style={{ color: "var(--color-primary)", fontWeight: "bold" }}>{g.group_code}</td>
                  <td>{g.name}</td>
                  <td style={{ color: "var(--color-text-tertiary)" }}>
                      {(() => {
                          try { return JSON.parse(g.sizes_json).join(" → "); } catch { return g.sizes_json; }
                      })()}
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
                <h3 className="section-title">Size Group Details</h3>
                <div className="mgr-form-grid">
                    <div className="mgr-field">
                        <label>GROUP CODE *</label>
                        <input value={form.group_code} onChange={e => updateField("group_code", e.target.value)} disabled={!!form.id} placeholder="e.g. STD_SHIRTS" />
                    </div>
                    <div className="mgr-field mgr-wide">
                        <label>GROUP NAME *</label>
                        <input value={form.name} onChange={e => updateField("name", e.target.value)} placeholder="Standard Shirt Sizes" />
                    </div>
                    <div className="mgr-field mgr-wide">
                        <label>SIZE SEQUENCE (Comma Separated)</label>
                        <input value={sizesInput} onChange={e => setSizesInput(e.target.value)} placeholder="e.g. S, M, L, XL, XXL" />
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

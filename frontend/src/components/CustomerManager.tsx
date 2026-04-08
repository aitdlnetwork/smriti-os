"use client";
import React, { useState, useEffect, useCallback } from "react";
import { localDB } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

interface Customer {
  id: string;
  customer_code: string;
  name: string;
  phone: string;
  email: string;
  address1: string;
  price_group_id: string;
  loyalty_points: number;
  is_active: number;
}

interface PriceGroup {
  id: string;
  group_code: string;
  name: string;
  discount_pct: number;
}

export default function CustomerManager() {
  const [tab, setTab] = useState<"CUSTOMERS" | "PRICE_GROUPS">("CUSTOMERS");
  
  // -- Customers State --
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cForm, setCForm] = useState<Partial<Customer>>({});
  const [cViewState, setCViewState] = useState<"LIST" | "FORM">("LIST");
  
  // -- Price Groups State --
  const [priceGroups, setPriceGroups] = useState<PriceGroup[]>([]);
  const [pForm, setPForm] = useState<Partial<PriceGroup>>({});
  const [pViewState, setPViewState] = useState<"LIST" | "FORM">("LIST");

  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  const loadData = useCallback(() => {
    try {
      const cRows = localDB.exec("SELECT * FROM customer_master ORDER BY name");
      setCustomers(cRows as unknown as Customer[]);
      
      const pRows = localDB.exec("SELECT * FROM customer_price_groups ORDER BY group_code");
      setPriceGroups(pRows as unknown as PriceGroup[]);
    } catch {}
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const showToast = (msg: string, type: "ok" | "err") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // --- Customer Logic ---
  const handleSaveCustomer = async () => {
    if (!cForm.name) return showToast("Customer Name is mandatory.", "err");
    const code = cForm.customer_code || `CUST-${Date.now().toString().slice(-6)}`;
    try {
        if (cForm.id) {
            localDB.run(
                "UPDATE customer_master SET customer_code=?, name=?, phone=?, email=?, address1=?, price_group_id=?, is_active=? WHERE id=?",
                [code, cForm.name, cForm.phone||"", cForm.email||"", cForm.address1||"", cForm.price_group_id||"", cForm.is_active??1, cForm.id]
            );
        } else {
            localDB.run(
                "INSERT INTO customer_master (id, customer_code, name, phone, email, address1, price_group_id, loyalty_points, is_active) VALUES (?,?,?,?,?,?,?,?,?)",
                [uuidv4(), code, cForm.name, cForm.phone||"", cForm.email||"", cForm.address1||"", cForm.price_group_id||"", 0, cForm.is_active??1]
            );
        }
        await localDB.save();
        showToast("Customer saved.", "ok");
        loadData();
        setCViewState("LIST");
    } catch (e: any) { showToast("Error: " + e.message, "err"); }
  };

  // --- Price Group Logic ---
  const handleSavePriceGroup = async () => {
    if (!pForm.group_code || !pForm.name) return showToast("Group Code and Name are mandatory.", "err");
    try {
        if (pForm.id) {
            localDB.run(
                "UPDATE customer_price_groups SET group_code=?, name=?, discount_pct=? WHERE id=?",
                [pForm.group_code.toUpperCase(), pForm.name, Number(pForm.discount_pct||0), pForm.id]
            );
        } else {
            localDB.run(
                "INSERT INTO customer_price_groups (id, group_code, name, discount_pct) VALUES (?,?,?,?)",
                [uuidv4(), pForm.group_code.toUpperCase(), pForm.name, Number(pForm.discount_pct||0)]
            );
        }
        await localDB.save();
        showToast("Price Group saved.", "ok");
        loadData();
        setPViewState("LIST");
    } catch (e: any) { showToast("Error: " + e.message, "err"); }
  };

  return (
    <div className="mgr-container">
      {toast && <div className={`mgr-toast ${toast.type === "err" ? "err" : ""}`}>{toast.msg}</div>}
      
      <div className="mgr-header">
        <div>
          <h2>CUSTOMER CATALOGUE</h2>
          <p>Shoper9 Loyalty & Pricing Groups Setup</p>
        </div>
        <div style={{ display: "flex", gap: 8, background: "var(--color-surface-1)", padding: 4, borderRadius: 8 }}>
            <button className={`tab-btn ${tab === "CUSTOMERS" ? "active" : ""}`} onClick={() => setTab("CUSTOMERS")}>Customers</button>
            <button className={`tab-btn ${tab === "PRICE_GROUPS" ? "active" : ""}`} onClick={() => setTab("PRICE_GROUPS")}>Price Groups</button>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {tab === "CUSTOMERS" && (
            <>
                <div style={{ padding: "12px 24px", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "flex-end", background: "var(--color-surface-0)" }}>
                    {cViewState === "LIST" ? (
                        <button className="mgr-btn-primary" onClick={() => { setCForm({ is_active: 1 }); setCViewState("FORM"); }}>+ ADD CUSTOMER</button>
                    ) : (
                        <button className="mgr-btn-secondary" onClick={() => setCViewState("LIST")}>← BACK TO LIST</button>
                    )}
                </div>
                {cViewState === "LIST" ? (
                    <div className="mgr-table-container">
                        <table className="mgr-table">
                            <thead>
                                <tr><th>Code</th><th>Name</th><th>Phone</th><th>Price Group</th><th>Points</th></tr>
                            </thead>
                            <tbody>
                                {customers.length === 0 ? <tr><td colSpan={5} style={{textAlign:"center", padding:20}}>No customers.</td></tr> : customers.map(c => (
                                    <tr key={c.id} onClick={() => { setCForm(c); setCViewState("FORM"); }} style={{cursor:"pointer"}}>
                                        <td style={{color:"var(--color-primary)", fontWeight:700}}>{c.customer_code}</td>
                                        <td>{c.name}</td>
                                        <td>{c.phone || "—"}</td>
                                        <td>{priceGroups.find(p=>p.id === c.price_group_id)?.name || "Default"}</td>
                                        <td style={{color:"var(--color-warning)", fontWeight:700}}>{c.loyalty_points}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="mgr-form-scroll">
                        <div className="mgr-form-section">
                            <h3 className="section-title">Customer Details</h3>
                            <div className="mgr-form-grid">
                                <div className="mgr-field mgr-wide"><label>FULL NAME *</label><input autoFocus value={cForm.name||""} onChange={e=>setCForm(s=>({...s, name:e.target.value}))}/></div>
                                <div className="mgr-field"><label>MOBILE NUMBER</label><input value={cForm.phone||""} onChange={e=>setCForm(s=>({...s, phone:e.target.value}))}/></div>
                                <div className="mgr-field"><label>EMAIL</label><input value={cForm.email||""} onChange={e=>setCForm(s=>({...s, email:e.target.value}))}/></div>
                                <div className="mgr-field mgr-wide"><label>ADDRESS</label><input value={cForm.address1||""} onChange={e=>setCForm(s=>({...s, address1:e.target.value}))}/></div>
                                <div className="mgr-field">
                                    <label>CUSTOMER PRICE GROUP</label>
                                    <select value={cForm.price_group_id||""} onChange={e=>setCForm(s=>({...s, price_group_id:e.target.value}))} style={{background:"var(--color-surface-0)", border:"1px solid var(--color-border-strong)", color:"var(--color-text-primary)", padding:10, borderRadius:6, fontSize:13}}>
                                        <option value="">Default Retail (0%)</option>
                                        {priceGroups.map(p => <option key={p.id} value={p.id}>{p.name} (-{p.discount_pct}%)</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="mgr-form-actions" style={{justifyContent:"space-between"}}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <input type="checkbox" checked={cForm.is_active === 1} onChange={e => setCForm(s=>({...s, is_active: e.target.checked ? 1 : 0}))} />
                                <label style={{ fontSize: "12px", color: "var(--color-text-tertiary)" }}>IS ACTIVE</label>
                            </div>
                            <button className="mgr-btn-primary" onClick={handleSaveCustomer}>⬡ COMMIT TO DB (CTRL+S)</button>
                        </div>
                    </div>
                )}
            </>
        )}

        {tab === "PRICE_GROUPS" && (
            <>
                <div style={{ padding: "12px 24px", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "flex-end", background: "var(--color-surface-0)" }}>
                    {pViewState === "LIST" ? (
                        <button className="mgr-btn-primary" onClick={() => { setPForm({ discount_pct: 0 }); setPViewState("FORM"); }}>+ ADD PRICE GROUP</button>
                    ) : (
                        <button className="mgr-btn-secondary" onClick={() => setPViewState("LIST")}>← BACK TO LIST</button>
                    )}
                </div>
                {pViewState === "LIST" ? (
                    <div className="mgr-table-container">
                        <table className="mgr-table">
                            <thead><tr><th>Code</th><th>Name</th><th>Discount %</th></tr></thead>
                            <tbody>
                                {priceGroups.length===0 ? <tr><td colSpan={3} style={{textAlign:"center", padding:20}}>No price groups.</td></tr> : priceGroups.map(p => (
                                    <tr key={p.id} onClick={() => { setPForm(p); setPViewState("FORM"); }} style={{cursor:"pointer"}}>
                                        <td style={{color:"var(--color-primary)", fontWeight:700}}>{p.group_code}</td>
                                        <td>{p.name}</td>
                                        <td style={{color:"var(--color-success)", fontWeight:700}}>{p.discount_pct}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="mgr-form-scroll">
                        <div className="mgr-form-section">
                            <h3 className="section-title">Price Group Definition</h3>
                            <div className="mgr-form-grid">
                                <div className="mgr-field"><label>GROUP CODE *</label><input value={pForm.group_code||""} onChange={e=>setPForm(s=>({...s, group_code:e.target.value}))}/></div>
                                <div className="mgr-field mgr-wide"><label>LABEL / NAME *</label><input value={pForm.name||""} onChange={e=>setPForm(s=>({...s, name:e.target.value}))}/></div>
                                <div className="mgr-field"><label>DISCOUNT PERCENTAGE (%)</label><input type="number" step="0.1" value={pForm.discount_pct||0} onChange={e=>setPForm(s=>({...s, discount_pct:Number(e.target.value)}))}/></div>
                            </div>
                        </div>
                        <div className="mgr-form-actions" style={{justifyContent:"flex-end"}}>
                            <button className="mgr-btn-primary" onClick={handleSavePriceGroup}>⬡ COMMIT TO DB (CTRL+S)</button>
                        </div>
                    </div>
                )}
            </>
        )}
      </div>

      <style jsx>{`
        .mgr-container { display: flex; flex-direction: column; height: 100%; background: var(--color-bg); color: var(--color-text-primary); font-family: var(--font-family); }
        .mgr-header { padding: 20px 24px; border-bottom: 1px solid var(--color-border); display: flex; justify-content: space-between; align-items: center; background: var(--color-surface-2); }
        .mgr-header h2 { font-size: 16px; margin: 0; color: var(--color-primary); font-weight: 800; }
        .mgr-header p { font-size: 12px; margin: 4px 0 0; color: var(--color-text-tertiary); }
        
        .tab-btn { background: transparent; border: none; color: var(--color-text-tertiary); padding: 6px 12px; border-radius: 6px; font-weight: 700; font-size: 11px; cursor: pointer; transition: 0.2s; }
        .tab-btn:hover { color: var(--color-text-primary); }
        .tab-btn.active { background: var(--color-border); color: var(--color-text-primary); }

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

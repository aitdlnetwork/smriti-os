"use client";
import React, { useState, useEffect, useCallback } from "react";
import vendorService, { VendorRecord } from "@/lib/services/vendorService";
import parameterService from "@/lib/services/parameterService";

export default function VendorMasterManager() {
  const [vendors, setVendors] = useState<VendorRecord[]>([]);
  const [viewState, setViewState] = useState<"LIST" | "FORM">("LIST");
  const [form, setForm] = useState<Partial<VendorRecord>>({
    vendor_id: "", vendor_name: "", vendor_type: "", tin_number: "", cst_number: "",
    partial_supply_allowed: 1, tax_inclusive: 1,
    address1: "", address2: "", city: "", state: "", pincode: "", is_active: 1
  });
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const [labels, setLabels] = useState({
    addr1: "Address Line 1",
    addr2: "Address Line 2",
    addr3: "Address Line 3",
    addr4: "Address Line 4",
    addr5: "Address Line 5"
  });

  useEffect(() => { loadVendors(); }, []);

  const loadVendors = useCallback(() => {
    try { 
      setVendors(vendorService.getAll()); 
      setLabels({
        addr1: parameterService.getParam("Customer", "caption_address1", "Address Line 1"),
        addr2: parameterService.getParam("Customer", "caption_address2", "Address Line 2"),
        addr3: parameterService.getParam("Customer", "caption_address3", "Address Line 3"),
        addr4: parameterService.getParam("Customer", "caption_address4", "Address Line 4"),
        addr5: parameterService.getParam("Customer", "caption_address5", "Address Line 5"),
      });
    } catch {}
  }, []);

  const showToast = (msg: string, type: "ok" | "err") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleEdit = (v: VendorRecord) => {
    setForm(v);
    setViewState("FORM");
  };

  const handleSave = () => {
    if (!form.vendor_id || !form.vendor_name) {
      showToast("Vendor ID and Name are mandatory.", "err");
      return;
    }
    
    // Simulate Shoper9 logic by uppercase vendor_id
    form.vendor_id = form.vendor_id.toUpperCase();
    
    if (form.id) {
      const res = vendorService.update(form.id, form);
      if (res.success) { showToast(res.message, "ok"); loadVendors(); setViewState("LIST"); }
      else showToast(res.message, "err");
    } else {
      const res = vendorService.create(form as VendorRecord);
      if (res.success) { showToast(res.message, "ok"); loadVendors(); setViewState("LIST"); }
      else showToast(res.message, "err");
    }
  };

  const updateField = (f: keyof VendorRecord, val: any) => {
    setForm(s => ({ ...s, [f]: val }));
  };

  return (
    <div className="mgr-container">
      {toast && <div className={`mgr-toast ${toast.type === "err" ? "err" : ""}`}>{toast.msg}</div>}
      
      <div className="mgr-header">
        <div>
          <h2>VENDOR CATALOGUE</h2>
          <p>Shoper9 Sovereign Supplier Database</p>
        </div>
        <div className="mgr-actions">
          {viewState === "LIST" ? (
             <button className="mgr-btn-primary" onClick={() => { setForm({ partial_supply_allowed: 1, tax_inclusive: 1, is_active: 1 }); setViewState("FORM"); }}>+ ADD NEW VENDOR</button>
          ) : (
             <button className="mgr-btn-secondary" onClick={() => setViewState("LIST")}>← BACK TO LIST</button>
          )}
        </div>
      </div>

      {viewState === "LIST" && (
        <div className="mgr-table-container">
          <table className="mgr-table">
            <thead>
              <tr>
                <th>Vendor ID</th>
                <th>Vendor Name</th>
                <th>Vendor Type</th>
                <th>GSTIN / TIN</th>
                <th>City</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {vendors.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: "20px" }}>No vendors found.</td></tr>
              ) : vendors.map(v => (
                <tr key={v.id} onClick={() => handleEdit(v)} style={{ cursor: "pointer" }}>
                  <td style={{ color: "#38bdf8", fontWeight: "bold" }}>{v.vendor_id}</td>
                  <td>{v.vendor_name}</td>
                  <td>{v.vendor_type || "—"}</td>
                  <td>{v.gstin || v.tin_number || "—"}</td>
                  <td>{v.city || "—"}</td>
                  <td>
                    <span className={`mgr-badge ${v.is_active ? "mgr-badge-active" : "mgr-badge-inactive"}`}>
                      {v.is_active ? "ACTIVE" : "INACTIVE"}
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
                <h3 className="section-title">General Details</h3>
                <div className="mgr-form-grid">
                    <div className="mgr-field">
                        <label>VENDOR ID *</label>
                        <input value={form.vendor_id} onChange={e => updateField("vendor_id", e.target.value)} disabled={!!form.id} placeholder="e.g. ADIDAS01" />
                    </div>
                    <div className="mgr-field mgr-wide">
                        <label>VENDOR NAME *</label>
                        <input value={form.vendor_name} onChange={e => updateField("vendor_name", e.target.value)} />
                    </div>
                    <div className="mgr-field">
                        <label>VENDOR TYPE</label>
                        <select value={form.vendor_type || ""} onChange={e => updateField("vendor_type", e.target.value)}>
                            <option value="">--Select--</option>
                            <option value="LOCAL">Local Vendor</option>
                            <option value="DISTRIBUTOR">Distributor</option>
                            <option value="MANUFACTURER">Manufacturer</option>
                        </select>
                    </div>
                    <div className="mgr-field">
                        <label>GSTIN</label>
                        <input value={form.gstin || ""} onChange={e => updateField("gstin", e.target.value)} />
                    </div>
                    <div className="mgr-field">
                        <label>TIN NUMBER</label>
                        <input value={form.tin_number || ""} onChange={e => updateField("tin_number", e.target.value)} />
                    </div>
                </div>
            </div>

            <div className="mgr-form-section">
                <h3 className="section-title">Purchasing Policies (Shoper 9 Flags)</h3>
                <div className="mgr-form-grid">
                    <div className="mgr-field">
                        <label>PARTIAL SUPPLY ALLOWED</label>
                        <select value={form.partial_supply_allowed ?? 1} onChange={e => updateField("partial_supply_allowed", parseInt(e.target.value))}>
                            <option value={1}>Yes - Allow short receipt against PO</option>
                            <option value={0}>No - Exact PO quantity required</option>
                        </select>
                    </div>
                    <div className="mgr-field">
                        <label>GST INCLUSIVE IN COST PRICE</label>
                        <select value={form.tax_inclusive ?? 1} onChange={e => updateField("tax_inclusive", parseInt(e.target.value))}>
                            <option value={1}>1 - Tax Inclusive</option>
                            <option value={0}>0 - Tax Exclusive</option>
                            <option value={2}>2 - Ask during transaction</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="mgr-form-section">
                <h3 className="section-title">Mailing Information</h3>
                <div className="mgr-form-grid">
                    <div className="mgr-field mgr-wide">
                        <label>{labels.addr1}</label>
                        <input value={form.address1 || ""} onChange={e => updateField("address1", e.target.value)} />
                    </div>
                    <div className="mgr-field mgr-wide">
                        <label>{labels.addr2}</label>
                        <input value={form.address2 || ""} onChange={e => updateField("address2", e.target.value)} />
                    </div>
                    <div className="mgr-field">
                        <label>CITY</label>
                        <input value={form.city || ""} onChange={e => updateField("city", e.target.value)} />
                    </div>
                    <div className="mgr-field">
                        <label>STATE</label>
                        <input value={form.state || ""} onChange={e => updateField("state", e.target.value)} />
                    </div>
                    <div className="mgr-field">
                        <label>PINCODE / ZIP</label>
                        <input value={form.pincode || ""} onChange={e => updateField("pincode", e.target.value)} />
                    </div>
                </div>
            </div>
            
            <div className="mgr-form-actions">
                <div className="mgr-field flex-row">
                    <input type="checkbox" id="active-cb" checked={form.is_active === 1} onChange={e => updateField("is_active", e.target.checked ? 1 : 0)} />
                    <label htmlFor="active-cb" style={{ cursor: "pointer", color: "#94a3b8" }}>VENDOR IS ACTIVE</label>
                </div>
                <button className="mgr-btn-primary" onClick={handleSave}>⬡ COMMIT TO DB (CTRL+S)</button>
            </div>
        </div>
      )}

      <style jsx>{`
        .mgr-container { display: flex; flex-direction: column; height: 100%; background: #020617; color: #f8fafc; font-family: 'JetBrains Mono', monospace; position: relative; }
        .mgr-header { padding: 20px 24px; border-bottom: 1px solid #1e293b; display: flex; justify-content: space-between; align-items: center; background: #0b1120; }
        .mgr-header h2 { font-size: 16px; margin: 0; color: #38bdf8; font-weight: 800; letter-spacing: 1px; }
        .mgr-header p { font-size: 11px; margin: 4px 0 0; color: #64748b; }
        
        .mgr-btn-primary { background: #0ea5e9; color: #000; border: none; padding: 8px 16px; font-size: 11px; font-weight: 800; border-radius: 6px; cursor: pointer; transition: 0.2s; box-shadow: 0 0 10px rgba(14,165,233,0.3); }
        .mgr-btn-primary:hover { background: #38bdf8; box-shadow: 0 0 15px rgba(14,165,233,0.5); }
        .mgr-btn-secondary { background: transparent; border: 1px solid #334155; color: #94a3b8; padding: 8px 16px; font-size: 11px; font-weight: 800; border-radius: 6px; cursor: pointer; transition: 0.2s; }
        .mgr-btn-secondary:hover { border-color: #f8fafc; color: #f8fafc; }
        
        .mgr-table-container { flex: 1; overflow: auto; padding: 20px; }
        .mgr-table { width: 100%; border-collapse: collapse; font-size: 12px; }
        .mgr-table th { text-align: left; padding: 12px; border-bottom: 1px solid #334155; color: #94a3b8; font-weight: 700; sticky: top; background: #020617; }
        .mgr-table td { padding: 12px; border-bottom: 1px solid #1e293b; }
        .mgr-table tr:hover td { background: rgba(14,165,233,0.05); }
        
        .mgr-badge { padding: 4px 8px; border-radius: 4px; font-size: 9px; font-weight: 800; }
        .mgr-badge-active { background: #064e3b; color: #34d399; }
        .mgr-badge-inactive { background: #450a0a; color: #f87171; }

        .mgr-form-scroll { flex: 1; overflow-y: auto; padding: 20px 24px; display: flex; flex-direction: column; gap: 24px; }
        .mgr-form-section { background: rgba(15,23,42,0.5); border: 1px solid #1e293b; border-radius: 8px; padding: 20px; }
        .section-title { font-size: 12px; font-weight: 800; color: #94a3b8; margin: 0 0 16px 0; padding-bottom: 8px; border-bottom: 1px dashed #334155; }
        
        .mgr-form-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
        .mgr-wide { grid-column: 1 / -1; }
        
        .mgr-field { display: flex; flex-direction: column; gap: 6px; }
        .mgr-field label { font-size: 10px; color: #64748b; font-weight: 700; letter-spacing: 0.5px; }
        .mgr-field input, .mgr-field select { background: #0f172a; border: 1px solid #334155; color: #f8fafc; padding: 10px; border-radius: 6px; font-size: 12px; outline: none; font-family: inherit; }
        .mgr-field input:focus, .mgr-field select:focus { border-color: #38bdf8; box-shadow: 0 0 0 1px #38bdf8; }
        .mgr-field input:disabled { opacity: 0.5; cursor: not-allowed; }
        .flex-row { flex-direction: row; align-items: center; gap: 8px; }
        
        .mgr-form-actions { display: flex; justify-content: space-between; align-items: center; padding-top: 16px; border-top: 1px solid #1e293b; margin-top: 8px; }
        
        .mgr-toast { position: absolute; top: 20px; right: 20px; background: #064e3b; color: #34d399; padding: 12px 20px; border-radius: 6px; font-size: 12px; font-weight: 700; z-index: 100; border: 1px solid #059669; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
        .mgr-toast.err { background: #450a0a; color: #f87171; border-color: #dc2626;  }
      `}</style>
    </div>
  );
}

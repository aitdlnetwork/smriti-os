/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  S M R I T I - O S   ||   E N T E R P R I S E   E D I T I O N
 *  "ERP Simplified. Run Your Entire Business on Memory, Not Code."
 * ─────────────────────────────────────────────────────────────────────────────
 *  System Architect  : Jawahar R Mallah
 *  Parent Org        : AITDL NETWORK
 *  Copyright         : © 2026 AITDL.com & AITDL.in. All Rights Reserved.
 *  Classification    : PROPRIETARY & CONFIDENTIAL
 *  CONTACT           : aitdlnetwork@outlook.com | jawahar@aitdl.in
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *  Module : SmritiERP — CRM & Sales Personnel Engine
 *  Desc   : Sovereign Backend Database Admin for Staff & Customers
 */

"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSmritiDB } from "@/lib/useSmritiDB";

// ─── Interfaces ──────────────────────────────────────────────────────────────
interface SalesPerson {
  id: string;
  store_id: string;
  code: string;
  name: string;
  type: string;
  contact_details: string; // JSON string
  is_active: number;
  created_at: string;
}

interface ContactDetails {
  address1: string;
  address2: string;
  city: string;
  state: string;
  pinCode: string;
  phone: string;
  email: string;
}

const DEFAULT_CONTACT: ContactDetails = {
  address1: "", address2: "", city: "", state: "", pinCode: "", phone: "", email: ""
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function CRMModule() {
  const { isReady, error, db } = useSmritiDB();
  const [salesPersonnel, setSalesPersonnel] = useState<SalesPerson[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form State
  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState("INTERNAL");
  const [formContact, setFormContact] = useState<ContactDetails>(DEFAULT_CONTACT);
  const [formError, setFormError] = useState("");

  const loadData = async () => {
    if (!isReady) return;
    try {
      const res = db.exec("SELECT * FROM sales_personnel WHERE is_active = 1 ORDER BY code ASC");
      setSalesPersonnel(res as unknown as SalesPerson[]);
    } catch (err: unknown) {
      console.error("Failed to load staff:", err);
    }
  };

  useEffect(() => {
    if (isReady) loadData();
  }, [isReady]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!formCode || !formName) {
      setFormError("Code and Name are mandatory fields.");
      return;
    }

    try {
      const id = crypto.randomUUID(); // generate a UUID v4
      const sql = `
        INSERT INTO sales_personnel (id, store_id, code, name, type, contact_details)
        VALUES (?, 'HQ-01', ?, ?, ?, ?)
      `;
      
      const payloadString = JSON.stringify(formContact);

      db.run(sql, [id, formCode, formName, formType, payloadString]);
      await db.save();

      // Success
      setShowAddForm(false);
      setFormCode("");
      setFormName("");
      setFormType("INTERNAL");
      setFormContact(DEFAULT_CONTACT);
      await loadData();

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("UNIQUE constraint")) {
        setFormError("A salesman with this Code already exists.");
      } else {
        setFormError(`Database error: ${msg}`);
      }
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm("Are you sure you want to deactivate this personnel?")) return;
    try {
      db.run("UPDATE sales_personnel SET is_active = 0 WHERE id = ?", [id]);
      await db.save();
      await loadData();
    } catch (err) {
      console.error(err);
      alert("Failed to deactivate.");
    }
  };

  if (!isReady && !error) {
    return (
      <div className="erp-loading">
        <div className="erp-spinner" />
        <p className="erp-loading-text">Loading CRM Database Module…</p>
      </div>
    );
  }

  return (
    <div className="erp-shell">
      {/* ── TOP BAR ───────────────────────────────────────────────────────── */}
      <header className="erp-topbar">
        <div className="erp-topbar-left">
          <Link href="/erp" className="erp-nav-btn" style={{ marginRight: '16px' }}>
            ← Back
          </Link>
          <span className="erp-logo-icon">🎯</span>
          <span className="erp-logo-text" style={{ marginLeft: '8px' }}>CRM & Loyalty</span>
        </div>
        <div className="erp-topbar-right">
          <div className="erp-status-indicator">
            <span className="erp-status-dot" />
            <span className="erp-status-text">Database Connected</span>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT ──────────────────────────────────────────────────── */}
      <main style={{ padding: "32px", display: "flex", flexDirection: "column", gap: "24px", flex: 1, overflowY: "auto" }}>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <div>
            <h1 className="erp-section-title" style={{ fontSize: "28px", margin: 0 }}>Sales Personnel Master</h1>
            <p className="erp-greeting-sub">Manage retail sales staff, managers, and external agents.</p>
          </div>
          <button 
            className="erp-mod-action-btn" 
            style={{ background: "#ec4899", color: "#fff", padding: "10px 24px" }}
            onClick={() => setShowAddForm(true)}
          >
            + Add Personnel
          </button>
        </div>

        {/* ── DATA GRID ────────────────────────────────────────────────────── */}
        <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: "12px", overflow: "hidden", width: "100%", boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", color: "#e2e8f0" }}>
            <thead style={{ background: "#1f2937", borderBottom: "1px solid #374151" }}>
              <tr>
                <th style={{ padding: "16px", fontWeight: "600" }}>Code</th>
                <th style={{ padding: "16px", fontWeight: "600" }}>Name</th>
                <th style={{ padding: "16px", fontWeight: "600" }}>Type</th>
                <th style={{ padding: "16px", fontWeight: "600" }}>City</th>
                <th style={{ padding: "16px", fontWeight: "600" }}>Phone</th>
                <th style={{ padding: "16px", fontWeight: "600", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {salesPersonnel.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: "32px", textAlign: "center", color: "#9ca3af" }}>
                    No active sales personnel found.
                  </td>
                </tr>
              ) : (
                salesPersonnel.map((person) => {
                  let parsedContact = DEFAULT_CONTACT;
                  try {
                     if (person.contact_details) parsedContact = JSON.parse(person.contact_details);
                  } catch (e) {}

                  return (
                    <tr key={person.id} style={{ borderBottom: "1px solid #374151" }}>
                      <td style={{ padding: "16px", color: "#a78bfa", fontFamily: "monospace" }}>{person.code}</td>
                      <td style={{ padding: "16px", fontWeight: "500" }}>{person.name}</td>
                      <td style={{ padding: "16px" }}>
                        <span style={{ background: "#374151", padding: "4px 8px", borderRadius: "4px", fontSize: "12px" }}>
                          {person.type}
                        </span>
                      </td>
                      <td style={{ padding: "16px", color: "#9ca3af" }}>{parsedContact.city || "—"}</td>
                      <td style={{ padding: "16px", color: "#9ca3af" }}>{parsedContact.phone || "—"}</td>
                      <td style={{ padding: "16px", textAlign: "right" }}>
                        <button 
                          onClick={() => handleDeactivate(person.id)}
                          style={{ background: "transparent", border: "1px solid #ef4444", color: "#ef4444", padding: "6px 12px", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}
                        >
                          Deactivate
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* ── ADD OVERLAY (Shoper-9 Style) ──────────────────────────────────── */}
      {showAddForm && (
        <div className="shp-modal-overlay">
          <div className="shp-modal" style={{ width: "600px", maxWidth: "90vw" }}>
            <div className="shp-modal-title" style={{ display: "flex", justifyContent: "space-between" }}>
              <span>👔 Adding Sales Personnel</span>
              <button 
                onClick={() => setShowAddForm(false)} 
                style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: "20px" }}
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              
              {formError && (
                <div style={{ background: "#ef444420", border: "1px solid #ef4444", color: "#ef4444", padding: "12px", borderRadius: "8px", fontSize: "14px" }}>
                  ⚠️ {formError}
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div className="shp-modal-field">
                  <label>Code <span style={{ color: "red" }}>*</span></label>
                  <input 
                    type="text" 
                    className="shp-modal-input" 
                    value={formCode} 
                    onChange={e => setFormCode(e.target.value.toUpperCase())}
                    placeholder="e.g. SA-01"
                    autoFocus
                  />
                </div>
                
                <div className="shp-modal-field">
                  <label>Personnel Type</label>
                  <select 
                    className="shp-modal-input" 
                    value={formType}
                    onChange={e => setFormType(e.target.value)}
                    style={{ WebkitAppearance: "menulist-button", cursor: "pointer" }}
                  >
                    <option value="INTERNAL">INTERNAL</option>
                    <option value="AGENT">AGENT</option>
                    <option value="STORE_MANAGER">STORE MANAGER</option>
                  </select>
                </div>
              </div>

              <div className="shp-modal-field">
                <label>Name <span style={{ color: "red" }}>*</span></label>
                <input 
                  type="text" 
                  className="shp-modal-input" 
                  value={formName} 
                  onChange={e => setFormName(e.target.value)}
                  placeholder="Full Legal Name"
                />
              </div>

              <div style={{ borderTop: "1px solid #374151", margin: "8px 0" }} />
              <label style={{ color: "#a78bfa", fontSize: "14px", fontWeight: "600", letterSpacing: "1px", textTransform: "uppercase" }}>Common Mailing List</label>

              <div className="shp-modal-field">
                <label>Address 1</label>
                <input 
                  type="text" 
                  className="shp-modal-input" 
                  value={formContact.address1} 
                  onChange={e => setFormContact({...formContact, address1: e.target.value})}
                />
              </div>
              
              <div className="shp-modal-field">
                <label>Address 2</label>
                <input 
                  type="text" 
                  className="shp-modal-input" 
                  value={formContact.address2} 
                  onChange={e => setFormContact({...formContact, address2: e.target.value})}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div className="shp-modal-field">
                  <label>City</label>
                  <input 
                    type="text" 
                    className="shp-modal-input" 
                    value={formContact.city} 
                    onChange={e => setFormContact({...formContact, city: e.target.value})}
                  />
                </div>
                <div className="shp-modal-field">
                  <label>Phone Number</label>
                  <input 
                    type="text" 
                    className="shp-modal-input" 
                    value={formContact.phone} 
                    onChange={e => setFormContact({...formContact, phone: e.target.value})}
                    placeholder="+91..."
                  />
                </div>
              </div>

              <div className="shp-modal-actions" style={{ marginTop: "16px" }}>
                <button type="submit" className="shp-settle-btn" style={{ background: "#22c55e", padding: "12px 24px" }}>
                  Save Personnel
                </button>
                <button type="button" className="shp-modal-cancel" onClick={() => setShowAddForm(false)}>
                  Cancel
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}

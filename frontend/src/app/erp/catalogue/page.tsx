/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  S M R I T I - O S  ||  CATALOGUE HUB
 *  Unified sidebar-driven catalogue management — Option C
 *  All dependent modules in one sovereign workspace
 * ─────────────────────────────────────────────────────────────────────────────
 */
"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSmritiDB } from "@/lib/useSmritiDB";
import { localDB } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import GeneralLookupManager from "@/components/GeneralLookupManager";
import ItemClassificationManager from "@/components/ItemClassificationManager";
import TaxCatalogueManager from "@/components/TaxCatalogueManager";
import PaymentModeManager from "@/components/PaymentModeManager";
import PriceRevisionManager from "@/components/PriceRevisionManager";
import ItemMasterGrid from "@/components/ItemMasterGrid";
import VendorMasterManager from "@/components/VendorMasterManager";
import SystemSetupManager from "@/components/SystemSetupManager";

// ── Module Registry ───────────────────────────────────────────────────────────
interface CatalogueModule {
  id: string; icon: string; label: string; desc: string;
  group: string; color: string; badge?: string;
  component?: React.ReactNode;
}

const GROUPS = [
  { id: "sku", label: "ITEM MASTER" },
  { id: "classification", label: "ITEM SETUP" },
  { id: "pricing", label: "PRICING" },
  { id: "promotions", label: "PROMOTIONS" },
  { id: "masters", label: "MASTERS" },
  { id: "config", label: "SYSTEM CONFIGURATION" }
];

export default function CatalogueHub() {
  const router = useRouter();
  const { db, isReady, error } = useSmritiDB();
  const [activeId, setActiveId] = useState("item-master");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggleGroup = (g: string) => setCollapsed(s => {
    const n = new Set(s);
    n.has(g) ? n.delete(g) : n.add(g);
    return n;
  });

  if (!isReady) return <div className="hub-loading">⬡ Initializing Sovereign Engine…</div>;
  if (error) return <div className="hub-error">Engine Error: {error}</div>;

  const MODULES: CatalogueModule[] = [
    {
      id: "item-master", icon: "🏷️", label: "Item Master", desc: "SKU entry engine", group: "sku", color: "#0ea5e9", badge: "CORE",
      component: <ItemMasterGrid />,
    },
    {
      id: "item-classification", icon: "🏗️", label: "Item Classification", desc: "4-level taxonomy tree", group: "classification", color: "#a78bfa",
      component: <ItemClassificationManager />,
    },
    {
      id: "size-groups", icon: "📐", label: "Size Groups", desc: "Size set definitions", group: "classification", color: "#60a5fa",
      component: <div style={{padding:"20px", color:"#ccc"}}>Size Groups Manager (WIP)</div>,
    },
    {
      id: "general-lookup", icon: "🔍", label: "General Lookup", desc: "Universal attribute registry", group: "masters", color: "#fbbf24",
      component: <GeneralLookupManager />,
    },
    {
      id: "vendor-master", icon: "🏢", label: "Vendor Master", desc: "Supplier directory", group: "masters", color: "#38bdf8", badge: "NEW",
      component: <VendorMasterManager />,
    },
    {
      id: "tax-codes", icon: "🧮", label: "Tax Codes", desc: "GST slabs · HSN mapping", group: "pricing", color: "#10b981",
      component: <TaxCatalogueManager />,
    },
    {
      id: "price-revisions", icon: "💰", label: "Price Revisions", desc: "MRP revision journal", group: "pricing", color: "#fbbf24", badge: "JOURNAL",
      component: <PriceRevisionManager />,
    },
    {
      id: "payment-modes", icon: "💳", label: "Payment Modes", desc: "Tender configuration", group: "masters", color: "#3b82f6",
      component: <PaymentModeManager />,
    },
    {
      id: "sales-promotions", icon: "🎁", label: "Sales Promotions", desc: "Promo engine setup", group: "promotions", color: "#f59e0b",
      component: <div style={{padding:"20px", color:"#ccc"}}>Promotions Engine (WIP)</div>,
    },
    {
      id: "system-setup", icon: "⚙️", label: "System Parameters", desc: "Global sovereign settings", group: "config", color: "#f43f5e", badge: "CORE",
      component: <SystemSetupManager />,
    },
  ];

  const active = MODULES.find(m => m.id === activeId);

  return (
    <div className="hub-shell">
      {/* ── SIDEBAR── */}
      <aside className="hub-sidebar">
        <div className="sidebar-brand">
          <button className="back-btn" onClick={() => router.push("/erp")}>← ERP</button>
          <div className="brand-title">CATALOGUE HUB</div>
        </div>

        <nav className="sidebar-nav">
          {GROUPS.map(group => {
            const groupModules = MODULES.filter(m => m.group === group.id);
            if (!groupModules.length) return null;
            const isCollapsed = collapsed.has(group.id);
            return (
              <div key={group.id} className="nav-group">
                <div className="nav-group-header" onClick={() => toggleGroup(group.id)}>
                  <span className="ngh-label">{group.label}</span>
                  <span className="ngh-toggle">{isCollapsed ? "▸" : "▾"}</span>
                </div>
                {!isCollapsed && groupModules.map(mod => (
                  <button
                    key={mod.id}
                    className={`nav-item ${activeId === mod.id ? "active" : ""}`}
                    style={{ "--mod-color": mod.color } as any}
                    onClick={() => setActiveId(mod.id)}
                  >
                    <span className="ni-icon">{mod.icon}</span>
                    <div className="ni-text">
                      <span className="ni-label">{mod.label}</span>
                      <span className="ni-desc">{mod.desc}</span>
                    </div>
                    {mod.badge && <span className="ni-badge">{mod.badge}</span>}
                  </button>
                ))}
              </div>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="sf-engine">SOVEREIGN ENGINE</div>
          <div className="sf-sub">Memory · Not Code</div>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main className="hub-main">
        <div className="hub-breadcrumb">
          <span className="bc-home">◈ SMRITI ERP</span>
          <span className="bc-sep">›</span>
          <span className="bc-page">{active?.label ?? "—"}</span>
          {active?.badge && <span className="bc-badge" style={{ background: active.color + "22", color: active.color }}>{active.badge}</span>}
        </div>
        <div className="hub-content">
          {active?.component ?? <div className="hub-placeholder">Select a module from the sidebar.</div>}
        </div>
      </main>

      <style jsx>{`
        .hub-shell { display: flex; position: fixed; inset: 0; background: #000; color: #fff; font-family: 'JetBrains Mono', monospace; overflow: hidden; }
        .hub-loading, .hub-error { display: flex; align-items: center; justify-content: center; height: 100vh; font-size: 14px; color: #555; }
        /* SIDEBAR */
        .hub-sidebar { width: 240px; min-width: 240px; background: #020202; border-right: 1px solid #111; display: flex; flex-direction: column; overflow: hidden; }
        .sidebar-brand { padding: 20px 16px 16px; border-bottom: 1px solid #111; }
        .back-btn { background: transparent; border: 1px solid #1a1a1a; color: #444; padding: 5px 10px; border-radius: 6px; cursor: pointer; font-size: 10px; font-family: 'JetBrains Mono', monospace; margin-bottom: 12px; transition: all 0.15s; }
        .back-btn:hover { border-color: #333; color: #888; }
        .brand-title { font-size: 11px; font-weight: 900; color: #fbbf24; letter-spacing: 3px; }
        .sidebar-nav { flex: 1; overflow-y: auto; padding: 8px 8px; display: flex; flex-direction: column; gap: 2px; }
        .nav-group { display: flex; flex-direction: column; gap: 1px; }
        .nav-group-header { display: flex; align-items: center; justify-content: space-between; padding: 10px 8px 4px; cursor: pointer; }
        .ngh-label { font-size: 8px; color: #444; font-weight: 900; letter-spacing: 1.5px; }
        .ngh-toggle { font-size: 10px; color: #333; }
        .nav-item { display: flex; align-items: center; gap: 10px; padding: 9px 10px; border-radius: 8px; background: transparent; border: 1px solid transparent; cursor: pointer; color: #555; transition: all 0.15s; text-align: left; width: 100%; font-family: 'JetBrains Mono', monospace; }
        .nav-item:hover { background: #0a0a0a; border-color: #1a1a1a; color: #aaa; }
        .nav-item.active { background: #0f0f1a; border-color: var(--mod-color, #333); color: var(--mod-color, #fff); }
        .ni-icon { font-size: 16px; }
        .ni-text { display: flex; flex-direction: column; gap: 1px; flex: 1; }
        .ni-label { font-size: 11px; font-weight: 700; color: inherit; }
        .ni-desc { font-size: 8px; color: #444; }
        .nav-item.active .ni-desc { color: var(--mod-color, #555); opacity: 0.6; }
        .ni-badge { font-size: 7px; font-weight: 900; background: var(--mod-color, #333)22; color: var(--mod-color, #555); padding: 2px 5px; border-radius: 3px; }
        .sidebar-footer { padding: 14px 16px; border-top: 1px solid #0a0a0a; }
        .sf-engine { font-size: 9px; color: #222; font-weight: 900; letter-spacing: 2px; }
        .sf-sub { font-size: 8px; color: #1a1a1a; margin-top: 2px; }
        /* MAIN */
        .hub-main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
        .hub-breadcrumb { padding: 12px 24px; border-bottom: 1px solid #0a0a0a; display: flex; align-items: center; gap: 8px; background: #020202; }
        .bc-home { font-size: 10px; color: #333; }
        .bc-sep { font-size: 10px; color: #222; }
        .bc-page { font-size: 12px; font-weight: 700; color: #888; }
        .bc-badge { font-size: 8px; font-weight: 900; padding: 2px 8px; border-radius: 4px; }
        .hub-content { flex: 1; overflow: hidden; padding: 24px; display: flex; flex-direction: column; }
        .hub-placeholder { display: flex; align-items: center; justify-content: center; flex: 1; font-size: 12px; color: #333; }
      `}</style>
    </div>
  );
}

// ── Inline placeholder components ─────────────────────────────────────────────
function SizeGroupsManager() {
  const [groups, setGroups] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [toast, setToast] = useState("");
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(""), 3000); };

  const load = () => {
    const r = localDB.exec(`SELECT * FROM size_groups ORDER BY name ASC`) as any[];
    setGroups(r);
  };
  useEffect(() => { if (localDB.isInitialized) load(); }, []);

  const handleSave = async () => {
    if (!editing?.group_code || !editing?.name) return showToast("Code and Name required.");
    const id = editing.id || uuidv4();
    let sizes: string[] = [];
    try { sizes = (editing.sizes_input ?? editing.sizes_json ?? "[]").split(",").map((s: string) => s.trim()).filter(Boolean); } catch {}
    localDB.run(`INSERT OR REPLACE INTO size_groups (id,group_code,name,sizes_json) VALUES (?,?,?,?)`, [id, editing.group_code.toUpperCase(), editing.name, JSON.stringify(sizes)]);
    await localDB.save();
    load();
    setEditing(null);
    showToast("✓ Size group saved.");
  };

  return (
    <div style={{ color: "#fff", fontFamily: "JetBrains Mono", display: "flex", flexDirection: "column", gap: 16 }}>
      {toast && <div style={{ position: "fixed", bottom: 32, right: 32, background: "#0f172a", border: "1px solid #334155", color: "#94a3b8", padding: "12px 20px", borderRadius: 10, fontSize: 12 }}>{toast}</div>}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 900, color: "#60a5fa", letterSpacing: 2 }}>SIZE GROUPS</div>
          <div style={{ fontSize: 10, color: "#555", marginTop: 2 }}>Define size sets for classification-linked auto-matrix</div>
        </div>
        <button style={{ background: "#60a5fa", color: "#000", border: "none", padding: "10px 18px", borderRadius: 8, fontWeight: 900, cursor: "pointer" }} onClick={() => setEditing({ group_code: "", name: "", sizes_input: "S, M, L, XL" })}>＋ ADD GROUP</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
        {groups.map(sg => {
          let sizes: string[] = [];
          try { sizes = JSON.parse(sg.sizes_json); } catch {}
          return (
            <div key={sg.id} style={{ background: "#050505", border: "1px solid #1a1a1a", borderRadius: 12, padding: 18 }}>
              <div style={{ fontSize: 13, fontWeight: 900, color: "#60a5fa" }}>{sg.group_code}</div>
              <div style={{ fontSize: 11, color: "#aaa", margin: "4px 0 10px" }}>{sg.name}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {sizes.map((s: string) => <span key={s} style={{ fontSize: 10, background: "#0c1e38", color: "#60a5fa", padding: "3px 8px", borderRadius: 4 }}>{s}</span>)}
              </div>
              <button style={{ marginTop: 12, background: "#111", border: "1px solid #222", color: "#666", padding: "5px 12px", borderRadius: 6, cursor: "pointer", fontSize: 11 }} onClick={() => setEditing({ ...sg, sizes_input: sizes.join(", ") })}>Edit</button>
            </div>
          );
        })}
      </div>
      {editing && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }} onClick={() => setEditing(null)}>
          <div style={{ background: "#0a0a0a", border: "1px solid #333", borderRadius: 16, padding: 28, width: 440, display: "flex", flexDirection: "column", gap: 16 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 14, fontWeight: 900, color: "#60a5fa" }}>SIZE GROUP</div>
            {[["GROUP CODE", "group_code"], ["NAME", "name"]].map(([l, k]) => (
              <div key={k} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <label style={{ fontSize: 9, color: "#555", fontWeight: 700 }}>{l}</label>
                <input value={editing[k] ?? ""} onChange={e => setEditing((p: any) => ({ ...p, [k]: e.target.value.toUpperCase() }))} style={{ background: "#111", border: "1px solid #333", color: "#fff", padding: "9px 12px", borderRadius: 8, fontSize: 13, outline: "none", fontFamily: "JetBrains Mono" }} />
              </div>
            ))}
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 9, color: "#555", fontWeight: 700 }}>SIZES (comma-separated)</label>
              <input value={editing.sizes_input ?? ""} onChange={e => setEditing((p: any) => ({ ...p, sizes_input: e.target.value }))} placeholder="S, M, L, XL, XXL" style={{ background: "#111", border: "1px solid #333", color: "#60a5fa", padding: "9px 12px", borderRadius: 8, fontSize: 13, outline: "none", fontFamily: "JetBrains Mono" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button style={{ background: "#111", border: "1px solid #333", color: "#666", padding: "10px 20px", borderRadius: 8, cursor: "pointer" }} onClick={() => setEditing(null)}>CANCEL</button>
              <button style={{ background: "#60a5fa", color: "#000", border: "none", padding: "10px 24px", borderRadius: 8, fontWeight: 900, cursor: "pointer" }} onClick={handleSave}>SAVE</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PromotionPlaceholder() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 16, color: "#333", fontFamily: "JetBrains Mono" }}>
      <div style={{ fontSize: 36 }}>🎁</div>
      <div style={{ fontSize: 16, fontWeight: 900, color: "#f59e0b" }}>SALES PROMOTIONS</div>
      <div style={{ fontSize: 12, color: "#444", textAlign: "center", lineHeight: 2 }}>
        Promotion engine includes:<br />
        Item Discount · Bill Discount · BOGO · Bundle · Fixed Price<br />
        Date Range · Classification Filter · Priority Rules<br />
      </div>
      <div style={{ fontSize: 10, color: "#222", border: "1px solid #1a1a1a", borderRadius: 8, padding: "10px 20px" }}>PHASE 2 — Available in next release</div>
    </div>
  );
}

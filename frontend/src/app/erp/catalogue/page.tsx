/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  S M R I T I - O S  ||  CATALOGUE HUB
 *  Prism Design System Edition
 *  Unified sidebar-driven catalogue management — All modules in one workspace
 * ─────────────────────────────────────────────────────────────────────────────
 *  System Architect  : Jawahar R Mallah
 *  Parent Org        : AITDL NETWORK
 *  Copyright         : © 2026 AITDL.com & AITDL.in. All Rights Reserved.
 * ─────────────────────────────────────────────────────────────────────────────
 */
"use client";
import React, { useState } from "react";
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
import SizeManager from "@/components/SizeManager";
import SalesPersonnelManager from "@/components/SalesPersonnelManager";
import CustomerManager from "@/components/CustomerManager";
import ChainStoreManager from "@/components/ChainStoreManager";
import SalesFactorManager from "@/components/SalesFactorManager";
import { Spinner, StatusBadge } from "@/components/ui";
import { ChevronDown, ChevronRight, ArrowLeft, Layers } from "lucide-react";

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
  { id: "config", label: "SYSTEM CONFIG" },
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

  if (!isReady) {
    return (
      <div style={{
        minHeight: "100vh", background: "var(--color-bg)",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexDirection: "column", gap: 16, color: "var(--color-text-tertiary)",
        fontFamily: "var(--font-family)",
      }}>
        <Spinner size={32} color="var(--color-primary)" />
        <p style={{ fontSize: "var(--font-size-md)", margin: 0 }}>Initializing Sovereign Engine…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        minHeight: "100vh", background: "var(--color-bg)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "var(--font-family)",
      }}>
        <p style={{ color: "var(--color-danger)", fontSize: "var(--font-size-lg)", fontWeight: 700 }}>Engine Error: {error}</p>
      </div>
    );
  }

  const MODULES: CatalogueModule[] = [
    { id: "item-master", icon: "🏷️", label: "Item Master", desc: "SKU entry engine", group: "sku", color: "var(--color-info)", badge: "CORE", component: <ItemMasterGrid /> },
    { id: "item-classification", icon: "🏗️", label: "Item Classification", desc: "4-level taxonomy", group: "classification", color: "var(--color-secondary)", component: <ItemClassificationManager /> },
    { id: "size-groups", icon: "📐", label: "Size Groups", desc: "Size set definitions", group: "classification", color: "var(--color-primary)", component: <SizeManager /> },
    { id: "general-lookup", icon: "🔍", label: "General Lookup", desc: "Universal attribute registry", group: "masters", color: "var(--color-warning)", component: <GeneralLookupManager /> },
    { id: "vendor-master", icon: "🏢", label: "Vendor Master", desc: "Supplier directory", group: "masters", color: "var(--color-info)", component: <VendorMasterManager /> },
    { id: "customer-master", icon: "👥", label: "Customer Catalogue", desc: "B2B & Loyalty DB", group: "masters", color: "var(--color-success)", badge: "NEW", component: <CustomerManager /> },
    { id: "sales-personnel", icon: "👔", label: "Sales Personnel", desc: "Store Staff & Cashiers", group: "masters", color: "var(--color-secondary)", badge: "NEW", component: <SalesPersonnelManager /> },
    { id: "chain-stores", icon: "🏪", label: "HO Chain Stores", desc: "Multi-node configuration", group: "masters", color: "var(--color-danger)", component: <ChainStoreManager /> },
    { id: "tax-codes", icon: "🧮", label: "Tax Codes", desc: "GST slabs · HSN mapping", group: "pricing", color: "var(--color-success)", component: <TaxCatalogueManager /> },
    { id: "sales-factors", icon: "📊", label: "Sales Factors", desc: "Discounts & Markups", group: "pricing", color: "var(--color-info)", badge: "NEW", component: <SalesFactorManager /> },
    { id: "price-revisions", icon: "💰", label: "Price Revisions", desc: "MRP revision journal", group: "pricing", color: "var(--color-warning)", badge: "JOURNAL", component: <PriceRevisionManager /> },
    { id: "payment-modes", icon: "💳", label: "Payment Modes", desc: "Tender configuration", group: "masters", color: "var(--color-primary)", component: <PaymentModeManager /> },
    { id: "sales-promotions", icon: "🎁", label: "Sales Promotions", desc: "Promo engine setup", group: "promotions", color: "var(--color-warning)", component: <div style={{ padding: 20, color: "var(--color-text-tertiary)" }}>Promotions Engine (Coming Soon)</div> },
    { id: "system-setup", icon: "⚙️", label: "System Parameters", desc: "Global sovereign settings", group: "config", color: "var(--color-danger)", badge: "CORE", component: <SystemSetupManager /> },
  ];

  const active = MODULES.find(m => m.id === activeId);

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "var(--color-bg)",
      color: "var(--color-text-primary)",
      fontFamily: "var(--font-family)",
      display: "flex",
      overflow: "hidden",
    }}>
      {/* ─────────────────────────────────────────────────────────
          SIDEBAR
      ───────────────────────────────────────────────────────── */}
      <aside style={{
        width: 232, minWidth: 232,
        background: "var(--color-surface-0)",
        borderRight: "1px solid var(--color-border)",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        {/* Sidebar Brand */}
        <div style={{
          padding: "16px 14px 14px",
          borderBottom: "1px solid var(--color-border)",
        }}>
          <button
            onClick={() => router.push("/erp")}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "transparent", border: "1px solid var(--color-border-strong)",
              color: "var(--color-text-tertiary)", padding: "5px 10px",
              borderRadius: "var(--radius-sm)", cursor: "pointer",
              fontSize: "var(--font-size-xs)", fontFamily: "var(--font-family)",
              fontWeight: 600, marginBottom: 12,
              transition: "var(--transition)",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "var(--color-text-primary)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--color-border-strong)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "var(--color-text-tertiary)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--color-border)"; }}
          >
            <ArrowLeft size={12} />
            ERP
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Layers size={14} color="var(--color-primary)" />
            <span style={{ fontSize: "var(--font-size-xs)", fontWeight: 900, color: "var(--color-text-secondary)", letterSpacing: "2px", textTransform: "uppercase" }}>Catalogue Hub</span>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: "auto", padding: "8px 8px", display: "flex", flexDirection: "column", gap: 1 }}>
          {GROUPS.map(group => {
            const groupModules = MODULES.filter(m => m.group === group.id);
            if (!groupModules.length) return null;
            const isCollapsed = collapsed.has(group.id);
            return (
              <div key={group.id}>
                <button
                  onClick={() => toggleGroup(group.id)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "8px 8px 4px",
                    background: "transparent", border: "none", cursor: "pointer",
                    color: "var(--color-text-disabled)",
                  }}
                >
                  <span style={{ fontSize: "var(--font-size-xs)", fontWeight: 900, letterSpacing: "1.5px", textTransform: "uppercase" }}>{group.label}</span>
                  {isCollapsed ? <ChevronRight size={10} /> : <ChevronDown size={10} />}
                </button>
                {!isCollapsed && groupModules.map(mod => {
                  const isActive = activeId === mod.id;
                  return (
                    <button
                      key={mod.id}
                      onClick={() => setActiveId(mod.id)}
                      style={{
                        width: "100%", display: "flex", alignItems: "center", gap: 10,
                        padding: "8px 10px", borderRadius: "var(--radius-sm)",
                        background: isActive ? "var(--color-surface-2)" : "transparent",
                        border: `1px solid ${isActive ? "var(--color-border-strong)" : "transparent"}`,
                        cursor: "pointer", textAlign: "left",
                        fontFamily: "var(--font-family)", marginBottom: 1,
                        transition: "var(--transition)",
                      }}
                      onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = "var(--color-surface-1)"; }}
                      onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                    >
                      <span style={{ fontSize: 15, flexShrink: 0 }}>{mod.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: "var(--font-size-sm)", fontWeight: isActive ? 700 : 500,
                          color: isActive ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                        }}>{mod.label}</div>
                        <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-disabled)", marginTop: 1 }}>{mod.desc}</div>
                      </div>
                      {mod.badge && (
                        <span style={{
                          fontSize: "9px", fontWeight: 900, letterSpacing: "0.5px",
                          background: "var(--color-surface-3)",
                          color: "var(--color-text-tertiary)",
                          padding: "2px 6px", borderRadius: "var(--radius-pill)",
                          whiteSpace: "nowrap",
                        }}>{mod.badge}</span>
                      )}
                      {isActive && (
                        <div style={{
                          position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)",
                          width: 3, height: "60%", borderRadius: "0 2px 2px 0",
                          background: "var(--color-primary)",
                        }} />
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div style={{
          padding: "12px 14px", borderTop: "1px solid var(--color-border)",
          display: "flex", flexDirection: "column", gap: 2,
        }}>
          <div style={{ fontSize: "var(--font-size-xs)", fontWeight: 800, color: "var(--color-text-disabled)", letterSpacing: "1.5px", textTransform: "uppercase" }}>SOVEREIGN ENGINE</div>
          <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-disabled)", opacity: 0.5 }}>Memory · Not Code</div>
        </div>
      </aside>

      {/* ─────────────────────────────────────────────────────────
          MAIN CONTENT
      ───────────────────────────────────────────────────────── */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Breadcrumb topbar */}
        <div style={{
          padding: "0 20px",
          height: "var(--topbar-height)",
          borderBottom: "1px solid var(--color-border)",
          background: "rgba(5,7,15,0.85)", backdropFilter: "blur(16px)",
          display: "flex", alignItems: "center", gap: 10, flexShrink: 0,
        }}>
          <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-disabled)" }}>◈ SMRITI ERP</span>
          <ChevronRight size={10} color="var(--color-text-disabled)" />
          <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-disabled)" }}>Catalogue Hub</span>
          <ChevronRight size={10} color="var(--color-text-disabled)" />
          <span style={{ fontSize: "var(--font-size-sm)", fontWeight: 600, color: "var(--color-text-primary)" }}>{active?.label ?? "—"}</span>
          {active?.badge && <StatusBadge label={active.badge} type={active.badge === "CORE" ? "primary" : active.badge === "NEW" ? "success" : "warning"} />}
        </div>

        {/* Module content */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {active?.component ?? (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              flex: 1, color: "var(--color-text-tertiary)", fontSize: "var(--font-size-md)",
            }}>
              Select a module from the sidebar.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

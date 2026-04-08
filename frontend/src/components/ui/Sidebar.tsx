/**
 * SMRITI-OS · Prism Design System
 * Universal Sidebar — Persistent navigation with Acrylic (Glassmorphism) support.
 * Config-driven items with dynamic active state tracking.
 */
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Package, Tag, Layers, Users, RefreshCw, 
  BarChart2, Search, Settings, ChevronLeft, ChevronRight, 
  LogOut, Zap, Shield, Database, Activity
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface NavItem {
  id: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  href: string;
  shortcut?: string;
  badge?: string;
  soon?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard",   icon: LayoutDashboard, label: "Dashboard",   href: "/erp" },
  { id: "procurement", icon: Package,         label: "Procurement", href: "/erp/procurement", shortcut: "G" },
  { id: "item-master", icon: Tag,             label: "Item Master", href: "/erp/item-master", shortcut: "I" },
  { id: "catalogue",   icon: Layers,          label: "Catalogue",   href: "/erp/catalogue",   shortcut: "L" },
  { id: "crm",         icon: Users,           label: "CRM & Loyalty", href: "/erp/crm",       soon: true },
  { id: "tally",       icon: RefreshCw,       label: "Tally Bridge", href: "/erp/tally" },
  { id: "stock",       icon: Search,          label: "Stock Take",  href: "/erp/inventory/stock-take" },
  { id: "reports",     icon: BarChart2,       label: "Sentinel BI",  href: "/erp/reports" },
  { id: "settings",    icon: Settings,        label: "Settings",    href: "/erp/settings" },
];

// ─── Sidebar Component ────────────────────────────────────────────────────────
export default function Sidebar({ collapsed: defaultCollapsed = false }: { collapsed?: boolean }) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return null;

  return (
    <aside style={{
      width: collapsed ? 72 : 260,
      height: "100vh",
      background: "var(--color-surface-1)",
      backdropFilter: "blur(20px)",
      borderRight: "1px solid var(--color-border)",
      display: "flex",
      flexDirection: "column",
      transition: "width var(--motion-duration) var(--motion-ease)",
      position: "relative",
      zIndex: 100,
      flexShrink: 0,
    }}>
      {/* ── Logo Section ── */}
      <div style={{ height: 64, display: "flex", alignItems: "center", padding: "0 24px", gap: 12, borderBottom: "1px solid var(--color-border-subtle)" }}>
        <div style={{
          width: 32, height: 32, borderRadius: "var(--radius-sm)",
          background: "linear-gradient(135deg, var(--color-primary), var(--color-secondary))",
          display: "flex", alignItems: "center", justifyContent: "center", color: "#fff",
          boxShadow: "0 0 15px var(--color-primary-tonal)",
        }}>
          <Zap size={18} fill="currentColor" />
        </div>
        {!collapsed && (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: "var(--color-text-primary)", letterSpacing: "-0.5px" }}>SMRITI-OS</span>
            <span style={{ fontSize: 9, fontWeight: 700, color: "var(--color-primary)", textTransform: "uppercase", letterSpacing: "1px", marginTop: -2 }}>Enterprise v2</span>
          </div>
        )}
      </div>

      {/* ── Nav Items ── */}
      <nav style={{ flex: 1, padding: "16px 12px", display: "flex", flexDirection: "column", gap: 4, overflowY: "auto", overflowX: "hidden" }}>
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || (item.href !== "/erp" && pathname?.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link key={item.id} href={item.soon ? "#" : item.href} style={{ textDecoration: "none" }}>
              <div 
                className={active ? "active-prism-nav" : ""}
                style={{
                  display: "flex", alignItems: "center", gap: 12, padding: collapsed ? "10px" : "10px 14px",
                  borderRadius: "var(--radius-md)", cursor: item.soon ? "default" : "pointer",
                  background: active ? "var(--color-primary-tonal)" : "transparent",
                  color: active ? "var(--color-primary)" : "var(--color-text-tertiary)",
                  transition: "var(--transition)",
                  position: "relative",
                  justifyContent: collapsed ? "center" : "flex-start",
                  opacity: item.soon ? 0.4 : 1,
                }}
                onMouseEnter={e => !active && (e.currentTarget.style.background = "var(--color-surface-2)")}
                onMouseLeave={e => !active && (e.currentTarget.style.background = "transparent")}
              >
                <Icon size={18} style={{ flexShrink: 0 }} />
                {!collapsed && (
                  <span style={{ fontSize: 14, fontWeight: active ? 600 : 500, whiteSpace: "nowrap" }}>{item.label}</span>
                )}
                {!collapsed && item.soon && (
                  <span style={{ marginLeft: "auto", fontSize: 9, background: "var(--color-surface-3)", color: "var(--color-text-tertiary)", padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>SOON</span>
                )}
                {active && !collapsed && (
                   <div style={{ position: "absolute", right: 0, top: "20%", bottom: "20%", width: 3, background: "var(--color-primary)", borderRadius: "3px 0 0 3px" }} />
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* ── Profile/Bottom Section ── */}
      <div style={{ borderTop: "1px solid var(--color-border-subtle)", padding: "16px 12px", display: "flex", flexDirection: "column", gap: 12 }}>
        {!collapsed && (
          <div style={{ background: "var(--color-surface-2)", borderRadius: "var(--radius-md)", padding: 12, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--color-surface-3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "var(--color-primary)" }}>A</div>
            <div style={{ flex: 1, overflow: "hidden" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>System Administrator</div>
              <div style={{ fontSize: 10, color: "var(--color-text-tertiary)", display: "flex", alignItems: "center", gap: 4 }}>
                <Activity size={8} color="var(--color-success)" /> Online
              </div>
            </div>
          </div>
        )}
        <button onClick={() => setCollapsed(!collapsed)} style={{
          width: "100%", padding: "10px", borderRadius: "var(--radius-md)", border: "none", background: "transparent",
          color: "var(--color-text-tertiary)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          gap: 10, transition: "var(--transition)",
        }} onMouseEnter={e => (e.currentTarget.style.background = "var(--color-surface-2)")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
          {collapsed ? <ChevronRight size={16} /> : <><ChevronLeft size={16} /> <span style={{ fontSize: 12, fontWeight: 600 }}>Collapse View</span></>}
        </button>
      </div>

      <style>{`
        .active-prism-nav::after {
          content: "";
          position: absolute;
          inset: 0;
          border: 1px solid var(--color-primary-tonal);
          border-radius: var(--radius-md);
          pointer-events: none;
        }
      `}</style>
    </aside>
  );
}

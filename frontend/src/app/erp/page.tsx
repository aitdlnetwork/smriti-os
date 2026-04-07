/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  S M R I T I - O S   ||   E N T E R P R I S E   E D I T I O N
 *  "ERP Simplified. Run Your Entire Business on Memory, Not Code."
 * ─────────────────────────────────────────────────────────────────────────────
 *  System Architect  : Jawahar R Mallah
 *  Parent Org        : AITDL NETWORK
 *  Copyright         : © 2026 AITDL.com & AITDL.in. All Rights Reserved.
 * ─────────────────────────────────────────────────────────────────────────────
 */

"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSmritiDB } from "@/lib/useSmritiDB";
import StyleCatalogue from "@/components/StyleCatalogue";
import GeneralLookupManager from "@/components/GeneralLookupManager";
import ItemMasterGrid from "@/components/ItemMasterGrid";
import StockAudit from "@/components/StockAudit";
import DynamicGrid from "@/components/DynamicGrid";
import {
  Package, Tag, FolderOpen, Users, RefreshCw, Search,
  BarChart2, ShoppingCart, ChevronRight, Clock, Cpu,
  Zap, Shield, Settings, LogOut, Menu, X, Activity,
  TrendingUp, Database, Bell, Palette, Sparkles,
  ArrowUpRight, LayoutDashboard, Layers,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ModuleCard {
  id: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  description: string;
  color: string;
  glow: string;
  badge?: string;
  href?: string;
  action?: () => void;
  comingSoon?: boolean;
}

interface QuickAction {
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  action: () => void;
  color: string;
}

interface LiveStat {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  color: string;
  glow: string;
}

// ─── Sidebar Nav Item ─────────────────────────────────────────────────────────
function SideNavItem({
  icon, label, shortcut, active, onClick, badge, soon,
}: {
  icon: React.ReactNode; label: string; shortcut?: string;
  active?: boolean; onClick: () => void; badge?: string; soon?: boolean;
}) {
  return (
    <button
      className={`p2-nav-item${active ? " p2-nav-item--active" : ""}`}
      onClick={onClick}
    >
      <span className="p2-nav-item-icon">{icon}</span>
      <span className="p2-nav-item-label">{label}</span>
      {soon && <span className="p2-nav-item-soon">soon</span>}
      {badge && !soon && <span className="p2-nav-item-badge">{badge}</span>}
      {shortcut && !soon && <span className="p2-nav-item-kb">{shortcut}</span>}
    </button>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ stat, loading }: { stat: LiveStat; loading: boolean }) {
  if (loading) {
    return (
      <div className="p2-stat skeleton-card" style={{ height: 110 }} />
    );
  }
  return (
    <div
      className="p2-stat"
      style={{
        "--sc": stat.color,
        "--sg": stat.glow,
      } as React.CSSProperties}
    >
      <div className="p2-stat-glow" />
      <div className="p2-stat-icon-wrap">{stat.icon}</div>
      <div className="p2-stat-body">
        <div className="p2-stat-value">{stat.value}</div>
        <div className="p2-stat-label">{stat.label}</div>
        <div className="p2-stat-sub">{stat.sub}</div>
      </div>
    </div>
  );
}

// ─── Module Card ──────────────────────────────────────────────────────────────
function ModCard({ mod, onClick }: { mod: ModuleCard; onClick: () => void }) {
  return (
    <div
      className={`p2-mod${mod.comingSoon ? " p2-mod--soon" : ""}`}
      style={{ "--mc": mod.color, "--mg": mod.glow } as React.CSSProperties}
      onClick={mod.comingSoon ? undefined : onClick}
      role="button"
      tabIndex={mod.comingSoon ? -1 : 0}
      onKeyDown={(e) => !mod.comingSoon && e.key === "Enter" && onClick()}
    >
      <div className="p2-mod-glow" />
      <div className="p2-mod-stripe" />

      {mod.comingSoon && (
        <div className="p2-mod-soon-tag">
          <Clock size={11} /> Coming Soon
        </div>
      )}
      {mod.badge && !mod.comingSoon && (
        <div className="p2-mod-badge-tag">{mod.badge}</div>
      )}

      <div className="p2-mod-icon-ring">
        <div className="p2-mod-icon">{mod.icon}</div>
      </div>

      <div className="p2-mod-title">{mod.title}</div>
      <div className="p2-mod-subtitle">{mod.subtitle}</div>
      <p className="p2-mod-desc">{mod.description}</p>

      {!mod.comingSoon && (
        <div className="p2-mod-open">
          Open <ArrowUpRight size={13} />
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ErpDashboard() {
  const router = useRouter();
  const { db: localDB, isReady, error } = useSmritiDB();

  const [showCatalogue, setShowCatalogue] = useState(false);
  const [showLookupManager, setShowLookupManager] = useState(false);
  const [showItemMasterGrid, setShowItemMasterGrid] = useState(false);
  const [showStockAudit, setShowStockAudit] = useState(false);
  const [showDynamicGridPO, setShowDynamicGridPO] = useState(false);
  const [showDynamicGridGRN, setShowDynamicGridGRN] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeNav, setActiveNav] = useState("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [clock, setClock] = useState("");
  const [statsLoading, setStatsLoading] = useState(true);
  const [liveStats, setLiveStats] = useState<LiveStat[]>([]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
  const greetingEmoji = hour < 12 ? "🌅" : hour < 17 ? "☀️" : "🌙";

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!isReady || !localDB) return;
    setTimeout(() => {
      try {
        const todayRes = localDB.exec(`SELECT COUNT(*) as bills, COALESCE(SUM(COALESCE(net_total, net_amount, 0)), 0) as net FROM sales_invoices WHERE date(created_at) = date('now')`);
        const todayBills = Number((todayRes as any)?.[0]?.bills ?? 0);
        const todayNet   = Number((todayRes as any)?.[0]?.net   ?? 0);
        const skuRes = localDB.exec(`SELECT COUNT(*) as c FROM item_master`);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const itemCount: number = (skuRes as any)?.[0]?.c ?? 0;
        const grnRes = localDB.exec(`SELECT COUNT(*) as c FROM purchase_orders WHERE status = 'APPROVED'`);
        const pendingGrns: number = (grnRes as any)?.[0]?.c ?? 0;
        setLiveStats([
          { label: "Today's Revenue", value: todayNet > 0 ? `₹ ${todayNet >= 1000 ? (todayNet/1000).toFixed(1)+'k' : todayNet.toFixed(0)}` : "₹ 0", sub: todayBills > 0 ? `${todayBills} bill${todayBills > 1 ? 's' : ''} settled` : "No sales yet", icon: <TrendingUp size={22} />, color: "#22c55e", glow: "rgba(34,197,94,0.25)" },
          { label: "Bills Today",     value: todayBills.toString(), sub: "POS terminal",           icon: <ShoppingCart size={22} />, color: "#3b82f6", glow: "rgba(59,130,246,0.25)" },
          { label: "SKU Catalogue",   value: itemCount.toLocaleString(), sub: "Active items",        icon: <Database size={22} />,      color: "#a78bfa", glow: "rgba(167,139,250,0.25)" },
          { label: "Pending GRNs",    value: pendingGrns.toString(), sub: pendingGrns > 0 ? "Awaiting receipt" : "All cleared", icon: <Package size={22} />, color: "#f59e0b", glow: "rgba(245,158,11,0.25)" },
        ]);
      } catch {
        setLiveStats([
          { label: "Today's Revenue", value: "₹ 0", sub: "No sales yet", icon: <TrendingUp size={22} />, color: "#22c55e", glow: "rgba(34,197,94,0.25)" },
          { label: "Bills Today", value: "0", sub: "POS terminal ready", icon: <ShoppingCart size={22} />, color: "#3b82f6", glow: "rgba(59,130,246,0.25)" },
          { label: "SKU Catalogue", value: "—", sub: "Database loading", icon: <Database size={22} />, color: "#a78bfa", glow: "rgba(167,139,250,0.25)" },
          { label: "Pending GRNs", value: "0", sub: "All cleared", icon: <Package size={22} />, color: "#f59e0b", glow: "rgba(245,158,11,0.25)" },
        ]);
      }
      setStatsLoading(false);
    }, 600);
  }, [isReady, localDB]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "F1") { e.preventDefault(); router.push("/retail"); }
      if (e.ctrlKey && e.key === "g") { e.preventDefault(); router.push("/erp/procurement"); }
      if (e.ctrlKey && e.key === "i") { e.preventDefault(); setShowItemMasterGrid(true); }
      if (e.ctrlKey && e.key === "l") { e.preventDefault(); router.push("/erp/catalogue"); }
      if (e.key === "Escape") {
        setShowCatalogue(false); setShowLookupManager(false);
        setShowItemMasterGrid(false); setShowStockAudit(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [router]);

  const modules: ModuleCard[] = [
    {
      id: "procurement", icon: <Package size={26} />, title: "Procurement", subtitle: "Goods Inward · GRN",
      description: "Multi-tier landed cost pro-ration, triple-quantity tracking, vendor invoice matching, and variance alerts.",
      color: "#10b981", glow: "rgba(16,185,129,0.2)", badge: "CORE", action: () => setShowDynamicGridGRN(true),
    },
    {
      id: "item-master", icon: <Tag size={26} />, title: "Item Master", subtitle: "SKU Entry Engine",
      description: "3-tab high-velocity entry system with session-common fields, F2 lookup, size matrix, and duplicate detection.",
      color: "#0ea5e9", glow: "rgba(14,165,233,0.2)", badge: "CORE", action: () => setShowItemMasterGrid(true),
    },
    {
      id: "catalogue-hub", icon: <Layers size={26} />, title: "Catalogue Hub", subtitle: "All Dependent Modules",
      description: "Tax Codes · Classifications · Size Groups · Price Revisions · Promotions · Payment Modes — unified catalogue workspace.",
      color: "#a78bfa", glow: "rgba(167,139,250,0.2)", badge: "NEW", href: "/erp/catalogue",
    },
    {
      id: "crm-loyalty", icon: <Users size={26} />, title: "CRM & Loyalty", subtitle: "Customer Lifecycle",
      description: "Customer spending analytics, loyalty points engine, and automated targeted promotional campaigns.",
      color: "#f59e0b", glow: "rgba(245,158,11,0.2)", href: "/erp/crm", comingSoon: true,
    },
    {
      id: "tally-bridge", icon: <RefreshCw size={26} />, title: "Tally Bridge", subtitle: "Accounting Sync",
      description: "Sync sales vouchers, purchase records, and inventory ledgers directly with TallyPrime via XML export.",
      color: "#ec4899", glow: "rgba(236,72,153,0.2)", href: "/erp/tally",
    },
    {
      id: "stock-take", icon: <Search size={26} />, title: "Stock Take", subtitle: "Inventory Lockdown",
      description: "Blind audit sessions with physical vs. computed stock reconciliation, variance adjustment, and audit trail.",
      color: "#f97316", glow: "rgba(249,115,22,0.2)", badge: "AUDIT", action: () => setShowStockAudit(true),
    },
    {
      id: "reports", icon: <BarChart2 size={26} />, title: "Sentinel BI", subtitle: "Live Intelligence",
      description: "Real-time analytics for sales performance, payment mix, top SKUs, and HSN-wise GST liability. Pure offline SVG charts.",
      color: "#8b5cf6", glow: "rgba(139,92,246,0.2)", badge: "NEW", href: "/erp/reports",
    },
  ];

  const quickActions: QuickAction[] = [
    { icon: <ShoppingCart size={15} />, label: "New Bill", shortcut: "F1", action: () => router.push("/retail"), color: "#3b82f6" },
    { icon: <Package size={15} />, label: "New GRN", shortcut: "Ctrl+G", action: () => setShowDynamicGridGRN(true), color: "#10b981" },
    { icon: <LayoutDashboard size={15} />, label: "New PO", action: () => setShowDynamicGridPO(true), color: "#f59e0b" },
    { icon: <Tag size={15} />, label: "SKU Master", shortcut: "Ctrl+I", action: () => setShowItemMasterGrid(true), color: "#0ea5e9" },
    { icon: <Layers size={15} />, label: "Catalogue", shortcut: "Ctrl+L", action: () => router.push("/erp/catalogue"), color: "#a78bfa" },
    { icon: <Search size={15} />, label: "Stock Take", action: () => setShowStockAudit(true), color: "#f97316" },
    { icon: <Palette size={15} />, label: "Style Browser", action: () => setShowCatalogue(true), color: "#ec4899" },
  ];

  const filteredModules = modules.filter(
    (m) => m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
           m.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ── Boot / Error ──
  if (!isReady) {
    return (
      <div className="erp-boot-screen">
        <div className="erp-boot-inner">
          <div className="erp-boot-logo"><Cpu size={40} /><span>SMRITI ERP</span></div>
          <div className="erp-boot-bar"><div className="erp-boot-bar-fill" /></div>
          <div className="erp-boot-text">Initializing Sovereign Engine…</div>
          <div className="erp-boot-sub">Loading local database shards</div>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="erp-boot-screen">
        <div className="erp-boot-inner">
          <Shield size={40} color="var(--status-error)" />
          <div className="erp-boot-text" style={{ color: "var(--status-error)" }}>Engine Error</div>
          <div className="erp-boot-sub">{error}</div>
        </div>
      </div>
    );
  }

  // ── Modal helper ──
  const Modal = ({ show, onClose, large, children }: { show: boolean; onClose: () => void; large?: boolean; children: React.ReactNode }) => {
    if (!show) return null;
    return (
      <div className="erp2-modal-overlay" onClick={onClose}>
        <div className={`erp2-modal-box${large ? " erp2-modal-box--lg" : ""}`} onClick={(e) => e.stopPropagation()}>
          <button className="erp2-modal-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
          {children}
        </div>
      </div>
    );
  };

  return (
    <div className="p2-shell">
      {/* Modals */}
      <Modal show={showCatalogue} onClose={() => setShowCatalogue(false)}><StyleCatalogue /></Modal>
      <Modal show={showLookupManager} onClose={() => setShowLookupManager(false)}><GeneralLookupManager /></Modal>
      <Modal show={showItemMasterGrid} onClose={() => setShowItemMasterGrid(false)} large><ItemMasterGrid /></Modal>
      <Modal show={showStockAudit} onClose={() => setShowStockAudit(false)} large><StockAudit /></Modal>
      <Modal show={showDynamicGridPO} onClose={() => setShowDynamicGridPO(false)} large><DynamicGrid moduleId="PO" /></Modal>
      <Modal show={showDynamicGridGRN} onClose={() => setShowDynamicGridGRN(false)} large><DynamicGrid moduleId="GRN" /></Modal>

      {/* ── TOP BAR ── */}
      <header className="p2-topbar">
        <div className="p2-topbar-left">
          <button className="p2-hamburger" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <div className="p2-brand">
            <div className="p2-brand-logo">
              <Zap size={18} />
            </div>
            <span className="p2-brand-name">SMRITI ERP</span>
            <span className="p2-brand-pill">Sovereign Engine</span>
          </div>
        </div>

        <div className="p2-topbar-search">
          <Search size={14} className="p2-search-ico" />
          <input
            className="p2-search-inp"
            placeholder="Filter modules…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="p2-search-cls" onClick={() => setSearchQuery("")}><X size={12} /></button>
          )}
          <span className="p2-search-kbd">⌘K</span>
        </div>

        <div className="p2-topbar-right">
          <div className="p2-clock-wrap">
            <div className="p2-clock">{clock}</div>
            <div className="p2-online"><span className="p2-online-dot" /> Live</div>
          </div>
          <button className="p2-pos-btn" onClick={() => router.push("/retail")}>
            <ShoppingCart size={14} />
            POS Terminal
            <ArrowUpRight size={12} />
          </button>
          <button className="p2-icon-btn" title="Notifications"><Bell size={16} /></button>
          <div className="p2-avatar">A</div>
        </div>
      </header>

      {/* ── BODY ── */}
      <div className={`p2-body${sidebarOpen ? "" : " p2-body--col"}`}>

        {/* ── SIDEBAR ── */}
        <aside className="p2-sidebar">
          <div className="p2-sidebar-group">
            <div className="p2-sidebar-label">WORKSPACE</div>
            <SideNavItem icon={<LayoutDashboard size={15} />} label="Dashboard" active={activeNav === "dashboard"} onClick={() => setActiveNav("dashboard")} />
            <SideNavItem icon={<Package size={15} />} label="Procurement" shortcut="^G" active={activeNav === "procurement"} onClick={() => { setActiveNav("procurement"); router.push("/erp/procurement"); }} />
            <SideNavItem icon={<Tag size={15} />} label="Item Master" shortcut="^I" active={activeNav === "item-master"} onClick={() => { setActiveNav("item-master"); setShowItemMasterGrid(true); }} />
            <SideNavItem icon={<Layers size={15} />} label="Catalogue" shortcut="^L" active={activeNav === "catalogue"} onClick={() => { setActiveNav("catalogue"); router.push("/erp/catalogue"); }} />
          </div>

          <div className="p2-sidebar-group">
            <div className="p2-sidebar-label">OPERATIONS</div>
            <SideNavItem icon={<Users size={15} />} label="CRM & Loyalty" soon active={activeNav === "crm"} onClick={() => setActiveNav("crm")} />
            <SideNavItem icon={<RefreshCw size={15} />} label="Tally Bridge" active={activeNav === "tally"} onClick={() => { setActiveNav("tally"); router.push("/erp/tally"); }} />
            <SideNavItem icon={<Search size={15} />} label="Stock Take" active={activeNav === "stock"} onClick={() => { setActiveNav("stock"); setShowStockAudit(true); }} />
            <SideNavItem icon={<BarChart2 size={15} />} label="Sentinel BI" active={activeNav === "reports"} onClick={() => { setActiveNav("reports"); router.push("/erp/reports"); }} />
          </div>

          <div className="p2-sidebar-group p2-sidebar-group--bottom">
            <div className="p2-sidebar-label">SYSTEM</div>
            <SideNavItem icon={<Palette size={15} />} label="Style Browser" active={activeNav === "style"} onClick={() => { setActiveNav("style"); setShowCatalogue(true); }} />
            <SideNavItem icon={<Settings size={15} />} label="Settings" active={activeNav === "settings"} onClick={() => setActiveNav("settings")} />
            <SideNavItem icon={<LogOut size={15} />} label="Back to Home" onClick={() => router.push("/")} />
          </div>

          {/* Sidebar Footer */}
          <div className="p2-sidebar-footer">
            <div className="p2-sf-avatar">A</div>
            <div className="p2-sf-info">
              <div className="p2-sf-name">Admin</div>
              <div className="p2-sf-role">System Architect</div>
            </div>
            <div className="p2-sf-status" title="Engine online" />
          </div>
        </aside>

        {/* ── MAIN ── */}
        <main className="p2-main">

          {/* Hero Greeting */}
          <section className="p2-hero">
            <div className="p2-hero-bg" />
            <div className="p2-hero-content">
              <div className="p2-hero-eyebrow">
                <Sparkles size={13} />
                {greetingEmoji} {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
              </div>
              <h1 className="p2-hero-title">
                {greeting}, <span className="p2-hero-accent">Admin</span>
              </h1>
              <p className="p2-hero-sub">
                Your sovereign retail landscape is synchronized and ready for operation.
              </p>
            </div>
            <div className="p2-hero-badge">
              <Activity size={14} />
              <span>All Systems Operational</span>
            </div>
          </section>

          {/* Stats */}
          <section className="p2-stats-row">
            {statsLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="p2-stat skeleton-card" style={{ height: 110 }} />
                ))
              : liveStats.map((stat, i) => <StatCard key={i} stat={stat} loading={false} />)
            }
          </section>

          {/* Quick Actions */}
          <section className="p2-quick-section">
            <div className="p2-section-hd">
              <span className="p2-section-hd-label">Quick Actions</span>
              <span className="p2-section-hd-sub">Keyboard shortcuts active</span>
            </div>
            <div className="p2-quick-row">
              {quickActions.map((qa, i) => (
                <button
                  key={i}
                  className="p2-qa"
                  style={{ "--qc": qa.color } as React.CSSProperties}
                  onClick={qa.action}
                >
                  <span className="p2-qa-icon">{qa.icon}</span>
                  <span className="p2-qa-label">{qa.label}</span>
                  {qa.shortcut && <span className="p2-qa-kbd">{qa.shortcut}</span>}
                </button>
              ))}
            </div>
          </section>

          {/* Module Cards */}
          <section className="p2-mods-section">
            <div className="p2-section-hd">
              <span className="p2-section-hd-label">
                Modules
                {searchQuery && <span className="p2-section-hd-badge">{filteredModules.length} of {modules.length}</span>}
              </span>
              <span className="p2-section-hd-sub">Click any module to launch</span>
            </div>
            {filteredModules.length === 0 ? (
              <div className="p2-empty">
                <Search size={36} />
                <p>No modules match &ldquo;{searchQuery}&rdquo;</p>
              </div>
            ) : (
              <div className="p2-mods-grid">
                {filteredModules.map((mod) => (
                  <ModCard
                    key={mod.id}
                    mod={mod}
                    onClick={() => mod.action ? mod.action() : router.push(mod.href || "/")}
                  />
                ))}
              </div>
            )}
          </section>

        </main>
      </div>
    </div>
  );
}

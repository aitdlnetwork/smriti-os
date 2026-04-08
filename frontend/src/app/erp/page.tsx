/**
 * SMRITI-OS · Prism Design System
 * ERP Dashboard — Modernized Command Center
 * Migration: Prism Primitive Components + Sidebar-less Layout
 */
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSmritiDB } from "@/lib/useSmritiDB";
import PageShell from "@/components/ui/PageShell";
import { 
  Button, Card, SectionHeader, StatusBadge, 
  Divider, DataTable 
} from "@/components/ui";
import { 
  Package, Tag, Layers, Users, RefreshCw, Search,
  BarChart2, ShoppingCart, TrendingUp, Database, 
  Sparkles, ArrowUpRight, LayoutDashboard, Activity, Zap, Settings
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ModuleCard {
  id: string; icon: React.ReactNode; title: string; subtitle: string;
  description: string; color: string; badge?: string;
  href?: string; action?: () => void; soon?: boolean;
}

interface LiveStat {
  label: string; value: string; sub: string;
  icon: React.ReactNode; color: string;
}

// ─── Dashboard Component ──────────────────────────────────────────────────────
export default function ErpDashboard() {
  const router = useRouter();
  const { db: localDB, isReady, error } = useSmritiDB();
  const [statsLoading, setStatsLoading] = useState(true);
  const [liveStats, setLiveStats] = useState<LiveStat[]>([]);
  const [clock, setClock] = useState("");

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
  const greetingEmoji = hour < 12 ? "🌅" : hour < 17 ? "☀️" : "🌙";

  // Clock tick
  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }));
    tick();
    const t = setInterval(tick, 60000); // 1-minute tick
    return () => clearInterval(t);
  }, []);

  // Stats Query
  const fetchStats = useCallback(() => {
    if (!isReady || !localDB) return;
    try {
      const todayRes = localDB.exec(`SELECT COUNT(*) as bills, COALESCE(SUM(COALESCE(net_total, net_amount, 0)), 0) as net FROM sales_invoices WHERE date(created_at) = date('now')`);
      const todayBills = Number((todayRes[0] as any)?.bills ?? 0);
      const todayNet   = Number((todayRes[0] as any)?.net   ?? 0);
      const skuRes = localDB.exec(`SELECT COUNT(*) as c FROM item_master`);
      const itemCount = (skuRes[0] as any)?.c ?? 0;
      const grnRes = localDB.exec(`SELECT COUNT(*) as c FROM purchase_orders WHERE status = 'APPROVED'`);
      const pendingGrns = (grnRes[0] as any)?.c ?? 0;

      setLiveStats([
        { label: "Today's Revenue", value: `₹${todayNet >= 1000 ? (todayNet/1000).toFixed(1)+'k' : todayNet.toFixed(0)}`, sub: `${todayBills} bills settled`, icon: <TrendingUp size={18} />, color: "var(--color-success)" },
        { label: "Bills Today",     value: todayBills.toString(), sub: "POS Terminal",           icon: <ShoppingCart size={18} />, color: "var(--color-primary)" },
        { label: "SKU Catalogue",   value: itemCount.toLocaleString(), sub: "Active Master",        icon: <Database size={18} />,     color: "var(--color-info)" },
        { label: "Pending GRNs",    value: pendingGrns.toString(), sub: "Awaiting Receipt",      icon: <Package size={18} />,      color: "var(--color-warning)" },
      ]);
    } catch (err) {
      console.error(err);
    }
    setStatsLoading(false);
  }, [isReady, localDB]);

  useEffect(() => { if (isReady) fetchStats(); }, [isReady, fetchStats]);

  const modules: ModuleCard[] = [
    { id: "procurement", icon: <Package size={22} />, title: "Procurement", subtitle: "GRN Command Center", description: "Landed cost, triple-quantity, and vendor match engine.", color: "var(--color-success)", badge: "CORE", href: "/erp/procurement" },
    { id: "item-master", icon: <Tag size={22} />, title: "Item Master", subtitle: "Bulk SKU Engine", description: "3-tab high-velocity item master entry system.", color: "var(--color-primary)", badge: "CORE", href: "/erp/item-master" },
    { id: "catalogue",   icon: <Layers size={22} />, title: "Catalogue", subtitle: "Unified Lookup Hub", description: "Tax Codes, Sizes, Price Revision, and Promotions.", color: "var(--color-secondary)", badge: "NEW", href: "/erp/catalogue" },
    { id: "loyalty",     icon: <Users size={22} />, title: "CRM & Loyalty", subtitle: "Customer Spend", description: "Spending analytics and lifecycle management.", color: "var(--color-warning)", soon: true, href: "/erp/crm" },
    { id: "tally",       icon: <RefreshCw size={22} />, title: "Tally Bridge", subtitle: "Accounting Bridge", description: "Sync retail invoices natively with TallyPrime.", color: "var(--color-info)", href: "/erp/tally" },
    { id: "reports",     icon: <BarChart2 size={22} />, title: "Sentinel BI", subtitle: "Live Analytics", description: "Offline intelligence Command Center.", color: "var(--color-secondary)", badge: "LIVE", href: "/erp/reports" },
  ];

  if (!isReady && !error) return <PageShell title="Dashboard" loading breadcrumbs={[{ label: "ERP", href: "/erp" }, { label: "Main" }]}>{null}</PageShell>;

  return (
    <PageShell
      title={`${greeting}, Admin`}
      subtitle="Your sovereign retail landscape is synchronized and ready for operation."
      icon={<Sparkles size={18} />}
      breadcrumbs={[{ label: "ERP", href: "/erp" }, { label: "Dashboard" }]}
      actions={
        <Button variant="primary" size="sm" icon={<ShoppingCart size={14} />} onClick={() => router.push("/retail")}>
          Launch POS Terminal
        </Button>
      }
    >
      {/* ── KPI Row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        {liveStats.map((stat, i) => (
          <Card key={i} padding="20px">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ color: stat.color, background: `${stat.color}15`, padding: 8, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {stat.icon}
              </div>
              <ArrowUpRight size={14} color="var(--color-text-tertiary)" opacity={0.3} />
            </div>
            <div style={{ marginTop: 12, fontSize: "var(--font-size-3xl)", fontWeight: 800, color: "var(--color-text-primary)", fontFamily: "monospace", lineHeight: 1 }}>{stat.value}</div>
            <div style={{ fontSize: "var(--font-size-xs)", fontWeight: 600, color: "var(--color-text-tertiary)", marginTop: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>{stat.label}</div>
            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)", opacity: 0.5 }}>{stat.sub}</div>
          </Card>
        ))}
      </div>

      {/* ── Quick Launch Modules ── */}
      <SectionHeader title="Enterprise Workspace" sub="Click any module to launch the command session." style={{ marginBottom: 16 }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 32 }}>
        {modules.map((mod) => (
          <Card 
            key={mod.id} 
            padding="24px" 
            accent={mod.soon ? "transparent" : mod.color}
            hover={!mod.soon}
            onClick={() => !mod.soon ? router.push(mod.href || "/") : undefined}
            style={{ opacity: mod.soon ? 0.6 : 1, position: "relative" }}
          >
            <div style={{ display: "flex", gap: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: "var(--color-surface-2)", display: "flex", alignItems: "center", justifyContent: "center", color: mod.color, border: "1px solid var(--color-border-subtle)" }}>
                {mod.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "var(--font-size-lg)", fontWeight: 700, color: "var(--color-text-primary)" }}>{mod.title}</span>
                  {mod.badge && <StatusBadge label={mod.badge} type={mod.badge === "CORE" ? "primary" : "warning"} />}
                </div>
                <div style={{ fontSize: "var(--font-size-xs)", color: mod.color, fontWeight: 600, opacity: 0.7 }}>{mod.subtitle}</div>
                <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-tertiary)", marginTop: 10, lineHeight: 1.5 }}>{mod.description}</p>
              </div>
            </div>
            {mod.soon && (
              <div style={{ position: "absolute", inset: 0, background: "rgba(3,7,18,0.4)", backdropFilter: "blur(4px)", borderRadius: "var(--radius-lg)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 800, letterSpacing: 2 }}>COMING SOON</div>
            )}
          </Card>
        ))}
      </div>

      {/* ── Bottom Section ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16 }}>
        <Card padding="24px">
          <SectionHeader title="System Pulse" sub="Transaction health across all shards." />
          <div style={{ marginTop: 24, height: 180, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-surface-2)", borderRadius: "var(--radius-md)", border: "1px dashed var(--color-border-strong)", color: "var(--color-text-tertiary)", fontSize: 13 }}>
            Integration charts loading...
          </div>
        </Card>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card padding="20px">
            <SectionHeader title="Quick Stats" />
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>
                 <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                   <span style={{ color: "var(--color-text-tertiary)" }}>Clock</span>
                   <span style={{ fontWeight: 700, fontFamily: "monospace" }}>{clock}</span>
                 </div>
                 <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                   <span style={{ color: "var(--color-text-tertiary)" }}>SMRITI Engine</span>
                   <StatusBadge label="v2.4.0-WASM" type="info" dot />
                 </div>
                 <Divider />
                 <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                   <span style={{ color: "var(--color-text-tertiary)" }}>Shards</span>
                   <span style={{ color: "var(--color-success)", fontWeight: 700 }}>4 Online</span>
                 </div>
            </div>
          </Card>
          <Button variant="secondary" icon={<Settings size={14} />} onClick={() => router.push("/erp/settings")}>Engine Master Setup</Button>
        </div>
      </div>
    </PageShell>
  );
}

/**
 * SMRITI-OS · Prism Design System
 * Sentinel BI — Real-time analytics Command Center
 * Migration: Prism Primitive Components + Sidebar-less Layout
 */
"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSmritiDB } from "@/lib/useSmritiDB";
import PageShell from "@/components/ui/PageShell";
import { 
  Button, Card, SectionHeader, StatusBadge, 
  Divider, DataTable, TableColumn 
} from "@/components/ui";
import { 
  TrendingUp, ShoppingCart, Package, Users, 
  RefreshCw, BarChart2, ArrowUpRight, Activity, Zap
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface DailySales { day: string; net: number; bills: number; }
interface TopSku    { item_code: string; description: string; total: number; qty: number; }
interface PayMode   { payment_mode: string; total: number; }
interface KpiData {
  todayNet: number; todayBills: number; avgBill: number;
  itemsSold: number; totalSku: number; pendingGrns: number;
}

const DONUT_COLORS = ["var(--color-primary)", "var(--color-secondary)", "var(--color-warning)", "var(--color-info)", "var(--color-purple)", "var(--color-success)"];

// ─── SVG Sparkline Bar Chart ─────────────────────────────────────────────────
function BarSparkline({ data, color }: { data: DailySales[]; color: string }) {
  const W = 540, H = 120, PAD = 8;
  const vals = data.map(d => d.net);
  const max  = Math.max(...vals, 1);
  const bw   = (W - PAD * 2) / Math.max(data.length, 1);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: H }}>
      <defs>
        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.8" />
          <stop offset="100%" stopColor={color} stopOpacity="0.1" />
        </linearGradient>
      </defs>
      {data.map((d, i) => {
        const barH = Math.max(((d.net / max) * (H - PAD * 2)), 2);
        const x    = PAD + i * bw + bw * 0.15;
        const y    = H - PAD - barH;
        const bwIn = bw * 0.7;
        const isToday = i === data.length - 1;
        return (
          <g key={i}>
            <rect x={x} y={y} width={bwIn} height={barH}
              fill={isToday ? color : "url(#barGrad)"}
              rx={4}
              opacity={isToday ? 1 : 0.6}
            />
            <text x={x + bwIn / 2} y={H - 1} textAnchor="middle" fill="var(--color-text-tertiary)" fontSize={10} fontFamily="monospace" opacity={0.6}>
              {d.day}
            </text>
            {isToday && d.net > 0 && (
              <text x={x + bwIn / 2} y={y - 8} textAnchor="middle" fill={color} fontSize={10} fontWeight="bold">
                ₹{d.net >= 1000 ? `${(d.net / 1000).toFixed(1)}k` : d.net.toFixed(0)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ─── SVG Donut Chart ─────────────────────────────────────────────────────────
function DonutChart({ data }: { data: PayMode[] }) {
  const R = 70, CX = 90, CY = 90, strokeW = 18;
  const total = data.reduce((s, d) => s + d.total, 0) || 1;
  let offsetAngle = -90;

  const slices = data.map((d, i) => {
    const pct   = d.total / total;
    const angle = pct * 360;
    const rad   = (a: number) => (a * Math.PI) / 180;
    const x1    = CX + R * Math.cos(rad(offsetAngle));
    const y1    = CY + R * Math.sin(rad(offsetAngle));
    offsetAngle += angle;
    const x2    = CX + R * Math.cos(rad(offsetAngle));
    const y2    = CY + R * Math.sin(rad(offsetAngle));
    const large = angle > 180 ? 1 : 0;
    const fill  = DONUT_COLORS[i % DONUT_COLORS.length];
    return { d: `M ${CX} ${CY} L ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} Z`, fill, pct, label: d.payment_mode };
  });

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
      <svg viewBox="0 0 180 180" style={{ width: 140, height: 140, flexShrink: 0 }}>
        {data.length === 0 ? <circle cx={CX} cy={CY} r={R} fill="none" stroke="var(--color-surface-3)" strokeWidth={strokeW} /> : slices.map((s, i) => <path key={i} d={s.d} fill={s.fill} opacity={0.8} />)}
        <circle cx={CX} cy={CY} r={R - strokeW / 2} fill="var(--color-bg)" />
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
        {data.length === 0 ? <span style={{ color: "var(--color-text-tertiary)", fontSize: 13 }}>No modes yet.</span> : data.map((d, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
            <span style={{ fontSize: 13, color: "var(--color-text-secondary)", flex: 1 }}>{d.payment_mode}</span>
            <span style={{ fontSize: 13, color: "var(--color-text-primary)", fontWeight: 700, fontFamily: "monospace" }}>₹{d.total.toFixed(0)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Sentinel BI ────────────────────────────────────────────────────────
export default function SentinelBI() {
  const { isReady, db } = useSmritiDB();
  const [kpi, setKpi]               = useState<KpiData>({ todayNet: 0, todayBills: 0, avgBill: 0, itemsSold: 0, totalSku: 0, pendingGrns: 0 });
  const [daily, setDaily]           = useState<DailySales[]>([]);
  const [payModes, setPayModes]     = useState<PayMode[]>([]);
  const [register, setRegister]     = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading]       = useState(true);
  const [lastRefresh, setLastRefresh] = useState("");

  const refresh = useCallback(() => {
    if (!isReady || !db) return;
    setLoading(true);
    try {
      const todayRes = db.exec(`SELECT COUNT(*) as bills, COALESCE(SUM(COALESCE(net_total, net_amount, 0)), 0) as net FROM sales_invoices WHERE date(created_at) = date('now')`);
      const todayBills = Number((todayRes[0] as any)?.bills ?? 0);
      const todayNet   = Number((todayRes[0] as any)?.net   ?? 0);
      const avgBill    = todayBills > 0 ? todayNet / todayBills : 0;
      const iRes = db.exec(`SELECT COALESCE(SUM(COALESCE(qty, quantity, 1)),0) as qty FROM sales_invoice_items WHERE invoice_id IN (SELECT id FROM sales_invoices WHERE date(created_at) = date('now'))`);
      const itemsSold = Number((iRes[0] as any)?.qty ?? 0);
      const skuRes = db.exec(`SELECT COUNT(*) as c FROM item_master`);
      const totalSku = Number((skuRes[0] as any)?.c ?? 0);
      const grnRes = db.exec(`SELECT COUNT(*) as c FROM purchase_orders WHERE status = 'APPROVED'`);
      const pendingGrns = Number((grnRes[0] as any)?.c ?? 0);
      setKpi({ todayNet, todayBills, avgBill, itemsSold, totalSku, pendingGrns });
      const days: DailySales[] = [];
      for (let i = 6; i >= 0; i--) {
        const res = db.exec(`SELECT COALESCE(SUM(COALESCE(net_total, net_amount,0)),0) as net FROM sales_invoices WHERE date(created_at) = date('now', '-${i} days')`);
        const r = res[0] as any; const d = new Date(); d.setDate(d.getDate() - i);
        days.push({ day: d.toLocaleDateString("en-IN", { weekday: "short" }).slice(0, 2), net: Number(r?.net ?? 0), bills: 0 });
      }
      setDaily(days);
      const pm = db.exec(`SELECT payment_mode, SUM(amount) as total FROM sales_payments GROUP BY payment_mode ORDER BY total DESC`);
      setPayModes(pm as unknown as PayMode[]);
      const regRes = db.exec(`SELECT COALESCE(NULLIF(invoice_number,''), bill_number) as bill_no, created_at, COALESCE(tax_amount, 0) as tax, COALESCE(net_total, net_amount, 0) as net, COALESCE(status, 'POSTED') as status FROM sales_invoices ORDER BY created_at DESC LIMIT 25`);
      setRegister(regRes as unknown as Record<string, unknown>[]);
      setLastRefresh(new Date().toLocaleTimeString("en-IN"));
    } catch (err) { console.error(err); }
    setLoading(false);
  }, [isReady, db]);

  useEffect(() => { if (isReady) refresh(); }, [isReady, refresh]);

  const columns: TableColumn<Record<string, unknown>>[] = [
    { key: "bill_no", header: "Bill No", render: (v) => <span style={{ color: "var(--color-primary)", fontFamily: "monospace", fontWeight: 700 }}>{String(v)}</span> },
    { key: "created_at", header: "Timestamp", render: (v) => <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>{new Date(String(v)).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span> },
    { key: "tax", header: "Tax (₹)", align: "right", render: (v) => <span style={{ color: "var(--color-warning)", fontFamily: "monospace" }}>₹{Number(v).toFixed(2)}</span> },
    { key: "net", header: "Net Amount", align: "right", render: (v) => <span style={{ color: "var(--color-success)", fontWeight: 800, fontFamily: "monospace" }}>₹{Number(v).toFixed(2)}</span> },
    { key: "status", header: "Status", align: "center", render: (v) => <StatusBadge label={String(v)} type={v === "SYNCED" ? "success" : "primary"} dot /> },
  ];

  if (!isReady) return <PageShell title="Sentinel BI" loading breadcrumbs={[{ label: "ERP", href: "/erp" }, { label: "BI" }]}>{null}</PageShell>;

  return (
    <PageShell
      title="Sentinel BI"
      subtitle="Real-time commercial intelligence from the sovereign edge engine."
      icon={<BarChart2 size={18} />}
      breadcrumbs={[{ label: "ERP", href: "/erp" }, { label: "Sentinel BI" }]}
      actions={
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {lastRefresh && <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>Updated {lastRefresh}</span>}
          <Button variant="ghost" size="sm" icon={<RefreshCw size={14} className={loading ? "spin" : ""} />} onClick={refresh} loading={loading}>Sync Data</Button>
        </div>
      }
    >
      {/* ── KPI Row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Today's Net", value: `₹${(kpi.todayNet >= 1000 ? (kpi.todayNet / 1000).toFixed(1) + "k" : kpi.todayNet.toFixed(0))}`, sub: "Commercial Volume", icon: <TrendingUp size={16} />, color: "var(--color-success)" },
          { label: "Avg Ticket Size", value: `₹${kpi.avgBill.toFixed(0)}`, sub: "Value per basket", icon: <ShoppingCart size={16} />, color: "var(--color-primary)" },
          { label: "Units Dispatched", value: kpi.itemsSold.toString(), sub: "Physical Movement", icon: <Package size={16} />, color: "var(--color-warning)" },
          { label: "Sentinel Pulse", value: "98.9%", sub: "Engine Health", icon: <Zap size={16} />, color: "var(--color-info)" },
        ].map((s, i) => (
          <Card key={i} padding="20px">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ color: s.color, background: `${s.color}15`, padding: 8, borderRadius: 10 }}>{s.icon}</div>
              <Activity size={12} color="var(--color-border-strong)" />
            </div>
            <div style={{ margin: "14px 0 4px", fontSize: "var(--font-size-2xl)", fontWeight: 800, color: "var(--color-text-primary)", fontFamily: "monospace" }}>{s.value}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: 0.5 }}>{s.label}</div>
            <div style={{ fontSize: 10, color: "var(--color-text-tertiary)", opacity: 0.5 }}>{s.sub}</div>
          </Card>
        ))}
      </div>

      {/* ── Visual Analytics ── */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 24 }}>
        <Card padding="24px">
          <SectionHeader title="7-Day Revenue Trend" sub="Gross daily revenue across POS terminals." style={{ marginBottom: 24 }} />
          <div style={{ height: 120 }}>
            <BarSparkline data={daily} color="var(--color-primary)" />
          </div>
        </Card>
        <Card padding="24px">
          <SectionHeader title="Revenue Mix" sub="By Settlement Mode." style={{ marginBottom: 20 }} />
          <DonutChart data={payModes} />
        </Card>
      </div>

      {/* ── Detailed Register ── */}
      <SectionHeader title="Sales Audit Register" sub="Last 25 operational vouchers." style={{ marginBottom: 16 }} />
      <DataTable columns={columns} rows={register} emptyMessage="No transactions detected in the local shard." />

      <style>{`
        @keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}</style>
    </PageShell>
  );
}

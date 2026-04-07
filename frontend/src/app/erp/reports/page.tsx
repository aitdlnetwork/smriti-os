/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  S M R I T I - O S   ||   E N T E R P R I S E   E D I T I O N
 *  "ERP Simplified. Run Your Entire Business on Memory, Not Code."
 * ─────────────────────────────────────────────────────────────────────────────
 *  System Architect  : Jawahar R Mallah
 *  Parent Org        : AITDL NETWORK
 *  Copyright         : © 2026 AITDL.com & AITDL.in. All Rights Reserved.
 * ─────────────────────────────────────────────────────────────────────────────
 *  Module : SMRITI Sentinel — Offline BI Command Center
 *  Desc   : Real-time analytics from the local WASM SQLite tier.
 *           Pure SVG rendering. Zero cloud. Zero latency.
 */

"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSmritiDB } from "@/lib/useSmritiDB";
import { TrendingUp, ShoppingCart, Package, Users, RefreshCw, BarChart2, ArrowUpRight, Activity } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface DailySales { day: string; net: number; bills: number; }
interface TopSku    { item_code: string; description: string; total: number; qty: number; }
interface PayMode   { payment_mode: string; total: number; }
interface KpiData {
  todayNet: number; todayBills: number; avgBill: number;
  itemsSold: number; totalSku: number; pendingGrns: number;
}

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
          <stop offset="0%" stopColor={color} stopOpacity="0.9" />
          <stop offset="100%" stopColor={color} stopOpacity="0.3" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
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
              opacity={isToday ? 1 : 0.55}
              filter={isToday ? "url(#glow)" : undefined}
            />
            <text x={x + bwIn / 2} y={H - 1} textAnchor="middle"
              fill="#6b7280" fontSize={9} fontFamily="monospace">
              {d.day}
            </text>
            {isToday && d.net > 0 && (
              <text x={x + bwIn / 2} y={y - 4} textAnchor="middle"
                fill={color} fontSize={9} fontWeight="bold">
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
const DONUT_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#a78bfa", "#06b6d4"];
function DonutChart({ data }: { data: PayMode[] }) {
  const R = 70, CX = 90, CY = 90, strokeW = 22;
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
    return { d: `M ${CX} ${CY} L ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} Z`, fill: DONUT_COLORS[i % DONUT_COLORS.length], pct, label: d.payment_mode };
  });

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <svg viewBox="0 0 180 180" style={{ width: 160, height: 160, flexShrink: 0 }}>
        {data.length === 0
          ? <circle cx={CX} cy={CY} r={R} fill="none" stroke="#1f2937" strokeWidth={strokeW} />
          : slices.map((s, i) => <path key={i} d={s.d} fill={s.fill} opacity={0.85} />)
        }
        <circle cx={CX} cy={CY} r={R - strokeW / 2} fill="#0a0f1a" />
        <text x={CX} y={CY - 8} textAnchor="middle" fill="#fff" fontSize={14} fontWeight="bold" fontFamily="monospace">
          {data.length}
        </text>
        <text x={CX} y={CY + 8} textAnchor="middle" fill="#6b7280" fontSize={9}>
          MODES
        </text>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
        {data.length === 0
          ? <span style={{ color: "#6b7280", fontSize: 12 }}>No data</span>
          : data.map((d, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: DONUT_COLORS[i % DONUT_COLORS.length], flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: "#d1d5db", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.payment_mode}</span>
                <span style={{ fontSize: 12, color: "#9ca3af", fontFamily: "monospace" }}>₹{d.total.toFixed(0)}</span>
              </div>
            ))
        }
      </div>
    </div>
  );
}

// ─── Horizontal Bar Rank ─────────────────────────────────────────────────────
function HorizontalBars({ data }: { data: TopSku[] }) {
  const max = Math.max(...data.map(d => d.total), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {data.length === 0
        ? <span style={{ color: "#6b7280", fontSize: 12, textAlign: "center", marginTop: 24 }}>No sales data yet</span>
        : data.map((d, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 11, color: "#6b7280", width: 18, textAlign: "right", fontFamily: "monospace" }}>{i + 1}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontSize: 12, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "60%" }}>
                    {d.description || d.item_code}
                  </span>
                  <span style={{ fontSize: 11, color: "#a78bfa", fontFamily: "monospace" }}>₹{d.total.toFixed(0)}</span>
                </div>
                <div style={{ background: "#1f2937", borderRadius: 4, height: 6, overflow: "hidden" }}>
                  <div style={{
                    width: `${(d.total / max) * 100}%`, height: "100%",
                    background: `linear-gradient(90deg, ${DONUT_COLORS[i % DONUT_COLORS.length]}, ${DONUT_COLORS[(i + 2) % DONUT_COLORS.length]})`,
                    borderRadius: 4, transition: "width 0.4s ease"
                  }} />
                </div>
              </div>
              <span style={{ fontSize: 11, color: "#6b7280", fontFamily: "monospace", width: 40, textAlign: "right" }}>
                ×{d.qty}
              </span>
            </div>
          ))
      }
    </div>
  );
}

// ─── KPI Tile ─────────────────────────────────────────────────────────────────
function KpiTile({ label, value, sub, icon, color }: { label: string; value: string; sub: string; icon: React.ReactNode; color: string }) {
  return (
    <div style={{
      background: "#111827", border: "1px solid #1f2937", borderRadius: 12,
      padding: "20px 16px", display: "flex", flexDirection: "column", gap: 8,
      position: "relative", overflow: "hidden"
    }}>
      <div style={{
        position: "absolute", top: 0, right: 0, width: 80, height: 80,
        borderRadius: "50%", background: color, opacity: 0.06, transform: "translate(30%, -30%)"
      }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}22`, display: "flex", alignItems: "center", justifyContent: "center", color }}>
          {icon}
        </div>
        <ArrowUpRight size={14} color="#374151" />
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: "#f9fafb", fontFamily: "monospace", lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: "#9ca3af", fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 11, color: "#4b5563" }}>{sub}</div>
    </div>
  );
}

// ─── Chart Panel ─────────────────────────────────────────────────────────────
function ChartPanel({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: "#111827", border: "1px solid #1f2937", borderRadius: 14,
      padding: "20px 20px 16px", display: "flex", flexDirection: "column", gap: 16
    }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0" }}>{title}</div>
        {sub && <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{sub}</div>}
      </div>
      {children}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function SentinelBI() {
  const { isReady, db } = useSmritiDB();

  const [kpi, setKpi]         = useState<KpiData>({ todayNet: 0, todayBills: 0, avgBill: 0, itemsSold: 0, totalSku: 0, pendingGrns: 0 });
  const [daily, setDaily]     = useState<DailySales[]>([]);
  const [topSkus, setTopSkus] = useState<TopSku[]>([]);
  const [payModes, setPayModes] = useState<PayMode[]>([]);
  const [lastRefresh, setLastRefresh] = useState("");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    if (!isReady || !db) return;
    setLoading(true);

    try {
      // KPI: Today
      const todayRes = db.exec(`
        SELECT COUNT(*) as bills, COALESCE(SUM(COALESCE(net_total, net_amount, 0)), 0) as net
        FROM sales_invoices WHERE date(created_at) = date('now')`);
      const todayBills = Number((todayRes[0] as Record<string, unknown>)?.bills ?? 0);
      const todayNet   = Number((todayRes[0] as Record<string, unknown>)?.net   ?? 0);
      const avgBill    = todayBills > 0 ? todayNet / todayBills : 0;

      // KPI: Items sold today
      const iSold = db.exec(`
        SELECT COALESCE(SUM(COALESCE(qty, quantity, 1)), 0) as qty FROM sales_invoice_items
        WHERE invoice_id IN (SELECT id FROM sales_invoices WHERE date(created_at) = date('now'))`);
      const itemsSold = Number((iSold[0] as Record<string, unknown>)?.qty ?? 0);

      // KPI: SKU count
      const skuRes = db.exec(`SELECT COUNT(*) as c FROM item_master`);
      const totalSku = Number((skuRes[0] as Record<string, unknown>)?.c ?? 0);

      // KPI: Pending GRNs
      const grnRes = db.exec(`SELECT COUNT(*) as c FROM purchase_orders WHERE status = 'APPROVED'`);
      const pendingGrns = Number((grnRes[0] as Record<string, unknown>)?.c ?? 0);

      setKpi({ todayNet, todayBills, avgBill, itemsSold, totalSku, pendingGrns });

      // 7-day rolling bars
      const days: DailySales[] = [];
      for (let i = 6; i >= 0; i--) {
        const res = db.exec(`
          SELECT COALESCE(SUM(COALESCE(net_total, net_amount, 0)), 0) as net, COUNT(*) as bills
          FROM sales_invoices WHERE date(created_at) = date('now', '-${i} days')`);
        const r = res[0] as Record<string, unknown>;
        const d = new Date(); d.setDate(d.getDate() - i);
        days.push({
          day: d.toLocaleDateString("en-IN", { weekday: "short" }).slice(0, 2),
          net:   Number(r?.net   ?? 0),
          bills: Number(r?.bills ?? 0),
        });
      }
      setDaily(days);

      // Top SKUs
      const skus = db.exec(`
        SELECT sii.item_code,
               COALESCE(im.description, sii.item_code) as description,
               SUM(COALESCE(sii.total, sii.line_total, 0)) as total,
               SUM(COALESCE(sii.qty, sii.quantity, 1))    as qty
        FROM sales_invoice_items sii
        LEFT JOIN item_master im ON im.item_code = sii.item_code
        GROUP BY sii.item_code ORDER BY total DESC LIMIT 10`);
      setTopSkus(skus as unknown as TopSku[]);

      // Payment modes
      const pm = db.exec(`SELECT payment_mode, SUM(amount) as total FROM sales_payments GROUP BY payment_mode ORDER BY total DESC`);
      setPayModes(pm as unknown as PayMode[]);

      setLastRefresh(new Date().toLocaleTimeString("en-IN"));
    } catch (err) {
      console.error("[Sentinel] Query error:", err);
    }
    setLoading(false);
  }, [isReady, db]);

  useEffect(() => { refresh(); }, [refresh]);

  const fmt = (n: number) => n >= 100000 ? `₹${(n / 100000).toFixed(2)}L` : n >= 1000 ? `₹${(n / 1000).toFixed(1)}k` : `₹${n.toFixed(2)}`;

  if (!isReady) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#030712", flexDirection: "column", gap: 16, color: "#6b7280" }}>
        <Activity size={32} color="#3b82f6" style={{ animation: "spin 1.5s linear infinite" }} />
        <p style={{ fontSize: 14 }}>Loading Sentinel Engine…</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#030712", color: "#e2e8f0", fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Top Bar */}
      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(3,7,18,0.9)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid #1f2937", padding: "12px 28px",
        display: "flex", alignItems: "center", justifyContent: "space-between"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Link href="/erp" style={{ color: "#6b7280", textDecoration: "none", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
            ← ERP
          </Link>
          <div style={{ width: 1, height: 16, background: "#1f2937" }} />
          <BarChart2 size={18} color="#3b82f6" />
          <span style={{ fontWeight: 700, fontSize: 15 }}>SMRITI Sentinel</span>
          <span style={{
            background: "#1e40af22", color: "#3b82f6", border: "1px solid #1e40af55",
            borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 600
          }}>LIVE BI</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {lastRefresh && (
            <span style={{ fontSize: 11, color: "#4b5563" }}>Updated {lastRefresh}</span>
          )}
          <button
            onClick={refresh}
            disabled={loading}
            style={{
              background: "#1f2937", border: "1px solid #374151", borderRadius: 8,
              color: "#9ca3af", padding: "6px 14px", cursor: "pointer", fontSize: 12,
              display: "flex", alignItems: "center", gap: 6,
              opacity: loading ? 0.5 : 1
            }}
          >
            <RefreshCw size={12} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
            Refresh
          </button>
        </div>
      </header>

      <main style={{ padding: "28px", display: "flex", flexDirection: "column", gap: 24, maxWidth: 1400, margin: "0 auto" }}>

        {/* KPI Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 14 }}>
          <KpiTile label="Today's Revenue"    value={fmt(kpi.todayNet)}           sub="All payment modes"  icon={<TrendingUp size={18} />}  color="#10b981" />
          <KpiTile label="Bills Today"        value={kpi.todayBills.toString()}    sub="POS settlements"   icon={<ShoppingCart size={18} />} color="#3b82f6" />
          <KpiTile label="Avg Bill Value"     value={fmt(kpi.avgBill)}            sub="Per transaction"   icon={<Activity size={18} />}    color="#f59e0b" />
          <KpiTile label="Items Sold"         value={kpi.itemsSold.toString()}     sub="Units dispatched"  icon={<Package size={18} />}     color="#ec4899" />
          <KpiTile label="SKU Catalogue"      value={kpi.totalSku.toLocaleString()} sub="Active items"    icon={<Users size={18} />}       color="#a78bfa" />
          <KpiTile label="Pending Orders"     value={kpi.pendingGrns.toString()}   sub="Approved POs"     icon={<Package size={18} />}     color="#06b6d4" />
        </div>

        {/* Row 2: Revenue Trend + Payment Modes */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
          <ChartPanel title="7-Day Revenue Trend" sub="Daily net billing across all settlement modes">
            <BarSparkline data={daily} color="#3b82f6" />
            <div style={{ display: "flex", gap: 16, marginTop: 4 }}>
              {daily.slice(-3).map((d, i) => (
                <div key={i} style={{ flex: 1, background: "#0d1117", borderRadius: 8, padding: "10px 12px" }}>
                  <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>{d.day}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0", fontFamily: "monospace" }}>{fmt(d.net)}</div>
                  <div style={{ fontSize: 11, color: "#4b5563" }}>{d.bills} bill{d.bills !== 1 ? "s" : ""}</div>
                </div>
              ))}
            </div>
          </ChartPanel>
          <ChartPanel title="Payment Mode Split" sub="Cash · Card · UPI distribution">
            <DonutChart data={payModes} />
          </ChartPanel>
        </div>

        {/* Row 3: Top SKUs */}
        <ChartPanel title="Top 10 SKUs by Revenue" sub="High-velocity inventory — sorted by net contribution">
          <HorizontalBars data={topSkus} />
        </ChartPanel>

        {/* Row 4: Day Book Summary */}
        <ChartPanel title="Recent Sales Register" sub="Last 25 posted bills from the POS terminal">
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, color: "#d1d5db" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #1f2937" }}>
                  {["Bill No", "Date & Time", "Customer", "Items", "Tax (₹)", "Net Amount", "Status"].map(h => (
                    <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "#6b7280", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(() => {
                  try {
                    const rows = db?.exec(`
                      SELECT COALESCE(NULLIF(invoice_number,''), bill_number) as bill_no,
                             created_at, customer_id,
                             (SELECT COUNT(*) FROM sales_invoice_items WHERE invoice_id = si.id) as item_cnt,
                             COALESCE(tax_amount, 0) as tax,
                             COALESCE(net_total, net_amount, 0) as net,
                             COALESCE(status, 'POSTED') as status
                      FROM sales_invoices si ORDER BY created_at DESC LIMIT 25`) ?? [];
                    if (rows.length === 0) {
                      return (
                        <tr>
                          <td colSpan={7} style={{ padding: "32px", textAlign: "center", color: "#4b5563" }}>
                            No sales records yet — settle a bill from the POS terminal.
                          </td>
                        </tr>
                      );
                    }
                    return rows.map((r, i) => {
                      const row = r as Record<string, unknown>;
                      const statusColor = row.status === "SYNCED" ? "#10b981" : row.status === "POSTED" ? "#3b82f6" : "#f59e0b";
                      return (
                        <tr key={i} style={{ borderBottom: "1px solid #111827" }}>
                          <td style={{ padding: "10px 12px", color: "#a78bfa", fontFamily: "monospace" }}>{String(row.bill_no ?? "—")}</td>
                          <td style={{ padding: "10px 12px", color: "#6b7280", fontSize: 12 }}>{new Date(String(row.created_at)).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                          <td style={{ padding: "10px 12px", color: "#9ca3af", fontSize: 12 }}>{String(row.customer_id ?? "Walk-In")}</td>
                          <td style={{ padding: "10px 12px", textAlign: "center", color: "#9ca3af" }}>{String(row.item_cnt ?? 0)}</td>
                          <td style={{ padding: "10px 12px", fontFamily: "monospace", color: "#f59e0b" }}>₹{Number(row.tax).toFixed(2)}</td>
                          <td style={{ padding: "10px 12px", fontWeight: 700, fontFamily: "monospace", color: "#10b981" }}>₹{Number(row.net).toFixed(2)}</td>
                          <td style={{ padding: "10px 12px" }}>
                            <span style={{ background: `${statusColor}22`, color: statusColor, border: `1px solid ${statusColor}55`, borderRadius: 5, padding: "2px 8px", fontSize: 11 }}>
                              {String(row.status)}
                            </span>
                          </td>
                        </tr>
                      );
                    });
                  } catch {
                    return (
                      <tr>
                        <td colSpan={7} style={{ padding: "32px", textAlign: "center", color: "#4b5563" }}>
                          Querying register…
                        </td>
                      </tr>
                    );
                  }
                })()}
              </tbody>
            </table>
          </div>
        </ChartPanel>
      </main>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

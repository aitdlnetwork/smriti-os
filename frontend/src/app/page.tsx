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

import React from "react";
import Link from "next/link";

// ── Feature tile data ────────────────────────────────────────────────────────
const erpFeatures = [
  { icon: "📦", title: "Procurement", desc: "GST-compliant GRN with triple-quantity tracking and landed cost pro-ration." },
  { icon: "🏷️", title: "Item Master", desc: "Shoper 9-style 3-tab SKU entry engine with session-common fields and duplicate detection." },
  { icon: "🗂️", title: "Catalogue Hub", desc: "Item Classification, Tax Codes, Price Revisions, Promotions, Payment Modes — all unified." },
  { icon: "👥", title: "CRM & Loyalty", desc: "Customer lifecycle management, loyalty points, and targeted promotional campaigns." },
  { icon: "🔄", title: "Tally Bridge", desc: "Sync sales vouchers, purchase records, and ledgers directly with TallyPrime via XML." },
  { icon: "📊", title: "BI & Reports", desc: "Real-time analytics: sales performance, stock ageing, HSN-wise GST liability." },
];

const retailFeatures = [
  { icon: "🧾", title: "POS Billing", desc: "Keyboard-driven billing terminal with F-key discovery, multi-payment, and GST split." },
  { icon: "📦", title: "Live Inventory", desc: "Real-time stock tracking with batch control and instant multi-channel updates." },
  { icon: "🔍", title: "Stock Take", desc: "Blind audit sessions with physical vs. computed variance auto-reconciliation." },
  { icon: "💳", title: "Offline-First", desc: "Cloudflare Edge + SQLite WASM — works without internet, syncs on reconnect." },
  { icon: "🏦", title: "Day End", desc: "Till management, cash denomination reconciliation, and daily close-out reports." },
  { icon: "🤝", title: "Loyalty CRM", desc: "Earn-and-burn loyalty points with automatic customer group tax routing." },
];

const infraFeatures = [
  { icon: "☁️", title: "Cloudflare", desc: "Global Edge Network, DNS, WAF security, and serverless workers." },
  { icon: "🗄️", title: "Supabase", desc: "PostgreSQL Database, Auth, Realtime subscriptions, and backend APIs." },
  { icon: "▲", title: "Vercel", desc: "High-performance frontend hosting and serverless functions at the edge." },
  { icon: "🐙", title: "GitHub Actions", desc: "Version control with automated CI/CD pipelines and zero-downtime deploy." },
];

// ── Reusable Feature Card ─────────────────────────────────────────────────────
function FeatureCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="p2-mod p2-mod-glow" style={{ padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: '14px', height: '100%', alignItems: 'flex-start', justifyContent: 'flex-start' }}>
      <div style={{ fontSize: '36px', filter: 'drop-shadow(0 0 10px rgba(56,189,248,0.2))' }}>{icon}</div>
      <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.3px', margin: 0 }}>{title}</h3>
      <p style={{ fontSize: '13.5px', color: 'rgba(148,163,184,0.8)', lineHeight: 1.6, margin: 0 }}>{desc}</p>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function Home() {
  return (
    <div className="p2-shell p2-theme-core" style={{ minHeight: "100vh", position: "relative", zIndex: 1, overflowX: "hidden", fontFamily: "'Outfit', sans-serif" }}>
      {/* HEADER */}
      <header style={{ padding: "24px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(2, 5, 15, 0.4)", backdropFilter: "blur(20px)", position: "sticky", top: 0, zIndex: 100 }}>
        <div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="logo" style={{ fontSize: "20px", fontWeight: 900, color: "#f8fafc", letterSpacing: "2px", display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ filter: "drop-shadow(0 0 10px rgba(56,189,248,0.4))" }}>🧠</span> SMRITI-OS
          </div>

          <nav className="landing-nav" style={{ display: "flex", gap: "32px", fontSize: "14px", fontWeight: 600 }}>
            <a href="#features" style={{ color: "rgba(148,163,184,0.9)", textDecoration: "none", transition: "0.2s" }} className="hover-link">Features</a>
            <a href="#infrastructure" style={{ color: "rgba(148,163,184,0.9)", textDecoration: "none", transition: "0.2s" }} className="hover-link">Architecture</a>
            <a href="#differentiator" style={{ color: "rgba(148,163,184,0.9)", textDecoration: "none", transition: "0.2s" }} className="hover-link">Why Us</a>
          </nav>

          <div style={{ display: "flex", gap: "16px" }}>
            <Link href="/erp" className="p2-btn" style={{ fontSize: "13px", padding: "10px 20px" }}>
              🧠 ERP Dashboard
            </Link>
            <Link href="/retail" className="p2-btn-outline" style={{ fontSize: "13px", padding: "10px 20px" }}>
              🧾 POS Terminal
            </Link>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="container" style={{ padding: "120px 0", textAlign: "center", position: "relative", zIndex: 1 }}>
        <div style={{ display: "inline-flex", background: "rgba(56,189,248,0.1)", border: "1px solid rgba(56,189,248,0.3)", color: "#38bdf8", padding: "6px 16px", borderRadius: "50px", fontSize: "12px", fontWeight: 800, letterSpacing: "1px", marginBottom: "32px", backdropFilter: "blur(10px)" }}>
          💡 OFFLINE-FIRST ARCHITECTURE
        </div>

        <h1 style={{ fontSize: "64px", fontWeight: 900, lineHeight: 1.1, letterSpacing: "-2px", color: "#f8fafc", margin: "0 auto 24px auto", maxWidth: "900px" }}>
          Run Your Entire Business on <br />
          <span style={{ background: "linear-gradient(135deg, #38bdf8, #818cf8, #c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", filter: "drop-shadow(0 0 30px rgba(56,189,248,0.2))" }}>
            Memory, Not Code.
          </span>
        </h1>

        <p style={{ fontSize: "20px", color: "rgba(148,163,184,0.8)", maxWidth: "700px", margin: "0 auto 48px auto", lineHeight: 1.6, fontWeight: 500 }}>
          SMRITI-OS is a sovereign, database-driven ERP that simplifies procurement,
          inventory, POS billing, loyalty CRM and Tally sync — all in one offline-first edge platform.
        </p>

        <div style={{ display: "flex", justifyContent: "center", gap: "20px", marginBottom: "60px" }}>
          <Link href="/erp" className="p2-btn" style={{ padding: "16px 32px", fontSize: "15px" }}>
            Launch ERP Dashboard →
          </Link>
          <Link href="/retail" className="p2-btn-outline" style={{ padding: "16px 32px", fontSize: "15px" }}>
            Open POS Terminal
          </Link>
        </div>

        <div style={{ fontSize: "13px", fontWeight: 700, color: "rgba(148,163,184,0.5)", letterSpacing: "2px", textTransform: "uppercase" }}>
          LESS CODE. MORE CONTROL. SMARTER WORKFLOWS.
        </div>
      </section>

      {/* FEATURE HIGHLIGHTS */}
      <section id="features" className="container" style={{ padding: "80px 0" }}>

        {/* MODULE 1: SmritiERP */}
        <div style={{ marginBottom: "100px" }}>
          <div style={{ textAlign: "center", marginBottom: "48px" }}>
            <h2 style={{ fontSize: "36px", fontWeight: 900, color: "#f8fafc", marginBottom: "12px", letterSpacing: "-1px" }}>Smriti<span style={{ color: "#38bdf8" }}>ERP</span></h2>
            <p style={{ fontSize: "16px", color: "rgba(148,163,184,0.8)", fontWeight: 500 }}>Complete enterprise lifecycle — from procurement to accounting sync.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px" }}>
            {erpFeatures.map((f) => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </div>
        </div>

        {/* MODULE 2: SmritiBusinessPlusRetail */}
        <div>
          <div style={{ textAlign: "center", marginBottom: "48px" }}>
            <h2 style={{ fontSize: "36px", fontWeight: 900, color: "#f8fafc", marginBottom: "12px", letterSpacing: "-1px" }}>Smriti<span style={{ color: "#c084fc" }}>BusinessPlusRetail</span></h2>
            <p style={{ fontSize: "16px", color: "rgba(148,163,184,0.8)", fontWeight: 500 }}>High-velocity retail operations built for brick-and-mortar India.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px" }}>
            {retailFeatures.map((f) => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </div>
        </div>
      </section>

      {/* INFRASTRUCTURE SECTION */}
      <section id="infrastructure" className="container" style={{ padding: "100px 0", borderTop: "1px solid rgba(255,255,255,0.05)", position: "relative" }}>
        
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "24px" }}>
          <div style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", color: "#10b981", padding: "6px 16px", borderRadius: "50px", fontSize: "12px", fontWeight: 800, letterSpacing: "1px" }}>
            🏗️ ZERO UPFRONT COST ARCHITECTURE
          </div>
        </div>

        <h2 style={{ fontSize: "40px", fontWeight: 900, color: "#f8fafc", textAlign: "center", marginBottom: "16px", letterSpacing: "-1px" }}>
          Enterprise Infra. Zero Initial Cost.
        </h2>

        <p style={{ textAlign: "center", color: "rgba(148,163,184,0.8)", maxWidth: "700px", margin: "0 auto 60px auto", fontSize: "18px", lineHeight: 1.6 }}>
          Built on the best-in-class edge infrastructure — scale from 1 terminal
          to a multi-store chain without changing the architecture.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "24px" }}>
          {infraFeatures.map((f) => (
            <div key={f.title} className="p2-mod" style={{ textAlign: "center", padding: "40px 24px", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ marginBottom: "20px", fontSize: "40px", filter: "drop-shadow(0 0 10px rgba(255,255,255,0.1))" }}>{f.icon}</div>
              <h3 style={{ fontSize: "18px", fontWeight: 800, color: "#f8fafc", marginBottom: "12px" }}>{f.title}</h3>
              <p style={{ fontSize: "13px", color: "rgba(148,163,184,0.7)", lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* DIFFERENTIATOR SECTION */}
      <section id="differentiator" style={{ background: "rgba(15,23,42,0.8)", borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)", padding: "100px 0" }}>
        <div className="container" style={{ display: "flex", gap: "60px", alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 400px" }}>
            <h2 style={{ fontSize: "48px", fontWeight: 900, color: "#f8fafc", marginBottom: "24px", letterSpacing: "-1px" }}>
              Why <span style={{ color: "#38bdf8" }}>SMRITI-OS?</span>
            </h2>
            <p style={{ color: "rgba(148,163,184,0.8)", fontSize: "20px", marginBottom: "40px", lineHeight: 1.6, fontWeight: 500 }}>
              We threw out the scattered code layers to rebuild business intelligence
              right where it belongs: in the robust offline-first database.
            </p>
            <Link href="/erp" className="p2-btn" style={{ padding: "16px 32px", fontSize: "15px" }}>
              Experience the Speed →
            </Link>
          </div>

          <ul style={{ flex: "1 1 400px", listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "20px" }}>
            {[
              { icon: "✅", text: "Logic stored in database — not scattered across code files" },
              { icon: "⚡", text: "Offline-first WASM engine — works without internet" },
              { icon: "🔄", text: "Fully configurable workflows without writing code" },
              { icon: "🇮🇳", text: "Built for India — GST, HSN, Tally integration out of the box" },
              { icon: "🚀", text: "Built for speed, scale, and sovereign data control" },
            ].map((item, idx) => (
              <li key={idx} className="p2-mod" style={{ padding: "20px", display: "flex", gap: "16px", alignItems: "center", background: "rgba(2,5,15,0.6)" }}>
                <span style={{ fontSize: "24px" }}>{item.icon}</span>
                <span style={{ fontSize: "16px", fontWeight: 600, color: "#f1f5f9" }}>{item.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ padding: "60px 0", textAlign: "center" }}>
        <div className="container">
          <div style={{ marginBottom: "40px" }}>
            <span style={{ display: "inline-block", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", padding: "4px 12px", borderRadius: "50px", fontSize: "11px", fontWeight: 800, color: "rgba(148,163,184,0.8)", letterSpacing: "1px", marginBottom: "16px" }}>INVESTOR PITCH</span>
            <p style={{ fontSize: "24px", fontWeight: 800, color: "#f8fafc", fontStyle: "italic", maxWidth: "800px", margin: "0 auto" }}>
              &ldquo;We&apos;re redefining ERP by turning the database into the brain of the system.&rdquo;
            </p>
          </div>

          <div style={{ display: "flex", justifyContent: "center", gap: "16px", marginBottom: "48px", flexWrap: "wrap" }}>
            <Link href="/erp" className="p2-btn" style={{ fontSize: "14px", padding: "12px 28px" }}>
              🧠 SmritiERP Dashboard
            </Link>
            <Link href="/retail" className="p2-btn-outline" style={{ fontSize: "14px", padding: "12px 28px" }}>
              🧾 POS Billing Terminal
            </Link>
          </div>

          <div className="p2-mod" style={{ maxWidth: "600px", margin: "0 auto 32px auto", padding: "24px", background: "rgba(15,23,42,0.5)" }}>
            <div style={{ fontSize: "14px", fontWeight: 900, letterSpacing: "2.5px", color: "#38bdf8", marginBottom: "12px" }}>
              AITDL NETWORK
            </div>
            <div style={{ fontSize: "14px", color: "rgba(148,163,184,0.8)", lineHeight: 1.8 }}>
              System Architect: <span style={{ color: "#f8fafc", fontWeight: 700 }}>Jawahar R Mallah</span>
              <br />
              <span style={{ fontSize: "12.5px", fontFamily: "'JetBrains Mono', monospace", color: "rgba(148,163,184,0.6)" }}>
                aitdlnetwork@outlook.com &nbsp;|&nbsp; jawahar@aitdl.in
              </span>
            </div>
          </div>

          <div style={{ fontSize: "13px", color: "rgba(148,163,184,0.5)" }}>
            &copy; 2026 AITDL.com &amp; AITDL.in. All Rights Reserved. &mdash; SMRITI-OS Enterprise Edition
          </div>
        </div>
      </footer>
    </div>
  );
}

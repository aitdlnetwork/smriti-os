/**
 * SMRITI-OS · Prism Design System
 * Global "Not Found" Engine (404)
 * A premium, immersive experience for untracked sovereign routes.
 */
"use client";

import React from "react";
import Link from "next/link";
import { Home, Search, AlertTriangle, Zap, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div style={{
      height: "100vh",
      width: "100vw",
      background: "#020617",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "Inter, sans-serif",
      color: "#f8fafc",
      overflow: "hidden",
      position: "relative"
    }}>
      {/* ── Background VFX (Ambient Glows) ── */}
      <div style={{ position: "absolute", top: "20%", left: "30%", width: 400, height: 400, background: "rgba(56, 189, 248, 0.05)", filter: "blur(120px)", borderRadius: "50%", zIndex: 0 }}></div>
      <div style={{ position: "absolute", bottom: "10%", right: "20%", width: 500, height: 500, background: "rgba(139, 92, 246, 0.05)", filter: "blur(150px)", borderRadius: "50%", zIndex: 0 }}></div>

      <div style={{ zIndex: 10, textAlign: "center", maxWidth: 600, padding: 40 }}>
        {/* ── Error Identity ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 24 }}>
          <Zap size={24} color="#38bdf8" />
          <span style={{ fontSize: 14, fontWeight: 900, letterSpacing: 4, color: "#38bdf8", opacity: 0.8 }}>SMRITI-OS TELEMETRY</span>
        </div>

        <h1 style={{
          fontSize: "12rem",
          fontWeight: 900,
          margin: 0,
          lineHeight: 0.8,
          background: "linear-gradient(180deg, #fff, #64748b)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          letterSpacing: "-0.05em",
          animation: "pulse404 4s ease-in-out infinite",
          filter: "drop-shadow(0 0 30px rgba(56, 189, 248, 0.2))"
        }}>404</h1>

        <p style={{ fontSize: 24, fontWeight: 300, color: "#cbd5e1", marginTop: 20 }}>
          Resource <span style={{ color: "#38bdf8", fontWeight: 600 }}>Not Found</span> in Sovereign Hub
        </p>

        {/* ── Diagnostic Box ── */}
        <div style={{
          background: "rgba(30, 41, 59, 0.4)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(148, 163, 184, 0.1)",
          padding: 24,
          borderRadius: 12,
          marginTop: 40,
          textAlign: "left",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 12,
          color: "#94a3b8",
          boxShadow: "0 20px 50px rgba(0,0,0,0.5)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <AlertTriangle size={14} color="#fbbf24" />
            <span style={{ color: "#fbbf24" }}>CRITICAL_ADDR_FAULT</span>
          </div>
          <div>&gt; ATTEMPTING_ROUTE_RESOLUTION... FAILED</div>
          <div>&gt; SECTOR: SOVEREIGN_CORE_V2</div>
          <div>&gt; ERROR_SIG: 0x88404_NULL_REFERENCE</div>
          <div style={{ marginTop: 12, color: "#38bdf8" }}>[SYSTEM] Please navigate to a registered ledger.</div>
        </div>

        {/* ── Action Hub ── */}
        <div style={{ display: "flex", gap: 16, marginTop: 40, justifyContent: "center" }}>
           <Link href="/erp" style={{ textDecoration: "none" }}>
              <button className="prism-btn primary">
                 <Home size={18} />
                 <span>DASHBOARD [F1]</span>
              </button>
           </Link>
           <button onClick={() => window.history.back()} className="prism-btn outline">
              <ArrowLeft size={18} />
              <span>GO BACK</span>
           </button>
        </div>
      </div>

      {/* ── Footer Integrity ── */}
      <footer style={{ position: "absolute", bottom: 40, opacity: 0.4, fontSize: 10, letterSpacing: 1 }}>
         © 2024 AITDL NETWORK · SECURED SOVEREIGN ENVIRONMENT
      </footer>

      <style>{`
        @keyframes pulse404 {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(0.98); }
        }

        .prism-btn {
          display: flex;
          align-items: center;
          gap: 12;
          padding: 14px 28px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          border: none;
          letter-spacing: 1px;
        }

        .prism-btn.primary {
          background: #38bdf8;
          color: #020617;
          box-shadow: 0 0 20px rgba(56, 189, 248, 0.3);
        }
        .prism-btn.primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 0 30px rgba(56, 189, 248, 0.5);
          background: #7dd3fc;
        }

        .prism-btn.outline {
          background: rgba(30, 41, 59, 0.5);
          color: #fff;
          border: 1px solid rgba(255,255,255,0.1);
        }
        .prism-btn.outline:hover {
          background: rgba(148, 163, 184, 0.1);
          border-color: rgba(255,255,255,0.3);
        }
      `}</style>
    </div>
  );
}

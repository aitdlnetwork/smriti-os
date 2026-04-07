/**
 * SMRITI-OS · Prism Design System
 * PageShell — Universal page wrapper used by every ERP sub-page.
 * Provides: sticky topbar, breadcrumb, loading state, consistent shell.
 */
"use client";
import React from "react";
import Link from "next/link";
import { ChevronRight, ArrowLeft } from "lucide-react";
import { Spinner } from "./index";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageShellProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  statusDot?: "online" | "warning" | "offline";
  loading?: boolean;
  error?: string;
  children: React.ReactNode;
  maxWidth?: string | number;
  noPadding?: boolean;
}

const DOT_COLORS = { online: "#10b981", warning: "#f59e0b", offline: "#ef4444" };

export default function PageShell({
  title, subtitle, icon, breadcrumbs, actions, statusDot,
  loading, error, children, maxWidth = 1400, noPadding,
}: PageShellProps) {

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh", background: "var(--color-bg)",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexDirection: "column", gap: 16, color: "var(--color-text-tertiary)",
        fontFamily: "var(--font-family)",
      }}>
        <Spinner size={32} color="var(--color-primary)" />
        <p style={{ fontSize: "var(--font-size-md)", margin: 0 }}>Initializing…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        minHeight: "100vh", background: "var(--color-bg)",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexDirection: "column", gap: 12, fontFamily: "var(--font-family)",
      }}>
        <p style={{ color: "var(--color-danger)", fontSize: "var(--font-size-lg)", fontWeight: 700 }}>Engine Error</p>
        <p style={{ color: "var(--color-text-tertiary)", fontSize: "var(--font-size-md)", maxWidth: 400, textAlign: "center" }}>{error}</p>
      </div>
    );
  }

  const defaultBack = breadcrumbs?.[breadcrumbs.length - 2];

  return (
    <div style={{
      minHeight: "100vh", background: "var(--color-bg)",
      color: "var(--color-text-primary)", fontFamily: "var(--font-family)",
      display: "flex", flexDirection: "column",
    }}>

      {/* ── TOPBAR ──────────────────────────────────────────────────────── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 60,
        height: "var(--topbar-height)",
        background: "rgba(5, 7, 15, 0.85)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid var(--color-border)",
        display: "flex", alignItems: "center",
        padding: "0 20px", gap: 12,
        flexShrink: 0,
      }}>

        {/* Back nav */}
        {defaultBack && (
          <Link href={defaultBack.href ?? "/erp"} style={{
            display: "flex", alignItems: "center", gap: 6,
            color: "var(--color-text-tertiary)", textDecoration: "none", fontSize: "var(--font-size-sm)",
            padding: "6px 10px", borderRadius: "var(--radius-sm)",
            transition: "all var(--motion-fast) var(--motion-ease)",
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--color-text-primary)"; (e.currentTarget as HTMLAnchorElement).style.background = "var(--color-surface-2)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--color-text-tertiary)"; (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; }}
          >
            <ArrowLeft size={14} />
            {defaultBack.label}
          </Link>
        )}

        {/* Breadcrumbs */}
        {breadcrumbs && (
          <nav style={{ display: "flex", alignItems: "center", gap: 4, flex: 1, minWidth: 0 }}>
            {breadcrumbs.map((b, i) => {
              const isLast = i === breadcrumbs.length - 1;
              return (
                <React.Fragment key={i}>
                  {i > 0 && <ChevronRight size={12} color="var(--color-text-disabled)" style={{ flexShrink: 0 }} />}
                  {b.href && !isLast ? (
                    <Link href={b.href} style={{
                      fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)",
                      textDecoration: "none", whiteSpace: "nowrap",
                      transition: "color var(--motion-fast) var(--motion-ease)",
                    }}
                      onMouseEnter={e => (e.currentTarget.style.color = "var(--color-text-primary)")}
                      onMouseLeave={e => (e.currentTarget.style.color = "var(--color-text-secondary)")}
                    >{b.label}</Link>
                  ) : (
                    <span style={{
                      fontSize: "var(--font-size-sm)", whiteSpace: "nowrap",
                      color: isLast ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                      fontWeight: isLast ? 600 : 400,
                    }}>{b.label}</span>
                  )}
                </React.Fragment>
              );
            })}
          </nav>
        )}

        {/* Title (if no breadcrumbs) */}
        {!breadcrumbs && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
            {icon && <span style={{ color: "var(--color-primary)", display: "flex" }}>{icon}</span>}
            <span style={{ fontSize: "var(--font-size-md)", fontWeight: 700, color: "var(--color-text-primary)" }}>{title}</span>
          </div>
        )}

        {/* Status dot */}
        {statusDot && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{
              width: 7, height: 7, borderRadius: "50%",
              background: DOT_COLORS[statusDot],
              boxShadow: `0 0 8px ${DOT_COLORS[statusDot]}`,
              animation: statusDot === "online" ? "prism-pulse 2s ease-in-out infinite" : undefined,
            }} />
            <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)", fontWeight: 500 }}>
              {statusDot === "online" ? "Live" : statusDot === "warning" ? "Degraded" : "Offline"}
            </span>
          </div>
        )}

        {/* Actions */}
        {actions && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {actions}
          </div>
        )}
      </header>

      {/* ── PAGE HERO HEADER ────────────────────────────────────────────── */}
      <div style={{
        borderBottom: "1px solid var(--color-border)",
        padding: "20px 24px 18px",
        background: "linear-gradient(180deg, var(--color-surface-0) 0%, transparent 100%)",
      }}>
        <div style={{ maxWidth, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {icon && (
              <div style={{
                width: 38, height: 38, borderRadius: "var(--radius-md)",
                background: "var(--color-primary-tonal)",
                border: "1px solid rgba(99,102,241,0.25)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--color-primary)", flexShrink: 0,
              }}>{icon}</div>
            )}
            <div>
              <h1 style={{ fontSize: "var(--font-size-xl)", fontWeight: 700, margin: 0, lineHeight: "var(--line-height-tight)", color: "var(--color-text-primary)" }}>{title}</h1>
              {subtitle && <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-tertiary)", margin: "3px 0 0" }}>{subtitle}</p>}
            </div>
          </div>
          {actions && <div style={{ display: "flex", gap: 8 }}>{actions}</div>}
        </div>
      </div>

      {/* ── CONTENT ─────────────────────────────────────────────────────── */}
      <main style={{
        flex: 1, overflowY: "auto",
        padding: noPadding ? 0 : "24px",
        maxWidth: undefined, // full width, inner containers control max-width
      }}>
        <div style={{ maxWidth, margin: "0 auto" }}>
          {children}
        </div>
      </main>
    </div>
  );
}

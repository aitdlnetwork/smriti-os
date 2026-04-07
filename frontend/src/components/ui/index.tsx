/**
 * SMRITI-OS · Prism Design System
 * Primitive UI Components — Button, Card, StatusBadge, FormField, DataTable, Divider
 */
"use client";
import React from "react";

// ─── Button ───────────────────────────────────────────────────────────────────
type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "success";
type ButtonSize    = "xs" | "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
}

const btnBase = "inline-flex items-center gap-2 font-semibold rounded cursor-pointer border select-none transition-all";

const btnVariants: Record<ButtonVariant, React.CSSProperties> = {
  primary:   { background: "var(--color-primary)",    color: "#fff",                       border: "1px solid transparent" },
  secondary: { background: "var(--color-surface-2)",  color: "var(--color-text-primary)",  border: "1px solid var(--color-border-strong)" },
  ghost:     { background: "transparent",              color: "var(--color-text-secondary)", border: "1px solid transparent" },
  danger:    { background: "var(--color-danger-tonal)", color: "var(--color-danger)",         border: "1px solid rgba(239,68,68,0.3)" },
  success:   { background: "var(--color-success-tonal)", color: "var(--color-success)",    border: "1px solid rgba(16,185,129,0.3)" },
};

const btnSizes: Record<ButtonSize, React.CSSProperties> = {
  xs: { padding: "4px 10px",   fontSize: "var(--font-size-xs)", borderRadius: "var(--radius-sm)", gap: 4 },
  sm: { padding: "6px 14px",   fontSize: "var(--font-size-sm)", borderRadius: "var(--radius-sm)", gap: 6 },
  md: { padding: "8px 18px",   fontSize: "var(--font-size-md)", borderRadius: "var(--radius-md)", gap: 8 },
  lg: { padding: "11px 24px",  fontSize: "var(--font-size-lg)", borderRadius: "var(--radius-md)", gap: 8 },
};

export function Button({ variant = "primary", size = "md", loading, icon, iconRight, children, style, disabled, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      style={{
        ...btnVariants[variant],
        ...btnSizes[size],
        display: "inline-flex",
        alignItems: "center",
        fontFamily: "var(--font-family)",
        fontWeight: "var(--font-weight-semibold)" as never,
        cursor: disabled || loading ? "not-allowed" : "pointer",
        opacity: disabled || loading ? 0.5 : 1,
        transition: "var(--transition)",
        outline: "none",
        ...style,
      }}
    >
      {loading ? <Spinner size={14} /> : icon}
      {children}
      {iconRight}
    </button>
  );
}

// ─── Spinner ──────────────────────────────────────────────────────────────────
export function Spinner({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      style={{ animation: "prism-spin 0.8s linear infinite", flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="3" strokeOpacity="0.2" />
      <path d="M12 2 A10 10 0 0 1 22 12" stroke={color} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────
interface CardProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
  hover?: boolean;
  accent?: string;
  padding?: string;
  onClick?: () => void;
}
export function Card({ children, style, hover, accent, padding = "20px", onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      style={{
        background: "var(--color-surface-1)",
        border: `1px solid ${accent ? `${accent}40` : "var(--color-border)"}`,
        borderRadius: "var(--radius-md)",
        padding,
        position: "relative",
        overflow: "hidden",
        cursor: onClick ? "pointer" : undefined,
        transition: hover || onClick ? "var(--transition)" : undefined,
        ...(accent && { boxShadow: `0 0 0 1px ${accent}20, 0 4px 20px ${accent}10` }),
        ...style,
      }}
      onMouseEnter={hover || onClick ? (e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = accent ? accent : "var(--color-border-strong)";
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-1px)";
      } : undefined}
      onMouseLeave={hover || onClick ? (e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = accent ? `${accent}40` : "var(--color-border)";
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
      } : undefined}
    >
      {accent && (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 2,
          background: `linear-gradient(90deg, ${accent}, transparent)`,
        }} />
      )}
      {children}
    </div>
  );
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────
type StatusType = "success" | "warning" | "danger" | "info" | "neutral" | "primary";

const statusColors: Record<StatusType, { bg: string; text: string; border: string }> = {
  success: { bg: "var(--color-success-tonal)", text: "var(--color-success)", border: "rgba(16,185,129,0.3)" },
  warning: { bg: "var(--color-warning-tonal)", text: "var(--color-warning)", border: "rgba(245,158,11,0.3)" },
  danger:  { bg: "var(--color-danger-tonal)",  text: "var(--color-danger)",  border: "rgba(239,68,68,0.3)" },
  info:    { bg: "var(--color-info-tonal)",    text: "var(--color-info)",    border: "rgba(56,189,248,0.3)" },
  neutral: { bg: "rgba(255,255,255,0.06)",     text: "var(--color-text-secondary)", border: "var(--color-border-strong)" },
  primary: { bg: "var(--color-primary-tonal)", text: "var(--color-primary)", border: "rgba(99,102,241,0.3)" },
};

export function inferStatus(value: string): StatusType {
  const v = value?.toUpperCase();
  if (["POSTED", "APPROVED", "ACTIVE", "PAID"].includes(v)) return "success";
  if (["PENDING", "DRAFT", "OPEN"].includes(v))              return "warning";
  if (["CANCELLED", "REJECTED", "VOID"].includes(v))         return "danger";
  if (["SYNCED", "COMPLETED"].includes(v))                   return "info";
  if (["CORE", "NEW"].includes(v))                           return "primary";
  return "neutral";
}

export function StatusBadge({ label, type, dot }: { label: string; type?: StatusType; dot?: boolean }) {
  const resolved = type ?? inferStatus(label);
  const c = statusColors[resolved];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      background: c.bg, color: c.text, border: `1px solid ${c.border}`,
      borderRadius: "var(--radius-pill)",
      padding: "3px 10px", fontSize: "var(--font-size-xs)", fontWeight: 600,
      whiteSpace: "nowrap", letterSpacing: "0.3px",
    }}>
      {dot && <span style={{ width: 5, height: 5, borderRadius: "50%", background: c.text, flexShrink: 0 }} />}
      {label}
    </span>
  );
}

// ─── FormField ────────────────────────────────────────────────────────────────
interface FormFieldProps {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  style?: React.CSSProperties;
}
export function FormField({ label, hint, error, required, children, style }: FormFieldProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, ...style }}>
      {label && (
        <label style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-medium)" as never, color: "var(--color-text-secondary)" }}>
          {label}
          {required && <span style={{ color: "var(--color-danger)", marginLeft: 2 }}>*</span>}
        </label>
      )}
      {children}
      {hint  && !error && <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)" }}>{hint}</span>}
      {error && <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-danger)" }}>{error}</span>}
    </div>
  );
}

export const inputStyles: React.CSSProperties = {
  width: "100%", boxSizing: "border-box",
  padding: "9px 13px", fontSize: "var(--font-size-md)",
  fontFamily: "var(--font-family)",
  background: "var(--color-surface-2)",
  border: "1px solid var(--color-border-strong)",
  borderRadius: "var(--radius-md)",
  color: "var(--color-text-primary)",
  outline: "none",
  transition: "border-color var(--motion-fast) var(--motion-ease), box-shadow var(--motion-fast) var(--motion-ease)",
};

// ─── DataTable ────────────────────────────────────────────────────────────────
export interface TableColumn<T> {
  key: string;
  header: string;
  width?: string;
  align?: "left" | "right" | "center";
  render?: (value: unknown, row: T, index: number) => React.ReactNode;
}

interface DataTableProps<T extends Record<string, unknown>> {
  columns: TableColumn<T>[];
  rows: T[];
  emptyMessage?: string;
  loading?: boolean;
  style?: React.CSSProperties;
  stickyHeader?: boolean;
}

export function DataTable<T extends Record<string, unknown>>({
  columns, rows, emptyMessage = "No data available", loading, style, stickyHeader,
}: DataTableProps<T>) {
  return (
    <div style={{ overflowX: "auto", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)", ...style }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--font-size-md)", color: "var(--color-text-primary)" }}>
        <thead style={{
          background: "var(--color-surface-2)",
          borderBottom: "1px solid var(--color-border-strong)",
          position: stickyHeader ? "sticky" : undefined, top: stickyHeader ? 0 : undefined, zIndex: stickyHeader ? 1 : undefined,
        }}>
          <tr>
            {columns.map(col => (
              <th key={col.key} style={{
                padding: "var(--table-cell-padding)",
                textAlign: col.align ?? "left",
                fontSize: "var(--font-size-xs)", fontWeight: 700,
                textTransform: "uppercase", letterSpacing: "0.6px",
                color: "var(--color-text-tertiary)", whiteSpace: "nowrap",
                width: col.width,
              }}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} style={{ borderBottom: "1px solid var(--color-border)" }}>
                {columns.map(col => (
                  <td key={col.key} style={{ padding: "var(--table-cell-padding)" }}>
                    <div style={{ height: 14, borderRadius: 4, background: "var(--color-surface-3)", width: `${60 + Math.random() * 30}%`, animation: "prism-shimmer 1.6s ease-in-out infinite" }} />
                  </td>
                ))}
              </tr>
            ))
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} style={{ padding: "40px", textAlign: "center", color: "var(--color-text-tertiary)", fontSize: "var(--font-size-md)" }}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={i} style={{ borderBottom: "1px solid var(--color-border)", transition: "background var(--motion-fast) var(--motion-ease)" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--color-surface-3)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                {columns.map(col => (
                  <td key={col.key} style={{ padding: "var(--table-cell-padding)", textAlign: col.align ?? "left", verticalAlign: "middle" }}>
                    {col.render ? col.render(row[col.key], row, i) : String(row[col.key] ?? "—")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── Divider ──────────────────────────────────────────────────────────────────
export function Divider({ label, style }: { label?: string; style?: React.CSSProperties }) {
  if (!label) return <div style={{ height: 1, background: "var(--color-border)", ...style }} />;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, ...style }}>
      <div style={{ flex: 1, height: 1, background: "var(--color-border)" }} />
      <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: "var(--color-border)" }} />
    </div>
  );
}

// ─── SectionHeader ────────────────────────────────────────────────────────────
export function SectionHeader({ title, sub, actions, style }: { title: string; sub?: string; actions?: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, ...style }}>
      <div>
        <h2 style={{ fontSize: "var(--font-size-xl)", fontWeight: "var(--font-weight-bold)" as never, color: "var(--color-text-primary)", margin: 0, lineHeight: "var(--line-height-tight)" }}>{title}</h2>
        {sub && <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-tertiary)", margin: "4px 0 0" }}>{sub}</p>}
      </div>
      {actions && <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>{actions}</div>}
    </div>
  );
}

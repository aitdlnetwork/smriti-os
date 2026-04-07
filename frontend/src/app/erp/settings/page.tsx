/**
 * SMRITI-OS · Master Settings Hub
 * Prism Design System — Universal UI + Business Parameters
 */
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSmritiDB } from "@/lib/useSmritiDB";
import { localDB } from "@/lib/db";
import PageShell from "@/components/ui/PageShell";
import { Button, Card, SectionHeader, FormField, Divider, StatusBadge } from "@/components/ui";
import { Settings, Store, Hash, Palette, Save, RotateCcw, Check } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface UiParam { id: string; param_key: string; param_value: string; description: string; attribute_type: string; }

const FONT_OPTIONS = ["Inter", "DM Sans", "Geist", "Outfit"];
const RADIUS_OPTIONS = [
  { key: "sharp", label: "Sharp",      preview: "2px" },
  { key: "sm",    label: "Compact",    preview: "6px" },
  { key: "md",    label: "Rounded",    preview: "10px" },
  { key: "lg",    label: "Soft",       preview: "16px" },
  { key: "xl",    label: "Bubble",     preview: "24px" },
];
const DENSITY_OPTIONS = [
  { key: "compact",     label: "Compact",      desc: "6px vertical — max data" },
  { key: "normal",      label: "Normal",        desc: "10px vertical — balanced" },
  { key: "comfortable", label: "Comfortable",   desc: "16px vertical — spacious" },
];

// ─── Live preview injector ────────────────────────────────────────────────────
function applyPreview(key: string, value: string) {
  const root = document.documentElement;
  const RADIUS_MAP: Record<string, string> = { sharp: "4px", sm: "6px", md: "10px", lg: "16px", xl: "24px" };
  const FONT_MAP: Record<string, string> = {
    "Inter":    "Inter, -apple-system, system-ui, sans-serif",
    "DM Sans":  "'DM Sans', system-ui, sans-serif",
    "Geist":    "Geist, system-ui, sans-serif",
    "Outfit":   "Outfit, system-ui, sans-serif",
  };
  if (key === "theme_accent_primary")   root.style.setProperty("--color-primary", value);
  if (key === "theme_accent_secondary") root.style.setProperty("--color-secondary", value);
  if (key === "theme_radius_scale")     root.style.setProperty("--radius-base", RADIUS_MAP[value] ?? "10px");
  if (key === "theme_font_family")      root.style.setProperty("--font-family", FONT_MAP[value] ?? value);
  if (key === "enable_animations")      root.style.setProperty("--motion-duration", value === "1" ? "220ms" : "0ms");
  if (key === "table_row_density") {
    const p: Record<string, string> = { compact: "6px 10px", normal: "10px 14px", comfortable: "16px 18px" };
    root.style.setProperty("--table-cell-padding", p[value] ?? "10px 14px");
  }
}

// ─── Colour Swatch ────────────────────────────────────────────────────────────
function ColorPicker({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <input type="color" value={value} onChange={e => onChange(e.target.value)}
        style={{ width: 40, height: 40, borderRadius: 8, border: "none", cursor: "pointer", background: "none", padding: 2 }} />
      <div>
        <div style={{ fontSize: "var(--font-size-sm)", fontWeight: 600, color: "var(--color-text-primary)" }}>{label}</div>
        <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)", fontFamily: "monospace" }}>{value}</div>
      </div>
      <div style={{ width: 24, height: 24, borderRadius: 6, background: value, marginLeft: "auto", border: "1px solid var(--color-border-strong)" }} />
    </div>
  );
}

// ─── Main Settings Page ───────────────────────────────────────────────────────
export default function MasterSettings() {
  const { isReady } = useSmritiDB();
  const [storeInfo, setStoreInfo]   = useState<Record<string, string>>({ name: "", address_line1: "", city: "", state: "", pincode: "", gstin: "", pan_no: "" });
  const [configs,   setConfigs]     = useState<Record<string, string>[]>([]);
  const [prefixes,  setPrefixes]    = useState<Record<string, string>[]>([]);
  const [uiParams,  setUiParams]    = useState<UiParam[]>([]);
  const [uiState,   setUiState]     = useState<Record<string, string>>({});
  const [saved, setSaved]           = useState(false);
  const [tab, setTab]               = useState<"store" | "params" | "theming">("store");

  const loadData = useCallback(() => {
    try {
      const profile = localDB.exec("SELECT * FROM store_profile LIMIT 1");
      if (profile.length > 0) setStoreInfo(profile[0] as Record<string, string>);
      setConfigs(localDB.exec("SELECT * FROM configurations") as Record<string, string>[]);
      setPrefixes(localDB.exec("SELECT * FROM numbering_prefixes") as Record<string, string>[]);
      const ui = localDB.exec("SELECT * FROM system_parameters WHERE category = 'UI' ORDER BY param_key") as unknown as UiParam[];
      setUiParams(ui);
      const state: Record<string, string> = {};
      ui.forEach(p => { state[p.param_key] = p.param_value; });
      setUiState(state);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { if (isReady) loadData(); }, [isReady, loadData]);

  const updateUi = (key: string, value: string) => {
    setUiState(prev => ({ ...prev, [key]: value }));
    applyPreview(key, value);
  };

  const saveUiParams = async () => {
    for (const p of uiParams) {
      localDB.run("UPDATE system_parameters SET param_value = ? WHERE param_key = ? AND category = 'UI'", [uiState[p.param_key] ?? p.param_value, p.param_key]);
    }
    await localDB.save();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const saveProfile = async () => {
    localDB.run(`UPDATE store_profile SET name=?,address_line1=?,city=?,state=?,pincode=?,gstin=?,pan_no=? WHERE id=?`,
      [storeInfo.name, storeInfo.address_line1, storeInfo.city, storeInfo.state, storeInfo.pincode, storeInfo.gstin, storeInfo.pan_no, storeInfo.id]);
    await localDB.save();
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box", padding: "9px 12px",
    fontSize: "var(--font-size-md)", fontFamily: "var(--font-family)",
    background: "var(--color-surface-2)", border: "1px solid var(--color-border-strong)",
    borderRadius: "var(--radius-md)", color: "var(--color-text-primary)", outline: "none",
  };

  const TABS: { key: typeof tab; label: string; icon: React.ReactNode }[] = [
    { key: "store",   label: "Store Profile",      icon: <Store size={14} /> },
    { key: "params",  label: "System Parameters",  icon: <Settings size={14} /> },
    { key: "theming", label: "UI & Theming",        icon: <Palette size={14} /> },
  ];

  if (!isReady) return <PageShell title="Settings" loading breadcrumbs={[{ label: "ERP", href: "/erp" }, { label: "Settings" }]}>{null}</PageShell>;

  return (
    <PageShell
      title="Master Settings"
      subtitle="Store profile, system parameters, UI theming, and numbering prefixes."
      icon={<Settings size={18} />}
      breadcrumbs={[{ label: "ERP", href: "/erp" }, { label: "Settings" }]}
      actions={
        <Button variant={saved ? "success" : "primary"} size="sm" icon={saved ? <Check size={14} /> : <Save size={14} />}
          onClick={tab === "theming" ? saveUiParams : saveProfile}>
          {saved ? "Saved!" : "Save Changes"}
        </Button>
      }
    >
      {/* ── Tab Bar ── */}
      <div style={{ display: "flex", gap: 2, marginBottom: 24, background: "var(--color-surface-1)", borderRadius: "var(--radius-md)", padding: 4, border: "1px solid var(--color-border)" }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            padding: "8px 16px", borderRadius: "var(--radius-sm)", border: "none", cursor: "pointer",
            fontSize: "var(--font-size-sm)", fontWeight: 600, fontFamily: "var(--font-family)",
            background: tab === t.key ? "var(--color-surface-3)" : "transparent",
            color: tab === t.key ? "var(--color-text-primary)" : "var(--color-text-tertiary)",
            transition: "var(--transition)",
          }}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ── Store Profile Tab ── */}
      {tab === "store" && (
        <Card>
          <SectionHeader title="Company / Store Profile" sub="Printed on all invoices and tax documents." style={{ marginBottom: 20 }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <FormField label="Store Name" required>
              <input style={inputStyle} value={storeInfo.name ?? ""} onChange={e => setStoreInfo({ ...storeInfo, name: e.target.value })} />
            </FormField>
            <FormField label="GSTIN">
              <input style={{ ...inputStyle, fontFamily: "monospace", textTransform: "uppercase" }} value={storeInfo.gstin ?? ""} onChange={e => setStoreInfo({ ...storeInfo, gstin: e.target.value.toUpperCase() })} />
            </FormField>
            <FormField label="Address Line 1" style={{ gridColumn: "1 / -1" }}>
              <input style={inputStyle} value={storeInfo.address_line1 ?? ""} onChange={e => setStoreInfo({ ...storeInfo, address_line1: e.target.value })} />
            </FormField>
            <FormField label="City">
              <input style={inputStyle} value={storeInfo.city ?? ""} onChange={e => setStoreInfo({ ...storeInfo, city: e.target.value })} />
            </FormField>
            <FormField label="State Code">
              <input style={inputStyle} value={storeInfo.state ?? ""} onChange={e => setStoreInfo({ ...storeInfo, state: e.target.value })} />
            </FormField>
            <FormField label="Pincode">
              <input style={inputStyle} value={storeInfo.pincode ?? ""} onChange={e => setStoreInfo({ ...storeInfo, pincode: e.target.value })} />
            </FormField>
            <FormField label="PAN">
              <input style={{ ...inputStyle, textTransform: "uppercase" }} value={storeInfo.pan_no ?? ""} onChange={e => setStoreInfo({ ...storeInfo, pan_no: e.target.value.toUpperCase() })} />
            </FormField>
          </div>

          {prefixes.length > 0 && <>
            <Divider label="Transaction Prefixes" style={{ margin: "24px 0 16px" }} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              {prefixes.map((pre) => (
                <FormField key={String(pre.entity_code)} label={String(pre.entity_code).replace(/_/g, " ")}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input style={{ ...inputStyle, flex: 2 }} value={String(pre.prefix)} onChange={e => {
                      const next = [...prefixes]; const idx = next.findIndex(p => p.entity_code === pre.entity_code);
                      next[idx] = { ...next[idx], prefix: e.target.value }; setPrefixes(next);
                    }} onBlur={async () => {
                      localDB.run("UPDATE numbering_prefixes SET prefix = ? WHERE entity_code = ?", [pre.prefix, pre.entity_code]);
                      await localDB.save();
                    }} />
                    <div style={{ padding: "9px 10px", background: "var(--color-surface-0)", borderRadius: "var(--radius-md)", fontSize: "var(--font-size-xs)", border: "1px solid var(--color-border)", color: "var(--color-text-tertiary)", fontFamily: "monospace", whiteSpace: "nowrap" }}>
                      #{String(pre.current_number).padStart(5, "0")}
                    </div>
                  </div>
                </FormField>
              ))}
            </div>
          </>}
        </Card>
      )}

      {/* ── System Parameters Tab ── */}
      {tab === "params" && (
        <Card>
          <SectionHeader title="System Parameters" sub="Business logic flags and operational constraints." style={{ marginBottom: 20 }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {configs.length === 0 && <p style={{ color: "var(--color-text-tertiary)", fontSize: "var(--font-size-md)" }}>No configurations found.</p>}
            {configs.map((cfg) => (
              <div key={String(cfg.key)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderRadius: "var(--radius-sm)", gap: 16,
                transition: "background var(--motion-fast) var(--motion-ease)" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--color-surface-2)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <div>
                  <div style={{ fontSize: "var(--font-size-md)", fontWeight: 600, color: "var(--color-text-primary)" }}>{String(cfg.key).replace(/_/g, " ")}</div>
                  <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)" }}>{String(cfg.description ?? "")}</div>
                </div>
                {cfg.data_type === "BOOLEAN" ? (
                  <select style={{ ...inputStyle, width: 80, padding: "6px 10px" }} value={String(cfg.value)}
                    onChange={e => { localDB.run("UPDATE configurations SET value=? WHERE key=?", [e.target.value, cfg.key]); localDB.save(); loadData(); }}>
                    <option value="true">YES</option><option value="false">NO</option>
                  </select>
                ) : (
                  <input style={{ ...inputStyle, width: 100, textAlign: "right", fontFamily: "monospace" }} defaultValue={String(cfg.value)}
                    onBlur={e => { localDB.run("UPDATE configurations SET value=? WHERE key=?", [e.target.value, cfg.key]); localDB.save(); }} />
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── UI & Theming Tab ── */}
      {tab === "theming" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {/* Colors */}
          <Card accent="var(--color-primary)">
            <SectionHeader title="Brand Colors" sub="Sets the primary identity of SMRITI-OS." style={{ marginBottom: 16 }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <ColorPicker label="Primary Accent" value={uiState.theme_accent_primary ?? "#6366f1"}
                onChange={v => updateUi("theme_accent_primary", v)} />
              <ColorPicker label="Secondary Accent" value={uiState.theme_accent_secondary ?? "#8b5cf6"}
                onChange={v => updateUi("theme_accent_secondary", v)} />
              <div style={{ padding: "12px 14px", background: "var(--color-surface-2)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)", display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{ width: 36, height: 36, borderRadius: "var(--radius-sm)", background: `linear-gradient(135deg, ${uiState.theme_accent_primary ?? "#6366f1"}, ${uiState.theme_accent_secondary ?? "#8b5cf6"})` }} />
                <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>Live gradient preview</div>
              </div>
            </div>
          </Card>

          {/* Typography */}
          <Card>
            <SectionHeader title="Typography" sub="Interface font for all UI text." style={{ marginBottom: 16 }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {FONT_OPTIONS.map(f => (
                <button key={f} onClick={() => updateUi("theme_font_family", f)} style={{
                  padding: "10px 14px", borderRadius: "var(--radius-md)", border: `1px solid ${uiState.theme_font_family === f ? "var(--color-primary)" : "var(--color-border-strong)"}`,
                  background: uiState.theme_font_family === f ? "var(--color-primary-tonal)" : "var(--color-surface-2)",
                  color: uiState.theme_font_family === f ? "var(--color-primary)" : "var(--color-text-secondary)",
                  fontFamily: `${f}, system-ui`, fontSize: "var(--font-size-md)", cursor: "pointer",
                  display: "flex", justifyContent: "space-between", alignItems: "center", transition: "var(--transition)",
                }}>
                  <span>{f}</span>
                  {uiState.theme_font_family === f && <Check size={14} />}
                </button>
              ))}
            </div>
          </Card>

          {/* Corner Radius */}
          <Card>
            <SectionHeader title="Corner Radius" sub="Sets the roundness personality of all UI elements." style={{ marginBottom: 16 }} />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {RADIUS_OPTIONS.map(r => (
                <button key={r.key} onClick={() => updateUi("theme_radius_scale", r.key)} style={{
                  flex: 1, minWidth: 70, padding: "12px 8px",
                  border: `1px solid ${uiState.theme_radius_scale === r.key ? "var(--color-primary)" : "var(--color-border-strong)"}`,
                  background: uiState.theme_radius_scale === r.key ? "var(--color-primary-tonal)" : "var(--color-surface-2)",
                  color: uiState.theme_radius_scale === r.key ? "var(--color-primary)" : "var(--color-text-tertiary)",
                  borderRadius: "var(--radius-md)", cursor: "pointer", textAlign: "center",
                  fontSize: "var(--font-size-xs)", fontFamily: "var(--font-family)", transition: "var(--transition)",
                }}>
                  <div style={{ width: 32, height: 20, background: uiState.theme_radius_scale === r.key ? "var(--color-primary)" : "var(--color-surface-3)", borderRadius: r.preview, margin: "0 auto 6px" }} />
                  {r.label}
                </button>
              ))}
            </div>
          </Card>

          {/* Behaviour */}
          <Card>
            <SectionHeader title="Behaviour" sub="Table density and animation preferences." style={{ marginBottom: 16 }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontSize: "var(--font-size-sm)", fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 4 }}>Table Row Density</div>
              {DENSITY_OPTIONS.map(d => (
                <button key={d.key} onClick={() => updateUi("table_row_density", d.key)} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 14px", borderRadius: "var(--radius-md)", cursor: "pointer",
                  border: `1px solid ${uiState.table_row_density === d.key ? "var(--color-primary)" : "var(--color-border-strong)"}`,
                  background: uiState.table_row_density === d.key ? "var(--color-primary-tonal)" : "var(--color-surface-2)",
                  color: uiState.table_row_density === d.key ? "var(--color-primary)" : "var(--color-text-secondary)",
                  fontFamily: "var(--font-family)", fontSize: "var(--font-size-sm)", transition: "var(--transition)",
                }}>
                  <div><span style={{ fontWeight: 600 }}>{d.label}</span> — <span style={{ opacity: 0.6 }}>{d.desc}</span></div>
                  {uiState.table_row_density === d.key && <Check size={14} />}
                </button>
              ))}
              <Divider style={{ margin: "4px 0" }} />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border-strong)", background: "var(--color-surface-2)" }}>
                <div>
                  <div style={{ fontSize: "var(--font-size-sm)", fontWeight: 600, color: "var(--color-text-primary)" }}>Micro-Animations</div>
                  <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)" }}>Transitions, hover effects, motion feedback</div>
                </div>
                <button onClick={() => updateUi("enable_animations", uiState.enable_animations === "1" ? "0" : "1")} style={{
                  width: 44, height: 24, borderRadius: "var(--radius-pill)", border: "none", cursor: "pointer",
                  background: uiState.enable_animations === "1" ? "var(--color-primary)" : "var(--color-surface-3)",
                  transition: "background var(--motion-duration) var(--motion-ease)", flexShrink: 0,
                  position: "relative",
                }}>
                  <div style={{
                    position: "absolute", top: 3, width: 18, height: 18, borderRadius: "50%", background: "#fff",
                    left: uiState.enable_animations === "1" ? 23 : 3,
                    transition: "left var(--motion-duration) var(--motion-ease)",
                  }} />
                </button>
              </div>
            </div>
          </Card>

          {/* Status banner */}
          <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px",
            background: "var(--color-primary-subtle)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-primary-tonal)" }}>
            <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-secondary)" }}>
              Changes apply instantly as a live preview. Click Save to persist across sessions.
            </div>
            <Button variant="ghost" size="sm" icon={<RotateCcw size={13} />} onClick={loadData}>Reset</Button>
          </div>
        </div>
      )}
    </PageShell>
  );
}

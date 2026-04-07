/**
 * SMRITI-OS — Design Token Injector
 * Reads UI parameters from SQLite and injects them as CSS custom properties.
 * Runs once on app mount. Client-side only.
 */
"use client";

import { useEffect } from "react";
import { localDB } from "@/lib/db";

const RADIUS_MAP: Record<string, string> = {
  sharp: "4px",
  sm:    "6px",
  md:    "10px",
  lg:    "16px",
  xl:    "24px",
};

const FONT_MAP: Record<string, string> = {
  "Inter":    "Inter, -apple-system, system-ui, sans-serif",
  "DM Sans":  "'DM Sans', system-ui, sans-serif",
  "Geist":    "Geist, system-ui, sans-serif",
  "Outfit":   "Outfit, system-ui, sans-serif",
};

export default function DesignTokenInjector() {
  useEffect(() => {
    const applyTokens = () => {
      if (!localDB.isInitialized) {
        // retry until DB is ready
        setTimeout(applyTokens, 300);
        return;
      }
      try {
        const rows = localDB.exec("SELECT param_key, param_value FROM system_parameters WHERE category = 'UI'");
        const params: Record<string, string> = {};
        rows.forEach((r: Record<string, unknown>) => {
          params[String(r.param_key)] = String(r.param_value);
        });

        const root = document.documentElement;

        if (params.theme_accent_primary)   root.style.setProperty("--color-primary",   params.theme_accent_primary);
        if (params.theme_accent_secondary) root.style.setProperty("--color-secondary",  params.theme_accent_secondary);

        const radiusKey = params.theme_radius_scale ?? "md";
        const baseRadius = RADIUS_MAP[radiusKey] ?? "10px";
        root.style.setProperty("--radius-base", baseRadius);

        if (params.theme_font_family) {
          const fontStack = FONT_MAP[params.theme_font_family] ?? params.theme_font_family;
          root.style.setProperty("--font-family", fontStack);
        }

        const opacity = params.theme_surface_opacity ?? "0.6";
        root.style.setProperty("--surface-opacity", opacity);

        if (params.enable_animations === "0") {
          root.style.setProperty("--motion-duration", "0ms");
        }

        const density = params.table_row_density ?? "normal";
        const paddingMap: Record<string, string> = { compact: "6px 10px", normal: "10px 14px", comfortable: "16px 18px" };
        root.style.setProperty("--table-cell-padding", paddingMap[density] ?? "10px 14px");

      } catch { /* DB not ready, tokens fall back to CSS defaults */ }
    };
    applyTokens();
  }, []);

  return null;
}

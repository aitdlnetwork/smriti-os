/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  S M R I T I - O S   ||   E N T E R P R I S E   E D I T I O N
 *  "ERP Simplified. Run Your Entire Business on Memory, Not Code."
 * ─────────────────────────────────────────────────────────────────────────────
 *  System Architect  : Jawahar R Mallah
 *  Parent Org        : AITDL NETWORK
 *  Copyright         : © 2026 AITDL.com & AITDL.in. All Rights Reserved.
 *  Classification    : PROPRIETARY & CONFIDENTIAL
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *  Module : Item Master (Prism Design System Edition)
 *  Desc   : Shoper 9-style style-grid SKU generator + browse + barcode spooler.
 *           Migrated from legacy im-shell to Prism PageShell + Card + Button system.
 */

"use client";

import React, { useState, useEffect } from "react";
import { useSmritiDB } from "@/lib/useSmritiDB";
import { localDB } from "@/lib/db";
import BarcodePrintModal from "@/components/barcode/BarcodePrintModal";
import PageShell from "@/components/ui/PageShell";
import {
  Button, Card, SectionHeader, StatusBadge, FormField, DataTable,
  Divider, TableColumn, inputStyles,
} from "@/components/ui";
import { Tag, Plus, Printer, Grid3X3, List, CheckSquare, Square, Zap } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface MatrixSize { code: string; selected: boolean; }

const fieldInput: React.CSSProperties = {
  ...inputStyles,
  padding: "8px 12px",
  fontSize: "var(--font-size-sm)",
};

const selectStyle: React.CSSProperties = {
  ...inputStyles,
  padding: "8px 12px",
  fontSize: "var(--font-size-sm)",
  cursor: "pointer",
  appearance: "none" as any,
};

// ─── Item Master Page ─────────────────────────────────────────────────────────
export default function ItemMaster() {
  const { isReady } = useSmritiDB();
  const [activeTab, setActiveTab] = useState<"CREATE" | "LIST">("CREATE");

  // Grid / Matrix Form State
  const [styleCode, setStyleCode] = useState("");
  const [brand, setBrand] = useState("SMRITI");
  const [category, setCategory] = useState("APPAREL");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("");
  const [mrp, setMrp] = useState<number | "">("");
  const [mop, setMop] = useState<number | "">("");
  const [hsn, setHsn] = useState("6109");
  const [taxPct, setTaxPct] = useState(12);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const [saving, setSaving] = useState(false);

  const [sizes, setSizes] = useState<MatrixSize[]>([
    { code: "XS", selected: false },
    { code: "S", selected: false },
    { code: "M", selected: false },
    { code: "L", selected: false },
    { code: "XL", selected: false },
    { code: "XXL", selected: false },
    { code: "XXXL", selected: false },
  ]);

  // Browse State
  const [inventoryList, setInventoryList] = useState<any[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const showToast = (msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadInventory = () => {
    if (!localDB.isInitialized) return;
    const items = localDB.exec("SELECT * FROM item_master ORDER BY created_at DESC LIMIT 200");
    setInventoryList(items);
  };

  useEffect(() => {
    if (activeTab === "LIST" && localDB.isInitialized) loadInventory();
  }, [activeTab]);

  const toggleSize = (index: number) => setSizes(prev => {
    const next = [...prev];
    next[index] = { ...next[index], selected: !next[index].selected };
    return next;
  });

  const toggleItemSelection = (id: string) => setSelectedItemIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const toggleAll = () => {
    if (selectedItemIds.size === inventoryList.length) setSelectedItemIds(new Set());
    else setSelectedItemIds(new Set(inventoryList.map(i => i.id)));
  };

  const handleCreateGrid = async () => {
    if (!styleCode || !description) return showToast("Style Code and Description are required.", "err");
    const selectedSizes = sizes.filter(s => s.selected);
    if (selectedSizes.length === 0) return showToast("Select at least one size for the SKU grid.", "err");
    if (!localDB.isInitialized) return;
    setSaving(true);
    try {
      let created = 0;
      for (const size of selectedSizes) {
        const itemCode = `${brand}-${styleCode}-${color || "BASE"}-${size.code}`.toUpperCase().replace(/\s+/g, "-");
        localDB.run(`
          INSERT INTO item_master (
            id, item_code, description, brand_code, class_code, subclass_code,
            style_code, color_code, size_code, mrp, mop, tax_pct, hsn_sac_code
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          `item-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          itemCode,
          `${description} - ${size.code}`,
          brand, category, "GENERAL",
          styleCode, color, size.code,
          Number(mrp) || 0, Number(mop) || 0, taxPct, hsn,
        ]);
        created++;
      }
      await localDB.save();
      showToast(`✓ ${created} SKUs created successfully in the master.`, "ok");
      setStyleCode(""); setDescription("");
      setSizes(prev => prev.map(s => ({ ...s, selected: false })));
    } catch (err) {
      console.error(err);
      showToast("Database error — possibly a duplicate item code in this size/color combo.", "err");
    }
    setSaving(false);
  };

  if (!isReady)
    return <PageShell title="Item Master" loading breadcrumbs={[{ label: "ERP", href: "/erp" }, { label: "Item Master" }]}>{null}</PageShell>;

  // ── Browse Columns ──────────────────────────────────────────────────────────
  const browseColumns: TableColumn<Record<string, unknown>>[] = [
    {
      key: "id", header: "", width: "40px",
      render: (_v, row) => (
        <button
          onClick={() => toggleItemSelection(String(row.id))}
          style={{ background: "none", border: "none", cursor: "pointer", color: selectedItemIds.has(String(row.id)) ? "var(--color-primary)" : "var(--color-text-disabled)", display: "flex" }}
        >
          {selectedItemIds.has(String(row.id)) ? <CheckSquare size={16} /> : <Square size={16} />}
        </button>
      ),
    },
    {
      key: "item_code", header: "Item Code",
      render: (v) => <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: "var(--font-size-xs)", color: "var(--color-primary)" }}>{String(v)}</span>,
    },
    { key: "description", header: "Description" },
    {
      key: "size_code", header: "Size", width: "70px",
      render: (v) => <StatusBadge label={String(v || "—")} type="neutral" />,
    },
    { key: "color_code", header: "Color", width: "100px" },
    {
      key: "mrp", header: "MRP (₹)", align: "right",
      render: (v) => <span style={{ fontWeight: 700, fontFamily: "monospace", color: "var(--color-success)" }}>₹{Number(v).toFixed(0)}</span>,
    },
    {
      key: "tax_pct", header: "Tax %", align: "right", width: "70px",
      render: (v) => <span style={{ color: "var(--color-text-tertiary)" }}>{String(v)}%</span>,
    },
  ];

  const TAX_OPTIONS = [0, 5, 12, 18, 28];
  const selectedCount = sizes.filter(s => s.selected).length;

  return (
    <PageShell
      title="Item Master"
      subtitle="Style-grid SKU generator with matrix size explosion and barcode spooler."
      icon={<Tag size={18} />}
      breadcrumbs={[{ label: "ERP", href: "/erp" }, { label: "Item Master" }]}
      actions={
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setActiveTab("CREATE")}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "6px 14px",
              borderRadius: "var(--radius-sm)", border: "1px solid var(--color-border-strong)",
              background: activeTab === "CREATE" ? "var(--color-surface-3)" : "var(--color-surface-1)",
              color: activeTab === "CREATE" ? "var(--color-text-primary)" : "var(--color-text-tertiary)",
              cursor: "pointer", fontSize: "var(--font-size-sm)", fontWeight: 600,
              fontFamily: "var(--font-family)", transition: "var(--transition)",
            }}
          >
            <Grid3X3 size={13} /> Grid Creator
          </button>
          <button
            onClick={() => { setActiveTab("LIST"); loadInventory(); }}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "6px 14px",
              borderRadius: "var(--radius-sm)", border: "1px solid var(--color-border-strong)",
              background: activeTab === "LIST" ? "var(--color-surface-3)" : "var(--color-surface-1)",
              color: activeTab === "LIST" ? "var(--color-text-primary)" : "var(--color-text-tertiary)",
              cursor: "pointer", fontSize: "var(--font-size-sm)", fontWeight: 600,
              fontFamily: "var(--font-family)", transition: "var(--transition)",
            }}
          >
            <List size={13} /> Browse Inventory
          </button>
        </div>
      }
    >
      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 28, right: 28, zIndex: 9999,
          background: toast.type === "ok" ? "var(--color-success-tonal)" : "var(--color-danger-tonal)",
          border: `1px solid ${toast.type === "ok" ? "rgba(16,185,129,0.4)" : "rgba(239,68,68,0.4)"}`,
          color: toast.type === "ok" ? "var(--color-success)" : "var(--color-danger)",
          padding: "13px 20px", borderRadius: "var(--radius-md)",
          fontSize: "var(--font-size-sm)", fontWeight: 600,
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        }}>{toast.msg}</div>
      )}

      {/* ── CREATE TAB ── */}
      {activeTab === "CREATE" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Master Attributes Card */}
          <Card padding="24px" accent="var(--color-primary)">
            <SectionHeader
              title="Style Grid Creator"
              sub="Define parent-level attributes. All selected sizes will become individual SKU records."
              style={{ marginBottom: 20 }}
            />

            {/* Row 1: Style Code + Description */}
            <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 12, marginBottom: 14 }}>
              <FormField label="Parent Style Code" required>
                <input
                  style={{ ...fieldInput, fontFamily: "monospace", textTransform: "uppercase" }}
                  placeholder="e.g. POLO-100"
                  value={styleCode}
                  onChange={e => setStyleCode(e.target.value.toUpperCase())}
                />
              </FormField>
              <FormField label="Description" required>
                <input
                  style={fieldInput}
                  placeholder="e.g. Smart Fit Cotton Polo"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                />
              </FormField>
            </div>

            {/* Row 2: Brand + Category + Color */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
              <FormField label="Brand">
                <input style={{ ...fieldInput, textTransform: "uppercase" }} value={brand} onChange={e => setBrand(e.target.value.toUpperCase())} />
              </FormField>
              <FormField label="Category (Class)">
                <input style={{ ...fieldInput, textTransform: "uppercase" }} value={category} onChange={e => setCategory(e.target.value.toUpperCase())} />
              </FormField>
              <FormField label="Color">
                <input style={{ ...fieldInput, textTransform: "uppercase" }} placeholder="NAVY BLUE" value={color} onChange={e => setColor(e.target.value.toUpperCase())} />
              </FormField>
            </div>

            <Divider label="Matrix Size Explosion" style={{ margin: "0 0 16px" }} />

            {/* Size Matrix Selector */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
              {sizes.map((size, idx) => (
                <button
                  key={size.code}
                  onClick={() => toggleSize(idx)}
                  style={{
                    padding: "10px 18px", borderRadius: "var(--radius-md)", cursor: "pointer",
                    border: `2px solid ${size.selected ? "var(--color-primary)" : "var(--color-border-strong)"}`,
                    background: size.selected ? "var(--color-primary-tonal)" : "var(--color-surface-2)",
                    color: size.selected ? "var(--color-primary)" : "var(--color-text-secondary)",
                    fontWeight: 800, fontSize: "var(--font-size-sm)", fontFamily: "var(--font-family)",
                    transition: "var(--transition)",
                    transform: size.selected ? "translateY(-2px)" : "none",
                    boxShadow: size.selected ? "0 4px 12px rgba(99,102,241,0.2)" : "none",
                  }}
                >
                  {size.code}
                </button>
              ))}
            </div>

            {selectedCount > 0 && (
              <div style={{
                marginBottom: 20, padding: "10px 14px",
                background: "var(--color-primary-tonal)",
                border: "1px solid rgba(99,102,241,0.25)",
                borderRadius: "var(--radius-sm)",
                fontSize: "var(--font-size-xs)", color: "var(--color-primary)", fontWeight: 600,
              }}>
                <Zap size={12} style={{ marginRight: 6, verticalAlign: "middle" }} />
                {selectedCount} size{selectedCount > 1 ? "s" : ""} selected → will generate {selectedCount} SKU{selectedCount > 1 ? "s" : ""} with code pattern: <span style={{ fontFamily: "monospace" }}>{brand}-{styleCode || "STYLE"}-{color || "BASE"}-[SIZE]</span>
              </div>
            )}

            <Divider label="Pricing & Tax Classification" style={{ margin: "0 0 16px" }} />

            {/* Row 3: Pricing */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 24 }}>
              <FormField label="MRP (₹)" required>
                <input type="number" style={{ ...fieldInput, textAlign: "right" }} value={mrp} onChange={e => setMrp(Number(e.target.value) || "")} placeholder="0" />
              </FormField>
              <FormField label="Selling Rate / MOP (₹)">
                <input type="number" style={{ ...fieldInput, textAlign: "right" }} value={mop} onChange={e => setMop(Number(e.target.value) || "")} placeholder="0" />
              </FormField>
              <FormField label="HSN Code">
                <input style={{ ...fieldInput, fontFamily: "monospace" }} value={hsn} onChange={e => setHsn(e.target.value)} placeholder="6109" />
              </FormField>
              <FormField label="Tax %">
                <select style={selectStyle} value={taxPct} onChange={e => setTaxPct(Number(e.target.value))}>
                  {TAX_OPTIONS.map(t => <option key={t} value={t}>{t === 0 ? "0% (Exempt)" : `${t}%`}</option>)}
                </select>
              </FormField>
            </div>

            {/* Action Row */}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Button
                variant="primary"
                size="md"
                loading={saving}
                icon={<Plus size={16} />}
                onClick={handleCreateGrid}
                disabled={selectedCount === 0 || !styleCode || !description}
              >
                Generate {selectedCount > 0 ? selectedCount : ""} SKU{selectedCount !== 1 ? "s" : ""} into Database
              </Button>
            </div>
          </Card>

          {/* Preview info card */}
          <Card padding="20px">
            <SectionHeader title="Architecture Notes" sub="Shoper 9 Fidelity" style={{ marginBottom: 14 }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { label: "SKU Generation Strategy", value: "Matrix Explosion — 1 Style → N Sizes" },
                { label: "Code Pattern", value: `BRAND-STYLE-COLOR-SIZE (e.g. ${brand}-${styleCode || "POLO100"}-${color || "NAVYBLUE"}-XL)` },
                { label: "Storage Engine", value: "WASM SQLite · Local Shard · Sovereign" },
                { label: "Barcode Protocol", value: "EAN-13 Auto-generated on commit" },
              ].map(r => (
                <div key={r.label} style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--font-size-sm)", padding: "8px 0", borderBottom: "1px solid var(--color-border)" }}>
                  <span style={{ color: "var(--color-text-tertiary)" }}>{r.label}</span>
                  <span style={{ color: "var(--color-text-primary)", fontWeight: 600, fontFamily: "monospace", fontSize: "var(--font-size-xs)" }}>{r.value}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ── LIST TAB ── */}
      {activeTab === "LIST" && (
        <>
          <SectionHeader
            title="Inventory Master List"
            sub="All committed SKUs. Select items for barcode label printing."
            style={{ marginBottom: 16 }}
            actions={
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {selectedItemIds.size > 0 && (
                  <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-primary)", fontWeight: 600 }}>
                    {selectedItemIds.size} selected
                  </span>
                )}
                {inventoryList.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={toggleAll}>
                    {selectedItemIds.size === inventoryList.length ? "Deselect All" : "Select All"}
                  </Button>
                )}
                <Button
                  variant={selectedItemIds.size > 0 ? "primary" : "secondary"}
                  size="sm"
                  icon={<Printer size={13} />}
                  onClick={() => setIsPrintModalOpen(true)}
                  disabled={selectedItemIds.size === 0}
                >
                  Print Labels ({selectedItemIds.size})
                </Button>
              </div>
            }
          />

          <DataTable<Record<string, unknown>>
            columns={browseColumns}
            rows={inventoryList as unknown as Record<string, unknown>[]}
            emptyMessage="No items in master. Use the Grid Creator tab to generate SKUs."
            stickyHeader
          />
        </>
      )}

      {/* ── Barcode Print Modal ── */}
      {isPrintModalOpen && (
        <BarcodePrintModal
          items={inventoryList.filter(item => selectedItemIds.has(item.id))}
          onClose={() => setIsPrintModalOpen(false)}
        />
      )}
    </PageShell>
  );
}

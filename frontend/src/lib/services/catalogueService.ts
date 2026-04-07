/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  S M R I T I - O S  ||  CATALOGUE SERVICE
 *  Universal data-access layer for all Catalogue modules
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { localDB } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface LookupEntry { id: string; category: string; code: string; description: string; sort_order: number; is_system: number; }
export interface ItemClassification { id: string; level: number; code: string; name: string; parent_id: string | null; size_group_id: string | null; sort_order: number; is_active: number; }
export interface TaxCode { id: string; code: string; name: string; hsn_code: string; gst_rate: number; cgst_rate: number; sgst_rate: number; igst_rate: number; cess_rate: number; tax_type: string; is_inclusive: number; is_active: number; }
export interface PaymentMode { id: string; code: string; name: string; mode_type: string; config_json: string; sort_order: number; is_active: number; }
export interface SizeGroup { id: string; group_code: string; name: string; sizes_json: string; }
export interface Vendor { id: string; vendor_code: string; name: string; contact_person: string; phone: string; email: string; gstin: string; state_code: string; is_active: number; }

// ── General Lookups ───────────────────────────────────────────────────────────
export const lookupService = {
  getAll: (category: string): LookupEntry[] =>
    localDB.exec(`SELECT * FROM general_lookups WHERE category=? ORDER BY sort_order ASC, code ASC`, [category]) as any,

  getAllCategories: (): string[] => {
    const rows = localDB.exec(`SELECT DISTINCT category FROM general_lookups ORDER BY category ASC`) as any[];
    return rows.map((r: any) => r.category);
  },

  save: (entry: LookupEntry): void => {
    localDB.run(
      `INSERT OR REPLACE INTO general_lookups (id,category,code,description,sort_order,is_system) VALUES (?,?,?,?,?,?)`,
      [entry.id || uuidv4(), entry.category, entry.code.toUpperCase(), entry.description, entry.sort_order ?? 0, entry.is_system ?? 0]
    );
  },

  delete: (id: string): void => {
    localDB.run(`DELETE FROM general_lookups WHERE id=? AND is_system=0`, [id]);
  },

  getUsageCount: (category: string, code: string): number => {
    const col = category === "BRAND" ? "brand_code" : category === "COLOR" ? "color_code" : category === "SEASON" ? "season_code" : null;
    if (!col) return 0;
    const r = localDB.exec(`SELECT COUNT(*) as cnt FROM item_master WHERE ${col}=?`, [code]) as any[];
    return r[0]?.cnt ?? 0;
  },
};

// ── Item Classification ───────────────────────────────────────────────────────
export const classificationService = {
  getAll: (): ItemClassification[] =>
    localDB.exec(`SELECT * FROM item_classifications ORDER BY level ASC, sort_order ASC, code ASC`) as any,

  getByLevel: (level: number): ItemClassification[] =>
    localDB.exec(`SELECT * FROM item_classifications WHERE level=? ORDER BY sort_order ASC`, [level]) as any,

  getChildren: (parentId: string): ItemClassification[] =>
    localDB.exec(`SELECT * FROM item_classifications WHERE parent_id=? ORDER BY sort_order ASC`, [parentId]) as any,

  save: (ic: Partial<ItemClassification> & { level: number; code: string; name: string }): string => {
    const id = ic.id || uuidv4();
    localDB.run(
      `INSERT OR REPLACE INTO item_classifications (id,level,code,name,parent_id,size_group_id,sort_order,is_active) VALUES (?,?,?,?,?,?,?,?)`,
      [id, ic.level, ic.code.toUpperCase(), ic.name, ic.parent_id ?? null, ic.size_group_id ?? null, ic.sort_order ?? 0, ic.is_active ?? 1]
    );
    return id;
  },

  delete: (id: string): void => {
    const hasChildren = (localDB.exec(`SELECT id FROM item_classifications WHERE parent_id=?`, [id]) as any[]).length > 0;
    if (hasChildren) throw new Error("Cannot delete: has child classifications.");
    localDB.run(`DELETE FROM item_classifications WHERE id=?`, [id]);
  },

  // Generate auto Stock Number from classification chain
  buildStockNumber: (superCode: string, classCode: string, subCode: string, colorCode: string, sizeCode: string): string =>
    `${superCode}/${classCode}/${subCode}/${colorCode}/${sizeCode}`.toUpperCase(),
};

// ── Tax Codes ─────────────────────────────────────────────────────────────────
export const taxService = {
  getAll: (): TaxCode[] =>
    localDB.exec(`SELECT * FROM tax_codes ORDER BY gst_rate ASC`) as any,

  getActive: (): TaxCode[] =>
    localDB.exec(`SELECT * FROM tax_codes WHERE is_active=1 ORDER BY gst_rate ASC`) as any,

  save: (tc: Partial<TaxCode> & { code: string; name: string }): string => {
    const id = tc.id || uuidv4();
    const gst = tc.gst_rate ?? 0;
    localDB.run(
      `INSERT OR REPLACE INTO tax_codes (id,code,name,hsn_code,gst_rate,cgst_rate,sgst_rate,igst_rate,cess_rate,tax_type,is_inclusive,is_active) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, tc.code.toUpperCase(), tc.name, tc.hsn_code ?? '', gst, tc.cgst_rate ?? gst/2, tc.sgst_rate ?? gst/2, tc.igst_rate ?? gst, tc.cess_rate ?? 0, tc.tax_type ?? 'GST', tc.is_inclusive ?? 0, tc.is_active ?? 1]
    );
    return id;
  },

  delete: (id: string): void => {
    const inUse = (localDB.exec(`SELECT id FROM item_master WHERE tax_code_id=? LIMIT 1`, [id]) as any[]).length > 0;
    if (inUse) throw new Error("Tax code is in use by items. Deactivate instead.");
    localDB.run(`DELETE FROM tax_codes WHERE id=?`, [id]);
  },
};

// ── Payment Modes ─────────────────────────────────────────────────────────────
export const paymentModeService = {
  getAll: (): PaymentMode[] =>
    localDB.exec(`SELECT * FROM payment_modes ORDER BY sort_order ASC`) as any,

  getActive: (): PaymentMode[] =>
    localDB.exec(`SELECT * FROM payment_modes WHERE is_active=1 ORDER BY sort_order ASC`) as any,

  save: (pm: Partial<PaymentMode> & { code: string; name: string; mode_type: string }): string => {
    const id = pm.id || uuidv4();
    localDB.run(
      `INSERT OR REPLACE INTO payment_modes (id,code,name,mode_type,config_json,sort_order,is_active) VALUES (?,?,?,?,?,?,?)`,
      [id, pm.code.toUpperCase(), pm.name, pm.mode_type, pm.config_json ?? '{}', pm.sort_order ?? 99, pm.is_active ?? 1]
    );
    return id;
  },

  toggle: (id: string, active: number): void => {
    localDB.run(`UPDATE payment_modes SET is_active=? WHERE id=?`, [active, id]);
  },
};

// ── Size Groups ───────────────────────────────────────────────────────────────
export const sizeGroupService = {
  getAll: (): SizeGroup[] =>
    localDB.exec(`SELECT * FROM size_groups ORDER BY name ASC`) as any,

  getSizes: (groupId: string): string[] => {
    const rows = localDB.exec(`SELECT sizes_json FROM size_groups WHERE id=?`, [groupId]) as any[];
    if (!rows.length) return [];
    try { return JSON.parse(rows[0].sizes_json); } catch { return []; }
  },

  save: (sg: Partial<SizeGroup> & { group_code: string; name: string; sizes: string[] }): string => {
    const id = sg.id || uuidv4();
    localDB.run(
      `INSERT OR REPLACE INTO size_groups (id,group_code,name,sizes_json) VALUES (?,?,?,?)`,
      [id, sg.group_code.toUpperCase(), sg.name, JSON.stringify(sg.sizes)]
    );
    return id;
  },
};

// ── Vendors ───────────────────────────────────────────────────────────────────
export const vendorService = {
  getAll: (): Vendor[] =>
    localDB.exec(`SELECT * FROM vendors ORDER BY name ASC`) as any,

  save: (v: Partial<Vendor> & { vendor_code: string; name: string }): string => {
    const id = v.id || uuidv4();
    localDB.run(
      `INSERT OR REPLACE INTO vendors (id,vendor_code,name,contact_person,phone,email,gstin,state_code,is_active) VALUES (?,?,?,?,?,?,?,?,?)`,
      [id, v.vendor_code.toUpperCase(), v.name, v.contact_person ?? '', v.phone ?? '', v.email ?? '', v.gstin ?? '', v.state_code ?? '', v.is_active ?? 1]
    );
    return id;
  },
};

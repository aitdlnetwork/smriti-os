/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  S M R I T I - O S  ||  GOODS RECEIPT NOTE (GRN) SERVICE
 *  Sovereignty Layer: Atomic GRN Commit + Stock Ledger Update
 * ─────────────────────────────────────────────────────────────────────────────
 *  System Architect  : Jawahar R Mallah
 *  Parent Org        : AITDL NETWORK
 *  Copyright         : © 2026 AITDL.com & AITDL.in. All Rights Reserved.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { localDB } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import poService from "./poService";
import parameterService from "./parameterService";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface GRNHeader {
  vendor_code?: string;
  vendor_name?: string;
  supplier_invoice_no?: string;
  supplier_invoice_date?: string;
  po_reference?: string;
  po_id?: string;
  remarks?: string;
  created_by?: string;
}

export interface GRNItem {
  item_code: string;
  description?: string;
  hsn_code?: string;
  qty_ordered?: number;
  qty_received: number;
  qty_accepted: number;
  unit_cost: number;
  discount_pct?: number;
  tax_code?: string;
  tax_pct?: number;
  landed_cost?: number;
  // Dynamic grid columns from ui_grid_configs
  [key: string]: unknown;
}

export interface GRNResult {
  success: boolean;
  grn_id: string;
  grn_number: string;
  items_saved: number;
  error?: string;
}

// ── Service ───────────────────────────────────────────────────────────────────
const grnService = {

  /**
   * Generates the next sequential GRN document number from numbering_prefixes.
   */
  generateGRNNumber(): string {
    try {
      const defaultPrefix = parameterService.getParam("DocumentPrefix", "grn_prefix", "GRN/");
      const rows = localDB.exec(
        "SELECT current_number FROM numbering_prefixes WHERE entity_code='PURCHASE_GRN'"
      );
      if (rows.length > 0) {
        const { current_number } = rows[0] as { current_number: number };
        const num = String(current_number).padStart(4, "0");
        // Increment counter
        localDB.run(
          "UPDATE numbering_prefixes SET current_number = current_number + 1 WHERE entity_code='PURCHASE_GRN'"
        );
        return `${defaultPrefix}${num}`;
      }
    } catch (e) {
      console.error("[grnService] generateGRNNumber error:", e);
    }
    return `${parameterService.getParam("DocumentPrefix", "grn_prefix", "GRN/")}${Date.now()}`;
  },

  /**
   * Posts a full GRN atomically:
   * 1. INSERT into goods_inward (header)
   * 2. INSERT into goods_inward_items (line items)
   * 3. INSERT into stock_ledger (IN movements for each item)
   * 4. Persist to IndexedDB
   */
  async postGRN(header: GRNHeader, items: GRNItem[]): Promise<GRNResult> {
    const grn_id = uuidv4();
    const grn_number = this.generateGRNNumber();
    const today = new Date().toISOString().split("T")[0];

    try {
      // 1) Insert GRN Header
      localDB.run(`
        INSERT INTO goods_inward (
          id, grn_number, grn_date, vendor_code, vendor_name,
          supplier_invoice_no, supplier_invoice_date,
          po_reference, status, remarks, created_by, created_at
        ) VALUES (?,?,?,?,?,?,?,?,'POSTED',?,?,CURRENT_TIMESTAMP)
      `, [
        grn_id,
        grn_number,
        today,
        header.vendor_code ?? "",
        header.vendor_name ?? "",
        header.supplier_invoice_no ?? "",
        header.supplier_invoice_date ?? today,
        header.po_reference ?? "",
        header.remarks ?? "",
        header.created_by ?? "ADMIN",
      ]);

      let items_saved = 0;
      const received_list: { item_code: string; qty_received: number }[] = [];

      for (const item of items) {
        // Skip truly empty rows
        if (!item.item_code && !item.qty_received) continue;

        const item_id = uuidv4();
        const qty_received = Number(item.qty_received) || 0;
        const qty_accepted = Number(item.qty_accepted) || qty_received;
        const unit_cost = Number(item.unit_cost) || 0;
        const discount_pct = Number(item.discount_pct) || 0;
        const tax_pct = Number(item.tax_pct) || 0;
        const net_cost = unit_cost * (1 - discount_pct / 100);
        const tax_amount = net_cost * qty_accepted * (tax_pct / 100);
        const total_amount = net_cost * qty_accepted + tax_amount;

        // 2) Insert GRN Line Item
        localDB.run(`
          INSERT INTO goods_inward_items (
            id, grn_id, item_code, description, hsn_code,
            qty_ordered, qty_received, qty_accepted,
            unit_cost, discount_pct, tax_code, tax_pct,
            tax_amount, total_amount, created_at
          ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
        `, [
          item_id,
          grn_id,
          String(item.item_code ?? ""),
          String(item.description ?? ""),
          String(item.hsn_code ?? ""),
          Number(item.qty_ordered) || 0,
          qty_received,
          qty_accepted,
          unit_cost,
          discount_pct,
          String(item.tax_code ?? ""),
          tax_pct,
          tax_amount,
          total_amount,
        ]);

        received_list.push({ item_code: String(item.item_code ?? ""), qty_received });

        // 3) Post to Stock Ledger (IN movement)
        if (qty_accepted > 0) {
          localDB.run(`
            INSERT INTO stock_ledger (
              id, item_code, movement_type, document_type, document_id,
              document_number, movement_date, qty_in, qty_out,
              unit_cost, reference_note, created_at
            ) VALUES (?,?,'IN','GRN',?,?,?,?,0,?,?,CURRENT_TIMESTAMP)
          `, [
            uuidv4(),
            String(item.item_code ?? ""),
            grn_id,
            grn_number,
            today,
            qty_accepted,
            unit_cost,
            `GRN: ${grn_number}`,
          ]);
        }

        items_saved++;
      }

      // If tied to PO, update PO quantities
      if (header.po_id && received_list.length > 0) {
        poService.updatePOFulfillment(header.po_id, received_list);
      }

      // 4) Persist to IndexedDB
      await localDB.save();

      console.log(`[grnService] GRN ${grn_number} posted. Items: ${items_saved}`);
      return { success: true, grn_id, grn_number, items_saved };

    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[grnService] postGRN failed:", e);
      return { success: false, grn_id, grn_number, items_saved: 0, error: msg };
    }
  },

  /**
   * Fetch recent GRN list (last 50 documents).
   */
  getGRNList(): Record<string, unknown>[] {
    try {
      return localDB.exec(`
        SELECT id, grn_number, grn_date, vendor_name,
               supplier_invoice_no, status, created_at
        FROM goods_inward
        ORDER BY created_at DESC
        LIMIT 50
      `);
    } catch (e) {
      console.error("[grnService] getGRNList error:", e);
      return [];
    }
  },

  /**
   * Fetch a specific GRN with its line items.
   */
  getGRNById(id: string): { header: Record<string, unknown> | null; items: Record<string, unknown>[] } {
    try {
      const headers = localDB.exec("SELECT * FROM goods_inward WHERE id=?", [id]);
      const items = localDB.exec("SELECT * FROM goods_inward_items WHERE grn_id=? ORDER BY rowid", [id]);
      return { header: headers[0] ?? null, items };
    } catch (e) {
      console.error("[grnService] getGRNById error:", e);
      return { header: null, items: [] };
    }
  },
};

export default grnService;

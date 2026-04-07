/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  S M R I T I - O S  ||  PURCHASE ORDER (PO) SERVICE
 *  Sovereignty Layer: PO Creation + GRN Bridge
 * ─────────────────────────────────────────────────────────────────────────────
 *  System Architect  : Jawahar R Mallah
 *  Parent Org        : AITDL NETWORK
 *  Copyright         : © 2026 AITDL.com & AITDL.in. All Rights Reserved.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { localDB } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import parameterService from "./parameterService";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface POHeader {
  vendor_code?: string;
  vendor_name?: string;
  expected_delivery_date?: string;
  remarks?: string;
  created_by?: string;
}

export interface POItem {
  item_code: string;
  description?: string;
  hsn_code?: string;
  qty_ordered: number;
  unit_rate: number;
  discount_pct?: number;
  tax_code?: string;
  tax_pct?: number;
  [key: string]: unknown;
}

export interface POResult {
  success: boolean;
  po_id: string;
  po_number: string;
  items_saved: number;
  error?: string;
}

// ── Service ───────────────────────────────────────────────────────────────────
const poService = {

  /**
   * Generates the next sequential PO document number.
   */
  generatePONumber(): string {
    try {
      const prefix = parameterService.getParam("DocumentPrefix", "po_prefix", "PO/");
      const rows = localDB.exec(
        "SELECT current_number FROM numbering_prefixes WHERE entity_code='PURCHASE_PO'"
      );
      if (rows.length > 0) {
        const { current_number } = rows[0] as { current_number: number };
        const num = String(current_number).padStart(4, "0");
        localDB.run(
          "UPDATE numbering_prefixes SET current_number = current_number + 1 WHERE entity_code='PURCHASE_PO'"
        );
        return `${prefix}${num}`;
      }
    } catch (e) {
      console.error("[poService] generatePONumber error:", e);
    }
    return `PO/${Date.now()}`;
  },

  /**
   * Creates a new Purchase Order atomically:
   * 1. INSERT into purchase_orders (header)
   * 2. INSERT into po_items (line items)
   * 3. Persist to IndexedDB
   */
  async createPO(header: POHeader, items: POItem[]): Promise<POResult> {
    const po_id = uuidv4();
    const po_number = this.generatePONumber();
    const today = new Date().toISOString().split("T")[0];

    try {
      // 1) Insert PO Header
      localDB.run(`
        INSERT INTO purchase_orders (
          id, po_number, po_date, vendor_code, vendor_name,
          expected_delivery_date, status, remarks, created_by, created_at
        ) VALUES (?,?,?,?,?,?,'OPEN',?,?,CURRENT_TIMESTAMP)
      `, [
        po_id,
        po_number,
        today,
        header.vendor_code ?? "",
        header.vendor_name ?? "",
        header.expected_delivery_date ?? "",
        header.remarks ?? "",
        header.created_by ?? "ADMIN",
      ]);

      let items_saved = 0;
      let total_value = 0;

      for (const item of items) {
        // Skip empty rows
        if (!item.item_code && !item.qty_ordered) continue;

        const item_id = uuidv4();
        const qty_ordered = Number(item.qty_ordered) || 0;
        const unit_rate = Number(item.unit_rate) || 0;
        const discount_pct = Number(item.discount_pct) || 0;
        const tax_pct = Number(item.tax_pct) || 0;
        const net_rate = unit_rate * (1 - discount_pct / 100);
        const tax_amount = net_rate * qty_ordered * (tax_pct / 100);
        const line_total = net_rate * qty_ordered + tax_amount;
        total_value += line_total;

        // 2) Insert PO Line Item
        localDB.run(`
          INSERT INTO po_items (
            id, po_id, item_code, description, hsn_code,
            qty_ordered, qty_received, unit_rate, discount_pct,
            tax_code, tax_pct, tax_amount, line_total, created_at
          ) VALUES (?,?,?,?,?,?,0,?,?,?,?,?,?,CURRENT_TIMESTAMP)
        `, [
          item_id,
          po_id,
          String(item.item_code ?? ""),
          String(item.description ?? ""),
          String(item.hsn_code ?? ""),
          qty_ordered,
          unit_rate,
          discount_pct,
          String(item.tax_code ?? ""),
          tax_pct,
          tax_amount,
          line_total,
        ]);

        items_saved++;
      }

      // Update header total
      localDB.run(
        "UPDATE purchase_orders SET total_value=? WHERE id=?",
        [total_value, po_id]
      );

      // 3) Persist to IndexedDB
      await localDB.save();

      console.log(`[poService] PO ${po_number} created. Items: ${items_saved}`);
      return { success: true, po_id, po_number, items_saved };

    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[poService] createPO failed:", e);
      return { success: false, po_id, po_number, items_saved: 0, error: msg };
    }
  },

  /**
   * Fetch recent PO list (last 50 documents).
   */
  getPOList(): Record<string, unknown>[] {
    try {
      return localDB.exec(`
        SELECT id, po_number, po_date, vendor_name,
               expected_delivery_date, status, total_value, created_at
        FROM purchase_orders
        ORDER BY created_at DESC
        LIMIT 50
      `);
    } catch (e) {
      console.error("[poService] getPOList error:", e);
      return [];
    }
  },

  /**
   * Fetch a specific PO with its line items.
   */
  getPOById(id: string): { header: Record<string, unknown> | null; items: Record<string, unknown>[] } {
    try {
      const headers = localDB.exec("SELECT * FROM purchase_orders WHERE id=?", [id]);
      const items = localDB.exec("SELECT * FROM po_items WHERE po_id=? ORDER BY rowid", [id]);
      return { header: headers[0] ?? null, items };
    } catch (e) {
      console.error("[poService] getPOById error:", e);
      return { header: null, items: [] };
    }
  },

  /**
   * Fetch a specific PO by its visible PO number.
   */
  getPOByNumber(poNumber: string): { header: Record<string, unknown> | null; items: Record<string, unknown>[] } {
    try {
      const headers = localDB.exec("SELECT * FROM purchase_orders WHERE po_number=?", [poNumber]);
      if (headers.length === 0) return { header: null, items: [] };
      const id = String(headers[0].id);
      const items = localDB.exec("SELECT * FROM po_items WHERE po_id=? ORDER BY rowid", [id]);
      return { header: headers[0], items };
    } catch (e) {
      console.error("[poService] getPOByNumber error:", e);
      return { header: null, items: [] };
    }
  },

  /**
   * Updates PO item quantities when a GRN is saved against it.
   * If all items are completely fulfilled, updates header status to 'CLOSED'.
   * Otherwise 'PARTIAL'.
   */
  updatePOFulfillment(poId: string, receivedItems: { item_code: string; qty_received: number }[]) {
    try {
      // 1. Update received quantities on matching PO items
      for (const rx of receivedItems) {
        localDB.run(`
          UPDATE po_items 
          SET qty_received = qty_received + ? 
          WHERE po_id = ? AND item_code = ?
        `, [rx.qty_received, poId, rx.item_code]);
      }

      // 2. Check overall fulfillment status
      const items = localDB.exec("SELECT qty_ordered, qty_received FROM po_items WHERE po_id = ?", [poId]);
      
      let allFulfilled = true;
      let anyReceived = false;

      for (const item of items) {
        const ord = Number(item.qty_ordered) || 0;
        const rcv = Number(item.qty_received) || 0;
        if (rcv > 0) anyReceived = true;
        if (rcv < ord) allFulfilled = false;
      }

      let newStatus = "OPEN";
      if (allFulfilled) newStatus = "CLOSED";
      else if (anyReceived) newStatus = "PARTIAL";

      localDB.run("UPDATE purchase_orders SET status = ? WHERE id = ?", [newStatus, poId]);
      
      localDB.save();
    } catch(e) {
       console.error("[poService] updatePOFulfillment error:", e);
    }
  }
};

export default poService;

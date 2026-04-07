/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  S M R I T I - O S  ||  GOODS OUTWARD (GO) SERVICE
 *  Sovereignty Layer: Transfer Out, Purchase Returns, Misc Issues
 * ─────────────────────────────────────────────────────────────────────────────
 *  System Architect  : Jawahar R Mallah
 *  Parent Org        : AITDL NETWORK
 *  Copyright         : © 2026 AITDL.com & AITDL.in. All Rights Reserved.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { localDB } from "@/lib/db";
import parameterService from "./parameterService";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface GOHeader {
  document_type: "TRANSFER_OUT" | "PURCHASE_RETURN" | "MISC_ISSUE";
  reference_no?: string;
  destination_code?: string;
  destination_name?: string;
}

export interface GOItem {
  item_code: string;
  qty_issued: number;
  unit_cost: number;
  reason_code?: string;
}

export interface GOResult {
  success: boolean;
  go_id: string;
  go_number: string;
  items_saved: number;
  error?: string;
}

export interface StockValidationResult {
  allowed: boolean;
  message?: string;
}

// ── Service ───────────────────────────────────────────────────────────────────
const goService = {

  generateGONumber(): string {
    try {
      const prefix = parameterService.getParam("DocumentPrefix", "go_prefix", "GO/");
      const rows = localDB.exec(
        "SELECT current_number FROM numbering_prefixes WHERE entity_code='INVENTORY_GO'"
      );
      if (rows.length > 0) {
        const { current_number } = rows[0] as { current_number: number };
        const num = String(current_number).padStart(4, "0");
        localDB.run(
          "UPDATE numbering_prefixes SET current_number = current_number + 1 WHERE entity_code='INVENTORY_GO'"
        );
        return `${prefix}${num}`;
      }
      return `${prefix}${Date.now()}`;
    } catch {
      return `GO/${Date.now()}`;
    }
  },

  /**
   * Retrieves the current available stock for an item by summing stock_ledger entries.
   */
  getCurrentStock(item_code: string): number {
    try {
      const rows = localDB.exec(
        `SELECT (SUM(IFNULL(qty_in, 0)) - SUM(IFNULL(qty_out, 0))) as current_qty 
         FROM stock_ledger 
         WHERE item_code = ?`,
        [item_code]
      );
      if (rows.length > 0 && rows[0].current_qty !== null) {
         return Number(rows[0].current_qty);
      }
      return 0;
    } catch (err) {
      console.error(err);
      return 0;
    }
  },

  /**
   * Evaluates if the outbound quantity is permitted based on the stock_out_action parameter.
   */
  validateStockOutward(item_code: string, requested_qty: number, document_type: string): StockValidationResult {
    // 1=Warn, 2=Disallow, 3=Stop bill update (Block)
    const stockOutAction = parameterService.getParam("Billing", "stock_out_action", "1");
    // Optionally check document_type specific checks like stock_check_misc_issue
    let checkConfig = "1";
    if (document_type === "MISC_ISSUE") checkConfig = parameterService.getParam("Outwards", "stock_check_misc_issue", "2");
    if (document_type === "PURCHASE_RETURN") checkConfig = parameterService.getParam("Outwards", "stock_check_purchase_returns", "1");
    if (document_type === "TRANSFER_OUT") checkConfig = parameterService.getParam("Outwards", "stock_check_transfer_out", "2");
    
    // Simplistic convergence: if stock_out_action == 2 / Display/Block OR config is 2/Block
    const shouldBlock = (stockOutAction === "2" || stockOutAction === "3" || checkConfig === "2" || checkConfig === "3");

    const available = this.getCurrentStock(item_code);
    
    if (requested_qty > available) {
      if (shouldBlock) {
        return { allowed: false, message: `Insufficient stock for ${item_code}. Available: ${available}, Requested: ${requested_qty}` };
      }
    }
    
    return { allowed: true };
  },

  async postGoodsOutward(header: GOHeader, items: GOItem[]): Promise<GOResult> {
    try {
      // 1. Validation Phase
      for (const item of items) {
         const validation = this.validateStockOutward(item.item_code, item.qty_issued, header.document_type);
         if (!validation.allowed) {
            return { success: false, go_id: "", go_number: "", items_saved: 0, error: validation.message };
         }
      }

      const goId = crypto.randomUUID();
      const goNum = this.generateGONumber();

      let total_qty = 0;
      let total_value = 0;

      items.forEach(i => {
        total_qty += i.qty_issued;
        total_value += (i.qty_issued * i.unit_cost);
      });

      // 2. Insert GO Header
      localDB.run(
        `INSERT INTO goods_outward (
           id, document_type, go_number, reference_no,
           destination_code, destination_name, 
           total_qty, total_value, status
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'POSTED')`,
        [
          goId, header.document_type, goNum, header.reference_no || '',
          header.destination_code || '', header.destination_name || '',
          total_qty, total_value
        ]
      );

      // 3. Insert Lines and Update Ledger
      for (const item of items) {
        const lineId = crypto.randomUUID();

        localDB.run(
          `INSERT INTO goods_outward_items (
            id, go_id, item_code, reason_code, qty_issued, unit_cost
          ) VALUES (?, ?, ?, ?, ?, ?)`,
          [
            lineId, goId, item.item_code, item.reason_code || '',
            item.qty_issued, item.unit_cost
          ]
        );

        // Explicit negative ledger impact (qty_out)
        localDB.run(
          `INSERT INTO stock_ledger (
            id, item_code, movement_type, document_type,
            document_id, document_number, movement_date,
            qty_in, qty_out, unit_cost, reference_note
          ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 0, ?, ?, ?)`,
          [
             crypto.randomUUID(), item.item_code, 'OUTWARD', header.document_type,
             goId, goNum, item.qty_issued, item.unit_cost, item.reason_code || ''
          ]
        );
      }

      await localDB.save();

      return {
        success: true,
        go_id: goId,
        go_number: goNum,
        items_saved: items.length
      };

    } catch (err: any) {
      console.error("GO Posting Error:", err);
      return { success: false, go_id: "", go_number: "", items_saved: 0, error: err.message || "DB transaction failed." };
    }
  }

};

export default goService;

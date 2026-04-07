/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  S M R I T I - O S  ||  VALIDATION ENGINE & MIDDLEWARE
 *  Sovereignty Layer: Level 3 Negative Stock Verification
 * ─────────────────────────────────────────────────────────────────────────────
 *  System Architect  : Jawahar R Mallah
 *  Parent Org        : AITDL NETWORK
 *  Copyright         : © 2026 AITDL.com & AITDL.in. All Rights Reserved.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { localDB } from "@/lib/db";
import parameterService from "./parameterService";

export interface StockValidationResult {
  status: "ok" | "warn" | "blocked";
  message: string;
  availableQty: number;
  requestedQty: number;
}

export const validationService = {

  /**
   * Evaluates if a given outward transaction (Sale, Transfer, Misc Issue) is allowed
   * strictly based on the Memory-Not-Code system parameters.
   */
  validateStockOutward(itemCode: string, requestedQty: number): StockValidationResult {
    // 1. Is validation enabled globally?
    const isValidationEnabled = parameterService.getParam("Billing", "check_stock_on_item_selection", "1");
    
    // If not enabled, bypass validation entirely.
    if (isValidationEnabled === "0") {
      return { status: "ok", message: "Validation bypassed dynamically.", availableQty: 99999, requestedQty };
    }

    try {
      // 2. Fetch purely available physical stock from the ledger
      const rows = localDB.exec(
        "SELECT SUM(qty_in) - SUM(qty_out) as available FROM stock_ledger WHERE item_code = ?",
        [itemCode]
      );
      
      const availableQty = rows.length > 0 && rows[0].available ? Number(rows[0].available) : 0;

      // 3. Compute condition
      if (requestedQty <= availableQty) {
        return { status: "ok", message: "Stock verification passed successfully.", availableQty, requestedQty };
      }

      // 4. Stock violation occurred! Determine the strictness level from parameters
      // 1=Warn, 2=Disallow/Block, 3=Stop bill update (Allow entry, block finish)
      const stockOutAction = parameterService.getParam("Billing", "stock_out_action", "1");

      if (stockOutAction === "2") {
        return { 
          status: "blocked", 
          message: `Blocked: Negative Stock. You need ${requestedQty} but only have ${availableQty} in ledger.`, 
          availableQty, 
          requestedQty 
        };
      } else if (stockOutAction === "3") {
        return { 
          status: "blocked", // UI should interpret this as a block on Commit, not on Entry. We will return 'blocked' to enforce strictness for now.
          message: `Blocked (Save): Negative Stock not allowed on final commit.`, 
          availableQty, 
          requestedQty 
        };
      } else {
        // Mode 1: Warn
        return { 
          status: "warn", 
          message: `Warning: Negative Stock. You requested ${requestedQty} but only have ${availableQty}. Transaction allowed by config.`, 
          availableQty, 
          requestedQty 
        };
      }

    } catch (e) {
      console.error("[validationService] engine error:", e);
      return { status: "warn", message: "Engine Error: Allowing transaction cautiously.", availableQty: 0, requestedQty };
    }
  }

};

export default validationService;

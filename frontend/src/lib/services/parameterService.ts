/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  S M R I T I - O S  ||  SYSTEM PARAMETERS SERVICE
 *  Sovereignty Layer: Shoper 9 Compatible Memory-Not-Code Configurations
 * ─────────────────────────────────────────────────────────────────────────────
 *  System Architect  : Jawahar R Mallah
 *  Parent Org        : AITDL NETWORK
 *  Copyright         : © 2026 AITDL.com & AITDL.in. All Rights Reserved.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { localDB } from "@/lib/db";

export interface SystemParameter {
  id: string;
  category: string;
  param_key: string;
  param_value: string;
  description: string;
  attribute_type: string;
}

const parameterService = {
  /**
   * Fetch all configurations, segmented by category.
   */
  getAllGroupedByCategory(): Record<string, SystemParameter[]> {
    try {
      const rows = localDB.exec("SELECT * FROM system_parameters ORDER BY category, param_key") as unknown as SystemParameter[];
      const grouped: Record<string, SystemParameter[]> = {};
      for (const row of rows) {
        if (!grouped[row.category]) grouped[row.category] = [];
        grouped[row.category].push(row);
      }
      return grouped;
    } catch (e) {
      console.error("[parameterService] getAllGrouped error:", e);
      return {};
    }
  },

  /**
   * Save an array of updated parameters in a single batch.
   */
  async updateParameters(updates: { id: string; param_value: string }[]): Promise<boolean> {
    try {
      for (const update of updates) {
        localDB.run(
          "UPDATE system_parameters SET param_value = ? WHERE id = ?",
          [update.param_value, update.id]
        );
      }
      await localDB.save();
      return true;
    } catch (e) {
      console.error("[parameterService] updateParameters error:", e);
      return false;
    }
  },

  /**
   * Get a single parameter configuration value fast.
   */
  getParam(category: string, param_key: string, fallback: string = ""): string {
     try {
       const rows = localDB.exec(
         "SELECT param_value FROM system_parameters WHERE category=? AND param_key=?",
         [category, param_key]
       );
       if (rows.length > 0) return String(rows[0].param_value);
     } catch (e) {}
     return fallback;
  }
};

export default parameterService;

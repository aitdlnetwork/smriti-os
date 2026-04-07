/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  S M R I T I - O S  ||  PRICING & PROMOTIONS SERVICE
 *  Sovereignty Layer: Billing Architecture, Taxation, Override Defenses
 * ─────────────────────────────────────────────────────────────────────────────
 *  System Architect  : Jawahar R Mallah
 *  Parent Org        : AITDL NETWORK
 *  Copyright         : © 2026 AITDL.com & AITDL.in. All Rights Reserved.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import parameterService from "./parameterService";

// Interface dependencies from POS terminal
export interface CartRow {
  id: string;
  sno: number;
  itemCode: string;
  description: string;
  size: string;
  stock: number;
  qty: number;
  mrp: number;
  rate: number;
  discPct: number;
  discAmt: number;
  taxPct: number;
  taxAmt: number;
  cgstAmt: number;
  sgstAmt: number;
  igstAmt: number;
  salesman: string;
  amount: number;
  flashKey?: number;
}

export interface CustomerProfile {
  id?: string;
  name: string;
  phone: string;
  tier: "PLATINUM" | "GOLD" | "SILVER" | "REGULAR" | "BRONZE";
  lifetimeSpend: number;
  lastVisit: string;
  points: number;
  taxType: "INCLUSIVE" | "EXCLUSIVE";
  destCode: "LOC" | "OUT";
  isB2B: boolean;
  gstin?: string;
}

const pricingService = {

  /**
   * Recalculates all arithmetic dependencies of a given row.
   * Ensures physical GST mapping depending on EXCLUSIVE vs INCLUSIVE paths.
   */
  calculateRow(row: CartRow, profile: CustomerProfile | null): CartRow {
    // 1. Discount Assessment
    const discAmt = row.discAmt > 0 ? row.discAmt : Number(((row.rate * row.discPct) / 100).toFixed(2));
    const sellingRate = row.rate - discAmt;
    
    let taxableValue = 0;
    let taxAmt = 0;
    let cgstAmt = 0;
    let sgstAmt = 0;
    let igstAmt = 0;

    const isExclusive = profile?.taxType === 'EXCLUSIVE';
    const isOutstation = profile?.destCode === 'OUT';

    // 2. Tax Convergence
    if (isExclusive) {
      // Forward Tax: Rate acts as the raw base amount
      taxableValue = sellingRate * row.qty;
      taxAmt = Number(((taxableValue * row.taxPct) / 100).toFixed(2));
    } else {
      // Reverse Tax: Rate behaves inclusively (MOP)
      const totalWithTax = sellingRate * row.qty;
      taxableValue = Number((totalWithTax / (1 + row.taxPct / 100)).toFixed(2));
      taxAmt = Number((totalWithTax - taxableValue).toFixed(2));
    }

    // 3. Tax Routing (Region mapping)
    if (isOutstation) {
      igstAmt = taxAmt;
    } else {
      cgstAmt = Number((taxAmt / 2).toFixed(2));
      sgstAmt = Number((taxAmt - cgstAmt).toFixed(2));
    }

    const amount = Number((taxableValue + taxAmt).toFixed(2));

    return { ...row, discAmt, taxAmt, cgstAmt, sgstAmt, igstAmt, amount };
  },

  /**
   * Verifies if manual modification to an item's standard rate is permitted.
   */
  canAlterRate(): boolean {
    const overrideGlobal = parameterService.getParam("Billing", "allow_rate_alteration", "0");
    return overrideGlobal === "1";
  },

  /**
   * Applies promotional cascades asynchronously across the bill payload.
   * e.g. BUY 2 GET 1 or automated LSQ tiering. (v1.0 pass-through)
   */
  applyPromotions(rows: CartRow[], profile: CustomerProfile | null): CartRow[] {
     // A sovereign injection point for complex Shoper 9 multi-tally promos logic.
     // By default in this iteration, we simply recalculate the engine integrity.
     return rows.map(r => r.itemCode ? this.calculateRow(r, profile) : r);
  }

};

export default pricingService;

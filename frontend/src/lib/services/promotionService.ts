import { localDB } from "../db";

export interface CartRow {
  id: string;
  sno: number;
  itemCode: string;
  description: string;
  size: string;
  qty: number;
  mrp: number;
  rate: number;
  discPct: number;
  discAmt: number;
  taxPct: number;
  taxAmt: number;
  amount: number;
  brandCode?: string;
  categoryCode?: string;
  appliedPromoCode?: string;
}

/**
 * P R O M O T I O N   E N G I N E
 * 
 * Takes a cart and applies the best promotions based on rules. 
 */
export async function applyPromotions(rows: CartRow[]): Promise<CartRow[]> {
  if (!localDB.isInitialized) return rows;

  try {
    // 1. Fetch Active Promotions ordered by Priority (lowest first)
    const now = new Date().toISOString().split('T')[0];
    const promos = localDB.exec(`
      SELECT * FROM sales_promotions 
      WHERE is_active = 1 
      AND (start_date IS NULL OR start_date <= '${now}')
      AND (end_date IS NULL OR end_date >= '${now}')
      ORDER BY priority ASC
    `) as any[];

    if (promos.length === 0) return rows;

    const newRows = [...rows];

    for (const promo of promos) {
      // 2. Fetch Rules and Assignments for this Promo
      const rules = localDB.exec(`SELECT * FROM promotion_rules WHERE promo_id = '${promo.id}'`);
      const assignments = localDB.exec(`SELECT * FROM promotion_assignments WHERE promo_id = '${promo.id}'`);

      if (rules.length === 0 || assignments.length === 0) continue;

      // 3. Match items based on assignments
      for (let i = 0; i < newRows.length; i++) {
        const row = newRows[i];
        if (!row.itemCode) continue;

        // Check if item is already discounted by another promo (Shoper rule: no double dipping)
        if (row.discPct > 0) continue; 

        let isMatch = false;
        for (const ass of assignments as any[]) {
          if (ass.assign_type === 'CATEGORY' && ass.assign_value === 'ALL') { isMatch = true; break; }
          if (ass.assign_type === 'ITEM' && ass.assign_value === row.itemCode) { isMatch = true; break; }
          if (ass.assign_type === 'BRAND' && ass.assign_value === row.brandCode) { isMatch = true; break; }
          if (ass.assign_type === 'CATEGORY' && ass.assign_value === row.categoryCode) { isMatch = true; break; }
        }

        if (isMatch) {
          // 4. Apply Rule (Logic: Single Item Discount for now)
          const rule = rules[0] as any;
          if (rule.target_type === 'PERCENT') {
            const discAmt = (row.rate * rule.target_value) / 100;
            newRows[i] = { 
              ...row, 
              discPct: rule.target_value, 
              discAmt: discAmt,
              appliedPromoCode: promo.promo_code 
            };
          } else if (rule.target_type === 'AMOUNT') {
            // High-Precision: Apply absolute AMOUNT discount
            const discAmt = Number(rule.target_value);
            const discPct = (discAmt / row.rate) * 100;
            newRows[i] = { 
              ...row, 
              discAmt: discAmt, 
              discPct: Number(discPct.toFixed(2)),
              appliedPromoCode: promo.promo_code
            };
          }
        }
      }
    }

    return newRows.map(r => ({
        ...r,
        amount: (r.rate * r.qty) - (r.discAmt * r.qty)
    }));
  } catch (err) {
    console.error("Promotion Error", err);
    return rows;
  }
}

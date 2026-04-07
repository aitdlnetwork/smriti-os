/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  S M R I T I - O S  ||  PRICE REVISION SERVICE
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { localDB } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export interface PriceRevision {
  id: string; revision_code: string; reason: string;
  effective_date: string; status: string;
  authorized_by: string; authorized_at: string;
  created_by: string; created_at: string;
}

export interface PriceRevisionItem {
  id: string; revision_id: string; item_id: string;
  old_mrp: number; new_mrp: number;
  old_dealer_price: number; new_dealer_price: number;
  item_code?: string; description?: string; current_mrp?: number;
}

export const priceRevisionService = {
  getAll: (): PriceRevision[] =>
    localDB.exec(`SELECT * FROM price_revisions ORDER BY created_at DESC`) as any,

  getById: (id: string): PriceRevision | null => {
    const r = localDB.exec(`SELECT * FROM price_revisions WHERE id=?`, [id]) as any[];
    return r[0] ?? null;
  },

  getItems: (revisionId: string): PriceRevisionItem[] =>
    localDB.exec(`
      SELECT pri.*, im.item_code, im.description, im.mrp as current_mrp
      FROM price_revision_items pri
      JOIN item_master im ON pri.item_id = im.id
      WHERE pri.revision_id = ?
      ORDER BY im.item_code ASC
    `, [revisionId]) as any,

  create: (reason: string, effectiveDate: string): string => {
    const id = uuidv4();
    const prefixRows = localDB.exec(`SELECT prefix, current_number FROM numbering_prefixes WHERE entity_code='PRICE_REV'`) as any[];
    const { prefix = "PR/", current_number = 1 } = prefixRows[0] ?? {};
    const code = `${prefix}${String(current_number).padStart(4, "0")}`;
    localDB.run(`UPDATE numbering_prefixes SET current_number=current_number+1 WHERE entity_code='PRICE_REV'`);
    localDB.run(
      `INSERT INTO price_revisions (id,revision_code,reason,effective_date,status,created_by) VALUES (?,?,?,?,'DRAFT','ADMIN')`,
      [id, code, reason, effectiveDate]
    );
    return id;
  },

  addItem: (revisionId: string, itemId: string, newMrp: number, newDealerPrice: number): void => {
    const existing = localDB.exec(`SELECT mrp, mop FROM item_master WHERE id=?`, [itemId]) as any[];
    if (!existing.length) throw new Error("Item not found.");
    const { mrp: oldMrp, mop: oldDealer } = existing[0];
    localDB.run(
      `INSERT OR REPLACE INTO price_revision_items (id,revision_id,item_id,old_mrp,new_mrp,old_dealer_price,new_dealer_price) VALUES (?,?,?,?,?,?,?)`,
      [uuidv4(), revisionId, itemId, oldMrp, newMrp, oldDealer, newDealerPrice]
    );
  },

  removeItem: (revisionItemId: string): void => {
    localDB.run(`DELETE FROM price_revision_items WHERE id=?`, [revisionItemId]);
  },

  authorize: (revisionId: string): void => {
    const rev = localDB.exec(`SELECT status FROM price_revisions WHERE id=?`, [revisionId]) as any[];
    if (!rev.length || rev[0].status !== "DRAFT") throw new Error("Only DRAFT revisions can be authorized.");
    const items = localDB.exec(`SELECT * FROM price_revision_items WHERE revision_id=?`, [revisionId]) as any[];
    for (const item of items) {
      localDB.run(`UPDATE item_master SET mrp=?, mop=? WHERE id=?`, [item.new_mrp, item.new_dealer_price, item.item_id]);
    }
    localDB.run(
      `UPDATE price_revisions SET status='AUTHORIZED', authorized_by='ADMIN', authorized_at=CURRENT_TIMESTAMP WHERE id=?`,
      [revisionId]
    );
  },

  cancel: (revisionId: string): void => {
    localDB.run(`UPDATE price_revisions SET status='CANCELLED' WHERE id=? AND status='DRAFT'`, [revisionId]);
  },
};

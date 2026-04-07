/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  S M R I T I - O S  ||  PRICE REVISION MANAGER
 *  MRP / Dealer Price Journal · Draft → Authorize Workflow · Audit Trail
 * ─────────────────────────────────────────────────────────────────────────────
 */
"use client";
import React, { useState, useEffect, useRef } from "react";
import { priceRevisionService, type PriceRevision, type PriceRevisionItem } from "@/lib/services/priceRevisionService";
import { localDB } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

type View = "LIST" | "DETAIL";

export default function PriceRevisionManager() {
  const [view, setView] = useState<View>("LIST");
  const [revisions, setRevisions] = useState<PriceRevision[]>([]);
  const [current, setCurrent] = useState<PriceRevision | null>(null);
  const [items, setItems] = useState<PriceRevisionItem[]>([]);
  const [itemSearch, setItemSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [toast, setToast] = useState({ msg: "", type: "info" });
  const [newForm, setNewForm] = useState({ reason: "", effective_date: new Date().toISOString().split("T")[0] });
  const [showNewForm, setShowNewForm] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const load = () => setRevisions(priceRevisionService.getAll());
  const loadItems = (revId: string) => setItems(priceRevisionService.getItems(revId));
  useEffect(() => { if (localDB.isInitialized) load(); }, []);

  const showToast = (msg: string, type: "info" | "error" | "success" = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: "", type: "info" }), 3500);
  };

  const handleCreate = async () => {
    if (!newForm.effective_date) return showToast("Effective date required.", "error");
    try {
      const id = priceRevisionService.create(newForm.reason, newForm.effective_date);
      await localDB.save();
      load();
      const rev = priceRevisionService.getById(id);
      if (rev) { setCurrent(rev); setItems([]); setView("DETAIL"); }
      setShowNewForm(false);
      showToast("✓ New price revision created.", "success");
    } catch (err: any) { showToast(err.message, "error"); }
  };

  const handleItemSearch = (q: string) => {
    setItemSearch(q);
    if (q.length < 2) { setSearchResults([]); return; }
    const res = localDB.exec(
      `SELECT id, item_code, description, mrp, mop FROM item_master WHERE item_code LIKE ? OR description LIKE ? LIMIT 10`,
      [`%${q}%`, `%${q}%`]
    );
    setSearchResults(res as any[]);
  };

  const handleAddItem = async (itemRow: any) => {
    if (!current) return;
    try {
      priceRevisionService.addItem(current.id, itemRow.id, itemRow.mrp, itemRow.mop);
      await localDB.save();
      loadItems(current.id);
      setItemSearch("");
      setSearchResults([]);
      searchRef.current?.focus();
    } catch (err: any) { showToast(err.message, "error"); }
  };

  const handleUpdatePrice = async (revItemId: string, field: "new_mrp" | "new_dealer_price", val: number) => {
    localDB.run(`UPDATE price_revision_items SET ${field}=? WHERE id=?`, [val, revItemId]);
    await localDB.save();
    if (current) loadItems(current.id);
  };

  const handleRemoveItem = async (revItemId: string) => {
    priceRevisionService.removeItem(revItemId);
    await localDB.save();
    if (current) loadItems(current.id);
  };

  const handleAuthorize = async () => {
    if (!current) return;
    if (!confirm(`Authorizing this revision will permanently update MRP/Dealer Price for ${items.length} items.
This cannot be undone. Proceed?`)) return;
    try {
      priceRevisionService.authorize(current.id);
      await localDB.save();
      load();
      const rev = priceRevisionService.getById(current.id);
      if (rev) setCurrent(rev);
      showToast("✓ Price revision authorized. Prices updated.", "success");
    } catch (err: any) { showToast(err.message, "error"); }
  };

  const statusColor: Record<string, string> = { DRAFT: "#fbbf24", AUTHORIZED: "#10b981", CANCELLED: "#f87171" };

  return (
    <div className="pr-mgr">
      {toast.msg && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}

      {view === "LIST" && (
        <>
          <div className="pr-header">
            <div><div className="pr-title">PRICE REVISION MANAGER</div><div className="pr-sub">MRP/Dealer Price Journal · Authorize Workflow · Audit Trail</div></div>
            <button className="add-btn" onClick={() => setShowNewForm(true)}>＋ NEW REVISION</button>
          </div>

          {showNewForm && (
            <div className="new-form">
              <div className="nf-title">CREATE PRICE REVISION</div>
              <div className="nf-row">
                <div className="nf-field"><label>EFFECTIVE DATE *</label><input type="date" value={newForm.effective_date} onChange={e => setNewForm(p => ({ ...p, effective_date: e.target.value }))} /></div>
                <div className="nf-field"><label>REASON</label><input value={newForm.reason} onChange={e => setNewForm(p => ({ ...p, reason: e.target.value }))} placeholder="Season end revision, GST change…" /></div>
                <button className="nf-create" onClick={handleCreate}>CREATE</button>
                <button className="nf-cancel" onClick={() => setShowNewForm(false)}>×</button>
              </div>
            </div>
          )}

          <div className="rev-list">
            {revisions.length === 0 && <div className="empty-state">No revisions yet. Click + NEW REVISION to start.</div>}
            {revisions.map(rev => (
              <div key={rev.id} className="rev-card" onClick={() => { setCurrent(rev); loadItems(rev.id); setView("DETAIL"); }}>
                <div className="rc-left">
                  <div className="rc-code">{rev.revision_code}</div>
                  <div className="rc-reason">{rev.reason || "—"}</div>
                </div>
                <div className="rc-mid">
                  <div className="rc-eff">Effective: {rev.effective_date}</div>
                  <div className="rc-created">Created: {new Date(rev.created_at).toLocaleDateString("en-IN")}</div>
                </div>
                <div className="rc-right">
                  <span className="rc-status" style={{ background: statusColor[rev.status] + "22", color: statusColor[rev.status] }}>{rev.status}</span>
                  {rev.authorized_by && <div className="rc-auth">Auth: {rev.authorized_by}</div>}
                </div>
                <div className="rc-arrow">→</div>
              </div>
            ))}
          </div>
        </>
      )}

      {view === "DETAIL" && current && (
        <>
          <div className="pr-header">
            <div>
              <button className="back-btn" onClick={() => setView("LIST")}>← ALL REVISIONS</button>
              <div className="pr-title" style={{ marginTop: 8 }}>{current.revision_code}</div>
              <div className="pr-sub">{current.reason} · Effective: {current.effective_date}</div>
            </div>
            <div className="detail-acts">
              <span className="rc-status" style={{ background: statusColor[current.status] + "22", color: statusColor[current.status] }}>{current.status}</span>
              {current.status === "DRAFT" && (
                <button className="auth-btn" onClick={handleAuthorize}>✓ AUTHORIZE & APPLY PRICES</button>
              )}
            </div>
          </div>

          {current.status === "DRAFT" && (
            <div className="item-search-bar">
              <div className="isb-label">SCAN / SEARCH ITEM</div>
              <div className="isb-input-wrap">
                <input ref={searchRef} autoFocus className="isb-input" placeholder="Type SKU code or description…" value={itemSearch} onChange={e => handleItemSearch(e.target.value)} />
                {searchResults.length > 0 && (
                  <div className="isb-dropdown">
                    {searchResults.map(r => (
                      <div key={r.id} className="isb-result" onClick={() => handleAddItem(r)}>
                        <span className="isr-code">{r.item_code}</span>
                        <span className="isr-desc">{r.description}</span>
                        <span className="isr-mrp">₹{r.mrp}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="items-grid-wrap">
            <table className="items-table">
              <thead>
                <tr>
                  <th>SKU CODE</th><th>DESCRIPTION</th>
                  <th>CURRENT MRP</th><th>NEW MRP</th>
                  <th>CURRENT DEALER</th><th>NEW DEALER</th>
                  <th>Δ MRP</th>
                  {current.status === "DRAFT" && <th></th>}
                </tr>
              </thead>
              <tbody>
                {items.map(item => {
                  const delta = (item.new_mrp ?? 0) - (item.old_mrp ?? 0);
                  return (
                    <tr key={item.id} className={delta > 0 ? "row-up" : delta < 0 ? "row-down" : ""}>
                      <td className="td-code">{item.item_code}</td>
                      <td className="td-desc">{item.description}</td>
                      <td className="td-price">₹{item.old_mrp}</td>
                      <td className="td-price-edit">
                        {current.status === "DRAFT"
                          ? <input type="number" defaultValue={item.new_mrp} onBlur={e => handleUpdatePrice(item.id, "new_mrp", Number(e.target.value))} />
                          : `₹${item.new_mrp}`
                        }
                      </td>
                      <td className="td-price">₹{item.old_dealer_price}</td>
                      <td className="td-price-edit">
                        {current.status === "DRAFT"
                          ? <input type="number" defaultValue={item.new_dealer_price} onBlur={e => handleUpdatePrice(item.id, "new_dealer_price", Number(e.target.value))} />
                          : `₹${item.new_dealer_price}`
                        }
                      </td>
                      <td className={`td-delta ${delta > 0 ? "delta-up" : delta < 0 ? "delta-down" : ""}`}>
                        {delta !== 0 ? `${delta > 0 ? "+" : ""}₹${delta}` : "—"}
                      </td>
                      {current.status === "DRAFT" && <td><button className="del-row" onClick={() => handleRemoveItem(item.id)}>✕</button></td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {items.length === 0 && <div className="empty-state">No items added. Search and add items above.</div>}
          </div>

          {items.length > 0 && (
            <div className="revision-summary">
              <span>Total Items: {items.length}</span>
              <span>Avg Δ MRP: ₹{(items.reduce((s, i) => s + (i.new_mrp - i.old_mrp), 0) / items.length).toFixed(2)}</span>
            </div>
          )}
        </>
      )}

      <style jsx>{`
        .pr-mgr { color: #fff; font-family: 'JetBrains Mono', monospace; display: flex; flex-direction: column; gap: 20px; height: 100%; }
        .pr-header { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
        .pr-title { font-size: 15px; font-weight: 900; color: #fbbf24; letter-spacing: 2px; }
        .pr-sub { font-size: 10px; color: #555; margin-top: 2px; }
        .add-btn, .auth-btn { background: #fbbf24; color: #000; border: none; padding: 10px 18px; border-radius: 8px; font-weight: 900; font-size: 12px; cursor: pointer; }
        .auth-btn { background: #10b981; color: #000; }
        .back-btn { background: transparent; border: 1px solid #333; color: #666; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 11px; font-family: 'JetBrains Mono', monospace; }
        .detail-acts { display: flex; align-items: center; gap: 12px; }
        .new-form { background: #0a0a14; border: 1px solid #2e2450; border-radius: 12px; padding: 18px 20px; display: flex; flex-direction: column; gap: 12px; }
        .nf-title { font-size: 11px; font-weight: 900; color: #fbbf24; letter-spacing: 1px; }
        .nf-row { display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap; }
        .nf-field { display: flex; flex-direction: column; gap: 5px; flex: 1; min-width: 180px; }
        .nf-field label { font-size: 9px; color: #555; font-weight: 700; }
        .nf-field input { background: #111; border: 1px solid #333; color: #fff; padding: 9px 12px; border-radius: 8px; font-size: 13px; outline: none; font-family: 'JetBrains Mono', monospace; }
        .nf-create { background: #fbbf24; color: #000; border: none; padding: 9px 20px; border-radius: 8px; font-weight: 900; cursor: pointer; align-self: flex-end; }
        .nf-cancel { background: #111; border: 1px solid #333; color: #666; padding: 9px 14px; border-radius: 8px; cursor: pointer; align-self: flex-end; font-size: 16px; }
        .rev-list { display: flex; flex-direction: column; gap: 10px; }
        .rev-card { background: #050505; border: 1px solid #1a1a1a; border-radius: 12px; padding: 18px 20px; display: flex; align-items: center; gap: 20px; cursor: pointer; transition: all 0.2s; }
        .rev-card:hover { background: #0a0a0a; border-color: #333; }
        .rc-left { flex: 1; }
        .rc-code { font-size: 15px; font-weight: 900; color: #fbbf24; }
        .rc-reason { font-size: 11px; color: #555; margin-top: 2px; }
        .rc-mid { flex: 1; }
        .rc-eff { font-size: 12px; color: #aaa; }
        .rc-created { font-size: 10px; color: #444; margin-top: 2px; }
        .rc-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
        .rc-status { font-size: 10px; font-weight: 900; padding: 4px 10px; border-radius: 6px; }
        .rc-auth { font-size: 9px; color: #444; }
        .rc-arrow { color: #333; font-size: 18px; }
        .rev-card:hover .rc-arrow { color: #fbbf24; }
        /* Item Search */
        .item-search-bar { background: #0a0a14; border: 1px solid #2e2450; border-radius: 12px; padding: 14px 18px; display: flex; align-items: center; gap: 16px; }
        .isb-label { font-size: 9px; color: #fbbf24; font-weight: 700; letter-spacing: 1px; white-space: nowrap; }
        .isb-input-wrap { position: relative; flex: 1; }
        .isb-input { width: 100%; background: #111; border: 1px solid #333; color: #fff; padding: 10px 14px; border-radius: 8px; font-size: 13px; outline: none; font-family: 'JetBrains Mono', monospace; }
        .isb-input:focus { border-color: #fbbf24; }
        .isb-dropdown { position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: #0f0f0f; border: 1px solid #333; border-radius: 8px; overflow: hidden; z-index: 50; }
        .isb-result { display: flex; align-items: center; gap: 12px; padding: 10px 14px; cursor: pointer; transition: background 0.1s; }
        .isb-result:hover { background: #1a1a2e; }
        .isr-code { font-size: 12px; font-weight: 700; color: #fbbf24; width: 160px; }
        .isr-desc { flex: 1; font-size: 11px; color: #aaa; }
        .isr-mrp { font-size: 13px; font-weight: 700; color: #10b981; }
        /* Items Grid */
        .items-grid-wrap { flex: 1; overflow-y: auto; border: 1px solid #1a1a1a; border-radius: 10px; }
        .items-table { width: 100%; border-collapse: collapse; }
        .items-table th { background: #0a0a0a; padding: 10px 12px; text-align: left; font-size: 9px; color: #444; font-weight: 700; letter-spacing: 1px; position: sticky; top: 0; border-bottom: 1px solid #1a1a1a; }
        .items-table td { padding: 0; border-bottom: 1px solid #0a0a0a; }
        .td-code { padding: 12px; font-size: 12px; font-weight: 700; color: #fbbf24; }
        .td-desc { padding: 12px; font-size: 11px; color: #aaa; max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .td-price { padding: 12px; font-size: 12px; color: #666; text-align: right; }
        .td-price-edit input { width: 100%; background: transparent; border: none; color: #fff; padding: 12px; font-size: 12px; outline: none; text-align: right; font-family: 'JetBrains Mono', monospace; }
        .td-price-edit input:focus { background: #1a1a2e; color: #818cf8; }
        .td-delta { padding: 12px; font-size: 11px; font-weight: 700; text-align: right; }
        .delta-up { color: #f87171; }
        .delta-down { color: #10b981; }
        .row-up td { background: #1a0a0a; }
        .row-down td { background: #0a1a0f; }
        .del-row { background: transparent; border: none; color: #333; padding: 8px 12px; cursor: pointer; font-size: 14px; }
        .del-row:hover { color: #f87171; }
        .revision-summary { background: #050505; border: 1px solid #1a1a1a; border-radius: 8px; padding: 12px 16px; display: flex; gap: 32px; font-size: 12px; color: #555; }
        .empty-state { text-align: center; padding: 40px; font-size: 12px; color: #333; }
        .toast { position: fixed; bottom: 32px; right: 32px; padding: 12px 20px; border-radius: 10px; font-size: 12px; z-index: 999; }
        .toast-info { background: #0f172a; border: 1px solid #334155; color: #94a3b8; }
        .toast-success { background: #064e3b; border: 1px solid #10b981; color: #6ee7b7; }
        .toast-error { background: #450a0a; border: 1px solid #f87171; color: #fca5a5; }
      `}</style>
    </div>
  );
}

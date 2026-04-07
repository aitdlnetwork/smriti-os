"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSmritiDB } from "@/lib/useSmritiDB";
import { localDB } from "@/lib/db";

interface Promotion {
  id: string;
  promo_code: string;
  description: string;
  promo_type: string;
  priority: number;
  start_date: string;
  end_date: string;
  is_active: number;
}

export default function PromotionsPage() {
  const { isReady } = useSmritiDB();
  const [promos, setPromos] = useState<Promotion[]>([]);
  const [showAdd, setShowAdd] = useState(false);

  // Form State
  const [newPromo, setNewPromo] = useState({
    code: "",
    desc: "",
    type: "ITEM_DISCOUNT",
    val: 10,
    target: "PERCENT",
    assign: "ALL"
  });

  const loadPromos = () => {
    if (isReady && localDB.isInitialized) {
      const res = localDB.exec("SELECT * FROM sales_promotions ORDER BY priority ASC");
      setPromos(res as any);
    }
  };

  useEffect(() => {
    loadPromos();
  }, [isReady]);

  const handleSave = async () => {
    const id = `p-${Date.now()}`;
    const r_id = `r-${Date.now()}`;
    const a_id = `a-${Date.now()}`;

    try {
      localDB.run(`INSERT INTO sales_promotions (id, promo_code, description, promo_type, priority, is_active) 
                   VALUES (?, ?, ?, ?, ?, ?)`, 
                   [id, newPromo.code, newPromo.desc, newPromo.type, 5, 1]);
      
      localDB.run(`INSERT INTO promotion_rules (id, promo_id, rule_type, rule_value, target_type, target_value)
                   VALUES (?, ?, ?, ?, ?, ?)`,
                   [r_id, id, newPromo.target, 0, newPromo.target, newPromo.val]);

      localDB.run(`INSERT INTO promotion_assignments (id, promo_id, assign_type, assign_value)
                   VALUES (?, ?, ?, ?)`,
                   [a_id, id, 'CATEGORY', newPromo.assign]);

      await localDB.save();
      loadPromos();
      setShowAdd(false);
      alert("Promotion saved and live!");
    } catch (e) {
      alert("Error saving promo: " + e);
    }
  };

  if (!isReady) return <div className="erp-loading">Initializing Promotion Engine...</div>;

  return (
    <div className="st-container">
      {/* Header */}
      <div className="st-header">
        <div className="st-title-group">
          <Link href="/erp" className="st-back-link">← Back to Dashboard</Link>
          <h1>Sales Promotion Catalogue</h1>
          <p>Define automatic discount rules and high-velocity retail schemes.</p>
        </div>
        <button className="st-save-btn" onClick={() => setShowAdd(true)}>+ Define New Scheme</button>
      </div>

      <div className="st-grid">
        {/* List Card */}
        <div className="st-card" style={{ gridColumn: "span 2" }}>
          <div className="st-card-header">
            <h3 className="st-card-title">📦 Active Schemes</h3>
          </div>
          <table className="st-table">
            <thead>
              <tr>
                <th>Priority</th>
                <th>Code</th>
                <th>Description</th>
                <th>Type</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {promos.map(p => (
                <tr key={p.id}>
                  <td><strong>#{p.priority}</strong></td>
                  <td><code className="erp-badge erp-badge--blue">{p.promo_code}</code></td>
                  <td>{p.description}</td>
                  <td>{p.promo_type}</td>
                  <td>
                    <span className={`erp-badge ${p.is_active ? "erp-badge--green" : "erp-badge--red"}`}>
                      {p.is_active ? "ACTIVE" : "EXPIRED"}
                    </span>
                  </td>
                </tr>
              ))}
              {promos.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                    No active promotions defined. High-velocity engine is idling.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Add Modal */}
        {showAdd && (
          <div className="shp-modal-overlay">
            <div className="shp-modal" style={{ maxWidth: "500px" }}>
              <div className="shp-modal-title">🏷️ New Promotion Scheme</div>
              
              <div className="shp-modal-field">
                <label>Promo Code</label>
                <input 
                  type="text" 
                  className="shp-modal-input" 
                  value={newPromo.code} 
                  onChange={e => setNewPromo({...newPromo, code: e.target.value.toUpperCase()})}
                  placeholder="e.g. FESTIVE20"
                />
              </div>

              <div className="shp-modal-field">
                <label>Description</label>
                <input 
                  type="text" 
                  className="shp-modal-input" 
                  value={newPromo.desc} 
                  onChange={e => setNewPromo({...newPromo, desc: e.target.value})}
                  placeholder="e.g. Diwali Flash Sale"
                />
              </div>

              <div className="shp-modal-row">
                <div className="shp-modal-field" style={{ flex: 1 }}>
                  <label>Type</label>
                  <select 
                    className="shp-modal-input" 
                    value={newPromo.target}
                    onChange={e => setNewPromo({...newPromo, target: e.target.value})}
                  >
                    <option value="PERCENT">Percentage %</option>
                    <option value="AMOUNT">Fixed Amount ₹</option>
                  </select>
                </div>
                <div className="shp-modal-field" style={{ flex: 1 }}>
                  <label>Value</label>
                  <input 
                    type="number" 
                    className="shp-modal-input" 
                    value={newPromo.val} 
                    onChange={e => setNewPromo({...newPromo, val: Number(e.target.value)})}
                  />
                </div>
              </div>

              <div className="shp-modal-field">
                <label>Apply To</label>
                <select 
                  className="shp-modal-input" 
                  value={newPromo.assign}
                  onChange={e => setNewPromo({...newPromo, assign: e.target.value})}
                >
                  <option value="ALL">All Items</option>
                  <option value="CATEGORY">Select Categories</option>
                  <option value="BRAND">Select Brands</option>
                </select>
              </div>

              <div className="shp-modal-actions">
                <button className="st-save-btn" onClick={handleSave} style={{ width: "100%" }}>🚀 Activate Scheme</button>
                <button className="shp-modal-cancel" onClick={() => setShowAdd(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .st-container { padding: 32px; max-width: 1200px; margin: 0 auto; }
        .st-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 32px; }
        .st-title-group h1 { font-size: 32px; font-weight: 800; margin: 8px 0; background: linear-gradient(135deg, #fff 0%, #94a3b8 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .st-back-link { color: #6366f1; text-decoration: none; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
        .st-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        .st-card { background: #0f172a; border: 1px solid rgba(255,255,255,0.05); border-radius: 16px; overflow: hidden; }
        .st-card-header { padding: 20px 24px; border-bottom: 1px solid rgba(255,255,255,0.05); background: rgba(255,255,255,0.02); }
        .st-card-title { font-size: 16px; font-weight: 700; color: #f1f5f9; display: flex; align-items: center; gap: 10px; }
        .st-table { width: 100%; border-collapse: collapse; }
        .st-table th { text-align: left; padding: 16px 24px; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; background: rgba(0,0,0,0.2); }
        .st-table td { padding: 16px 24px; font-size: 14px; color: #cbd5e1; border-top: 1px solid rgba(255,255,255,0.03); }
        .st-save-btn { background: #6366f1; color: white; border: none; padding: 12px 24px; border-radius: 10px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
        .st-save-btn:hover { background: #4f46e5; transform: translateY(-1px); }
        .erp-badge { display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; letter-spacing: 0.02em; }
        .erp-badge--blue { background: rgba(59, 130, 246, 0.1); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.2); }
        .erp-badge--green { background: rgba(34, 197, 94, 0.1); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.2); }
        .erp-badge--red { background: rgba(239, 68, 68, 0.1); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.2); }
      `}</style>
    </div>
  );
}

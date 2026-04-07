"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSmritiDB } from "@/lib/useSmritiDB";
import { localDB } from "@/lib/db";

interface AuditSession {
  id: string;
  title: string;
  audit_date: string;
  scope: string;
  status: string;
}

interface AuditRow {
  id: string;
  item_code: string;
  description: string;
  system_qty: number;
  physical_qty: number;
  variance: number;
}

export default function AuditPage() {
  const { isReady } = useSmritiDB();
  const [sessions, setSessions] = useState<AuditSession[]>([]);
  const [activeAudit, setActiveAudit] = useState<AuditSession | null>(null);
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(false);

  const loadSessions = () => {
    if (isReady && localDB.isInitialized) {
      const res = localDB.exec("SELECT * FROM inventory_audits ORDER BY audit_date DESC");
      setSessions(res as unknown as AuditSession[]);
    }
  };

  useEffect(() => {
    loadSessions();
    // Auto-reconnect to latest OPEN session
    if (isReady && localDB.isInitialized) {
      const openRes = localDB.exec("SELECT id FROM inventory_audits WHERE status = 'OPEN' ORDER BY audit_date DESC LIMIT 1");
      if (openRes.length > 0) {
        loadAuditRows(openRes[0].id as string);
      }
    }
  }, [isReady]);

  const commenceAudit = async () => {
    setLoading(true);
    try {
      const auditId = crypto.randomUUID();
      const title = `AUDIT-${new Date().toLocaleDateString()}`;
      
      // 1. Create Header
      localDB.run(`INSERT INTO inventory_audits (id, title, scope, status) VALUES (?, ?, 'FULL', 'OPEN')`, 
        [auditId, title]);

      // 2. Snapshot current stock (Atomic SQL O(1) roundtrip)
      // We generate unique IDs by concatenating auditId and item.id for speed
      localDB.run(`
        INSERT INTO inventory_audit_items (id, audit_id, item_id, system_qty, physical_qty, variance)
        SELECT 
          'ai_' || ? || '_' || i.id, 
          ?, 
          i.id, 
          IFNULL((SELECT SUM(quantity_change) FROM stock_ledger WHERE item_id = i.id), 0),
          0,
          -IFNULL((SELECT SUM(quantity_change) FROM stock_ledger WHERE item_id = i.id), 0)
        FROM item_master i
      `, [auditId, auditId]);

      await localDB.save();
      loadSessions();
      loadAuditRows(auditId);
      alert("Stock Audit Session Commenced. Atomic snapshot of all items completed.");
    } finally {
      setLoading(false);
    }
  };

  const loadAuditRows = (auditId: string) => {
    setLoading(true);
    const session = sessions.find(s => s.id === auditId);
    setActiveAudit(session || null);
    
    const res = localDB.exec(`
      SELECT ai.id, i.item_code, i.description, ai.system_qty, ai.physical_qty, ai.variance
      FROM inventory_audit_items ai
      JOIN item_master i ON ai.item_id = i.id
      WHERE ai.audit_id = ?
    `, [auditId]);
    
    setRows(res as unknown as AuditRow[]);
    setLoading(false);
  };

  const updatePhysicalQty = (rowId: string, qty: number) => {
    setRows(prev => prev.map(r => {
      if (r.id === rowId) {
        const variance = qty - r.system_qty;
        // Update DB in background (simplified for demo)
        localDB.run("UPDATE inventory_audit_items SET physical_qty = ?, variance = ? WHERE id = ?", [qty, variance, rowId]);
        return { ...r, physical_qty: qty, variance };
      }
      return r;
    }));
  };

  const postAudit = async () => {
    if (!activeAudit) return;
    if (!confirm("Are you sure? This will adjust your live inventory based on the physical variance.")) return;

    setLoading(true);
    try {
      for (const row of rows) {
        if (row.variance !== 0) {
            // Adjust Ledger
            const ledgerId = crypto.randomUUID();
            localDB.run("INSERT INTO stock_ledger (id, store_id, item_id, movement_type, quantity_change, reference_id) VALUES (?, 'STORE-01', (SELECT item_id FROM inventory_audit_items WHERE id=?), 'AUDIT_ADJUST', ?, ?)",
                [ledgerId, row.id, row.variance, activeAudit.id]);
        }
      }
      localDB.run("UPDATE inventory_audits SET status = 'POSTED' WHERE id = ?", [activeAudit.id]);
      await localDB.save();
      setActiveAudit(null);
      loadSessions();
      alert("Audit Posted Successfully. Inventory Ledgers synchronized.");
    } finally {
      setLoading(false);
    }
  };

  if (!isReady) return <div className="erp-loading">Launching Audit Terminal...</div>;

  return (
    <div className="st-container">
      {/* Header */}
      <div className="st-header">
        <div className="st-title-group">
          <Link href="/erp" className="st-back-link">← Back to Dashboard</Link>
          <h1>Physical Stock Audit</h1>
          <p>Commence stock-take sessions, record physical counts, and reconcile variances.</p>
        </div>
        <div className="st-btn-group">
          {!activeAudit && (
            <button className="st-save-btn" onClick={commenceAudit} disabled={loading}>
              🚀 {loading ? "Snapshotting..." : "Commence New Audit"}
            </button>
          )}
          {activeAudit && activeAudit.status === 'OPEN' && (
            <button className="st-save-btn" onClick={postAudit} disabled={loading} style={{ background: "#22c55e" }}>
              ✅ Post Adjustments to Ledger
            </button>
          )}
        </div>
      </div>

      <div className="st-grid">
        {/* Left: Audit Sessions History */}
        <div className="st-card" style={{ height: "auto", minHeight: "500px" }}>
          <div className="st-card-header">
            <h3 className="st-card-title">📅 Audit History</h3>
          </div>
          <div className="st-list">
            {sessions.map(s => (
              <div 
                key={s.id} 
                className={`st-list-item ${activeAudit?.id === s.id ? "st-list-item--active" : ""}`}
                onClick={() => loadAuditRows(s.id)}
              >
                <div className="st-item-info">
                  <span className="st-item-code">{s.title}</span>
                  <span className="st-item-desc">{new Date(s.audit_date).toLocaleString()}</span>
                </div>
                <span className={`erp-badge ${s.status === 'POSTED' ? 'erp-badge--green' : 'erp-badge--orange'}`}>
                  {s.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Active Audit Grid */}
        <div className="st-card" style={{ flex: 2 }}>
          <div className="st-card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 className="st-card-title">📝 Recording Sheet {activeAudit ? `- ${activeAudit.title}` : ""}</h3>
            {activeAudit && <span className="erp-badge erp-badge--blue">{activeAudit.scope} SNAPSHOT</span>}
          </div>
          <div style={{ overflowY: "auto", flex: 1 }}>
            <table className="st-table">
              <thead>
                <tr>
                  <th>Item / SKU</th>
                  <th style={{ textAlign: "right" }}>System</th>
                  <th style={{ textAlign: "right" }}>Physical</th>
                  <th style={{ textAlign: "right" }}>Variance</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id}>
                    <td>
                      <div className="st-item-info">
                        <strong>{r.item_code}</strong>
                        <span style={{ fontSize: "11px", color: "#64748b" }}>{r.description}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: "right", color: "#64748b" }}>{r.system_qty}</td>
                    <td style={{ textAlign: "right" }}>
                      <input 
                        type="number" 
                        className="shp-modal-input" 
                        style={{ width: "80px", textAlign: "right", padding: "4px" }}
                        value={r.physical_qty}
                        disabled={activeAudit?.status === 'POSTED'}
                        onChange={e => updatePhysicalQty(r.id, Number(e.target.value))}
                      />
                    </td>
                    <td style={{ textAlign: "right", fontWeight: "bold", color: r.variance < 0 ? "#f87171" : r.variance > 0 ? "#22c55e" : "#94a3b8" }}>
                      {r.variance > 0 ? `+${r.variance}` : r.variance}
                    </td>
                  </tr>
                ))}
                {(!activeAudit || rows.length === 0) && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", padding: "60px", color: "#475569" }}>
                      {loading ? "Optimizing Snapshot..." : "Select an audit session from history or start a new one."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <style jsx>{`
        .st-container { padding: 32px; max-width: 1400px; margin: 0 auto; }
        .st-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 32px; }
        .st-title-group h1 { font-size: 32px; font-weight: 800; margin: 8px 0; background: linear-gradient(135deg, #fff 0%, #94a3b8 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .st-back-link { color: #6366f1; text-decoration: none; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
        .st-grid { display: flex; gap: 24px; }
        .st-card { background: #0f172a; border: 1px solid rgba(255,255,255,0.05); border-radius: 16px; overflow: hidden; display: flex; flex-direction: column; flex: 1; }
        .st-card-header { padding: 20px 24px; border-bottom: 1px solid rgba(255,255,255,0.05); background: rgba(255,255,255,0.02); }
        .st-card-title { font-size: 16px; font-weight: 700; color: #f1f5f9; }
        .st-list { flex: 1; overflow-y: auto; padding: 12px; }
        .st-list-item { padding: 12px 16px; border-radius: 10px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: all 0.2s; margin-bottom: 8px; border: 1px solid transparent; }
        .st-list-item:hover { background: rgba(255,255,255,0.05); }
        .st-list-item--active { background: rgba(99, 102, 241, 0.1); border-color: rgba(99, 102, 241, 0.3); }
        .st-item-info { display: flex; flex-direction: column; }
        .st-item-code { font-size: 14px; font-weight: 700; color: #f1f5f9; }
        .st-item-desc { font-size: 12px; color: #64748b; }
        .st-table { width: 100%; border-collapse: collapse; }
        .st-table th { text-align: left; padding: 16px 24px; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .st-table td { padding: 12px 24px; font-size: 14px; color: #cbd5e1; border-bottom: 1px solid rgba(255,255,255,0.02); }
        .st-save-btn { background: #6366f1; color: white; border: none; padding: 12px 24px; border-radius: 10px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
        .erp-badge { display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; }
        .erp-badge--orange { background: rgba(245, 158, 11, 0.1); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.2); }
        .erp-badge--green { background: rgba(34, 197, 94, 0.1); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.2); }
        .erp-badge--blue { background: rgba(59, 130, 246, 0.1); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.2); }
        .shp-modal-input { background: #1e293b; border: 1px solid #334155; color: white; border-radius: 4px; outline: none; }
      `}</style>
    </div>
  );
}

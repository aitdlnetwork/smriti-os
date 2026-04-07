/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  S M R I T I - O S   ||   E N T E R P R I S E   E D I T I O N
 *  "ERP Simplified. Run Your Entire Business on Memory, Not Code."
 * ─────────────────────────────────────────────────────────────────────────────
 *  System Architect  : Jawahar R Mallah
 *  Parent Org        : AITDL NETWORK
 *  Copyright         : © 2026 AITDL.com & AITDL.in. All Rights Reserved.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *  Module : Sovereign Stock Audit (Inventory Lockdown)
 *  Logic  : Physical Truth vs Computed Stock Reconciliation
 */

"use client";

import React, { useState, useEffect, useRef } from "react";
import { localDB } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

interface AuditSession {
  id: string;
  session_code: string;
  status: 'IN_PROGRESS' | 'FINALIZED' | 'CANCELLED';
  start_time: string;
}

interface ScanRecord {
  item_code: string;
  description: string;
  found_qty: number;
  computed_qty: number;
}

export default function StockAudit() {
  const [session, setSession] = useState<AuditSession | null>(null);
  const [scanBuffer, setScanBuffer] = useState("");
  const [scans, setScans] = useState<Record<string, number>>({}); // item_id -> qty
  const [reconciliation, setReconciliation] = useState<ScanRecord[]>([]);
  const [isFinalizing, setIsFinalizing] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadActiveSession();
  }, []);

  const loadActiveSession = () => {
    const res = localDB.exec("SELECT * FROM stock_audit_sessions WHERE status = 'IN_PROGRESS' LIMIT 1");
    if (res.length > 0) {
      setSession(res[0] as any);
      loadScans(res[0].id as string);
    }
  };

  const loadScans = (sessionId: string) => {
    const res = localDB.exec("SELECT item_id, COUNT(*) as qty FROM stock_audit_scans WHERE session_id = ? GROUP BY item_id", [sessionId]);
    const scanMap: Record<string, number> = {};
    res.forEach((r: any) => scanMap[r.item_id] = r.qty);
    setScans(scanMap);
  };

  const handleStartSession = async () => {
    const id = uuidv4();
    const code = `AUD-${new Date().getTime().toString().slice(-6)}`;
    localDB.run("INSERT INTO stock_audit_sessions (id, session_code) VALUES (?, ?)", [id, code]);
    await localDB.save();
    setSession({ id, session_code: code, status: 'IN_PROGRESS', start_time: new Date().toISOString() });
  };

  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !scanBuffer) return;

    // Lookup Item
    const item = localDB.exec("SELECT id FROM item_master WHERE item_code = ?", [scanBuffer.toUpperCase()]);
    if (item.length === 0) {
      alert("Invalid Barcode: SKU not found in Master.");
      setScanBuffer("");
      return;
    }

    const itemId = item[0].id as string;
    
    // Log Scan
    localDB.run("INSERT INTO stock_audit_scans (id, session_id, item_id) VALUES (?, ?, ?)", [uuidv4(), session.id, itemId]);
    
    const newScans = { ...scans, [itemId]: (scans[itemId] || 0) + 1 };
    setScans(newScans);
    setScanBuffer("");
    inputRef.current?.focus();
  };

  const handleRunReconciliation = () => {
     // Fetch computed stock vs found stock
     const res = localDB.exec(`
        SELECT 
            im.item_code, 
            im.description,
            (SELECT COALESCE(SUM(qty), 0) FROM stock_ledger WHERE item_id = im.id) as computed_qty
        FROM item_master im
     `);

     const report: ScanRecord[] = res.map((r: any) => ({
        item_code: r.item_code,
        description: r.description,
        computed_qty: r.computed_qty,
        found_qty: scans[r.item_code] || 0 // This logic is simplified; in reality we join by ID
     }));
     
     // Correct reconciliation logic with IDs
     const finalReport: ScanRecord[] = [];
     const items = localDB.exec("SELECT id, item_code, description FROM item_master");
     for (const itm of items) {
        const itemId = itm.id as string;
        const found = scans[itemId] || 0;
        const computedRes = localDB.exec("SELECT SUM(qty) as bal FROM stock_ledger WHERE item_id = ?", [itemId]);
        const computed = Number(computedRes[0]?.bal ?? 0);
        
        if (found > 0 || computed !== 0) {
            finalReport.push({
                item_code: itm.item_code as string,
                description: itm.description as string,
                found_qty: found,
                computed_qty: computed
            });
        }
     }
     setReconciliation(finalReport);
  };

  const handleFinalize = async () => {
    if (!session) return;
    setIsFinalizing(true);
    
    try {
        // For each item in reconciliation, post ADJUSTMENT if variance exists
        for (const rec of reconciliation) {
            const variance = rec.found_qty - rec.computed_qty;
            if (variance !== 0) {
                const itemRes = localDB.exec("SELECT id FROM item_master WHERE item_code = ?", [rec.item_code]);
                localDB.run(
                    "INSERT INTO stock_ledger (id, item_id, qty, entry_type, ref_id) VALUES (?, ?, ?, 'ADJUSTMENT', ?)",
                    [uuidv4(), itemRes[0].id as string, variance, session.id]
                );
            }
        }
        
        localDB.run("UPDATE stock_audit_sessions SET status = 'FINALIZED', end_time = CURRENT_TIMESTAMP WHERE id = ?", [session.id]);
        await localDB.save();
        alert("Stock Audit reconciled and finalized. Ledger updated.");
        setSession(null);
        setReconciliation([]);
        setScans({});
    } catch (err) {
        console.error("Finalization failed", err);
    } finally {
        setIsFinalizing(false);
    }
  };

  return (
    <div className="stock-audit-terminal shp-glass">
      <header className="terminal-header">
        <div className="title">SOVEREIGN INVENTORY // PHYSICAL LOCKDOWN</div>
        {session && <div className="session-tag">ACTIVE: {session.session_code}</div>}
      </header>

      {!session ? (
        <div className="setup-view">
          <h3>No Active Audit Session</h3>
          <p>Locked down your inventory to reconcile physical truth vs computed stock.</p>
          <button onClick={handleStartSession} className="start-btn">INITIATE STOCK TAKE</button>
        </div>
      ) : (
        <div className="audit-view">
            <section className="scan-section">
                <form onSubmit={handleBarcodeSubmit}>
                    <label>SCAN ITEM BARCODE</label>
                    <input 
                        ref={inputRef}
                        autoFocus
                        placeholder="...WAITING FOR SCANNER..."
                        value={scanBuffer}
                        onChange={e => setScanBuffer(e.target.value)}
                    />
                    <div className="scan-stats">
                        TOTAL ITEMS SCANNED: {Object.values(scans).reduce((a,b) => a+b, 0)}
                    </div>
                </form>
            </section>

            <section className="control-bar">
                <button onClick={handleRunReconciliation} className="reconcile-btn">GENERATE RECONCILIATION REPORT</button>
                {reconciliation.length > 0 && (
                     <button onClick={handleFinalize} className="finalize-btn" disabled={isFinalizing}>
                         {isFinalizing ? "POSTING ADJUSTMENTS..." : "FINALIZE & UPDATE LEDGER"}
                     </button>
                )}
            </section>

            {reconciliation.length > 0 && (
                <div className="report-grid">
                    <table>
                        <thead>
                            <tr>
                                <th>SKU</th>
                                <th>DESCRIPTION</th>
                                <th>COMPUTED</th>
                                <th>FOUND</th>
                                <th>VARIANCE</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reconciliation.map(rec => (
                                <tr key={rec.item_code} className={rec.found_qty !== rec.computed_qty ? "has-variance" : ""}>
                                    <td>{rec.item_code}</td>
                                    <td>{rec.description}</td>
                                    <td>{rec.computed_qty}</td>
                                    <td>{rec.found_qty}</td>
                                    <td className="variance-val">{rec.found_qty - rec.computed_qty}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
      )}

      <style jsx>{`
        .stock-audit-terminal {
            background: #000;
            color: #fff;
            padding: 30px;
            border-radius: 20px;
            font-family: 'JetBrains Mono', monospace;
            border: 1px solid #333;
            min-height: 600px;
            display: flex;
            flex-direction: column;
            gap: 20px;
        }
        .terminal-header { display: flex; justify-content: space-between; border-bottom: 2px solid #222; padding-bottom: 15px; }
        .title { font-weight: 900; color: #fbbf24; font-size: 14px; letter-spacing: 2px; }
        .session-tag { background: #1e1b4b; color: #818cf8; font-size: 10px; padding: 4px 10px; border-radius: 4px; font-weight: bold; }

        .setup-view { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
        .setup-view h3 { font-size: 20px; margin-bottom: 10px; }
        .setup-view p { color: #666; margin-bottom: 30px; max-width: 400px; font-size: 13px; }
        .start-btn { background: #fbbf24; color: #000; border: none; padding: 12px 32px; font-weight: 900; border-radius: 8px; cursor: pointer; }

        .scan-section { background: #050505; padding: 20px; border: 1px solid #222; border-radius: 12px; }
        .scan-section label { display: block; font-size: 9px; color: #fbbf24; margin-bottom: 10px; letter-spacing: 1px; }
        .scan-section input { width: 100%; background: #111; border: 1px solid #333; color: #fff; font-size: 24px; padding: 15px; outline: none; border-radius: 8px; text-align: center; }
        .scan-stats { margin-top: 15px; font-size: 10px; color: #555; text-align: center; }

        .control-bar { display: flex; gap: 15px; }
        .reconcile-btn { flex: 1; background: #111; border: 1px solid #333; color: #fff; padding: 12px; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 12px; }
        .finalize-btn { flex: 1; background: #10b981; color: #000; border: none; padding: 12px; border-radius: 8px; cursor: pointer; font-weight: 900; font-size: 12px; }

        .report-grid { flex: 1; overflow-y: auto; background: #050505; border: 1px solid #222; border-radius: 12px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #1a1a1a; padding: 12px; text-align: left; font-size: 9px; color: #666; position: sticky; top: 0; }
        td { padding: 12px; border-bottom: 1px solid #111; font-size: 12px; }
        
        tr.has-variance { background: #450a0a; }
        .variance-val { font-weight: 900; }
        tr.has-variance .variance-val { color: #ef4444; }

        .shp-glass {
            background: rgba(0, 0, 0, 0.95);
            backdrop-filter: blur(16px);
            box-shadow: 0 12px 64px rgba(0, 0, 0, 1);
        }
      `}</style>
    </div>
  );
}

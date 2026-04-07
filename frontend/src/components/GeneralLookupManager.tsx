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
 *  Module : General Lookup Manager (GenLookup)
 *  Style  : Shoper 9 Centralized Attribute Grid
 */

"use client";

import React, { useState, useEffect, useRef } from "react";
import { localDB } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

interface LookupEntry {
  id: string;
  category: string;
  code: string;
  description: string;
  is_system: number;
}

const CATEGORIES = [
  "BRAND", "COLOR", "CLASS", "SUB_CLASS", "DEPARTMENT", "SEASON", "MATERIAL", "FIT", "FABRIC"
];

export default function GeneralLookupManager() {
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);
  const [entries, setEntries] = useState<LookupEntry[]>([]);
  const [activeRow, setActiveRow] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadEntries();
  }, [selectedCategory]);

  const loadEntries = () => {
    if (!localDB.isInitialized) return;
    const res = localDB.exec(`SELECT * FROM general_lookups WHERE category = ? ORDER BY code ASC`, [selectedCategory]);
    setEntries(res as any);
  };

  const handleAddRow = () => {
    const newEntry: LookupEntry = {
      id: uuidv4(),
      category: selectedCategory,
      code: "",
      description: "",
      is_system: 0
    };
    setEntries([...entries, newEntry]);
    setActiveRow(entries.length);
  };

  const handleUpdate = (index: number, field: keyof LookupEntry, value: string) => {
    const updated = [...entries];
    updated[index] = { ...updated[index], [field]: value };
    setEntries(updated);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      for (const entry of entries) {
        localDB.run(
          `INSERT OR REPLACE INTO general_lookups (id, category, code, description, is_system) VALUES (?, ?, ?, ?, ?)`,
          [entry.id, entry.category, entry.code, entry.description, entry.is_system]
        );
      }
      await localDB.save();
      alert("GenLookup synchronized successfully.");
      loadEntries();
    } catch (err) {
      console.error("Save error", err);
      alert("Failed to save lookup entries.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (id: string, isSystem: number) => {
    if (isSystem) {
      alert("SYSTEM entries cannot be deleted.");
      return;
    }
    
    // Usage Check
    const inUse = localDB.exec(`SELECT id FROM item_master WHERE brand_code = (SELECT code FROM general_lookups WHERE id = ?) OR color_code = (SELECT code FROM general_lookups WHERE id = ?) LIMIT 1`, [id, id]);
    if (inUse.length > 0) {
        alert("This record is IN USE in the Item Master. Deletion blocked for audit integrity.");
        return;
    }

    if (confirm("Delete this lookup entry?")) {
      localDB.run(`DELETE FROM general_lookups WHERE id = ?`, [id]);
      setEntries(entries.filter(e => e.id !== id));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "n" && e.ctrlKey) {
        e.preventDefault();
        handleAddRow();
    } else if (e.key === "s" && e.ctrlKey) {
        e.preventDefault();
        handleSave();
    }
  };

  return (
    <div className="genlookup-terminal shp-glass" onKeyDown={handleKeyDown}>
      <header className="terminal-header">
        <div className="title">SOVEREIGN MASTER // GENERAL LOOKUP</div>
        <div className="category-selector">
          <label>CATEGORY:</label>
          <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </header>

      <div className="grid-container">
        <table>
          <thead>
            <tr>
              <th style={{ width: "20%" }}>CODE</th>
              <th style={{ width: "60%" }}>DESCRIPTION</th>
              <th style={{ width: "20%" }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e, i) => (
              <tr key={e.id} className={i === activeRow ? "active" : ""}>
                <td>
                  <input 
                    value={e.code} 
                    onChange={v => handleUpdate(i, "code", v.target.value.toUpperCase())}
                    placeholder="REQUIRED"
                    disabled={e.is_system === 1}
                  />
                </td>
                <td>
                  <input 
                    value={e.description} 
                    onChange={v => handleUpdate(i, "description", v.target.value)}
                    placeholder="ENTER DESCRIPTION"
                    disabled={e.is_system === 1}
                  />
                </td>
                <td className="actions">
                  {e.is_system ? (
                    <span className="badge-system">SYSTEM</span>
                  ) : (
                    <button onClick={() => handleDelete(e.id, 0)}>DELETE</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <footer className="terminal-footer">
        <div className="shortcuts">
          [CTRL+N] NEW ROW | [CTRL+S] SAVE ALL | [ESC] CLOSE
        </div>
        <button onClick={handleSave} disabled={isSaving} className="save-btn">
          {isSaving ? "SYNCING..." : "COMMIT CHANGES"}
        </button>
      </footer>

      <style jsx>{`
        .genlookup-terminal {
          background: #000;
          color: #fff;
          padding: 20px;
          border-radius: 12px;
          font-family: 'JetBrains Mono', monospace;
          border: 1px solid #333;
          height: 600px;
          display: flex;
          flex-direction: column;
        }
        .terminal-header {
          display: flex;
          justify-content: space-between;
          border-bottom: 2px solid #222;
          padding-bottom: 15px;
          margin-bottom: 15px;
        }
        .title { font-weight: 900; color: #fbbf24; font-size: 14px; letter-spacing: 2px; }
        
        .category-selector select {
          background: #111;
          border: 1px solid #333;
          color: #10b981;
          padding: 5px 10px;
          font-weight: bold;
          outline: none;
        }

        .grid-container { flex: 1; overflow-y: auto; border: 1px solid #222; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #1a1a1a; padding: 10px; text-align: left; font-size: 10px; color: #666; position: sticky; top: 0; }
        td { border-bottom: 1px solid #111; }
        
        input {
          width: 100%;
          background: transparent;
          border: none;
          color: #fff;
          padding: 10px;
          font-size: 13px;
          outline: none;
        }
        input:focus { background: #1e1b4b; color: #818cf8; }
        input:disabled { opacity: 0.5; color: #666; cursor: not-allowed; }

        .actions { text-align: center; }
        .actions button {
          background: #450a0a;
          color: #ef4444;
          border: none;
          padding: 4px 8px;
          font-size: 10px;
          cursor: pointer;
          border-radius: 4px;
        }
        .actions button:hover { background: #7f1d1d; color: #fff; }
        .badge-system { font-size: 10px; color: #3b82f6; font-weight: bold; }

        .terminal-footer {
          margin-top: 15px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 15px;
          border-top: 1px solid #222;
        }
        .shortcuts { font-size: 10px; color: #444; }
        .save-btn {
          background: #fbbf24;
          color: #000;
          border: none;
          padding: 8px 16px;
          font-weight: 900;
          border-radius: 4px;
          cursor: pointer;
        }
        .save-btn:disabled { opacity: 0.5; }

        .shp-glass {
          background: rgba(0, 0, 0, 0.9);
          backdrop-filter: blur(12px);
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.8);
        }
      `}</style>
    </div>
  );
}

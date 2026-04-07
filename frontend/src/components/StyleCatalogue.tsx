/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  S M R I T I - O S   ||   E N T E R P R I S E   E D I T I O N
 *  "ERP Simplified. Run Your Entire Business on Memory, Not Code."
 * ─────────────────────────────────────────────────────────────────────────────
 *  System Architect  : Jawahar R Mallah
 *  Parent Org        : AITDL NETWORK
 *  Copyright         : © 2026 AITDL.com & AITDL.in. All Rights Reserved.
 *  Classification    : PROPRIETARY & CONFIDENTIAL
 *  CONTACT           : aitdlnetwork@outlook.com | jawahar@aitdl.in
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *  Module : Sovereign Style Discovery Terminal
 *  Style  : Shoper 9 High-Velocity Matrix (Style -> Shade/Size Grid)
 */

"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { localDB } from "@/lib/db";

interface Style {
  id: string;
  style_code: string;
  description: string;
  brand_code: string;
  class_code: string;
  subclass_code: string;
  department_code: string;
}

interface SKU {
  id: string;
  item_code: string;
  shade_code: string;
  size_code: string;
  mrp: number;
}

export default function StyleCatalogue() {
  const [styles, setStyles] = useState<Style[]>([]);
  const [selectedStyle, setSelectedStyle] = useState<Style | null>(null);
  const [variants, setVariants] = useState<SKU[]>([]);
  const [search, setSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadStyles();
  }, [search]);

  const loadStyles = () => {
    if (!localDB.isInitialized) return;
    const query = search 
      ? `SELECT * FROM style_master WHERE style_code LIKE '%${search}%' OR description LIKE '%${search}%' LIMIT 50`
      : `SELECT * FROM style_master LIMIT 50`;
    const res = localDB.exec(query);
    setStyles(res as any);
    setActiveIndex(0);
  };

  const loadVariants = (styleId: string) => {
    const res = localDB.exec(`SELECT * FROM item_master WHERE style_id = ?`, [styleId]);
    setVariants(res as any);
  };

  const handleSelectStyle = (style: Style) => {
    setSelectedStyle(style);
    loadVariants(style.id);
  };

  // Matrix Logic: Rows = Unique Shades, Cols = Unique Sizes
  const matrix = useMemo(() => {
    if (!variants.length) return null;
    const shades = Array.from(new Set(variants.map(v => v.shade_code))).sort();
    const sizes = Array.from(new Set(variants.map(v => v.size_code))).sort();
    
    const grid: Record<string, Record<string, SKU>> = {};
    shades.forEach(sh => {
      grid[sh] = {};
      sizes.forEach(sz => {
        const found = variants.find(v => v.shade_code === sh && v.size_code === sz);
        if (found) grid[sh][sz] = found;
      });
    });

    return { shades, sizes, grid };
  }, [variants]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      setActiveIndex(prev => Math.min(prev + 1, styles.length - 1));
      e.preventDefault();
    } else if (e.key === "ArrowUp") {
      setActiveIndex(prev => Math.max(prev - 1, 0));
      e.preventDefault();
    } else if (e.key === "Enter" && styles[activeIndex]) {
      handleSelectStyle(styles[activeIndex]);
    } else if (e.key === "Escape") {
      if (selectedStyle) {
        setSelectedStyle(null);
        setVariants([]);
      }
    }
  };

  return (
    <div className="style-terminal shp-glass" onKeyDown={handleKeyDown}>
      <header className="terminal-header">
        <div className="title">SOVEREIGN CATALOGUE // STYLE DISCOVERY</div>
        <div className="breadcrumbs">
          CATALOGUE {selectedStyle && `> ${selectedStyle.style_code}`}
        </div>
      </header>

      {!selectedStyle ? (
        <div className="list-view">
          <div className="search-pane">
            <input 
              ref={searchRef}
              autoFocus
              placeholder="SEARCH STYLE / BRAND / DESC [F2]" 
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="grid-container">
            <table>
              <thead>
                <tr>
                  <th>STYLE CODE</th>
                  <th>DESCRIPTION</th>
                  <th>BRAND</th>
                  <th>CLASS</th>
                  <th>SUB-CLASS</th>
                </tr>
              </thead>
              <tbody>
                {styles.map((s, i) => (
                  <tr 
                    key={s.id} 
                    className={i === activeIndex ? "active" : ""}
                    onClick={() => handleSelectStyle(s)}
                  >
                    <td className="code">{s.style_code}</td>
                    <td>{s.description}</td>
                    <td className="tag">{s.brand_code}</td>
                    <td>{s.class_code}</td>
                    <td>{s.subclass_code}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="matrix-view animate-fade-in">
          <div className="style-summary">
            <h3>{selectedStyle.description}</h3>
            <p>{selectedStyle.brand_code} // {selectedStyle.style_code}</p>
            <button className="back-btn" onClick={() => setSelectedStyle(null)}>[ESC] BACK TO LIST</button>
          </div>

          <div className="matrix-grid">
            {matrix && (
              <table>
                <thead>
                  <tr>
                    <th>SHADE \ SIZE</th>
                    {matrix.sizes.map(sz => <th key={sz}>{sz}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {matrix.shades.map(sh => (
                    <tr key={sh}>
                      <td className="shade-cell">{sh}</td>
                      {matrix.sizes.map(sz => {
                        const item = matrix.grid[sh][sz];
                        return (
                          <td key={sz} className={item ? "sku-cell filled" : "sku-cell empty"}>
                            {item ? (
                              <div className="sku-info">
                                <span className="mrp">₹{item.mrp}</span>
                                <span className="code">{item.item_code}</span>
                              </div>
                            ) : "-"}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .style-terminal {
          background: #000;
          color: #fff;
          padding: 20px;
          border-radius: 12px;
          font-family: 'JetBrains Mono', monospace;
          border: 1px solid #333;
          min-height: 500px;
          display: flex;
          flex-direction: column;
        }
        .terminal-header {
          border-bottom: 2px solid #222;
          padding-bottom: 15px;
          margin-bottom: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .title { font-weight: 900; color: #fbbf24; font-size: 14px; letter-spacing: 2px; }
        .breadcrumbs { font-size: 10px; color: #666; }
        
        .search-pane input {
          width: 100%;
          background: #111;
          border: 1px solid #333;
          color: #10b981;
          padding: 12px;
          font-weight: bold;
          outline: none;
          margin-bottom: 15px;
        }
        .search-pane input:focus { border-color: #10b981; box-shadow: 0 0 10px rgba(16, 185, 129, 0.2); }

        .grid-container { flex: 1; overflow-y: auto; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        th { text-align: left; background: #111; padding: 10px; color: #444; text-transform: uppercase; border-bottom: 1px solid #222; }
        td { padding: 8px 10px; border-bottom: 1px solid #111; }
        tr.active { background: #1e1b4b; border-left: 4px solid #6366f1; }
        tr.active .code { color: #818cf8; font-weight: bold; }
        .tag { color: #fbbf24; font-weight: bold; }

        .matrix-view { display: flex; flex-direction: column; gap: 20px; }
        .style-summary h3 { margin: 0; color: #fbbf24; }
        .style-summary p { margin: 5px 0; color: #666; font-size: 12px; }
        .back-btn { background: #222; border: none; color: #888; padding: 6px 12px; font-size: 10px; cursor: pointer; border-radius: 4px; }
        .back-btn:hover { background: #333; color: #fff; }

        .matrix-grid table { border: 1px solid #333; }
        .matrix-grid th { background: #1a1a1a; color: #fbbf24; text-align: center; }
        .shade-cell { background: #1a1a1a; font-weight: bold; width: 120px; text-align: left; }
        .sku-cell { text-align: center; border: 1px solid #222; min-width: 80px; transition: all 0.2s; }
        .sku-cell.filled { background: #050505; cursor: pointer; }
        .sku-cell.filled:hover { background: #1e1b4b; }
        .sku-info { display: flex; flex-direction: column; gap: 3px; padding: 5px; }
        .mrp { color: #10b981; font-weight: bold; font-size: 12px; }
        .code { font-size: 8px; color: #555; }
        .animate-fade-in { animation: fadeIn 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        .shp-glass {
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(12px);
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.8);
        }
      `}</style>
    </div>
  );
}

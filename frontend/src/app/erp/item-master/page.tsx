/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  S M R I T I - O S   ||   E N T E R P R I S E   E D I T I O N
 *  Module : Item Master (Shoper 9 Architecture Parity)
 *  Desc   : Centralized attribute-driven catalog management.
 * ─────────────────────────────────────────────────────────────────────────────
 */

"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Barcode from "react-barcode";
import { useSmritiDB } from "@/lib/useSmritiDB";
import { localDB } from "@/lib/db";
import BarcodePrintModal from "@/components/barcode/BarcodePrintModal";

interface MatrixSize {
  code: string;
  selected: boolean;
}

export default function ItemMaster() {
  const { isReady } = useSmritiDB();
  const [activeTab, setActiveTab] = useState<"CREATE" | "LIST">("CREATE");

  // Grid / Matrix Form State
  const [styleCode, setStyleCode] = useState("");
  const [brand, setBrand] = useState("SMRITI");
  const [category, setCategory] = useState("APPAREL");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("");
  const [mrp, setMrp] = useState<number | "">("");
  const [mop, setMop] = useState<number | "">("");
  const [hsn, setHsn] = useState("6109");
  const [taxPct, setTaxPct] = useState(12);

  const [sizes, setSizes] = useState<MatrixSize[]>([
    { code: "S", selected: false },
    { code: "M", selected: false },
    { code: "L", selected: false },
    { code: "XL", selected: false },
    { code: "XXL", selected: false }
  ]);

  // Inventory & Printing State
  const [inventoryList, setInventoryList] = useState<any[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  useEffect(() => {
    if (activeTab === "LIST" && localDB.isInitialized) {
      const items = localDB.exec("SELECT * FROM item_master ORDER BY created_at DESC LIMIT 100");
      setInventoryList(items);
    }
  }, [activeTab]);

  const toggleItemSelection = (id: string) => {
    setSelectedItemIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllSelection = () => {
    if (selectedItemIds.size === inventoryList.length) {
      setSelectedItemIds(new Set());
    } else {
      setSelectedItemIds(new Set(inventoryList.map(i => i.id)));
    }
  };

  const getSelectedItemsForPrint = () => {
    return inventoryList.filter(item => selectedItemIds.has(item.id));
  };

  const toggleSize = (index: number) => {
    setSizes(prev => {
      const newSizes = [...prev];
      newSizes[index].selected = !newSizes[index].selected;
      return newSizes;
    });
  };

  const handleCreateGrid = async () => {
    if (!styleCode || !description) return alert("Style Code and Description are required!");
    
    const selectedSizes = sizes.filter(s => s.selected);
    if (selectedSizes.length === 0) return alert("Select at least one Size for the grid!");

    if (!localDB.isInitialized) return;

    try {
      // Begin a "transaction" via our SQL wrapper wrapper
      let createdCount = 0;

      for (const size of selectedSizes) {
        const itemCode = `${brand}-${styleCode}-${color || 'BASE'}-${size.code}`.toUpperCase().replace(/\s+/g, '-');
        const barcode = `890${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 9000) + 1000}`;
        const finalMRP = Number(mrp) || 0;
        const finalMOP = Number(mop) || 0;

        localDB.run(`
          INSERT INTO item_master (
            id, item_code, description, brand_code, class_code, subclass_code,
            style_code, color_code, size_code,
            mrp, mop, tax_pct, hsn_sac_code
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          `item-${Date.now()}-${Math.random()}`,
          itemCode,
          `${description} - ${size.code}`,
          brand,
          category,
          "GENERAL",
          styleCode,
          color,
          size.code,
          finalMRP,
          finalMOP,
          taxPct,
          hsn
        ]);

        createdCount++;
      }

      await localDB.save();
      alert(`✅ Successfully created ${createdCount} SKUs!`);
      
      // Reset form lightly
      setStyleCode("");
      setDescription("");
      
    } catch (err) {
      console.error("Failed to create Item Master grids", err);
      alert("Database constraints error (e.g. Duplicate Item Code in this Size/Color combo).");
    }
  };

  if (!isReady) return <div className="im-loading">Loading Database Engine...</div>;

  return (
    <div className="im-shell">
      {/* HEADER */}
      <header className="im-header">
        <div className="im-header-left">
          <Link href="/erp" className="im-back-btn">← Back to ERP</Link>
          <div className="im-title-group">
            <h1>Item Master Dashboard</h1>
            <span className="im-badge">Shoper-9 Architecture Mode</span>
          </div>
        </div>
        <div className="im-tabs">
          <button className={`im-tab ${activeTab === 'CREATE' ? 'active' : ''}`} onClick={() => setActiveTab('CREATE')}>
            Grid Creator (+ New)
          </button>
          <button className={`im-tab ${activeTab === 'LIST' ? 'active' : ''}`} onClick={() => setActiveTab('LIST')}>
            Browse Inventory
          </button>
        </div>
      </header>

      {/* CONTENT */}
      <main className="im-main">
        {activeTab === "CREATE" && (
          <div className="im-card">
            <h2 className="im-card-title">Create Item Style Grid</h2>
            <p className="im-card-desc">Define parent attributes and select sizes to instantly blast multiple SKU variations into the core database.</p>

            <div className="im-form-grid">
              <div className="im-field">
                <label>Parent Style Code*</label>
                <input type="text" placeholder="e.g. POLO-100" value={styleCode} onChange={e => setStyleCode(e.target.value.toUpperCase())} />
              </div>
              <div className="im-field field-col-2">
                <label>Description*</label>
                <input type="text" placeholder="e.g. Smart Fit Cotton Polo" value={description} onChange={e => setDescription(e.target.value)} />
              </div>
            </div>

            <div className="im-form-grid">
              <div className="im-field">
                <label>Brand</label>
                <input type="text" value={brand} onChange={e => setBrand(e.target.value.toUpperCase())} />
              </div>
              <div className="im-field">
                <label>Category (Class)</label>
                <input type="text" value={category} onChange={e => setCategory(e.target.value.toUpperCase())} />
              </div>
              <div className="im-field">
                <label>Color</label>
                <input type="text" placeholder="e.g. NAVY BLU" value={color} onChange={e => setColor(e.target.value.toUpperCase())} />
              </div>
            </div>

            {/* Matrix Size Picker */}
            <div className="im-matrix-section">
              <label>Select Matrix Sizes for SKU Generation</label>
              <div className="im-size-grid">
                {sizes.map((size, idx) => (
                  <button 
                    key={size.code} 
                    className={`im-size-btn ${size.selected ? 'selected' : ''}`}
                    onClick={() => toggleSize(idx)}
                  >
                    {size.code}
                  </button>
                ))}
              </div>
            </div>

            <div className="im-divider" />

            {/* Pricing & Control */}
            <div className="im-form-grid">
              <div className="im-field">
                <label>MRP (₹)*</label>
                <input type="number" value={mrp} onChange={e => setMrp(Number(e.target.value) || "")} />
              </div>
              <div className="im-field">
                <label>Selling Rate (MOP ₹)*</label>
                <input type="number" value={mop} onChange={e => setMop(Number(e.target.value) || "")} />
              </div>
              <div className="im-field">
                <label>HSN Code</label>
                <input type="text" value={hsn} onChange={e => setHsn(e.target.value)} />
              </div>
              <div className="im-field">
                <label>Tax %</label>
                <select value={taxPct} onChange={e => setTaxPct(Number(e.target.value))}>
                  <option value={0}>0% (Exempt)</option>
                  <option value={5}>5%</option>
                  <option value={12}>12%</option>
                  <option value={18}>18%</option>
                  <option value={28}>28%</option>
                </select>
              </div>
            </div>

            <div className="im-action-row">
              <button className="im-btn-primary" onClick={handleCreateGrid}>
                Generate Grid SKUs into Database
              </button>
            </div>
          </div>
        )}

        {activeTab === "LIST" && (
          <div className="im-card">
            <h2 className="im-card-title">Inventory Master List</h2>
            <p className="im-card-desc">Select items and click "Launch Print Spooler" to generate high-speed thermal labels.</p>
            
            {inventoryList.length === 0 ? (
              <div className="im-empty">No items generated yet. Create a Grid!</div>
            ) : (
              <div className="im-table-wrapper">
                <div className="im-batch-controls" style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
                  <button 
                    className="im-btn-primary" 
                    onClick={() => setIsPrintModalOpen(true)} 
                    disabled={selectedItemIds.size === 0}
                    style={{ background: selectedItemIds.size > 0 ? '#6366f1' : '#334155', cursor: selectedItemIds.size > 0 ? 'pointer' : 'not-allowed' }}
                  >
                    🖨️ Launch Print Spooler ({selectedItemIds.size} Selected)
                  </button>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    Tip: Use Shift+Click for range selection (Coming Soon)
                  </span>
                </div>

                <table className="im-table">
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}>
                        <input 
                          type="checkbox" 
                          checked={selectedItemIds.size === inventoryList.length && inventoryList.length > 0} 
                          onChange={toggleAllSelection} 
                        />
                      </th>
                      <th>Item Code</th>
                      <th>Description</th>
                      <th>Size</th>
                      <th>Color</th>
                      <th>MRP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventoryList.map((item, i) => {
                      const isSelected = selectedItemIds.has(item.id);
                      return (
                        <tr key={i} className={isSelected ? 'im-row-selected' : ''}>
                          <td>
                            <input 
                              type="checkbox" 
                              checked={isSelected} 
                              onChange={() => toggleItemSelection(item.id)} 
                            />
                          </td>
                          <td style={{ fontFamily: "monospace", fontSize: "12px", color: isSelected ? '#818cf8' : 'inherit' }}>{item.item_code}</td>
                          <td>{item.description as string}</td>
                          <td>{item.size_code as string}</td>
                          <td>{item.color_code as string}</td>
                          <td>₹{item.mrp as number}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Universal Print Spooler Modal */}
      {isPrintModalOpen && (
        <BarcodePrintModal 
          items={getSelectedItemsForPrint()} 
          onClose={() => setIsPrintModalOpen(false)} 
        />
      )}
    </div>
  );
}

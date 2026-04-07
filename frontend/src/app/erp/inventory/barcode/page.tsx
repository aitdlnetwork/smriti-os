"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSmritiDB } from "@/lib/useSmritiDB";
import { localDB } from "@/lib/db";
import { DEFAULT_ZPL, processTemplate } from "@/lib/services/barcodeService";

interface PrintItem {
  itemCode: string;
  description: string;
  mrp: number;
  rate: number;
  brand: string;
  category: string;
  size: string;
  qty: number;
}

export default function BarcodePage() {
  const { isReady } = useSmritiDB();
  const [items, setItems] = useState<PrintItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItems, setSelectedItems] = useState<PrintItem[]>([]);
  const [template, setTemplate] = useState(DEFAULT_ZPL);

  const fetchItems = () => {
    if (isReady && localDB.isInitialized) {
      const res = localDB.exec(`SELECT * FROM item_master WHERE item_code LIKE '%${searchTerm}%' OR description LIKE '%${searchTerm}%' LIMIT 20`);
      const formatted = res.map((r: any) => ({
        itemCode: r.item_code,
        description: r.description,
        mrp: Number(r.mrp),
        rate: Number(r.mop),
        brand: r.brand_code || "GENERIC",
        category: r.class_code || "ALL",
        size: r.size_code || "OS",
        qty: 1
      }));
      setItems(formatted);
    }
  };

  useEffect(() => {
    if (searchTerm.length > 2) fetchItems();
  }, [searchTerm, isReady]);

  const toggleSelect = (item: PrintItem) => {
    const exists = selectedItems.find(s => s.itemCode === item.itemCode);
    if (exists) {
      setSelectedItems(selectedItems.filter(s => s.itemCode !== item.itemCode));
    } else {
      setSelectedItems([...selectedItems, item]);
    }
  };

  const updatePrintQty = (code: string, qty: number) => {
    setSelectedItems(prev => prev.map(s => s.itemCode === code ? { ...s, qty } : s));
  };

  const handleSpool = () => {
    if (selectedItems.length === 0) return alert("Select items to print!");
    
    let fullSpool = "";
    selectedItems.forEach(item => {
      const single = processTemplate(template, item);
      for (let i = 0; i < item.qty; i++) {
        fullSpool += single + "\n";
      }
    });

    console.log("GENERATED SPOOL DATA (ZPL):\n", fullSpool);
    alert(`Spooled ${selectedItems.reduce((acc, i) => acc + i.qty, 0)} labels to console. (Thermal hardware bridge pending).`);
  };

  if (!isReady) return <div className="erp-loading">Launching Barcode Spooler...</div>;

  return (
    <div className="st-container">
      {/* Header */}
      <div className="st-header">
        <div className="st-title-group">
          <Link href="/erp" className="st-back-link">← Back to Dashboard</Link>
          <h1>Universal Barcode Spooler</h1>
          <p>High-velocity label generator for Item Masters and Goods Inward.</p>
        </div>
        <div className="st-btn-group">
          <button className="st-action-btn" onClick={() => setTemplate(DEFAULT_ZPL)}>Load Standard 2x1 Template</button>
          <button className="st-save-btn" onClick={handleSpool}>🚀 Run Print Spooler</button>
        </div>
      </div>

      <div className="st-grid">
        {/* Left: Search & Pick */}
        <div className="st-card">
          <div className="st-card-header">
            <h3 className="st-card-title">🔍 Search Catalogue</h3>
            <input 
              type="text" 
              className="shp-modal-input" 
              placeholder="Search by Code or Description..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="st-list">
            {items.map(item => (
              <div 
                key={item.itemCode} 
                className={`st-list-item ${selectedItems.find(s => s.itemCode === item.itemCode) ? "st-list-item--active" : ""}`}
                onClick={() => toggleSelect(item)}
              >
                <div className="st-item-info">
                  <span className="st-item-code">{item.itemCode}</span>
                  <span className="st-item-desc">{item.description}</span>
                </div>
                <span className="st-item-price">₹{item.mrp}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Print Queue */}
        <div className="st-card">
          <div className="st-card-header">
            <h3 className="st-card-title">🧾 Print Queue ({selectedItems.length} items)</h3>
          </div>
          <table className="st-table">
            <thead>
              <tr>
                <th>Item Code</th>
                <th>Brand</th>
                <th>Qty to Print</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {selectedItems.map(s => (
                <tr key={s.itemCode}>
                  <td><strong>{s.itemCode}</strong></td>
                  <td>{s.brand}</td>
                  <td>
                    <input 
                      type="number" 
                      className="shp-modal-input" 
                      style={{ width: "60px", padding: "4px" }}
                      value={s.qty} 
                      onChange={e => updatePrintQty(s.itemCode, Number(e.target.value))}
                    />
                  </td>
                  <td>
                    <button className="erp-badge erp-badge--red" onClick={() => toggleSelect(s)}>Remove</button>
                  </td>
                </tr>
              ))}
              {selectedItems.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                    Select items from the left to build a print queue.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style jsx>{`
        .st-container { padding: 32px; max-width: 1200px; margin: 0 auto; }
        .st-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 32px; }
        .st-title-group h1 { font-size: 32px; font-weight: 800; margin: 8px 0; background: linear-gradient(135deg, #fff 0%, #94a3b8 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .st-back-link { color: #6366f1; text-decoration: none; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
        .st-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        .st-card { background: #0f172a; border: 1px solid rgba(255,255,255,0.05); border-radius: 16px; overflow: hidden; height: 600px; display: flex; flex-direction: column; }
        .st-card-header { padding: 20px 24px; border-bottom: 1px solid rgba(255,255,255,0.05); background: rgba(255,255,255,0.02); }
        .st-card-title { font-size: 16px; font-weight: 700; color: #f1f5f9; margin-bottom: 12px; }
        .st-list { flex: 1; overflow-y: auto; padding: 12px; }
        .st-list-item { padding: 12px 16px; border-radius: 10px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: all 0.2s; margin-bottom: 8px; border: 1px solid transparent; }
        .st-list-item:hover { background: rgba(255,255,255,0.05); }
        .st-list-item--active { background: rgba(99, 102, 241, 0.1); border-color: rgba(99, 102, 241, 0.3); }
        .st-item-info { display: flex; flex-direction: column; }
        .st-item-code { font-size: 14px; font-weight: 700; color: #f1f5f9; }
        .st-item-desc { font-size: 12px; color: #64748b; }
        .st-item-price { font-size: 14px; font-weight: 600; color: #22c55e; }
        .st-table { width: 100%; border-collapse: collapse; }
        .st-table th { text-align: left; padding: 16px 24px; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; }
        .st-table td { padding: 16px 24px; font-size: 14px; color: #cbd5e1; border-top: 1px solid rgba(255,255,255,0.03); }
        .st-save-btn { background: #6366f1; color: white; border: none; padding: 12px 24px; border-radius: 10px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
        .st-action-btn { background: rgba(255,255,255,0.05); color: #94a3b8; border: 1px solid rgba(255,255,255,0.1); padding: 10px 18px; border-radius: 10px; font-size: 13px; cursor: pointer; margin-right: 12px; }
        .st-btn-group { display: flex; align-items: center; }
        .erp-badge { display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; border: none; cursor: pointer; }
        .erp-badge--red { background: rgba(239, 68, 68, 0.1); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.2); }
      `}</style>
    </div>
  );
}

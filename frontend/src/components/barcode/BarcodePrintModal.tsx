/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  S M R I T I - O S   ||   B A R C O D E   P R I N T   M O D A L
 *  Module : Universal Print Interface
 *  Desc   : Production-grade batch barcode tool with ZPL/PRN support.
 * ─────────────────────────────────────────────────────────────────────────────
 */

"use client";

import React, { useState, useEffect } from "react";
import { BarcodeEngine } from "@/lib/barcode-engine";

interface PrintItem {
  id: string;
  item_code: string;
  style_code: string;
  size_code: string;
  color_code: string;
  mrp: number;
  description: string;
}

interface BarcodePrintModalProps {
  items: PrintItem[];
  onClose: () => void;
}

export default function BarcodePrintModal({ items, onClose }: BarcodePrintModalProps) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [printQuantities, setPrintQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    async function loadTemplates() {
      const results = await BarcodeEngine.getTemplates();
      setTemplates(results);
      if (results.length > 0) {
        setSelectedTemplate(results[0]); // Default to first (is_default)
      }
    }
    loadTemplates();

    // Init quantities
    const initQtys: Record<string, number> = {};
    items.forEach(item => {
      initQtys[item.id] = 1;
    });
    setPrintQuantities(initQtys);
  }, [items]);

  const updateQty = (id: string, val: number) => {
    setPrintQuantities(prev => ({ ...prev, [id]: Math.max(0, val) }));
  };

  const getPayload = () => {
    if (!selectedTemplate) return "";
    const printPayloadItems = items.map(item => ({
      ...item,
      qty: printQuantities[item.id] || 0
    })).filter(i => i.qty > 0) as any[];

    return BarcodeEngine.generateBatchPayload(selectedTemplate.raw_content, printPayloadItems);
  };

  const handleSerialPrint = async () => {
    const payload = getPayload();
    if (!payload) return alert("Select at least one template and set quantities.");
    const success = await BarcodeEngine.printToSerial(payload);
    if (success) {
      alert("✅ Print signal sent to Thermal Spooler!");
      onClose();
    }
  };

  const handleDownloadPrn = () => {
    const payload = getPayload();
    if (!payload) return alert("Select at least one template and set quantities.");
    BarcodeEngine.downloadPrn(payload);
    onClose();
  };

  return (
    <div className="bm-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bm-card shp-glass">
        <header className="bm-header">
          <div className="bm-title">
            <span>🧠 Universal Barcode Module</span>
            <span className="bm-badge">Shoper-9 Grade Spooler</span>
          </div>
          <button className="bm-close" onClick={onClose}>×</button>
        </header>

        <section className="bm-body">
          {/* Template Selection */}
          <div className="bm-template-selector">
            <label>Select Print Template (PRN/ZPL)</label>
            <select 
              value={selectedTemplate?.id || ""} 
              onChange={(e) => setSelectedTemplate(templates.find(t => t.id === e.target.value))}
              className="bm-select"
            >
              <option value="" disabled>Choose Template...</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.type})</option>
              ))}
            </select>
          </div>

          <div className="bm-items-list-container">
            <table className="bm-items-table">
              <thead>
                <tr>
                  <th>Qty</th>
                  <th>Item Code</th>
                  <th>Style</th>
                  <th>MRP</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id}>
                    <td>
                      <input 
                        type="number" 
                        className="bm-qty-input"
                        value={printQuantities[item.id] || ""}
                        onChange={(e) => updateQty(item.id, parseInt(e.target.value) || 0)}
                      />
                    </td>
                    <td><code className="bm-code">{item.item_code}</code></td>
                    <td>{item.style_code} ({item.size_code})</td>
                    <td>₹{item.mrp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <footer className="bm-footer">
          <button className="bm-btn bm-btn-secondary" onClick={onClose}>Cancel</button>
          <div className="bm-btn-group">
             <button className="bm-btn bm-btn-outline" onClick={handleDownloadPrn}>
                💾 Download .PRN File
             </button>
             <button className="bm-btn bm-btn-primary" onClick={handleSerialPrint}>
                ⚡ Direct Thermal Print
             </button>
          </div>
        </footer>
      </div>

      <style jsx>{`
        .bm-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.8);
          display: flex; align-items: center; justify-content: center;
          z-index: 9999;
          backdrop-filter: blur(4px);
        }
        .bm-card {
          width: 700px; max-width: 90vw;
          background: #0f172a; border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px; overflow: hidden;
          display: flex; flex-direction: column;
          box-shadow: 0 20px 50px rgba(0,0,0,0.5);
        }
        .bm-header {
          padding: 16px 24px; border-bottom: 1px solid rgba(255,255,255,0.05);
          display: flex; justify-content: space-between; align-items: center;
        }
        .bm-title { display: flex; flex-direction: column; gap: 4px; }
        .bm-title span:first-child { font-weight: 700; color: #fff; font-size: 18px; letter-spacing: -0.02em; }
        .bm-badge { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #6366f1; font-weight: 800; background: rgba(99,102,241,0.1); padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(99,102,241,0.2); width: fit-content; }
        .bm-close { background: none; border: none; color: #64748b; font-size: 24px; cursor: pointer; }
        
        .bm-body { padding: 24px; flex: 1; overflow-y: auto; max-height: 50vh; }
        .bm-template-selector { margin-bottom: 24px; display: flex; flex-direction: column; gap: 8px; }
        .bm-template-selector label { font-size: 12px; font-weight: 600; color: #94a3b8; }
        .bm-select { background: #1e293b; border: 1px solid rgba(255,255,255,0.1); color: #fff; padding: 12px; border-radius: 6px; font-size: 14px; outline: none; }
        
        .bm-items-table { width: 100%; border-collapse: collapse; }
        .bm-items-table th { text-align: left; padding: 10px; font-size: 11px; text-transform: uppercase; color: #64748b; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .bm-items-table td { padding: 12px 10px; border-bottom: 1px solid rgba(255,255,255,0.02); font-size: 13px; color: #cbd5e1; }
        .bm-qty-input { width: 60px; background: #1e293b; border: 1px solid rgba(255,255,255,0.1); color: #fff; padding: 8px; border-radius: 4px; outline: none; text-align: center; }
        .bm-code { background: #334155; padding: 2px 6px; border-radius: 4px; font-family: monospace; color: #818cf8; }

        .bm-footer { padding: 20px 24px; background: rgba(0,0,0,0.2); border-top: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; }
        .bm-btn-group { display: flex; gap: 12px; }
        .bm-btn { border: none; padding: 12px 20px; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 14px; transition: all 0.2s; }
        .bm-btn-secondary { background: #334155; color: #fff; }
        .bm-btn-primary { background: #6366f1; color: #fff; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3); }
        .bm-btn-outline { background: transparent; border: 1px solid #6366f1; color: #6366f1; }
        .bm-btn:hover { opacity: 0.9; transform: translateY(-1px); }
      `}</style>
    </div>
  );
}

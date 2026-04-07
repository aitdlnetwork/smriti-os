"use client";
import React, { useState, useEffect, useCallback } from "react";
import parameterService, { SystemParameter } from "@/lib/services/parameterService";

/**
 * Advanced System Parameters Manager for business owners.
 * Sovereignty Layer Memory-Not-Code UI mapping.
 */
export default function SystemSetupManager() {
  const [groupedParams, setGroupedParams] = useState<Record<string, SystemParameter[]>>({});
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [editState, setEditState] = useState<Record<string, string>>({}); // id -> new value
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState("");

  const loadParams = useCallback(() => {
    const data = parameterService.getAllGroupedByCategory();
    const cats = Object.keys(data).sort();
    setGroupedParams(data);
    setCategories(cats);
    if (!activeCategory && cats.length > 0) setActiveCategory(cats[0]);
    setEditState({}); // clear dirtiness on load
  }, [activeCategory]);

  useEffect(() => {
    loadParams();
  }, [loadParams]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 4000);
  };

  const handleValueChange = (id: string, newVal: string) => {
    setEditState(prev => ({ ...prev, [id]: newVal }));
  };

  const handleCommit = async () => {
    const updates = Object.entries(editState).map(([id, val]) => ({ id, param_value: val }));
    if (updates.length === 0) {
      showToast("No changes to commit.");
      return;
    }

    setIsSaving(true);
    const ok = await parameterService.updateParameters(updates);
    setIsSaving(false);

    if (ok) {
      showToast(`✓ System parameters updated successfully.`);
      loadParams(); // refresh from DB
    } else {
      showToast("X Error saving parameters.");
    }
  };

  if (categories.length === 0) return <div className="setup-loader">Loading parameters...</div>;

  return (
    <div className="setup-container">
      {/* HEADER */}
      <div className="setup-header">
        <div>
          <h2 className="setup-title">SYSTEM SETUP & PARAMETERS</h2>
          <div className="setup-sub">Central memory configuration engine. Adjust policies dynamically.</div>
        </div>
        <button 
          className={`setup-commit-btn ${Object.keys(editState).length > 0 ? "active" : ""}`}
          onClick={handleCommit}
          disabled={isSaving || Object.keys(editState).length === 0}
        >
          {isSaving ? "COMMITTING..." : "COMMIT CHANGES"}
        </button>
      </div>

      {toast && <div className="setup-toast">{toast}</div>}

      <div className="setup-body">
        {/* SIDE TABS */}
        <div className="setup-tabs">
          <div className="setup-tabs-label">MODULE SECTIONS</div>
          {categories.map(cat => (
            <button
              key={cat}
              className={`setup-tab ${activeCategory === cat ? "active" : ""}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* WORKSPACE */}
        <div className="setup-workspace">
          <div className="sw-grid">
            {groupedParams[activeCategory]?.map((param) => {
              const currentValue = editState[param.id] ?? param.param_value;
              const isBooleanType = param.param_key.includes("allow") || param.param_key.includes("enabled") || param.param_key.includes("prompt");
              // For boolean interpretation (Shoper 9 style '1' / '0')
              
              return (
                <div key={param.id} className="sw-row">
                  <div className="sw-info">
                    <div className="sw-code">{param.param_key}</div>
                    <div className="sw-desc">{param.description}</div>
                  </div>
                  <div className="sw-input-area">
                    {isBooleanType ? (
                       <select 
                         className="sw-select" 
                         value={currentValue}
                         onChange={(e) => handleValueChange(param.id, e.target.value)}
                       >
                         <option value="1">Enabled (Yes)</option>
                         <option value="0">Disabled (No)</option>
                       </select>
                    ) : (
                       <input 
                         className="sw-input"
                         type="text"
                         value={currentValue}
                         onChange={(e) => handleValueChange(param.id, e.target.value)}
                         placeholder={`Type ${param.attribute_type.toLowerCase()}`}
                       />
                    )}
                    {editState[param.id] !== undefined && (
                      <span className="sw-dirty-dot" title="Unsaved change" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* STYLES */}
      <style jsx>{`
        .setup-container {
          display: flex; flex-direction: column; height: 100%; border: 1px solid #1e293b;
          border-radius: 8px; overflow: hidden; background: #020617; font-family: 'Inter', sans-serif;
        }
        .setup-loader { padding: 40px; color: #94a3b8; font-family: 'JetBrains Mono', monospace; }
        
        .setup-header {
           display: flex; justify-content: space-between; align-items: center;
           padding: 24px 32px; border-bottom: 1px solid #1e293b; background: rgba(15,23,42,0.6);
        }
        .setup-title { margin: 0; font-size: 16px; font-weight: 700; color: #f8fafc; letter-spacing: 1px; }
        .setup-sub { margin-top: 4px; font-size: 12px; color: #64748b; font-family: 'JetBrains Mono', monospace; }
        
        .setup-commit-btn {
          background: #334155; color: #94a3b8; border: 1px solid #475569; padding: 10px 20px;
          border-radius: 4px; font-weight: 700; font-size: 13px; cursor: not-allowed; transition: all 0.2s;
        }
        .setup-commit-btn.active {
          background: #38bdf8; color: #0f172a; border-color: #38bdf8; cursor: pointer;
          box-shadow: 0 0 15px rgba(56,189,248,0.3);
        }
        .setup-commit-btn.active:hover { background: #0ea5e9; }

        .setup-toast {
          position: absolute; top: 10px; right: 40%; background: #22c55e; color: #fff;
          padding: 8px 16px; border-radius: 4px; font-weight: 600; font-size: 13px; z-index: 100;
          box-shadow: 0 5px 15px rgba(0,0,0,0.5);
        }

        .setup-body { display: flex; flex: 1; min-height: 0; }
        
        .setup-tabs {
          width: 260px; background: #0f172a; border-right: 1px solid #1e293b;
          display: flex; flex-direction: column; overflow-y: auto; padding: 20px 0;
        }
        .setup-tabs-label {
          padding: 0 20px 10px; font-size: 10px; font-weight: 800; color: #475569; letter-spacing: 2px;
        }
        .setup-tab {
          background: transparent; border: none; color: #94a3b8; text-align: left;
          padding: 12px 20px; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.1s;
          border-left: 3px solid transparent;
        }
        .setup-tab:hover { background: rgba(255,255,255,0.02); color: #cbd5e1; }
        .setup-tab.active { background: rgba(56,189,248,0.1); color: #38bdf8; border-left-color: #38bdf8; font-weight: 600; }

        .setup-workspace { flex: 1; overflow-y: auto; padding: 32px; background: #0a0f1c; }
        
        .sw-grid { display: flex; flex-direction: column; gap: 16px; max-width: 900px; }
        .sw-row {
          display: flex; justify-content: space-between; align-items: center;
          background: #0f172a; border: 1px solid rgba(255,255,255,0.05); border-radius: 8px;
          padding: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          transition: border-color 0.2s;
        }
        .sw-row:hover { border-color: rgba(56,189,248,0.3); }

        .sw-info { display: flex; flex-direction: column; gap: 6px; }
        .sw-code { font-family: 'JetBrains Mono', monospace; font-size: 12px; font-weight: 600; color: #38bdf8; }
        .sw-desc { font-size: 13px; color: #cbd5e1; line-height: 1.4; max-width: 500px; }

        .sw-input-area { position: relative; width: 300px; }
        .sw-input, .sw-select {
           width: 100%; background: rgba(0,0,0,0.4); border: 2px solid #334155; 
           padding: 10px 14px; border-radius: 6px; color: #f8fafc; font-size: 14px; outline: none; transition: all 0.2s;
           font-family: inherit;
        }
        .sw-input:focus, .sw-select:focus { border-color: #38bdf8; background: #0f172a; }
        .sw-select { cursor: pointer; appearance: none; }

        .sw-dirty-dot {
          position: absolute; right: -12px; top: 50%; transform: translateY(-50%);
          width: 8px; height: 8px; border-radius: 50%; background: #f59e0b;
          box-shadow: 0 0 8px #f59e0b;
        }
      `}</style>
    </div>
  );
}

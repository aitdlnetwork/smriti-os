import React, { useState, useEffect, useRef } from "react";
import vendorService, { VendorRecord } from "@/lib/services/vendorService";

interface VendorPickerProps {
  value: string;
  onChange: (vendorId: string, vendorName: string, taxInclusive: number, partialAllowed: number) => void;
  disabled?: boolean;
}

export default function VendorPicker({ value, onChange, disabled }: VendorPickerProps) {
  const [query, setQuery] = useState(value);
  const [vendors, setVendors] = useState<VendorRecord[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Load all active vendors on mount
  useEffect(() => {
    try {
      const all = vendorService.getAll().filter(v => v.is_active === 1);
      setVendors(all);
    } catch {}
  }, []);

  // Sync external value
  useEffect(() => {
    if (value !== query) {
      setQuery(value);
    }
  }, [value]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = vendors.filter(v => 
    v.vendor_id.toLowerCase().includes(query.toLowerCase()) || 
    v.vendor_name.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (v: VendorRecord) => {
    setQuery(v.vendor_id);
    setOpen(false);
    onChange(v.vendor_id, v.vendor_name, v.tax_inclusive ?? 1, v.partial_supply_allowed ?? 1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") setOpen(true);
      return;
    }
    
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex(i => (i < filtered.length - 1 ? i + 1 : i));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(i => (i > 0 ? i - 1 : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[activeIndex]) {
        handleSelect(filtered[activeIndex]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="vp-wrapper" ref={wrapperRef}>
      <input 
        className="dg-party-inp"
        value={query}
        onChange={e => {
          setQuery(e.target.value.toUpperCase());
          setOpen(true);
          setActiveIndex(0);
          onChange(e.target.value.toUpperCase(), "", 1, 1); // Reset dependent fields when manually typing
        }}
        onFocus={() => { setOpen(true); setActiveIndex(0); }}
        onKeyDown={handleKeyDown}
        placeholder="Type vendor code..."
        disabled={disabled}
      />
      {open && filtered.length > 0 && (
        <ul className="vp-dropdown">
          {filtered.map((v, i) => (
            <li 
              key={v.id} 
              className={i === activeIndex ? "vp-item active" : "vp-item"}
              onClick={() => handleSelect(v)}
              onMouseEnter={() => setActiveIndex(i)}
            >
              <span className="vp-code">{v.vendor_id}</span>
              <span className="vp-name">{v.vendor_name}</span>
              {v.tin_number && <span className="vp-tin">TIN: {v.tin_number}</span>}
            </li>
          ))}
        </ul>
      )}

      <style jsx>{`
        .vp-wrapper { position: relative; width: 100%; }
        .vp-dropdown { 
          position: absolute; top: calc(100% + 4px); left: 0; right: 0; 
          background: #0f172a; border: 1px solid #38bdf8; border-radius: 4px; 
          z-index: 100; max-height: 200px; overflow-y: auto; 
          margin: 0; padding: 0; list-style: none; box-shadow: 0 10px 25px rgba(0,0,0,0.5);
        }
        .vp-item { 
          padding: 8px 12px; cursor: pointer; display: flex; flex-direction: column; 
          border-bottom: 1px solid #1e293b;
        }
        .vp-item:last-child { border-bottom: none; }
        .vp-item.active { background: rgba(14,165,233,0.15); }
        .vp-code { font-weight: 800; color: #38bdf8; font-size: 11px; }
        .vp-name { color: #f8fafc; font-size: 12px; }
        .vp-tin { color: #64748b; font-size: 10px; margin-top: 2px; }
      `}</style>
    </div>
  );
}

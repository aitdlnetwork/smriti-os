"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";

interface LookupItem {
  id: string;
  code: string;
  label: string;
  subtext?: string;
}

interface IncrementalSelectorProps {
  items: LookupItem[];
  onSelect: (item: LookupItem) => void;
  onCancel: () => void;
  placeholder?: string;
}

/**
 * IncrementalSelector
 * Shoper 9-Style "Type-to-Jump" Lookup Engine
 */
export const IncrementalSelector: React.FC<IncrementalSelectorProps> = ({
  items,
  onSelect,
  onCancel,
  placeholder = "Start typing to jump..."
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [jumpBuffer, setJumpBuffer] = useState("");
  const bufferTimeout = useRef<NodeJS.Timeout | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Clear jump buffer after 500ms of inactivity (Shoper 9 pattern)
  const resetBuffer = useCallback(() => {
    setJumpBuffer("");
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // 1. Navigation Keys
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, items.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (items[selectedIndex]) onSelect(items[selectedIndex]);
      } else if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      } 
      // 2. Alphabetic Jump (Incremental Search)
      else if (e.key.length === 1 && /[a-zA-Z0-9 ]/.test(e.key)) {
        const newBuffer = jumpBuffer + e.key.toUpperCase();
        setJumpBuffer(newBuffer);

        if (bufferTimeout.current) clearTimeout(bufferTimeout.current);
        bufferTimeout.current = setTimeout(resetBuffer, 800);

        // Find first item that starts with the buffer
        const matchIdx = items.findIndex(item => 
          item.code.toUpperCase().startsWith(newBuffer) || 
          item.label.toUpperCase().startsWith(newBuffer)
        );

        if (matchIdx !== -1) {
          setSelectedIndex(matchIdx);
        }
      }
    },
    [jumpBuffer, items, selectedIndex, onSelect, onCancel, resetBuffer]
  );

  // Sync scroll position
  useEffect(() => {
    const activeItem = itemRefs.current[selectedIndex];
    if (activeItem && scrollContainerRef.current) {
      activeItem.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [selectedIndex]);

  return (
    <div className="shp-incremental-selector" onKeyDown={handleKeyDown} tabIndex={0} autoFocus>
      <div className="shp-is-header">
        <span className="shp-is-buffer">{jumpBuffer || "Looking up..."}</span>
        <span className="shp-is-hint">Esc: Close | Enter: Select</span>
      </div>
      <div className="shp-is-list" ref={scrollContainerRef}>
        {items.map((item, idx) => (
          <div
            key={item.id}
            ref={el => { itemRefs.current[idx] = el; }}
            className={`shp-is-item ${idx === selectedIndex ? "shp-is-item--active" : ""}`}
            onClick={() => onSelect(item)}
          >
            <div className="shp-is-item-code">{item.code}</div>
            <div className="shp-is-item-body">
              <div className="shp-is-item-label">{item.label}</div>
              {item.subtext && <div className="shp-is-item-sub">{item.subtext}</div>}
            </div>
          </div>
        ))}
      </div>
      <style jsx>{`
        .shp-incremental-selector {
          background: #1a1a1a;
          border: 1px solid #444;
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
          width: 450px;
          max-height: 400px;
          display: flex;
          flex-direction: column;
          outline: none;
          color: #eee;
          font-family: inherit;
        }
        .shp-is-header {
          padding: 8px 12px;
          background: #333;
          border-bottom: 2px solid var(--accent-primary, #3b82f6);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .shp-is-buffer {
          color: var(--accent-primary, #3b82f6);
          font-weight: 700;
          letter-spacing: 1px;
        }
        .shp-is-hint {
          font-size: 11px;
          color: #999;
        }
        .shp-is-list {
          overflow-y: auto;
          flex: 1;
        }
        .shp-is-item {
          display: flex;
          padding: 10px 12px;
          border-bottom: 1px solid #222;
          cursor: pointer;
        }
        .shp-is-item--active {
          background: #3b82f633;
          border-left: 4px solid #3b82f6;
        }
        .shp-is-item-code {
          width: 100px;
          font-weight: 700;
          font-family: monospace;
          color: #fbd38d;
        }
        .shp-is-item-body {
          flex: 1;
        }
        .shp-is-item-label {
          font-size: 14px;
        }
        .shp-is-item-sub {
          font-size: 11px;
          color: #888;
        }
      `}</style>
    </div>
  );
};

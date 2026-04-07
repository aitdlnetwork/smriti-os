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
 *  Module : GlobalSearch — F2 Omnibar
 *  Desc   : Platform-wide fuzzy search across Products, Customers & Invoices.
 *           Powered by offline SQLite WASM. No server required.
 */

"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { localDB } from "@/lib/db";

// ─── Result Types ────────────────────────────────────────────────────────────

type ResultCategory = "PRODUCT" | "CUSTOMER" | "INVOICE";

interface SearchResult {
  id: string;
  category: ResultCategory;
  title: string;
  subtitle: string;
  meta: string;
  href: string;
}

const CATEGORY_LABELS: Record<ResultCategory, string> = {
  PRODUCT: "Products",
  CUSTOMER: "Customers",
  INVOICE: "Bills / Invoices",
};

const CATEGORY_ICONS: Record<ResultCategory, string> = {
  PRODUCT: "📦",
  CUSTOMER: "👤",
  INVOICE: "🧾",
};

const CATEGORY_COLORS: Record<ResultCategory, string> = {
  PRODUCT: "#6366f1",
  CUSTOMER: "#10b981",
  INVOICE: "#f59e0b",
};

// ─── Fuzzy / Partial Match Helper ────────────────────────────────────────────

function highlight(text: string, query: string): string {
  if (!query.trim()) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text.replace(new RegExp(`(${escaped})`, "gi"), "<mark>$1</mark>");
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function GlobalSearch() {
  const router = useRouter();
  
  // ── States ───────────────────────────────────────────────────────────────
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  
  // ── Refs ─────────────────────────────────────────────────────────────────
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const PIN_KEY = "smriti-search-pinned-query";

  // ── SQLite multi-table search (The Brain) ─────────────────────────────────
  const runSearch = useCallback((q: string) => {
    if (!q.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    try {
      if (!localDB.isInitialized) {
        setResults([]);
        setIsSearching(false);
        return;
      }

      const term = `%${q.trim()}%`;
      const allResults: SearchResult[] = [];

      // 1. Products (item_master)
      try {
        const products = localDB.exec(
          `SELECT id, item_code, description, mrp FROM item_master 
           WHERE (description LIKE ? OR item_code LIKE ?) AND is_active = 1 LIMIT 10`,
          [term, term]
        );
        products.forEach(p => allResults.push({
          id: `product-${p.id}`,
          category: "PRODUCT",
          title: p.description as string,
          subtitle: `SKU: ${p.item_code}`,
          meta: `₹${(Number(p.mrp) || 0).toLocaleString("en-IN")}`,
          href: "/erp/procurement"
        }));
      } catch (e) {}

      // 2. Customers
      try {
        const customers = localDB.exec(
          `SELECT id, name, phone_number FROM customers 
           WHERE (name LIKE ? OR phone_number LIKE ?) AND is_active = 1 LIMIT 10`,
          [term, term]
        );
        customers.forEach(c => allResults.push({
          id: `customer-${c.id}`,
          category: "CUSTOMER",
          title: (c.name as string) || "Anonymous",
          subtitle: c.phone_number as string,
          meta: "Account",
          href: "/erp/crm"
        }));
      } catch (e) {}

      // 3. Sales Invoices
      try {
        const invoices = localDB.exec(
          `SELECT id, invoice_number, net_total FROM sales_invoices 
           WHERE invoice_number LIKE ? ORDER BY created_at DESC LIMIT 5`,
          [term]
        );
        invoices.forEach(i => allResults.push({
          id: `invoice-${i.id}`,
          category: "INVOICE",
          title: `Bill ${i.invoice_number}`,
          subtitle: "Sales Invoice",
          meta: `₹${(Number(i.net_total) || 0).toLocaleString("en-IN")}`,
          href: "/retail"
        }));
      } catch (e) {}

      setResults(allResults);
      setActiveIdx(0);
      setIsSearching(false);
    } catch (err) {
      console.error("Search error", err);
      setIsSearching(false);
    }
  }, []);

  // ── Open / Close Mechanics (Shoper 9 Sticky Pattern) ────────────────────
  const open = useCallback(() => {
    setIsOpen(true);
    const pinnedValue = localStorage.getItem(PIN_KEY);
    if (pinnedValue) {
      setQuery(pinnedValue);
      setIsPinned(true);
      setTimeout(() => runSearch(pinnedValue), 50);
    } else {
      setQuery("");
      setIsPinned(false);
    }
    setActiveIdx(0);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [runSearch]);

  const close = useCallback(() => {
    setIsOpen(false);
    if (!isPinned) {
      setQuery("");
      setResults([]);
    }
  }, [isPinned]);

  const togglePin = () => {
    const next = !isPinned;
    setIsPinned(next);
    if (next) localStorage.setItem(PIN_KEY, query);
    else localStorage.removeItem(PIN_KEY);
  };

  // ── Selection ─────────────────────────────────────────────────────────────
  const selectResult = (r: SearchResult) => {
    close();
    router.push(r.href);
  };

  // ── Keyboard navigation ───────────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx(p => Math.min(p + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx(p => Math.max(p - 1, 0));
    } else if (e.key === "Enter" && results[activeIdx]) {
      e.preventDefault();
      selectResult(results[activeIdx]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  };

  // ── Effects ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "F2") { e.preventDefault(); isOpen ? close() : open(); }
      if (e.key === "Escape" && isOpen) close();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, open, close]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) { setResults([]); return; }
    debounceRef.current = setTimeout(() => runSearch(query), 200);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, runSearch]);

  // Sync scroll position
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${activeIdx}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  // ── Render ───────────────────────────────────────────────────────────────
  if (!isOpen) return null;

  const grouped = results.reduce((acc, r) => {
    if (!acc[r.category]) acc[r.category] = [];
    acc[r.category].push(r);
    return acc;
  }, {} as Record<ResultCategory, SearchResult[]>);

  return (
    <>
      <div className="gs-backdrop" onClick={close} />
      <div className="gs-modal" onKeyDown={handleKeyDown}>
        <div className="gs-header">
          <div className="gs-header-title">SmritiSearch — Global Navigator</div>
          <div className="gs-header-hint"><kbd>F2</kbd> Close | <kbd>↑↓</kbd> Nav</div>
        </div>

        <div className="gs-input-wrap">
          <button 
            className={`gs-pin-btn ${isPinned ? "gs-pin-btn--active" : ""}`}
            onClick={togglePin}
            title="Sticky Search (Pin Query)"
          >
            {isPinned ? "📌" : "📍"}
          </button>
          <input
            ref={inputRef}
            className="gs-input"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (isPinned) localStorage.setItem(PIN_KEY, e.target.value);
            }}
            placeholder="Find items, customers, bills..."
            autoFocus
            autoComplete="off"
          />
          {isSearching && <div className="gs-spinner" />}
        </div>

        <div className="gs-results" ref={listRef}>
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat} className="gs-group">
              <div className="gs-group-label">{CATEGORY_ICONS[cat as ResultCategory]} {CATEGORY_LABELS[cat as ResultCategory]}</div>
              {items.map((r) => {
                const globalIdx = results.findIndex(x => x.id === r.id);
                const isActive = globalIdx === activeIdx;
                return (
                  <div 
                    key={r.id} 
                    data-idx={globalIdx}
                    className={`gs-result-item ${isActive ? "gs-result-item--active" : ""}`}
                    onClick={() => selectResult(r)}
                    onMouseEnter={() => setActiveIdx(globalIdx)}
                  >
                    <div className="gs-result-content">
                      <div className="gs-result-title" dangerouslySetInnerHTML={{ __html: highlight(r.title, query) }} />
                      <div className="gs-result-sub" dangerouslySetInnerHTML={{ __html: highlight(r.subtitle, query) }} />
                    </div>
                    <div className="gs-result-meta">{r.meta}</div>
                  </div>
                );
              })}
            </div>
          ))}
          {query && results.length === 0 && !isSearching && <div className="gs-empty">No results found for "{query}"</div>}
        </div>
      </div>
      <style jsx>{`
        .gs-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 9999; backdrop-filter: blur(4px); }
        .gs-modal { position: fixed; top: 15%; left: 50%; transform: translateX(-50%); width: 600px; background: #111; border: 1px solid #333; z-index: 10000; box-shadow: 0 20px 50px rgba(0,0,0,1); display: flex; flex-direction: column; }
        .gs-header { padding: 10px 15px; border-bottom: 1px solid #222; display: flex; justify-content: space-between; font-size: 12px; color: #666; }
        .gs-input-wrap { padding: 15px; display: flex; gap: 10px; border-bottom: 1px solid #222; background: #000; align-items: center; }
        .gs-pin-btn { background: #222; border: 1px solid #333; padding: 5px 10px; border-radius: 4px; cursor: pointer; transition: all 0.2s; font-size: 16px; }
        .gs-pin-btn--active { background: #3b82f633; border-color: #3b82f6; }
        .gs-input { flex: 1; background: transparent; border: none; font-size: 18px; color: #fff; outline: none; }
        .gs-results { max-height: 400px; overflow-y: auto; padding-bottom: 10px; }
        .gs-group-label { padding: 12px 15px 5px; font-size: 11px; font-weight: 700; color: #555; text-transform: uppercase; letter-spacing: 1px; }
        .gs-result-item { padding: 10px 15px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; border-left: 3px solid transparent; }
        .gs-result-item--active { background: #1a1a1a; border-left-color: #3b82f6; }
        .gs-result-title { font-weight: 600; color: #eee; }
        .gs-result-sub { font-size: 12px; color: #888; margin-top: 2px; }
        .gs-result-meta { font-size: 11px; color: #fbbf24; background: #f59e0b11; padding: 2px 6px; border-radius: 4px; }
        .gs-empty { padding: 40px; text-align: center; color: #666; }
        .gs-spinner { width: 20px; height: 20px; border: 2px solid #333; border-top-color: #3b82f6; border-radius: 50%; animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}

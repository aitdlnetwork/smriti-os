/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  S M R I T I - O S   ||   E N T E R P R I S E   E D I T I O N
 *  "ERP Simplified. Run Your Entire Business on Memory, Not Code."
 * ─────────────────────────────────────────────────────────────────────────────
 *  System Architect  : Jawahar R Mallah
 *  Parent Org        : AITDL NETWORK
 *  Copyright         : © 2026 AITDL.com & AITDL.in. All Rights Reserved.
 *
 *  Product Name      : SMRITI-OS
 *  Modules Included  : SmritiERP, SmritiBusinessPlusRetail, SmritiNotes
 *  Architecture      : Zero Upfront Cost, Offline-First WASM, Cloudflare Edge
 *  Platform Core     : POS Billing, Till Management, Stock Procurement,
 *                      Loyalty CRM, Tally Integration, Offline Day Sync.
 *
 *  Classification    : PROPRIETARY & CONFIDENTIAL
 *  CONTACT           : aitdlnetwork@outlook.com | jawahar@aitdl.in
 * ─────────────────────────────────────────────────────────────────────────────
 */

"use client";
import { useEffect, useState, useRef } from "react";
import { localDB } from "./db";

/**
 * React hook for the SMRITI-OS WASM SQLite engine.
 *
 * FIX #3: Added unmount guard via useRef to prevent state updates on
 * unmounted components. Also handles non-Error throw values safely.
 */
export function useSmritiDB() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    localDB
      .init()
      .then(() => {
        if (mountedRef.current) setIsReady(true);
      })
      .catch((e: unknown) => {
        // FIX #4: Handle non-Error throw values (e.g. strings, numbers)
        const message = e instanceof Error ? e.message : String(e);
        if (mountedRef.current) setError(message);
      });

    return () => {
      mountedRef.current = false;
    };
  }, []);

  return { isReady, error, db: localDB };
}

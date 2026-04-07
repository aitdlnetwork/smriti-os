/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  S M R I T I - O S   ||   B A R C O D E   E N G I N E
 *  Module : Universal Print Service (Shoper 9 Grade)
 *  Desc   : Handles ZPL/PRN binding and hardware communication.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { localDB } from "./db";

interface PrintItem {
  style_code: string;
  item_code: string;
  barcode?: string;
  mrp: number;
  size_code: string;
  brand_code?: string;
  description: string;
  qty: number;
}

export const BarcodeEngine = {
  /**
   * Loads all available templates from the SQLite master.
   */
  async getTemplates() {
    if (!localDB.isInitialized) return [];
    try {
      const results = localDB.exec("SELECT * FROM barcode_templates ORDER BY is_default DESC");
      return results;
    } catch (e) {
      console.error("Failed to load templates", e);
      return [];
    }
  },

  /**
   * Binds data to a raw ZPL/PRN template string.
   */
  bindTemplate(template: string, item: PrintItem): string {
    let bound = template;
    const tokens: Record<string, string> = {
      "{{style}}": item.style_code,
      "{{barcode}}": item.barcode || item.item_code,
      "{{mrp}}": `Rs. ${item.mrp.toFixed(2)}`,
      "{{size}}": item.size_code,
      "{{brand}}": item.brand_code || "SMRITI",
      "{{desc}}": item.description,
      "{{qty}}": item.qty.toString()
    };

    Object.entries(tokens).forEach(([token, value]) => {
      bound = bound.split(token).join(value);
    });

    return bound;
  },

  /**
   * Spools a batch of items into a single large ZPL burst.
   */
  generateBatchPayload(template: string, items: PrintItem[]): string {
    let finalPayload = "";
    items.forEach(item => {
      if (item.qty <= 0) return;
      // ZPL PQ command handles duplicates, but for raw strings we may need loops.
      // Most thermal printers prefer 1 ^XA...^XZ per physical label.
      const singleLabel = this.bindTemplate(template, item);
      for (let i = 0; i < item.qty; i++) {
        finalPayload += singleLabel + "\n";
      }
    });
    return finalPayload;
  },

  /**
   * Direct Printing via Web Serial API (Zebra/TSC/TVS).
   * Note: Requires user gesture (button click) & browser support.
   */
  async printToSerial(payload: string) {
    try {
      // @ts-ignore - Web Serial API
      if (!navigator.serial) {
        throw new Error("Web Serial API is not supported in this browser. Use Chrome/Edge.");
      }

      // @ts-ignore
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: 9600 });

      const encoder = new TextEncoder();
      const writer = port.writable.getWriter();
      await writer.write(encoder.encode(payload));
      
      writer.releaseLock();
      await port.close();
      return true;
    } catch (err) {
      console.error("Direct Print Error", err);
      return false;
    }
  },

  /**
   * Shoper-grade fallback: Generating a .PRN file for the user to copy to printer.
   */
  downloadPrn(payload: string) {
    const blob = new Blob([payload], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SMRITI_PRINT_SPOOL_${Date.now()}.prn`;
    a.click();
    URL.revokeObjectURL(url);
  }
};

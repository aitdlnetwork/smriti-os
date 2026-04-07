/**
 * B A R C O D E   S E R V I C E
 * 
 * Handles template loading, placeholder replacement, and label spooling. 
 * Supports ZPL (Zebra) and PRN (Generic) scripts.
 */

export interface BarcodeItem {
  itemCode: string;
  description: string;
  mrp: number;
  rate: number;
  brand: string;
  category: string;
  size: string;
  qty: number;
}

export interface BarcodeTemplate {
  id: string;
  name: string;
  content: string; // The raw ZPL/PRN string with {{placeholders}}
  labels_per_row: number;
}

/**
 * Replaces placeholders in a ZPL/PRN template with real item data.
 */
export function processTemplate(template: string, item: BarcodeItem): string {
  let processed = template;
  
  const mapping: Record<string, string | number> = {
    "{{CODE}}": item.itemCode,
    "{{DESC}}": item.description.substring(0, 30).replace(/[\^\~]/g, " "), // Sanitize for ZPL
    "{{MRP}}": item.mrp.toFixed(2),
    "{{RATE}}": item.rate.toFixed(2),
    "{{BRAND}}": (item.brand || "").replace(/[\^\~]/g, " "),
    "{{CAT}}": (item.category || "").replace(/[\^\~]/g, " "),
    "{{SIZE}}": (item.size || "").replace(/[\^\~]/g, " "),
  };

  for (const [placeholder, value] of Object.entries(mapping)) {
    // Aggressive replace-all
    processed = processed.split(placeholder).join(String(value));
  }

  return processed;
}

export const MAX_SPOOL_ITEMS = 500;

/**
 * Spools a multi-item collection into a single giant print string.
 * Each item is repeated BASED ON ITS QTY.
 */
export function generateSpoolString(template: string, items: BarcodeItem[]): string {
  const totalLabels = items.reduce((acc, i) => acc + i.qty, 0);
  
  if (totalLabels > MAX_SPOOL_ITEMS) {
    console.warn(`Spool size (${totalLabels}) exceeds stable limit (${MAX_SPOOL_ITEMS}). Memory pressure may occur.`);
  }

  let spool = "";
  for (const item of items) {
    const singleLabel = processTemplate(template, item);
    // Repeat for each unit in qty
    for (let i = 0; i < item.qty; i++) {
        spool += singleLabel + "\n";
    }
  }
  
  return spool;
}

/**
 * Default Sample ZPL Template (2x1 inch)
 */
export const DEFAULT_ZPL = `
^XA
^FX Top Section with Brand and Desc
^CF0,30
^FO50,30^FD{{BRAND}}^FS
^CF0,20
^FO50,70^FD{{DESC}}^FS

^FX Barcode
^BY2,2,60
^FO50,110^BCN,60,Y,N,N
^FD{{CODE}}^FS

^FX Price Section
^CF0,40
^FO50,220^FDMRP: {{MRP}}^FS
^XZ
`;

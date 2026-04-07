/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  S M R I T I - O S  ||  VENDOR MASTER SERVICE
 *  Sovereignty Layer: Party Record Management
 * ─────────────────────────────────────────────────────────────────────────────
 *  System Architect  : Jawahar R Mallah
 *  Parent Org        : AITDL NETWORK
 *  Copyright         : © 2026 AITDL.com & AITDL.in. All Rights Reserved.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { localDB } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export interface VendorRecord {
  id?: string;
  vendor_id: string;
  vendor_name: string;
  vendor_type?: string;
  tin_number?: string;
  cst_number?: string;
  gstin?: string;
  partial_supply_allowed?: number; // 1 or 0
  tax_inclusive?: number;          // 0, 1, or 2
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
  email?: string;
  is_active?: number;
}

export interface VendorResult {
  success: boolean;
  message: string;
  vendor?: VendorRecord;
}

const vendorService = {
  create(vendor: VendorRecord): VendorResult {
    try {
      const id = vendor.id || uuidv4();
      
      localDB.run(`
        INSERT INTO vendor_master (
          id, vendor_id, vendor_name, vendor_type, tin_number, cst_number, gstin,
          partial_supply_allowed, tax_inclusive, address1, address2,
          city, state, pincode, phone, email, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        id,
        vendor.vendor_id.trim().toUpperCase(),
        vendor.vendor_name.trim(),
        vendor.vendor_type || '',
        vendor.tin_number || '',
        vendor.cst_number || '',
        vendor.gstin || '',
        vendor.partial_supply_allowed ?? 1,
        vendor.tax_inclusive ?? 1,
        vendor.address1 || '',
        vendor.address2 || '',
        vendor.city || '',
        vendor.state || '',
        vendor.pincode || '',
        vendor.phone || '',
        vendor.email || '',
        vendor.is_active ?? 1
      ]);
      
      localDB.save();
      return { success: true, message: `Vendor ${vendor.vendor_id} created successfully.`, vendor: { ...vendor, id } };
    } catch (e: any) {
      console.error("[vendorService] create error:", e);
      return { success: false, message: e.message || "Failed to create vendor." };
    }
  },

  update(id: string, vendor: Partial<VendorRecord>): VendorResult {
    try {
      const sets: string[] = [];
      const values: any[] = [];
      
      const updatableFields = [
        'vendor_name', 'vendor_type', 'tin_number', 'cst_number', 'gstin',
        'partial_supply_allowed', 'tax_inclusive', 'address1', 'address2',
        'city', 'state', 'pincode', 'phone', 'email', 'is_active'
      ];

      for (const field of updatableFields) {
        if (vendor[field as keyof VendorRecord] !== undefined) {
          sets.push(`${field} = ?`);
          values.push(vendor[field as keyof VendorRecord]);
        }
      }

      if (sets.length === 0) return { success: true, message: "No changes to update." };

      values.push(id);
      localDB.run(`UPDATE vendor_master SET ${sets.join(", ")} WHERE id = ?`, values);
      localDB.save();
      return { success: true, message: "Vendor updated successfully." };
    } catch (e: any) {
      console.error("[vendorService] update error:", e);
      return { success: false, message: e.message || "Failed to update vendor." };
    }
  },

  getAll(): VendorRecord[] {
    try {
      return localDB.exec(`SELECT * FROM vendor_master ORDER BY vendor_name ASC`) as unknown as VendorRecord[];
    } catch (e) {
      console.error("[vendorService] getAll error:", e);
      return [];
    }
  },

  getById(id: string): VendorRecord | null {
    try {
      const res = localDB.exec(`SELECT * FROM vendor_master WHERE id = ?`, [id]);
      return res.length > 0 ? (res[0] as unknown as VendorRecord) : null;
    } catch (e) {
      return null;
    }
  },
  
  delete(id: string): VendorResult {
    try {
      localDB.run(`DELETE FROM vendor_master WHERE id = ?`, [id]);
      localDB.save();
      return { success: true, message: "Vendor deleted." };
    } catch (e: any) {
       return { success: false, message: e.message };
    }
  }
};

export default vendorService;

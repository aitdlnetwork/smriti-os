import { useSmritiDB } from "@/lib/useSmritiDB";
import { useMemo } from "react";

/**
 * A hook to fetch a system parameter from the sovereign SQLite database.
 * 
 * @param category The functional category (e.g., 'Billing', 'Inwards', 'UI')
 * @param paramKey The specific parameter key (e.g., 'customer_selection_mandatory')
 * @param defaultValue A fallback value if the parameter is not found or DB is booting.
 */
export function useSysParam(category: string, paramKey: string, defaultValue: string = "") {
  const { db, isReady } = useSmritiDB();
  
  return useMemo(() => {
    if (!isReady || !db) return defaultValue;
    
    try {
      const res = db.exec(
        "SELECT param_value FROM system_parameters WHERE category = ? AND param_key = ?",
        [category, paramKey]
      );
      
      if (res && res.length > 0) {
        return (res[0] as any).param_value as string;
      }
    } catch (err) {
      console.warn(`[SysParam] Failed to fetch ${category}.${paramKey}:`, err);
    }
    
    return defaultValue;
  }, [db, isReady, category, paramKey]);
}

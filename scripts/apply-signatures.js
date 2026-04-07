const fs = require('fs');
const path = require('path');

const JS_SIGNATURE = `/**
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
 *                   
 *  AUTHORIZATION     : This file and its contents are the intellectual property
 *                      of AITDL NETWORK. Unauthorized copying, reproduction,
 *                      or distribution of this architecture, via any medium,
 *                      is strictly prohibited.
 *  CONTACT           : aitdlnetwork@outlook.com | jawahar@aitdl.in
 * ─────────────────────────────────────────────────────────────────────────────
 */

`;

const SQL_SIGNATURE = `-- ─────────────────────────────────────────────────────────────────────────────
--  S M R I T I - O S   ||   E N T E R P R I S E   E D I T I O N
--  "ERP Simplified. Run Your Entire Business on Memory, Not Code."
-- ─────────────────────────────────────────────────────────────────────────────
--  System Architect  : Jawahar R Mallah
--  Parent Org        : AITDL NETWORK
--  Copyright         : © 2026 AITDL.com & AITDL.in. All Rights Reserved.
--
--  Product Name      : SMRITI-OS
--  Modules Included  : SmritiERP, SmritiBusinessPlusRetail, SmritiNotes
--  Architecture      : Zero Upfront Cost, Offline-First WASM, Cloudflare Edge
--  Platform Core     : POS Billing, Till Management, Stock Procurement, 
--                      Loyalty CRM, Tally Integration, Offline Day Sync.
-- 
--  Classification    : PROPRIETARY & CONFIDENTIAL
--                   
--  AUTHORIZATION     : This file and its contents are the intellectual property
--                      of AITDL NETWORK. Unauthorized copying, reproduction,
--                      or distribution of this architecture, via any medium,
--                      is strictly prohibited.
--  CONTACT           : aitdlnetwork@outlook.com | jawahar@aitdl.in
-- ─────────────────────────────────────────────────────────────────────────────

`;

// Target directories
const targetDirs = ['frontend/src', 'database'];

function applySignature(dir) {
    if (!fs.existsSync(dir)) return;

    const files = fs.readdirSync(dir);

    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            // Ignore node_modules, .next, etc.
            if (file !== 'node_modules' && file !== '.next') {
                applySignature(fullPath);
            }
        } else {
            const ext = path.extname(fullPath).toLowerCase();
            let isJS = ['.js', '.jsx', '.ts', '.tsx', '.css'].includes(ext);
            let isSQL = ['.sql'].includes(ext);

            if (isJS || isSQL) {
                const content = fs.readFileSync(fullPath, 'utf8');
                
                // Do not apply if already present
                if (!content.includes('S M R I T I - O S   ||   E N T E R P R I S E   E D I T I O N')) {
                    const signatureToApply = isJS ? JS_SIGNATURE : SQL_SIGNATURE;
                    const newContent = signatureToApply + content;
                    fs.writeFileSync(fullPath, newContent, 'utf8');
                    console.log(`[WATERMARKED] ${fullPath}`);
                }
            }
        }
    }
}

console.log('Initiating AITDL NETWORK Enterprise Watermarking Protocol...');
targetDirs.forEach((d) => applySignature(path.join(__dirname, '..', d)));
console.log('Watermarking Complete.');

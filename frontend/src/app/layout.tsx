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
 *                   
 *  AUTHORIZATION     : This file and its contents are the intellectual property
 *                      of AITDL NETWORK. Unauthorized copying, reproduction,
 *                      or distribution of this architecture, via any medium,
 *                      is strictly prohibited.
 *  CONTACT           : aitdlnetwork@outlook.com | jawahar@aitdl.in
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import GlobalSearch from "@/components/GlobalSearch";
import SmritiNotesDrawer from "@/components/SmritiNotesDrawer";
import DesignTokenInjector from "@/components/ui/DesignTokenInjector";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SMRITI-OS | Intelligent ERP Redefined",
  description: "Run Your Entire Business on Memory, Not Code. Intelligent ERP Redefined.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.variable} style={{ fontFamily: "var(--font-inter), -apple-system, system-ui, sans-serif" }}>
        <DesignTokenInjector />
        <GlobalSearch />
        <SmritiNotesDrawer />
        {children}
      </body>
    </html>
  );
}

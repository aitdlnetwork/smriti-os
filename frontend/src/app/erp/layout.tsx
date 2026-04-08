/**
 * SMRITI-OS · ERP Layout
 * Universal layout for all ERP sub-pages.
 * Features: Persistent Sidebar, Responsive Container, Main Content Shell.
 */
"use client";

import React from "react";
import Sidebar from "@/components/ui/Sidebar";

export default function ErpLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: "flex",
      height: "100vh",
      width: "100%",
      overflow: "hidden",
      backgroundColor: "var(--color-bg)",
    }}>
      {/* Persistent Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <main style={{
        flex: 1,
        height: "100%",
        overflowY: "auto",
        position: "relative",
        background: "var(--color-bg)",
        display: "flex",
        flexDirection: "column",
      }}>
        {children}
      </main>
    </div>
  );
}

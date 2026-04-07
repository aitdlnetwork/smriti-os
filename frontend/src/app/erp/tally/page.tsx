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
 *  Module : TallyPrime Integration Data Bridge
 *  Desc   : Offline WASM-to-TDL XML Extractor for Accounting Synchronization
 *           Generates Double-Entry accurate TDL XML Payloads.
 */

"use client";

import React, { useState, useEffect } from "react";
import { useSmritiDB } from "@/lib/useSmritiDB";
import PageShell from "@/components/ui/PageShell";
import { Button, Card, DataTable, StatusBadge, SectionHeader } from "@/components/ui";
import { RefreshCw, Download, Plus } from "lucide-react";
import type { TableColumn } from "@/components/ui";

interface Invoice {
  id: string;
  invoice_number: string;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  net_total: number;
  tax_type: string;
  created_at: string;
}

export default function TallyIntegrationModule() {
  const { isReady, error, db } = useSmritiDB();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  const loadData = () => {
    if (!isReady || !db) return;
    try {
      // Fetch only posted invoices for sync. Coalesce bill_number logic for legacy protection.
      const res = db.exec(`
         SELECT id, 
                COALESCE(NULLIF(invoice_number, ''), bill_number) as invoice_number, 
                subtotal, discount_amount, tax_amount, 
                COALESCE(NULLIF(net_total, 0), net_amount) as net_total,
                tax_type, created_at 
         FROM sales_invoices 
         WHERE status = 'POSTED' OR status IS NULL OR status = ''
         ORDER BY created_at DESC
      `);
      setInvoices(res as unknown as Invoice[]);
    } catch (err) {
      console.error("Failed to load invoices:", err);
    }
  };

  useEffect(() => {
    if (isReady) loadData();
  }, [isReady]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleExportXML = async () => {
    if (!db) return;
    if (invoices.length === 0) {
      alert("No vouchers available to export.");
      return;
    }
    setIsExporting(true);

    try {
      // Tally API Envelope Structure (TDL XML)
      let xmlOutput = `<ENVELOPE>\n`;
      xmlOutput += `  <HEADER>\n`;
      xmlOutput += `    <TALLYREQUEST>Import Data</TALLYREQUEST>\n`;
      xmlOutput += `  </HEADER>\n`;
      xmlOutput += `  <BODY>\n`;
      xmlOutput += `    <IMPORTDATA>\n`;
      xmlOutput += `      <REQUESTDESC>\n`;
      xmlOutput += `        <REPORTNAME>Vouchers</REPORTNAME>\n`;
      xmlOutput += `        <STATICVARIABLES>\n`;
      xmlOutput += `          <SVCURRENTCOMPANY>SMRITI-OS DEFAULT COMPANY</SVCURRENTCOMPANY>\n`;
      xmlOutput += `        </STATICVARIABLES>\n`;
      xmlOutput += `      </REQUESTDESC>\n`;
      xmlOutput += `      <REQUESTDATA>\n`;

      for (const inv of invoices) {
        // Tally Date format YYYYMMDD
        const dateObj = new Date(inv.created_at);
        const tallyDate = dateObj.getFullYear() +
                          String(dateObj.getMonth() + 1).padStart(2, '0') +
                          String(dateObj.getDate()).padStart(2, '0');

        xmlOutput += `        <TALLYMESSAGE xmlns:UDF="TallyUDF">\n`;
        xmlOutput += `          <VOUCHER VCHTYPE="Sales" ACTION="Create" OBJVIEW="Accounting Voucher View">\n`;
        xmlOutput += `            <DATE>${tallyDate}</DATE>\n`;
        xmlOutput += `            <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>\n`;
        xmlOutput += `            <VOUCHERNUMBER>${inv.invoice_number}</VOUCHERNUMBER>\n`;
        xmlOutput += `            <PARTYLEDGERNAME>Cash</PARTYLEDGERNAME>\n`;
        xmlOutput += `            <PERSISTEDVIEW>Accounting Voucher View</PERSISTEDVIEW>\n`;
        
        // --- 1. Fetch Tenders / Payments (DEBIT -> Negative in Tally)
        let totalDebit = 0;
        try {
           const payments = db.exec("SELECT payment_mode, amount FROM sales_payments WHERE invoice_id = ?", [inv.id]);
           if (payments && payments.length > 0) {
              for (const p of payments) {
                 const amt = Number((p as any).amount);
                 xmlOutput += `            <ALLLEDGERENTRIES.LIST>\n`;
                 xmlOutput += `              <LEDGERNAME>${(p as any).payment_mode}</LEDGERNAME>\n`;
                 xmlOutput += `              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>\n`;
                 xmlOutput += `              <AMOUNT>-${amt.toFixed(2)}</AMOUNT>\n`; 
                 xmlOutput += `            </ALLLEDGERENTRIES.LIST>\n`;
                 totalDebit += amt;
              }
           } else {
              throw new Error("No payments");
           }
        } catch (e) {
           // Fallback if no payment lines found
           const netAmt = Number(inv.net_total);
           xmlOutput += `            <ALLLEDGERENTRIES.LIST>\n`;
           xmlOutput += `              <LEDGERNAME>Cash</LEDGERNAME>\n`;
           xmlOutput += `              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>\n`;
           xmlOutput += `              <AMOUNT>-${netAmt.toFixed(2)}</AMOUNT>\n`; 
           xmlOutput += `            </ALLLEDGERENTRIES.LIST>\n`;
           totalDebit += netAmt;
        }

        // --- 2. Bill Discount (DEBIT -> Negative in Tally) 
        const billDisc = Number(inv.discount_amount || 0);
        if (billDisc > 0) {
           xmlOutput += `            <ALLLEDGERENTRIES.LIST>\n`;
           xmlOutput += `              <LEDGERNAME>Discount Allowed</LEDGERNAME>\n`;
           xmlOutput += `              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>\n`;
           xmlOutput += `              <AMOUNT>-${billDisc.toFixed(2)}</AMOUNT>\n`; 
           xmlOutput += `            </ALLLEDGERENTRIES.LIST>\n`;
        }

        // --- 3. Parse Tax Lines (CREDIT -> Positive in Tally)
        let cgst = 0, sgst = 0, igst = 0;
        try {
           const taxRes = db.exec("SELECT SUM(cgst_amt) as cgst, SUM(sgst_amt) as sgst, SUM(igst_amt) as igst FROM sales_invoice_items WHERE invoice_id = ?", [inv.id]);
           if (taxRes && taxRes.length > 0) {
              const tr = taxRes[0] as any;
              cgst = Number(tr.cgst || 0);
              sgst = Number(tr.sgst || 0);
              igst = Number(tr.igst || 0);
           } else { throw new Error("Fallback tax"); }
        } catch(e) {
           // Fallback to Header taxes
           const hdrTax = Number(inv.tax_amount || 0);
           if (inv.tax_type === 'OUTSTATION') igst = hdrTax;
           else {
              cgst = Number((hdrTax / 2).toFixed(2));
              sgst = Number((hdrTax - cgst).toFixed(2));
           }
        }

        // Sales Subtotal (CREDIT)
        const subtotal = Number(inv.subtotal || 0);
        xmlOutput += `            <ALLLEDGERENTRIES.LIST>\n`;
        xmlOutput += `              <LEDGERNAME>Sales Account</LEDGERNAME>\n`;
        xmlOutput += `              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>\n`;
        xmlOutput += `              <AMOUNT>${subtotal.toFixed(2)}</AMOUNT>\n`; 
        xmlOutput += `            </ALLLEDGERENTRIES.LIST>\n`;

        if (cgst > 0) {
           xmlOutput += `            <ALLLEDGERENTRIES.LIST>\n`;
           xmlOutput += `              <LEDGERNAME>CGST</LEDGERNAME>\n`;
           xmlOutput += `              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>\n`;
           xmlOutput += `              <AMOUNT>${cgst.toFixed(2)}</AMOUNT>\n`; 
           xmlOutput += `            </ALLLEDGERENTRIES.LIST>\n`;
        }
        if (sgst > 0) {
           xmlOutput += `            <ALLLEDGERENTRIES.LIST>\n`;
           xmlOutput += `              <LEDGERNAME>SGST</LEDGERNAME>\n`;
           xmlOutput += `              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>\n`;
           xmlOutput += `              <AMOUNT>${sgst.toFixed(2)}</AMOUNT>\n`; 
           xmlOutput += `            </ALLLEDGERENTRIES.LIST>\n`;
        }
        if (igst > 0) {
           xmlOutput += `            <ALLLEDGERENTRIES.LIST>\n`;
           xmlOutput += `              <LEDGERNAME>IGST</LEDGERNAME>\n`;
           xmlOutput += `              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>\n`;
           xmlOutput += `              <AMOUNT>${igst.toFixed(2)}</AMOUNT>\n`; 
           xmlOutput += `            </ALLLEDGERENTRIES.LIST>\n`;
        }

        xmlOutput += `          </VOUCHER>\n`;
        xmlOutput += `        </TALLYMESSAGE>\n`;
      }

      xmlOutput += `      </REQUESTDATA>\n`;
      xmlOutput += `    </IMPORTDATA>\n`;
      xmlOutput += `  </BODY>\n`;
      xmlOutput += `</ENVELOPE>`;

      // Create Blob and trigger download
      const blob = new Blob([xmlOutput], { type: "application/xml" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `smriti_tally_daybook_${new Date().getTime()}.xml`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Mark invoices as Synced natively
      for (const inv of invoices) {
        db.run("UPDATE sales_invoices SET status = 'SYNCED' WHERE id = ?", [inv.id]);
      }
      await db.save();
      loadData();
      alert("Export complete! Vouchers marked as SYNCED.");
    } catch (err) {
      console.error(err);
      alert("Failed to export XML");
    } finally {
      setIsExporting(false);
    }
  };

  if (!isReady && !error) return <PageShell title="Tally Bridge" loading breadcrumbs={[{label:"ERP",href:"/erp"},{label:"Tally Bridge"}]}>{null}</PageShell>;
  if (error) return <PageShell title="Tally Bridge" error={error} breadcrumbs={[{label:"ERP",href:"/erp"},{label:"Tally Bridge"}]}>{null}</PageShell>;

  const columns: TableColumn<Record<string, unknown>>[] = [
    { key: "invoice_number", header: "Invoice No",
      render: (v) => <span style={{ color: "var(--color-primary)", fontFamily: "monospace", fontWeight: 600 }}>{String(v ?? "—")}</span> },
    { key: "created_at", header: "Date & Time",
      render: (v) => <span style={{ color: "var(--color-text-secondary)", fontSize: "var(--font-size-sm)" }}>{new Date(String(v)).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span> },
    { key: "tax_type", header: "Tax Regime",
      render: (v) => <StatusBadge label={`Sales · ${v}`} type="neutral" /> },
    { key: "net_total", header: "Net Amount (₹)", align: "right",
      render: (v) => <span style={{ fontWeight: 700, color: "var(--color-success)", fontFamily: "monospace" }}>₹{Number(v).toFixed(2)}</span> },
    { key: "id", header: "Sync Status", align: "center",
      render: () => <StatusBadge label="STANDBY" type="warning" dot /> },
  ];

  return (
    <PageShell
      title="Tally Bridge"
      subtitle="Export retail daybook to TallyPrime-compliant double-entry XML without cloud routing."
      icon={<RefreshCw size={18} />}
      breadcrumbs={[{ label: "ERP", href: "/erp" }, { label: "Tally Bridge" }]}
      statusDot="online"
      actions={
        <>
          <Button variant="secondary" size="sm" icon={<Plus size={14} />}
            onClick={async () => {
              if (!db) return;
              const id = crypto.randomUUID();
              const invNo = `INV-${Math.floor(Math.random() * 10000)}`;
              db.run("INSERT INTO sales_invoices (id, bill_number, invoice_number, net_total, subtotal, tax_amount, tax_type, status, bill_date) VALUES (?, ?, ?, 1180.00, 1000.00, 180.00, 'LOCAL', 'POSTED', date('now'))", [id, invNo, invNo]);
              db.run("INSERT INTO sales_payments (id, invoice_id, payment_mode, amount) VALUES (?, ?, 'CASH', 500)", [crypto.randomUUID(), id]);
              db.run("INSERT INTO sales_payments (id, invoice_id, payment_mode, amount) VALUES (?, ?, 'CREDIT CARD', 680)", [crypto.randomUUID(), id]);
              await db.save();
              loadData();
            }}
          >Seed Mock</Button>
          <Button
            variant="primary" size="sm" icon={<Download size={14} />}
            onClick={handleExportXML}
            disabled={isExporting || invoices.length === 0}
            loading={isExporting}
          >
            {`Export ${invoices.length} Voucher${invoices.length !== 1 ? "s" : ""}`}
          </Button>
        </>
      }
    >
      {/* KPI Strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 28 }}>
        {[
          { label: "Ready for Sync", value: invoices.length,  color: "var(--color-success)" },
          { label: "Tally Masters",  value: 5,                color: "var(--color-text-secondary)" },
          { label: "Protocol",       value: "Double-Entry",   color: "var(--color-primary)" },
        ].map((k, i) => (
          <Card key={i} padding="20px 24px">
            <div style={{ fontSize: "var(--font-size-3xl)", fontWeight: 800, color: k.color, fontFamily: "monospace", lineHeight: 1 }}>{k.value}</div>
            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-tertiary)", marginTop: 6, textTransform: "uppercase", letterSpacing: "0.8px" }}>{k.label}</div>
          </Card>
        ))}
      </div>

      {/* Invoice Table */}
      <SectionHeader title="Pending Vouchers" sub="Posted bills awaiting synchronization" style={{ marginBottom: 16 }}
        actions={<Button variant="ghost" size="sm" icon={<RefreshCw size={13} />} onClick={loadData}>Refresh</Button>}
      />
      <DataTable
        columns={columns}
        rows={invoices as unknown as Record<string, unknown>[]}
        emptyMessage="No pending invoices — start a transaction in the POS Terminal."
      />
    </PageShell>
  );
}

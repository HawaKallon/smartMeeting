"use client";

import { useState } from "react";
import { Download, FileText } from "lucide-react";

const btn =
  "inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50";

export function ExportButtons({ isSuperAdmin = false }: { isSuperAdmin?: boolean }) {
  const [pdfLoading, setPdfLoading] = useState(false);

  async function downloadPdf() {
    setPdfLoading(true);
    try {
      const res = await fetch("/api/reports/pdf");
      if (!res.ok) throw new Error("Failed to generate PDF");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "smart-meeting-report.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Could not generate the PDF report.");
    } finally {
      setPdfLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <a className={btn} href="/api/reports/export?dataset=events" download>
        <Download className="h-4 w-4" /> Events CSV
      </a>
      <a className={btn} href="/api/reports/export?dataset=attendance" download>
        <Download className="h-4 w-4" /> Attendance CSV
      </a>
      <a className={btn} href="/api/reports/export?dataset=users" download>
        <Download className="h-4 w-4" /> Users CSV
      </a>
      {isSuperAdmin && (
        <a className={btn} href="/api/reports/export?dataset=ministries" download>
          <Download className="h-4 w-4" /> Ministries CSV
        </a>
      )}
      <button type="button" onClick={downloadPdf} disabled={pdfLoading} className={btn}>
        <FileText className="h-4 w-4" />
        {pdfLoading ? "Generating…" : "PDF report"}
      </button>
    </div>
  );
}

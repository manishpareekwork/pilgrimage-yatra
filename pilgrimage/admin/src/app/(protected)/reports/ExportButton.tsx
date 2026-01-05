"use client";

type ExportButtonProps = {
  filename: string;
  headers: string[];
  rows: Array<Array<string | number | null>>;
  label?: string;
  printLabel?: string;
  title?: string;
};

const toCsv = (rows: string[][]) =>
  rows
    .map((row) =>
      row
        .map((value) => `"${String(value ?? "").replace(/\"/g, '""')}"`)
        .join(",")
    )
    .join("\n");

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export function ExportButton({
  filename,
  headers,
  rows,
  label = "Export CSV",
  printLabel = "Print PDF",
  title,
}: ExportButtonProps) {
  const handleExport = () => {
    const dataRows = [headers, ...rows.map((row) => row.map((cell) => String(cell ?? "")))];
    const csv = toCsv(dataRows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    const reportTitle = title || filename.replace(/\.csv$/i, "");
    const now = new Date().toLocaleString();
    const tableHeaders = headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("");
    const tableRows = rows
      .map((row) =>
        `<tr>${row
          .map((cell) => `<td>${escapeHtml(String(cell ?? ""))}</td>`)
          .join("")}</tr>`
      )
      .join("");
    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(reportTitle)}</title>
    <style>
      :root {
        color-scheme: light;
      }
      body {
        font-family: "Geist Sans", "Segoe UI", system-ui, sans-serif;
        color: #0f172a;
        margin: 24px;
      }
      h1 {
        font-size: 18px;
        margin: 0 0 6px;
      }
      .meta {
        font-size: 11px;
        color: #475569;
        margin-bottom: 16px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 11px;
      }
      th,
      td {
        border: 1px solid #e2e8f0;
        padding: 6px 8px;
        text-align: left;
        vertical-align: top;
      }
      th {
        background: #f8fafc;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-size: 10px;
      }
      tbody tr:nth-child(even) td {
        background: #f8fafc;
      }
      @page {
        size: A4;
        margin: 18mm;
      }
      @media print {
        body {
          margin: 0;
        }
      }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(reportTitle)}</h1>
    <div class="meta">Generated ${escapeHtml(now)}</div>
    <table>
      <thead>
        <tr>${tableHeaders}</tr>
      </thead>
      <tbody>
        ${tableRows || `<tr><td colspan="${headers.length}">No data.</td></tr>`}
      </tbody>
    </table>
  </body>
</html>`;

    const win = window.open("", "_blank", "noopener,noreferrer");
    if (!win) return;
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 250);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={handleExport} className="btn-secondary">
        {label}
      </button>
      <button type="button" onClick={handlePrint} className="btn-secondary">
        {printLabel}
      </button>
    </div>
  );
}

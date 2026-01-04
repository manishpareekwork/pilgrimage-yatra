"use client";

type ExportButtonProps = {
  filename: string;
  headers: string[];
  rows: Array<Array<string | number | null>>;
  label?: string;
};

const toCsv = (rows: string[][]) =>
  rows
    .map((row) =>
      row
        .map((value) => `"${String(value ?? "").replace(/\"/g, '""')}"`)
        .join(",")
    )
    .join("\n");

export function ExportButton({ filename, headers, rows, label = "Export CSV" }: ExportButtonProps) {
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

  return (
    <button type="button" onClick={handleExport} className="btn-secondary">
      {label}
    </button>
  );
}

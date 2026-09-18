"use client";

const PAGE_SELECTOR = ".cm257-print-page";

export type DownloadCm257PdfOptions = {
  filename: string;
  onProgress?: (page: number, total: number) => void;
};

/** Build a multi-page A4 PDF from rendered CM257 print pages (no browser print dialog). */
export async function downloadCm257Pdf({
  filename,
  onProgress,
}: DownloadCm257PdfOptions): Promise<void> {
  const pages = Array.from(document.querySelectorAll<HTMLElement>(PAGE_SELECTOR));
  if (pages.length === 0) {
    throw new Error("No CM257 pages found. Generate forms first.");
  }

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const pdfWidth = 210;
  const pdfHeight = 297;

  for (let i = 0; i < pages.length; i++) {
    onProgress?.(i + 1, pages.length);
    const el = pages[i];
    el.scrollIntoView({ block: "nearest" });

    const canvas = await html2canvas(el, {
      scale: Math.min(3, Math.max(2, window.devicePixelRatio || 2)),
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      width: el.offsetWidth,
      height: el.offsetHeight,
      windowWidth: el.offsetWidth,
      windowHeight: el.offsetHeight,
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.94);
    if (i > 0) {
      pdf.addPage();
    }
    pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight, undefined, "FAST");
  }

  pdf.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}

export function defaultCm257PdfFilename(tripLabel?: string): string {
  const slug = (tripLabel ?? "yatra")
    .replace(/[^\w\-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 40);
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `CM257-${slug}-${stamp}.pdf`;
}

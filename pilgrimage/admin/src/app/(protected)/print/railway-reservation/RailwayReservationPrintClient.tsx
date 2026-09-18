"use client";

import { useEffect, useMemo, useState } from "react";
import { Cm257ReservationForm } from "@/components/railway/Cm257ReservationForm";
import "@/components/railway/cm257-print.css";
import { groupFormsForPrint, layoutPageCount } from "@/lib/railwayReservation/printLayout";
import { loadCm257PrintPayload, saveCm257PrintPayload } from "@/lib/railwayReservation/printStorage";
import {
  CM257_A4_MM,
  CM257_PLATFORM_MM,
  CM257_PRINT_LAYOUT_LABELS,
  CM257_PRINT_STORAGE_KEY,
  normalizeCm257PrintLayout,
  type Cm257PrintLayout,
  type Cm257PrintPayload,
} from "@/lib/railwayReservation/types";
import {
  CM257_LOCAL_PDF_PATH,
  CM257_OFFICIAL_PDF_URL,
} from "@/lib/railwayReservation/cm257Official";

export function RailwayReservationPrintClient() {
  const [payload, setPayload] = useState<Cm257PrintPayload | null>(null);
  const [layout, setLayout] = useState<Cm257PrintLayout>("a4-full");

  const hydratePayload = () => {
    const loaded = loadCm257PrintPayload();
    setPayload(loaded);
    if (loaded?.layout) {
      setLayout(normalizeCm257PrintLayout(loaded.layout as string));
    }
    return loaded;
  };

  useEffect(() => {
    hydratePayload();
    const retry = window.setTimeout(() => {
      setPayload((prev) => prev ?? loadCm257PrintPayload());
    }, 150);
    const onStorage = (e: StorageEvent) => {
      if (e.key === CM257_PRINT_STORAGE_KEY) {
        hydratePayload();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.clearTimeout(retry);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const pages = useMemo(() => {
    if (!payload?.forms.length) return [];
    return groupFormsForPrint(payload.forms, layout);
  }, [payload, layout]);

  const persistLayout = (next: Cm257PrintLayout) => {
    setLayout(next);
    if (payload) {
      saveCm257PrintPayload({ ...payload, layout: next });
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("autoprint") !== "1" || !payload?.forms.length) return;
    const t = window.setTimeout(() => window.print(), 400);
    return () => window.clearTimeout(t);
  }, [payload]);

  if (!payload || payload.forms.length === 0) {
    return (
      <div className="p-10 text-center text-sm text-[color:var(--muted)] max-w-md mx-auto space-y-4">
        <p className="text-base font-semibold text-[color:var(--ink)]">No CM257 forms in memory</p>
        <p>
          Go back to the builder, select passengers, and click <strong>Generate &amp; PDF</strong> again.
          If a blank tab opened before, deploy the latest fix and retry.
        </p>
        <a href="/bookings/railway-reservation" className="btn-primary inline-flex">
          CM257 builder
        </a>
      </div>
    );
  }

  const pageCount = layoutPageCount(payload.forms.length, layout);
  const layoutHint =
    layout === "a4-full"
      ? `${pageCount} A4 sheet(s) — one full CM257 (${CM257_A4_MM.width}×${CM257_A4_MM.height} mm) per page. HTML/CSS only (no scan).`
      : layout === "a5-single"
        ? `${pageCount} A4 sheet(s) — one platform slip (${CM257_PLATFORM_MM.width}×${CM257_PLATFORM_MM.height} mm) centred on each page.`
        : `${pageCount} A4 sheet(s) — two platform slips per page (${CM257_PLATFORM_MM.width}×${CM257_PLATFORM_MM.height} mm each).`;

  return (
    <div className="cm257-root">
      <div className="cm257-toolbar print:hidden">
        <div>
          <h1 className="text-lg font-semibold text-[color:var(--ink)]">CM257 — Print / Save PDF</h1>
          <p className="text-xs text-[color:var(--muted)]">
            {payload.forms.length} form{payload.forms.length > 1 ? "s" : ""} (max 6 passengers each). {layoutHint}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <label className="flex flex-col gap-1 text-xs text-[color:var(--muted)]">
            Print template
            <select
              className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--ink)]"
              value={layout}
              onChange={(e) => persistLayout(e.target.value as Cm257PrintLayout)}
            >
              {(Object.keys(CM257_PRINT_LAYOUT_LABELS) as Cm257PrintLayout[]).map((key) => (
                <option key={key} value={key}>
                  {CM257_PRINT_LAYOUT_LABELS[key]}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary" onClick={() => window.history.back()}>
              Back
            </button>
            <button type="button" className="btn-primary" onClick={() => window.print()}>
              Print / Save PDF
            </button>
          </div>
        </div>
      </div>

      <p className="cm257-layout-hint print:hidden">{layoutHint}</p>
      <p className="print:hidden text-xs text-[color:var(--muted)] max-w-[210mm] mx-auto mb-4 px-2">
        Reference layout:{" "}
        <a href={CM257_OFFICIAL_PDF_URL} target="_blank" rel="noopener noreferrer" className="underline">
          Official CM257 (SCR)
        </a>
        {" · "}
        <a href={CM257_LOCAL_PDF_PATH} className="underline">
          Local PDF
        </a>
        . Forms are drawn in CSS — choose A4 full or platform (A5) template above.
      </p>

      {layout === "a4-full"
        ? pages.map((group, pageIndex) => (
            <div key={`a4-${pageIndex}`} className="cm257-print-page cm257-print-page--a4-full">
              {group.map((form, index) => (
                <Cm257ReservationForm
                  key={`${form.formLabel ?? "form"}-${pageIndex}-${index}`}
                  draft={form}
                  template="a4"
                />
              ))}
            </div>
          ))
        : layout === "a5-single"
          ? pages.map((group, pageIndex) => (
              <div key={`a5s-${pageIndex}`} className="cm257-print-page cm257-print-page--a5-single">
                {group.map((form, index) => (
                  <Cm257ReservationForm
                    key={`${form.formLabel ?? "form"}-${pageIndex}-${index}`}
                    draft={form}
                    template="a5"
                  />
                ))}
              </div>
            ))
          : pages.map((pair, pageIndex) => (
              <div key={`a5d-${pageIndex}`} className="cm257-print-page cm257-print-page--a5-double">
                {pair.map((form, index) => (
                  <div key={`${form.formLabel ?? "form"}-${index}`} className="cm257-a5-double-slot">
                    <Cm257ReservationForm draft={form} template="a5" />
                  </div>
                ))}
                {pair.length === 1 ? <div className="cm257-a5-double-slot" aria-hidden /> : null}
              </div>
            ))}
    </div>
  );
}

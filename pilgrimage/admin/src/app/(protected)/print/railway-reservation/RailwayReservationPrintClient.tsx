"use client";

import { useEffect, useMemo, useState } from "react";
import { Cm257ReservationForm } from "@/components/railway/Cm257ReservationForm";
import "@/components/railway/cm257-print.css";
import { groupFormsForPrint, miniFormsPerPage } from "@/lib/railwayReservation/printLayout";
import { loadCm257PrintPayload, saveCm257PrintPayload } from "@/lib/railwayReservation/printStorage";
import {
  CM257_PRINT_LAYOUT_LABELS,
  CM257_PHYSICAL_MM,
  type Cm257PrintLayout,
  type Cm257PrintPayload,
} from "@/lib/railwayReservation/types";

export function RailwayReservationPrintClient() {
  const [payload, setPayload] = useState<Cm257PrintPayload | null>(null);
  const [layout, setLayout] = useState<Cm257PrintLayout>("full");
  const [useBg, setUseBg] = useState(false);

  useEffect(() => {
    const loaded = loadCm257PrintPayload();
    setPayload(loaded);
    if (loaded?.layout) setLayout(loaded.layout);
    fetch("/forms/cm257-en.png", { method: "HEAD" })
      .then((res) => setUseBg(res.ok))
      .catch(() => setUseBg(false));
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
      <div className="p-8 text-center text-sm text-[color:var(--muted)]">
        <p>No reservation forms loaded.</p>
        <p className="mt-2">
          Open{" "}
          <a href="/bookings/railway-reservation" className="text-sky-400 underline">
            Railway reservation forms
          </a>{" "}
          and generate forms first.
        </p>
      </div>
    );
  }

  const layoutHint =
    layout === "full"
      ? `${payload.forms.length} page(s) — one CM257 per A4.`
      : layout === "two-up"
        ? `${pages.length} A4 sheet(s) — 2 forms each (${payload.forms.length} forms total).`
        : layout === "a5-physical"
          ? `${payload.forms.length} A4 sheet(s) — one ${CM257_PHYSICAL_MM.width}×${CM257_PHYSICAL_MM.height} mm form each.`
          : `${pages.length} A4 sheet(s) — up to ${miniFormsPerPage()} counter-size forms (${CM257_PHYSICAL_MM.width}×${CM257_PHYSICAL_MM.height} mm) per sheet.`;

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
            Print layout
            <select
              className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-2 py-1.5 text-sm text-[color:var(--ink)]"
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

      {layout === "full"
        ? pages.map((group, pageIndex) => (
            <div key={`full-${pageIndex}`} className="cm257-print-page cm257-print-page--full">
              {group.map((form, index) => (
                <Cm257ReservationForm
                  key={`${form.formLabel ?? "form"}-${pageIndex}-${index}`}
                  draft={form}
                  useBackgroundTemplate={useBg}
                />
              ))}
            </div>
          ))
        : layout === "two-up"
          ? pages.map((pair, pageIndex) => (
              <div key={`two-${pageIndex}`} className="cm257-print-page cm257-print-page--two-up">
                {pair.map((form, index) => (
                  <div key={`${form.formLabel ?? "form"}-${index}`} className="cm257-two-up-slot">
                    <Cm257ReservationForm draft={form} useBackgroundTemplate={useBg} />
                  </div>
                ))}
                {pair.length === 1 ? <div className="cm257-two-up-slot" aria-hidden /> : null}
              </div>
            ))
          : layout === "a5-physical"
            ? pages.map((group, pageIndex) => (
                <div key={`a5-${pageIndex}`} className="cm257-print-page cm257-print-page--a5-physical">
                  {group.map((form, index) => (
                    <div key={`${form.formLabel ?? "form"}-${index}`} className="cm257-a5-slot">
                      <Cm257ReservationForm draft={form} useBackgroundTemplate={useBg} />
                    </div>
                  ))}
                </div>
              ))
            : pages.map((group, pageIndex) => (
                <div key={`mini-${pageIndex}`} className="cm257-print-page cm257-print-page--mini">
                  {group.map((form, index) => (
                    <div key={`${form.formLabel ?? "form"}-${index}`} className="cm257-mini-slot">
                      <Cm257ReservationForm draft={form} useBackgroundTemplate={useBg} />
                    </div>
                  ))}
                </div>
              ))}
    </div>
  );
}

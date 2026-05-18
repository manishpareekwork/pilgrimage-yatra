"use client";

import { useEffect, useState } from "react";
import { Cm257ReservationForm } from "@/components/railway/Cm257ReservationForm";
import { loadCm257PrintPayload } from "@/lib/railwayReservation/printStorage";
import type { Cm257PrintPayload } from "@/lib/railwayReservation/types";

export function RailwayReservationPrintClient() {
  const [payload, setPayload] = useState<Cm257PrintPayload | null>(null);
  const [useBg, setUseBg] = useState(false);

  useEffect(() => {
    setPayload(loadCm257PrintPayload());
    fetch("/forms/cm257-en.png", { method: "HEAD" })
      .then((res) => setUseBg(res.ok))
      .catch(() => setUseBg(false));
  }, []);

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

  return (
    <div className="cm257-root">
      <div className="cm257-toolbar print:hidden">
        <div>
          <h1 className="text-lg font-semibold text-[color:var(--ink)]">CM257 — Print / Save PDF</h1>
          <p className="text-xs text-[color:var(--muted)]">
            {payload.forms.length} form{payload.forms.length > 1 ? "s" : ""} (max 6 passengers each). Use{" "}
            <strong>Print</strong> → Save as PDF. One form per page.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary" onClick={() => window.history.back()}>
            Back
          </button>
          <button type="button" className="btn-primary" onClick={() => window.print()}>
            Print / Save PDF
          </button>
        </div>
      </div>

      {payload.forms.map((form, index) => (
        <Cm257ReservationForm
          key={`${form.formLabel ?? "form"}-${index}`}
          draft={form}
          useBackgroundTemplate={useBg}
        />
      ))}
    </div>
  );
}

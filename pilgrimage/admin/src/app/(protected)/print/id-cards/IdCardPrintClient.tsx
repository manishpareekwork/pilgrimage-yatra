"use client";

import { useEffect, useMemo, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabaseBrowser";

type IdCardRow = {
  registration_id: string;
  name_hi: string | null;
  father_name_hi: string | null;
  phone: string | null;
  emergency_contact_phone: string | null;
  photo_url: string | null;
  accompanying_name: string | null;
  accompanying_phone: string | null;
  accompanying_resident_of: string | null;
  train_no: string | null;
  flight_no: string | null;
  coach_no: string | null;
  seat_no: string | null;
  berth_no: string | null;
  hotel_name: string | null;
  room_no: string | null;
};

export function IdCardPrintClient({ rows }: { rows: IdCardRow[] }) {
  const supabase = useMemo(() => getBrowserSupabase(), []);
  const orchestratorUrl = process.env.NEXT_PUBLIC_ORCHESTRATOR_URL;
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!orchestratorUrl) return;
    let isActive = true;
    const loadUrls = async () => {
      await Promise.all(
        rows.map(async (row) => {
          if (!row.photo_url) return;
          if (row.photo_url.startsWith("http")) {
            if (!isActive) return;
            setPhotoUrls((prev) => ({ ...prev, [row.registration_id]: row.photo_url as string }));
            return;
          }
          const { data: session } = await supabase.auth.getSession();
          const token = session.session?.access_token;
          if (!token) return;
          const res = await fetch(`${orchestratorUrl}/sign-url`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              bucket: "photos",
              object: row.photo_url,
              action: "download",
              expiresIn: 600,
            }),
          });
          if (!res.ok) return;
          const json = await res.json();
          if (!isActive) return;
          setPhotoUrls((prev) => ({ ...prev, [row.registration_id]: json.signedUrl as string }));
        })
      );
    };
    void loadUrls();
    return () => {
      isActive = false;
    };
  }, [rows, orchestratorUrl, supabase]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <h1 className="text-xl font-semibold text-[color:var(--ink)]">ID Cards</h1>
        <button type="button" className="btn-primary" onClick={() => window.print()}>
          Print
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-2">
        {rows.map((row) => {
          const photoUrl = photoUrls[row.registration_id];
          return (
            <div key={row.registration_id} className="border border-[color:var(--border)] rounded-xl p-4 print:p-3">
              <div className="flex items-start gap-3">
                <div className="h-20 w-16 overflow-hidden rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-muted)]">
                  {photoUrl ? (
                    <img src={photoUrl} alt={row.name_hi ?? "Photo"} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] text-[color:var(--muted)]">
                      No photo
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-[color:var(--ink)]">{row.name_hi || "—"}</div>
                  <div className="text-xs text-[color:var(--muted)]">
                    Guardian: {row.father_name_hi || "—"}
                  </div>
                  <div className="text-xs text-[color:var(--muted)]">Mobile: {row.phone || "—"}</div>
                  <div className="text-xs text-[color:var(--muted)]">
                    Emergency: {row.emergency_contact_phone || "—"}
                  </div>
                </div>
              </div>

              <div className="mt-3 grid gap-1 text-xs text-[color:var(--muted)]">
                <div>Train: {row.train_no || "—"}</div>
                <div>Flight: {row.flight_no || "—"}</div>
                <div>Coach: {row.coach_no || "—"} · Seat: {row.seat_no || "—"} · Berth: {row.berth_no || "—"}</div>
                <div>Hotel: {row.hotel_name || "—"} · Room: {row.room_no || "—"}</div>
                <div>
                  Accompanying: {row.accompanying_name || "—"} ({row.accompanying_phone || "—"})
                </div>
                <div>Resident of: {row.accompanying_resident_of || "—"}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

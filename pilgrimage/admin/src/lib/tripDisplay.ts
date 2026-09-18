/** Canonical yatra train legs (20824 Ajmer ↔ Puri). */
export const YATRA_TRAIN_NO = "20824";
export const YATRA_OUTBOUND_JOURNEY_DATE = "2026-12-07";
export const YATRA_RETURN_JOURNEY_DATE = "2026-12-13";

export type TripKind = "outbound" | "return" | "other";

const TRIP_KIND_LABELS: Record<TripKind, string> = {
  outbound: "Outbound",
  return: "Return",
  other: "Other",
};

export function tripKindLabel(kind: string | null | undefined): string {
  if (kind === "outbound" || kind === "return" || kind === "other") {
    return TRIP_KIND_LABELS[kind];
  }
  return "Other";
}

/** Format Postgres `date` (YYYY-MM-DD) without UTC shift. */
export function formatJourneyDate(date: string | null | undefined): string {
  if (!date) return "—";
  const part = date.slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(part);
  if (!match) return part;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

/** Value for `<input type="datetime-local" />`. */
export function toDateTimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
}

/** Compact label for trip dropdowns across admin. */
export function formatTripSelectLabel(trip: {
  trip_name: string;
  trip_kind?: string | null;
  journey_date: string;
  mode: string;
  train_no?: string | null;
  flight_no?: string | null;
  from_station_code?: string | null;
  to_station_code?: string | null;
}): string {
  const kind =
    trip.trip_kind && trip.trip_kind !== "other"
      ? `${tripKindLabel(trip.trip_kind)} · `
      : "";
  const ref =
    trip.mode === "train"
      ? trip.train_no ?? "train"
      : trip.flight_no ?? "flight";
  const route =
    trip.from_station_code && trip.to_station_code
      ? ` · ${trip.from_station_code}→${trip.to_station_code}`
      : "";
  return `${kind}${formatJourneyDate(trip.journey_date)} · ${ref}${route}`;
}

export function tripSummaryLine(trip: {
  trip_name: string;
  trip_kind?: string | null;
  journey_date: string;
  mode: string;
  train_no?: string | null;
  from_station_code?: string | null;
  to_station_code?: string | null;
}): string {
  const kind = trip.trip_kind ? tripKindLabel(trip.trip_kind) : null;
  const route =
    trip.from_station_code && trip.to_station_code
      ? `${trip.from_station_code} → ${trip.to_station_code}`
      : null;
  const parts = [
    kind,
    formatJourneyDate(trip.journey_date),
    trip.mode === "train" ? trip.train_no ?? "train" : trip.mode.toUpperCase(),
    route,
  ].filter(Boolean);
  return parts.join(" · ");
}

import type { RegistrationRow } from "./mapRegistration";

/** Yatris eligible for committee-filled CM257 (train + not self-booking). */
export function isEligibleForCommitteeCm257(row: {
  travel_mode?: string | null;
  reservation_by?: string | null;
}): boolean {
  return row.travel_mode === "train" && row.reservation_by === "committee";
}

export function filterEligibleRegistrations<T extends RegistrationRow>(rows: T[]): T[] {
  return rows.filter(isEligibleForCommitteeCm257);
}

export function eligibilitySkipMessage(total: number, eligible: number): string | null {
  if (total === eligible) return null;
  const skipped = total - eligible;
  return `${skipped} excluded (need travel mode train and reservation by committee; self-booked or non-train omitted).`;
}

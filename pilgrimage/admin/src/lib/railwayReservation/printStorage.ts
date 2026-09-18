import type { Cm257PrintPayload } from "./types";
import { CM257_PRINT_STORAGE_KEY, normalizeCm257PrintLayout } from "./types";

/** localStorage so new print tabs (noopener) can read the payload; sessionStorage as legacy fallback. */
export const saveCm257PrintPayload = (payload: Cm257PrintPayload) => {
  if (typeof window === "undefined") return;
  const json = JSON.stringify(payload);
  try {
    localStorage.setItem(CM257_PRINT_STORAGE_KEY, json);
  } catch {
    /* quota — still try session */
  }
  try {
    sessionStorage.setItem(CM257_PRINT_STORAGE_KEY, json);
  } catch {
    /* ignore */
  }
};

export const loadCm257PrintPayload = (): Cm257PrintPayload | null => {
  if (typeof window === "undefined") return null;
  const raw =
    localStorage.getItem(CM257_PRINT_STORAGE_KEY) ??
    sessionStorage.getItem(CM257_PRINT_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Cm257PrintPayload;
    if (!parsed?.forms?.length) return null;
    return {
      ...parsed,
      layout: normalizeCm257PrintLayout(parsed.layout as string | undefined),
    };
  } catch {
    return null;
  }
};

export const clearCm257PrintPayload = () => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CM257_PRINT_STORAGE_KEY);
  sessionStorage.removeItem(CM257_PRINT_STORAGE_KEY);
};

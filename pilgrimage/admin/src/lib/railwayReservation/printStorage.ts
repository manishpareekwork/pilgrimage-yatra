import type { Cm257PrintPayload } from "./types";
import { CM257_PRINT_STORAGE_KEY } from "./types";

export const saveCm257PrintPayload = (payload: Cm257PrintPayload) => {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(CM257_PRINT_STORAGE_KEY, JSON.stringify(payload));
};

export const loadCm257PrintPayload = (): Cm257PrintPayload | null => {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(CM257_PRINT_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Cm257PrintPayload;
  } catch {
    return null;
  }
};

export const clearCm257PrintPayload = () => {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(CM257_PRINT_STORAGE_KEY);
};

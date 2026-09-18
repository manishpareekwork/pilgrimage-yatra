import { CM257_PHYSICAL_MM } from "./types";
import type { Cm257FormDraft, Cm257PrintLayout } from "./types";

export const CM257_DESIGN_MM = { width: 210, height: 297 } as const;

export function chunkArray<T>(items: T[], size: number): T[][] {
  if (size < 1) return [items];
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

/** Uniform scale to fit the designed form into a physical slip slot. */
export function miniTileScale(): number {
  return Math.min(
    CM257_PHYSICAL_MM.width / CM257_DESIGN_MM.width,
    CM257_PHYSICAL_MM.height / CM257_DESIGN_MM.height
  );
}

/** How many mini forms fit on one A4 sheet (portrait, ~6mm margins). */
export function miniFormsPerPage(): number {
  const pageW = 198;
  const pageH = 285;
  const cols = Math.max(1, Math.floor(pageW / CM257_PHYSICAL_MM.width));
  const rows = Math.max(1, Math.floor(pageH / CM257_PHYSICAL_MM.height));
  return cols * rows;
}

export function groupFormsForPrint(
  forms: Cm257FormDraft[],
  layout: Cm257PrintLayout
): Cm257FormDraft[][] {
  if (layout === "two-up") return chunkArray(forms, 2);
  if (layout === "a5-physical") return forms.map((f) => [f]);
  if (layout === "mini-tile") return chunkArray(forms, miniFormsPerPage());
  return forms.map((f) => [f]);
}

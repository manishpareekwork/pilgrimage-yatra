import type { Cm257FormDraft, Cm257PrintLayout } from "./types";

export function chunkArray<T>(items: T[], size: number): T[][] {
  if (size < 1) return [items];
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

export function groupFormsForPrint(
  forms: Cm257FormDraft[],
  layout: Cm257PrintLayout
): Cm257FormDraft[][] {
  if (layout === "a5-double") return chunkArray(forms, 2);
  return forms.map((f) => [f]);
}

export function layoutPageCount(formCount: number, layout: Cm257PrintLayout): number {
  if (layout === "a5-double") return Math.ceil(formCount / 2);
  return formCount;
}

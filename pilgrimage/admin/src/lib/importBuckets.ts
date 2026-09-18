import type { SupabaseClient } from "@supabase/supabase-js";

export type ImportBucketOption = {
  name: string;
  total: number;
  cm257Ready: number;
};

type SheetStatRow = {
  name: string;
  total: number;
  cm257_ready: number;
};

/** Import sheets from roster + master bucket names (deduped, sorted). */
export async function fetchImportBucketOptions(
  supabase: SupabaseClient
): Promise<ImportBucketOption[]> {
  const [statsRes, categoriesRes] = await Promise.all([
    supabase
      .from("yatra_import_sheet_stats")
      .select("name, total, cm257_ready")
      .order("name"),
    supabase.from("yatra_categories").select("name").order("name"),
  ]);

  const byName = new Map<string, ImportBucketOption>();

  if (!statsRes.error && statsRes.data) {
    for (const row of statsRes.data as SheetStatRow[]) {
      if (!row.name?.trim()) continue;
      byName.set(row.name.trim(), {
        name: row.name.trim(),
        total: row.total ?? 0,
        cm257Ready: row.cm257_ready ?? 0,
      });
    }
  }

  if (!categoriesRes.error && categoriesRes.data) {
    for (const row of categoriesRes.data as { name: string }[]) {
      const name = row.name?.trim();
      if (!name || byName.has(name)) continue;
      byName.set(name, { name, total: 0, cm257Ready: 0 });
    }
  }

  return [...byName.values()].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
  );
}

/** Default bucket for CM257 sheet mode (largest CM257-ready cohort, skips Cancelled). */
export function pickDefaultImportBucket(buckets: ImportBucketOption[]): ImportBucketOption | null {
  if (buckets.length === 0) return null;
  const active = buckets.filter((b) => b.name.trim().toLowerCase() !== "cancelled");
  const pool = active.length > 0 ? active : buckets;
  return (
    [...pool].sort((a, b) => b.cm257Ready - a.cm257Ready || b.total - a.total)[0] ?? null
  );
}

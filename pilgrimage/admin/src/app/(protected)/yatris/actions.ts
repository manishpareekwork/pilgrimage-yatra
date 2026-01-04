"use server";

import { getServerSupabase } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import {
  buildYatrisQuery,
  normalizeFilters,
  normalizeYatriRows,
  type YatriRow,
  type YatrisFilters,
} from "./query";

export type ExportPayload = {
  filters: Partial<YatrisFilters>;
  limit?: number;
};

export type ExportResult = {
  rows: YatriRow[];
  total: number;
  overLimit: boolean;
};

export async function exportYatrisRows({ filters, limit = 2000 }: ExportPayload): Promise<ExportResult> {
  const supabase = await getServerSupabase();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) redirect("/login");

  const normalized = normalizeFilters(filters);
  const cappedLimit = Math.max(1, Math.min(limit, 2000));

  const query = buildYatrisQuery(supabase, normalized, true).range(0, cappedLimit - 1);
  const { data, error, count } = await query;

  if (error) {
    return { rows: [], total: 0, overLimit: false };
  }

  const total = count ?? (data?.length ?? 0);
  const overLimit = total > cappedLimit;

  return {
    rows: normalizeYatriRows(data ?? []),
    total,
    overLimit,
  };
}

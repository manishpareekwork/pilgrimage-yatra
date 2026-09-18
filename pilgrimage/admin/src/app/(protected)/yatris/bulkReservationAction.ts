"use server";

import { getServerSupabase } from "@/lib/supabaseServer";
import { normalizeTrainClass } from "@/lib/trainClasses";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type BulkReservationInput = {
  ids: string[];
  travel_mode: "" | "train" | "air";
  train_class: string;
  reservation_by: "" | "self" | "committee";
  source_sheet: string;
};

export type BulkReservationResult =
  | { ok: true; updated: number }
  | { ok: false; error: string };

export async function bulkUpdateYatriReservations(
  input: BulkReservationInput
): Promise<BulkReservationResult> {
  const supabase = await getServerSupabase();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) redirect("/login");

  const ids = [...new Set(input.ids.map((id) => id.trim()).filter(Boolean))];
  if (ids.length === 0) {
    return { ok: false, error: "Select at least one yatri." };
  }
  if (ids.length > 500) {
    return { ok: false, error: "Bulk update is limited to 500 yatris at a time." };
  }

  const patch: Record<string, string | null> = {};

  if (input.travel_mode === "train" || input.travel_mode === "air") {
    patch.travel_mode = input.travel_mode;
    if (input.travel_mode === "air") {
      patch.train_class = null;
    }
  }

  if (input.travel_mode === "train" && input.train_class.trim()) {
    patch.train_class = normalizeTrainClass(input.train_class.trim());
  }

  if (input.reservation_by) {
    patch.reservation_by = input.reservation_by;
  }

  if (input.source_sheet.trim()) {
    patch.source_sheet = input.source_sheet.trim();
  }

  if (Object.keys(patch).length === 0) {
    return { ok: false, error: "Choose at least one field to update." };
  }

  const { data, error } = await supabase
    .from("yatra_registrations")
    .update(patch)
    .in("id", ids)
    .select("id");

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/yatris");
  return { ok: true, updated: data?.length ?? ids.length };
}

"use server";

import { getActionSupabase } from "@/lib/supabaseServer";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const boolVal = (value: FormDataEntryValue | null) =>
  value === "on" || value === "true" || value === "1";

export async function updateRegistrationAction(formData: FormData) {
  const id = (formData.get("id") as string | null)?.trim();
  if (!id) return;

  const supabase = await getActionSupabase();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) {
    redirect("/login");
  }

  const payload = {
    name_hi: formData.get("name_hi")?.toString().trim() || null,
    father_name_hi: formData.get("father_name_hi")?.toString().trim() || null,
    address_hi: formData.get("address_hi")?.toString().trim() || null,
    phone: formData.get("phone")?.toString().trim() || null,
    whatsapp: formData.get("whatsapp")?.toString().trim() || null,
    travel_mode: formData.get("travel_mode")?.toString().trim() || null,
    train_class: formData.get("train_class")?.toString().trim() || null,
    health_bp: boolVal(formData.get("health_bp")),
    health_diabetes: boolVal(formData.get("health_diabetes")),
    health_other: formData.get("health_other")?.toString().trim() || null,
    emergency_contact_name:
      formData.get("emergency_contact_name")?.toString().trim() || null,
    emergency_contact_phone:
      formData.get("emergency_contact_phone")?.toString().trim() || null,
    status: formData.get("status")?.toString().trim() || null,
  };

  const { error } = await supabase
    .from("yatra_registrations")
    .update(payload)
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/yatris/${id}`);
}

async function updateStatus(id: string, action: "approve" | "reject") {
  const supabase = await getActionSupabase();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) redirect("/login");

  await supabase.rpc("fn_create_review", {
    p_registration_id: id,
    p_action: action,
    p_diff: {},
    p_actor: userData.user.id,
  });

  revalidatePath(`/yatris/${id}`);
}

export async function approveRegistration(formData: FormData) {
  const id = (formData.get("id") as string | null)?.trim();
  if (!id) return;
  await updateStatus(id, "approve");
}

export async function rejectRegistration(formData: FormData) {
  const id = (formData.get("id") as string | null)?.trim();
  if (!id) return;
  await updateStatus(id, "reject");
}

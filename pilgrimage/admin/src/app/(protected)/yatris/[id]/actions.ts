"use server";

import { getActionSupabase } from "@/lib/supabaseServer";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const boolVal = (value: FormDataEntryValue | null) =>
  value === "on" || value === "true" || value === "1";

const strOrNull = (value: FormDataEntryValue | null) => {
  const str = value?.toString().trim();
  return str ? str : null;
};

const numOrNull = (value: FormDataEntryValue | null) => {
  const str = value?.toString().trim();
  if (!str) return null;
  const num = Number(str);
  return Number.isFinite(num) ? num : null;
};

export async function updateRegistrationAction(formData: FormData) {
  const id = (formData.get("id") as string | null)?.trim();
  if (!id) return;

  const supabase = await getActionSupabase();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) {
    redirect("/login");
  }

  const healthHeart = boolVal(formData.get("health_heart"));
  const healthBp = boolVal(formData.get("health_bp"));
  const healthDiabetes = boolVal(formData.get("health_diabetes"));
  const healthAsthma = boolVal(formData.get("health_asthma"));
  const healthOther = strOrNull(formData.get("health_other"));
  const declarationAccepted = boolVal(formData.get("declaration_accepted"));
  const declarationSignedAtInput = strOrNull(formData.get("declaration_signed_at"));

  const patch = {
    receipt_no: strOrNull(formData.get("receipt_no")),
    name_hi: strOrNull(formData.get("name_hi")),
    guardian_relation: strOrNull(formData.get("guardian_relation")),
    father_name_hi: strOrNull(formData.get("father_name_hi")),
    address_hi: strOrNull(formData.get("address_hi")),
    aadhaar_no: strOrNull(formData.get("aadhaar_no")),
    dob: strOrNull(formData.get("dob")),
    age_years: numOrNull(formData.get("age_years")),
    height_cm: numOrNull(formData.get("height_cm")),
    weight_kg: numOrNull(formData.get("weight_kg")),
    phone: strOrNull(formData.get("phone")),
    whatsapp: strOrNull(formData.get("whatsapp")),
    travel_mode: strOrNull(formData.get("travel_mode")),
    train_class: strOrNull(formData.get("train_class")),
    reservation_by: strOrNull(formData.get("reservation_by")),
    health_heart: healthHeart,
    health_heart_meds: healthHeart ? strOrNull(formData.get("health_heart_meds")) : null,
    health_bp: healthBp,
    health_bp_meds: healthBp ? strOrNull(formData.get("health_bp_meds")) : null,
    health_diabetes: healthDiabetes,
    health_diabetes_meds: healthDiabetes ? strOrNull(formData.get("health_diabetes_meds")) : null,
    health_asthma: healthAsthma,
    health_asthma_meds: healthAsthma ? strOrNull(formData.get("health_asthma_meds")) : null,
    health_other: healthOther,
    health_other_meds: healthOther ? strOrNull(formData.get("health_other_meds")) : null,
    emergency_contact_name: strOrNull(formData.get("emergency_contact_name")),
    emergency_contact_father_name: strOrNull(formData.get("emergency_contact_father_name")),
    emergency_contact_age_years: numOrNull(formData.get("emergency_contact_age_years")),
    emergency_contact_address: strOrNull(formData.get("emergency_contact_address")),
    emergency_contact_phone: strOrNull(formData.get("emergency_contact_phone")),
    attended_badarinath_2024: boolVal(formData.get("attended_badarinath_2024")),
    sadhu_sant_category: boolVal(formData.get("sadhu_sant_category")),
    declaration_accepted: declarationAccepted,
    declaration_signed_at: declarationSignedAtInput
      ? new Date(declarationSignedAtInput).toISOString()
      : null,
    status: strOrNull(formData.get("status")),
  };

  const { error } = await supabase.rpc("fn_update_registration", {
    p_id: id,
    p_patch: patch,
  });

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

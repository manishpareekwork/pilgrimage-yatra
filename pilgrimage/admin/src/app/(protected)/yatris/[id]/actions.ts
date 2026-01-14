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

const computeAgeFromDob = (dob: string) => {
  const date = new Date(dob);
  if (Number.isNaN(date.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const hasHadBirthday =
    today.getMonth() > date.getMonth() ||
    (today.getMonth() === date.getMonth() && today.getDate() >= date.getDate());
  if (!hasHadBirthday) age -= 1;
  return age;
};

export async function updateRegistrationAction(formData: FormData) {
  const id = (formData.get("id") as string | null)?.trim();
  if (!id) return;

  const supabase = await getActionSupabase();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) {
    redirect("/login");
  }

  const healthNone = boolVal(formData.get("health_none"));
  const healthHeart = boolVal(formData.get("health_heart"));
  const healthBp = boolVal(formData.get("health_bp"));
  const healthDiabetes = boolVal(formData.get("health_diabetes"));
  const healthAsthma = boolVal(formData.get("health_asthma"));
  const healthCommon = strOrNull(formData.get("health_common_meds"));
  const healthOther = strOrNull(formData.get("health_other"));
  const declarationAccepted = boolVal(formData.get("declaration_accepted"));
  const declarationSignedAtInput = strOrNull(formData.get("declaration_signed_at"));
  const commonActive = !healthNone && (healthHeart || healthBp || healthDiabetes || healthAsthma);
  const travelMode = strOrNull(formData.get("travel_mode"));
  const dobValue = strOrNull(formData.get("dob"));
  const ageValue = numOrNull(formData.get("age_years"));

  if (dobValue && ageValue !== null) {
    const computed = computeAgeFromDob(dobValue);
    if (computed === null || Math.abs(computed - ageValue) > 1) {
      throw new Error("Age does not match DOB.");
    }
  }

  const patch = {
    receipt_no: strOrNull(formData.get("receipt_no")),
    name_hi: strOrNull(formData.get("name_hi")),
    guardian_relation: strOrNull(formData.get("guardian_relation")),
    father_name_hi: strOrNull(formData.get("father_name_hi")),
    address_hi: strOrNull(formData.get("address_hi")),
    address_state: strOrNull(formData.get("address_state")),
    address_district: strOrNull(formData.get("address_district")),
    address_city: strOrNull(formData.get("address_city")),
    address_pin: strOrNull(formData.get("address_pin")),
    aadhaar_no: strOrNull(formData.get("aadhaar_no")),
    dob: dobValue,
    age_years: ageValue,
    height_cm: numOrNull(formData.get("height_cm")),
    weight_kg: numOrNull(formData.get("weight_kg")),
    phone: strOrNull(formData.get("phone")),
    whatsapp: strOrNull(formData.get("whatsapp")),
    travel_mode: travelMode,
    train_class: travelMode === "air" ? null : strOrNull(formData.get("train_class")),
    reservation_by: strOrNull(formData.get("reservation_by")),
    health_none: healthNone,
    health_heart: healthNone ? false : healthHeart,
    health_heart_meds: healthNone ? null : healthHeart ? strOrNull(formData.get("health_heart_meds")) : null,
    health_bp: healthNone ? false : healthBp,
    health_bp_meds: healthNone ? null : healthBp ? strOrNull(formData.get("health_bp_meds")) : null,
    health_diabetes: healthNone ? false : healthDiabetes,
    health_diabetes_meds: healthNone
      ? null
      : healthDiabetes
        ? strOrNull(formData.get("health_diabetes_meds"))
        : null,
    health_asthma: healthNone ? false : healthAsthma,
    health_asthma_meds: healthNone
      ? null
      : healthAsthma
        ? strOrNull(formData.get("health_asthma_meds"))
        : null,
    health_common_meds: commonActive ? healthCommon : null,
    health_other: healthNone ? null : healthOther,
    health_other_meds: healthNone ? null : healthOther ? strOrNull(formData.get("health_other_meds")) : null,
    emergency_contact_name: strOrNull(formData.get("emergency_contact_name")),
    emergency_contact_father_name: strOrNull(formData.get("emergency_contact_father_name")),
    emergency_contact_age_years: numOrNull(formData.get("emergency_contact_age_years")),
    emergency_contact_address: strOrNull(formData.get("emergency_contact_address")),
    emergency_contact_phone: strOrNull(formData.get("emergency_contact_phone")),
    accompanying_name: strOrNull(formData.get("accompanying_name")),
    accompanying_guardian_name: strOrNull(formData.get("accompanying_guardian_name")),
    accompanying_resident_of: strOrNull(formData.get("accompanying_resident_of")),
    accompanying_phone: strOrNull(formData.get("accompanying_phone")),
    attended_badarinath_2024: boolVal(formData.get("attended_badarinath_2024")),
    sadhu_sant_category: boolVal(formData.get("sadhu_sant_category")),
    declaration_accepted: declarationAccepted,
    declaration_signed_at: declarationSignedAtInput
      ? new Date(declarationSignedAtInput).toISOString()
      : null,
    category_id: strOrNull(formData.get("category_id")),
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

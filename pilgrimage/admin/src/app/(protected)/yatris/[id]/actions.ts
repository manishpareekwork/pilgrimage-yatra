"use server";

import { getActionSupabase } from "@/lib/supabaseServer";
import {
  parseRegistrationFormData,
  type RegistrationFormInput,
} from "../new/actions";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type UpdateRegistrationState = {
  error: string | null;
  fieldErrors: Record<string, string> | null;
};

export const initialUpdateRegistrationState: UpdateRegistrationState = {
  error: null,
  fieldErrors: null,
};

function registrationInputToRpcPatch(input: RegistrationFormInput): Record<string, unknown> {
  const healthNone = input.health_none ?? false;
  const healthHeart = healthNone ? false : input.health_heart ?? false;
  const healthBp = healthNone ? false : input.health_bp ?? false;
  const healthDiabetes = healthNone ? false : input.health_diabetes ?? false;
  const healthAsthma = healthNone ? false : input.health_asthma ?? false;
  const healthOther = healthNone ? null : input.health_other ?? null;
  const commonActive = !healthNone && (healthHeart || healthBp || healthDiabetes || healthAsthma);

  const patch: Record<string, unknown> = {
    receipt_no: input.receipt_no ?? null,
    name_hi: input.name_hi,
    guardian_relation: input.guardian_relation ?? null,
    father_name_hi: input.father_name_hi ?? null,
    address_hi: input.address_hi,
    address_state: input.address_state ?? null,
    address_district: input.address_district ?? null,
    address_city: input.address_city ?? null,
    address_pin: input.address_pin ?? null,
    aadhaar_no: input.aadhaar_no ?? null,
    dob: input.dob ?? null,
    age_years: input.age_years ?? null,
    height_cm: input.height_cm ?? null,
    weight_kg: input.weight_kg ?? null,
    phone: input.phone,
    whatsapp: input.whatsapp ?? null,
    travel_mode: input.travel_mode ?? null,
    train_class: input.travel_mode === "air" ? null : input.train_class ?? null,
    reservation_by: input.reservation_by ?? null,
    category_id: input.category_id || null,
    group_id: input.group_id || null,
    health_none: healthNone,
    health_heart: healthHeart,
    health_heart_meds: healthNone ? null : healthHeart ? input.health_heart_meds ?? null : null,
    health_diabetes: healthDiabetes,
    health_diabetes_meds: healthNone ? null : healthDiabetes ? input.health_diabetes_meds ?? null : null,
    health_bp: healthBp,
    health_bp_meds: healthNone ? null : healthBp ? input.health_bp_meds ?? null : null,
    health_asthma: healthAsthma,
    health_asthma_meds: healthNone ? null : healthAsthma ? input.health_asthma_meds ?? null : null,
    health_common_meds: commonActive ? input.health_common_meds ?? null : null,
    health_other: healthOther,
    health_other_meds: healthNone ? null : healthOther ? input.health_other_meds ?? null : null,
    blood_group: input.blood_group ?? null,
    medical_conditions: input.medical_conditions ?? null,
    medical_allergies: input.medical_allergies ?? null,
    medical_medications: input.medical_medications ?? null,
    medical_emergency_notes: input.medical_emergency_notes ?? null,
    receipts: input.receipts && input.receipts.length > 0 ? input.receipts : null,
    emergency_contact_name: input.emergency_contact_name ?? null,
    emergency_contact_father_name: input.emergency_contact_father_name ?? null,
    emergency_contact_age_years: input.emergency_contact_age_years ?? null,
    emergency_contact_address: input.emergency_contact_address ?? null,
    emergency_contact_phone: input.emergency_contact_phone ?? null,
    accompanying_name: input.accompanying_name ?? null,
    accompanying_guardian_name: input.accompanying_guardian_name ?? null,
    accompanying_resident_of: input.accompanying_resident_of ?? null,
    accompanying_phone: input.accompanying_phone ?? null,
    attended_badarinath_2024: input.attended_badarinath_2024 ?? false,
    sadhu_sant_category: input.sadhu_sant_category ?? false,
    declaration_accepted: input.declaration_accepted,
  };

  if (input.declaration_signed_at) {
    patch.declaration_signed_at = new Date(input.declaration_signed_at).toISOString();
  } else {
    patch.declaration_signed_at = null;
  }

  return patch;
}

function mapRpcErrorToFields(message: string): Record<string, string> | null {
  const m = message.toLowerCase();
  if (m.includes("health selection") || m.includes("health_none")) {
    return { health_none: "Select a medical condition or 'No known conditions'." };
  }
  return null;
}

export async function updateRegistrationAction(
  _prevState: UpdateRegistrationState,
  formData: FormData
): Promise<UpdateRegistrationState> {
  const id = (formData.get("id") as string | null)?.trim();
  if (!id) {
    return { error: "Missing registration id.", fieldErrors: null };
  }

  const supabase = await getActionSupabase();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) {
    redirect("/login");
  }

  const parsed = parseRegistrationFormData(formData);
  if (!parsed.data) {
    return {
      error: parsed.error ?? "Invalid input",
      fieldErrors: parsed.fieldErrors ?? null,
    };
  }

  const patch = registrationInputToRpcPatch(parsed.data);

  const { error: rpcError } = await supabase.rpc("fn_update_registration", {
    p_id: id,
    p_patch: patch,
  });

  if (rpcError) {
    const mapped = mapRpcErrorToFields(rpcError.message);
    if (mapped) {
      return {
        error: "Please correct the highlighted fields.",
        fieldErrors: mapped,
      };
    }
    return { error: rpcError.message, fieldErrors: null };
  }

  revalidatePath("/yatris");
  revalidatePath(`/yatris/${id}`);
  redirect("/yatris");
}

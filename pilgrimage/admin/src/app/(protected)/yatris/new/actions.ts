import { getActionSupabase } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";

export type ActionState = {
  error?: string | null;
  id?: string | null;
  fieldErrors?: Record<string, string> | null;
};

const asOptionalString = (value: FormDataEntryValue | null) => {
  const str = value?.toString().trim();
  return str ? str : undefined;
};

const asNumber = (value: FormDataEntryValue | null) => {
  const str = asOptionalString(value);
  if (!str) return undefined;
  const num = Number(str);
  return Number.isFinite(num) ? num : str;
};

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const datetimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

type FormInput = {
  receipt_no?: string;
  name_hi: string;
  guardian_relation?: string;
  father_name_hi?: string;
  address_hi: string;
  aadhaar_no?: string;
  phone: string;
  whatsapp?: string;
  dob?: string;
  age_years?: number;
  height_cm?: number;
  weight_kg?: number;
  travel_mode?: string;
  train_class?: string;
  reservation_by?: string;
  health_heart: boolean;
  health_heart_meds?: string;
  health_diabetes: boolean;
  health_diabetes_meds?: string;
  health_bp: boolean;
  health_bp_meds?: string;
  health_asthma: boolean;
  health_asthma_meds?: string;
  health_common_meds?: string;
  health_other?: string;
  health_other_meds?: string;
  emergency_contact_name?: string;
  emergency_contact_father_name?: string;
  emergency_contact_age_years?: number;
  emergency_contact_address?: string;
  emergency_contact_phone?: string;
  attended_badarinath_2024: boolean;
  sadhu_sant_category: boolean;
  declaration_accepted: boolean;
  declaration_signed_at?: string;
};

const parseFormData = (
  formData: FormData
): { data?: FormInput; error?: string; fieldErrors?: Record<string, string> } => {
  const fieldErrors: Record<string, string> = {};
  const ageYears = asNumber(formData.get("age_years"));
  const ageValue = typeof ageYears === "string" ? undefined : ageYears;
  if (typeof ageYears === "string") fieldErrors.age_years = "Age must be a number";
  const emergencyAge = asNumber(formData.get("emergency_contact_age_years"));
  const emergencyAgeValue = typeof emergencyAge === "string" ? undefined : emergencyAge;
  if (typeof emergencyAge === "string") fieldErrors.emergency_contact_age_years = "Emergency age must be a number";
  const heightCm = asNumber(formData.get("height_cm"));
  const heightValue = typeof heightCm === "string" ? undefined : heightCm;
  if (typeof heightCm === "string") fieldErrors.height_cm = "Height must be a number";
  const weightKg = asNumber(formData.get("weight_kg"));
  const weightValue = typeof weightKg === "string" ? undefined : weightKg;
  if (typeof weightKg === "string") fieldErrors.weight_kg = "Weight must be a number";

  const data: FormInput = {
    receipt_no: asOptionalString(formData.get("receipt_no")),
    name_hi: asOptionalString(formData.get("name_hi")) || "",
    guardian_relation: asOptionalString(formData.get("guardian_relation")),
    father_name_hi: asOptionalString(formData.get("father_name_hi")),
    address_hi: asOptionalString(formData.get("address_hi")) || "",
    aadhaar_no: asOptionalString(formData.get("aadhaar_no")),
    phone: asOptionalString(formData.get("phone")) || "",
    whatsapp: asOptionalString(formData.get("whatsapp")),
    dob: asOptionalString(formData.get("dob")),
    age_years: ageValue,
    height_cm: heightValue,
    weight_kg: weightValue,
    travel_mode: asOptionalString(formData.get("travel_mode")),
    train_class: asOptionalString(formData.get("train_class")),
    reservation_by: asOptionalString(formData.get("reservation_by")),
    health_heart: formData.get("health_heart") === "on",
    health_heart_meds: asOptionalString(formData.get("health_heart_meds")),
    health_diabetes: formData.get("health_diabetes") === "on",
    health_diabetes_meds: asOptionalString(formData.get("health_diabetes_meds")),
    health_bp: formData.get("health_bp") === "on",
    health_bp_meds: asOptionalString(formData.get("health_bp_meds")),
    health_asthma: formData.get("health_asthma") === "on",
    health_asthma_meds: asOptionalString(formData.get("health_asthma_meds")),
    health_common_meds: asOptionalString(formData.get("health_common_meds")),
    health_other: asOptionalString(formData.get("health_other")),
    health_other_meds: asOptionalString(formData.get("health_other_meds")),
    emergency_contact_name: asOptionalString(formData.get("emergency_contact_name")),
    emergency_contact_father_name: asOptionalString(formData.get("emergency_contact_father_name")),
    emergency_contact_age_years: emergencyAgeValue,
    emergency_contact_address: asOptionalString(formData.get("emergency_contact_address")),
    emergency_contact_phone: asOptionalString(formData.get("emergency_contact_phone")),
    attended_badarinath_2024: formData.get("attended_badarinath_2024") === "on",
    sadhu_sant_category: formData.get("sadhu_sant_category") === "on",
    declaration_accepted: formData.get("declaration_accepted") === "on",
    declaration_signed_at: asOptionalString(formData.get("declaration_signed_at")),
  };

  if (!data.name_hi) fieldErrors.name_hi = "Name is required";
  if (!data.address_hi) fieldErrors.address_hi = "Address is required";
  if (!data.phone) fieldErrors.phone = "Phone is required";
  if (!data.declaration_accepted) fieldErrors.declaration_accepted = "Declaration must be accepted";
  if (data.dob && !dateRegex.test(data.dob)) fieldErrors.dob = "DOB must be YYYY-MM-DD";
  if (data.declaration_signed_at && !datetimeRegex.test(data.declaration_signed_at)) {
    fieldErrors.declaration_signed_at = "Declaration time must include date and time";
  }
  if (data.age_years !== undefined && (data.age_years < 0 || data.age_years > 120)) {
    fieldErrors.age_years = "Age must be between 0 and 120";
  }
  if (
    data.emergency_contact_age_years !== undefined &&
    (data.emergency_contact_age_years < 0 || data.emergency_contact_age_years > 120)
  ) {
    fieldErrors.emergency_contact_age_years = "Emergency contact age must be between 0 and 120";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { error: "Please correct the highlighted fields.", fieldErrors };
  }

  return { data };
};

export async function createRegistrationAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  "use server";

  const supabase = await getActionSupabase();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) {
    redirect("/login");
  }

  const parsed = parseFormData(formData);
  if (!parsed.data) {
    return {
      error: parsed.error ?? "Invalid input",
      fieldErrors: parsed.fieldErrors ?? null,
    };
  }

  const input = parsed.data;
  const commonActive = input.health_heart || input.health_bp || input.health_diabetes || input.health_asthma;
  const createPayload = {
    p_owner: userData.user.id,
    p_created_by: userData.user.id,
    p_name_hi: input.name_hi,
    p_address_hi: input.address_hi,
    p_phone: input.phone,
    p_declaration_accepted: input.declaration_accepted,
    p_declaration_signed_at: input.declaration_signed_at
      ? new Date(input.declaration_signed_at).toISOString()
      : null,
  };

  const { data: newId, error: createError } = await supabase.rpc("fn_create_registration", createPayload);

  if (createError || !newId) {
    return { error: createError?.message ?? "Could not create registration" };
  }

  const patch = {
    receipt_no: input.receipt_no ?? null,
    name_hi: input.name_hi,
    guardian_relation: input.guardian_relation ?? null,
    father_name_hi: input.father_name_hi ?? null,
    address_hi: input.address_hi,
    aadhaar_no: input.aadhaar_no ?? null,
    dob: input.dob ?? null,
    age_years: input.age_years ?? null,
    height_cm: input.height_cm ?? null,
    weight_kg: input.weight_kg ?? null,
    phone: input.phone,
    whatsapp: input.whatsapp ?? null,
    travel_mode: input.travel_mode ?? null,
    train_class: input.train_class ?? null,
    reservation_by: input.reservation_by ?? null,
    health_heart: input.health_heart ?? false,
    health_heart_meds: input.health_heart ? input.health_heart_meds ?? null : null,
    health_diabetes: input.health_diabetes ?? false,
    health_diabetes_meds: input.health_diabetes ? input.health_diabetes_meds ?? null : null,
    health_bp: input.health_bp ?? false,
    health_bp_meds: input.health_bp ? input.health_bp_meds ?? null : null,
    health_asthma: input.health_asthma ?? false,
    health_asthma_meds: input.health_asthma ? input.health_asthma_meds ?? null : null,
    health_common_meds: commonActive ? input.health_common_meds ?? null : null,
    health_other: input.health_other ?? null,
    health_other_meds: input.health_other ? input.health_other_meds ?? null : null,
    emergency_contact_name: input.emergency_contact_name ?? null,
    emergency_contact_father_name: input.emergency_contact_father_name ?? null,
    emergency_contact_age_years: input.emergency_contact_age_years ?? null,
    emergency_contact_address: input.emergency_contact_address ?? null,
    emergency_contact_phone: input.emergency_contact_phone ?? null,
    attended_badarinath_2024: input.attended_badarinath_2024 ?? false,
    sadhu_sant_category: input.sadhu_sant_category ?? false,
    declaration_accepted: input.declaration_accepted,
    declaration_signed_at: input.declaration_signed_at
      ? new Date(input.declaration_signed_at).toISOString()
      : null,
    status: "submitted",
  };

  const { error: updateError } = await supabase.rpc("fn_update_registration", {
    p_id: newId as string,
    p_patch: patch,
  });

  if (updateError) {
    return {
      id: newId as string,
      error: updateError.message,
    };
  }

  return { id: newId as string };
}

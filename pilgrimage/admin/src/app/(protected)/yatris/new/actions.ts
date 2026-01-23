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

type ReceiptInput = {
  receipt_no: string;
  amount: number;
  payment_mode: string;
  receipt_date: string;
};

const parseReceipts = (formData: FormData, fieldErrors: Record<string, string>) => {
  const readAll = (key: string) =>
    formData
      .getAll(key)
      .map((value) => value.toString().trim());

  const receiptNumbers = readAll("receipt_number");
  const amounts = readAll("receipt_amount");
  const modes = readAll("receipt_mode");
  const dates = readAll("receipt_date");
  const rowCount = Math.max(receiptNumbers.length, amounts.length, modes.length, dates.length);

  if (rowCount === 0) return [] as ReceiptInput[];

  if (
    receiptNumbers.length !== rowCount ||
    amounts.length !== rowCount ||
    modes.length !== rowCount ||
    dates.length !== rowCount
  ) {
    fieldErrors.receipts = "Receipts are incomplete.";
    return [] as ReceiptInput[];
  }

  const receipts: ReceiptInput[] = [];
  for (let i = 0; i < rowCount; i += 1) {
    const receiptNo = receiptNumbers[i];
    const amountRaw = amounts[i];
    const mode = modes[i];
    const date = dates[i];

    if (!receiptNo || !amountRaw || !mode || !date) {
      fieldErrors.receipts = "All receipt fields are required.";
      continue;
    }

    const amount = Number(amountRaw);
    if (!Number.isFinite(amount)) {
      fieldErrors.receipts = "Receipt amount must be a number.";
      continue;
    }

    if (!dateRegex.test(date)) {
      fieldErrors.receipts = "Receipt date must be YYYY-MM-DD.";
      continue;
    }

    receipts.push({
      receipt_no: receiptNo,
      amount,
      payment_mode: mode,
      receipt_date: date,
    });
  }

  return receipts;
};

type FormInput = {
  receipt_no?: string;
  name_hi: string;
  guardian_relation?: string;
  father_name_hi?: string;
  address_hi: string;
  address_state?: string;
  address_district?: string;
  address_city?: string;
  address_pin?: string;
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
  category_id?: string;
  group_id?: string;
  health_none: boolean;
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
  blood_group?: string;
  medical_conditions?: string;
  medical_allergies?: string;
  medical_medications?: string;
  medical_emergency_notes?: string;
  emergency_contact_name?: string;
  emergency_contact_father_name?: string;
  emergency_contact_age_years?: number;
  emergency_contact_address?: string;
  emergency_contact_phone?: string;
  accompanying_name?: string;
  accompanying_guardian_name?: string;
  accompanying_resident_of?: string;
  accompanying_phone?: string;
  attended_badarinath_2024: boolean;
  sadhu_sant_category: boolean;
  declaration_accepted: boolean;
  declaration_signed_at?: string;
  receipts?: ReceiptInput[];
};

const parseFormData = (
  formData: FormData
): { data?: FormInput; error?: string; fieldErrors?: Record<string, string> } => {
  const fieldErrors: Record<string, string> = {};
  const receipts = parseReceipts(formData, fieldErrors);
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

  const primaryReceiptNo = receipts[0]?.receipt_no ?? asOptionalString(formData.get("receipt_no"));

  const data: FormInput = {
    receipt_no: primaryReceiptNo,
    name_hi: asOptionalString(formData.get("name_hi")) || "",
    guardian_relation: asOptionalString(formData.get("guardian_relation")),
    father_name_hi: asOptionalString(formData.get("father_name_hi")),
    address_hi: asOptionalString(formData.get("address_hi")) || "",
    address_state: asOptionalString(formData.get("address_state")),
    address_district: asOptionalString(formData.get("address_district")),
    address_city: asOptionalString(formData.get("address_city")),
    address_pin: asOptionalString(formData.get("address_pin")),
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
    category_id: asOptionalString(formData.get("category_id")),
    group_id: asOptionalString(formData.get("group_id")),
    health_none: formData.get("health_none") === "on",
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
    blood_group: asOptionalString(formData.get("blood_group")),
    medical_conditions: asOptionalString(formData.get("medical_conditions")),
    medical_allergies: asOptionalString(formData.get("medical_allergies")),
    medical_medications: asOptionalString(formData.get("medical_medications")),
    medical_emergency_notes: asOptionalString(formData.get("medical_emergency_notes")),
    emergency_contact_name: asOptionalString(formData.get("emergency_contact_name")),
    emergency_contact_father_name: asOptionalString(formData.get("emergency_contact_father_name")),
    emergency_contact_age_years: emergencyAgeValue,
    emergency_contact_address: asOptionalString(formData.get("emergency_contact_address")),
    emergency_contact_phone: asOptionalString(formData.get("emergency_contact_phone")),
    accompanying_name: asOptionalString(formData.get("accompanying_name")),
    accompanying_guardian_name: asOptionalString(formData.get("accompanying_guardian_name")),
    accompanying_resident_of: asOptionalString(formData.get("accompanying_resident_of")),
    accompanying_phone: asOptionalString(formData.get("accompanying_phone")),
    attended_badarinath_2024: formData.get("attended_badarinath_2024") === "on",
    sadhu_sant_category: formData.get("sadhu_sant_category") === "on",
    declaration_accepted: formData.get("declaration_accepted") === "on",
    declaration_signed_at: asOptionalString(formData.get("declaration_signed_at")),
    receipts,
  };

  if (!data.name_hi) fieldErrors.name_hi = "Name is required";
  if (!data.father_name_hi) fieldErrors.father_name_hi = "Guardian name is required";
  if (!data.address_hi) fieldErrors.address_hi = "Address is required";
  if (!data.address_state) fieldErrors.address_state = "State is required";
  if (!data.address_district) fieldErrors.address_district = "District is required";
  if (!data.address_city) fieldErrors.address_city = "City/Village is required";
  if (!data.aadhaar_no) fieldErrors.aadhaar_no = "Aadhaar number is required";
  if (!data.phone) fieldErrors.phone = "Phone is required";
  if (!data.whatsapp) fieldErrors.whatsapp = "WhatsApp number is required";
  if (!data.dob) fieldErrors.dob = "Date of birth is required";
  if (data.age_years === undefined) fieldErrors.age_years = "Age is required";
  if (!data.travel_mode) fieldErrors.travel_mode = "Travel mode is required";
  if (!data.reservation_by) fieldErrors.reservation_by = "Reservation preference is required";
  if (!data.accompanying_name) fieldErrors.accompanying_name = "Accompanying person name is required";
  if (!data.accompanying_guardian_name)
    fieldErrors.accompanying_guardian_name = "Accompanying guardian name is required";
  if (!data.accompanying_resident_of)
    fieldErrors.accompanying_resident_of = "Accompanying resident of is required";
  if (!data.accompanying_phone) fieldErrors.accompanying_phone = "Accompanying phone is required";
  if (!data.declaration_accepted) fieldErrors.declaration_accepted = "Declaration must be accepted";
  if (data.dob && !dateRegex.test(data.dob)) fieldErrors.dob = "DOB must be YYYY-MM-DD";
  if (data.declaration_signed_at && !datetimeRegex.test(data.declaration_signed_at)) {
    fieldErrors.declaration_signed_at = "Declaration time must include date and time";
  }
  if (data.age_years !== undefined && (data.age_years < 0 || data.age_years > 120)) {
    fieldErrors.age_years = "Age must be between 0 and 120";
  }
  if (data.dob && data.age_years !== undefined) {
    const computedAge = computeAgeFromDob(data.dob);
    if (computedAge === null) {
      fieldErrors.dob = "DOB must be a valid date";
    } else if (Math.abs(computedAge - data.age_years) > 1) {
      fieldErrors.age_years = "Age does not match DOB";
    }
  }
  if (
    data.emergency_contact_age_years !== undefined &&
    (data.emergency_contact_age_years < 0 || data.emergency_contact_age_years > 120)
  ) {
    fieldErrors.emergency_contact_age_years = "Emergency contact age must be between 0 and 120";
  }
  if (data.travel_mode === "train" && !data.train_class) {
    fieldErrors.train_class = "Train class is required";
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
  const healthNone = input.health_none ?? false;
  const healthHeart = healthNone ? false : input.health_heart ?? false;
  const healthBp = healthNone ? false : input.health_bp ?? false;
  const healthDiabetes = healthNone ? false : input.health_diabetes ?? false;
  const healthAsthma = healthNone ? false : input.health_asthma ?? false;
  const healthOther = healthNone ? null : input.health_other ?? null;
  const commonActive = !healthNone && (healthHeart || healthBp || healthDiabetes || healthAsthma);
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
    p_health_none: healthNone,
    p_health_heart: healthHeart,
    p_health_bp: healthBp,
    p_health_diabetes: healthDiabetes,
    p_health_asthma: healthAsthma,
    p_health_other: healthOther,
  };

  const { data: newId, error: createError } = await supabase.rpc("fn_create_registration", createPayload);

  if (createError || !newId) {
    return { error: createError?.message ?? "Could not create registration" };
  }

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
    category_id: input.category_id ?? null,
    group_id: input.group_id ?? null,
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
    health_other_meds: healthNone
      ? null
      : healthOther
        ? input.health_other_meds ?? null
        : null,
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
    status: "approved",
  };
  if (input.declaration_signed_at) {
    patch.declaration_signed_at = new Date(input.declaration_signed_at).toISOString();
  }

  const { error: updateError } = await supabase
    .from("yatra_registrations")
    .update(patch)
    .eq("id", newId as string);

  if (updateError) {
    return {
      id: newId as string,
      error: updateError.message,
    };
  }

  return { id: newId as string };
}

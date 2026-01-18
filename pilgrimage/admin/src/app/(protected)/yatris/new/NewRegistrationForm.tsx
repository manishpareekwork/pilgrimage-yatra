"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ActionState } from "./actions";
import {
  CheckboxRow,
  Field,
  FormSection,
  ChakraSpinner,
  PageHeader,
  Select,
  TextArea,
  TextInput,
} from "@/components/ui";
import { getBrowserSupabase } from "@/lib/supabaseBrowser";
import { TRAIN_CLASS_OPTIONS } from "@/lib/trainClasses";
import { listDistricts, listStates, type AddressOption } from "@/lib/addressLookup";

const initialState: ActionState = { error: null, id: null, fieldErrors: null };

type ReceiptDraft = {
  id: string;
  receipt_number: string;
  amount: string;
  payment_mode: string;
  receipt_date: string;
};

const createReceiptDraft = (overrides?: Partial<ReceiptDraft>): ReceiptDraft => ({
  id: `receipt_${Date.now()}_${Math.random().toString(16).slice(2)}`,
  receipt_number: "",
  amount: "",
  payment_mode: "",
  receipt_date: "",
  ...overrides,
});

const requiredFieldNames = new Set([
  "name_hi",
  "father_name_hi",
  "address_hi",
  "address_state",
  "address_district",
  "address_city",
  "aadhaar_no",
  "phone",
  "whatsapp",
  "dob",
  "age_years",
  "travel_mode",
  "train_class",
  "reservation_by",
  "accompanying_name",
  "accompanying_guardian_name",
  "accompanying_resident_of",
  "accompanying_phone",
  "declaration_accepted",
  "declaration_signed_at",
]);

const formatDateTimeLocal = (date: Date) => {
  const pad = (value: number) => String(value).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
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

const RECEIPT_PAYMENT_OPTIONS = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "card", label: "Card" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "cheque", label: "Cheque" },
] as const;

const BLOOD_GROUP_OPTIONS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;

function SubmitButton({
  pending,
  disabled,
  className,
}: {
  pending: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const isDisabled = pending || disabled;
  return (
    <button
      type="submit"
      disabled={isDisabled}
      className={[
        "btn-primary disabled:opacity-70",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {pending ? "Creating..." : "Save & Open"}
    </button>
  );
}

export function NewRegistrationForm({
  action,
}: {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [state, formAction, isPending] = React.useActionState(action, initialState);
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);
  const supabase = useMemo(() => getBrowserSupabase(), []);
  const orchestratorUrl = process.env.NEXT_PUBLIC_ORCHESTRATOR_URL;
  const hasOrchestrator = Boolean(orchestratorUrl);
  const [travelMode, setTravelMode] = useState("");
  const [healthNone, setHealthNone] = useState(false);
  const [healthHeart, setHealthHeart] = useState(false);
  const [healthBp, setHealthBp] = useState(false);
  const [healthDiabetes, setHealthDiabetes] = useState(false);
  const [healthAsthma, setHealthAsthma] = useState(false);
  const [commonMedicalNotes, setCommonMedicalNotes] = useState("");
  const [otherActive, setOtherActive] = useState(false);
  const [showRequiredOnly, setShowRequiredOnly] = useState(false);
  const [receipts, setReceipts] = useState<ReceiptDraft[]>([]);
  const [activeReceiptId, setActiveReceiptId] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [formFile, setFormFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [formPreview, setFormPreview] = useState<string | null>(null);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [preSubmitError, setPreSubmitError] = useState<string | null>(null);
  const [isFormValid, setIsFormValid] = useState(false);
  const [uploadAttempted, setUploadAttempted] = useState(false);
  const [stateOptions, setStateOptions] = useState<AddressOption[]>([]);
  const [districtOptions, setDistrictOptions] = useState<AddressOption[]>([]);
  const [addressState, setAddressState] = useState("");
  const [addressDistrict, setAddressDistrict] = useState("");
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [categoryOptions, setCategoryOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [categoryError, setCategoryError] = useState<string | null>(null);

  const clearInput = (name: string) => {
    const el = formRef.current?.elements.namedItem(name) as
      | HTMLInputElement
      | HTMLTextAreaElement
      | null;
    if (el) el.value = "";
  };

  const setInputValue = (name: string, value: string) => {
    const el = formRef.current?.elements.namedItem(name) as
      | HTMLInputElement
      | HTMLTextAreaElement
      | HTMLSelectElement
      | null;
    if (!el) return;
    if (el instanceof HTMLInputElement && el.type === "checkbox") {
      el.checked = value === "on" || value === "true" || value === "1";
      return;
    }
    el.value = value;
  };

  const setCheckboxValue = (name: string, checked: boolean) => {
    const el = formRef.current?.elements.namedItem(name) as HTMLInputElement | null;
    if (el) el.checked = checked;
  };

  const setSignedAtNow = () => {
    setInputValue("declaration_signed_at", formatDateTimeLocal(new Date()));
  };

  const setPreviewFromFile = (
    file: File | null,
    setter: React.Dispatch<React.SetStateAction<string | null>>
  ) => {
    if (!file || !file.type.startsWith("image/")) {
      setter(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setter(url);
  };

  const handleFileChange =
    (kind: "photo" | "form") => (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0] ?? null;
      if (kind === "photo") {
        setPhotoFile(file);
        setPreviewFromFile(file, setPhotoPreview);
      } else {
        setFormFile(file);
        setPreviewFromFile(file, setFormPreview);
      }
      setPreSubmitError(null);
    };

  const renderUploadSlot = (
    kind: "photo" | "form",
    label: string,
    file: File | null,
    previewUrl: string | null,
    placeholderOverride?: string
  ) => {
    const isDisabled = isPending || uploadingFiles;
    const placeholderText = uploadingFiles
      ? "Uploading"
      : file
        ? "Selected"
        : placeholderOverride ?? `Add ${label}`;
    const accept =
      kind === "photo" ? "image/jpeg,image/png,image/webp" : "image/jpeg,image/png,image/webp,application/pdf";

    return (
      <label className={`upload-thumb ${isDisabled ? "upload-thumb--disabled" : ""}`} title={label}>
        {previewUrl ? (
          <img src={previewUrl} alt={`${label} preview`} className="upload-thumb-image" />
        ) : (
          <div className="upload-thumb-placeholder" aria-label={`${label} placeholder`}>
            {uploadingFiles ? (
              <>
                <ChakraSpinner className="h-5 w-5" title="Uploading" />
                <span>{placeholderText}</span>
              </>
            ) : (
              <>
                <div className="relative flex items-center justify-center">
                  <ChakraSpinner
                    className="h-5 w-5 text-[color:var(--muted)]"
                    animate={false}
                    title="Add upload"
                  />
                  <svg viewBox="0 0 20 20" className="upload-thumb-plus absolute" aria-hidden="true">
                    <path
                      d="M10 4v12M4 10h12"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <span>{placeholderText}</span>
              </>
            )}
          </div>
        )}
        <input
          type="file"
          accept={accept}
          className="sr-only"
          disabled={isDisabled}
          onChange={handleFileChange(kind)}
        />
      </label>
    );
  };

  const addReceipt = () => {
    const draft = createReceiptDraft();
    setReceipts((prev) => [...prev, draft]);
    setActiveReceiptId(draft.id);
    requestAnimationFrame(() => {
      document.getElementById(`receipt-${draft.id}-number`)?.focus();
    });
  };

  const updateReceipt = (id: string, field: keyof ReceiptDraft, value: string) => {
    setReceipts((prev) =>
      prev.map((receipt) => (receipt.id === id ? { ...receipt, [field]: value } : receipt))
    );
  };

  const removeReceipt = (id: string) => {
    setReceipts((prev) => prev.filter((receipt) => receipt.id !== id));
    setActiveReceiptId((prev) => (prev === id ? null : prev));
  };

  const editReceipt = (id: string) => {
    setActiveReceiptId(id);
    requestAnimationFrame(() => {
      document.getElementById(`receipt-${id}-number`)?.focus();
    });
  };

  useEffect(() => {
    let isActive = true;
    const loadStates = async () => {
      try {
        const options = await listStates(supabase);
        if (!isActive) return;
        setStateOptions(options);
      } catch (err) {
        if (!isActive) return;
        setLookupError(err instanceof Error ? err.message : "Unable to load states.");
      }
    };
    void loadStates();
    return () => {
      isActive = false;
    };
  }, [supabase]);

  useEffect(() => {
    let isActive = true;
    const loadCategories = async () => {
      const { data, error } = await supabase
        .from("yatra_categories")
        .select("id, name")
        .order("name");
      if (!isActive) return;
      if (error) {
        setCategoryError(error.message);
        return;
      }
      setCategoryOptions(data ?? []);
    };
    void loadCategories();
    return () => {
      isActive = false;
    };
  }, [supabase]);

  useEffect(() => {
    if (!addressState) {
      setDistrictOptions([]);
      if (addressDistrict) setAddressDistrict("");
      return;
    }
    let isActive = true;
    const loadDistricts = async () => {
      try {
        const options = await listDistricts(supabase, addressState);
        if (!isActive) return;
        setDistrictOptions(options);
      } catch (err) {
        if (!isActive) return;
        setLookupError(err instanceof Error ? err.message : "Unable to load districts.");
      }
    };
    void loadDistricts();
    return () => {
      isActive = false;
    };
  }, [supabase, addressState, addressDistrict]);

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  useEffect(() => {
    return () => {
      if (formPreview) URL.revokeObjectURL(formPreview);
    };
  }, [formPreview]);

  const fillTestData = () => {
    const randomFrom = <T,>(items: readonly T[]) => items[Math.floor(Math.random() * items.length)];
    const firstNames = ["Anil", "Sunita", "Ravi", "Meera", "Deepak", "Neha", "Arjun", "Kiran", "Pooja", "Rahul"];
    const lastNames = ["Sharma", "Verma", "Singh", "Gupta", "Patel", "Khan", "Yadav", "Mehta", "Nair", "Iyer"];
    const states = ["Delhi", "Uttarakhand", "Uttar Pradesh", "Rajasthan", "Maharashtra", "Madhya Pradesh", "Bihar"];
    const cities = ["New Delhi", "Dehradun", "Lucknow", "Jaipur", "Pune", "Bhopal", "Patna", "Varanasi"];
    const guardians = ["father", "husband", "guardian"] as const;
    const reservation = ["self", "committee"] as const;
    const travelModes = ["train", "air"] as const;
    const uniqueSuffix = String(Date.now()).slice(-9).padStart(9, "0");
    const uniquePhone = `9${uniqueSuffix}`;
    const guardianRelation = randomFrom(guardians);
    const reservationBy = randomFrom(reservation);
    const travelModeValue = randomFrom(travelModes);
    const stateValue = stateOptions.length > 0 ? randomFrom(stateOptions).id : randomFrom(states);
    const cityValue = randomFrom(cities);
    const dob = new Date();
    const ageSeed = 20 + Math.floor(Math.random() * 35);
    dob.setFullYear(dob.getFullYear() - ageSeed);
    dob.setMonth(Math.floor(Math.random() * 12));
    dob.setDate(Math.floor(Math.random() * 28) + 1);
    const dobValue = dob.toISOString().slice(0, 10);
    const computedAge = computeAgeFromDob(dobValue);
    const ageValue = computedAge ?? ageSeed;
    const aadhaarDigits = `${Math.floor(100000000000 + Math.random() * 900000000000)}`;
    const aadhaarValue = `${aadhaarDigits.slice(0, 4)} ${aadhaarDigits.slice(4, 8)} ${aadhaarDigits.slice(8, 12)}`;

    const receiptDraft = createReceiptDraft({
      receipt_number: `REC-${uniqueSuffix.slice(-5)}`,
      amount: String(2000 + Math.floor(Math.random() * 5000)),
      payment_mode: "cash",
      receipt_date: new Date().toISOString().slice(0, 10),
    });
    setReceipts([receiptDraft]);
    setActiveReceiptId(receiptDraft.id);
    setInputValue("name_hi", `${randomFrom(firstNames)} ${randomFrom(lastNames)}`);
    setInputValue("guardian_relation", guardianRelation);
    setInputValue("father_name_hi", `${randomFrom(firstNames)} ${randomFrom(lastNames)}`);
    setInputValue("address_hi", `${cityValue} main road, sector ${Math.floor(Math.random() * 30) + 1}`);
    setAddressState(stateValue);
    setAddressDistrict(cityValue);
    setInputValue("address_city", cityValue);
    setInputValue("address_pin", `${Math.floor(100000 + Math.random() * 900000)}`);
    setInputValue("aadhaar_no", aadhaarValue);
    setInputValue("phone", uniquePhone);
    setInputValue("whatsapp", uniquePhone);
    setInputValue("dob", dobValue);
    setInputValue("age_years", String(ageValue));
    setInputValue("height_cm", (160 + Math.random() * 20).toFixed(1));
    setInputValue("weight_kg", (55 + Math.random() * 20).toFixed(1));
    setTravelMode(travelModeValue);
    setInputValue("travel_mode", travelModeValue);
    setInputValue("train_class", travelModeValue === "train" ? randomFrom(TRAIN_CLASS_OPTIONS) : "");
    setInputValue("reservation_by", reservationBy);
    setInputValue("accompanying_name", `${randomFrom(firstNames)} ${randomFrom(lastNames)}`);
    setInputValue("accompanying_guardian_name", `${randomFrom(firstNames)} ${randomFrom(lastNames)}`);
    setInputValue("accompanying_resident_of", cityValue);
    setInputValue("accompanying_phone", `8${uniqueSuffix}`);
    setSignedAtNow();
    setCheckboxValue("declaration_accepted", true);
    const healthRoll = Math.random();
    if (healthRoll < 0.6) {
      setHealthNone(true);
      setHealthHeart(false);
      setHealthBp(false);
      setHealthDiabetes(false);
      setHealthAsthma(false);
      setOtherActive(false);
      setCommonMedicalNotes("");
    } else {
      setHealthNone(false);
      setHealthHeart(false);
      setHealthBp(false);
      setHealthDiabetes(false);
      setHealthAsthma(false);
      setOtherActive(false);
      const pick = randomFrom(["heart", "bp", "diabetes", "asthma"] as const);
      if (pick === "heart") setHealthHeart(true);
      if (pick === "bp") setHealthBp(true);
      if (pick === "diabetes") setHealthDiabetes(true);
      if (pick === "asthma") setHealthAsthma(true);
      setCommonMedicalNotes("General meds");
    }
    setPreSubmitError(null);
  };

  const signUrl = async (action: "upload" | "download", bucket: "forms" | "photos", object: string) => {
    if (!orchestratorUrl) {
      throw new Error("Orchestrator URL not configured.");
    }
    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;
    if (!token) {
      throw new Error("Not authenticated");
    }
    const res = await fetch(`${orchestratorUrl}/sign-url`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        bucket,
        object,
        action,
        expiresIn: 600,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error?.message || "Failed to get signed URL");
    }
    const json = await res.json();
    return json.signedUrl as string;
  };

  const buildUploadPath = (kind: "photo" | "form", registrationId: string) =>
    kind === "photo"
      ? `photos/registrations/${registrationId}/photo.jpg`
      : `forms/registrations/${registrationId}/form.jpg`;

  const uploadFile = async (kind: "photo" | "form", file: File, registrationId: string) => {
    const bucket = kind === "photo" ? "photos" : "forms";
    const object = buildUploadPath(kind, registrationId);
    const uploadUrl = await signUrl("upload", bucket, object);
    const put = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
    });
    if (!put.ok) {
      throw new Error("Upload failed");
    }
    const column = kind === "photo" ? "photo_url" : "form_image_url";
    const { error } = await supabase.rpc("fn_update_registration", {
      p_id: registrationId,
      p_patch: { [column]: object },
    });
    if (error) throw error;
  };

  const uploadSelectedFiles = async (registrationId: string) => {
    if (photoFile) await uploadFile("photo", photoFile, registrationId);
    if (formFile) await uploadFile("form", formFile, registrationId);
    const { error } = await supabase.rpc("fn_update_registration", {
      p_id: registrationId,
      p_patch: { status: "approved" },
    });
    if (error) throw error;
  };

  useEffect(() => {
    if (!state?.id || state?.error || uploadAttempted) return;
    setUploadAttempted(true);
    if (!photoFile && !formFile) {
      router.push("/yatris");
      return;
    }
    if (!hasOrchestrator) {
      setUploadError("Set NEXT_PUBLIC_ORCHESTRATOR_URL to enable uploads.");
      return;
    }
    let isActive = true;
    const runUploads = async () => {
      setUploadingFiles(true);
      setUploadError(null);
      try {
        await uploadSelectedFiles(state.id as string);
        if (isActive) router.push("/yatris");
      } catch (err) {
        if (isActive) {
          setUploadError(err instanceof Error ? err.message : "Upload failed");
        }
      } finally {
        if (isActive) setUploadingFiles(false);
      }
    };
    void runUploads();
    return () => {
      isActive = false;
    };
  }, [router, state?.error, state?.id, photoFile, formFile, hasOrchestrator, uploadAttempted]);

  const commonMedicalActive = !healthNone && (healthHeart || healthBp || healthDiabetes || healthAsthma);
  const canUploadSelectedFiles = hasOrchestrator || (!photoFile && !formFile);
  const showReceiptsSection = !showRequiredOnly || receipts.length > 0;

  useEffect(() => {
    if (!commonMedicalActive) setCommonMedicalNotes("");
  }, [commonMedicalActive]);

  useEffect(() => {
    if (healthNone) {
      setHealthHeart(false);
      setHealthBp(false);
      setHealthDiabetes(false);
      setHealthAsthma(false);
      setOtherActive(false);
      setCommonMedicalNotes("");
      clearInput("health_other");
      clearInput("health_other_meds");
    }
  }, [healthNone]);

  useEffect(() => {
    if (!otherActive) {
      clearInput("health_other");
      clearInput("health_other_meds");
    }
  }, [otherActive]);

  const hasCustomState = Boolean(addressState && !stateOptions.some((option) => option.id === addressState));
  const hasCustomDistrict = Boolean(
    addressDistrict && !districtOptions.some((option) => option.id === addressDistrict)
  );

  const fieldErrors = state?.fieldErrors ?? undefined;
  const hasFieldError = (name: string) => Boolean(fieldErrors?.[name]);
  const hasHiddenErrors = Boolean(
    showRequiredOnly &&
      fieldErrors &&
      Object.keys(fieldErrors).some((key) =>
        key === "receipts" ? !showReceiptsSection : !requiredFieldNames.has(key)
      )
  );
  const getClientValidation = React.useCallback(() => {
    const form = formRef.current;
    if (!form) {
      return { valid: false, nativeValid: false, message: "Unable to validate form." };
    }
    const nativeValid = form.checkValidity();
    if (!nativeValid) return { valid: false, nativeValid };

    const dobValue = (form.elements.namedItem("dob") as HTMLInputElement | null)?.value ?? "";
    const ageValue = (form.elements.namedItem("age_years") as HTMLInputElement | null)?.value ?? "";
    if (dobValue && ageValue) {
      const ageNumber = Number(ageValue);
      const computedAge = computeAgeFromDob(dobValue);
      if (!Number.isFinite(ageNumber) || computedAge === null || Math.abs(computedAge - ageNumber) > 1) {
        return { valid: false, nativeValid, message: "Age does not match DOB." };
      }
    }

    if (!canUploadSelectedFiles) {
      return {
        valid: false,
        nativeValid,
        message: "Uploads are disabled. Configure NEXT_PUBLIC_ORCHESTRATOR_URL.",
      };
    }

    return { valid: true, nativeValid };
  }, [canUploadSelectedFiles]);

  const updateFormValidity = React.useCallback(() => {
    setIsFormValid(getClientValidation().valid);
  }, [getClientValidation]);

  useEffect(() => {
    updateFormValidity();
  }, [updateFormValidity]);

  useEffect(() => {
    updateFormValidity();
  }, [travelMode, updateFormValidity]);

  const handleFormChange = () => {
    if (preSubmitError) setPreSubmitError(null);
    updateFormValidity();
  };

  return (
    <form
      ref={formRef}
      action={formAction}
      onInput={handleFormChange}
      onChange={handleFormChange}
      onSubmit={(event) => {
        const { valid, nativeValid, message } = getClientValidation();
        if (!valid) {
          event.preventDefault();
          if (!nativeValid) formRef.current?.reportValidity();
          if (message) setPreSubmitError(message);
          return;
        }
        setPreSubmitError(null);
      }}
      className="new-registration-form space-y-8"
    >
      <input type="hidden" name="group_id" value="" />
      <div className="relative">
        <PageHeader
          title="New Registration"
          subtitle="Complete required details and save to continue. Photo is optional."
          actions={
            <button
              type="button"
              onClick={() => {
                fillTestData();
                updateFormValidity();
              }}
              className="btn-secondary text-xs font-semibold uppercase tracking-[0.2em]"
            >
              Fill Test Data
            </button>
          }
          className="new-registration-hero"
        />
        <div className="detail-thumbs">
          {renderUploadSlot("photo", "Photo", photoFile, photoPreview, "Add Photo (optional)")}
          <div className="flex min-w-[200px] flex-col gap-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-xs text-[color:var(--muted)] shadow-sm">
            <label className="flex items-center gap-2 text-xs font-semibold text-[color:var(--ink)]">
              <input
                type="checkbox"
                checked={showRequiredOnly}
                onChange={(event) => setShowRequiredOnly(event.target.checked)}
                className="h-4 w-4 rounded border-[color:var(--border)] bg-[color:var(--surface-muted)] text-[color:var(--accent)] focus:ring-[color:var(--accent)]"
              />
              <span>Show required fields only</span>
            </label>
            {hasHiddenErrors && (
              <span className="text-[11px] text-amber-600">
                Optional fields are hidden. Turn this off to review highlighted fields.
              </span>
            )}
          </div>
        </div>
      </div>

      {state?.error && (
        <div className="rounded-2xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          {state.error}
          {state.id && (
            <div className="mt-1 text-xs text-red-200">
              Registration ID: <span className="font-mono">{state.id}</span>
            </div>
          )}
        </div>
      )}
      {preSubmitError && (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
          {preSubmitError}
        </div>
      )}

      <div className="card p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field
            label="Registration ID"
            htmlFor="registration_id"
            helperText={state?.id ? "Read-only" : "Generated after save"}
          >
            <TextInput
              id="registration_id"
              value={state?.id ?? ""}
              placeholder="Will be generated after save"
              readOnly
              className="font-mono text-xs"
            />
          </Field>
        </div>
      </div>

      {!hasOrchestrator && (photoFile || formFile) && (
        <div className="text-xs text-amber-600">Set NEXT_PUBLIC_ORCHESTRATOR_URL to enable uploads.</div>
      )}
      {uploadingFiles && (
        <div className="flex items-center gap-2 text-xs text-[color:var(--muted)]">
          <ChakraSpinner className="h-3.5 w-3.5" title="Uploading" />
          <span>Uploading selected files...</span>
        </div>
      )}
      {uploadError && (
        <div className="text-xs text-rose-500">
          {uploadError}
          {state?.id && (
            <Link href={`/yatris/${state.id}`} className="ml-2 text-[color:var(--accent)]">
              Open record
            </Link>
          )}
        </div>
      )}

      <FormSection title="Applicant">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          <Field label="Name" htmlFor="name_hi" required error={fieldErrors?.name_hi}>
            <TextInput
              id="name_hi"
              name="name_hi"
              required
              placeholder="यात्री का नाम"
              error={hasFieldError("name_hi")}
            />
          </Field>
          <Field label="Father's Name" htmlFor="father_name_hi" required error={fieldErrors?.father_name_hi}>
            <TextInput
              id="father_name_hi"
              name="father_name_hi"
              required
              placeholder="पिता/अभिभावक"
              error={hasFieldError("father_name_hi")}
            />
          </Field>
          <Field
            label="Guardian Relation"
            htmlFor="guardian_relation"
            error={fieldErrors?.guardian_relation}
            className={showRequiredOnly ? "hidden" : undefined}
          >
            <Select
              id="guardian_relation"
              name="guardian_relation"
              defaultValue=""
              error={hasFieldError("guardian_relation")}
            >
              <option value="">Select</option>
              <option value="father">Father</option>
              <option value="husband">Husband</option>
              <option value="guardian">Guardian</option>
            </Select>
          </Field>
          <Field
            label="Address"
            htmlFor="address_hi"
            required
            error={fieldErrors?.address_hi}
            className="sm:col-span-2 xl:col-span-3 max-w-2xl"
          >
            <TextArea
              id="address_hi"
              name="address_hi"
              required
              rows={3}
              placeholder="पूरा पता"
              error={hasFieldError("address_hi")}
            />
          </Field>
          <div className="sm:col-span-2 xl:col-span-3 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Field label="State" htmlFor="address_state" required error={fieldErrors?.address_state}>
              <Select
                id="address_state"
                name="address_state"
                required
                value={addressState}
                onChange={(event) => {
                  setAddressState(event.target.value);
                  setAddressDistrict("");
                }}
                error={hasFieldError("address_state")}
              >
                <option value="">Select</option>
                {hasCustomState && <option value={addressState}>{addressState}</option>}
                {stateOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="District" htmlFor="address_district" required error={fieldErrors?.address_district}>
              <Select
                id="address_district"
                name="address_district"
                required
                value={addressDistrict}
                onChange={(event) => setAddressDistrict(event.target.value)}
                disabled={!addressState}
                error={hasFieldError("address_district")}
              >
                <option value="">Select</option>
                {hasCustomDistrict && <option value={addressDistrict}>{addressDistrict}</option>}
                {districtOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="City / Village" htmlFor="address_city" required error={fieldErrors?.address_city}>
              <TextInput
                id="address_city"
                name="address_city"
                required
                placeholder="City or village"
                error={hasFieldError("address_city")}
              />
            </Field>
            <Field
              label="PIN code"
              htmlFor="address_pin"
              className={showRequiredOnly ? "hidden" : undefined}
            >
              <TextInput
                id="address_pin"
                name="address_pin"
                placeholder="PIN code"
                inputMode="numeric"
              />
            </Field>
          </div>
          <Field label="Aadhaar Card Number" htmlFor="aadhaar_no" required error={fieldErrors?.aadhaar_no}>
            <TextInput
              id="aadhaar_no"
              name="aadhaar_no"
              required
              placeholder="12-digit Aadhaar"
              error={hasFieldError("aadhaar_no")}
            />
          </Field>
          <Field label="Mobile Number" htmlFor="phone" required error={fieldErrors?.phone}>
            <TextInput
              id="phone"
              name="phone"
              required
              placeholder="+91..."
              error={hasFieldError("phone")}
            />
          </Field>
          <Field label="WhatsApp Number" htmlFor="whatsapp" required error={fieldErrors?.whatsapp}>
            <TextInput
              id="whatsapp"
              name="whatsapp"
              required
              placeholder="+91..."
              error={hasFieldError("whatsapp")}
            />
          </Field>
          <Field label="Date of Birth" htmlFor="dob" required error={fieldErrors?.dob}>
            <TextInput
              id="dob"
              type="date"
              name="dob"
              required
              error={hasFieldError("dob")}
              onChange={(event) => {
                const computedAge = computeAgeFromDob(event.target.value);
                setInputValue("age_years", computedAge === null ? "" : String(computedAge));
              }}
            />
          </Field>
          <Field label="Age (years)" htmlFor="age_years" required error={fieldErrors?.age_years}>
            <TextInput
              id="age_years"
              type="number"
              name="age_years"
              min={0}
              max={120}
              required
              placeholder="e.g., 45"
              error={hasFieldError("age_years")}
            />
          </Field>
          <Field
            label="Height (cm)"
            htmlFor="height_cm"
            error={fieldErrors?.height_cm}
            className={showRequiredOnly ? "hidden" : undefined}
          >
            <TextInput
              id="height_cm"
              type="number"
              name="height_cm"
              step="0.1"
              placeholder="e.g., 168.5"
              error={hasFieldError("height_cm")}
            />
          </Field>
          <Field
            label="Weight (kg)"
            htmlFor="weight_kg"
            error={fieldErrors?.weight_kg}
            className={showRequiredOnly ? "hidden" : undefined}
          >
            <TextInput
              id="weight_kg"
              type="number"
              name="weight_kg"
              step="0.1"
              placeholder="e.g., 65.2"
              error={hasFieldError("weight_kg")}
            />
          </Field>
          <Field
            label="Yatri Bucket"
            htmlFor="category_id"
            className={showRequiredOnly ? "hidden" : undefined}
          >
            <Select id="category_id" name="category_id" defaultValue="">
              <option value="">Unassigned</option>
              {categoryOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </Select>
          </Field>
          {lookupError && <div className="col-span-full text-xs text-rose-500">{lookupError}</div>}
          {categoryError && <div className="col-span-full text-xs text-rose-500">{categoryError}</div>}
        </div>
      </FormSection>

      <FormSection title="Emergency / Companion Details" description="Required companion details and optional emergency contact.">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          <Field
            label="Companion Name"
            htmlFor="accompanying_name"
            required
            error={fieldErrors?.accompanying_name}
          >
            <TextInput
              id="accompanying_name"
              name="accompanying_name"
              required
              placeholder="Accompanying person"
              error={hasFieldError("accompanying_name")}
            />
          </Field>
          <Field
            label="Companion Father/Guardian"
            htmlFor="accompanying_guardian_name"
            required
            error={fieldErrors?.accompanying_guardian_name}
          >
            <TextInput
              id="accompanying_guardian_name"
              name="accompanying_guardian_name"
              required
              placeholder="Guardian name"
              error={hasFieldError("accompanying_guardian_name")}
            />
          </Field>
          <Field
            label="Companion Resident of"
            htmlFor="accompanying_resident_of"
            required
            error={fieldErrors?.accompanying_resident_of}
          >
            <TextInput
              id="accompanying_resident_of"
              name="accompanying_resident_of"
              required
              placeholder="City / Village"
              error={hasFieldError("accompanying_resident_of")}
            />
          </Field>
          <Field
            label="Companion Mobile"
            htmlFor="accompanying_phone"
            required
            error={fieldErrors?.accompanying_phone}
          >
            <TextInput
              id="accompanying_phone"
              name="accompanying_phone"
              required
              placeholder="+91..."
              inputMode="numeric"
              error={hasFieldError("accompanying_phone")}
            />
          </Field>
          <Field
            label="Emergency Contact Name"
            htmlFor="emergency_contact_name"
            className={showRequiredOnly ? "hidden" : undefined}
          >
            <TextInput id="emergency_contact_name" name="emergency_contact_name" />
          </Field>
          <Field
            label="Emergency Contact Father/Guardian"
            htmlFor="emergency_contact_father_name"
            className={showRequiredOnly ? "hidden" : undefined}
          >
            <TextInput
              id="emergency_contact_father_name"
              name="emergency_contact_father_name"
            />
          </Field>
          <Field
            label="Emergency Contact Age (years)"
            htmlFor="emergency_contact_age_years"
            error={fieldErrors?.emergency_contact_age_years}
            className={showRequiredOnly ? "hidden" : undefined}
          >
            <TextInput
              id="emergency_contact_age_years"
              type="number"
              name="emergency_contact_age_years"
              min={0}
              max={120}
              placeholder="Optional"
              error={hasFieldError("emergency_contact_age_years")}
            />
          </Field>
          <Field
            label="Emergency Contact Phone"
            htmlFor="emergency_contact_phone"
            className={showRequiredOnly ? "hidden" : undefined}
          >
            <TextInput
              id="emergency_contact_phone"
              name="emergency_contact_phone"
              placeholder="+91..."
            />
          </Field>
          <Field
            label="Emergency Contact Address"
            htmlFor="emergency_contact_address"
            className={showRequiredOnly ? "hidden" : "sm:col-span-2 xl:col-span-3"}
          >
            <TextArea
              id="emergency_contact_address"
              name="emergency_contact_address"
              rows={2}
              placeholder="Companion address"
            />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Travel Details">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Travel Mode" htmlFor="travel_mode" required error={fieldErrors?.travel_mode}>
            <Select
              id="travel_mode"
              name="travel_mode"
              value={travelMode}
              onChange={(event) => {
                const value = event.target.value;
                setTravelMode(value);
                if (value !== "train") {
                  setInputValue("train_class", "");
                }
              }}
              error={hasFieldError("travel_mode")}
              required
            >
              <option value="">Select</option>
              <option value="train">Train</option>
              <option value="air">Air</option>
            </Select>
          </Field>
          <Field
            label="Train Class"
            htmlFor="train_class"
            required={travelMode === "train"}
            error={fieldErrors?.train_class}
            className={travelMode === "train" ? undefined : "hidden"}
          >
            <Select
              id="train_class"
              name="train_class"
              error={hasFieldError("train_class")}
              disabled={travelMode !== "train"}
              required={travelMode === "train"}
            >
              <option value="">Select</option>
              {TRAIN_CLASS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Reservation By" htmlFor="reservation_by" required error={fieldErrors?.reservation_by}>
            <Select
              id="reservation_by"
              name="reservation_by"
              defaultValue=""
              error={hasFieldError("reservation_by")}
              required
            >
              <option value="">Select</option>
              <option value="self">Self</option>
              <option value="committee">Committee</option>
            </Select>
          </Field>
          <Field
            label="Group"
            htmlFor="group_id"
            helperText="Coming soon"
            className={showRequiredOnly ? "hidden" : undefined}
          >
            <Select id="group_id" name="group_id" disabled defaultValue="">
              <option value="">Unassigned</option>
            </Select>
          </Field>
        </div>
      </FormSection>

      <FormSection title="Medical" className={showRequiredOnly ? "hidden" : undefined}>
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <CheckboxRow
              name="health_none"
              label="No known conditions"
              checked={healthNone}
              onChange={(event) => setHealthNone(event.target.checked)}
              inputClassName="mt-0"
              className={hasFieldError("health_none") ? "rounded-xl border border-red-500/40 p-3" : undefined}
            />
            <CheckboxRow
              name="health_heart"
              label="Heart condition"
              checked={healthHeart}
              onChange={(event) => {
                setHealthHeart(event.target.checked);
                if (event.target.checked) setHealthNone(false);
              }}
              inputClassName="mt-0"
              disabled={healthNone}
            />
            <CheckboxRow
              name="health_bp"
              label="Blood Pressure"
              checked={healthBp}
              onChange={(event) => {
                setHealthBp(event.target.checked);
                if (event.target.checked) setHealthNone(false);
              }}
              inputClassName="mt-0"
              disabled={healthNone}
            />
            <CheckboxRow
              name="health_diabetes"
              label="Diabetes"
              checked={healthDiabetes}
              onChange={(event) => {
                setHealthDiabetes(event.target.checked);
                if (event.target.checked) setHealthNone(false);
              }}
              inputClassName="mt-0"
              disabled={healthNone}
            />
            <CheckboxRow
              name="health_asthma"
              label="Asthma"
              checked={healthAsthma}
              onChange={(event) => {
                setHealthAsthma(event.target.checked);
                if (event.target.checked) setHealthNone(false);
              }}
              inputClassName="mt-0"
              disabled={healthNone}
            />
          </div>
          {hasFieldError("health_none") && (
            <div className="text-xs text-red-400">
              {fieldErrors?.health_none ?? "Select a medical condition or 'No known conditions'."}
            </div>
          )}
          <Field label="Medicines / notes" htmlFor="health_common_meds">
            <TextArea
              id="health_common_meds"
              value={commonMedicalNotes}
              onChange={(event) => setCommonMedicalNotes(event.target.value)}
              disabled={!commonMedicalActive}
              placeholder="Medicines / notes for selected conditions"
              aria-label="Medicines / notes"
              rows={3}
              className="min-h-24"
            />
            <input
              type="hidden"
              name="health_common_meds"
              value={commonMedicalActive ? commonMedicalNotes : ""}
            />
            <input
              type="hidden"
              name="health_heart_meds"
              value={healthHeart ? commonMedicalNotes : ""}
            />
            <input
              type="hidden"
              name="health_bp_meds"
              value={healthBp ? commonMedicalNotes : ""}
            />
            <input
              type="hidden"
              name="health_diabetes_meds"
              value={healthDiabetes ? commonMedicalNotes : ""}
            />
            <input
              type="hidden"
              name="health_asthma_meds"
              value={healthAsthma ? commonMedicalNotes : ""}
            />
          </Field>
          <CheckboxRow
            label="Other condition"
            checked={otherActive}
            onChange={(event) => {
              setOtherActive(event.target.checked);
              if (event.target.checked) setHealthNone(false);
            }}
            className="gap-6 border-t border-[color:var(--border)] pt-4 sm:grid-cols-[minmax(0,220px)_minmax(0,1fr)]"
            inputClassName="mt-0"
            disabled={healthNone}
          >
            <input type="hidden" name="health_other" value={otherActive ? "Other condition" : ""} />
            <TextArea
              id="health_other_meds"
              name="health_other_meds"
              disabled={!otherActive || healthNone}
              placeholder="Other condition notes"
              aria-label="Other condition notes"
              rows={2}
              className="min-h-20"
            />
          </CheckboxRow>
        </div>
      </FormSection>

      <FormSection
        title="Medical Details"
        description="Optional medical notes and background."
        className={showRequiredOnly ? "hidden" : undefined}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Field label="Blood Group" htmlFor="blood_group">
            <Select id="blood_group" name="blood_group" defaultValue="">
              <option value="">Select</option>
              {BLOOD_GROUP_OPTIONS.map((group) => (
                <option key={group} value={group}>
                  {group}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Existing Conditions" htmlFor="medical_conditions" className="sm:col-span-2 xl:col-span-3">
            <TextArea
              id="medical_conditions"
              name="medical_conditions"
              rows={2}
              placeholder="Existing conditions"
            />
          </Field>
          <Field label="Allergies" htmlFor="medical_allergies" className="sm:col-span-2 xl:col-span-3">
            <TextArea
              id="medical_allergies"
              name="medical_allergies"
              rows={2}
              placeholder="Allergies"
            />
          </Field>
          <Field label="Medications" htmlFor="medical_medications" className="sm:col-span-2 xl:col-span-3">
            <TextArea
              id="medical_medications"
              name="medical_medications"
              rows={2}
              placeholder="Current medications"
            />
          </Field>
          <Field label="Emergency Notes" htmlFor="medical_emergency_notes" className="sm:col-span-2 xl:col-span-3">
            <TextArea
              id="medical_emergency_notes"
              name="medical_emergency_notes"
              rows={2}
              placeholder="Emergency notes"
            />
          </Field>
        </div>
      </FormSection>

      {showReceiptsSection && (
        <FormSection
          title="Receipts"
          description="Add one or more payment receipts."
          actions={
            <button
              type="button"
              onClick={addReceipt}
              disabled={isPending}
              className="btn-secondary text-xs font-semibold uppercase tracking-[0.2em]"
            >
              Add Receipt
            </button>
          }
        >
          {receipts.length === 0 ? (
            <div className="text-xs text-[color:var(--muted)]">No receipts added yet.</div>
          ) : (
            <div className="space-y-4">
              {receipts.map((receipt, index) => {
                const isActive = activeReceiptId === receipt.id;
                return (
                  <div
                    key={receipt.id}
                    className={[
                      "rounded-2xl border p-4",
                      isActive ? "border-[color:var(--accent)] shadow-sm" : "border-[color:var(--border)]",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
                        Receipt {index + 1}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => editReceipt(receipt.id)}
                          className="btn-secondary text-xs"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => removeReceipt(receipt.id)}
                          className="btn-secondary text-xs"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      <Field label="Receipt Number" htmlFor={`receipt-${receipt.id}-number`} required>
                        <TextInput
                          id={`receipt-${receipt.id}-number`}
                          name="receipt_number"
                          required
                          value={receipt.receipt_number}
                          onChange={(event) =>
                            updateReceipt(receipt.id, "receipt_number", event.target.value)
                          }
                        />
                      </Field>
                      <Field label="Amount" htmlFor={`receipt-${receipt.id}-amount`} required>
                        <TextInput
                          id={`receipt-${receipt.id}-amount`}
                          name="receipt_amount"
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step="0.01"
                          required
                          value={receipt.amount}
                          onChange={(event) => updateReceipt(receipt.id, "amount", event.target.value)}
                        />
                      </Field>
                      <Field label="Mode of Payment" htmlFor={`receipt-${receipt.id}-mode`} required>
                        <Select
                          id={`receipt-${receipt.id}-mode`}
                          name="receipt_mode"
                          required
                          value={receipt.payment_mode}
                          onChange={(event) =>
                            updateReceipt(receipt.id, "payment_mode", event.target.value)
                          }
                        >
                          <option value="">Select</option>
                          {RECEIPT_PAYMENT_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </Select>
                      </Field>
                      <Field label="Date" htmlFor={`receipt-${receipt.id}-date`} required>
                        <TextInput
                          id={`receipt-${receipt.id}-date`}
                          name="receipt_date"
                          type="date"
                          required
                          value={receipt.receipt_date}
                          onChange={(event) =>
                            updateReceipt(receipt.id, "receipt_date", event.target.value)
                          }
                        />
                      </Field>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {fieldErrors?.receipts && (
            <div className="text-xs text-rose-500">{fieldErrors.receipts}</div>
          )}
        </FormSection>
      )}

      <FormSection title="Additional Details" className={showRequiredOnly ? "hidden" : undefined}>
        <div className="grid gap-4 sm:grid-cols-2">
          <CheckboxRow
            name="attended_badarinath_2024"
            label="Part of last organized Badarinath Yatra"
          />
          <CheckboxRow name="sadhu_sant_category" label="Sadhu/Sant category" />
        </div>
      </FormSection>

      <FormSection title="Declaration">
        <div className="space-y-5 text-sm text-[color:var(--muted)]">
          <p className="text-[color:var(--ink)]">
            I declare that the information provided is correct and I agree to comply with the Yatra
            guidelines.
          </p>
          <Field
            label="Declaration acceptance"
            htmlFor="declaration_accepted"
            required
            error={fieldErrors?.declaration_accepted}
          >
            <label className="flex items-center gap-2 text-sm text-[color:var(--muted)]">
              <input
                id="declaration_accepted"
                type="checkbox"
                name="declaration_accepted"
                required
                className="h-4 w-4 rounded border-[color:var(--border)] bg-[color:var(--surface-muted)] text-[color:var(--accent)] focus:ring-[color:var(--accent)]"
              />
              <span className="text-[color:var(--accent)]">I accept the declaration</span>
            </label>
          </Field>
          <Field label="Signed at" htmlFor="declaration_signed_at" error={fieldErrors?.declaration_signed_at}>
            <div className="flex flex-wrap items-center gap-3">
              <TextInput
                id="declaration_signed_at"
                type="datetime-local"
                name="declaration_signed_at"
                error={hasFieldError("declaration_signed_at")}
                className="w-full sm:w-[240px]"
              />
              <button
                type="button"
                onClick={setSignedAtNow}
                className="rounded-xl border border-slate-700/60 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 hover:border-slate-500"
              >
                Now
              </button>
            </div>
          </Field>
        </div>
      </FormSection>

      {state?.id && state?.error && (
        <Link
          href={`/yatris/${state.id}`}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-700/60 px-3 py-2 text-sm text-slate-200"
        >
          Review saved record
        </Link>
      )}

      <div className="sticky bottom-4 z-10">
        <div className="card px-4 py-3 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <Link
              href="/yatris"
              className="btn-secondary w-full text-center sm:w-auto"
            >
              Cancel
            </Link>
            <div className="w-full sm:w-auto">
              <SubmitButton
                pending={isPending}
                disabled={!isFormValid}
                className="w-full sm:w-auto"
              />
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}

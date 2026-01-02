"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ActionState } from "./actions";
import {
  CheckboxRow,
  Field,
  FormSection,
  PageHeader,
  Select,
  TextArea,
  TextInput,
} from "@/components/ui";
import { getBrowserSupabase } from "@/lib/supabaseBrowser";
import { TRAIN_CLASS_OPTIONS } from "@/lib/trainClasses";

const initialState: ActionState = { error: null, id: null, fieldErrors: null };

const minimalFieldNames = new Set([
  "receipt_no",
  "name_hi",
  "guardian_relation",
  "father_name_hi",
  "address_hi",
  "phone",
  "whatsapp",
  "dob",
  "travel_mode",
  "train_class",
  "reservation_by",
  "declaration_accepted",
  "declaration_signed_at",
]);

const formatDateTimeLocal = (date: Date) => {
  const pad = (value: number) => String(value).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
};

function SubmitButton({ pending, className }: { pending: boolean; className?: string }) {
  return (
    <button
      type="submit"
      disabled={pending}
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
  const [healthHeart, setHealthHeart] = useState(false);
  const [healthBp, setHealthBp] = useState(false);
  const [healthDiabetes, setHealthDiabetes] = useState(false);
  const [healthAsthma, setHealthAsthma] = useState(false);
  const [commonMedicalNotes, setCommonMedicalNotes] = useState("");
  const [otherActive, setOtherActive] = useState(false);
  const [minimalMode, setMinimalMode] = useState(false);
  const [optionalOpen, setOptionalOpen] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [formFile, setFormFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [formPreview, setFormPreview] = useState<string | null>(null);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadAttempted, setUploadAttempted] = useState(false);

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
      event.target.value = "";
    };

  const renderUploadSlot = (
    kind: "photo" | "form",
    label: string,
    file: File | null,
    previewUrl: string | null
  ) => {
    const isDisabled = isPending || uploadingFiles || !hasOrchestrator;
    const placeholderText = uploadingFiles ? "Uploading" : file ? "Selected" : `Add ${label}`;
    const accept =
      kind === "photo" ? "image/jpeg,image/png,image/webp" : "image/jpeg,image/png,image/webp,application/pdf";

    return (
      <label className={`upload-thumb ${isDisabled ? "upload-thumb--disabled" : ""}`} title={label}>
        {previewUrl ? (
          <img src={previewUrl} alt={`${label} preview`} className="upload-thumb-image" />
        ) : (
          <div className="upload-thumb-placeholder" aria-label={`${label} placeholder`}>
            <svg viewBox="0 0 20 20" className="upload-thumb-plus" aria-hidden="true">
              <path
                d="M10 4v12M4 10h12"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
            <span>{placeholderText}</span>
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

  const fillSampleData = () => {
    const uniqueSuffix = String(Date.now()).slice(-9).padStart(9, "0");
    const uniquePhone = `9${uniqueSuffix}`;

    setInputValue("receipt_no", `REC-${uniqueSuffix.slice(-5)}`);
    setInputValue("name_hi", "मनिष दीपक");
    setInputValue("guardian_relation", "father");
    setInputValue("father_name_hi", "दीपक");
    setInputValue("address_hi", "राम लीला मैदान, दिल्ली");
    setInputValue("aadhaar_no", "1234 5678 9012");
    setInputValue("phone", uniquePhone);
    setInputValue("whatsapp", uniquePhone);
    setInputValue("dob", "1988-04-12");
    setInputValue("age_years", "36");
    setInputValue("height_cm", "168.5");
    setInputValue("weight_kg", "66.2");
    setInputValue("travel_mode", "train");
    setInputValue("train_class", "Sleeper Class (SL)");
    setInputValue("reservation_by", "self");
    setSignedAtNow();
    setCheckboxValue("declaration_accepted", true);
    setHealthHeart(true);
    setHealthDiabetes(true);
    setCommonMedicalNotes("Aspirin, Metformin");
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
  };

  useEffect(() => {
    if (!state?.id || state?.error || uploadAttempted) return;
    setUploadAttempted(true);
    if (!photoFile && !formFile) {
      router.push(`/yatris/${state.id}?created=1`);
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
        if (isActive) router.push(`/yatris/${state.id}?created=1`);
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

  const commonMedicalActive = healthHeart || healthBp || healthDiabetes || healthAsthma;

  useEffect(() => {
    if (!commonMedicalActive) setCommonMedicalNotes("");
  }, [commonMedicalActive]);

  useEffect(() => {
    if (!otherActive) {
      clearInput("health_other");
      clearInput("health_other_meds");
    }
  }, [otherActive]);

  useEffect(() => {
    if (!minimalMode) setOptionalOpen(false);
  }, [minimalMode]);

  const fieldErrors = state?.fieldErrors ?? undefined;
  const hasFieldError = (name: string) => Boolean(fieldErrors?.[name]);
  const hasOptionalErrors = Boolean(
    minimalMode &&
      fieldErrors &&
      Object.keys(fieldErrors).some((key) => !minimalFieldNames.has(key))
  );

  return (
    <form ref={formRef} action={formAction} className="new-registration-form space-y-8">
      <PageHeader
        title="New Registration"
        subtitle="Complete required details and save to continue."
        actions={
          <label className="flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-2 text-xs font-semibold text-[color:var(--muted)]">
            <input
              type="checkbox"
              checked={minimalMode}
              onChange={(event) => setMinimalMode(event.target.checked)}
              className="h-4 w-4 rounded border-slate-700/60 bg-slate-950/40 text-orange-400 focus:ring-orange-400"
            />
            Minimal mode
          </label>
        }
      />

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

      <FormSection title="Test helpers">
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={fillSampleData}
            disabled={isPending}
            className="rounded-xl border border-slate-700/60 px-3 py-2 text-sm text-slate-200 hover:border-slate-500 disabled:opacity-60"
          >
            Fill Sample Data
          </button>
        </div>
      </FormSection>

      <FormSection title="Uploads" description="Optional photo and form image uploads.">
        <div className="flex flex-wrap items-center gap-4">
          {renderUploadSlot("photo", "Photo", photoFile, photoPreview)}
          {renderUploadSlot("form", "Form", formFile, formPreview)}
        </div>
        {!hasOrchestrator && (
          <div className="text-xs text-amber-600">Set NEXT_PUBLIC_ORCHESTRATOR_URL to enable uploads.</div>
        )}
        {uploadingFiles && (
          <div className="text-xs text-[color:var(--muted)]">Uploading selected files...</div>
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
      </FormSection>

      <FormSection title="Applicant">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Receipt No." htmlFor="receipt_no" error={fieldErrors?.receipt_no}>
            <TextInput
              id="receipt_no"
              name="receipt_no"
              placeholder="Optional receipt"
              error={hasFieldError("receipt_no")}
            />
          </Field>
          <Field label="Name (Hindi allowed)" htmlFor="name_hi" required error={fieldErrors?.name_hi}>
            <TextInput
              id="name_hi"
              name="name_hi"
              required
              placeholder="यात्री का नाम"
              error={hasFieldError("name_hi")}
            />
          </Field>
          <Field label="Guardian Relation" htmlFor="guardian_relation" error={fieldErrors?.guardian_relation}>
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
            label="Father/Husband/Guardian Name"
            htmlFor="father_name_hi"
            error={fieldErrors?.father_name_hi}
          >
            <TextInput
              id="father_name_hi"
              name="father_name_hi"
              placeholder="पिता/अभिभावक"
              error={hasFieldError("father_name_hi")}
            />
          </Field>
          <Field label="Phone" htmlFor="phone" required error={fieldErrors?.phone}>
            <TextInput
              id="phone"
              name="phone"
              required
              placeholder="+91..."
              error={hasFieldError("phone")}
            />
          </Field>
          <Field label="WhatsApp" htmlFor="whatsapp" error={fieldErrors?.whatsapp}>
            <TextInput
              id="whatsapp"
              name="whatsapp"
              placeholder="+91..."
              error={hasFieldError("whatsapp")}
            />
          </Field>
          <Field label="Date of Birth" htmlFor="dob" error={fieldErrors?.dob}>
            <TextInput id="dob" type="date" name="dob" error={hasFieldError("dob")} />
          </Field>
          {!minimalMode && (
            <>
              <Field label="Aadhaar No." htmlFor="aadhaar_no" error={fieldErrors?.aadhaar_no}>
                <TextInput
                  id="aadhaar_no"
                  name="aadhaar_no"
                  placeholder="12-digit Aadhaar"
                  error={hasFieldError("aadhaar_no")}
                />
              </Field>
              <Field label="Age (years)" htmlFor="age_years" error={fieldErrors?.age_years}>
                <TextInput
                  id="age_years"
                  type="number"
                  name="age_years"
                  min={0}
                  max={120}
                  placeholder="e.g., 45"
                  error={hasFieldError("age_years")}
                />
              </Field>
              <Field label="Height (cm)" htmlFor="height_cm" error={fieldErrors?.height_cm}>
                <TextInput
                  id="height_cm"
                  type="number"
                  name="height_cm"
                  step="0.1"
                  placeholder="e.g., 168.5"
                  error={hasFieldError("height_cm")}
                />
              </Field>
              <Field label="Weight (kg)" htmlFor="weight_kg" error={fieldErrors?.weight_kg}>
                <TextInput
                  id="weight_kg"
                  type="number"
                  name="weight_kg"
                  step="0.1"
                  placeholder="e.g., 65.2"
                  error={hasFieldError("weight_kg")}
                />
              </Field>
            </>
          )}
          <Field
            label="Address"
            htmlFor="address_hi"
            required
            error={fieldErrors?.address_hi}
            className="col-span-full"
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
        </div>
      </FormSection>

      <FormSection title="Travel & Reservation">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Travel Mode" htmlFor="travel_mode" error={fieldErrors?.travel_mode}>
            <Select
              id="travel_mode"
              name="travel_mode"
              defaultValue="train"
              error={hasFieldError("travel_mode")}
            >
              <option value="train">Train</option>
              <option value="air">Air</option>
            </Select>
          </Field>
          <Field label="Train Class" htmlFor="train_class" error={fieldErrors?.train_class}>
            <Select id="train_class" name="train_class" error={hasFieldError("train_class")}>
              <option value="">Select</option>
              {TRAIN_CLASS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Reservation By" htmlFor="reservation_by" error={fieldErrors?.reservation_by}>
            <Select
              id="reservation_by"
              name="reservation_by"
              defaultValue=""
              error={hasFieldError("reservation_by")}
            >
              <option value="">Select</option>
              <option value="self">Self</option>
              <option value="committee">Committee</option>
            </Select>
          </Field>
        </div>
      </FormSection>

      {!minimalMode && (
        <FormSection title="Medical">
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
              <CheckboxRow
                name="health_heart"
                label="Heart condition"
                checked={healthHeart}
                onChange={(event) => setHealthHeart(event.target.checked)}
                inputClassName="mt-0"
              />
              <CheckboxRow
                name="health_bp"
                label="Blood Pressure"
                checked={healthBp}
                onChange={(event) => setHealthBp(event.target.checked)}
                inputClassName="mt-0"
              />
              <CheckboxRow
                name="health_diabetes"
                label="Diabetes"
                checked={healthDiabetes}
                onChange={(event) => setHealthDiabetes(event.target.checked)}
                inputClassName="mt-0"
              />
              <CheckboxRow
                name="health_asthma"
                label="Asthma"
                checked={healthAsthma}
                onChange={(event) => setHealthAsthma(event.target.checked)}
                inputClassName="mt-0"
              />
            </div>
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
              onChange={(event) => setOtherActive(event.target.checked)}
              className="gap-6 border-t border-[color:var(--border)] pt-4 sm:grid-cols-[minmax(0,220px)_minmax(0,1fr)]"
              inputClassName="mt-0"
            >
              <input type="hidden" name="health_other" value={otherActive ? "Other condition" : ""} />
              <TextArea
                id="health_other_meds"
                name="health_other_meds"
                disabled={!otherActive}
                placeholder="Other condition notes"
                aria-label="Other condition notes"
                rows={2}
                className="min-h-20"
              />
            </CheckboxRow>
          </div>
        </FormSection>
      )}

      {!minimalMode && (
        <FormSection title="Emergency / Companion">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Field label="Name" htmlFor="emergency_contact_name">
              <TextInput id="emergency_contact_name" name="emergency_contact_name" />
            </Field>
            <Field label="Father/Guardian" htmlFor="emergency_contact_father_name">
              <TextInput
                id="emergency_contact_father_name"
                name="emergency_contact_father_name"
              />
            </Field>
            <Field
              label="Age (years)"
              htmlFor="emergency_contact_age_years"
              error={fieldErrors?.emergency_contact_age_years}
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
            <Field label="Phone" htmlFor="emergency_contact_phone">
              <TextInput
                id="emergency_contact_phone"
                name="emergency_contact_phone"
                placeholder="+91..."
              />
            </Field>
            <Field
              label="Address"
              htmlFor="emergency_contact_address"
              className="sm:col-span-2"
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
      )}

      {!minimalMode && (
        <FormSection title="Additional Questions">
          <div className="grid gap-4 sm:grid-cols-2">
            <CheckboxRow name="attended_badarinath_2024" label="Attended Badarinath 2024" />
            <CheckboxRow name="sadhu_sant_category" label="Sadhu/Sant category" />
          </div>
        </FormSection>
      )}

      <FormSection title="Declaration">
        <div className="space-y-5 text-sm text-[color:var(--muted)]">
          <p className="text-[color:var(--ink)]">
            I declare that the information provided is correct and I agree to comply with the Yatra
            guidelines.
          </p>
          <Field label="Declaration acceptance" htmlFor="declaration_accepted" error={fieldErrors?.declaration_accepted}>
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

      {minimalMode && (
        <details
          className="rounded-2xl border border-[color:var(--border)] p-6"
          open={optionalOpen || hasOptionalErrors}
          onToggle={(event) => setOptionalOpen(event.currentTarget.open)}
        >
          <summary className="cursor-pointer text-sm font-semibold text-[color:var(--ink)]">
            Show more
          </summary>
          <div className="mt-6 space-y-8">
            <FormSection title="Applicant details">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Aadhaar No." htmlFor="aadhaar_no" error={fieldErrors?.aadhaar_no}>
                  <TextInput
                    id="aadhaar_no"
                    name="aadhaar_no"
                    placeholder="12-digit Aadhaar"
                    error={hasFieldError("aadhaar_no")}
                  />
                </Field>
                <Field label="Age (years)" htmlFor="age_years" error={fieldErrors?.age_years}>
                  <TextInput
                    id="age_years"
                    type="number"
                    name="age_years"
                    min={0}
                    max={120}
                    placeholder="e.g., 45"
                    error={hasFieldError("age_years")}
                  />
                </Field>
                <Field label="Height (cm)" htmlFor="height_cm" error={fieldErrors?.height_cm}>
                  <TextInput
                    id="height_cm"
                    type="number"
                    name="height_cm"
                    step="0.1"
                    placeholder="e.g., 168.5"
                    error={hasFieldError("height_cm")}
                  />
                </Field>
                <Field label="Weight (kg)" htmlFor="weight_kg" error={fieldErrors?.weight_kg}>
                  <TextInput
                    id="weight_kg"
                    type="number"
                    name="weight_kg"
                    step="0.1"
                    placeholder="e.g., 65.2"
                    error={hasFieldError("weight_kg")}
                  />
                </Field>
              </div>
            </FormSection>

            <FormSection title="Medical">
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
                  <CheckboxRow
                    name="health_heart"
                    label="Heart condition"
                    checked={healthHeart}
                    onChange={(event) => setHealthHeart(event.target.checked)}
                    inputClassName="mt-0"
                  />
                  <CheckboxRow
                    name="health_bp"
                    label="Blood Pressure"
                    checked={healthBp}
                    onChange={(event) => setHealthBp(event.target.checked)}
                    inputClassName="mt-0"
                  />
                  <CheckboxRow
                    name="health_diabetes"
                    label="Diabetes"
                    checked={healthDiabetes}
                    onChange={(event) => setHealthDiabetes(event.target.checked)}
                    inputClassName="mt-0"
                  />
                  <CheckboxRow
                    name="health_asthma"
                    label="Asthma"
                    checked={healthAsthma}
                    onChange={(event) => setHealthAsthma(event.target.checked)}
                    inputClassName="mt-0"
                  />
                </div>
                <Field label="Medicines / notes" htmlFor="health_common_meds_optional">
                  <TextArea
                    id="health_common_meds_optional"
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
                  onChange={(event) => setOtherActive(event.target.checked)}
                  className="gap-6 border-t border-[color:var(--border)] pt-4 sm:grid-cols-[minmax(0,220px)_minmax(0,1fr)]"
                  inputClassName="mt-0"
                >
                  <input type="hidden" name="health_other" value={otherActive ? "Other condition" : ""} />
                  <TextArea
                    id="health_other_meds"
                    name="health_other_meds"
                    disabled={!otherActive}
                    placeholder="Other condition notes"
                    aria-label="Other condition notes"
                    rows={2}
                    className="min-h-20"
                  />
                </CheckboxRow>
              </div>
            </FormSection>

            <FormSection title="Emergency / Companion">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <Field label="Name" htmlFor="emergency_contact_name">
                  <TextInput id="emergency_contact_name" name="emergency_contact_name" />
                </Field>
                <Field label="Father/Guardian" htmlFor="emergency_contact_father_name">
                  <TextInput
                    id="emergency_contact_father_name"
                    name="emergency_contact_father_name"
                  />
                </Field>
                <Field
                  label="Age (years)"
                  htmlFor="emergency_contact_age_years"
                  error={fieldErrors?.emergency_contact_age_years}
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
                <Field label="Phone" htmlFor="emergency_contact_phone">
                  <TextInput
                    id="emergency_contact_phone"
                    name="emergency_contact_phone"
                    placeholder="+91..."
                  />
                </Field>
                <Field
                  label="Address"
                  htmlFor="emergency_contact_address"
                  className="sm:col-span-2"
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

            <FormSection title="Additional Questions">
              <div className="grid gap-4 sm:grid-cols-2">
                <CheckboxRow name="attended_badarinath_2024" label="Attended Badarinath 2024" />
                <CheckboxRow name="sadhu_sant_category" label="Sadhu/Sant category" />
              </div>
            </FormSection>
          </div>
        </details>
      )}

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
              <SubmitButton pending={isPending} className="w-full sm:w-auto" />
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}

"use client";

import { updateRegistrationAction } from "./actions";
import { useEffect, useMemo, useRef, useState } from "react";
import { CheckboxRow, Field, FormSection, Select, TextArea, TextInput } from "@/components/ui";
import { TRAIN_CLASS_OPTIONS, normalizeTrainClass } from "@/lib/trainClasses";
import { getBrowserSupabase } from "@/lib/supabaseBrowser";
import { listDistricts, listStates, type AddressOption } from "@/lib/addressLookup";

type Registration = {
  id: string;
  receipt_no?: string | null;
  name_hi?: string | null;
  guardian_relation?: string | null;
  father_name_hi?: string | null;
  address_hi?: string | null;
  address_state?: string | null;
  address_district?: string | null;
  address_city?: string | null;
  address_pin?: string | null;
  aadhaar_no?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  dob?: string | null;
  age_years?: number | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  travel_mode?: string | null;
  train_class?: string | null;
  reservation_by?: string | null;
  category_id?: string | null;
  health_none?: boolean | null;
  health_heart?: boolean | null;
  health_heart_meds?: string | null;
  health_bp?: boolean | null;
  health_bp_meds?: string | null;
  health_diabetes?: boolean | null;
  health_diabetes_meds?: string | null;
  health_asthma?: boolean | null;
  health_asthma_meds?: string | null;
  health_common_meds?: string | null;
  health_other?: string | null;
  health_other_meds?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_father_name?: string | null;
  emergency_contact_age_years?: number | null;
  emergency_contact_address?: string | null;
  emergency_contact_phone?: string | null;
  accompanying_name?: string | null;
  accompanying_guardian_name?: string | null;
  accompanying_resident_of?: string | null;
  accompanying_phone?: string | null;
  attended_badarinath_2024?: boolean | null;
  sadhu_sant_category?: boolean | null;
  declaration_accepted?: boolean | null;
  declaration_signed_at?: string | null;
};

const formatDate = (value?: string | null) => {
  if (!value) return "";
  return value.split("T")[0] || value;
};

const formatDateTimeLocal = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (num: number) => String(num).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
};

const buildCommonMedicalNotes = (registration: Registration) => {
  if (registration.health_common_meds) return registration.health_common_meds;
  const parts = [
    registration.health_heart_meds,
    registration.health_bp_meds,
    registration.health_diabetes_meds,
    registration.health_asthma_meds,
  ]
    .map((value) => value?.trim())
    .filter(Boolean) as string[];

  return parts.join(", ");
};

export function QuickEditForm({
  registration,
  formId = "quick-edit-form",
}: {
  registration: Registration;
  formId?: string;
}) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const supabase = useMemo(() => getBrowserSupabase(), []);
  const [travelMode, setTravelMode] = useState(registration.travel_mode ?? "");
  const [healthNone, setHealthNone] = useState(Boolean(registration.health_none));
  const [healthHeart, setHealthHeart] = useState(Boolean(registration.health_heart));
  const [healthBp, setHealthBp] = useState(Boolean(registration.health_bp));
  const [healthDiabetes, setHealthDiabetes] = useState(Boolean(registration.health_diabetes));
  const [healthAsthma, setHealthAsthma] = useState(Boolean(registration.health_asthma));
  const [commonMedicalNotes, setCommonMedicalNotes] = useState(() => buildCommonMedicalNotes(registration));
  const [otherActive, setOtherActive] = useState(
    Boolean(registration.health_other) || Boolean(registration.health_other_meds)
  );
  const [stateOptions, setStateOptions] = useState<AddressOption[]>([]);
  const [districtOptions, setDistrictOptions] = useState<AddressOption[]>([]);
  const [addressState, setAddressState] = useState(registration.address_state ?? "");
  const [addressDistrict, setAddressDistrict] = useState(registration.address_district ?? "");
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [categoryOptions, setCategoryOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const commonMedicalActive = !healthNone && (healthHeart || healthBp || healthDiabetes || healthAsthma);
  const otherLabel = registration.health_other || "Other condition";
  const trainClassValue = normalizeTrainClass(registration.train_class);
  const hasCustomTrainClass = Boolean(
    trainClassValue && !TRAIN_CLASS_OPTIONS.some((option) => option === trainClassValue)
  );
  const hasCustomState = Boolean(addressState && !stateOptions.some((option) => option.id === addressState));
  const hasCustomDistrict = Boolean(
    addressDistrict && !districtOptions.some((option) => option.id === addressDistrict)
  );

  const clearInput = (name: string) => {
    const el = formRef.current?.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | null;
    if (el) el.value = "";
  };

  const setInputValue = (name: string, value: string) => {
    const el = formRef.current?.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | null;
    if (el) el.value = value;
  };

  useEffect(() => {
    if (!commonMedicalActive) setCommonMedicalNotes("");
  }, [commonMedicalActive]);

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

  return (
    <form ref={formRef} id={formId} action={updateRegistrationAction} className="yatri-detail-form space-y-6">
      <input type="hidden" name="id" value={registration.id} />

      <FormSection title="Applicant" description="Primary identification and contact details.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Receipt No." htmlFor="receipt_no">
            <TextInput name="receipt_no" defaultValue={registration.receipt_no ?? ""} />
          </Field>
          <Field label="Name (Hindi OK)" htmlFor="name_hi" required>
            <TextInput name="name_hi" required defaultValue={registration.name_hi ?? ""} />
          </Field>
          <Field label="Guardian Relation" htmlFor="guardian_relation">
            <Select name="guardian_relation" defaultValue={registration.guardian_relation ?? ""}>
              <option value="">Select</option>
              <option value="father">Father</option>
              <option value="husband">Husband</option>
              <option value="guardian">Guardian</option>
            </Select>
          </Field>
          <Field label="Father/Husband/Guardian Name" htmlFor="father_name_hi" required>
            <TextInput name="father_name_hi" required defaultValue={registration.father_name_hi ?? ""} />
          </Field>
          <Field label="Aadhaar" htmlFor="aadhaar_no" required>
            <TextInput name="aadhaar_no" required defaultValue={registration.aadhaar_no ?? ""} />
          </Field>
          <Field label="Phone" htmlFor="phone" required>
            <TextInput name="phone" required defaultValue={registration.phone ?? ""} />
          </Field>
          <Field label="WhatsApp" htmlFor="whatsapp" required>
            <TextInput name="whatsapp" required defaultValue={registration.whatsapp ?? ""} />
          </Field>
          <Field label="Date of Birth" htmlFor="dob" required>
            <TextInput type="date" name="dob" required defaultValue={formatDate(registration.dob)} />
          </Field>
          <Field label="Age (years)" htmlFor="age_years" required>
            <TextInput
              type="number"
              name="age_years"
              min={0}
              max={120}
              required
              defaultValue={registration.age_years ?? ""}
            />
          </Field>
          <Field label="Yatri Bucket" htmlFor="category_id">
            <Select name="category_id" defaultValue={registration.category_id ?? ""}>
              <option value="">Unassigned</option>
              {categoryOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Height (cm)" htmlFor="height_cm">
            <TextInput
              type="number"
              name="height_cm"
              step="0.1"
              defaultValue={registration.height_cm ?? ""}
            />
          </Field>
          <Field label="Weight (kg)" htmlFor="weight_kg">
            <TextInput
              type="number"
              name="weight_kg"
              step="0.1"
              defaultValue={registration.weight_kg ?? ""}
            />
          </Field>
          <Field label="Address" htmlFor="address_hi" required className="col-span-full">
            <TextArea name="address_hi" required defaultValue={registration.address_hi ?? ""} rows={3} />
          </Field>
          <div className="col-span-full grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="State" htmlFor="address_state">
              <Select
                name="address_state"
                value={addressState}
                onChange={(event) => {
                  setAddressState(event.target.value);
                  setAddressDistrict("");
                }}
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
            <Field label="District" htmlFor="address_district">
              <Select
                name="address_district"
                value={addressDistrict}
                onChange={(event) => setAddressDistrict(event.target.value)}
                disabled={!addressState}
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
            <Field label="City / Village" htmlFor="address_city">
              <TextInput
                name="address_city"
                defaultValue={registration.address_city ?? ""}
                placeholder="City or village"
              />
            </Field>
            <Field label="PIN code" htmlFor="address_pin">
              <TextInput
                name="address_pin"
                defaultValue={registration.address_pin ?? ""}
                placeholder="PIN code"
                inputMode="numeric"
              />
            </Field>
          </div>
          {lookupError && <div className="col-span-full text-xs text-rose-500">{lookupError}</div>}
          {categoryError && <div className="col-span-full text-xs text-rose-500">{categoryError}</div>}
        </div>
      </FormSection>

      <FormSection title="Travel & Reservation" description="Primary travel plan and reservation details.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Travel Mode" htmlFor="travel_mode" required>
            <Select
              name="travel_mode"
              value={travelMode}
              onChange={(event) => {
                const value = event.target.value;
                setTravelMode(value);
                if (value === "air") {
                  setInputValue("train_class", "");
                }
              }}
              required
            >
              <option value="">Select</option>
              <option value="train">Train</option>
              <option value="air">Air</option>
            </Select>
          </Field>
          <Field label="Train Class" htmlFor="train_class" required={travelMode === "train"}>
            <Select name="train_class" defaultValue={trainClassValue} required={travelMode === "train"} disabled={travelMode === "air"}>
              <option value="">Select</option>
              {hasCustomTrainClass && <option value={trainClassValue}>{trainClassValue}</option>}
              {TRAIN_CLASS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Reservation By" htmlFor="reservation_by" required>
            <Select name="reservation_by" defaultValue={registration.reservation_by ?? ""} required>
              <option value="">Select</option>
              <option value="self">Self</option>
              <option value="committee">Committee</option>
            </Select>
          </Field>
        </div>
      </FormSection>

      <FormSection title="Accompanying Person" description="Mandatory companion details.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="accompanying_name" required>
            <TextInput
              name="accompanying_name"
              required
              defaultValue={registration.accompanying_name ?? ""}
            />
          </Field>
          <Field label="Father/Husband Name" htmlFor="accompanying_guardian_name" required>
            <TextInput
              name="accompanying_guardian_name"
              required
              defaultValue={registration.accompanying_guardian_name ?? ""}
            />
          </Field>
          <Field label="Resident of" htmlFor="accompanying_resident_of" required>
            <TextInput
              name="accompanying_resident_of"
              required
              defaultValue={registration.accompanying_resident_of ?? ""}
            />
          </Field>
          <Field label="Mobile" htmlFor="accompanying_phone" required>
            <TextInput
              name="accompanying_phone"
              required
              defaultValue={registration.accompanying_phone ?? ""}
            />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Medical" description="Conditions and medicine notes.">
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <CheckboxRow
              name="health_none"
              label="No known conditions"
              checked={healthNone}
              onChange={(event) => setHealthNone(event.target.checked)}
              inputClassName="mt-0"
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
            <input type="hidden" name="health_other" value={otherActive ? otherLabel : ""} />
            <TextArea
              id="health_other_meds"
              name="health_other_meds"
              disabled={!otherActive || healthNone}
              defaultValue={registration.health_other_meds ?? ""}
              placeholder="Other condition notes"
              aria-label="Other condition notes"
              rows={2}
              className="min-h-20"
            />
          </CheckboxRow>
        </div>
      </FormSection>

      <FormSection title="Emergency / Companion" description="Optional companion or emergency contact details.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Emergency Contact" htmlFor="emergency_contact_name">
            <TextInput name="emergency_contact_name" defaultValue={registration.emergency_contact_name ?? ""} />
          </Field>
          <Field label="Emergency Father/Guardian" htmlFor="emergency_contact_father_name">
            <TextInput
              name="emergency_contact_father_name"
              defaultValue={registration.emergency_contact_father_name ?? ""}
            />
          </Field>
          <Field label="Emergency Age (years)" htmlFor="emergency_contact_age_years">
            <TextInput
              type="number"
              name="emergency_contact_age_years"
              min={0}
              max={120}
              defaultValue={registration.emergency_contact_age_years ?? ""}
            />
          </Field>
          <Field label="Emergency Phone" htmlFor="emergency_contact_phone">
            <TextInput
              name="emergency_contact_phone"
              defaultValue={registration.emergency_contact_phone ?? ""}
            />
          </Field>
          <Field label="Emergency Address" htmlFor="emergency_contact_address" className="sm:col-span-2">
            <TextArea
              name="emergency_contact_address"
              defaultValue={registration.emergency_contact_address ?? ""}
              rows={2}
            />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Additional Questions" description="Optional bucket and attendance flags.">
        <div className="grid gap-4 sm:grid-cols-2">
          <CheckboxRow
            name="attended_badarinath_2024"
            label="Part of last organized Badarinath Yatra"
            defaultChecked={registration.attended_badarinath_2024 ?? false}
          />
          <CheckboxRow
            name="sadhu_sant_category"
            label="Sadhu/Sant category"
            defaultChecked={registration.sadhu_sant_category ?? false}
          />
        </div>
      </FormSection>

      <FormSection title="Declaration">
        <div className="space-y-5 text-sm text-[color:var(--muted)]">
          <p className="text-[color:var(--ink)]">
            I declare that the information provided is correct and I agree to comply with the Yatra
            guidelines.
          </p>
          <Field label="Declaration acceptance" htmlFor="declaration_accepted">
            <label className="flex items-center gap-2 text-sm text-[color:var(--muted)]">
              <input
                id="declaration_accepted"
                type="checkbox"
                name="declaration_accepted"
                required
                defaultChecked={registration.declaration_accepted ?? false}
                className="h-4 w-4 rounded border-[color:var(--border)] bg-[color:var(--surface-muted)] text-[color:var(--accent)] focus:ring-[color:var(--accent)]"
              />
              <span className="text-[color:var(--accent)]">I accept the declaration</span>
            </label>
          </Field>
          <Field label="Signed at" htmlFor="declaration_signed_at">
            <div className="flex flex-wrap items-center gap-3">
              <TextInput
                id="declaration_signed_at"
                type="datetime-local"
                name="declaration_signed_at"
                defaultValue={formatDateTimeLocal(registration.declaration_signed_at)}
                className="w-full sm:w-[240px]"
              />
              <button
                type="button"
                onClick={() => setInputValue("declaration_signed_at", formatDateTimeLocal(new Date().toISOString()))}
                className="rounded-xl border border-[color:var(--border)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)] hover:border-[color:var(--accent)]"
              >
                Now
              </button>
            </div>
          </Field>
        </div>
      </FormSection>
    </form>
  );
}

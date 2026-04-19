
commit;


-- =====================================================================
-- Migration: supabase/migrations/20260112_registration_receipts_medical_group.sql
-- =====================================================================

begin;

alter table public.yatra_registrations
  add column if not exists blood_group text,
  add column if not exists medical_conditions text,
  add column if not exists medical_allergies text,
  add column if not exists medical_medications text,
  add column if not exists medical_emergency_notes text,
  add column if not exists receipts jsonb,
  add column if not exists group_id uuid references public.yatra_co_travel_groups(id) on delete set null;

alter table public.yatra_registrations
  drop constraint if exists yatra_registrations_receipts_array_check,
  add constraint yatra_registrations_receipts_array_check
    check (receipts is null or jsonb_typeof(receipts) = 'array');

create or replace function public.fn_update_registration(
  p_id uuid,
  p_patch jsonb
) returns void
language plpgsql
as $$
begin
  update public.yatra_registrations r
  set
    receipt_no = coalesce((p_patch->>'receipt_no'), r.receipt_no),
    name_hi = coalesce((p_patch->>'name_hi'), r.name_hi),
    guardian_relation = coalesce((p_patch->>'guardian_relation'), r.guardian_relation),
    father_name_hi = coalesce((p_patch->>'father_name_hi'), r.father_name_hi),
    address_hi = coalesce((p_patch->>'address_hi'), r.address_hi),
    address_state = coalesce((p_patch->>'address_state'), r.address_state),
    address_district = coalesce((p_patch->>'address_district'), r.address_district),
    address_city = coalesce((p_patch->>'address_city'), r.address_city),
    address_pin = coalesce((p_patch->>'address_pin'), r.address_pin),
    aadhaar_no = coalesce((p_patch->>'aadhaar_no'), r.aadhaar_no),
    dob = coalesce((p_patch->>'dob')::date, r.dob),
    age_years = coalesce((p_patch->>'age_years')::smallint, r.age_years),
    height_cm = coalesce((p_patch->>'height_cm')::numeric, r.height_cm),
    weight_kg = coalesce((p_patch->>'weight_kg')::numeric, r.weight_kg),
    phone = coalesce((p_patch->>'phone'), r.phone),
    whatsapp = coalesce((p_patch->>'whatsapp'), r.whatsapp),
    travel_mode = coalesce((p_patch->>'travel_mode')::travel_mode, r.travel_mode),
    train_class = case
      when coalesce((p_patch->>'travel_mode')::travel_mode, r.travel_mode) = 'air' then null
      else coalesce((p_patch->>'train_class'), r.train_class)
    end,
    reservation_by = coalesce((p_patch->>'reservation_by')::reservation_by, r.reservation_by),
    health_none = coalesce((p_patch->>'health_none')::boolean, r.health_none),
    health_bp = case
      when coalesce((p_patch->>'health_none')::boolean, r.health_none) then false
      else coalesce((p_patch->>'health_bp')::boolean, r.health_bp)
    end,
    health_bp_meds = case
      when coalesce((p_patch->>'health_none')::boolean, r.health_none) then null
      when coalesce((p_patch->>'health_bp')::boolean, r.health_bp) then coalesce((p_patch->>'health_bp_meds'), r.health_bp_meds)
      else null
    end,
    health_diabetes = case
      when coalesce((p_patch->>'health_none')::boolean, r.health_none) then false
      else coalesce((p_patch->>'health_diabetes')::boolean, r.health_diabetes)
    end,
    health_diabetes_meds = case
      when coalesce((p_patch->>'health_none')::boolean, r.health_none) then null
      when coalesce((p_patch->>'health_diabetes')::boolean, r.health_diabetes) then coalesce((p_patch->>'health_diabetes_meds'), r.health_diabetes_meds)
      else null
    end,
    health_heart = case
      when coalesce((p_patch->>'health_none')::boolean, r.health_none) then false
      else coalesce((p_patch->>'health_heart')::boolean, r.health_heart)
    end,
    health_heart_meds = case
      when coalesce((p_patch->>'health_none')::boolean, r.health_none) then null
      when coalesce((p_patch->>'health_heart')::boolean, r.health_heart) then coalesce((p_patch->>'health_heart_meds'), r.health_heart_meds)
      else null
    end,
    health_asthma = case
      when coalesce((p_patch->>'health_none')::boolean, r.health_none) then false
      else coalesce((p_patch->>'health_asthma')::boolean, r.health_asthma)
    end,
    health_asthma_meds = case
      when coalesce((p_patch->>'health_none')::boolean, r.health_none) then null
      when coalesce((p_patch->>'health_asthma')::boolean, r.health_asthma) then coalesce((p_patch->>'health_asthma_meds'), r.health_asthma_meds)
      else null
    end,
    health_common_meds = case
      when coalesce((p_patch->>'health_none')::boolean, r.health_none) then null
      when p_patch ? 'health_common_meds' then nullif((p_patch->>'health_common_meds'), '')
      when (
        p_patch ? 'health_heart'
        or p_patch ? 'health_bp'
        or p_patch ? 'health_diabetes'
        or p_patch ? 'health_asthma'
        or p_patch ? 'health_heart_meds'
        or p_patch ? 'health_bp_meds'
        or p_patch ? 'health_diabetes_meds'
        or p_patch ? 'health_asthma_meds'
      )
      then nullif(
        trim(both ', ' from concat_ws(
          ', ',
          case
            when coalesce((p_patch->>'health_heart')::boolean, r.health_heart)
              then coalesce((p_patch->>'health_heart_meds'), r.health_heart_meds)
            else null
          end,
          case
            when coalesce((p_patch->>'health_bp')::boolean, r.health_bp)
              then coalesce((p_patch->>'health_bp_meds'), r.health_bp_meds)
            else null
          end,
          case
            when coalesce((p_patch->>'health_diabetes')::boolean, r.health_diabetes)
              then coalesce((p_patch->>'health_diabetes_meds'), r.health_diabetes_meds)
            else null
          end,
          case
            when coalesce((p_patch->>'health_asthma')::boolean, r.health_asthma)
              then coalesce((p_patch->>'health_asthma_meds'), r.health_asthma_meds)
            else null
          end
        )),
        ''
      )
      else r.health_common_meds
    end,
    health_other = case
      when coalesce((p_patch->>'health_none')::boolean, r.health_none) then null
      else coalesce((p_patch->>'health_other'), r.health_other)
    end,
    health_other_meds = case
      when coalesce((p_patch->>'health_none')::boolean, r.health_none) then null
      when coalesce(nullif((p_patch->>'health_other'), ''), r.health_other) is null then null
      else coalesce((p_patch->>'health_other_meds'), r.health_other_meds)
    end,
    emergency_contact_name = coalesce((p_patch->>'emergency_contact_name'), r.emergency_contact_name),
    emergency_contact_father_name = coalesce((p_patch->>'emergency_contact_father_name'), r.emergency_contact_father_name),
    emergency_contact_age_years = coalesce((p_patch->>'emergency_contact_age_years')::smallint, r.emergency_contact_age_years),
    emergency_contact_address = coalesce((p_patch->>'emergency_contact_address'), r.emergency_contact_address),
    emergency_contact_phone = coalesce((p_patch->>'emergency_contact_phone'), r.emergency_contact_phone),
    photo_url = coalesce((p_patch->>'photo_url'), r.photo_url),
    form_image_url = coalesce((p_patch->>'form_image_url'), r.form_image_url),
    attended_badarinath_2024 = coalesce((p_patch->>'attended_badarinath_2024')::boolean, r.attended_badarinath_2024),
    sadhu_sant_category = coalesce((p_patch->>'sadhu_sant_category')::boolean, r.sadhu_sant_category),
    declaration_accepted = coalesce((p_patch->>'declaration_accepted')::boolean, r.declaration_accepted),
    declaration_signed_at = case
      when p_patch ? 'declaration_signed_at' then (p_patch->>'declaration_signed_at')::timestamptz
      when coalesce((p_patch->>'declaration_accepted')::boolean, r.declaration_accepted) = false then null
      when coalesce((p_patch->>'declaration_accepted')::boolean, r.declaration_accepted) = true
        and r.declaration_signed_at is null then now()
      else r.declaration_signed_at
    end,
    status = coalesce((p_patch->>'status')::reg_status, r.status),
    ocr_confidence = coalesce((p_patch->>'ocr_confidence')::numeric, r.ocr_confidence),
    raw_json = case
      when p_patch ? 'raw_json' then coalesce((p_patch->'raw_json')::jsonb, r.raw_json)
      else r.raw_json
    end,
    accompanying_name = coalesce((p_patch->>'accompanying_name'), r.accompanying_name),
    accompanying_guardian_name = coalesce((p_patch->>'accompanying_guardian_name'), r.accompanying_guardian_name),
    accompanying_resident_of = coalesce((p_patch->>'accompanying_resident_of'), r.accompanying_resident_of),
    accompanying_phone = coalesce((p_patch->>'accompanying_phone'), r.accompanying_phone),
    category_id = coalesce((p_patch->>'category_id')::uuid, r.category_id),
    group_id = coalesce((p_patch->>'group_id')::uuid, r.group_id),
    blood_group = coalesce((p_patch->>'blood_group'), r.blood_group),
    medical_conditions = coalesce((p_patch->>'medical_conditions'), r.medical_conditions),
    medical_allergies = coalesce((p_patch->>'medical_allergies'), r.medical_allergies),
    medical_medications = coalesce((p_patch->>'medical_medications'), r.medical_medications),
    medical_emergency_notes = coalesce((p_patch->>'medical_emergency_notes'), r.medical_emergency_notes),
    receipts = case
      when p_patch ? 'receipts' then nullif((p_patch->'receipts')::jsonb, 'null'::jsonb)
      else r.receipts
    end
  where r.id = p_id;

  if p_patch ? 'status' then
    perform public.fn_assert_registration_ready(p_id, (p_patch->>'status')::reg_status);

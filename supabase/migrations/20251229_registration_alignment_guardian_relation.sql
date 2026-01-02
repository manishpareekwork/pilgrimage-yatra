begin;

alter table public.yatra_registrations
  add column if not exists guardian_relation text;

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
    aadhaar_no = coalesce((p_patch->>'aadhaar_no'), r.aadhaar_no),
    dob = coalesce((p_patch->>'dob')::date, r.dob),
    age_years = coalesce((p_patch->>'age_years')::smallint, r.age_years),
    height_cm = coalesce((p_patch->>'height_cm')::numeric, r.height_cm),
    weight_kg = coalesce((p_patch->>'weight_kg')::numeric, r.weight_kg),
    phone = coalesce((p_patch->>'phone'), r.phone),
    whatsapp = coalesce((p_patch->>'whatsapp'), r.whatsapp),
    travel_mode = coalesce((p_patch->>'travel_mode')::travel_mode, r.travel_mode),
    train_class = coalesce((p_patch->>'train_class'), r.train_class),
    reservation_by = coalesce((p_patch->>'reservation_by')::reservation_by, r.reservation_by),
    health_bp = coalesce((p_patch->>'health_bp')::boolean, r.health_bp),
    health_bp_meds = case
      when coalesce((p_patch->>'health_bp')::boolean, r.health_bp) then coalesce((p_patch->>'health_bp_meds'), r.health_bp_meds)
      else null
    end,
    health_diabetes = coalesce((p_patch->>'health_diabetes')::boolean, r.health_diabetes),
    health_diabetes_meds = case
      when coalesce((p_patch->>'health_diabetes')::boolean, r.health_diabetes) then coalesce((p_patch->>'health_diabetes_meds'), r.health_diabetes_meds)
      else null
    end,
    health_heart = coalesce((p_patch->>'health_heart')::boolean, r.health_heart),
    health_heart_meds = case
      when coalesce((p_patch->>'health_heart')::boolean, r.health_heart) then coalesce((p_patch->>'health_heart_meds'), r.health_heart_meds)
      else null
    end,
    health_asthma = coalesce((p_patch->>'health_asthma')::boolean, r.health_asthma),
    health_asthma_meds = case
      when coalesce((p_patch->>'health_asthma')::boolean, r.health_asthma) then coalesce((p_patch->>'health_asthma_meds'), r.health_asthma_meds)
      else null
    end,
    health_other = coalesce((p_patch->>'health_other'), r.health_other),
    health_other_meds = case
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
    end
  where r.id = p_id;
end$$;

commit;

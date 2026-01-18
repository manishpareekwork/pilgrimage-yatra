begin;

alter table public.yatra_registrations
  add column if not exists health_none boolean default false;

alter table public.yatra_registrations
  drop constraint if exists yatra_registrations_health_choice_check;

alter table public.yatra_registrations
  drop constraint if exists yatra_registrations_required_for_review_check,
  add constraint yatra_registrations_required_for_review_check
    check (
      status not in ('needs_review', 'approved')
      or (
        coalesce(btrim(name_hi), '') <> ''
        and coalesce(btrim(father_name_hi), '') <> ''
        and coalesce(btrim(address_hi), '') <> ''
        and coalesce(btrim(aadhaar_no), '') <> ''
        and coalesce(btrim(phone), '') <> ''
        and coalesce(btrim(whatsapp), '') <> ''
        and dob is not null
        and age_years is not null
        and travel_mode is not null
        and reservation_by is not null
        and coalesce(btrim(accompanying_name), '') <> ''
        and coalesce(btrim(accompanying_guardian_name), '') <> ''
        and coalesce(btrim(accompanying_resident_of), '') <> ''
        and coalesce(btrim(accompanying_phone), '') <> ''
        and (
          travel_mode <> 'train'::travel_mode
          or coalesce(btrim(train_class), '') <> ''
        )
      )
    );

create or replace function public.fn_create_registration(
  p_owner uuid,
  p_created_by uuid,
  p_name_hi text,
  p_address_hi text,
  p_phone text,
  p_declaration_accepted boolean default false,
  p_declaration_signed_at timestamptz default null,
  p_health_none boolean default null,
  p_health_heart boolean default null,
  p_health_bp boolean default null,
  p_health_diabetes boolean default null,
  p_health_asthma boolean default null,
  p_health_other text default null
) returns uuid
language plpgsql
as $$
declare
  new_id uuid;
  health_heart_value boolean := coalesce(p_health_heart, false);
  health_bp_value boolean := coalesce(p_health_bp, false);
  health_diabetes_value boolean := coalesce(p_health_diabetes, false);
  health_asthma_value boolean := coalesce(p_health_asthma, false);
  health_other_value text := nullif(btrim(p_health_other), '');
  health_none_value boolean := coalesce(p_health_none, false);
begin
  if coalesce(trim(p_name_hi), '') = '' then
    raise exception 'name_hi is required';
  end if;
  if coalesce(trim(p_address_hi), '') = '' then
    raise exception 'address_hi is required';
  end if;
  if coalesce(trim(p_phone), '') = '' then
    raise exception 'phone is required';
  end if;

  insert into public.yatra_registrations (
    owner,
    created_by,
    name_hi,
    address_hi,
    phone,
    declaration_accepted,
    declaration_signed_at,
    health_none,
    health_heart,
    health_bp,
    health_diabetes,
    health_asthma,
    health_other
  ) values (
    p_owner,
    p_created_by,
    p_name_hi,
    p_address_hi,
    p_phone,
    coalesce(p_declaration_accepted, false),
    case
      when coalesce(p_declaration_accepted, false) then coalesce(p_declaration_signed_at, now())
      else null
    end,
    health_none_value,
    case when health_none_value then false else health_heart_value end,
    case when health_none_value then false else health_bp_value end,
    case when health_none_value then false else health_diabetes_value end,
    case when health_none_value then false else health_asthma_value end,
    case when health_none_value then null else health_other_value end
  )
  returning id into new_id;
  return new_id;
end$$;

create or replace function public.fn_assert_registration_ready(
  p_registration_id uuid,
  p_target_status reg_status
) returns void
language plpgsql
as $$
declare r record;
begin
  select
    name_hi,
    father_name_hi,
    address_hi,
    aadhaar_no,
    phone,
    whatsapp,
    dob,
    age_years,
    travel_mode,
    train_class,
    reservation_by,
    accompanying_name,
    accompanying_guardian_name,
    accompanying_resident_of,
    accompanying_phone
  into r
  from public.yatra_registrations
  where id = p_registration_id;

  if r is null then
    raise exception 'Registration not found';
  end if;

  if p_target_status in ('needs_review', 'approved') then
    if coalesce(btrim(r.name_hi), '') = ''
      or coalesce(btrim(r.father_name_hi), '') = ''
      or coalesce(btrim(r.address_hi), '') = ''
      or coalesce(btrim(r.aadhaar_no), '') = ''
      or coalesce(btrim(r.phone), '') = ''
      or coalesce(btrim(r.whatsapp), '') = ''
      or r.dob is null
      or r.age_years is null
      or r.travel_mode is null
      or r.reservation_by is null
      or coalesce(btrim(r.accompanying_name), '') = ''
      or coalesce(btrim(r.accompanying_guardian_name), '') = ''
      or coalesce(btrim(r.accompanying_resident_of), '') = ''
      or coalesce(btrim(r.accompanying_phone), '') = ''
      or (r.travel_mode = 'train' and coalesce(btrim(r.train_class), '') = '')
    then
      raise exception 'Registration is missing mandatory fields for %', p_target_status;
    end if;
  end if;
end$$;

commit;


commit;


-- =====================================================================
-- Migration: supabase/migrations/20260110_health_choice_create_registration.sql
-- =====================================================================

-- Ensure create registration sets health fields to satisfy health choice constraint.
begin;

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
  health_none_value boolean;
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

  health_none_value := coalesce(
    p_health_none,
    not (health_heart_value or health_bp_value or health_diabetes_value or health_asthma_value or health_other_value is not null)
  );

  if not (
    health_none_value
    or health_heart_value
    or health_bp_value
    or health_diabetes_value
    or health_asthma_value
    or health_other_value is not null
  ) then
    raise exception 'health selection is required';
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


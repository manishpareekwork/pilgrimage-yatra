-- =====================================================================
-- Pilgrimage / Yatra — Supabase consolidated schema (SAFE, re-runnable)
-- File: supabase/pilgrimage.sql
-- NOTE: This file avoids full reset drops but may drop obsolete objects as part of migrations.
-- =====================================================================

-- NOTE: This file consolidates the bootstrap plus all migrations and includes address lookup seeds.
-- Last updated: 2026-01-19 (UI-only changes; no schema updates required for mobile photo capture).
-- Run this file in the Supabase SQL editor for a full setup.

begin;

-- ---------- Extensions ----------
create extension if not exists pgcrypto;    -- gen_random_uuid()
create extension if not exists "uuid-ossp"; -- uuid_generate_v4() if you prefer

-- ---------- Enums (idempotent via DO blocks) ----------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type user_role as enum ('yatri','volunteer','reviewer','admin');
  end if;

  if not exists (select 1 from pg_type where typname = 'reg_status') then
    create type reg_status as enum ('submitted','needs_review','approved','rejected');
  end if;

  if not exists (select 1 from pg_type where typname = 'travel_mode') then
    create type travel_mode as enum ('train','air');
  end if;

  if not exists (select 1 from pg_type where typname = 'reservation_by') then
    create type reservation_by as enum ('self','committee');
  end if;
end$$;

-- ---------- Tables ----------
-- profiles (1–1 with auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'yatri',
  name_hi text,
  phone text,
  created_at timestamptz not null default now()
);

-- yatra_registrations (system of record for registrations)
create table if not exists public.yatra_registrations (
  id uuid primary key default gen_random_uuid(),
  owner uuid references auth.users(id),
  created_by uuid references auth.users(id),
  receipt_no text,
  receipts jsonb,
  name_hi text not null,
  guardian_relation text,
  father_name_hi text,
  address_hi text,
  address_state text,
  address_district text,
  address_city text,
  address_pin text,
  aadhaar_no text,
  phone text,
  whatsapp text,
  dob date,
  age_years smallint,
  height_cm numeric(5,2),
  weight_kg numeric(5,2),
  travel_mode travel_mode,
  train_class text,
  reservation_by reservation_by,
  health_none boolean default false,
  health_heart boolean default false,
  health_heart_meds text,
  health_bp boolean default false,
  health_bp_meds text,
  health_diabetes boolean default false,
  health_diabetes_meds text,
  health_asthma boolean default false,
  health_asthma_meds text,
  health_common_meds text,
  health_other text,
  health_other_meds text,
  blood_group text,
  medical_conditions text,
  medical_allergies text,
  medical_medications text,
  medical_emergency_notes text,
  emergency_contact_name text,
  emergency_contact_father_name text,
  emergency_contact_age_years smallint,
  emergency_contact_address text,
  emergency_contact_phone text,
  photo_url text,
  form_image_url text,
  attended_badarinath_2024 boolean default false,
  sadhu_sant_category boolean default false,
  declaration_accepted boolean not null default false,
  declaration_signed_at timestamptz,
  status reg_status not null default 'submitted',
  ocr_confidence numeric,
  raw_json jsonb,
  group_id uuid,
  created_at timestamptz not null default now(),
  constraint yatra_registrations_age_years_check check (age_years is null or age_years between 0 and 120),
  constraint yatra_registrations_emergency_age_check check (emergency_contact_age_years is null or emergency_contact_age_years between 0 and 120),
  constraint yatra_registrations_receipts_array_check check (receipts is null or jsonb_typeof(receipts) = 'array')
);

alter table public.yatra_registrations
  add column if not exists receipt_no text,
  add column if not exists receipts jsonb,
  add column if not exists aadhaar_no text,
  add column if not exists dob date,
  add column if not exists age_years smallint,
  add column if not exists height_cm numeric(5,2),
  add column if not exists weight_kg numeric(5,2),
  add column if not exists travel_mode travel_mode,
  add column if not exists guardian_relation text,
  add column if not exists father_name_hi text,
  add column if not exists address_hi text,
  add column if not exists address_state text,
  add column if not exists address_district text,
  add column if not exists address_city text,
  add column if not exists address_pin text,
  add column if not exists phone text,
  add column if not exists whatsapp text,
  add column if not exists train_class text,
  add column if not exists reservation_by reservation_by,
  add column if not exists health_none boolean default false,
  add column if not exists health_heart boolean default false,
  add column if not exists health_heart_meds text,
  add column if not exists health_bp boolean default false,
  add column if not exists health_bp_meds text,
  add column if not exists health_diabetes boolean default false,
  add column if not exists health_diabetes_meds text,
  add column if not exists health_asthma boolean default false,
  add column if not exists health_asthma_meds text,
  add column if not exists health_common_meds text,
  add column if not exists health_other text,
  add column if not exists health_other_meds text,
  add column if not exists blood_group text,
  add column if not exists medical_conditions text,
  add column if not exists medical_allergies text,
  add column if not exists medical_medications text,
  add column if not exists medical_emergency_notes text,
  add column if not exists emergency_contact_name text,
  add column if not exists emergency_contact_father_name text,
  add column if not exists emergency_contact_age_years smallint,
  add column if not exists emergency_contact_address text,
  add column if not exists emergency_contact_phone text,
  add column if not exists photo_url text,
  add column if not exists form_image_url text,
  add column if not exists attended_badarinath_2024 boolean default false,
  add column if not exists sadhu_sant_category boolean default false,
  add column if not exists declaration_accepted boolean not null default false,
  add column if not exists declaration_signed_at timestamptz,
  add column if not exists status reg_status not null default 'submitted',
  add column if not exists ocr_confidence numeric,
  add column if not exists raw_json jsonb,
  add column if not exists group_id uuid,
  add column if not exists created_at timestamptz not null default now();

alter table public.yatra_registrations
  drop constraint if exists yatra_registrations_age_years_check,
  add constraint yatra_registrations_age_years_check
    check (age_years is null or age_years between 0 and 120);

alter table public.yatra_registrations
  drop constraint if exists yatra_registrations_emergency_age_check,
  add constraint yatra_registrations_emergency_age_check
    check (emergency_contact_age_years is null or emergency_contact_age_years between 0 and 120);

alter table public.yatra_registrations
  drop constraint if exists yatra_registrations_receipts_array_check,
  add constraint yatra_registrations_receipts_array_check
    check (receipts is null or jsonb_typeof(receipts) = 'array');

update public.yatra_registrations
set health_common_meds = nullif(
  trim(both ', ' from concat_ws(', ', health_heart_meds, health_bp_meds, health_diabetes_meds, health_asthma_meds)),
  ''
)
where health_common_meds is null;

-- address lookup tables (state/district)
create table if not exists public.address_states (
  id text primary key,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.address_districts (
  id text primary key,
  state_id text not null references public.address_states(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_address_districts_state on public.address_districts(state_id);

-- reviews (human-in-the-loop audit)
create table if not exists public.yatra_reviews (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.yatra_registrations(id) on delete cascade,
  action text check (action in ('approve','reject','edit')),
  diff jsonb,
  actor uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- ---------- Indexes ----------
create index if not exists idx_profiles_created_at on public.profiles (created_at);
create index if not exists idx_regs_owner on public.yatra_registrations (owner);
create index if not exists idx_regs_created_by on public.yatra_registrations (created_by);
create index if not exists idx_regs_status on public.yatra_registrations (status);
create unique index if not exists yatra_registrations_phone_unique
  on public.yatra_registrations (phone) where phone is not null;

-- ---------- RLS ----------
alter table public.profiles enable row level security;
alter table public.yatra_registrations enable row level security;
alter table public.yatra_reviews enable row level security;
alter table public.address_states enable row level security;
alter table public.address_districts enable row level security;

-- profiles: a user reads/updates only their own
drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles
for select using (auth.uid() = id);

drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles
for update using (auth.uid() = id);

-- registrations:
-- yatri: owns their rows
drop policy if exists "yatri read own" on public.yatra_registrations;
create policy "yatri read own" on public.yatra_registrations
for select using (auth.uid() = owner);

drop policy if exists "yatri write own" on public.yatra_registrations;
create policy "yatri write own" on public.yatra_registrations
for insert with check (auth.uid() = owner);

drop policy if exists "yatri update own" on public.yatra_registrations;
create policy "yatri update own" on public.yatra_registrations
for update using (auth.uid() = owner);

-- volunteer: rows they created (plus reviewers/admins also pass this)
drop policy if exists "volunteer read created" on public.yatra_registrations;
create policy "volunteer read created" on public.yatra_registrations
for select using (
  (auth.jwt() ->> 'role') in ('volunteer','reviewer','admin')
  and auth.uid() = created_by
);

drop policy if exists "volunteer write created" on public.yatra_registrations;
create policy "volunteer write created" on public.yatra_registrations
for insert with check (
  (auth.jwt() ->> 'role') in ('volunteer','reviewer','admin')
  and auth.uid() = created_by
);

drop policy if exists "volunteer update created" on public.yatra_registrations;
create policy "volunteer update created" on public.yatra_registrations
for update using (
  (auth.jwt() ->> 'role') in ('volunteer','reviewer','admin')
  and auth.uid() = created_by
);

-- reviewer/admin: full read + update
drop policy if exists "reviewers read all" on public.yatra_registrations;
create policy "reviewers read all" on public.yatra_registrations
for select using ((auth.jwt() ->> 'role') in ('reviewer','admin'));

drop policy if exists "reviewers update all" on public.yatra_registrations;
create policy "reviewers update all" on public.yatra_registrations
for update using ((auth.jwt() ->> 'role') in ('reviewer','admin'));

-- reviews: owners can read reviews of their registration; staff can read/write all
drop policy if exists "reviews read if owner or staff" on public.yatra_reviews;
create policy "reviews read if owner or staff" on public.yatra_reviews
for select using (
  (auth.jwt() ->> 'role') in ('reviewer','admin')
  or exists (
    select 1 from public.yatra_registrations r
    where r.id = yatra_reviews.registration_id and r.owner = auth.uid()
  )
);

drop policy if exists "reviews write staff" on public.yatra_reviews;
create policy "reviews write staff" on public.yatra_reviews
for insert with check ((auth.jwt() ->> 'role') in ('reviewer','admin'));

drop policy if exists "read address states" on public.address_states;
create policy "read address states" on public.address_states
for select using (auth.role() = 'authenticated');

drop policy if exists "read address districts" on public.address_districts;
create policy "read address districts" on public.address_districts
for select using (auth.role() = 'authenticated');

-- ---------- Views ----------
drop view if exists public.v_registrations_with_profiles;
create or replace view public.v_registrations_with_profiles as
select
  r.*,
  p.role as owner_role,
  p.name_hi as owner_name_hi
from public.yatra_registrations r
left join public.profiles p on p.id = r.owner;

-- ---------- Helper Functions (CRUD) ----------
-- Create registration (respects RLS when called by client)
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
    not (
      health_heart_value
      or health_bp_value
      or health_diabetes_value
      or health_asthma_value
      or health_other_value is not null
    )
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
  return new_id;
end$$;

-- Update registration (partial update via json)
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
    health_common_meds = case
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
    end,
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
end$$;

-- Address lookup RPCs
create or replace function public.fn_list_states()
returns table(state_id text, state_name text)
language sql
stable
as $$
  select id, name
  from public.address_states
  order by name;
$$;

create or replace function public.fn_list_districts(p_state_id text)
returns table(district_id text, district_name text)
language sql
stable
as $$
  select id, name
  from public.address_districts
  where state_id = p_state_id
  order by name;
$$;

-- Create review (staff only by RLS)
create or replace function public.fn_create_review(
  p_registration_id uuid,
  p_action text,
  p_diff jsonb,
  p_actor uuid
) returns uuid
language plpgsql
as $$
declare rid uuid;
begin
  insert into public.yatra_reviews (registration_id, action, diff, actor)
  values (p_registration_id, p_action, p_diff, p_actor)
  returning id into rid;

  -- optional: auto-update status on approve/reject
  if p_action = 'approve' then
    update public.yatra_registrations set status = 'approved' where id = p_registration_id;
  elsif p_action = 'reject' then
    update public.yatra_registrations set status = 'rejected' where id = p_registration_id;
  end if;

  return rid;
end$$;

-- Admin: set user role (SECURITY DEFINER)
-- NOTE: Only service role / admin should be able to run this.
create or replace function public.admin_set_user_role(p_user uuid, p_role user_role)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  -- Update profiles
  insert into public.profiles (id, role)
  values (p_user, p_role)
  on conflict (id) do update set role = excluded.role;

  -- Propagate to JWT by updating auth.users.app_metadata.role
  update auth.users
  set raw_app_meta_data = jsonb_set(
        coalesce(raw_app_meta_data, '{}'::jsonb),
        '{role}', to_jsonb(p_role::text), true
      )
  where id = p_user;
end$$;

-- Lock down who can call admin_set_user_role: only service role / admins.
revoke all on function public.admin_set_user_role(uuid, user_role) from public;

-- ---------- Storage Buckets & Policies ----------
-- Create private buckets if they don't exist
insert into storage.buckets (id, name, public)
values
  ('forms','forms', false),
  ('photos','photos', false)
on conflict (id) do nothing;

-- Allow reads via signed URLs (no SQL policy needed for signed URLs).
-- If you want staff to list/read via SQL, you can add:
drop policy if exists "staff read forms" on storage.objects;
create policy "staff read forms" on storage.objects
for select using (
  bucket_id in ('forms','photos') and (auth.jwt() ->> 'role') in ('reviewer','admin')
);

commit;


-- =====================================================================
-- Migration: supabase/migrations/20251229_registration_alignment.sql
-- =====================================================================

-- Align yatra_registrations with the official Jagannath Puri 2025 form
begin;

-- Reservation enum
do $$
begin
  if not exists (select 1 from pg_type where typname = 'reservation_by') then
    create type reservation_by as enum ('self','committee');
  end if;
end$$;

-- Columns
alter table public.yatra_registrations
  add column if not exists receipt_no text,
  add column if not exists aadhaar_no text,
  add column if not exists dob date,
  add column if not exists age_years smallint,
  add column if not exists height_cm numeric(5,2),
  add column if not exists weight_kg numeric(5,2),
  add column if not exists health_heart boolean default false,
  add column if not exists health_heart_meds text,
  add column if not exists health_diabetes_meds text,
  add column if not exists health_bp_meds text,
  add column if not exists health_asthma boolean default false,
  add column if not exists health_asthma_meds text,
  add column if not exists health_other_meds text,
  add column if not exists emergency_contact_father_name text,
  add column if not exists emergency_contact_age_years smallint,
  add column if not exists emergency_contact_address text,
  add column if not exists reservation_by reservation_by,
  add column if not exists attended_badarinath_2024 boolean default false,
  add column if not exists sadhu_sant_category boolean default false,
  add column if not exists declaration_accepted boolean not null default false,
  add column if not exists declaration_signed_at timestamptz;

-- Checks
alter table public.yatra_registrations
  drop constraint if exists yatra_registrations_age_years_check,
  add constraint yatra_registrations_age_years_check
    check (age_years is null or age_years between 0 and 120);

alter table public.yatra_registrations
  drop constraint if exists yatra_registrations_emergency_age_check,
  add constraint yatra_registrations_emergency_age_check
    check (emergency_contact_age_years is null or emergency_contact_age_years between 0 and 120);

-- Minimal create RPC (Option A)
create or replace function public.fn_create_registration(
  p_owner uuid,
  p_created_by uuid,
  p_name_hi text,
  p_address_hi text,
  p_phone text,
  p_declaration_accepted boolean default false,
  p_declaration_signed_at timestamptz default null
) returns uuid
language plpgsql
as $$
declare
  new_id uuid;
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
    declaration_signed_at
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
    end
  )
  returning id into new_id;

  return new_id;
end$$;

-- Patch update RPC
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


-- =====================================================================
-- Migration: supabase/migrations/20251229_registration_alignment_guardian_relation.sql
-- =====================================================================

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


-- =====================================================================
-- Migration: supabase/migrations/20251230_health_common_meds.sql
-- =====================================================================

begin;

alter table public.yatra_registrations
  add column if not exists health_common_meds text;

update public.yatra_registrations
set health_common_meds = nullif(
  trim(both ', ' from concat_ws(', ', health_heart_meds, health_bp_meds, health_diabetes_meds, health_asthma_meds)),
  ''
)
where health_common_meds is null;

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
    health_common_meds = case
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


-- =====================================================================
-- Migration: supabase/migrations/20251231_address_components.sql
-- =====================================================================

begin;

alter table public.yatra_registrations
  add column if not exists address_state text,
  add column if not exists address_district text,
  add column if not exists address_city text,
  add column if not exists address_village text,
  add column if not exists address_tehsil text,
  add column if not exists address_pin text;

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
    address_village = coalesce((p_patch->>'address_village'), r.address_village),
    address_tehsil = coalesce((p_patch->>'address_tehsil'), r.address_tehsil),
    address_pin = coalesce((p_patch->>'address_pin'), r.address_pin),
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
    health_common_meds = case
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


-- =====================================================================
-- Migration: supabase/migrations/20251231_address_lookup_tables.sql
-- =====================================================================

begin;

create table if not exists public.address_states (
  id text primary key,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.address_districts (
  id text primary key,
  state_id text not null references public.address_states(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.address_pincodes (
  pin text not null,
  office_name text not null,
  district_id text references public.address_districts(id),
  state_id text references public.address_states(id),
  district_name text,
  state_name text,
  delivery_status text,
  division text,
  region text,
  circle text,
  created_at timestamptz not null default now(),
  primary key (pin, office_name)
);

create index if not exists idx_address_districts_state on public.address_districts(state_id);
create index if not exists idx_address_pincodes_pin on public.address_pincodes(pin);
create index if not exists idx_address_pincodes_state on public.address_pincodes(state_id);
create index if not exists idx_address_pincodes_district on public.address_pincodes(district_id);

alter table public.address_states enable row level security;
alter table public.address_districts enable row level security;
alter table public.address_pincodes enable row level security;

drop policy if exists "read address states" on public.address_states;
create policy "read address states" on public.address_states
for select using (auth.role() = 'authenticated');

drop policy if exists "read address districts" on public.address_districts;
create policy "read address districts" on public.address_districts
for select using (auth.role() = 'authenticated');

drop policy if exists "read address pincodes" on public.address_pincodes;
create policy "read address pincodes" on public.address_pincodes
for select using (auth.role() = 'authenticated');

create or replace function public.fn_list_states()
returns table(state_id text, state_name text)
language sql
stable
as $$
  select id, name
  from public.address_states
  order by name;
$$;

create or replace function public.fn_list_districts(p_state_id text)
returns table(district_id text, district_name text)
language sql
stable
as $$
  select id, name
  from public.address_districts
  where state_id = p_state_id
  order by name;
$$;

create or replace function public.fn_lookup_pincode(p_pin text)
returns table(
  pin text,
  state_id text,
  state_name text,
  district_id text,
  district_name text
)
language sql
stable
as $$
  select
    ap.pin,
    coalesce(ap.state_id, s.id) as state_id,
    coalesce(ap.state_name, s.name) as state_name,
    coalesce(ap.district_id, d.id) as district_id,
    coalesce(ap.district_name, d.name) as district_name
  from public.address_pincodes ap
  left join public.address_states s on ap.state_id = s.id
  left join public.address_districts d on ap.district_id = d.id
  where ap.pin = p_pin
  limit 1;
$$;

commit;


-- =====================================================================
-- Migration: supabase/migrations/20260102_remove_pincode_table.sql
-- =====================================================================

begin;

drop view if exists public.v_registrations_with_profiles;

drop function if exists public.fn_lookup_pincode(text);

drop table if exists public.address_pincodes;

alter table public.yatra_registrations
  drop column if exists address_village,
  drop column if exists address_tehsil;

create view public.v_registrations_with_profiles as
select
  r.*,
  p.role as owner_role,
  p.name_hi as owner_name_hi
from public.yatra_registrations r
left join public.profiles p on p.id = r.owner;

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
    health_common_meds = case
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


-- =====================================================================
-- Migration: supabase/migrations/20260105_operational_requirements.sql
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- Enums for booking and ticketing
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'booking_status') then
    create type booking_status as enum ('planned', 'booked', 'partially_booked', 'cancelled');
  end if;

  if not exists (select 1 from pg_type where typname = 'booking_channel') then
    create type booking_channel as enum ('irctc', 'agent', 'committee', 'other');
  end if;

  if not exists (select 1 from pg_type where typname = 'payment_status') then
    create type payment_status as enum ('pending', 'paid', 'partial', 'refunded');
  end if;

  if not exists (select 1 from pg_type where typname = 'booking_task_status') then
    create type booking_task_status as enum ('open', 'in_progress', 'done');
  end if;

  if not exists (select 1 from pg_type where typname = 'booking_task_type') then
    create type booking_task_type as enum ('train', 'air', 'hotel');
  end if;

  if not exists (select 1 from pg_type where typname = 'berth_type') then
    create type berth_type as enum ('LB', 'MB', 'UB', 'SL', 'SU', 'WS', 'AS');
  end if;

  if not exists (select 1 from pg_type where typname = 'ticket_status') then
    create type ticket_status as enum ('CNF', 'RAC', 'WL', 'CAN');
  end if;

  if not exists (select 1 from pg_type where typname = 'meal_pref') then
    create type meal_pref as enum ('veg', 'nonveg', 'jain', 'none');
  end if;

  if not exists (select 1 from pg_type where typname = 'passenger_gender') then
    create type passenger_gender as enum ('male', 'female', 'other', 'unspecified');
  end if;
end$$;

-- ---------------------------------------------------------------------
-- Category groups
-- ---------------------------------------------------------------------
create table if not exists public.yatra_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  whatsapp_group_ref text,
  created_at timestamptz not null default now()
);

insert into public.yatra_categories (name, whatsapp_group_ref)
values
  ('Family', null),
  ('Relative', null),
  ('Morning Tea club', null),
  ('Katha', null),
  ('SFS-1', null),
  ('SFS-2', null)
on conflict (name) do nothing;

alter table public.yatra_registrations
  add column if not exists category_id uuid references public.yatra_categories(id),
  add column if not exists health_none boolean default false,
  add column if not exists accompanying_name text,
  add column if not exists accompanying_guardian_name text,
  add column if not exists accompanying_resident_of text,
  add column if not exists accompanying_phone text;

update public.yatra_registrations
set health_none = true
where health_none is distinct from true
  and coalesce(health_heart, false) = false
  and coalesce(health_bp, false) = false
  and coalesce(health_diabetes, false) = false
  and coalesce(health_asthma, false) = false
  and (health_other is null or btrim(health_other) = '');

update public.yatra_registrations
set train_class = null
where travel_mode = 'air' and train_class is not null;

alter table public.yatra_registrations
  drop constraint if exists yatra_registrations_air_train_class_check,
  add constraint yatra_registrations_air_train_class_check
    check (travel_mode is distinct from 'air'::travel_mode or train_class is null);

alter table public.yatra_registrations
  drop constraint if exists yatra_registrations_health_choice_check,
  add constraint yatra_registrations_health_choice_check
    check (
      coalesce(health_none, false)
      or coalesce(health_heart, false)
      or coalesce(health_bp, false)
      or coalesce(health_diabetes, false)
      or coalesce(health_asthma, false)
      or (health_other is not null and btrim(health_other) <> '')
    );

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
        and photo_url is not null and btrim(photo_url) <> ''
        and coalesce(btrim(accompanying_name), '') <> ''
        and coalesce(btrim(accompanying_guardian_name), '') <> ''
        and coalesce(btrim(accompanying_resident_of), '') <> ''
        and coalesce(btrim(accompanying_phone), '') <> ''
        and (
          travel_mode <> 'train'::travel_mode
          or coalesce(btrim(train_class), '') <> ''
        )
        and (
          coalesce(health_none, false)
          or coalesce(health_heart, false)
          or coalesce(health_bp, false)
          or coalesce(health_diabetes, false)
          or coalesce(health_asthma, false)
          or (health_other is not null and btrim(health_other) <> '')
        )
      )
    );

create index if not exists idx_yatra_registrations_category_id on public.yatra_registrations(category_id);

-- ---------------------------------------------------------------------
-- Trips and co-travel groups
-- ---------------------------------------------------------------------
create table if not exists public.yatra_trips (
  id uuid primary key default gen_random_uuid(),
  mode travel_mode not null,
  trip_name text not null,
  journey_date date not null,
  depart_at timestamptz,
  arrive_at timestamptz,
  train_no text,
  train_name text,
  from_station_code text,
  to_station_code text,
  from_station_name text,
  to_station_name text,
  default_class_code text,
  quota_code text,
  airline_code text,
  flight_no text,
  from_airport_code text,
  to_airport_code text,
  created_at timestamptz not null default now()
);

create index if not exists idx_yatra_trips_mode on public.yatra_trips(mode);
create index if not exists idx_yatra_trips_journey_date on public.yatra_trips(journey_date);
create index if not exists idx_yatra_trips_train_no on public.yatra_trips(train_no);
create index if not exists idx_yatra_trips_flight_no on public.yatra_trips(flight_no);

create table if not exists public.yatra_co_travel_groups (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.yatra_trips(id) on delete cascade,
  group_code text not null unique,
  pnr text,
  booking_status booking_status not null default 'planned',
  booking_channel booking_channel,
  booked_at timestamptz,
  booked_by_user_id uuid references auth.users(id),
  booked_by_registration_id uuid references public.yatra_registrations(id),
  total_fare_inr numeric,
  payment_status payment_status not null default 'pending',
  agent_ref text,
  class_code text,
  quota_code text,
  boarding_station_code text,
  reservation_upto_station_code text,
  group_size_target int not null default 6,
  incharge_registration_id uuid references public.yatra_registrations(id),
  created_at timestamptz not null default now(),
  constraint yatra_co_travel_groups_group_size_check check (group_size_target > 0),
  constraint yatra_co_travel_groups_booked_by_check check (
    booking_status not in ('booked', 'partially_booked')
    or (
      (booked_by_user_id is not null and booked_by_registration_id is null)
      or (booked_by_user_id is null and booked_by_registration_id is not null)
    )
  )
);

create index if not exists idx_yatra_co_travel_groups_trip_id on public.yatra_co_travel_groups(trip_id);
create index if not exists idx_yatra_co_travel_groups_pnr on public.yatra_co_travel_groups(pnr);

create table if not exists public.yatra_co_travel_group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.yatra_co_travel_groups(id) on delete cascade,
  registration_id uuid not null references public.yatra_registrations(id) on delete cascade,
  seat_no text,
  berth_no text,
  coach_no text,
  passenger_name_on_ticket text,
  passenger_age_on_ticket int,
  passenger_gender passenger_gender,
  berth_type berth_type,
  ticket_status ticket_status,
  wl_rac_no text,
  meal_pref meal_pref,
  senior_citizen boolean not null default false,
  ticket_number text,
  cabin_class text,
  baggage_allowance_kg numeric,
  ssr_notes text,
  created_at timestamptz not null default now(),
  constraint yatra_co_travel_group_members_unique unique (group_id, registration_id)
);

create index if not exists idx_yatra_co_travel_group_members_group_id on public.yatra_co_travel_group_members(group_id);
create index if not exists idx_yatra_co_travel_group_members_registration_id on public.yatra_co_travel_group_members(registration_id);
create index if not exists idx_yatra_co_travel_group_members_coach_no on public.yatra_co_travel_group_members(coach_no);

create table if not exists public.yatra_train_coaches (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.yatra_trips(id) on delete cascade,
  coach_no text not null,
  coach_incharge_registration_id uuid references public.yatra_registrations(id),
  created_at timestamptz not null default now(),
  constraint yatra_train_coaches_unique unique (trip_id, coach_no)
);

create index if not exists idx_yatra_train_coaches_incharge on public.yatra_train_coaches(coach_incharge_registration_id);

-- ---------------------------------------------------------------------
-- Hotels and stays
-- ---------------------------------------------------------------------
create table if not exists public.yatra_hotels (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('hotel', 'guest_house', 'dharamshala', 'other')),
  city text,
  address text,
  created_at timestamptz not null default now()
);

create table if not exists public.yatra_hotel_rooms (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.yatra_hotels(id) on delete cascade,
  room_no text not null,
  base_capacity int not null,
  extra_beds_max int not null default 0,
  created_at timestamptz not null default now(),
  constraint yatra_hotel_rooms_unique unique (hotel_id, room_no),
  constraint yatra_hotel_rooms_capacity_check check (base_capacity >= 0 and extra_beds_max >= 0)
);

create index if not exists idx_yatra_hotel_rooms_hotel_id on public.yatra_hotel_rooms(hotel_id);

create table if not exists public.yatra_room_stays (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.yatra_hotel_rooms(id) on delete cascade,
  registration_id uuid not null references public.yatra_registrations(id) on delete cascade,
  stay_from date,
  stay_to date,
  created_at timestamptz not null default now(),
  constraint yatra_room_stays_date_check check (stay_to is null or stay_from is null or stay_to >= stay_from)
);

create index if not exists idx_yatra_room_stays_room_id on public.yatra_room_stays(room_id);
create index if not exists idx_yatra_room_stays_registration_id on public.yatra_room_stays(registration_id);

create table if not exists public.yatra_room_incharges (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.yatra_hotel_rooms(id) on delete cascade,
  registration_id uuid not null references public.yatra_registrations(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint yatra_room_incharges_unique unique (room_id)
);

create table if not exists public.yatra_hotel_incharges (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.yatra_hotels(id) on delete cascade,
  registration_id uuid not null references public.yatra_registrations(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint yatra_hotel_incharges_unique unique (hotel_id)
);

-- ---------------------------------------------------------------------
-- Booking tasks
-- ---------------------------------------------------------------------
create table if not exists public.yatra_booking_tasks (
  id uuid primary key default gen_random_uuid(),
  task_type booking_task_type not null,
  trip_id uuid references public.yatra_trips(id) on delete set null,
  group_id uuid references public.yatra_co_travel_groups(id) on delete set null,
  hotel_id uuid references public.yatra_hotels(id) on delete set null,
  room_id uuid references public.yatra_hotel_rooms(id) on delete set null,
  booking_agent_user_id uuid references auth.users(id),
  booking_agent_registration_id uuid references public.yatra_registrations(id),
  notes text,
  status booking_task_status not null default 'open',
  created_at timestamptz not null default now(),
  constraint yatra_booking_tasks_agent_check check (
    (booking_agent_user_id is not null and booking_agent_registration_id is null)
    or (booking_agent_user_id is null and booking_agent_registration_id is not null)
  )
);

create index if not exists idx_yatra_booking_tasks_trip_id on public.yatra_booking_tasks(trip_id);
create index if not exists idx_yatra_booking_tasks_group_id on public.yatra_booking_tasks(group_id);
create index if not exists idx_yatra_booking_tasks_hotel_id on public.yatra_booking_tasks(hotel_id);
create index if not exists idx_yatra_booking_tasks_room_id on public.yatra_booking_tasks(room_id);

-- ---------------------------------------------------------------------
-- Volunteer roles
-- ---------------------------------------------------------------------
create table if not exists public.volunteer_roles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name_hi text,
  name_en text,
  created_at timestamptz not null default now()
);

create table if not exists public.volunteer_role_members (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references public.volunteer_roles(id) on delete cascade,
  registration_id uuid not null references public.yatra_registrations(id) on delete cascade,
  is_head boolean not null default false,
  created_at timestamptz not null default now(),
  constraint volunteer_role_members_unique unique (role_id, registration_id)
);

create unique index if not exists idx_volunteer_role_members_head
  on public.volunteer_role_members(role_id)
  where is_head = true;

insert into public.volunteer_roles (code, name_hi, name_en)
values
  ('yatra_contact', 'यात्री संपर्क', 'Yatra Contact'),
  ('accommodation_contact', 'आवास', 'Accommodation'),
  ('meals_contact', 'भोजन', 'Meals'),
  ('food_serving', 'पुरस्कारी', 'Food Serving'),
  ('prabhat_pheri', 'प्रभात फेरी', 'Prabhat Pheri'),
  ('housekeeping', 'हाउसकीपिंग', 'Housekeeping'),
  ('train_meals', 'ट्रेन भोजन', 'Train Meals'),
  ('medical_needs', 'चिकित्सा सहायता', 'Medical Needs'),
  ('enquiry_management', 'पूछताछ प्रबंधन', 'Enquiry Management')
on conflict (code) do nothing;

-- ---------------------------------------------------------------------
-- RLS policies for admin/reviewer only tables
-- ---------------------------------------------------------------------
alter table public.yatra_categories enable row level security;
alter table public.yatra_trips enable row level security;
alter table public.yatra_co_travel_groups enable row level security;
alter table public.yatra_co_travel_group_members enable row level security;
alter table public.yatra_train_coaches enable row level security;
alter table public.yatra_hotels enable row level security;
alter table public.yatra_hotel_rooms enable row level security;
alter table public.yatra_room_stays enable row level security;
alter table public.yatra_room_incharges enable row level security;
alter table public.yatra_hotel_incharges enable row level security;
alter table public.yatra_booking_tasks enable row level security;
alter table public.volunteer_roles enable row level security;
alter table public.volunteer_role_members enable row level security;

drop policy if exists "staff manage categories" on public.yatra_categories;
create policy "staff manage categories" on public.yatra_categories
for all using ((auth.jwt() ->> 'role') in ('reviewer', 'admin'))
with check ((auth.jwt() ->> 'role') in ('reviewer', 'admin'));

drop policy if exists "staff manage trips" on public.yatra_trips;
create policy "staff manage trips" on public.yatra_trips
for all using ((auth.jwt() ->> 'role') in ('reviewer', 'admin'))
with check ((auth.jwt() ->> 'role') in ('reviewer', 'admin'));

drop policy if exists "staff manage travel groups" on public.yatra_co_travel_groups;
create policy "staff manage travel groups" on public.yatra_co_travel_groups
for all using ((auth.jwt() ->> 'role') in ('reviewer', 'admin'))
with check ((auth.jwt() ->> 'role') in ('reviewer', 'admin'));

drop policy if exists "staff manage travel group members" on public.yatra_co_travel_group_members;
create policy "staff manage travel group members" on public.yatra_co_travel_group_members
for all using ((auth.jwt() ->> 'role') in ('reviewer', 'admin'))
with check ((auth.jwt() ->> 'role') in ('reviewer', 'admin'));

drop policy if exists "staff manage train coaches" on public.yatra_train_coaches;
create policy "staff manage train coaches" on public.yatra_train_coaches
for all using ((auth.jwt() ->> 'role') in ('reviewer', 'admin'))
with check ((auth.jwt() ->> 'role') in ('reviewer', 'admin'));

drop policy if exists "staff manage hotels" on public.yatra_hotels;
create policy "staff manage hotels" on public.yatra_hotels
for all using ((auth.jwt() ->> 'role') in ('reviewer', 'admin'))
with check ((auth.jwt() ->> 'role') in ('reviewer', 'admin'));

drop policy if exists "staff manage hotel rooms" on public.yatra_hotel_rooms;
create policy "staff manage hotel rooms" on public.yatra_hotel_rooms
for all using ((auth.jwt() ->> 'role') in ('reviewer', 'admin'))
with check ((auth.jwt() ->> 'role') in ('reviewer', 'admin'));

drop policy if exists "staff manage room stays" on public.yatra_room_stays;
create policy "staff manage room stays" on public.yatra_room_stays
for all using ((auth.jwt() ->> 'role') in ('reviewer', 'admin'))
with check ((auth.jwt() ->> 'role') in ('reviewer', 'admin'));

drop policy if exists "staff manage room incharges" on public.yatra_room_incharges;
create policy "staff manage room incharges" on public.yatra_room_incharges
for all using ((auth.jwt() ->> 'role') in ('reviewer', 'admin'))
with check ((auth.jwt() ->> 'role') in ('reviewer', 'admin'));

drop policy if exists "staff manage hotel incharges" on public.yatra_hotel_incharges;
create policy "staff manage hotel incharges" on public.yatra_hotel_incharges
for all using ((auth.jwt() ->> 'role') in ('reviewer', 'admin'))
with check ((auth.jwt() ->> 'role') in ('reviewer', 'admin'));

drop policy if exists "staff manage booking tasks" on public.yatra_booking_tasks;
create policy "staff manage booking tasks" on public.yatra_booking_tasks
for all using ((auth.jwt() ->> 'role') in ('reviewer', 'admin'))
with check ((auth.jwt() ->> 'role') in ('reviewer', 'admin'));

drop policy if exists "staff manage volunteer roles" on public.volunteer_roles;
create policy "staff manage volunteer roles" on public.volunteer_roles
for all using ((auth.jwt() ->> 'role') in ('reviewer', 'admin'))
with check ((auth.jwt() ->> 'role') in ('reviewer', 'admin'));

drop policy if exists "staff manage volunteer role members" on public.volunteer_role_members;
create policy "staff manage volunteer role members" on public.volunteer_role_members
for all using ((auth.jwt() ->> 'role') in ('reviewer', 'admin'))
with check ((auth.jwt() ->> 'role') in ('reviewer', 'admin'));

-- ---------------------------------------------------------------------
-- Helper functions / RPCs
-- ---------------------------------------------------------------------
create or replace function public.fn_generate_group_code(p_trip_id uuid)
returns text
language plpgsql
as $$
declare
  trip_rec record;
  seq_num int;
  prefix text;
  from_code text;
  to_code text;
begin
  select
    mode,
    journey_date,
    from_station_code,
    to_station_code,
    from_airport_code,
    to_airport_code
  into trip_rec
  from public.yatra_trips
  where id = p_trip_id;

  if trip_rec is null then
    raise exception 'Trip not found';
  end if;

  prefix := case when trip_rec.mode = 'air' then 'AIR' else 'TRN' end;
  from_code := upper(coalesce(
    case when trip_rec.mode = 'air' then trip_rec.from_airport_code else trip_rec.from_station_code end,
    'UNK'
  ));
  to_code := upper(coalesce(
    case when trip_rec.mode = 'air' then trip_rec.to_airport_code else trip_rec.to_station_code end,
    'UNK'
  ));

  select coalesce(max((regexp_match(group_code, '-(\\d{3})$'))[1]::int), 0) + 1
  into seq_num
  from public.yatra_co_travel_groups
  where trip_id = p_trip_id;

  return format('%s-%s-%s-%s-%s', prefix, trip_rec.journey_date::text, from_code, to_code, lpad(seq_num::text, 3, '0'));
end$$;

create or replace function public.fn_create_trip(
  p_mode travel_mode,
  p_trip_name text,
  p_journey_date date,
  p_depart_at timestamptz default null,
  p_arrive_at timestamptz default null,
  p_train_no text default null,
  p_train_name text default null,
  p_from_station_code text default null,
  p_to_station_code text default null,
  p_from_station_name text default null,
  p_to_station_name text default null,
  p_default_class_code text default null,
  p_quota_code text default null,
  p_airline_code text default null,
  p_flight_no text default null,
  p_from_airport_code text default null,
  p_to_airport_code text default null
) returns uuid
language plpgsql
as $$
declare new_id uuid;
begin
  insert into public.yatra_trips (
    mode, trip_name, journey_date, depart_at, arrive_at,
    train_no, train_name, from_station_code, to_station_code, from_station_name, to_station_name,
    default_class_code, quota_code,
    airline_code, flight_no, from_airport_code, to_airport_code
  ) values (
    p_mode, p_trip_name, p_journey_date, p_depart_at, p_arrive_at,
    p_train_no, p_train_name, p_from_station_code, p_to_station_code, p_from_station_name, p_to_station_name,
    p_default_class_code, p_quota_code,
    p_airline_code, p_flight_no, p_from_airport_code, p_to_airport_code
  )
  returning id into new_id;
  return new_id;
end$$;

create or replace function public.fn_create_co_travel_group(
  p_trip_id uuid,
  p_group_size_target int default null,
  p_incharge_registration_id uuid default null,
  p_pnr text default null,
  p_group_code text default null
) returns uuid
language plpgsql
as $$
declare new_id uuid;
declare resolved_code text;
declare mode_value travel_mode;
begin
  select mode into mode_value from public.yatra_trips where id = p_trip_id;
  if mode_value is null then
    raise exception 'Trip not found';
  end if;

  resolved_code := coalesce(p_group_code, public.fn_generate_group_code(p_trip_id));

  insert into public.yatra_co_travel_groups (
    trip_id, group_code, group_size_target, incharge_registration_id, pnr
  ) values (
    p_trip_id,
    resolved_code,
    coalesce(p_group_size_target, case when mode_value = 'train' then 6 else 6 end),
    p_incharge_registration_id,
    p_pnr
  )
  returning id into new_id;

  return new_id;
end$$;

create or replace function public.fn_update_co_travel_group(
  p_id uuid,
  p_patch jsonb
) returns void
language plpgsql
as $$
begin
  update public.yatra_co_travel_groups g
  set
    pnr = coalesce(p_patch->>'pnr', g.pnr),
    booking_status = coalesce((p_patch->>'booking_status')::booking_status, g.booking_status),
    booking_channel = coalesce((p_patch->>'booking_channel')::booking_channel, g.booking_channel),
    booked_at = coalesce((p_patch->>'booked_at')::timestamptz, g.booked_at),
    booked_by_user_id = coalesce((p_patch->>'booked_by_user_id')::uuid, g.booked_by_user_id),
    booked_by_registration_id = coalesce((p_patch->>'booked_by_registration_id')::uuid, g.booked_by_registration_id),
    total_fare_inr = coalesce((p_patch->>'total_fare_inr')::numeric, g.total_fare_inr),
    payment_status = coalesce((p_patch->>'payment_status')::payment_status, g.payment_status),
    agent_ref = coalesce(p_patch->>'agent_ref', g.agent_ref),
    class_code = coalesce(p_patch->>'class_code', g.class_code),
    quota_code = coalesce(p_patch->>'quota_code', g.quota_code),
    boarding_station_code = coalesce(p_patch->>'boarding_station_code', g.boarding_station_code),
    reservation_upto_station_code = coalesce(p_patch->>'reservation_upto_station_code', g.reservation_upto_station_code),
    group_size_target = coalesce((p_patch->>'group_size_target')::int, g.group_size_target),
    incharge_registration_id = coalesce((p_patch->>'incharge_registration_id')::uuid, g.incharge_registration_id)
  where g.id = p_id;
end$$;

create or replace function public.fn_upsert_co_travel_group_member(
  p_group_id uuid,
  p_registration_id uuid,
  p_patch jsonb
) returns void
language plpgsql
as $$
begin
  insert into public.yatra_co_travel_group_members (
    group_id,
    registration_id,
    seat_no,
    berth_no,
    coach_no,
    passenger_name_on_ticket,
    passenger_age_on_ticket,
    passenger_gender,
    berth_type,
    ticket_status,
    wl_rac_no,
    meal_pref,
    senior_citizen,
    ticket_number,
    cabin_class,
    baggage_allowance_kg,
    ssr_notes
  ) values (
    p_group_id,
    p_registration_id,
    p_patch->>'seat_no',
    p_patch->>'berth_no',
    p_patch->>'coach_no',
    p_patch->>'passenger_name_on_ticket',
    (p_patch->>'passenger_age_on_ticket')::int,
    (p_patch->>'passenger_gender')::passenger_gender,
    (p_patch->>'berth_type')::berth_type,
    (p_patch->>'ticket_status')::ticket_status,
    p_patch->>'wl_rac_no',
    (p_patch->>'meal_pref')::meal_pref,
    coalesce((p_patch->>'senior_citizen')::boolean, false),
    p_patch->>'ticket_number',
    p_patch->>'cabin_class',
    (p_patch->>'baggage_allowance_kg')::numeric,
    p_patch->>'ssr_notes'
  )
  on conflict (group_id, registration_id) do update
  set
    seat_no = coalesce(excluded.seat_no, yatra_co_travel_group_members.seat_no),
    berth_no = coalesce(excluded.berth_no, yatra_co_travel_group_members.berth_no),
    coach_no = coalesce(excluded.coach_no, yatra_co_travel_group_members.coach_no),
    passenger_name_on_ticket = coalesce(excluded.passenger_name_on_ticket, yatra_co_travel_group_members.passenger_name_on_ticket),
    passenger_age_on_ticket = coalesce(excluded.passenger_age_on_ticket, yatra_co_travel_group_members.passenger_age_on_ticket),
    passenger_gender = coalesce(excluded.passenger_gender, yatra_co_travel_group_members.passenger_gender),
    berth_type = coalesce(excluded.berth_type, yatra_co_travel_group_members.berth_type),
    ticket_status = coalesce(excluded.ticket_status, yatra_co_travel_group_members.ticket_status),
    wl_rac_no = coalesce(excluded.wl_rac_no, yatra_co_travel_group_members.wl_rac_no),
    meal_pref = coalesce(excluded.meal_pref, yatra_co_travel_group_members.meal_pref),
    senior_citizen = coalesce(excluded.senior_citizen, yatra_co_travel_group_members.senior_citizen),
    ticket_number = coalesce(excluded.ticket_number, yatra_co_travel_group_members.ticket_number),
    cabin_class = coalesce(excluded.cabin_class, yatra_co_travel_group_members.cabin_class),
    baggage_allowance_kg = coalesce(excluded.baggage_allowance_kg, yatra_co_travel_group_members.baggage_allowance_kg),
    ssr_notes = coalesce(excluded.ssr_notes, yatra_co_travel_group_members.ssr_notes);
end$$;

create or replace function public.fn_set_group_incharge(
  p_group_id uuid,
  p_registration_id uuid
) returns void
language plpgsql
as $$
begin
  update public.yatra_co_travel_groups
  set incharge_registration_id = p_registration_id
  where id = p_group_id;
end$$;

create or replace function public.fn_set_train_coach_incharge(
  p_trip_id uuid,
  p_coach_no text,
  p_registration_id uuid
) returns void
language plpgsql
as $$
begin
  insert into public.yatra_train_coaches (trip_id, coach_no, coach_incharge_registration_id)
  values (p_trip_id, p_coach_no, p_registration_id)
  on conflict (trip_id, coach_no) do update
    set coach_incharge_registration_id = excluded.coach_incharge_registration_id;
end$$;

create or replace function public.fn_create_hotel(
  p_name text,
  p_type text,
  p_city text,
  p_address text
) returns uuid
language plpgsql
as $$
declare new_id uuid;
begin
  insert into public.yatra_hotels (name, type, city, address)
  values (p_name, p_type, p_city, p_address)
  returning id into new_id;
  return new_id;
end$$;

create or replace function public.fn_create_hotel_room(
  p_hotel_id uuid,
  p_room_no text,
  p_base_capacity int,
  p_extra_beds_max int
) returns uuid
language plpgsql
as $$
declare new_id uuid;
begin
  insert into public.yatra_hotel_rooms (hotel_id, room_no, base_capacity, extra_beds_max)
  values (p_hotel_id, p_room_no, p_base_capacity, coalesce(p_extra_beds_max, 0))
  returning id into new_id;
  return new_id;
end$$;

create or replace function public.fn_assign_room_stay(
  p_room_id uuid,
  p_registration_id uuid,
  p_stay_from date default null,
  p_stay_to date default null,
  p_allow_overflow boolean default false
) returns void
language plpgsql
as $$
declare
  capacity_total int;
  current_count int;
begin
  select (base_capacity + extra_beds_max)
  into capacity_total
  from public.yatra_hotel_rooms
  where id = p_room_id;

  if capacity_total is null then
    raise exception 'Room not found';
  end if;

  select count(*)
  into current_count
  from public.yatra_room_stays
  where room_id = p_room_id;

  if not p_allow_overflow and current_count >= capacity_total then
    raise exception 'Room capacity exceeded';
  end if;

  insert into public.yatra_room_stays (room_id, registration_id, stay_from, stay_to)
  values (p_room_id, p_registration_id, p_stay_from, p_stay_to);
end$$;

create or replace function public.fn_set_room_incharge(
  p_room_id uuid,
  p_registration_id uuid
) returns void
language plpgsql
as $$
begin
  insert into public.yatra_room_incharges (room_id, registration_id)
  values (p_room_id, p_registration_id)
  on conflict (room_id) do update
    set registration_id = excluded.registration_id;
end$$;

create or replace function public.fn_set_hotel_incharge(
  p_hotel_id uuid,
  p_registration_id uuid
) returns void
language plpgsql
as $$
begin
  insert into public.yatra_hotel_incharges (hotel_id, registration_id)
  values (p_hotel_id, p_registration_id)
  on conflict (hotel_id) do update
    set registration_id = excluded.registration_id;
end$$;

create or replace function public.fn_create_booking_task(
  p_task_type booking_task_type,
  p_trip_id uuid default null,
  p_group_id uuid default null,
  p_hotel_id uuid default null,
  p_room_id uuid default null,
  p_booking_agent_user_id uuid default null,
  p_booking_agent_registration_id uuid default null,
  p_notes text default null
) returns uuid
language plpgsql
as $$
declare new_id uuid;
begin
  insert into public.yatra_booking_tasks (
    task_type,
    trip_id,
    group_id,
    hotel_id,
    room_id,
    booking_agent_user_id,
    booking_agent_registration_id,
    notes
  ) values (
    p_task_type,
    p_trip_id,
    p_group_id,
    p_hotel_id,
    p_room_id,
    p_booking_agent_user_id,
    p_booking_agent_registration_id,
    p_notes
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
    photo_url,
    health_none,
    health_heart,
    health_bp,
    health_diabetes,
    health_asthma,
    health_other,
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
      or r.photo_url is null or btrim(r.photo_url) = ''
      or coalesce(btrim(r.accompanying_name), '') = ''
      or coalesce(btrim(r.accompanying_guardian_name), '') = ''
      or coalesce(btrim(r.accompanying_resident_of), '') = ''
      or coalesce(btrim(r.accompanying_phone), '') = ''
      or (r.travel_mode = 'train' and coalesce(btrim(r.train_class), '') = '')
      or not (
        coalesce(r.health_none, false)
        or coalesce(r.health_heart, false)
        or coalesce(r.health_bp, false)
        or coalesce(r.health_diabetes, false)
        or coalesce(r.health_asthma, false)
        or (r.health_other is not null and btrim(r.health_other) <> '')
      )
    then
      raise exception 'Registration is missing mandatory fields for %', p_target_status;
    end if;
  end if;
end$$;

create or replace function public.fn_report_city_counts()
returns table(city text, total int)
language sql
stable
as $$
  select
    coalesce(nullif(btrim(address_city), ''), 'Unknown') as city,
    count(*)::int as total
  from public.yatra_registrations
  group by 1
  order by total desc, city;
$$;

create or replace function public.fn_report_district_counts()
returns table(district text, total int)
language sql
stable
as $$
  select
    coalesce(nullif(btrim(address_district), ''), 'Unknown') as district,
    count(*)::int as total
  from public.yatra_registrations
  group by 1
  order by total desc, district;
$$;

create or replace function public.fn_report_travel_members(
  p_mode travel_mode default null,
  p_train_no text default null,
  p_flight_no text default null,
  p_coach_no text default null,
  p_class_code text default null
) returns table(
  registration_id uuid,
  name_hi text,
  phone text,
  trip_id uuid,
  trip_name text,
  journey_date date,
  mode travel_mode,
  train_no text,
  flight_no text,
  group_id uuid,
  group_code text,
  coach_no text,
  seat_no text,
  berth_no text,
  class_code text,
  ticket_status ticket_status
)
language sql
stable
as $$
  select
    r.id,
    r.name_hi,
    r.phone,
    t.id as trip_id,
    t.trip_name,
    t.journey_date,
    t.mode,
    t.train_no,
    t.flight_no,
    g.id as group_id,
    g.group_code,
    m.coach_no,
    m.seat_no,
    m.berth_no,
    coalesce(g.class_code, t.default_class_code) as class_code,
    m.ticket_status
  from public.yatra_co_travel_group_members m
  join public.yatra_co_travel_groups g on g.id = m.group_id
  join public.yatra_trips t on t.id = g.trip_id
  join public.yatra_registrations r on r.id = m.registration_id
  where (p_mode is null or t.mode = p_mode)
    and (p_train_no is null or t.train_no = p_train_no)
    and (p_flight_no is null or t.flight_no = p_flight_no)
    and (p_coach_no is null or m.coach_no = p_coach_no)
    and (p_class_code is null or coalesce(g.class_code, t.default_class_code) = p_class_code)
  order by t.journey_date desc, g.group_code, r.name_hi;
$$;

create or replace function public.fn_report_hotel_stays()
returns table(
  registration_id uuid,
  name_hi text,
  phone text,
  hotel_id uuid,
  hotel_name text,
  room_id uuid,
  room_no text,
  stay_from date,
  stay_to date
)
language sql
stable
as $$
  select
    r.id,
    r.name_hi,
    r.phone,
    h.id as hotel_id,
    h.name as hotel_name,
    hr.id as room_id,
    hr.room_no,
    rs.stay_from,
    rs.stay_to
  from public.yatra_room_stays rs
  join public.yatra_hotel_rooms hr on hr.id = rs.room_id
  join public.yatra_hotels h on h.id = hr.hotel_id
  join public.yatra_registrations r on r.id = rs.registration_id
  order by h.name, hr.room_no, r.name_hi;
$$;

create or replace function public.fn_id_card_data(p_registration_ids uuid[] default null)
returns table(
  registration_id uuid,
  name_hi text,
  father_name_hi text,
  phone text,
  emergency_contact_phone text,
  photo_url text,
  accompanying_name text,
  accompanying_phone text,
  accompanying_resident_of text,
  trip_id uuid,
  train_no text,
  flight_no text,
  coach_no text,
  seat_no text,
  berth_no text,
  hotel_name text,
  room_no text
)
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  if (auth.jwt() ->> 'role') not in ('reviewer', 'admin') then
    raise exception 'Not authorized';
  end if;

  return query
  select
    r.id,
    r.name_hi,
    r.father_name_hi,
    r.phone,
    r.emergency_contact_phone,
    r.photo_url,
    r.accompanying_name,
    r.accompanying_phone,
    r.accompanying_resident_of,
    travel.trip_id,
    travel.train_no,
    travel.flight_no,
    travel.coach_no,
    travel.seat_no,
    travel.berth_no,
    hotel.hotel_name,
    hotel.room_no
  from public.yatra_registrations r
  left join lateral (
    select
      t.id as trip_id,
      t.train_no,
      t.flight_no,
      m.coach_no,
      m.seat_no,
      m.berth_no
    from public.yatra_co_travel_group_members m
    join public.yatra_co_travel_groups g on g.id = m.group_id
    join public.yatra_trips t on t.id = g.trip_id
    where m.registration_id = r.id
    order by t.journey_date desc nulls last, t.depart_at desc nulls last, g.created_at desc
    limit 1
  ) travel on true
  left join lateral (
    select
      h.name as hotel_name,
      hr.room_no
    from public.yatra_room_stays rs
    join public.yatra_hotel_rooms hr on hr.id = rs.room_id
    join public.yatra_hotels h on h.id = hr.hotel_id
    where rs.registration_id = r.id
    order by rs.stay_from desc nulls last, rs.created_at desc
    limit 1
  ) hotel on true
  where (p_registration_ids is null or r.id = any(p_registration_ids));
end$$;

-- ---------------------------------------------------------------------
-- Update registration patch function for new fields
-- ---------------------------------------------------------------------
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
    category_id = coalesce((p_patch->>'category_id')::uuid, r.category_id)
  where r.id = p_id;

  if p_patch ? 'status' then
    perform public.fn_assert_registration_ready(p_id, (p_patch->>'status')::reg_status);
  end if;
end$$;

-- Update create review to block approve if mandatory fields missing
create or replace function public.fn_create_review(
  p_registration_id uuid,
  p_action text,
  p_diff jsonb,
  p_actor uuid
) returns uuid
language plpgsql
as $$
declare rid uuid;
begin
  if p_action = 'approve' then
    perform public.fn_assert_registration_ready(p_registration_id, 'approved'::reg_status);
  end if;

  insert into public.yatra_reviews (registration_id, action, diff, actor)
  values (p_registration_id, p_action, p_diff, p_actor)
  returning id into rid;

  -- optional: auto-update status on approve/reject
  if p_action = 'approve' then
    update public.yatra_registrations set status = 'approved' where id = p_registration_id;
  elsif p_action = 'reject' then
    update public.yatra_registrations set status = 'rejected' where id = p_registration_id;
  end if;

  return rid;
end$$;

commit;


-- =====================================================================
-- Migration: supabase/migrations/20260107_master_data.sql
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- Master data enums
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'trip_kind') then
    create type trip_kind as enum ('outbound', 'return', 'other');
  end if;
end$$;

-- ---------------------------------------------------------------------
-- Master stations
-- ---------------------------------------------------------------------
create table if not exists public.master_stations (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  state text,
  created_at timestamptz not null default now()
);

create index if not exists idx_master_stations_name on public.master_stations(name);

-- ---------------------------------------------------------------------
-- Master trains
-- ---------------------------------------------------------------------
create table if not exists public.master_trains (
  id uuid primary key default gen_random_uuid(),
  train_no text not null unique,
  train_name text not null,
  source_station_code text not null references public.master_stations(code) on update cascade,
  destination_station_code text not null references public.master_stations(code) on update cascade,
  typical_duration_minutes int,
  created_at timestamptz not null default now()
);

create index if not exists idx_master_trains_train_no on public.master_trains(train_no);

-- ---------------------------------------------------------------------
-- Master train stops
-- ---------------------------------------------------------------------
create table if not exists public.master_train_stops (
  id uuid primary key default gen_random_uuid(),
  train_id uuid not null references public.master_trains(id) on delete cascade,
  stop_seq int not null,
  station_code text not null references public.master_stations(code) on update cascade,
  distance_km int,
  arrive_time time,
  depart_time time,
  day_offset int,
  halt_minutes int,
  created_at timestamptz not null default now(),
  constraint master_train_stops_unique unique (train_id, stop_seq)
);

create index if not exists idx_master_train_stops_train_id on public.master_train_stops(train_id);
create index if not exists idx_master_train_stops_station_code on public.master_train_stops(station_code);

-- ---------------------------------------------------------------------
-- Extend trip instances
-- ---------------------------------------------------------------------
alter table public.yatra_trips
  add column if not exists trip_kind trip_kind not null default 'other',
  add column if not exists train_master_id uuid;

alter table public.yatra_trips
  drop constraint if exists yatra_trips_train_master_id_fkey,
  add constraint yatra_trips_train_master_id_fkey
    foreign key (train_master_id) references public.master_trains(id) on delete set null;

alter table public.yatra_trips
  drop constraint if exists yatra_trips_from_station_code_fkey,
  add constraint yatra_trips_from_station_code_fkey
    foreign key (from_station_code) references public.master_stations(code) on update cascade not valid;

alter table public.yatra_trips
  drop constraint if exists yatra_trips_to_station_code_fkey,
  add constraint yatra_trips_to_station_code_fkey
    foreign key (to_station_code) references public.master_stations(code) on update cascade not valid;

create index if not exists idx_yatra_trips_train_master_id on public.yatra_trips(train_master_id);

-- ---------------------------------------------------------------------
-- Default approval for admin-created registrations
-- ---------------------------------------------------------------------
alter table public.yatra_registrations
  alter column status set default 'approved';

create or replace function public.fn_set_registration_default_status()
returns trigger
language plpgsql
as $$
declare
  is_ready boolean;
begin
  is_ready := coalesce(btrim(new.name_hi), '') <> ''
    and coalesce(btrim(new.father_name_hi), '') <> ''
    and coalesce(btrim(new.address_hi), '') <> ''
    and coalesce(btrim(new.aadhaar_no), '') <> ''
    and coalesce(btrim(new.phone), '') <> ''
    and coalesce(btrim(new.whatsapp), '') <> ''
    and new.dob is not null
    and new.age_years is not null
    and new.travel_mode is not null
    and new.reservation_by is not null
    and new.photo_url is not null and btrim(new.photo_url) <> ''
    and coalesce(btrim(new.accompanying_name), '') <> ''
    and coalesce(btrim(new.accompanying_guardian_name), '') <> ''
    and coalesce(btrim(new.accompanying_resident_of), '') <> ''
    and coalesce(btrim(new.accompanying_phone), '') <> ''
    and (new.travel_mode <> 'train' or coalesce(btrim(new.train_class), '') <> '')
    and (
      coalesce(new.health_none, false)
      or coalesce(new.health_heart, false)
      or coalesce(new.health_bp, false)
      or coalesce(new.health_diabetes, false)
      or coalesce(new.health_asthma, false)
      or (new.health_other is not null and btrim(new.health_other) <> '')
    );

  if (auth.jwt() ->> 'role') in ('reviewer', 'admin') and is_ready then
    new.status := 'approved';
  else
    new.status := 'submitted'::reg_status;
  end if;
  return new;
end$$;

drop trigger if exists trg_set_registration_default_status on public.yatra_registrations;
create trigger trg_set_registration_default_status
before insert on public.yatra_registrations
for each row
execute function public.fn_set_registration_default_status();

-- ---------------------------------------------------------------------
-- Sync master data into trip instances
-- ---------------------------------------------------------------------
create or replace function public.fn_sync_trip_master_data()
returns trigger
language plpgsql
as $$
declare
  master_rec record;
begin
  if new.train_master_id is null then
    return new;
  end if;

  select train_no, train_name, source_station_code, destination_station_code
  into master_rec
  from public.master_trains
  where id = new.train_master_id;

  if master_rec is null then
    return new;
  end if;

  if new.mode = 'train' then
    if coalesce(btrim(new.train_no), '') = '' then
      new.train_no := master_rec.train_no;
    end if;
    if coalesce(btrim(new.train_name), '') = '' then
      new.train_name := master_rec.train_name;
    end if;
    if coalesce(btrim(new.from_station_code), '') = '' then
      new.from_station_code := master_rec.source_station_code;
    end if;
    if coalesce(btrim(new.to_station_code), '') = '' then
      new.to_station_code := master_rec.destination_station_code;
    end if;
  end if;

  return new;
end$$;

drop trigger if exists trg_sync_trip_master_data on public.yatra_trips;
create trigger trg_sync_trip_master_data
before insert or update of train_master_id, mode, train_no, train_name, from_station_code, to_station_code
on public.yatra_trips
for each row
execute function public.fn_sync_trip_master_data();

-- ---------------------------------------------------------------------
-- RLS for master tables
-- ---------------------------------------------------------------------
alter table public.master_stations enable row level security;
alter table public.master_trains enable row level security;
alter table public.master_train_stops enable row level security;

drop policy if exists "staff manage master stations" on public.master_stations;
create policy "staff manage master stations" on public.master_stations
for all using ((auth.jwt() ->> 'role') in ('reviewer', 'admin'))
with check ((auth.jwt() ->> 'role') in ('reviewer', 'admin'));

drop policy if exists "staff manage master trains" on public.master_trains;
create policy "staff manage master trains" on public.master_trains
for all using ((auth.jwt() ->> 'role') in ('reviewer', 'admin'))
with check ((auth.jwt() ->> 'role') in ('reviewer', 'admin'));

drop policy if exists "staff manage master train stops" on public.master_train_stops;
create policy "staff manage master train stops" on public.master_train_stops
for all using ((auth.jwt() ->> 'role') in ('reviewer', 'admin'))
with check ((auth.jwt() ->> 'role') in ('reviewer', 'admin'));

-- ---------------------------------------------------------------------
-- RPCs for master data
-- ---------------------------------------------------------------------
create or replace function public.admin_upsert_train_stops(
  p_train_no text,
  p_stops jsonb
) returns int
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  train_id uuid;
  stop jsonb;
  station_code text;
  station_name text;
  stop_seq_value int;
  upserted int := 0;
begin
  if (auth.jwt() ->> 'role') not in ('reviewer', 'admin') then
    raise exception 'Not authorized';
  end if;

  select id into train_id from public.master_trains where train_no = p_train_no;
  if train_id is null then
    raise exception 'Train not found';
  end if;

  if p_stops is null then
    return 0;
  end if;

  for stop in select * from jsonb_array_elements(p_stops)
  loop
    stop_seq_value := nullif(stop->>'stop_seq', '')::int;
    station_code := upper(coalesce(nullif(btrim(stop->>'station_code'), ''), ''));
    station_name := nullif(btrim(stop->>'station_name'), '');

    if stop_seq_value is null or station_code = '' then
      continue;
    end if;

    if not exists (select 1 from public.master_stations where code = station_code) then
      insert into public.master_stations (code, name)
      values (station_code, coalesce(station_name, station_code));
    end if;

    insert into public.master_train_stops (
      train_id,
      stop_seq,
      station_code,
      distance_km,
      arrive_time,
      depart_time,
      day_offset,
      halt_minutes
    ) values (
      train_id,
      stop_seq_value,
      station_code,
      nullif(stop->>'distance_km', '')::int,
      nullif(stop->>'arrive_time', '')::time,
      nullif(stop->>'depart_time', '')::time,
      nullif(stop->>'day_offset', '')::int,
      nullif(stop->>'halt_minutes', '')::int
    )
    on conflict (train_id, stop_seq) do update
      set
        station_code = excluded.station_code,
        distance_km = excluded.distance_km,
        arrive_time = excluded.arrive_time,
        depart_time = excluded.depart_time,
        day_offset = excluded.day_offset,
        halt_minutes = excluded.halt_minutes;

    upserted := upserted + 1;
  end loop;

  return upserted;
end$$;

create or replace function public.admin_create_trip_from_master(
  p_train_no text,
  p_journey_date date,
  p_trip_kind trip_kind default 'other'
) returns uuid
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  train_rec record;
  first_stop record;
  last_stop record;
  depart_ts timestamptz;
  arrive_ts timestamptz;
  new_id uuid;
begin
  if (auth.jwt() ->> 'role') not in ('reviewer', 'admin') then
    raise exception 'Not authorized';
  end if;

  select * into train_rec from public.master_trains where train_no = p_train_no;
  if train_rec is null then
    raise exception 'Train not found';
  end if;

  select * into first_stop
  from public.master_train_stops
  where train_id = train_rec.id
  order by stop_seq asc
  limit 1;

  select * into last_stop
  from public.master_train_stops
  where train_id = train_rec.id
  order by stop_seq desc
  limit 1;

  if first_stop.depart_time is not null then
    depart_ts := (p_journey_date + coalesce(first_stop.day_offset, 0) + first_stop.depart_time)::timestamptz;
  end if;

  if last_stop.arrive_time is not null then
    arrive_ts := (p_journey_date + coalesce(last_stop.day_offset, 0) + last_stop.arrive_time)::timestamptz;
  end if;

  insert into public.yatra_trips (
    mode,
    trip_kind,
    trip_name,
    journey_date,
    depart_at,
    arrive_at,
    train_master_id,
    train_no,
    train_name,
    from_station_code,
    to_station_code
  ) values (
    'train',
    coalesce(p_trip_kind, 'other'::trip_kind),
    format('%s %s', train_rec.train_no, train_rec.train_name),
    p_journey_date,
    depart_ts,
    arrive_ts,
    train_rec.id,
    train_rec.train_no,
    train_rec.train_name,
    train_rec.source_station_code,
    train_rec.destination_station_code
  )
  returning id into new_id;

  return new_id;
end$$;

-- ---------------------------------------------------------------------
-- Seed stations and master trains
-- ---------------------------------------------------------------------
insert into public.master_stations (code, name, state)
values
  ('AII', 'Ajmer Jn', 'RJ'),
  ('PURI', 'Puri', 'OD'),
  ('KUR', 'Khurda Road Jn', 'OD'),
  ('BBS', 'Bhubaneswar', 'OD'),
  ('NGP', 'Nagpur', 'MH'),
  ('ADI', 'Ahmedabad Jn', 'GJ'),
  ('BRC', 'Vadodara Jn', 'GJ'),
  ('ST', 'Surat', 'GJ'),
  ('NDB', 'Nandurbar', 'MH')
on conflict (code) do update
set name = excluded.name,
    state = excluded.state;

insert into public.master_trains (
  train_no,
  train_name,
  source_station_code,
  destination_station_code,
  typical_duration_minutes
) values
  ('20824', 'AII PURI EXP', 'AII', 'PURI', 2610),
  ('20823', 'PURI AJMER EXP', 'PURI', 'AII', 2615)
on conflict (train_no) do update
set train_name = excluded.train_name,
    source_station_code = excluded.source_station_code,
    destination_station_code = excluded.destination_station_code,
    typical_duration_minutes = excluded.typical_duration_minutes;

insert into public.master_train_stops (
  train_id,
  stop_seq,
  station_code,
  arrive_time,
  depart_time,
  day_offset
)
select id, 1, 'AII', null, '19:10', 0
from public.master_trains
where train_no = '20824'
on conflict (train_id, stop_seq) do update
set station_code = excluded.station_code,
    arrive_time = excluded.arrive_time,
    depart_time = excluded.depart_time,
    day_offset = excluded.day_offset;

insert into public.master_train_stops (
  train_id,
  stop_seq,
  station_code,
  arrive_time,
  depart_time,
  day_offset
)
select id, 2, 'PURI', '14:40', null, 2
from public.master_trains
where train_no = '20824'
on conflict (train_id, stop_seq) do update
set station_code = excluded.station_code,
    arrive_time = excluded.arrive_time,
    depart_time = excluded.depart_time,
    day_offset = excluded.day_offset;

insert into public.master_train_stops (
  train_id,
  stop_seq,
  station_code,
  arrive_time,
  depart_time,
  day_offset
)
select id, 1, 'PURI', null, '23:05', 0
from public.master_trains
where train_no = '20823'
on conflict (train_id, stop_seq) do update
set station_code = excluded.station_code,
    arrive_time = excluded.arrive_time,
    depart_time = excluded.depart_time,
    day_offset = excluded.day_offset;

insert into public.master_train_stops (
  train_id,
  stop_seq,
  station_code,
  arrive_time,
  depart_time,
  day_offset
)
select id, 2, 'AII', '18:40', null, 2
from public.master_trains
where train_no = '20823'
on conflict (train_id, stop_seq) do update
set station_code = excluded.station_code,
    arrive_time = excluded.arrive_time,
    depart_time = excluded.depart_time,
    day_offset = excluded.day_offset;

insert into public.yatra_categories (name, whatsapp_group_ref)
values
  ('Family', null),
  ('Relative', null),
  ('Morning Tea club', null),
  ('Katha', null),
  ('SFS-1', null),
  ('SFS-2', null)
on conflict (name) do nothing;

commit;


-- =====================================================================
-- Migration: supabase/migrations/20260108_staff_role_policies.sql
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- Role helpers (JWT app_metadata + profiles fallback)
-- ---------------------------------------------------------------------
create or replace function public.fn_has_role(p_roles text[])
returns boolean
language sql
stable
as $$
  select
    coalesce((auth.jwt() ->> 'role') = any(p_roles), false)
    or coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = any(p_roles), false)
    or coalesce((auth.jwt() -> 'user_metadata' ->> 'role') = any(p_roles), false)
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role::text = any(p_roles)
    );
$$;

create or replace function public.fn_is_staff()
returns boolean
language sql
stable
as $$
  select public.fn_has_role(array['reviewer','admin']);
$$;

-- ---------------------------------------------------------------------
-- Update role-gated functions
-- ---------------------------------------------------------------------
create or replace function public.fn_set_registration_default_status()
returns trigger
language plpgsql
as $$
declare
  is_ready boolean;
begin
  is_ready := coalesce(btrim(new.name_hi), '') <> ''
    and coalesce(btrim(new.father_name_hi), '') <> ''
    and coalesce(btrim(new.address_hi), '') <> ''
    and coalesce(btrim(new.aadhaar_no), '') <> ''
    and coalesce(btrim(new.phone), '') <> ''
    and coalesce(btrim(new.whatsapp), '') <> ''
    and new.dob is not null
    and new.age_years is not null
    and new.travel_mode is not null
    and new.reservation_by is not null
    and new.photo_url is not null and btrim(new.photo_url) <> ''
    and coalesce(btrim(new.accompanying_name), '') <> ''
    and coalesce(btrim(new.accompanying_guardian_name), '') <> ''
    and coalesce(btrim(new.accompanying_resident_of), '') <> ''
    and coalesce(btrim(new.accompanying_phone), '') <> ''
    and (new.travel_mode <> 'train' or coalesce(btrim(new.train_class), '') <> '')
    and (
      coalesce(new.health_none, false)
      or coalesce(new.health_heart, false)
      or coalesce(new.health_bp, false)
      or coalesce(new.health_diabetes, false)
      or coalesce(new.health_asthma, false)
      or (new.health_other is not null and btrim(new.health_other) <> '')
    );

  if public.fn_is_staff() and is_ready then
    new.status := 'approved';
  else
    new.status := 'submitted'::reg_status;
  end if;
  return new;
end$$;

create or replace function public.admin_upsert_train_stops(
  p_train_no text,
  p_stops jsonb
) returns int
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  train_id uuid;
  stop jsonb;
  station_code text;
  station_name text;
  stop_seq_value int;
  upserted int := 0;
begin
  if not public.fn_is_staff() then
    raise exception 'Not authorized';
  end if;

  select id into train_id from public.master_trains where train_no = p_train_no;
  if train_id is null then
    raise exception 'Train not found';
  end if;

  if p_stops is null then
    return 0;
  end if;

  for stop in select * from jsonb_array_elements(p_stops)
  loop
    stop_seq_value := nullif(stop->>'stop_seq', '')::int;
    station_code := upper(coalesce(nullif(btrim(stop->>'station_code'), ''), ''));
    station_name := nullif(btrim(stop->>'station_name'), '');

    if stop_seq_value is null or station_code = '' then
      continue;
    end if;

    if not exists (select 1 from public.master_stations where code = station_code) then
      insert into public.master_stations (code, name)
      values (station_code, coalesce(station_name, station_code));
    end if;

    insert into public.master_train_stops (
      train_id,
      stop_seq,
      station_code,
      distance_km,
      arrive_time,
      depart_time,
      day_offset,
      halt_minutes
    ) values (
      train_id,
      stop_seq_value,
      station_code,
      nullif(stop->>'distance_km', '')::int,
      nullif(stop->>'arrive_time', '')::time,
      nullif(stop->>'depart_time', '')::time,
      nullif(stop->>'day_offset', '')::int,
      nullif(stop->>'halt_minutes', '')::int
    )
    on conflict (train_id, stop_seq) do update
      set
        station_code = excluded.station_code,
        distance_km = excluded.distance_km,
        arrive_time = excluded.arrive_time,
        depart_time = excluded.depart_time,
        day_offset = excluded.day_offset,
        halt_minutes = excluded.halt_minutes;

    upserted := upserted + 1;
  end loop;

  return upserted;
end$$;

create or replace function public.admin_create_trip_from_master(
  p_train_no text,
  p_journey_date date,
  p_trip_kind trip_kind default 'other'
) returns uuid
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  train_rec record;
  first_stop record;
  last_stop record;
  depart_ts timestamptz;
  arrive_ts timestamptz;
  new_id uuid;
begin
  if not public.fn_is_staff() then
    raise exception 'Not authorized';
  end if;

  select * into train_rec from public.master_trains where train_no = p_train_no;
  if train_rec is null then
    raise exception 'Train not found';
  end if;

  select * into first_stop
  from public.master_train_stops
  where train_id = train_rec.id
  order by stop_seq asc
  limit 1;

  select * into last_stop
  from public.master_train_stops
  where train_id = train_rec.id
  order by stop_seq desc
  limit 1;

  if first_stop.depart_time is not null then
    depart_ts := (p_journey_date + coalesce(first_stop.day_offset, 0) + first_stop.depart_time)::timestamptz;
  end if;

  if last_stop.arrive_time is not null then
    arrive_ts := (p_journey_date + coalesce(last_stop.day_offset, 0) + last_stop.arrive_time)::timestamptz;
  end if;

  insert into public.yatra_trips (
    mode,
    trip_kind,
    trip_name,
    journey_date,
    depart_at,
    arrive_at,
    train_master_id,
    train_no,
    train_name,
    from_station_code,
    to_station_code
  ) values (
    'train',
    coalesce(p_trip_kind, 'other'::trip_kind),
    format('%s %s', train_rec.train_no, train_rec.train_name),
    p_journey_date,
    depart_ts,
    arrive_ts,
    train_rec.id,
    train_rec.train_no,
    train_rec.train_name,
    train_rec.source_station_code,
    train_rec.destination_station_code
  )
  returning id into new_id;

  return new_id;
end$$;

create or replace function public.fn_id_card_data(p_registration_ids uuid[] default null)
returns table(
  registration_id uuid,
  name_hi text,
  father_name_hi text,
  phone text,
  emergency_contact_phone text,
  photo_url text,
  accompanying_name text,
  accompanying_phone text,
  accompanying_resident_of text,
  trip_id uuid,
  train_no text,
  flight_no text,
  coach_no text,
  seat_no text,
  berth_no text,
  hotel_name text,
  room_no text
)
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  if not public.fn_is_staff() then
    raise exception 'Not authorized';
  end if;

  return query
  select
    r.id,
    r.name_hi,
    r.father_name_hi,
    r.phone,
    r.emergency_contact_phone,
    r.photo_url,
    r.accompanying_name,
    r.accompanying_phone,
    r.accompanying_resident_of,
    travel.trip_id,
    travel.train_no,
    travel.flight_no,
    travel.coach_no,
    travel.seat_no,
    travel.berth_no,
    hotel.hotel_name,
    hotel.room_no
  from public.yatra_registrations r
  left join lateral (
    select
      t.id as trip_id,
      t.train_no,
      t.flight_no,
      m.coach_no,
      m.seat_no,
      m.berth_no
    from public.yatra_co_travel_group_members m
    join public.yatra_co_travel_groups g on g.id = m.group_id
    join public.yatra_trips t on t.id = g.trip_id
    where m.registration_id = r.id
    order by t.journey_date desc nulls last, t.depart_at desc nulls last, g.created_at desc
    limit 1
  ) travel on true
  left join lateral (
    select
      h.name as hotel_name,
      hr.room_no
    from public.yatra_room_stays rs
    join public.yatra_hotel_rooms hr on hr.id = rs.room_id
    join public.yatra_hotels h on h.id = hr.hotel_id
    where rs.registration_id = r.id
    order by rs.stay_from desc nulls last, rs.created_at desc
    limit 1
  ) hotel on true
  where p_registration_ids is null or r.id = any(p_registration_ids);
end$$;

-- ---------------------------------------------------------------------
-- Update staff/volunteer policies to use role helper
-- ---------------------------------------------------------------------
drop policy if exists "volunteer read created" on public.yatra_registrations;
create policy "volunteer read created" on public.yatra_registrations
for select using (
  public.fn_has_role(array['volunteer','reviewer','admin'])
  and auth.uid() = created_by
);

drop policy if exists "volunteer write created" on public.yatra_registrations;
create policy "volunteer write created" on public.yatra_registrations
for insert with check (
  public.fn_has_role(array['volunteer','reviewer','admin'])
  and auth.uid() = created_by
);

drop policy if exists "volunteer update created" on public.yatra_registrations;
create policy "volunteer update created" on public.yatra_registrations
for update using (
  public.fn_has_role(array['volunteer','reviewer','admin'])
  and auth.uid() = created_by
);

drop policy if exists "reviewers read all" on public.yatra_registrations;
create policy "reviewers read all" on public.yatra_registrations
for select using (public.fn_is_staff());

drop policy if exists "reviewers update all" on public.yatra_registrations;
create policy "reviewers update all" on public.yatra_registrations
for update using (public.fn_is_staff());

drop policy if exists "reviews read if owner or staff" on public.yatra_reviews;
create policy "reviews read if owner or staff" on public.yatra_reviews
for select using (
  public.fn_is_staff()
  or exists (
    select 1 from public.yatra_registrations r
    where r.id = yatra_reviews.registration_id and r.owner = auth.uid()
  )
);

drop policy if exists "reviews write staff" on public.yatra_reviews;
create policy "reviews write staff" on public.yatra_reviews
for insert with check (public.fn_is_staff());

drop policy if exists "staff manage categories" on public.yatra_categories;
create policy "staff manage categories" on public.yatra_categories
for all using (public.fn_is_staff())
with check (public.fn_is_staff());

drop policy if exists "staff manage trips" on public.yatra_trips;
create policy "staff manage trips" on public.yatra_trips
for all using (public.fn_is_staff())
with check (public.fn_is_staff());

drop policy if exists "staff manage travel groups" on public.yatra_co_travel_groups;
create policy "staff manage travel groups" on public.yatra_co_travel_groups
for all using (public.fn_is_staff())
with check (public.fn_is_staff());

drop policy if exists "staff manage travel group members" on public.yatra_co_travel_group_members;
create policy "staff manage travel group members" on public.yatra_co_travel_group_members
for all using (public.fn_is_staff())
with check (public.fn_is_staff());

drop policy if exists "staff manage train coaches" on public.yatra_train_coaches;
create policy "staff manage train coaches" on public.yatra_train_coaches
for all using (public.fn_is_staff())
with check (public.fn_is_staff());

drop policy if exists "staff manage hotels" on public.yatra_hotels;
create policy "staff manage hotels" on public.yatra_hotels
for all using (public.fn_is_staff())
with check (public.fn_is_staff());

drop policy if exists "staff manage hotel rooms" on public.yatra_hotel_rooms;
create policy "staff manage hotel rooms" on public.yatra_hotel_rooms
for all using (public.fn_is_staff())
with check (public.fn_is_staff());

drop policy if exists "staff manage room stays" on public.yatra_room_stays;
create policy "staff manage room stays" on public.yatra_room_stays
for all using (public.fn_is_staff())
with check (public.fn_is_staff());

drop policy if exists "staff manage room incharges" on public.yatra_room_incharges;
create policy "staff manage room incharges" on public.yatra_room_incharges
for all using (public.fn_is_staff())
with check (public.fn_is_staff());

drop policy if exists "staff manage hotel incharges" on public.yatra_hotel_incharges;
create policy "staff manage hotel incharges" on public.yatra_hotel_incharges
for all using (public.fn_is_staff())
with check (public.fn_is_staff());

drop policy if exists "staff manage booking tasks" on public.yatra_booking_tasks;
create policy "staff manage booking tasks" on public.yatra_booking_tasks
for all using (public.fn_is_staff())
with check (public.fn_is_staff());

drop policy if exists "staff manage volunteer roles" on public.volunteer_roles;
create policy "staff manage volunteer roles" on public.volunteer_roles
for all using (public.fn_is_staff())
with check (public.fn_is_staff());

drop policy if exists "staff manage volunteer role members" on public.volunteer_role_members;
create policy "staff manage volunteer role members" on public.volunteer_role_members
for all using (public.fn_is_staff())
with check (public.fn_is_staff());

drop policy if exists "staff manage master stations" on public.master_stations;
create policy "staff manage master stations" on public.master_stations
for all using (public.fn_is_staff())
with check (public.fn_is_staff());

drop policy if exists "staff manage master trains" on public.master_trains;
create policy "staff manage master trains" on public.master_trains
for all using (public.fn_is_staff())
with check (public.fn_is_staff());

drop policy if exists "staff manage master train stops" on public.master_train_stops;
create policy "staff manage master train stops" on public.master_train_stops
for all using (public.fn_is_staff())
with check (public.fn_is_staff());

drop policy if exists "staff read forms" on storage.objects;
create policy "staff read forms" on storage.objects
for select using (
  bucket_id in ('forms','photos') and public.fn_is_staff()
);

commit;


-- =====================================================================
-- Migration: supabase/migrations/20260109_hotel_code.sql
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- Auto hotel code
-- ---------------------------------------------------------------------
create sequence if not exists public.yatra_hotel_code_seq;

alter table public.yatra_hotels
  add column if not exists hotel_code text;

update public.yatra_hotels
set hotel_code = 'HOT-' || lpad(nextval('public.yatra_hotel_code_seq')::text, 4, '0')
where hotel_code is null or btrim(hotel_code) = '';

with max_code as (
  select max(nullif(regexp_replace(hotel_code, '\D', '', 'g'), '')::int) as value
  from public.yatra_hotels
)
select setval(
  'public.yatra_hotel_code_seq',
  coalesce((select value from max_code), 1),
  coalesce((select value from max_code), 0) > 0
);

create unique index if not exists idx_yatra_hotels_hotel_code on public.yatra_hotels(hotel_code);

alter table public.yatra_hotels
  alter column hotel_code set not null;

create or replace function public.fn_set_hotel_code()
returns trigger
language plpgsql
as $$
begin
  if new.hotel_code is null or btrim(new.hotel_code) = '' then
    new.hotel_code := 'HOT-' || lpad(nextval('public.yatra_hotel_code_seq')::text, 4, '0');
  end if;
  return new;
end$$;

drop trigger if exists trg_set_hotel_code on public.yatra_hotels;
create trigger trg_set_hotel_code
before insert on public.yatra_hotels
for each row
execute function public.fn_set_hotel_code();

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

  return new_id;
end$$;

commit;


-- =====================================================================
-- Migration: supabase/migrations/20260111_relax_registration_checks.sql
-- =====================================================================

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
  end if;
end$$;

commit;


-- =====================================================================
-- Address lookup seeds (generated from CSV)
-- =====================================================================

begin;

insert into public.address_states (id, name)
values
  ('AN', 'Andaman and Nicobar Islands'),
  ('AP', 'Andhra Pradesh'),
  ('AR', 'Arunachal Pradesh'),
  ('AS', 'Assam'),
  ('BR', 'Bihar'),
  ('CG', 'Chhattisgarh'),
  ('CH', 'Chandigarh'),
  ('DH', 'Dadra and Nagar Haveli and Daman and Diu'),
  ('DL', 'Delhi'),
  ('GA', 'Goa'),
  ('GJ', 'Gujarat'),
  ('HP', 'Himachal Pradesh'),
  ('HR', 'Haryana'),
  ('JH', 'Jharkhand'),
  ('JK', 'Jammu and Kashmir'),
  ('KA', 'Karnataka'),
  ('KL', 'Kerala'),
  ('LA', 'Ladakh'),
  ('LD', 'Lakshadweep'),
  ('MH', 'Maharashtra'),
  ('ML', 'Meghalaya'),
  ('MN', 'Manipur'),
  ('MP', 'Madhya Pradesh'),
  ('MZ', 'Mizoram'),
  ('NL', 'Nagaland'),
  ('OD', 'Odisha'),
  ('PB', 'Punjab'),
  ('PY', 'Puducherry'),
  ('RJ', 'Rajasthan'),
  ('SK', 'Sikkim'),
  ('TN', 'Tamil Nadu'),
  ('TR', 'Tripura'),
  ('TS', 'Telangana'),
  ('UK', 'Uttarakhand'),
  ('UP', 'Uttar Pradesh'),
  ('WB', 'West Bengal')
on conflict (id) do update
  set name = excluded.name;

insert into public.address_districts (id, state_id, name)
values
  ('AN-Nicobars', 'AN', 'Nicobars'),
  ('AN-North And Middle Andaman', 'AN', 'North And Middle Andaman'),
  ('AN-South Andamans', 'AN', 'South Andamans'),
  ('AP-Alluri Sitharama Raju', 'AP', 'Alluri Sitharama Raju'),
  ('AP-Anakapalli', 'AP', 'Anakapalli'),
  ('AP-Anantapur', 'AP', 'Anantapur'),
  ('AP-Ananthapuramu', 'AP', 'Ananthapuramu'),
  ('AP-Annamayya', 'AP', 'Annamayya'),
  ('AP-Bapatla', 'AP', 'Bapatla'),
  ('AP-Chittoor', 'AP', 'Chittoor'),
  ('AP-Dr. B.R. Ambedkar Konaseema', 'AP', 'Dr. B.R. Ambedkar Konaseema'),
  ('AP-East Godavari', 'AP', 'East Godavari'),
  ('AP-Eluru', 'AP', 'Eluru'),
  ('AP-Guntur', 'AP', 'Guntur'),
  ('AP-Kakinada', 'AP', 'Kakinada'),
  ('AP-Konaseema', 'AP', 'Konaseema'),
  ('AP-Krishna', 'AP', 'Krishna'),
  ('AP-Kurnool', 'AP', 'Kurnool'),
  ('AP-NTR', 'AP', 'NTR'),
  ('AP-Nandyal', 'AP', 'Nandyal'),
  ('AP-Nellore', 'AP', 'Nellore'),
  ('AP-Palnadu', 'AP', 'Palnadu'),
  ('AP-Parvathipuram Manyam', 'AP', 'Parvathipuram Manyam'),
  ('AP-Prakasam', 'AP', 'Prakasam'),
  ('AP-Spsr Nellore', 'AP', 'Spsr Nellore'),
  ('AP-Sri Sathya Sai', 'AP', 'Sri Sathya Sai'),
  ('AP-Srikakulam', 'AP', 'Srikakulam'),
  ('AP-Tirupati', 'AP', 'Tirupati'),
  ('AP-Visakhapatanam', 'AP', 'Visakhapatanam'),
  ('AP-Visakhapatnam', 'AP', 'Visakhapatnam'),
  ('AP-Vizianagaram', 'AP', 'Vizianagaram'),
  ('AP-West Godavari', 'AP', 'West Godavari'),
  ('AP-Y.S.R.', 'AP', 'Y.S.R.'),
  ('AP-YSR Kadapa', 'AP', 'YSR Kadapa'),
  ('AR-Anjaw', 'AR', 'Anjaw'),
  ('AR-Bichom', 'AR', 'Bichom'),
  ('AR-Changlang', 'AR', 'Changlang'),
  ('AR-Dibang Valley', 'AR', 'Dibang Valley'),
  ('AR-East Kameng', 'AR', 'East Kameng'),
  ('AR-East Siang', 'AR', 'East Siang'),
  ('AR-Kamle', 'AR', 'Kamle'),
  ('AR-Keyi Panyor', 'AR', 'Keyi Panyor'),
  ('AR-Kra Daadi', 'AR', 'Kra Daadi'),
  ('AR-Kurung Kumey', 'AR', 'Kurung Kumey'),
  ('AR-Lepa Rada', 'AR', 'Lepa Rada'),
  ('AR-Leparada', 'AR', 'Leparada'),
  ('AR-Lohit', 'AR', 'Lohit'),
  ('AR-Longding', 'AR', 'Longding'),
  ('AR-Lower Dibang Valley', 'AR', 'Lower Dibang Valley'),
  ('AR-Lower Siang', 'AR', 'Lower Siang'),
  ('AR-Lower Subansiri', 'AR', 'Lower Subansiri'),
  ('AR-Namsai', 'AR', 'Namsai'),
  ('AR-Pakke-Kessang', 'AR', 'Pakke-Kessang'),
  ('AR-Papum Pare', 'AR', 'Papum Pare'),
  ('AR-Shi Yomi', 'AR', 'Shi Yomi'),
  ('AR-Siang', 'AR', 'Siang'),
  ('AR-Tawang', 'AR', 'Tawang'),
  ('AR-Tirap', 'AR', 'Tirap'),
  ('AR-Upper Dibang Valley', 'AR', 'Upper Dibang Valley'),
  ('AR-Upper Siang', 'AR', 'Upper Siang'),
  ('AR-Upper Subansiri', 'AR', 'Upper Subansiri'),
  ('AR-West Kameng', 'AR', 'West Kameng'),
  ('AR-West Siang', 'AR', 'West Siang'),
  ('AS-Bajali', 'AS', 'Bajali'),
  ('AS-Baksa', 'AS', 'Baksa'),
  ('AS-Barpeta', 'AS', 'Barpeta'),
  ('AS-Biswanath', 'AS', 'Biswanath'),
  ('AS-Bongaigaon', 'AS', 'Bongaigaon'),
  ('AS-Cachar', 'AS', 'Cachar'),
  ('AS-Charaideo', 'AS', 'Charaideo'),
  ('AS-Chirang', 'AS', 'Chirang'),
  ('AS-Darrang', 'AS', 'Darrang'),
  ('AS-Dhemaji', 'AS', 'Dhemaji'),
  ('AS-Dhubri', 'AS', 'Dhubri'),
  ('AS-Dibrugarh', 'AS', 'Dibrugarh'),
  ('AS-Dima Hasao', 'AS', 'Dima Hasao'),
  ('AS-Goalpara', 'AS', 'Goalpara'),
  ('AS-Golaghat', 'AS', 'Golaghat'),
  ('AS-Hailakandi', 'AS', 'Hailakandi'),
  ('AS-Hojai', 'AS', 'Hojai'),
  ('AS-Jorhat', 'AS', 'Jorhat'),
  ('AS-Kamrup', 'AS', 'Kamrup'),
  ('AS-Kamrup Metro', 'AS', 'Kamrup Metro'),
  ('AS-Kamrup Metropolitan', 'AS', 'Kamrup Metropolitan'),
  ('AS-Karbi Anglong', 'AS', 'Karbi Anglong'),
  ('AS-Karimganj', 'AS', 'Karimganj'),
  ('AS-Kokrajhar', 'AS', 'Kokrajhar'),
  ('AS-Lakhimpur', 'AS', 'Lakhimpur'),
  ('AS-Majuli', 'AS', 'Majuli'),
  ('AS-Marigaon', 'AS', 'Marigaon'),
  ('AS-Morigaon', 'AS', 'Morigaon'),
  ('AS-Nagaon', 'AS', 'Nagaon'),
  ('AS-Nalbari', 'AS', 'Nalbari'),
  ('AS-Sivasagar', 'AS', 'Sivasagar'),
  ('AS-Sonitpur', 'AS', 'Sonitpur'),
  ('AS-South Salmara Mancachar', 'AS', 'South Salmara Mancachar'),
  ('AS-South Salmara-Mankachar', 'AS', 'South Salmara-Mankachar'),
  ('AS-Tamulpur', 'AS', 'Tamulpur'),
  ('AS-Tinsukia', 'AS', 'Tinsukia'),
  ('AS-Udalguri', 'AS', 'Udalguri'),
  ('AS-West Karbi Anglong', 'AS', 'West Karbi Anglong'),
  ('BR-Araria', 'BR', 'Araria'),
  ('BR-Arwal', 'BR', 'Arwal'),
  ('BR-Aurangabad', 'BR', 'Aurangabad'),
  ('BR-Banka', 'BR', 'Banka'),
  ('BR-Begusarai', 'BR', 'Begusarai'),
  ('BR-Bhagalpur', 'BR', 'Bhagalpur'),
  ('BR-Bhojpur', 'BR', 'Bhojpur'),
  ('BR-Buxar', 'BR', 'Buxar'),
  ('BR-Darbhanga', 'BR', 'Darbhanga'),
  ('BR-East Champaran', 'BR', 'East Champaran'),
  ('BR-Gaya', 'BR', 'Gaya'),
  ('BR-Gopalganj', 'BR', 'Gopalganj'),
  ('BR-Jamui', 'BR', 'Jamui'),
  ('BR-Jehanabad', 'BR', 'Jehanabad'),
  ('BR-Kaimur', 'BR', 'Kaimur'),
  ('BR-Kaimur (Bhabua)', 'BR', 'Kaimur (Bhabua)'),
  ('BR-Katihar', 'BR', 'Katihar'),
  ('BR-Khagaria', 'BR', 'Khagaria'),
  ('BR-Kishanganj', 'BR', 'Kishanganj'),
  ('BR-Lakhisarai', 'BR', 'Lakhisarai'),
  ('BR-Madhepura', 'BR', 'Madhepura'),
  ('BR-Madhubani', 'BR', 'Madhubani'),
  ('BR-Munger', 'BR', 'Munger'),
  ('BR-Muzaffarpur', 'BR', 'Muzaffarpur'),
  ('BR-Nalanda', 'BR', 'Nalanda'),
  ('BR-Nawada', 'BR', 'Nawada'),
  ('BR-Pashchim Champaran', 'BR', 'Pashchim Champaran'),
  ('BR-Patna', 'BR', 'Patna'),
  ('BR-Purbi Champaran', 'BR', 'Purbi Champaran'),
  ('BR-Purnia', 'BR', 'Purnia'),
  ('BR-Rohtas', 'BR', 'Rohtas'),
  ('BR-Saharsa', 'BR', 'Saharsa'),
  ('BR-Samastipur', 'BR', 'Samastipur'),
  ('BR-Saran', 'BR', 'Saran'),
  ('BR-Sheikhpura', 'BR', 'Sheikhpura'),
  ('BR-Sheohar', 'BR', 'Sheohar'),
  ('BR-Sitamarhi', 'BR', 'Sitamarhi'),
  ('BR-Siwan', 'BR', 'Siwan'),
  ('BR-Supaul', 'BR', 'Supaul'),
  ('BR-Vaishali', 'BR', 'Vaishali'),
  ('BR-West Champaran', 'BR', 'West Champaran'),
  ('CG-Balod', 'CG', 'Balod'),
  ('CG-Baloda Bazar', 'CG', 'Baloda Bazar'),
  ('CG-Balrampur', 'CG', 'Balrampur'),
  ('CG-Balrampur-Ramanujganj', 'CG', 'Balrampur-Ramanujganj'),
  ('CG-Bastar', 'CG', 'Bastar'),
  ('CG-Bemetara', 'CG', 'Bemetara'),
  ('CG-Bijapur', 'CG', 'Bijapur'),
  ('CG-Bilaspur', 'CG', 'Bilaspur'),
  ('CG-Dantewada', 'CG', 'Dantewada'),
  ('CG-Dhamtari', 'CG', 'Dhamtari'),
  ('CG-Durg', 'CG', 'Durg'),
  ('CG-Gariaband', 'CG', 'Gariaband'),
  ('CG-Gariyaband', 'CG', 'Gariyaband'),
  ('CG-Gaurela-Pendra-Marwahi', 'CG', 'Gaurela-Pendra-Marwahi'),
  ('CG-Gaurella Pendra Marwahi', 'CG', 'Gaurella Pendra Marwahi'),
  ('CG-Janjgir-Champa', 'CG', 'Janjgir-Champa'),
  ('CG-Jashpur', 'CG', 'Jashpur'),
  ('CG-Kabirdham', 'CG', 'Kabirdham'),
  ('CG-Kanker', 'CG', 'Kanker'),
  ('CG-Khairagarh-Chhuikhadan-Gandai', 'CG', 'Khairagarh-Chhuikhadan-Gandai'),
  ('CG-Kondagaon', 'CG', 'Kondagaon'),
  ('CG-Korba', 'CG', 'Korba'),
  ('CG-Korea', 'CG', 'Korea'),
  ('CG-Mahasamund', 'CG', 'Mahasamund'),
  ('CG-Manendragarh-Chirmiri-Bharatpur', 'CG', 'Manendragarh-Chirmiri-Bharatpur'),
  ('CG-Mohla-Manpur-Ambagarh Chowki', 'CG', 'Mohla-Manpur-Ambagarh Chowki'),
  ('CG-Mungeli', 'CG', 'Mungeli'),
  ('CG-Narayanpur', 'CG', 'Narayanpur'),
  ('CG-Raigarh', 'CG', 'Raigarh'),
  ('CG-Raipur', 'CG', 'Raipur'),
  ('CG-Rajnandgaon', 'CG', 'Rajnandgaon'),
  ('CG-Sakti', 'CG', 'Sakti'),
  ('CG-Sarangarh-Bilaigarh', 'CG', 'Sarangarh-Bilaigarh'),
  ('CG-Sukma', 'CG', 'Sukma'),
  ('CG-Surajpur', 'CG', 'Surajpur'),
  ('CG-Surguja', 'CG', 'Surguja'),
  ('CH-Chandigarh', 'CH', 'Chandigarh'),
  ('DH-Dadra and Nagar Haveli', 'DH', 'Dadra and Nagar Haveli'),
  ('DH-Daman', 'DH', 'Daman'),
  ('DH-Diu', 'DH', 'Diu'),
  ('DL-Central', 'DL', 'Central'),
  ('DL-East', 'DL', 'East'),
  ('DL-New Delhi', 'DL', 'New Delhi'),
  ('DL-North', 'DL', 'North'),
  ('DL-North East', 'DL', 'North East'),
  ('DL-North West', 'DL', 'North West'),
  ('DL-Shahdara', 'DL', 'Shahdara'),
  ('DL-South', 'DL', 'South'),
  ('DL-South East', 'DL', 'South East'),
  ('DL-South West', 'DL', 'South West'),
  ('DL-West', 'DL', 'West'),
  ('GA-North Goa', 'GA', 'North Goa'),
  ('GA-South Goa', 'GA', 'South Goa'),
  ('GJ-Ahmadabad', 'GJ', 'Ahmadabad'),
  ('GJ-Ahmedabad', 'GJ', 'Ahmedabad'),
  ('GJ-Amreli', 'GJ', 'Amreli'),
  ('GJ-Anand', 'GJ', 'Anand'),
  ('GJ-Aravalli', 'GJ', 'Aravalli'),
  ('GJ-Arvalli', 'GJ', 'Arvalli'),
  ('GJ-Banas Kantha', 'GJ', 'Banas Kantha'),
  ('GJ-Banaskantha', 'GJ', 'Banaskantha'),
  ('GJ-Bharuch', 'GJ', 'Bharuch'),
  ('GJ-Bhavnagar', 'GJ', 'Bhavnagar'),
  ('GJ-Botad', 'GJ', 'Botad'),
  ('GJ-Chhota Udaipur', 'GJ', 'Chhota Udaipur'),
  ('GJ-Chhotaudepur', 'GJ', 'Chhotaudepur'),
  ('GJ-Dahod', 'GJ', 'Dahod'),
  ('GJ-Dang', 'GJ', 'Dang'),
  ('GJ-Devbhumi Dwarka', 'GJ', 'Devbhumi Dwarka'),
  ('GJ-Dohad', 'GJ', 'Dohad'),
  ('GJ-Gandhinagar', 'GJ', 'Gandhinagar'),
  ('GJ-Gir Somnath', 'GJ', 'Gir Somnath'),
  ('GJ-Jamnagar', 'GJ', 'Jamnagar'),
  ('GJ-Junagadh', 'GJ', 'Junagadh'),
  ('GJ-Kachchh', 'GJ', 'Kachchh'),
  ('GJ-Kheda', 'GJ', 'Kheda'),
  ('GJ-Kutch', 'GJ', 'Kutch'),
  ('GJ-Mahesana', 'GJ', 'Mahesana'),
  ('GJ-Mahisagar', 'GJ', 'Mahisagar'),
  ('GJ-Mehsana', 'GJ', 'Mehsana'),
  ('GJ-Morbi', 'GJ', 'Morbi'),
  ('GJ-Narmada', 'GJ', 'Narmada'),
  ('GJ-Navsari', 'GJ', 'Navsari'),
  ('GJ-Panch Mahals', 'GJ', 'Panch Mahals'),
  ('GJ-Panchmahal', 'GJ', 'Panchmahal'),
  ('GJ-Patan', 'GJ', 'Patan'),
  ('GJ-Porbandar', 'GJ', 'Porbandar'),
  ('GJ-Rajkot', 'GJ', 'Rajkot'),
  ('GJ-Sabar Kantha', 'GJ', 'Sabar Kantha'),
  ('GJ-Sabarkantha', 'GJ', 'Sabarkantha'),
  ('GJ-Surat', 'GJ', 'Surat'),
  ('GJ-Surendranagar', 'GJ', 'Surendranagar'),
  ('GJ-Tapi', 'GJ', 'Tapi'),
  ('GJ-Vadodara', 'GJ', 'Vadodara'),
  ('GJ-Valsad', 'GJ', 'Valsad'),
  ('GJ-Vav-Tharad', 'GJ', 'Vav-Tharad'),
  ('HP-Bilaspur', 'HP', 'Bilaspur'),
  ('HP-Chamba', 'HP', 'Chamba'),
  ('HP-Hamirpur', 'HP', 'Hamirpur'),
  ('HP-Kangra', 'HP', 'Kangra'),
  ('HP-Kinnaur', 'HP', 'Kinnaur'),
  ('HP-Kullu', 'HP', 'Kullu'),
  ('HP-Lahaul and Spiti', 'HP', 'Lahaul and Spiti'),
  ('HP-Lahul And Spiti', 'HP', 'Lahul And Spiti'),
  ('HP-Mandi', 'HP', 'Mandi'),
  ('HP-Shimla', 'HP', 'Shimla'),
  ('HP-Sirmaur', 'HP', 'Sirmaur'),
  ('HP-Solan', 'HP', 'Solan'),
  ('HP-Una', 'HP', 'Una'),
  ('HR-Ambala', 'HR', 'Ambala'),
  ('HR-Bhiwani', 'HR', 'Bhiwani'),
  ('HR-Charkhi Dadri', 'HR', 'Charkhi Dadri'),
  ('HR-Charki Dadri', 'HR', 'Charki Dadri'),
  ('HR-Faridabad', 'HR', 'Faridabad'),
  ('HR-Fatehabad', 'HR', 'Fatehabad'),
  ('HR-Gurugram', 'HR', 'Gurugram'),
  ('HR-Hisar', 'HR', 'Hisar'),
  ('HR-Jhajjar', 'HR', 'Jhajjar'),
  ('HR-Jind', 'HR', 'Jind'),
  ('HR-Kaithal', 'HR', 'Kaithal'),
  ('HR-Karnal', 'HR', 'Karnal'),
  ('HR-Kurukshetra', 'HR', 'Kurukshetra'),
  ('HR-Mahendragarh', 'HR', 'Mahendragarh'),
  ('HR-Nuh', 'HR', 'Nuh'),
  ('HR-Palwal', 'HR', 'Palwal'),
  ('HR-Panchkula', 'HR', 'Panchkula'),
  ('HR-Panipat', 'HR', 'Panipat'),
  ('HR-Rewari', 'HR', 'Rewari'),
  ('HR-Rohtak', 'HR', 'Rohtak'),
  ('HR-Sirsa', 'HR', 'Sirsa'),
  ('HR-Sonipat', 'HR', 'Sonipat'),
  ('HR-Yamunanagar', 'HR', 'Yamunanagar'),
  ('JH-Bokaro', 'JH', 'Bokaro'),
  ('JH-Chatra', 'JH', 'Chatra'),
  ('JH-Deoghar', 'JH', 'Deoghar'),
  ('JH-Dhanbad', 'JH', 'Dhanbad'),
  ('JH-Dumka', 'JH', 'Dumka'),
  ('JH-East Singhbhum', 'JH', 'East Singhbhum'),
  ('JH-East Singhbum', 'JH', 'East Singhbum'),
  ('JH-Garhwa', 'JH', 'Garhwa'),
  ('JH-Giridih', 'JH', 'Giridih'),
  ('JH-Godda', 'JH', 'Godda'),
  ('JH-Gumla', 'JH', 'Gumla'),
  ('JH-Hazaribag', 'JH', 'Hazaribag'),
  ('JH-Hazaribagh', 'JH', 'Hazaribagh'),
  ('JH-Jamtara', 'JH', 'Jamtara'),
  ('JH-Khunti', 'JH', 'Khunti'),
  ('JH-Koderma', 'JH', 'Koderma'),
  ('JH-Latehar', 'JH', 'Latehar'),
  ('JH-Lohardaga', 'JH', 'Lohardaga'),
  ('JH-Pakur', 'JH', 'Pakur'),
  ('JH-Palamu', 'JH', 'Palamu'),
  ('JH-Ramgarh', 'JH', 'Ramgarh'),
  ('JH-Ranchi', 'JH', 'Ranchi'),
  ('JH-Sahebganj', 'JH', 'Sahebganj'),
  ('JH-Sahibganj', 'JH', 'Sahibganj'),
  ('JH-Saraikela Kharsawan', 'JH', 'Saraikela Kharsawan'),
  ('JH-Seraikela-Kharsawan', 'JH', 'Seraikela-Kharsawan'),
  ('JH-Simdega', 'JH', 'Simdega'),
  ('JH-West Singhbhum', 'JH', 'West Singhbhum'),
  ('JK-Anantnag', 'JK', 'Anantnag'),
  ('JK-Bandipora', 'JK', 'Bandipora'),
  ('JK-Bandipore', 'JK', 'Bandipore'),
  ('JK-Baramulla', 'JK', 'Baramulla'),
  ('JK-Budgam', 'JK', 'Budgam'),
  ('JK-Doda', 'JK', 'Doda'),
  ('JK-Ganderbal', 'JK', 'Ganderbal'),
  ('JK-Jammu', 'JK', 'Jammu'),
  ('JK-Kathua', 'JK', 'Kathua'),
  ('JK-Kishtwar', 'JK', 'Kishtwar'),
  ('JK-Kulgam', 'JK', 'Kulgam'),
  ('JK-Kupwara', 'JK', 'Kupwara'),
  ('JK-Poonch', 'JK', 'Poonch'),
  ('JK-Pulwama', 'JK', 'Pulwama'),
  ('JK-Rajouri', 'JK', 'Rajouri'),
  ('JK-Ramban', 'JK', 'Ramban'),
  ('JK-Reasi', 'JK', 'Reasi'),
  ('JK-Samba', 'JK', 'Samba'),
  ('JK-Shopian', 'JK', 'Shopian'),
  ('JK-Srinagar', 'JK', 'Srinagar'),
  ('JK-Udhampur', 'JK', 'Udhampur'),
  ('KA-Bagalkot', 'KA', 'Bagalkot'),
  ('KA-Ballari', 'KA', 'Ballari'),
  ('KA-Bangalore Rural', 'KA', 'Bangalore Rural'),
  ('KA-Bangalore Urban', 'KA', 'Bangalore Urban'),
  ('KA-Belagavi', 'KA', 'Belagavi'),
  ('KA-Bengaluru Rural', 'KA', 'Bengaluru Rural'),
  ('KA-Bengaluru Urban', 'KA', 'Bengaluru Urban'),
  ('KA-Bidar', 'KA', 'Bidar'),
  ('KA-Bijapur', 'KA', 'Bijapur'),
  ('KA-Chamarajanagar', 'KA', 'Chamarajanagar'),
  ('KA-Chamarajanagara', 'KA', 'Chamarajanagara'),
  ('KA-Chikkaballapur', 'KA', 'Chikkaballapur'),
  ('KA-Chikkaballapura', 'KA', 'Chikkaballapura'),
  ('KA-Chikkamagaluru', 'KA', 'Chikkamagaluru'),
  ('KA-Chikmagalur', 'KA', 'Chikmagalur'),
  ('KA-Chitradurga', 'KA', 'Chitradurga'),
  ('KA-Dakshina Kannada', 'KA', 'Dakshina Kannada'),
  ('KA-Davanagere', 'KA', 'Davanagere'),
  ('KA-Davangere', 'KA', 'Davangere'),
  ('KA-Dharwad', 'KA', 'Dharwad'),
  ('KA-Gadag', 'KA', 'Gadag'),
  ('KA-Gadaga', 'KA', 'Gadaga'),
  ('KA-Hassan', 'KA', 'Hassan'),
  ('KA-Haveri', 'KA', 'Haveri'),
  ('KA-Kalaburagi', 'KA', 'Kalaburagi'),
  ('KA-Kodagu', 'KA', 'Kodagu'),
  ('KA-Kolar', 'KA', 'Kolar'),
  ('KA-Koppal', 'KA', 'Koppal'),
  ('KA-Mandya', 'KA', 'Mandya'),
  ('KA-Mysore', 'KA', 'Mysore'),
  ('KA-Mysuru', 'KA', 'Mysuru'),
  ('KA-Raichur', 'KA', 'Raichur'),
  ('KA-Ramanagara', 'KA', 'Ramanagara'),
  ('KA-Shimoga', 'KA', 'Shimoga'),
  ('KA-Shivamogga', 'KA', 'Shivamogga'),
  ('KA-Tumakuru', 'KA', 'Tumakuru'),
  ('KA-Udupi', 'KA', 'Udupi'),
  ('KA-Uttara Kannada', 'KA', 'Uttara Kannada'),
  ('KA-Vijayanagara', 'KA', 'Vijayanagara'),
  ('KA-Vijayapura', 'KA', 'Vijayapura'),
  ('KA-Vijaynagar', 'KA', 'Vijaynagar'),
  ('KA-Yadgir', 'KA', 'Yadgir'),
  ('KL-Alappuzha', 'KL', 'Alappuzha'),
  ('KL-Ernakulam', 'KL', 'Ernakulam'),
  ('KL-Idukki', 'KL', 'Idukki'),
  ('KL-Kannur', 'KL', 'Kannur'),
  ('KL-Kasaragod', 'KL', 'Kasaragod'),
  ('KL-Kollam', 'KL', 'Kollam'),
  ('KL-Kottayam', 'KL', 'Kottayam'),
  ('KL-Kozhikode', 'KL', 'Kozhikode'),
  ('KL-Malappuram', 'KL', 'Malappuram'),
  ('KL-Palakkad', 'KL', 'Palakkad'),
  ('KL-Pathanamthitta', 'KL', 'Pathanamthitta'),
  ('KL-Thiruvananthapuram', 'KL', 'Thiruvananthapuram'),
  ('KL-Thrissur', 'KL', 'Thrissur'),
  ('KL-Wayanad', 'KL', 'Wayanad'),
  ('LA-Kargil', 'LA', 'Kargil'),
  ('LA-Leh', 'LA', 'Leh'),
  ('LA-Leh Ladakh', 'LA', 'Leh Ladakh'),
  ('LD-Lakshadweep', 'LD', 'Lakshadweep'),
  ('LD-Lakshadweep District', 'LD', 'Lakshadweep District'),
  ('MH-Ahmednagar', 'MH', 'Ahmednagar'),
  ('MH-Akola', 'MH', 'Akola'),
  ('MH-Amravati', 'MH', 'Amravati'),
  ('MH-Aurangabad', 'MH', 'Aurangabad'),
  ('MH-Beed', 'MH', 'Beed'),
  ('MH-Bhandara', 'MH', 'Bhandara'),
  ('MH-Buldhana', 'MH', 'Buldhana'),
  ('MH-Chandrapur', 'MH', 'Chandrapur'),
  ('MH-Dhule', 'MH', 'Dhule'),
  ('MH-Gadchiroli', 'MH', 'Gadchiroli'),
  ('MH-Gondia', 'MH', 'Gondia'),
  ('MH-Hingoli', 'MH', 'Hingoli'),
  ('MH-Jalgaon', 'MH', 'Jalgaon'),
  ('MH-Jalna', 'MH', 'Jalna'),
  ('MH-Kolhapur', 'MH', 'Kolhapur'),
  ('MH-Latur', 'MH', 'Latur'),
  ('MH-Mumbai', 'MH', 'Mumbai'),
  ('MH-Mumbai City', 'MH', 'Mumbai City'),
  ('MH-Mumbai Suburban', 'MH', 'Mumbai Suburban'),
  ('MH-Nagpur', 'MH', 'Nagpur'),
  ('MH-Nanded', 'MH', 'Nanded'),
  ('MH-Nandurbar', 'MH', 'Nandurbar'),
  ('MH-Nashik', 'MH', 'Nashik'),
  ('MH-Osmanabad', 'MH', 'Osmanabad'),
  ('MH-Palghar', 'MH', 'Palghar'),
  ('MH-Parbhani', 'MH', 'Parbhani'),
  ('MH-Pune', 'MH', 'Pune'),
  ('MH-Raigad', 'MH', 'Raigad'),
  ('MH-Ratnagiri', 'MH', 'Ratnagiri'),
  ('MH-Sangli', 'MH', 'Sangli'),
  ('MH-Satara', 'MH', 'Satara'),
  ('MH-Sindhudurg', 'MH', 'Sindhudurg'),
  ('MH-Solapur', 'MH', 'Solapur'),
  ('MH-Thane', 'MH', 'Thane'),
  ('MH-Wardha', 'MH', 'Wardha'),
  ('MH-Washim', 'MH', 'Washim'),
  ('MH-Yavatmal', 'MH', 'Yavatmal'),
  ('ML-East Garo Hills', 'ML', 'East Garo Hills'),
  ('ML-East Jaintia Hills', 'ML', 'East Jaintia Hills'),
  ('ML-East Khasi Hills', 'ML', 'East Khasi Hills'),
  ('ML-Eastern West Khasi Hills', 'ML', 'Eastern West Khasi Hills'),
  ('ML-North Garo Hills', 'ML', 'North Garo Hills'),
  ('ML-Ri Bhoi', 'ML', 'Ri Bhoi'),
  ('ML-South Garo Hills', 'ML', 'South Garo Hills'),
  ('ML-South West Garo Hills', 'ML', 'South West Garo Hills'),
  ('ML-South West Khasi Hills', 'ML', 'South West Khasi Hills'),
  ('ML-West Garo Hills', 'ML', 'West Garo Hills'),
  ('ML-West Jaintia Hills', 'ML', 'West Jaintia Hills'),
  ('ML-West Khasi Hills', 'ML', 'West Khasi Hills'),
  ('MN-Bishnupur', 'MN', 'Bishnupur'),
  ('MN-Chandel', 'MN', 'Chandel'),
  ('MN-Churachandpur', 'MN', 'Churachandpur'),
  ('MN-Imphal East', 'MN', 'Imphal East'),
  ('MN-Imphal West', 'MN', 'Imphal West'),
  ('MN-Jiribam', 'MN', 'Jiribam'),
  ('MN-Kakching', 'MN', 'Kakching'),
  ('MN-Kamjong', 'MN', 'Kamjong'),
  ('MN-Kangpokpi', 'MN', 'Kangpokpi'),
  ('MN-Noney', 'MN', 'Noney'),
  ('MN-Pherzawl', 'MN', 'Pherzawl'),
  ('MN-Senapati', 'MN', 'Senapati'),
  ('MN-Tamenglong', 'MN', 'Tamenglong'),
  ('MN-Tengnoupal', 'MN', 'Tengnoupal'),
  ('MN-Thoubal', 'MN', 'Thoubal'),
  ('MN-Ukhrul', 'MN', 'Ukhrul'),
  ('MP-Agar Malwa', 'MP', 'Agar Malwa'),
  ('MP-Alirajpur', 'MP', 'Alirajpur'),
  ('MP-Anuppur', 'MP', 'Anuppur'),
  ('MP-Ashoknagar', 'MP', 'Ashoknagar'),
  ('MP-Balaghat', 'MP', 'Balaghat'),
  ('MP-Barwani', 'MP', 'Barwani'),
  ('MP-Betul', 'MP', 'Betul'),
  ('MP-Bhind', 'MP', 'Bhind'),
  ('MP-Bhopal', 'MP', 'Bhopal'),
  ('MP-Burhanpur', 'MP', 'Burhanpur'),
  ('MP-Chhatarpur', 'MP', 'Chhatarpur'),
  ('MP-Chhindwara', 'MP', 'Chhindwara'),
  ('MP-Damoh', 'MP', 'Damoh'),
  ('MP-Datia', 'MP', 'Datia'),
  ('MP-Dewas', 'MP', 'Dewas'),
  ('MP-Dhar', 'MP', 'Dhar'),
  ('MP-Dindori', 'MP', 'Dindori'),
  ('MP-East Nimar', 'MP', 'East Nimar'),
  ('MP-Guna', 'MP', 'Guna'),
  ('MP-Gwalior', 'MP', 'Gwalior'),
  ('MP-Harda', 'MP', 'Harda'),
  ('MP-Hoshangabad', 'MP', 'Hoshangabad'),
  ('MP-Indore', 'MP', 'Indore'),
  ('MP-Jabalpur', 'MP', 'Jabalpur'),
  ('MP-Jhabua', 'MP', 'Jhabua'),
  ('MP-Katni', 'MP', 'Katni'),
  ('MP-Khandwa', 'MP', 'Khandwa'),
  ('MP-Khargone', 'MP', 'Khargone'),
  ('MP-Maihar', 'MP', 'Maihar'),
  ('MP-Mandla', 'MP', 'Mandla'),
  ('MP-Mandsaur', 'MP', 'Mandsaur'),
  ('MP-Mauganj', 'MP', 'Mauganj'),
  ('MP-Morena', 'MP', 'Morena'),
  ('MP-Narsinghpur', 'MP', 'Narsinghpur'),
  ('MP-Neemuch', 'MP', 'Neemuch'),
  ('MP-Niwari', 'MP', 'Niwari'),
  ('MP-Pandhurna', 'MP', 'Pandhurna'),
  ('MP-Panna', 'MP', 'Panna'),
  ('MP-Raisen', 'MP', 'Raisen'),
  ('MP-Rajgarh', 'MP', 'Rajgarh'),
  ('MP-Ratlam', 'MP', 'Ratlam'),
  ('MP-Rewa', 'MP', 'Rewa'),
  ('MP-Sagar', 'MP', 'Sagar'),
  ('MP-Satna', 'MP', 'Satna'),
  ('MP-Sehore', 'MP', 'Sehore'),
  ('MP-Seoni', 'MP', 'Seoni'),
  ('MP-Shahdol', 'MP', 'Shahdol'),
  ('MP-Shajapur', 'MP', 'Shajapur'),
  ('MP-Sheopur', 'MP', 'Sheopur'),
  ('MP-Shivpuri', 'MP', 'Shivpuri'),
  ('MP-Sidhi', 'MP', 'Sidhi'),
  ('MP-Singrauli', 'MP', 'Singrauli'),
  ('MP-Tikamgarh', 'MP', 'Tikamgarh'),
  ('MP-Ujjain', 'MP', 'Ujjain'),
  ('MP-Umaria', 'MP', 'Umaria'),
  ('MP-Vidisha', 'MP', 'Vidisha'),
  ('MZ-Aizawl', 'MZ', 'Aizawl'),
  ('MZ-Champhai', 'MZ', 'Champhai'),
  ('MZ-Hnahthial', 'MZ', 'Hnahthial'),
  ('MZ-Khawzawl', 'MZ', 'Khawzawl'),
  ('MZ-Kolasib', 'MZ', 'Kolasib'),
  ('MZ-Lawngtlai', 'MZ', 'Lawngtlai'),
  ('MZ-Lunglei', 'MZ', 'Lunglei'),
  ('MZ-Mamit', 'MZ', 'Mamit'),
  ('MZ-Saiha', 'MZ', 'Saiha'),
  ('MZ-Saitual', 'MZ', 'Saitual'),
  ('MZ-Serchhip', 'MZ', 'Serchhip'),
  ('NL-Chümoukedima', 'NL', 'Chümoukedima'),
  ('NL-Dimapur', 'NL', 'Dimapur'),
  ('NL-Kiphire', 'NL', 'Kiphire'),
  ('NL-Kohima', 'NL', 'Kohima'),
  ('NL-Longleng', 'NL', 'Longleng'),
  ('NL-Mokokchung', 'NL', 'Mokokchung'),
  ('NL-Mon', 'NL', 'Mon'),
  ('NL-Niuland', 'NL', 'Niuland'),
  ('NL-Noklak', 'NL', 'Noklak'),
  ('NL-Peren', 'NL', 'Peren'),
  ('NL-Phek', 'NL', 'Phek'),
  ('NL-Shamator', 'NL', 'Shamator'),
  ('NL-Tseminyü', 'NL', 'Tseminyü'),
  ('NL-Tuensang', 'NL', 'Tuensang'),
  ('NL-Wokha', 'NL', 'Wokha'),
  ('NL-Zunheboto', 'NL', 'Zunheboto'),
  ('OD-Angul', 'OD', 'Angul'),
  ('OD-Anugul', 'OD', 'Anugul'),
  ('OD-Balangir', 'OD', 'Balangir'),
  ('OD-Balasore', 'OD', 'Balasore'),
  ('OD-Baleshwar', 'OD', 'Baleshwar'),
  ('OD-Bargarh', 'OD', 'Bargarh'),
  ('OD-Bhadrak', 'OD', 'Bhadrak'),
  ('OD-Boudh', 'OD', 'Boudh'),
  ('OD-Cuttack', 'OD', 'Cuttack'),
  ('OD-Debagarh', 'OD', 'Debagarh'),
  ('OD-Deogarh', 'OD', 'Deogarh'),
  ('OD-Dhenkanal', 'OD', 'Dhenkanal'),
  ('OD-Gajapati', 'OD', 'Gajapati'),
  ('OD-Ganjam', 'OD', 'Ganjam'),
  ('OD-Jagatsinghapur', 'OD', 'Jagatsinghapur'),
  ('OD-Jagatsinghpur', 'OD', 'Jagatsinghpur'),
  ('OD-Jajapur', 'OD', 'Jajapur'),
  ('OD-Jajpur', 'OD', 'Jajpur'),
  ('OD-Jharsuguda', 'OD', 'Jharsuguda'),
  ('OD-Kalahandi', 'OD', 'Kalahandi'),
  ('OD-Kandhamal', 'OD', 'Kandhamal'),
  ('OD-Kendrapara', 'OD', 'Kendrapara'),
  ('OD-Kendujhar', 'OD', 'Kendujhar'),
  ('OD-Khordha', 'OD', 'Khordha'),
  ('OD-Koraput', 'OD', 'Koraput'),
  ('OD-Malkangiri', 'OD', 'Malkangiri'),
  ('OD-Mayurbhanj', 'OD', 'Mayurbhanj'),
  ('OD-Nabarangpur', 'OD', 'Nabarangpur'),
  ('OD-Nayagarh', 'OD', 'Nayagarh'),
  ('OD-Nuapada', 'OD', 'Nuapada'),
  ('OD-Puri', 'OD', 'Puri'),
  ('OD-Rayagada', 'OD', 'Rayagada'),
  ('OD-Sambalpur', 'OD', 'Sambalpur'),
  ('OD-Sonepur', 'OD', 'Sonepur'),
  ('OD-Subarnapur', 'OD', 'Subarnapur'),
  ('OD-Sundargarh', 'OD', 'Sundargarh'),
  ('PB-Amritsar', 'PB', 'Amritsar'),
  ('PB-Barnala', 'PB', 'Barnala'),
  ('PB-Bathinda', 'PB', 'Bathinda'),
  ('PB-Faridkot', 'PB', 'Faridkot'),
  ('PB-Fatehgarh Sahib', 'PB', 'Fatehgarh Sahib'),
  ('PB-Fazilka', 'PB', 'Fazilka'),
  ('PB-Firozepur', 'PB', 'Firozepur'),
  ('PB-Firozpur', 'PB', 'Firozpur'),
  ('PB-Gurdaspur', 'PB', 'Gurdaspur'),
  ('PB-Hoshiarpur', 'PB', 'Hoshiarpur'),
  ('PB-Jalandhar', 'PB', 'Jalandhar'),
  ('PB-Kapurthala', 'PB', 'Kapurthala'),
  ('PB-Ludhiana', 'PB', 'Ludhiana'),
  ('PB-Malerkotla', 'PB', 'Malerkotla'),
  ('PB-Mansa', 'PB', 'Mansa'),
  ('PB-Moga', 'PB', 'Moga'),
  ('PB-Pathankot', 'PB', 'Pathankot'),
  ('PB-Patiala', 'PB', 'Patiala'),
  ('PB-Rupnagar', 'PB', 'Rupnagar'),
  ('PB-S.A.S Nagar', 'PB', 'S.A.S Nagar'),
  ('PB-Sahibzada Ajit Singh Nagar', 'PB', 'Sahibzada Ajit Singh Nagar'),
  ('PB-Sangrur', 'PB', 'Sangrur'),
  ('PB-Shahid Bhagat Singh Nagar', 'PB', 'Shahid Bhagat Singh Nagar'),
  ('PB-Sri Muktsar Sahib', 'PB', 'Sri Muktsar Sahib'),
  ('PB-Tarn Taran', 'PB', 'Tarn Taran'),
  ('PY-Karaikal', 'PY', 'Karaikal'),
  ('PY-Mahe', 'PY', 'Mahe'),
  ('PY-Mahé', 'PY', 'Mahé'),
  ('PY-Pondicherry', 'PY', 'Pondicherry'),
  ('PY-Puducherry', 'PY', 'Puducherry'),
  ('PY-Yanam', 'PY', 'Yanam'),
  ('RJ-Ajmer', 'RJ', 'Ajmer'),
  ('RJ-Alwar', 'RJ', 'Alwar'),
  ('RJ-Balotra', 'RJ', 'Balotra'),
  ('RJ-Banswara', 'RJ', 'Banswara'),
  ('RJ-Baran', 'RJ', 'Baran'),
  ('RJ-Barmer', 'RJ', 'Barmer'),
  ('RJ-Beawar', 'RJ', 'Beawar'),
  ('RJ-Bharatpur', 'RJ', 'Bharatpur'),
  ('RJ-Bhilwara', 'RJ', 'Bhilwara'),
  ('RJ-Bikaner', 'RJ', 'Bikaner'),
  ('RJ-Bundi', 'RJ', 'Bundi'),
  ('RJ-Chittorgarh', 'RJ', 'Chittorgarh'),
  ('RJ-Churu', 'RJ', 'Churu'),
  ('RJ-Dausa', 'RJ', 'Dausa'),
  ('RJ-Deeg', 'RJ', 'Deeg'),
  ('RJ-Dholpur', 'RJ', 'Dholpur'),
  ('RJ-Didwana Kuchaman', 'RJ', 'Didwana Kuchaman'),
  ('RJ-Dungarpur', 'RJ', 'Dungarpur'),
  ('RJ-Ganganagar', 'RJ', 'Ganganagar'),
  ('RJ-Hanumangarh', 'RJ', 'Hanumangarh'),
  ('RJ-Jaipur', 'RJ', 'Jaipur'),
  ('RJ-Jaisalmer', 'RJ', 'Jaisalmer'),
  ('RJ-Jalore', 'RJ', 'Jalore'),
  ('RJ-Jhalawar', 'RJ', 'Jhalawar'),
  ('RJ-Jhunjhunu', 'RJ', 'Jhunjhunu'),
  ('RJ-Jodhpur', 'RJ', 'Jodhpur'),
  ('RJ-Karauli', 'RJ', 'Karauli'),
  ('RJ-Khairthal-Tijara', 'RJ', 'Khairthal-Tijara'),
  ('RJ-Kota', 'RJ', 'Kota'),
  ('RJ-Kotputli-Behror', 'RJ', 'Kotputli-Behror'),
  ('RJ-Nagaur', 'RJ', 'Nagaur'),
  ('RJ-Pali', 'RJ', 'Pali'),
  ('RJ-Phalodi', 'RJ', 'Phalodi'),
  ('RJ-Pratapgarh', 'RJ', 'Pratapgarh'),
  ('RJ-Rajsamand', 'RJ', 'Rajsamand'),
  ('RJ-Salumbar', 'RJ', 'Salumbar'),
  ('RJ-Sawai Madhopur', 'RJ', 'Sawai Madhopur'),
  ('RJ-Sikar', 'RJ', 'Sikar'),
  ('RJ-Sirohi', 'RJ', 'Sirohi'),
  ('RJ-Sri Ganganagar', 'RJ', 'Sri Ganganagar'),
  ('RJ-Tonk', 'RJ', 'Tonk'),
  ('RJ-Udaipur', 'RJ', 'Udaipur'),
  ('SK-East District', 'SK', 'East District'),
  ('SK-Gangtok', 'SK', 'Gangtok'),
  ('SK-Gyalshing', 'SK', 'Gyalshing'),
  ('SK-Mangan', 'SK', 'Mangan'),
  ('SK-Namchi', 'SK', 'Namchi'),
  ('SK-North District', 'SK', 'North District'),
  ('SK-Pakyong', 'SK', 'Pakyong'),
  ('SK-Soreng', 'SK', 'Soreng'),
  ('SK-South District', 'SK', 'South District'),
  ('SK-West District', 'SK', 'West District'),
  ('TN-Ariyalur', 'TN', 'Ariyalur'),
  ('TN-Chengalpattu', 'TN', 'Chengalpattu'),
  ('TN-Chennai', 'TN', 'Chennai'),
  ('TN-Coimbatore', 'TN', 'Coimbatore'),
  ('TN-Cuddalore', 'TN', 'Cuddalore'),
  ('TN-Dharmapuri', 'TN', 'Dharmapuri'),
  ('TN-Dindigul', 'TN', 'Dindigul'),
  ('TN-Erode', 'TN', 'Erode'),
  ('TN-Kallakurichi', 'TN', 'Kallakurichi'),
  ('TN-Kanchipuram', 'TN', 'Kanchipuram'),
  ('TN-Kanniyakumari', 'TN', 'Kanniyakumari'),
  ('TN-Kanyakumari', 'TN', 'Kanyakumari'),
  ('TN-Karur', 'TN', 'Karur'),
  ('TN-Krishnagiri', 'TN', 'Krishnagiri'),
  ('TN-Madurai', 'TN', 'Madurai'),
  ('TN-Mayiladuthurai', 'TN', 'Mayiladuthurai'),
  ('TN-Nagapattinam', 'TN', 'Nagapattinam'),
  ('TN-Namakkal', 'TN', 'Namakkal'),
  ('TN-Nilgiris', 'TN', 'Nilgiris'),
  ('TN-Perambalur', 'TN', 'Perambalur'),
  ('TN-Pudukkottai', 'TN', 'Pudukkottai'),
  ('TN-Ramanathapuram', 'TN', 'Ramanathapuram'),
  ('TN-Ranipet', 'TN', 'Ranipet'),
  ('TN-Salem', 'TN', 'Salem'),
  ('TN-Sivaganga', 'TN', 'Sivaganga'),
  ('TN-Tenkasi', 'TN', 'Tenkasi'),
  ('TN-Thanjavur', 'TN', 'Thanjavur'),
  ('TN-Theni', 'TN', 'Theni'),
  ('TN-Thiruvallur', 'TN', 'Thiruvallur'),
  ('TN-Thiruvarur', 'TN', 'Thiruvarur'),
  ('TN-Thoothukudi', 'TN', 'Thoothukudi'),
  ('TN-Tiruchirappalli', 'TN', 'Tiruchirappalli'),
  ('TN-Tirunelveli', 'TN', 'Tirunelveli'),
  ('TN-Tirupathur', 'TN', 'Tirupathur'),
  ('TN-Tirupattur', 'TN', 'Tirupattur'),
  ('TN-Tiruppur', 'TN', 'Tiruppur'),
  ('TN-Tiruvallur', 'TN', 'Tiruvallur'),
  ('TN-Tiruvannamalai', 'TN', 'Tiruvannamalai'),
  ('TN-Tiruvarur', 'TN', 'Tiruvarur'),
  ('TN-Tuticorin', 'TN', 'Tuticorin'),
  ('TN-Vellore', 'TN', 'Vellore'),
  ('TN-Villupuram', 'TN', 'Villupuram'),
  ('TN-Viluppuram', 'TN', 'Viluppuram'),
  ('TN-Virudhunagar', 'TN', 'Virudhunagar'),
  ('TR-Dhalai', 'TR', 'Dhalai'),
  ('TR-Gomati', 'TR', 'Gomati'),
  ('TR-Khowai', 'TR', 'Khowai'),
  ('TR-North Tripura', 'TR', 'North Tripura'),
  ('TR-Sepahijala', 'TR', 'Sepahijala'),
  ('TR-South Tripura', 'TR', 'South Tripura'),
  ('TR-Unakoti', 'TR', 'Unakoti'),
  ('TR-West Tripura', 'TR', 'West Tripura'),
  ('TS-Adilabad', 'TS', 'Adilabad'),
  ('TS-Bhadradri Kothagudem', 'TS', 'Bhadradri Kothagudem'),
  ('TS-Hanamkonda', 'TS', 'Hanamkonda'),
  ('TS-Hanumakonda', 'TS', 'Hanumakonda'),
  ('TS-Hyderabad', 'TS', 'Hyderabad'),
  ('TS-Jagitial', 'TS', 'Jagitial'),
  ('TS-Jagtial', 'TS', 'Jagtial'),
  ('TS-Jangaon', 'TS', 'Jangaon'),
  ('TS-Jangoan', 'TS', 'Jangoan'),
  ('TS-Jayashankar Bhupalapally', 'TS', 'Jayashankar Bhupalapally'),
  ('TS-Jayashankar Bhupalpally', 'TS', 'Jayashankar Bhupalpally'),
  ('TS-Jogulamba Gadwal', 'TS', 'Jogulamba Gadwal'),
  ('TS-Kamareddy', 'TS', 'Kamareddy'),
  ('TS-Karimnagar', 'TS', 'Karimnagar'),
  ('TS-Khammam', 'TS', 'Khammam'),
  ('TS-Kumuram Bheem Asifabad', 'TS', 'Kumuram Bheem Asifabad'),
  ('TS-Mahabubabad', 'TS', 'Mahabubabad'),
  ('TS-Mahabubnagar', 'TS', 'Mahabubnagar'),
  ('TS-Mahbubnagar', 'TS', 'Mahbubnagar'),
  ('TS-Mancherial', 'TS', 'Mancherial'),
  ('TS-Medak', 'TS', 'Medak'),
  ('TS-Medchal–Malkajgiri', 'TS', 'Medchal–Malkajgiri'),
  ('TS-Mulugu', 'TS', 'Mulugu'),
  ('TS-Nagarkurnool', 'TS', 'Nagarkurnool'),
  ('TS-Nalgonda', 'TS', 'Nalgonda'),
  ('TS-Narayanpet', 'TS', 'Narayanpet'),
  ('TS-Nirmal', 'TS', 'Nirmal'),
  ('TS-Nizamabad', 'TS', 'Nizamabad'),
  ('TS-Peddapalli', 'TS', 'Peddapalli'),
  ('TS-Rajanna Sircilla', 'TS', 'Rajanna Sircilla'),
  ('TS-Ranga Reddy', 'TS', 'Ranga Reddy'),
  ('TS-Sangareddy', 'TS', 'Sangareddy'),
  ('TS-Siddipet', 'TS', 'Siddipet'),
  ('TS-Suryapet', 'TS', 'Suryapet'),
  ('TS-Vikarabad', 'TS', 'Vikarabad'),
  ('TS-Wanaparthy', 'TS', 'Wanaparthy'),
  ('TS-Warangal', 'TS', 'Warangal'),
  ('TS-Yadadri Bhuvanagiri', 'TS', 'Yadadri Bhuvanagiri'),
  ('UK-Almora', 'UK', 'Almora'),
  ('UK-Bageshwar', 'UK', 'Bageshwar'),
  ('UK-Chamoli', 'UK', 'Chamoli'),
  ('UK-Champawat', 'UK', 'Champawat'),
  ('UK-Dehradun', 'UK', 'Dehradun'),
  ('UK-Haridwar', 'UK', 'Haridwar'),
  ('UK-Nainital', 'UK', 'Nainital'),
  ('UK-Pauri Garhwal', 'UK', 'Pauri Garhwal'),
  ('UK-Pithoragarh', 'UK', 'Pithoragarh'),
  ('UK-Rudra Prayag', 'UK', 'Rudra Prayag'),
  ('UK-Rudraprayag', 'UK', 'Rudraprayag'),
  ('UK-Tehri Garhwal', 'UK', 'Tehri Garhwal'),
  ('UK-Udam Singh Nagar', 'UK', 'Udam Singh Nagar'),
  ('UK-Udham Singh Nagar', 'UK', 'Udham Singh Nagar'),
  ('UK-Uttar Kashi', 'UK', 'Uttar Kashi'),
  ('UK-Uttarkashi', 'UK', 'Uttarkashi'),
  ('UP-Agra', 'UP', 'Agra'),
  ('UP-Aligarh', 'UP', 'Aligarh'),
  ('UP-Ambedkar Nagar', 'UP', 'Ambedkar Nagar'),
  ('UP-Amethi', 'UP', 'Amethi'),
  ('UP-Amroha', 'UP', 'Amroha'),
  ('UP-Auraiya', 'UP', 'Auraiya'),
  ('UP-Ayodhya', 'UP', 'Ayodhya'),
  ('UP-Azamgarh', 'UP', 'Azamgarh'),
  ('UP-Baghpat', 'UP', 'Baghpat'),
  ('UP-Bagpat', 'UP', 'Bagpat'),
  ('UP-Bahraich', 'UP', 'Bahraich'),
  ('UP-Ballia', 'UP', 'Ballia'),
  ('UP-Balrampur', 'UP', 'Balrampur'),
  ('UP-Banda', 'UP', 'Banda'),
  ('UP-Barabanki', 'UP', 'Barabanki'),
  ('UP-Bareilly', 'UP', 'Bareilly'),
  ('UP-Basti', 'UP', 'Basti'),
  ('UP-Bhadohi', 'UP', 'Bhadohi'),
  ('UP-Bijnor', 'UP', 'Bijnor'),
  ('UP-Budaun', 'UP', 'Budaun'),
  ('UP-Bulandshahr', 'UP', 'Bulandshahr'),
  ('UP-Chandauli', 'UP', 'Chandauli'),
  ('UP-Chitrakoot', 'UP', 'Chitrakoot'),
  ('UP-Deoria', 'UP', 'Deoria'),
  ('UP-Etah', 'UP', 'Etah'),
  ('UP-Etawah', 'UP', 'Etawah'),
  ('UP-Farrukhabad', 'UP', 'Farrukhabad'),
  ('UP-Fatehpur', 'UP', 'Fatehpur'),
  ('UP-Firozabad', 'UP', 'Firozabad'),
  ('UP-Gautam Buddha Nagar', 'UP', 'Gautam Buddha Nagar'),
  ('UP-Ghaziabad', 'UP', 'Ghaziabad'),
  ('UP-Ghazipur', 'UP', 'Ghazipur'),
  ('UP-Gonda', 'UP', 'Gonda'),
  ('UP-Gorakhpur', 'UP', 'Gorakhpur'),
  ('UP-Hamirpur', 'UP', 'Hamirpur'),
  ('UP-Hapur', 'UP', 'Hapur'),
  ('UP-Hardoi', 'UP', 'Hardoi'),
  ('UP-Hathras', 'UP', 'Hathras'),
  ('UP-Jalaun', 'UP', 'Jalaun'),
  ('UP-Jaunpur', 'UP', 'Jaunpur'),
  ('UP-Jhansi', 'UP', 'Jhansi'),
  ('UP-Kannauj', 'UP', 'Kannauj'),
  ('UP-Kanpur Dehat', 'UP', 'Kanpur Dehat'),
  ('UP-Kanpur Nagar', 'UP', 'Kanpur Nagar'),
  ('UP-Kasganj', 'UP', 'Kasganj'),
  ('UP-Kaushambi', 'UP', 'Kaushambi'),
  ('UP-Kheri', 'UP', 'Kheri'),
  ('UP-Kushi Nagar', 'UP', 'Kushi Nagar'),
  ('UP-Kushinagar', 'UP', 'Kushinagar'),
  ('UP-Lakhimpur Kheri', 'UP', 'Lakhimpur Kheri'),
  ('UP-Lalitpur', 'UP', 'Lalitpur'),
  ('UP-Lucknow', 'UP', 'Lucknow'),
  ('UP-Maharajganj', 'UP', 'Maharajganj'),
  ('UP-Mahoba', 'UP', 'Mahoba'),
  ('UP-Mainpuri', 'UP', 'Mainpuri'),
  ('UP-Mathura', 'UP', 'Mathura'),
  ('UP-Mau', 'UP', 'Mau'),
  ('UP-Meerut', 'UP', 'Meerut'),
  ('UP-Mirzapur', 'UP', 'Mirzapur'),
  ('UP-Moradabad', 'UP', 'Moradabad'),
  ('UP-Muzaffarnagar', 'UP', 'Muzaffarnagar'),
  ('UP-Pilibhit', 'UP', 'Pilibhit'),
  ('UP-Pratapgarh', 'UP', 'Pratapgarh'),
  ('UP-Prayagraj', 'UP', 'Prayagraj'),
  ('UP-Rae Bareli', 'UP', 'Rae Bareli'),
  ('UP-Raebareli', 'UP', 'Raebareli'),
  ('UP-Rampur', 'UP', 'Rampur'),
  ('UP-Saharanpur', 'UP', 'Saharanpur'),
  ('UP-Sambhal', 'UP', 'Sambhal'),
  ('UP-Sant Kabeer Nagar', 'UP', 'Sant Kabeer Nagar'),
  ('UP-Sant Kabir Nagar', 'UP', 'Sant Kabir Nagar'),
  ('UP-Shahjahanpur', 'UP', 'Shahjahanpur'),
  ('UP-Shamli', 'UP', 'Shamli'),
  ('UP-Shravasti', 'UP', 'Shravasti'),
  ('UP-Siddharth Nagar', 'UP', 'Siddharth Nagar'),
  ('UP-Siddharthnagar', 'UP', 'Siddharthnagar'),
  ('UP-Sitapur', 'UP', 'Sitapur'),
  ('UP-Sonbhadra', 'UP', 'Sonbhadra'),
  ('UP-Sultanpur', 'UP', 'Sultanpur'),
  ('UP-Unnao', 'UP', 'Unnao'),
  ('UP-Varanasi', 'UP', 'Varanasi'),
  ('WB-24 Paraganas North', 'WB', '24 Paraganas North'),
  ('WB-24 Paraganas South', 'WB', '24 Paraganas South'),
  ('WB-Alipurduar', 'WB', 'Alipurduar'),
  ('WB-Bankura', 'WB', 'Bankura'),
  ('WB-Birbhum', 'WB', 'Birbhum'),
  ('WB-Cooch Behar', 'WB', 'Cooch Behar'),
  ('WB-Coochbehar', 'WB', 'Coochbehar'),
  ('WB-Dakshin Dinajpur', 'WB', 'Dakshin Dinajpur'),
  ('WB-Darjeeling', 'WB', 'Darjeeling'),
  ('WB-Dinajpur Dakshin', 'WB', 'Dinajpur Dakshin'),
  ('WB-Dinajpur Uttar', 'WB', 'Dinajpur Uttar'),
  ('WB-Hooghly', 'WB', 'Hooghly'),
  ('WB-Howrah', 'WB', 'Howrah'),
  ('WB-Jalpaiguri', 'WB', 'Jalpaiguri'),
  ('WB-Jhargram', 'WB', 'Jhargram'),
  ('WB-Kalimpong', 'WB', 'Kalimpong'),
  ('WB-Kolkata', 'WB', 'Kolkata'),
  ('WB-Maldah', 'WB', 'Maldah'),
  ('WB-Medinipur East', 'WB', 'Medinipur East'),
  ('WB-Medinipur West', 'WB', 'Medinipur West'),
  ('WB-Murshidabad', 'WB', 'Murshidabad'),
  ('WB-Nadia', 'WB', 'Nadia'),
  ('WB-North 24 Parganas', 'WB', 'North 24 Parganas'),
  ('WB-Paschim Bardhaman', 'WB', 'Paschim Bardhaman'),
  ('WB-Paschim Medinipur', 'WB', 'Paschim Medinipur'),
  ('WB-Purba Bardhaman', 'WB', 'Purba Bardhaman'),
  ('WB-Purba Medinipur', 'WB', 'Purba Medinipur'),
  ('WB-Purulia', 'WB', 'Purulia'),
  ('WB-South 24 Parganas', 'WB', 'South 24 Parganas'),
  ('WB-Uttar Dinajpur', 'WB', 'Uttar Dinajpur')
on conflict (id) do update
  set state_id = excluded.state_id,
      name = excluded.name;

commit;

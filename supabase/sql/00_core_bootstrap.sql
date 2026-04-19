-- =====================================================================
-- Pilgrimage / Yatra — Supabase consolidated schema (SAFE, re-runnable)
-- File: supabase/pilgrimage.sql
-- NOTE: This file avoids full reset drops but may drop obsolete objects as part of migrations.
-- =====================================================================
--
-- Supabase Dashboard: prefer smaller chunks — run `sql/00_*.sql` … `14_*.sql` in order
-- (see `sql/README.md`). Regenerate pieces after editing this file: `scripts/split_pilgrimage.sh`
--
-- For one-shot apply use `psql` or CLI (see `APPLY_SCHEMA.md`).

-- NOTE: This file consolidates the bootstrap plus all migrations and includes address lookup seeds.
-- Last updated: 2026-01-19 (UI-only changes; no schema updates required for mobile photo capture).

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

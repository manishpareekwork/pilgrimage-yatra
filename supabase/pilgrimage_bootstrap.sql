-- =====================================================================
-- Pilgrimage / Yatra — Supabase bootstrap (DB, RLS, buckets, helpers)
-- File: supabase/pilgrimage_bootstrap.sql
-- Re-runnable: YES (guards included)
-- =====================================================================

begin;

-- ---------- Extensions ----------
create extension if not exists pgcrypto;   -- gen_random_uuid()
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
  name_hi text not null,
  address_hi text,
  phone text,
  whatsapp text,
  travel_mode travel_mode,
  health_bp boolean default false,
  health_diabetes boolean default false,
  photo_url text,
  form_image_url text,
  status reg_status not null default 'submitted',
  ocr_confidence numeric,
  raw_json jsonb,
  created_at timestamptz not null default now()
);

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

-- ---------- Views ----------
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
  p_whatsapp text,
  p_travel_mode travel_mode,
  p_health_bp boolean,
  p_health_diabetes boolean,
  p_photo_url text,
  p_form_image_url text
) returns uuid
language plpgsql
as $$
declare
  new_id uuid;
begin
  insert into public.yatra_registrations (
    owner, created_by, name_hi, address_hi, phone, whatsapp,
    travel_mode, health_bp, health_diabetes, photo_url, form_image_url
  ) values (
    p_owner, p_created_by, p_name_hi, p_address_hi, p_phone, p_whatsapp,
    p_travel_mode, coalesce(p_health_bp,false), coalesce(p_health_diabetes,false),
    p_photo_url, p_form_image_url
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
  update public.yatra_registrations set
    name_hi       = coalesce((p_patch->>'name_hi'), name_hi),
    address_hi    = coalesce((p_patch->>'address_hi'), address_hi),
    phone         = coalesce((p_patch->>'phone'), phone),
    whatsapp      = coalesce((p_patch->>'whatsapp'), whatsapp),
    travel_mode   = coalesce((p_patch->>'travel_mode')::travel_mode, travel_mode),
    health_bp     = coalesce((p_patch->>'health_bp')::boolean, health_bp),
    health_diabetes = coalesce((p_patch->>'health_diabetes')::boolean, health_diabetes),
    photo_url     = coalesce((p_patch->>'photo_url'), photo_url),
    form_image_url= coalesce((p_patch->>'form_image_url'), form_image_url),
    status        = coalesce((p_patch->>'status')::reg_status, status),
    ocr_confidence= coalesce((p_patch->>'ocr_confidence')::numeric, ocr_confidence),
    raw_json      = case when p_patch ? 'raw_json'
                         then coalesce((p_patch->'raw_json')::jsonb, raw_json)
                         else raw_json end
  where id = p_id;
end$$;

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
-- (Grant explicitly to authenticated if you want, but prefer using service key via server)

-- ---------- Storage Buckets & Policies ----------
-- Create private buckets if they don't exist
insert into storage.buckets (id, name, public)
values
  ('forms','forms', false),
  ('photos','photos', false)
on conflict (id) do nothing;

-- Basic storage RLS: by default, storage.objects has RLS enabled in Supabase.
-- We will keep uploads via signed URLs from the server (Cloud Run),
-- so we don't open generic client-side insert here.

-- Allow reads via signed URLs (no SQL policy needed for signed URLs).
-- If you want staff to list/read via SQL, you can add:
drop policy if exists "staff read forms" on storage.objects;
create policy "staff read forms" on storage.objects
for select using (
  bucket_id in ('forms','photos') and (auth.jwt() ->> 'role') in ('reviewer','admin')
);

-- ---------- Seeds (optional) ----------
-- SEED 1: create a sample registration IF you already have a user id
-- replace the UUIDs with real auth.users(id) values
-- insert into public.yatra_registrations (
--   owner, created_by, name_hi, address_hi, phone, whatsapp, travel_mode,
--   health_bp, health_diabetes, photo_url, form_image_url, status
-- ) values (
--   '11111111-1111-1111-1111-111111111111', -- owner
--   '11111111-1111-1111-1111-111111111111', -- created_by
--   'राम कुमार', 'पुरी, ओडिशा', '+919876543210', '+919876543210', 'train',
--   false, false, null, null, 'submitted'
-- );

-- SEED 2: promote a known user to admin (replace UUID)
-- select public.admin_set_user_role('11111111-1111-1111-1111-111111111111'::uuid, 'admin');

commit;

-- =====================================================================
-- Quick CRUD examples (for reference; not required in migration):
-- select public.fn_create_registration(<owner>, <created_by>, 'नाम', 'पता', '+91...', '+91...', 'train', false, false, null, null);
-- select public.fn_update_registration(<reg_id>, '{"status":"needs_review"}');
-- select public.fn_create_review(<reg_id>, 'approve', '{"fixed":{"phone":"..."} }', <actor>);
-- =====================================================================

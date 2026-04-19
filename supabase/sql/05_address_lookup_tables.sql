
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

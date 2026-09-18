-- Train rake / coach / berth master (additive). Supports multiple formations per train.

begin;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'master_verification_status') then
    create type public.master_verification_status as enum (
      'verified',
      'derived',
      'assumed',
      'unknown'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'master_coach_role') then
    create type public.master_coach_role as enum (
      'locomotive',
      'passenger_reserved',
      'general_unreserved',
      'service',
      'guard_luggage'
    );
  end if;
end$$;

-- Extend train master (nullable metadata + traceability)
alter table public.master_trains
  add column if not exists short_name text,
  add column if not exists train_type text,
  add column if not exists railway_zone text,
  add column if not exists rake_type text,
  add column if not exists distance_km int,
  add column if not exists origin_departure_time time,
  add column if not exists destination_arrival_time time,
  add column if not exists arrival_day_offset int,
  add column if not exists scheduled_halts int,
  add column if not exists max_speed_kmph int,
  add column if not exists pantry_available boolean,
  add column if not exists catering_available boolean,
  add column if not exists bedroll_available boolean,
  add column if not exists active boolean not null default true,
  add column if not exists source_url text,
  add column if not exists source_checked_at date,
  add column if not exists verification_status public.master_verification_status,
  add column if not exists notes text,
  add column if not exists updated_at timestamptz not null default now();

comment on column public.master_trains.rake_type is 'e.g. LHB — physical rake family, not a specific formation';

create table if not exists public.master_train_rakes (
  id uuid primary key default gen_random_uuid(),
  train_id uuid not null references public.master_trains(id) on delete cascade,
  rake_code text not null,
  description text,
  valid_from date,
  valid_to date,
  is_active boolean not null default true,
  source_url text,
  verification_status public.master_verification_status not null default 'unknown',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint master_train_rakes_train_code_unique unique (train_id, rake_code)
);

create index if not exists idx_master_train_rakes_train_id on public.master_train_rakes(train_id);

create table if not exists public.master_rake_coaches (
  id uuid primary key default gen_random_uuid(),
  rake_id uuid not null references public.master_train_rakes(id) on delete cascade,
  position_number int not null,
  coach_code text not null,
  coach_class text not null,
  coach_role public.master_coach_role not null,
  nominal_capacity int,
  passenger_bookable boolean not null default false,
  reserved_inventory boolean not null default false,
  numbered_assignment boolean not null default true,
  service_coach boolean not null default false,
  verification_status public.master_verification_status not null default 'unknown',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint master_rake_coaches_position_unique unique (rake_id, position_number),
  constraint master_rake_coaches_code_unique unique (rake_id, coach_code),
  constraint master_rake_coaches_capacity_nonneg check (
    nominal_capacity is null or nominal_capacity >= 0
  )
);

create index if not exists idx_master_rake_coaches_rake_id on public.master_rake_coaches(rake_id);
create index if not exists idx_master_rake_coaches_class on public.master_rake_coaches(coach_class);

create table if not exists public.master_coach_berths (
  id uuid primary key default gen_random_uuid(),
  rake_coach_id uuid not null references public.master_rake_coaches(id) on delete cascade,
  berth_number int not null,
  berth_type public.berth_type not null,
  bay_number int not null,
  is_bookable boolean not null default true,
  is_lower boolean not null default false,
  is_side boolean not null default false,
  created_at timestamptz not null default now(),
  constraint master_coach_berths_unique unique (rake_coach_id, berth_number),
  constraint master_coach_berths_number_positive check (berth_number > 0),
  constraint master_coach_berths_bay_positive check (bay_number > 0)
);

create index if not exists idx_master_coach_berths_coach on public.master_coach_berths(rake_coach_id);
create index if not exists idx_master_coach_berths_type on public.master_coach_berths(berth_type);

-- Berth layout helpers (LHB nominal patterns)
create or replace function public.fn_lhb_berth_type_sl_3a(p_berth int)
returns public.berth_type
language sql
immutable
as $$
  select case ((p_berth - 1) % 8) + 1
    when 1 then 'LB'::public.berth_type
    when 2 then 'MB'::public.berth_type
    when 3 then 'UB'::public.berth_type
    when 4 then 'LB'::public.berth_type
    when 5 then 'MB'::public.berth_type
    when 6 then 'UB'::public.berth_type
    when 7 then 'SL'::public.berth_type
    else 'SU'::public.berth_type
  end;
$$;

create or replace function public.fn_lhb_berth_type_2a(p_berth int)
returns public.berth_type
language sql
immutable
as $$
  select case
    when p_berth between 49 and 52 then case p_berth
      when 49 then 'LB'::public.berth_type
      when 50 then 'UB'::public.berth_type
      when 51 then 'SL'::public.berth_type
      else 'SU'::public.berth_type
    end
    else case ((p_berth - 1) % 6) + 1
      when 1 then 'LB'::public.berth_type
      when 2 then 'UB'::public.berth_type
      when 3 then 'LB'::public.berth_type
      when 4 then 'UB'::public.berth_type
      when 5 then 'SL'::public.berth_type
      else 'SU'::public.berth_type
    end
  end;
$$;

create or replace function public.fn_lhb_bay_sl_3a(p_berth int)
returns int
language sql
immutable
as $$
  select ((p_berth - 1) / 8) + 1;
$$;

create or replace function public.fn_lhb_bay_2a(p_berth int)
returns int
language sql
immutable
as $$
  select case when p_berth >= 49 then 9 else ((p_berth - 1) / 6) + 1 end;
$$;

create or replace function public.fn_seed_coach_berths(
  p_rake_coach_id uuid,
  p_coach_class text,
  p_capacity int
) returns int
language plpgsql
as $$
declare
  n int;
  bt public.berth_type;
  bay int;
begin
  delete from public.master_coach_berths where rake_coach_id = p_rake_coach_id;

  for n in 1..p_capacity loop
    if p_coach_class = '2A' then
      bt := public.fn_lhb_berth_type_2a(n);
      bay := public.fn_lhb_bay_2a(n);
    elsif p_coach_class in ('3A', 'SL') then
      bt := public.fn_lhb_berth_type_sl_3a(n);
      bay := public.fn_lhb_bay_sl_3a(n);
    else
      raise exception 'Unsupported coach class for berths: %', p_coach_class;
    end if;

    insert into public.master_coach_berths (
      rake_coach_id, berth_number, berth_type, bay_number, is_bookable,
      is_lower, is_side
    ) values (
      p_rake_coach_id, n, bt, bay, true,
      bt in ('LB'::public.berth_type, 'SL'::public.berth_type),
      bt in ('SL'::public.berth_type, 'SU'::public.berth_type)
    );
  end loop;

  return p_capacity;
end;
$$;

-- Capacity summary view (per train + rake)
create or replace view public.train_rake_capacity_summary as
select
  mt.train_no,
  mt.train_name,
  r.rake_code,
  r.is_active as rake_active,
  count(*) filter (where c.coach_class = '2A') as ac2_coaches,
  count(*) filter (where c.coach_class = '3A') as ac3_coaches,
  count(*) filter (where c.coach_class = 'SL') as sleeper_coaches,
  count(*) filter (where c.coach_class = 'GEN') as general_coaches,
  coalesce(sum(b.cnt) filter (where c.coach_class = '2A'), 0) as ac2_berths,
  coalesce(sum(b.cnt) filter (where c.coach_class = '3A'), 0) as ac3_berths,
  coalesce(sum(b.cnt) filter (where c.coach_class = 'SL'), 0) as sleeper_berths,
  coalesce(sum(c.nominal_capacity) filter (where c.coach_class = 'GEN'), 0) as general_nominal_seats,
  coalesce(sum(b.cnt) filter (where c.reserved_inventory), 0) as reserved_berths_total,
  coalesce(sum(c.nominal_capacity) filter (where c.passenger_bookable), 0) as nominal_passenger_capacity
from public.master_trains mt
join public.master_train_rakes r on r.train_id = mt.id
join public.master_rake_coaches c on c.rake_id = r.id
left join lateral (
  select count(*)::int as cnt from public.master_coach_berths cb where cb.rake_coach_id = c.id
) b on true
group by mt.train_no, mt.train_name, r.rake_code, r.is_active;

-- RLS
alter table public.master_train_rakes enable row level security;
alter table public.master_rake_coaches enable row level security;
alter table public.master_coach_berths enable row level security;

drop policy if exists "staff manage master train rakes" on public.master_train_rakes;
create policy "staff manage master train rakes" on public.master_train_rakes
for all using (public.fn_is_staff()) with check (public.fn_is_staff());

drop policy if exists "authenticated read master train rakes" on public.master_train_rakes;
create policy "authenticated read master train rakes" on public.master_train_rakes
for select using (auth.role() = 'authenticated');

drop policy if exists "staff manage master rake coaches" on public.master_rake_coaches;
create policy "staff manage master rake coaches" on public.master_rake_coaches
for all using (public.fn_is_staff()) with check (public.fn_is_staff());

drop policy if exists "authenticated read master rake coaches" on public.master_rake_coaches;
create policy "authenticated read master rake coaches" on public.master_rake_coaches
for select using (auth.role() = 'authenticated');

drop policy if exists "staff manage master coach berths" on public.master_coach_berths;
create policy "staff manage master coach berths" on public.master_coach_berths
for all using (public.fn_is_staff()) with check (public.fn_is_staff());

drop policy if exists "authenticated read master coach berths" on public.master_coach_berths;
create policy "authenticated read master coach berths" on public.master_coach_berths
for select using (auth.role() = 'authenticated');

-- Allow authenticated read on existing master train tables (allocation UI)
drop policy if exists "authenticated read master trains" on public.master_trains;
create policy "authenticated read master trains" on public.master_trains
for select using (auth.role() = 'authenticated');

drop policy if exists "authenticated read master train stops" on public.master_train_stops;
create policy "authenticated read master train stops" on public.master_train_stops
for select using (auth.role() = 'authenticated');

drop policy if exists "authenticated read master stations" on public.master_stations;
create policy "authenticated read master stations" on public.master_stations
for select using (auth.role() = 'authenticated');

commit;

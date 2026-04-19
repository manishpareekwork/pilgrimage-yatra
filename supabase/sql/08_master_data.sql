
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
  mt_train_no text;
  mt_train_name text;
  mt_source_station_code text;
  mt_destination_station_code text;
begin
  if new.train_master_id is null then
    return new;
  end if;

  select train_no, train_name, source_station_code, destination_station_code
  into mt_train_no, mt_train_name, mt_source_station_code, mt_destination_station_code
  from public.master_trains
  where id = new.train_master_id;

  if not found then
    return new;
  end if;

  if new.mode = 'train' then
    if coalesce(btrim(new.train_no), '') = '' then
      new.train_no := mt_train_no;
    end if;
    if coalesce(btrim(new.train_name), '') = '' then
      new.train_name := mt_train_name;
    end if;
    if coalesce(btrim(new.from_station_code), '') = '' then
      new.from_station_code := mt_source_station_code;
    end if;
    if coalesce(btrim(new.to_station_code), '') = '' then
      new.to_station_code := mt_destination_station_code;
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
  mt_id uuid;
  mt_train_no text;
  mt_train_name text;
  mt_src text;
  mt_dst text;
  fs_depart_time time;
  fs_day_offset int;
  ls_arrive_time time;
  ls_day_offset int;
  depart_ts timestamptz;
  arrive_ts timestamptz;
  new_id uuid;
begin
  if (auth.jwt() ->> 'role') not in ('reviewer', 'admin') then
    raise exception 'Not authorized';
  end if;

  select id, train_no, train_name, source_station_code, destination_station_code
  into mt_id, mt_train_no, mt_train_name, mt_src, mt_dst
  from public.master_trains
  where train_no = p_train_no;

  if not found then
    raise exception 'Train not found';
  end if;

  select depart_time, day_offset
  into fs_depart_time, fs_day_offset
  from public.master_train_stops
  where train_id = mt_id
  order by stop_seq asc
  limit 1;

  select arrive_time, day_offset
  into ls_arrive_time, ls_day_offset
  from public.master_train_stops
  where train_id = mt_id
  order by stop_seq desc
  limit 1;

  if fs_depart_time is not null then
    depart_ts := (p_journey_date + coalesce(fs_day_offset, 0) + fs_depart_time)::timestamptz;
  end if;

  if ls_arrive_time is not null then
    arrive_ts := (p_journey_date + coalesce(ls_day_offset, 0) + ls_arrive_time)::timestamptz;
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
    format('%s %s', mt_train_no, mt_train_name),
    p_journey_date,
    depart_ts,
    arrive_ts,
    mt_id,
    mt_train_no,
    mt_train_name,
    mt_src,
    mt_dst
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

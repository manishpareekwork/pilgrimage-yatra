-- Route versioning, stop enrichment, coach-class master, views (additive).

begin;

-- Optional traceability registry (train/route/rake may also carry source_url directly)
create table if not exists public.master_data_sources (
  id uuid primary key default gen_random_uuid(),
  source_name text not null,
  source_url text,
  source_type text,
  checked_at date,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.master_train_routes (
  id uuid primary key default gen_random_uuid(),
  train_id uuid not null references public.master_trains(id) on delete cascade,
  route_code text not null,
  description text,
  valid_from date,
  valid_to date,
  is_active boolean not null default true,
  source_url text,
  source_checked_at date,
  verification_status public.master_verification_status not null default 'unknown',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint master_train_routes_train_code_unique unique (train_id, route_code)
);

create index if not exists idx_master_train_routes_train on public.master_train_routes(train_id);

alter table public.master_stations
  add column if not exists active boolean not null default true,
  add column if not exists source_url text,
  add column if not exists verification_status public.master_verification_status,
  add column if not exists updated_at timestamptz not null default now();

alter table public.master_train_stops
  add column if not exists route_id uuid references public.master_train_routes(id) on delete set null,
  add column if not exists arrive_day_number int,
  add column if not exists depart_day_number int,
  add column if not exists is_origin boolean not null default false,
  add column if not exists is_destination boolean not null default false,
  add column if not exists commercial_halt boolean not null default true,
  add column if not exists halt_minutes_derived boolean not null default false,
  add column if not exists notes text;

comment on column public.master_train_stops.day_offset is
  'Legacy 0-based day offset from origin departure day; kept in sync with depart_day_number - 1 where applicable';

alter table public.master_train_rakes
  add column if not exists formation_direction text,
  add column if not exists orientation_note text;

create table if not exists public.master_coach_classes (
  coach_class_code text primary key,
  display_name text not null,
  reservation_type text not null,
  passenger_bookable boolean not null default false,
  sleeping_accommodation boolean not null default false,
  nominal_capacity int,
  capacity_unit text,
  service_coach boolean not null default false,
  verification_status public.master_verification_status not null default 'unknown',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.master_coach_classes (
  coach_class_code, display_name, reservation_type, passenger_bookable,
  sleeping_accommodation, nominal_capacity, capacity_unit, service_coach, verification_status, notes
) values
  ('2A', 'AC 2 Tier', 'RESERVED', true, true, 52, 'BERTH', false, 'derived', 'LHB nominal'),
  ('3A', 'AC 3 Tier', 'RESERVED', true, true, 72, 'BERTH', false, 'derived', 'LHB nominal'),
  ('SL', 'Sleeper', 'RESERVED', true, true, 80, 'BERTH', false, 'derived', 'LHB nominal'),
  ('GEN', 'General Second Class', 'UNRESERVED', true, false, 100, 'SEAT', false, 'assumed', 'Nominal LHB GS seating'),
  ('PC', 'Pantry Car', 'SERVICE', false, false, null, 'NONE', true, 'verified', null),
  ('EOG', 'End-on Generator', 'SERVICE', false, false, null, 'NONE', true, 'verified', null),
  ('SLR', 'Seating-cum-Luggage / Guard', 'MIXED', false, false, null, 'NONE', false, 'unknown', 'Capacity varies by rake'),
  ('NONE', 'Non-passenger / Locomotive', 'NONE', false, false, null, 'NONE', true, 'verified', null)
on conflict (coach_class_code) do update set
  display_name = excluded.display_name,
  reservation_type = excluded.reservation_type,
  passenger_bookable = excluded.passenger_bookable,
  sleeping_accommodation = excluded.sleeping_accommodation,
  nominal_capacity = excluded.nominal_capacity,
  capacity_unit = excluded.capacity_unit,
  service_coach = excluded.service_coach,
  verification_status = excluded.verification_status,
  notes = excluded.notes,
  updated_at = now();

-- Halt minutes from calendar-aware arrival/departure
create or replace function public.fn_stop_halt_minutes(
  p_arrive time,
  p_depart time,
  p_arrive_day int,
  p_depart_day int
) returns int
language sql
immutable
as $$
  select case
    when p_arrive is null or p_depart is null or p_arrive_day is null or p_depart_day is null then null
    else greatest(
      0,
      (
        (p_depart_day - 1) * 1440 + extract(hour from p_depart)::int * 60 + extract(minute from p_depart)::int
      ) - (
        (p_arrive_day - 1) * 1440 + extract(hour from p_arrive)::int * 60 + extract(minute from p_arrive)::int
      )
      + case when p_depart < p_arrive and p_depart_day = p_arrive_day then 1440 else 0 end
    )
  end;
$$;

create or replace view public.train_route_details as
select
  mt.train_no,
  mt.train_name,
  tr.route_code,
  tr.is_active as route_active,
  mts.stop_seq as sequence_number,
  mts.station_code,
  ms.name as station_name,
  mts.arrive_time,
  mts.depart_time,
  mts.arrive_day_number,
  mts.depart_day_number,
  coalesce(mts.depart_day_number, mts.arrive_day_number) as day_number,
  mts.halt_minutes,
  mts.distance_km as distance_from_origin_km,
  mts.is_origin,
  mts.is_destination,
  mts.commercial_halt,
  mts.day_offset
from public.master_trains mt
join public.master_train_routes tr on tr.train_id = mt.id
join public.master_train_stops mts on mts.route_id = tr.id
join public.master_stations ms on ms.code = mts.station_code;

create or replace view public.train_rake_formation as
select
  mt.train_no,
  r.rake_code,
  r.is_active as rake_active,
  r.formation_direction,
  r.orientation_note,
  c.position_number,
  c.coach_code,
  c.coach_class,
  cc.display_name as coach_class_name,
  c.coach_role,
  c.nominal_capacity,
  c.passenger_bookable,
  c.reserved_inventory as reserved,
  c.service_coach,
  c.verification_status
from public.master_trains mt
join public.master_train_rakes r on r.train_id = mt.id
join public.master_rake_coaches c on c.rake_id = r.id
left join public.master_coach_classes cc on cc.coach_class_code = c.coach_class;

create or replace view public.train_rake_class_capacity as
select
  mt.train_no,
  r.rake_code,
  c.coach_class,
  count(*) as coach_count,
  max(c.nominal_capacity) as capacity_per_coach,
  sum(c.nominal_capacity) filter (where c.reserved_inventory) as reserved_berths,
  sum(c.nominal_capacity) filter (where c.coach_class = 'GEN') as general_nominal_seats,
  count(*) filter (where c.service_coach) as service_coaches,
  count(*) filter (where c.passenger_bookable and not c.service_coach) as total_passenger_coaches
from public.master_trains mt
join public.master_train_rakes r on r.train_id = mt.id
join public.master_rake_coaches c on c.rake_id = r.id
group by mt.train_no, r.rake_code, c.coach_class;

create or replace view public.train_master_summary as
select
  mt.train_no,
  mt.train_name,
  mt.source_station_code as origin_code,
  os.name as origin_name,
  mt.destination_station_code as destination_code,
  ds.name as destination_name,
  mt.distance_km,
  mt.origin_departure_time,
  mt.destination_arrival_time,
  mt.arrival_day_offset,
  (select min(coalesce(s.depart_day_number, s.arrive_day_number))
   from public.master_train_stops s where s.train_id = mt.id) as journey_start_day,
  (select max(coalesce(s.arrive_day_number, s.depart_day_number))
   from public.master_train_stops s where s.train_id = mt.id) as journey_end_day,
  (select count(*) from public.master_train_stops s where s.train_id = mt.id) as route_stop_count,
  (select cs.reserved_berths_total from public.train_rake_capacity_summary cs
   where cs.train_no = mt.train_no and cs.rake_active limit 1) as active_rake_reserved_berths,
  (select cs.general_nominal_seats from public.train_rake_capacity_summary cs
   where cs.train_no = mt.train_no and cs.rake_active limit 1) as active_rake_general_seats
from public.master_trains mt
join public.master_stations os on os.code = mt.source_station_code
join public.master_stations ds on ds.code = mt.destination_station_code;

create or replace function public.fn_validate_train_route(p_route_id uuid)
returns void
language plpgsql
as $$
declare
  n int;
  prev_dist int;
  prev_day int;
  prev_code text;
  r record;
  exp_origin text;
  exp_dest text;
begin
  select t.source_station_code, t.destination_station_code
  into exp_origin, exp_dest
  from public.master_train_routes tr
  join public.master_trains t on t.id = tr.train_id
  where tr.id = p_route_id;

  select count(*) into n from public.master_train_stops where route_id = p_route_id;
  if n = 0 then
    raise exception 'Route % has no stops', p_route_id;
  end if;

  if (select count(*) from public.master_train_stops where route_id = p_route_id and is_origin) <> 1 then
    raise exception 'Route must have exactly one origin';
  end if;
  if (select count(*) from public.master_train_stops where route_id = p_route_id and is_destination) <> 1 then
    raise exception 'Route must have exactly one destination';
  end if;
  if (select station_code from public.master_train_stops where route_id = p_route_id and is_origin) <> exp_origin then
    raise exception 'Origin must be %', exp_origin;
  end if;
  if (select station_code from public.master_train_stops where route_id = p_route_id and is_destination) <> exp_dest then
    raise exception 'Destination must be %', exp_dest;
  end if;

  if (select stop_seq from public.master_train_stops where route_id = p_route_id and is_origin)
     <> (select min(stop_seq) from public.master_train_stops where route_id = p_route_id) then
    raise exception 'Origin must be first sequence';
  end if;
  if (select stop_seq from public.master_train_stops where route_id = p_route_id and is_destination)
     <> (select max(stop_seq) from public.master_train_stops where route_id = p_route_id) then
    raise exception 'Destination must be last sequence';
  end if;

  if (select count(*) from (
    select stop_seq from public.master_train_stops where route_id = p_route_id group by stop_seq having count(*) > 1
  ) d) > 0 then
    raise exception 'Duplicate stop sequence';
  end if;

  prev_dist := -1;
  prev_day := 0;
  prev_code := null;
  for r in
    select * from public.master_train_stops where route_id = p_route_id order by stop_seq
  loop
    if prev_code is not null and prev_code = r.station_code then
      raise exception 'Duplicate consecutive station at seq %', r.stop_seq;
    end if;
    prev_code := r.station_code;
    if r.station_code <> upper(r.station_code) then
      raise exception 'Station code not uppercase: %', r.station_code;
    end if;
    if r.distance_km is not null and r.distance_km < prev_dist then
      raise exception 'Distance decreased at seq %', r.stop_seq;
    end if;
    if r.distance_km is not null then
      prev_dist := r.distance_km;
    end if;
    if coalesce(r.arrive_day_number, r.depart_day_number, 1) < prev_day then
      raise exception 'Day number decreased at seq %', r.stop_seq;
    end if;
    prev_day := coalesce(r.depart_day_number, r.arrive_day_number, prev_day);
    if r.halt_minutes is not null and r.halt_minutes < 0 then
      raise exception 'Negative halt at seq %', r.stop_seq;
    end if;
  end loop;

  if (select distance_km from public.master_train_stops where route_id = p_route_id and is_origin) is distinct from 0 then
    raise exception 'Origin distance must be 0';
  end if;
end;
$$;

create or replace function public.fn_train_master_json(p_train_no text)
returns jsonb
language sql
stable
as $$
  with t as (
    select * from public.master_trains where train_no = p_train_no
  ),
  route as (
    select jsonb_agg(
      jsonb_build_object(
        'sequence', d.sequence_number,
        'station_code', d.station_code,
        'station_name', d.station_name,
        'arrival_time', d.arrive_time,
        'departure_time', d.depart_time,
        'arrive_day', d.arrive_day_number,
        'depart_day', d.depart_day_number,
        'halt_minutes', d.halt_minutes,
        'distance_km', d.distance_from_origin_km,
        'is_origin', d.is_origin,
        'is_destination', d.is_destination
      ) order by d.sequence_number
    ) as stops
    from public.train_route_details d
    join t on t.train_no = d.train_no
    where d.route_active
  ),
  rakes as (
    select jsonb_agg(
      jsonb_build_object(
        'rake_code', f.rake_code,
        'active', f.rake_active,
        'formation_direction', f.formation_direction,
        'coaches', (
          select jsonb_agg(jsonb_build_object(
            'position', ff.position_number,
            'coach_code', ff.coach_code,
            'class', ff.coach_class,
            'capacity', ff.nominal_capacity,
            'bookable', ff.passenger_bookable,
            'reserved', ff.reserved,
            'service', ff.service_coach
          ) order by ff.position_number)
          from public.train_rake_formation ff
          where ff.train_no = f.train_no and ff.rake_code = f.rake_code
        )
      ) order by f.rake_code
    ) as rake_list
    from (
      select distinct train_no, rake_code, rake_active, formation_direction
      from public.train_rake_formation
      where train_no = p_train_no
    ) f
  ),
  cap as (
    select cs.reserved_berths_total as reserved,
           cs.general_nominal_seats as general_nominal
    from public.train_rake_capacity_summary cs
    join t on t.train_no = cs.train_no
    where cs.rake_active
    limit 1
  )
  select jsonb_build_object(
    'train_number', t.train_no,
    'train_name', t.train_name,
    'origin', jsonb_build_object('code', t.source_station_code, 'name', (select name from master_stations where code = t.source_station_code)),
    'destination', jsonb_build_object('code', t.destination_station_code, 'name', (select name from master_stations where code = t.destination_station_code)),
    'distance_km', t.distance_km,
    'route', coalesce((select stops from route), '[]'::jsonb),
    'rakes', coalesce((select rake_list from rakes), '[]'::jsonb),
    'capacity', (select jsonb_build_object('reserved', reserved, 'general_nominal', general_nominal) from cap)
  )
  from t;
$$;

-- RLS
alter table public.master_train_routes enable row level security;
alter table public.master_data_sources enable row level security;
alter table public.master_coach_classes enable row level security;

drop policy if exists "staff manage master train routes" on public.master_train_routes;
create policy "staff manage master train routes" on public.master_train_routes
for all using (public.fn_is_staff()) with check (public.fn_is_staff());

drop policy if exists "authenticated read master train routes" on public.master_train_routes;
create policy "authenticated read master train routes" on public.master_train_routes
for select using (auth.role() = 'authenticated');

drop policy if exists "staff manage master data sources" on public.master_data_sources;
create policy "staff manage master data sources" on public.master_data_sources
for all using (public.fn_is_staff()) with check (public.fn_is_staff());

drop policy if exists "authenticated read master data sources" on public.master_data_sources;
create policy "authenticated read master data sources" on public.master_data_sources
for select using (auth.role() = 'authenticated');

drop policy if exists "staff manage master coach classes" on public.master_coach_classes;
create policy "staff manage master coach classes" on public.master_coach_classes
for all using (public.fn_is_staff()) with check (public.fn_is_staff());

drop policy if exists "authenticated read master coach classes" on public.master_coach_classes;
create policy "authenticated read master coach classes" on public.master_coach_classes
for select using (auth.role() = 'authenticated');

commit;

-- Seed Train 20824 — Ajmer–Puri SF Express (LHB rakes + berth inventory for RAKE-1)

begin;

insert into public.master_stations (code, name, state)
values
  ('AII', 'Ajmer Junction', 'Rajasthan'),
  ('PURI', 'Puri', 'Odisha')
on conflict (code) do update
set name = excluded.name,
    state = excluded.state;

insert into public.master_trains (
  train_no,
  train_name,
  short_name,
  source_station_code,
  destination_station_code,
  typical_duration_minutes,
  train_type,
  railway_zone,
  rake_type,
  distance_km,
  origin_departure_time,
  destination_arrival_time,
  arrival_day_offset,
  scheduled_halts,
  max_speed_kmph,
  pantry_available,
  catering_available,
  bedroll_available,
  active,
  source_url,
  source_checked_at,
  verification_status,
  notes
) values (
  '20824',
  'Ajmer – Puri SuperFast Express',
  'AII PURI SF EXP',
  'AII',
  'PURI',
  2610,
  'SuperFast Express',
  'East Coast Railway (ECoR)',
  'LHB',
  2478,
  '19:10'::time,
  '14:40'::time,
  2,
  40,
  130,
  true,
  true,
  null,
  true,
  'https://indiarailinfo.com/train/-train-ajmer-puri-sf-express-20824/22149/280/217',
  current_date,
  'verified',
  'Runs Tue/Thu per public timetables. AII departure also published as 19:20 on some sites — confirm before ops. Full route halts not seeded in this migration (origin/destination only).'
)
on conflict (train_no) do update set
  train_name = excluded.train_name,
  short_name = excluded.short_name,
  source_station_code = excluded.source_station_code,
  destination_station_code = excluded.destination_station_code,
  typical_duration_minutes = excluded.typical_duration_minutes,
  train_type = excluded.train_type,
  railway_zone = excluded.railway_zone,
  rake_type = excluded.rake_type,
  distance_km = excluded.distance_km,
  origin_departure_time = excluded.origin_departure_time,
  destination_arrival_time = excluded.destination_arrival_time,
  arrival_day_offset = excluded.arrival_day_offset,
  scheduled_halts = excluded.scheduled_halts,
  max_speed_kmph = excluded.max_speed_kmph,
  pantry_available = excluded.pantry_available,
  catering_available = excluded.catering_available,
  bedroll_available = excluded.bedroll_available,
  active = excluded.active,
  source_url = excluded.source_url,
  source_checked_at = excluded.source_checked_at,
  verification_status = excluded.verification_status,
  notes = excluded.notes,
  updated_at = now();

-- Origin / destination only (intermediate halts deferred — see docs/train-master-20824.md)
insert into public.master_train_stops (train_id, stop_seq, station_code, arrive_time, depart_time, day_offset, distance_km)
select id, 1, 'AII', null, '19:10'::time, 0, 0
from public.master_trains where train_no = '20824'
on conflict (train_id, stop_seq) do update set
  station_code = excluded.station_code,
  depart_time = excluded.depart_time,
  day_offset = excluded.day_offset,
  distance_km = excluded.distance_km;

insert into public.master_train_stops (train_id, stop_seq, station_code, arrive_time, depart_time, day_offset, distance_km)
select id, 2, 'PURI', '14:40'::time, null, 2, 2478
from public.master_trains where train_no = '20824'
on conflict (train_id, stop_seq) do update set
  station_code = excluded.station_code,
  arrive_time = excluded.arrive_time,
  day_offset = excluded.day_offset,
  distance_km = excluded.distance_km;

create or replace function public.seed_20824_rake_coaches(
  p_rake_id uuid,
  p_with_berths boolean
) returns void
language plpgsql
as $$
declare
  c record;
  coach_id uuid;
begin
  delete from public.master_rake_coaches where rake_id = p_rake_id;

  for c in
    select * from (values
      (0, 'LOCO', 'NONE', 'locomotive'::public.master_coach_role, null::int, false, false, false, true, 'verified'::public.master_verification_status, null::text),
      (1, 'SLR', 'SLR', 'guard_luggage'::public.master_coach_role, null, false, false, false, true, 'unknown', 'SLR staff/luggage layout not verified for this rake'),
      (2, 'B1', '3A', 'passenger_reserved', 72, true, true, true, false, 'derived', 'LHB 3A nominal 72 berths'),
      (3, 'A2', '2A', 'passenger_reserved', 52, true, true, true, false, 'derived', 'LHB 2A nominal 52 berths; berths 49-52 pattern assumed per project spec'),
      (4, 'A1', '2A', 'passenger_reserved', 52, true, true, true, false, 'derived', null),
      (5, 'B2', '3A', 'passenger_reserved', 72, true, true, true, false, 'derived', null),
      (6, 'B3', '3A', 'passenger_reserved', 72, true, true, true, false, 'derived', null),
      (7, 'B4', '3A', 'passenger_reserved', 72, true, true, true, false, 'derived', null),
      (8, 'B5', '3A', 'passenger_reserved', 72, true, true, true, false, 'derived', null),
      (9, 'B6', '3A', 'passenger_reserved', 72, true, true, true, false, 'derived', null),
      (10, 'B7', '3A', 'passenger_reserved', 72, true, true, true, false, 'derived', null),
      (11, 'PC', 'PC', 'service', null, false, false, false, true, 'verified', 'Pantry car — not passenger inventory'),
      (12, 'S1', 'SL', 'passenger_reserved', 80, true, true, true, false, 'derived', 'LHB SL nominal 80 berths'),
      (13, 'S2', 'SL', 'passenger_reserved', 80, true, true, true, false, 'derived', null),
      (14, 'S3', 'SL', 'passenger_reserved', 80, true, true, true, false, 'derived', null),
      (15, 'S4', 'SL', 'passenger_reserved', 80, true, true, true, false, 'derived', null),
      (16, 'S5', 'SL', 'passenger_reserved', 80, true, true, true, false, 'derived', null),
      (17, 'S6', 'SL', 'passenger_reserved', 80, true, true, true, false, 'derived', null),
      (18, 'GS1', 'GEN', 'general_unreserved', 100, true, false, false, false, 'assumed', 'Nominal LHB GS seating 100 — unreserved, no berth rows'),
      (19, 'GS2', 'GEN', 'general_unreserved', 100, true, false, false, false, 'assumed', null),
      (20, 'GS3', 'GEN', 'general_unreserved', 100, true, false, false, false, 'assumed', null),
      (21, 'GS4', 'GEN', 'general_unreserved', 100, true, false, false, false, 'assumed', null),
      (22, 'EOG', 'EOG', 'service', null, false, false, false, true, 'verified', 'End-on generator — staff/service, not sold berths')
    ) as t(pos, code, class, role, cap, pax_book, reserved, numbered, service, vstat, n)
  loop
    insert into public.master_rake_coaches (
      rake_id, position_number, coach_code, coach_class, coach_role,
      nominal_capacity, passenger_bookable, reserved_inventory, numbered_assignment,
      service_coach, verification_status, notes
    ) values (
      p_rake_id, c.pos, c.code, c.class, c.role,
      c.cap, c.pax_book, c.reserved, c.numbered,
      c.service, c.vstat, c.n
    )
    returning id into coach_id;

    if p_with_berths and c.reserved and c.cap is not null then
      perform public.fn_seed_coach_berths(coach_id, c.class, c.cap);
    end if;
  end loop;
end;
$$;

-- Alternate rake skeletons (coach order only — no berth generation)
create or replace function public.seed_20824_rake_skeleton(
  p_rake_id uuid,
  p_coaches text[]
) returns void
language plpgsql
as $$
declare
  i int;
  code text;
  coach_code text;
  cls text;
  role public.master_coach_role;
  cap int;
  reserved boolean;
  bookable boolean;
  service boolean;
  numbered_assign boolean;
  gs_idx int := 0;
begin
  delete from public.master_rake_coaches where rake_id = p_rake_id;
  for i in 0..array_length(p_coaches, 1) - 1 loop
    code := p_coaches[i + 1];
    coach_code := code;
    cls := 'NONE';
    role := 'service';
    cap := null;
    reserved := false;
    bookable := false;
    service := true;
    numbered_assign := false;

    if code = 'LOCO' then
      role := 'locomotive';
    elsif code = 'SLR' then
      cls := 'SLR'; role := 'guard_luggage'; service := true;
    elsif code ~ '^A[0-9]+$' then
      cls := '2A'; role := 'passenger_reserved'; cap := 52; reserved := true; bookable := true; service := false; numbered_assign := true;
    elsif code ~ '^B[0-9]+$' then
      cls := '3A'; role := 'passenger_reserved'; cap := 72; reserved := true; bookable := true; service := false; numbered_assign := true;
    elsif code ~ '^S[0-9]+$' then
      cls := 'SL'; role := 'passenger_reserved'; cap := 80; reserved := true; bookable := true; service := false; numbered_assign := true;
    elsif code = 'GS' then
      gs_idx := gs_idx + 1;
      coach_code := 'GS' || gs_idx::text;
      cls := 'GEN'; role := 'general_unreserved'; cap := 100; bookable := true; service := false; numbered_assign := false;
    elsif code = 'PC' then
      cls := 'PC'; service := true;
    elsif code = 'EOG' then
      cls := 'EOG'; service := true;
    end if;

    if code in ('EOG', 'LOCO') then
      coach_code := code || '@P' || i::text;
    end if;

    insert into public.master_rake_coaches (
      rake_id, position_number, coach_code, coach_class, coach_role,
      nominal_capacity, passenger_bookable, reserved_inventory, numbered_assignment,
      service_coach, verification_status, notes
    ) values (
      p_rake_id, i, coach_code,
      cls, role, cap, bookable, reserved, numbered_assign, service,
      'verified', 'Composition from IndiaRailInfo alternate rake listing'
    );
  end loop;
end;
$$;

do $$
declare
  tid uuid;
  rid uuid;
  rake2 text[] := array['LOCO','EOG','B1','B2','B3','B4','A1','A2','B5','B6','PC','S1','S2','S3','S4','S5','S6','S7','GS','GS','GS','GS','EOG'];
  rake3 text[] := array['LOCO','EOG','GS','GS','B6','B5','B4','B3','B2','A1','A2','B1','PC','S7','S6','S5','S4','S3','S2','S1','GS','GS','EOG'];
begin
  select id into tid from public.master_trains where train_no = '20824';
  if tid is null then
    raise exception 'Train 20824 master row missing';
  end if;

  insert into public.master_train_rakes (train_id, rake_code, description, is_active, source_url, verification_status, notes)
  values (
    tid,
    'RAKE-1',
    'Primary LHB formation (SLR … B1 A2 A1 B2-7 PC S1-6 GS×4 EOG) per IndiaRailInfo / Trainman',
    true,
    'https://indiarailinfo.com/train/-train-ajmer-puri-sf-express-20824/22149/280/217',
    'verified',
    'Berths generated for all reserved coaches (1088 nominal).'
  )
  on conflict (train_id, rake_code) do update set
    description = excluded.description,
    is_active = excluded.is_active,
    source_url = excluded.source_url,
    verification_status = excluded.verification_status,
    notes = excluded.notes,
    updated_at = now()
  returning id into rid;

  if rid is null then
    select id into rid from public.master_train_rakes where train_id = tid and rake_code = 'RAKE-1';
  end if;
  perform public.seed_20824_rake_coaches(rid, true);

  insert into public.master_train_rakes (train_id, rake_code, description, is_active, verification_status, notes)
  values (tid, 'RAKE-2', 'Alternate formation with S7 (IndiaRailInfo)', false, 'verified', 'Coach skeleton only — includes extra S7 vs RAKE-1')
  on conflict (train_id, rake_code) do update set updated_at = now()
  returning id into rid;
  if rid is null then
    select id into rid from public.master_train_rakes where train_id = tid and rake_code = 'RAKE-2';
  end if;
  perform public.seed_20824_rake_skeleton(rid, rake2);

  insert into public.master_train_rakes (train_id, rake_code, description, is_active, verification_status, notes)
  values (tid, 'RAKE-3', 'Reversed AC/block order (IndiaRailInfo)', false, 'verified', 'Coach skeleton only')
  on conflict (train_id, rake_code) do update set updated_at = now()
  returning id into rid;
  if rid is null then
    select id into rid from public.master_train_rakes where train_id = tid and rake_code = 'RAKE-3';
  end if;
  perform public.seed_20824_rake_skeleton(rid, rake3);
end;
$$;

commit;

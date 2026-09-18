-- Full route seed for Train 20824 (source: supabase/data/train_20824_route_stops.json)

begin;

create or replace function public.seed_train_20824_route()
returns void
language plpgsql
as $$
declare
  tid uuid;
  rid uuid;
  r record;
begin
  select id into tid from public.master_trains where train_no = '20824';
  if tid is null then
    raise exception 'Train 20824 not found';
  end if;

  insert into public.master_train_routes (
    train_id, route_code, description, is_active, source_url, source_checked_at, verification_status, notes
  ) values (
    tid,
    'ROUTE-V1',
    'Scheduled route per etrain.info',
    true,
    'https://etrain.info/train/Aii-Puri-Exp-20824/schedule',
    current_date,
    'verified',
    '44 stop records. Railway halt counts often exclude origin (43) or cite intermediate halts only.'
  )
  on conflict (train_id, route_code) do update set
    description = excluded.description,
    is_active = excluded.is_active,
    source_url = excluded.source_url,
    source_checked_at = excluded.source_checked_at,
    verification_status = excluded.verification_status,
    notes = excluded.notes,
    updated_at = now()
  returning id into rid;

  if rid is null then
    select id into rid from public.master_train_routes where train_id = tid and route_code = 'ROUTE-V1';
  end if;

  delete from public.master_train_stops where train_id = tid;

  for r in
    select * from (values
(1, 'AII', 'Ajmer Junction', null, '19:20'::time, 1, 1, null, 0, true, false),
      (2, 'BER', 'Beawar', '19:56'::time, '19:58'::time, 1, 1, 2, 53, false, false),
      (3, 'MJ', 'Marwar Junction', '21:10'::time, '21:15'::time, 1, 1, 5, 140, false, false),
      (4, 'RANI', 'Rani', '21:48'::time, '21:50'::time, 1, 1, 2, 192, false, false),
      (5, 'FA', 'Falna', '22:04'::time, '22:06'::time, 1, 1, 2, 207, false, false),
      (6, 'PDWA', 'Pindwara', '22:42'::time, '22:44'::time, 1, 1, 2, 262, false, false),
      (7, 'ABR', 'Abu Road', '23:20'::time, '23:30'::time, 1, 1, 10, 306, false, false),
      (8, 'PNU', 'Palanpur Junction', '00:25'::time, '00:27'::time, 2, 2, 2, 358, false, false),
      (9, 'UJA', 'Unjha', '01:02'::time, '01:04'::time, 2, 2, 2, 403, false, false),
      (10, 'MSH', 'Mahesana Junction', '01:24'::time, '01:26'::time, 2, 2, 2, 423, false, false),
      (11, 'SBIB', 'Sabarmati BG', '02:24'::time, '02:26'::time, 2, 2, 2, 486, false, false),
      (12, 'ADI', 'Ahmedabad Junction', '03:05'::time, '03:15'::time, 2, 2, 10, 492, false, false),
      (13, 'BRC', 'Vadodara Junction', '05:10'::time, '05:15'::time, 2, 2, 5, 592, false, false),
      (14, 'ST', 'Surat', '07:10'::time, '07:15'::time, 2, 2, 5, 721, false, false),
      (15, 'NDB', 'Nandurbar', '10:10'::time, '10:15'::time, 2, 2, 5, 881, false, false),
      (16, 'DDE', 'Dondaicha', '11:03'::time, '11:05'::time, 2, 2, 2, 916, false, false),
      (17, 'AN', 'Amalner', '11:58'::time, '12:00'::time, 2, 2, 2, 976, false, false),
      (18, 'JL', 'Jalgaon Junction', '13:22'::time, '13:25'::time, 2, 2, 3, 1032, false, false),
      (19, 'BSL', 'Bhusaval Junction', '13:50'::time, '13:55'::time, 2, 2, 5, 1056, false, false),
      (20, 'MKU', 'Malkapur', '14:40'::time, '14:42'::time, 2, 2, 2, 1106, false, false),
      (21, 'NN', 'Nandura', '15:04'::time, '15:05'::time, 2, 2, 1, 1134, false, false),
      (22, 'SEG', 'Shegaon', '15:29'::time, '15:30'::time, 2, 2, 1, 1159, false, false),
      (23, 'AK', 'Akola Junction', '16:00'::time, '16:05'::time, 2, 2, 5, 1196, false, false),
      (24, 'BD', 'Badnera Junction', '17:22'::time, '17:25'::time, 2, 2, 3, 1275, false, false),
      (25, 'WR', 'Wardha Junction', '18:32'::time, '18:35'::time, 2, 2, 3, 1370, false, false),
      (26, 'NGP', 'Nagpur Junction', '20:05'::time, '20:10'::time, 2, 2, 5, 1449, false, false),
      (27, 'G', 'Gondia Junction', '21:48'::time, '21:50'::time, 2, 2, 2, 1579, false, false),
      (28, 'DURG', 'Durg', '00:05'::time, '00:10'::time, 3, 3, 5, 1714, false, false),
      (29, 'R', 'Raipur Junction', '00:55'::time, '01:05'::time, 3, 3, 10, 1751, false, false),
      (30, 'MSMD', 'Mahasamund', '01:58'::time, '02:00'::time, 3, 3, 2, 1804, false, false),
      (31, 'KRAR', 'Khariar Road', '02:38'::time, '02:40'::time, 3, 3, 2, 1856, false, false),
      (32, 'KBJ', 'Kantabanji', '03:45'::time, '03:50'::time, 3, 3, 5, 1920, false, false),
      (33, 'TIG', 'Titlagarh', '04:25'::time, '04:45'::time, 3, 3, 20, 1953, false, false),
      (34, 'BLGR', 'Balangir', '05:37'::time, '05:42'::time, 3, 3, 5, 2017, false, false),
      (35, 'BRGA', 'Bargarh Road', '06:38'::time, '06:40'::time, 3, 3, 2, 2093, false, false),
      (36, 'SBP', 'Sambalpur', '07:30'::time, '07:40'::time, 3, 3, 10, 2135, false, false),
      (37, 'RAIR', 'Rairakhol', '08:42'::time, '08:44'::time, 3, 3, 2, 2206, false, false),
      (38, 'ANGL', 'Angul', '10:25'::time, '10:27'::time, 3, 3, 2, 2291, false, false),
      (39, 'DNKL', 'Dhenkanal', '11:25'::time, '11:27'::time, 3, 3, 2, 2352, false, false),
      (40, 'NQR', 'Naraj Marthapur', '12:08'::time, '12:10'::time, 3, 3, 2, 2389, false, false),
      (41, 'MCS', 'Mancheswar', '12:26'::time, '12:28'::time, 3, 3, 2, 2407, false, false),
      (42, 'BBS', 'Bhubaneswar', '12:35'::time, '12:40'::time, 3, 3, 5, 2414, false, false),
      (43, 'KUR', 'Khurda Road Junction', '13:00'::time, '13:05'::time, 3, 3, 5, 2433, false, false),
      (44, 'PURI', 'Puri', '14:40'::time, null, 3, 3, null, 2476, false, true)
    ) as t(stop_seq, station_code, station_name, arrive_time, depart_time, arrive_day, depart_day, halt_minutes, distance_km, is_origin, is_destination)
  loop
    insert into public.master_stations (code, name)
    values (r.station_code, r.station_name)
    on conflict (code) do update set name = excluded.name, updated_at = now();

    insert into public.master_train_stops (
      train_id, route_id, stop_seq, station_code,
      arrive_time, depart_time,
      arrive_day_number, depart_day_number, day_offset,
      halt_minutes, distance_km,
      is_origin, is_destination, commercial_halt,
      halt_minutes_derived
    ) values (
      tid, rid, r.stop_seq, r.station_code,
      r.arrive_time, r.depart_time,
      case when r.is_origin then null else r.arrive_day end,
      case when r.is_destination then null else r.depart_day end,
      coalesce(r.depart_day, r.arrive_day, 1) - 1,
      r.halt_minutes,
      r.distance_km,
      r.is_origin, r.is_destination, true,
      r.halt_minutes is not null
    );
  end loop;

  perform public.fn_validate_train_route(rid);

  update public.master_trains set
    distance_km = 2476,
    origin_departure_time = '19:20'::time,
    destination_arrival_time = '14:40'::time,
    arrival_day_offset = 2,
    scheduled_halts = 43,
    source_checked_at = current_date,
    notes = trim(both from coalesce(notes, '') || ' ROUTE-V1: etrain schedule. AII dep was 19:10 in earlier seed — updated to 19:20. Distance 2476 at PURI (etrain); IndiaRailInfo PDF cites 2478 km.'),
    updated_at = now()
  where train_no = '20824';

  update public.master_train_rakes set
    formation_direction = case rake_code
      when 'RAKE-1' then 'loco_toward_puri'
      when 'RAKE-2' then 'loco_toward_puri'
      when 'RAKE-3' then 'loco_toward_aii'
      else formation_direction
    end,
    orientation_note = case rake_code
      when 'RAKE-1' then 'SLR at loco end (AII→PURI) per etrain/Trainman'
      when 'RAKE-2' then 'EOG near loco end — alternate IRI formation with S7'
      when 'RAKE-3' then 'Reversed block order — alternate IRI formation with S7'
      else orientation_note
    end,
    updated_at = now()
  where train_id = tid;
end;
$$;

select public.seed_train_20824_route();

commit;

-- Validation for Train 20824 master data (run after 19–22 migrations)
-- Expect failures as raised exceptions when counts diverge.

do $$
declare
  tid uuid;
  rid uuid;
  route_id uuid;
  stop_count int;
  n_trains int;
  sl_coaches int;
  sl_berths bigint;
  a3_coaches int;
  a3_berths bigint;
  a2_coaches int;
  a2_berths bigint;
  reserved_total bigint;
  dup_pos int;
  dup_code int;
  dup_berth int;
  bad_berth int;
  svc_bookable int;
begin
  select count(*) into n_trains from public.master_trains where train_no = '20824';
  if n_trains <> 1 then
    raise exception 'Expected exactly 1 master_trains row for 20824, got %', n_trains;
  end if;

  select mt.id, r.id into tid, rid
  from public.master_trains mt
  join public.master_train_rakes r on r.train_id = mt.id and r.rake_code = 'RAKE-1'
  where mt.train_no = '20824';

  if rid is null then
    raise exception 'RAKE-1 missing for train 20824';
  end if;

  select count(*) into sl_coaches
  from public.master_rake_coaches c
  where c.rake_id = rid and c.coach_class = 'SL' and c.reserved_inventory;

  select count(*) into sl_berths
  from public.master_coach_berths b
  join public.master_rake_coaches c on c.id = b.rake_coach_id
  where c.rake_id = rid and c.coach_class = 'SL';

  select count(*) into a3_coaches
  from public.master_rake_coaches c where c.rake_id = rid and c.coach_class = '3A';

  select count(*) into a3_berths
  from public.master_coach_berths b
  join public.master_rake_coaches c on c.id = b.rake_coach_id
  where c.rake_id = rid and c.coach_class = '3A';

  select count(*) into a2_coaches
  from public.master_rake_coaches c where c.rake_id = rid and c.coach_class = '2A';

  select count(*) into a2_berths
  from public.master_coach_berths b
  join public.master_rake_coaches c on c.id = b.rake_coach_id
  where c.rake_id = rid and c.coach_class = '2A';

  select count(*) into reserved_total
  from public.master_coach_berths b
  join public.master_rake_coaches c on c.id = b.rake_coach_id
  where c.rake_id = rid and c.reserved_inventory;

  if sl_coaches <> 6 then raise exception 'SL coaches expected 6, got %', sl_coaches; end if;
  if sl_berths <> 480 then raise exception 'SL berths expected 480, got %', sl_berths; end if;
  if a3_coaches <> 7 then raise exception '3A coaches expected 7, got %', a3_coaches; end if;
  if a3_berths <> 504 then raise exception '3A berths expected 504, got %', a3_berths; end if;
  if a2_coaches <> 2 then raise exception '2A coaches expected 2, got %', a2_coaches; end if;
  if a2_berths <> 104 then raise exception '2A berths expected 104, got %', a2_berths; end if;
  if reserved_total <> 1088 then raise exception 'Reserved berths expected 1088, got %', reserved_total; end if;

  select count(*) into dup_pos from (
    select position_number from public.master_rake_coaches where rake_id = rid
    group by position_number having count(*) > 1
  ) x;
  if dup_pos > 0 then raise exception 'Duplicate position_number in RAKE-1'; end if;

  select count(*) into dup_code from (
    select coach_code from public.master_rake_coaches where rake_id = rid
    group by coach_code having count(*) > 1
  ) x;
  if dup_code > 0 then raise exception 'Duplicate coach_code in RAKE-1'; end if;

  select count(*) into dup_berth from (
    select rake_coach_id, berth_number from public.master_coach_berths b
    join public.master_rake_coaches c on c.id = b.rake_coach_id
    where c.rake_id = rid
    group by rake_coach_id, berth_number having count(*) > 1
  ) x;
  if dup_berth > 0 then raise exception 'Duplicate berth numbers within coach'; end if;

  select count(*) into bad_berth from public.master_coach_berths b
  join public.master_rake_coaches c on c.id = b.rake_coach_id
  where c.rake_id = rid
    and (
      b.berth_number <= 0
      or (c.coach_class = 'SL' and b.berth_number > 80)
      or (c.coach_class = '3A' and b.berth_number > 72)
      or (c.coach_class = '2A' and b.berth_number > 52)
    );
  if bad_berth > 0 then raise exception 'Berth number out of range for class'; end if;

  select count(*) into svc_bookable from public.master_rake_coaches
  where rake_id = rid and service_coach and passenger_bookable;
  if svc_bookable > 0 then raise exception 'Service coaches marked passenger_bookable'; end if;

  raise notice 'Train 20824 RAKE-1 validation OK: SL=% berths=%, 3A=%/%, 2A=%/%, reserved=%',
    sl_coaches, sl_berths, a3_coaches, a3_berths, a2_coaches, a2_berths, reserved_total;

  select tr.id into route_id
  from public.master_train_routes tr
  join public.master_trains t on t.id = tr.train_id
  where t.train_no = '20824' and tr.route_code = 'ROUTE-V1';

  if route_id is null then
    raise exception 'ROUTE-V1 missing for train 20824';
  end if;

  perform public.fn_validate_train_route(route_id);

  select count(*) into stop_count from public.master_train_stops mts where mts.route_id = route_id;
  if stop_count <> 44 then
    raise exception 'Expected 44 route stops, got %', stop_count;
  end if;

  raise notice 'Train 20824 route validation OK: % stops', stop_count;
end;
$$;

-- Human-readable summaries (run if block above succeeds)
select * from public.train_rake_capacity_summary where train_no = '20824';
select * from public.train_master_summary where train_no = '20824';
select train_no, route_code, count(*) as stops
from public.train_route_details
where train_no = '20824'
group by train_no, route_code;

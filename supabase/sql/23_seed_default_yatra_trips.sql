-- Default yatra trip instances: 20824 outbound 2026-12-07, return 2026-12-13 (idempotent)

create unique index if not exists idx_yatra_trips_train_leg_unique
  on public.yatra_trips (train_no, journey_date, trip_kind)
  where mode = 'train'::travel_mode and trip_kind in ('outbound'::trip_kind, 'return'::trip_kind);

create or replace function public.seed_default_yatra_trips_20824()
returns table(leg trip_kind, trip_id uuid, created boolean)
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
  jd date;
  tk trip_kind;
  legs constant trip_kind[] := array['outbound'::trip_kind, 'return'::trip_kind];
  dates constant date[] := array['2026-12-07'::date, '2026-12-13'::date];
  i int;
begin
  select id, train_no, train_name, source_station_code, destination_station_code
  into mt_id, mt_train_no, mt_train_name, mt_src, mt_dst
  from public.master_trains
  where train_no = '20824';

  if not found then
    raise exception 'Train 20824 not in master_trains — run 20_seed_train_20824.sql first';
  end if;

  select depart_time, day_offset into fs_depart_time, fs_day_offset
  from public.master_train_stops
  where train_id = mt_id
  order by stop_seq asc
  limit 1;

  select arrive_time, day_offset into ls_arrive_time, ls_day_offset
  from public.master_train_stops
  where train_id = mt_id
  order by stop_seq desc
  limit 1;

  for i in 1..array_length(legs, 1) loop
    tk := legs[i];
    jd := dates[i];

    select t.id into new_id
    from public.yatra_trips t
    where t.mode = 'train'
      and t.train_no = mt_train_no
      and t.journey_date = jd
      and t.trip_kind = tk
    limit 1;

    if new_id is not null then
      leg := tk;
      trip_id := new_id;
      created := false;
      return next;
      continue;
    end if;

    depart_ts := null;
    arrive_ts := null;
    if fs_depart_time is not null then
      depart_ts := (jd + coalesce(fs_day_offset, 0) + fs_depart_time)::timestamptz;
    end if;
    if ls_arrive_time is not null then
      arrive_ts := (jd + coalesce(ls_day_offset, 0) + ls_arrive_time)::timestamptz;
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
      tk,
      case
        when tk = 'return'::trip_kind then
          format('%s %s — Return (%s → %s)', mt_train_no, mt_train_name, mt_dst, mt_src)
        else
          format('%s %s', mt_train_no, mt_train_name)
      end,
      jd,
      depart_ts,
      arrive_ts,
      mt_id,
      mt_train_no,
      mt_train_name,
      case when tk = 'return'::trip_kind then mt_dst else mt_src end,
      case when tk = 'return'::trip_kind then mt_src else mt_dst end
    )
    returning id into new_id;

    leg := tk;
    trip_id := new_id;
    created := true;
    return next;
  end loop;
end;
$$;

select leg, trip_id, created from public.seed_default_yatra_trips_20824();

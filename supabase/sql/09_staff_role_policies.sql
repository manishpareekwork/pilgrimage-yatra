
commit;


-- =====================================================================
-- Migration: supabase/migrations/20260108_staff_role_policies.sql
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- Role helpers (JWT app_metadata + profiles fallback)
-- ---------------------------------------------------------------------
create or replace function public.fn_has_role(p_roles text[])
returns boolean
language sql
stable
as $$
  select
    coalesce((auth.jwt() ->> 'role') = any(p_roles), false)
    or coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = any(p_roles), false)
    or coalesce((auth.jwt() -> 'user_metadata' ->> 'role') = any(p_roles), false)
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role::text = any(p_roles)
    );
$$;

create or replace function public.fn_is_staff()
returns boolean
language sql
stable
as $$
  select public.fn_has_role(array['reviewer','admin']);
$$;

-- ---------------------------------------------------------------------
-- Update role-gated functions
-- ---------------------------------------------------------------------
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

  if public.fn_is_staff() and is_ready then
    new.status := 'approved';
  else
    new.status := 'submitted'::reg_status;
  end if;
  return new;
end$$;

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
  if not public.fn_is_staff() then
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
  if not public.fn_is_staff() then
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

create or replace function public.fn_id_card_data(p_registration_ids uuid[] default null)
returns table(
  registration_id uuid,
  name_hi text,
  father_name_hi text,
  phone text,
  emergency_contact_phone text,
  photo_url text,
  accompanying_name text,
  accompanying_phone text,
  accompanying_resident_of text,
  trip_id uuid,
  train_no text,
  flight_no text,
  coach_no text,
  seat_no text,
  berth_no text,
  hotel_name text,
  room_no text
)
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  if not public.fn_is_staff() then
    raise exception 'Not authorized';
  end if;

  return query
  select
    r.id,
    r.name_hi,
    r.father_name_hi,
    r.phone,
    r.emergency_contact_phone,
    r.photo_url,
    r.accompanying_name,
    r.accompanying_phone,
    r.accompanying_resident_of,
    travel.trip_id,
    travel.train_no,
    travel.flight_no,
    travel.coach_no,
    travel.seat_no,
    travel.berth_no,
    hotel.hotel_name,
    hotel.room_no
  from public.yatra_registrations r
  left join lateral (
    select
      t.id as trip_id,
      t.train_no,
      t.flight_no,
      m.coach_no,
      m.seat_no,
      m.berth_no
    from public.yatra_co_travel_group_members m
    join public.yatra_co_travel_groups g on g.id = m.group_id
    join public.yatra_trips t on t.id = g.trip_id
    where m.registration_id = r.id
    order by t.journey_date desc nulls last, t.depart_at desc nulls last, g.created_at desc
    limit 1
  ) travel on true
  left join lateral (
    select
      h.name as hotel_name,
      hr.room_no
    from public.yatra_room_stays rs
    join public.yatra_hotel_rooms hr on hr.id = rs.room_id
    join public.yatra_hotels h on h.id = hr.hotel_id
    where rs.registration_id = r.id
    order by rs.stay_from desc nulls last, rs.created_at desc
    limit 1
  ) hotel on true
  where p_registration_ids is null or r.id = any(p_registration_ids);
end$$;

-- ---------------------------------------------------------------------
-- Update staff/volunteer policies to use role helper
-- ---------------------------------------------------------------------
drop policy if exists "volunteer read created" on public.yatra_registrations;
create policy "volunteer read created" on public.yatra_registrations
for select using (
  public.fn_has_role(array['volunteer','reviewer','admin'])
  and auth.uid() = created_by
);

drop policy if exists "volunteer write created" on public.yatra_registrations;
create policy "volunteer write created" on public.yatra_registrations
for insert with check (
  public.fn_has_role(array['volunteer','reviewer','admin'])
  and auth.uid() = created_by
);

drop policy if exists "volunteer update created" on public.yatra_registrations;
create policy "volunteer update created" on public.yatra_registrations
for update using (
  public.fn_has_role(array['volunteer','reviewer','admin'])
  and auth.uid() = created_by
);

drop policy if exists "reviewers read all" on public.yatra_registrations;
create policy "reviewers read all" on public.yatra_registrations
for select using (public.fn_is_staff());

drop policy if exists "reviewers update all" on public.yatra_registrations;
create policy "reviewers update all" on public.yatra_registrations
for update using (public.fn_is_staff());

drop policy if exists "reviews read if owner or staff" on public.yatra_reviews;
create policy "reviews read if owner or staff" on public.yatra_reviews
for select using (
  public.fn_is_staff()
  or exists (
    select 1 from public.yatra_registrations r
    where r.id = yatra_reviews.registration_id and r.owner = auth.uid()
  )
);

drop policy if exists "reviews write staff" on public.yatra_reviews;
create policy "reviews write staff" on public.yatra_reviews
for insert with check (public.fn_is_staff());

drop policy if exists "staff manage categories" on public.yatra_categories;
create policy "staff manage categories" on public.yatra_categories
for all using (public.fn_is_staff())
with check (public.fn_is_staff());

drop policy if exists "staff manage trips" on public.yatra_trips;
create policy "staff manage trips" on public.yatra_trips
for all using (public.fn_is_staff())
with check (public.fn_is_staff());

drop policy if exists "staff manage travel groups" on public.yatra_co_travel_groups;
create policy "staff manage travel groups" on public.yatra_co_travel_groups
for all using (public.fn_is_staff())
with check (public.fn_is_staff());

drop policy if exists "staff manage travel group members" on public.yatra_co_travel_group_members;
create policy "staff manage travel group members" on public.yatra_co_travel_group_members
for all using (public.fn_is_staff())
with check (public.fn_is_staff());

drop policy if exists "staff manage train coaches" on public.yatra_train_coaches;
create policy "staff manage train coaches" on public.yatra_train_coaches
for all using (public.fn_is_staff())
with check (public.fn_is_staff());

drop policy if exists "staff manage hotels" on public.yatra_hotels;
create policy "staff manage hotels" on public.yatra_hotels
for all using (public.fn_is_staff())
with check (public.fn_is_staff());

drop policy if exists "staff manage hotel rooms" on public.yatra_hotel_rooms;
create policy "staff manage hotel rooms" on public.yatra_hotel_rooms
for all using (public.fn_is_staff())
with check (public.fn_is_staff());

drop policy if exists "staff manage room stays" on public.yatra_room_stays;
create policy "staff manage room stays" on public.yatra_room_stays
for all using (public.fn_is_staff())
with check (public.fn_is_staff());

drop policy if exists "staff manage room incharges" on public.yatra_room_incharges;
create policy "staff manage room incharges" on public.yatra_room_incharges
for all using (public.fn_is_staff())
with check (public.fn_is_staff());

drop policy if exists "staff manage hotel incharges" on public.yatra_hotel_incharges;
create policy "staff manage hotel incharges" on public.yatra_hotel_incharges
for all using (public.fn_is_staff())
with check (public.fn_is_staff());

drop policy if exists "staff manage booking tasks" on public.yatra_booking_tasks;
create policy "staff manage booking tasks" on public.yatra_booking_tasks
for all using (public.fn_is_staff())
with check (public.fn_is_staff());

drop policy if exists "staff manage volunteer roles" on public.volunteer_roles;
create policy "staff manage volunteer roles" on public.volunteer_roles
for all using (public.fn_is_staff())
with check (public.fn_is_staff());

drop policy if exists "staff manage volunteer role members" on public.volunteer_role_members;
create policy "staff manage volunteer role members" on public.volunteer_role_members
for all using (public.fn_is_staff())
with check (public.fn_is_staff());

drop policy if exists "staff manage master stations" on public.master_stations;
create policy "staff manage master stations" on public.master_stations
for all using (public.fn_is_staff())
with check (public.fn_is_staff());

drop policy if exists "staff manage master trains" on public.master_trains;
create policy "staff manage master trains" on public.master_trains
for all using (public.fn_is_staff())
with check (public.fn_is_staff());

drop policy if exists "staff manage master train stops" on public.master_train_stops;
create policy "staff manage master train stops" on public.master_train_stops
for all using (public.fn_is_staff())
with check (public.fn_is_staff());

drop policy if exists "staff read forms" on storage.objects;
create policy "staff read forms" on storage.objects
for select using (

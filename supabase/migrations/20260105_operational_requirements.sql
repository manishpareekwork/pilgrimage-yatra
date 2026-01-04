begin;

-- ---------------------------------------------------------------------
-- Enums for booking and ticketing
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'booking_status') then
    create type booking_status as enum ('planned', 'booked', 'partially_booked', 'cancelled');
  end if;

  if not exists (select 1 from pg_type where typname = 'booking_channel') then
    create type booking_channel as enum ('irctc', 'agent', 'committee', 'other');
  end if;

  if not exists (select 1 from pg_type where typname = 'payment_status') then
    create type payment_status as enum ('pending', 'paid', 'partial', 'refunded');
  end if;

  if not exists (select 1 from pg_type where typname = 'booking_task_status') then
    create type booking_task_status as enum ('open', 'in_progress', 'done');
  end if;

  if not exists (select 1 from pg_type where typname = 'booking_task_type') then
    create type booking_task_type as enum ('train', 'air', 'hotel');
  end if;

  if not exists (select 1 from pg_type where typname = 'berth_type') then
    create type berth_type as enum ('LB', 'MB', 'UB', 'SL', 'SU', 'WS', 'AS');
  end if;

  if not exists (select 1 from pg_type where typname = 'ticket_status') then
    create type ticket_status as enum ('CNF', 'RAC', 'WL', 'CAN');
  end if;

  if not exists (select 1 from pg_type where typname = 'meal_pref') then
    create type meal_pref as enum ('veg', 'nonveg', 'jain', 'none');
  end if;

  if not exists (select 1 from pg_type where typname = 'passenger_gender') then
    create type passenger_gender as enum ('male', 'female', 'other', 'unspecified');
  end if;
end$$;

-- ---------------------------------------------------------------------
-- Category groups
-- ---------------------------------------------------------------------
create table if not exists public.yatra_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  whatsapp_group_ref text,
  created_at timestamptz not null default now()
);

insert into public.yatra_categories (name, whatsapp_group_ref)
values
  ('Family', null),
  ('Relative', null),
  ('Morning Tea club', null),
  ('Katha', null),
  ('SFS-1', null),
  ('SFS-2', null)
on conflict (name) do nothing;

alter table public.yatra_registrations
  add column if not exists category_id uuid references public.yatra_categories(id),
  add column if not exists health_none boolean default false,
  add column if not exists accompanying_name text,
  add column if not exists accompanying_guardian_name text,
  add column if not exists accompanying_resident_of text,
  add column if not exists accompanying_phone text;

update public.yatra_registrations
set health_none = true
where health_none is distinct from true
  and coalesce(health_heart, false) = false
  and coalesce(health_bp, false) = false
  and coalesce(health_diabetes, false) = false
  and coalesce(health_asthma, false) = false
  and (health_other is null or btrim(health_other) = '');

update public.yatra_registrations
set train_class = null
where travel_mode = 'air' and train_class is not null;

alter table public.yatra_registrations
  drop constraint if exists yatra_registrations_air_train_class_check,
  add constraint yatra_registrations_air_train_class_check
    check (travel_mode is distinct from 'air'::travel_mode or train_class is null);

alter table public.yatra_registrations
  drop constraint if exists yatra_registrations_health_choice_check,
  add constraint yatra_registrations_health_choice_check
    check (
      coalesce(health_none, false)
      or coalesce(health_heart, false)
      or coalesce(health_bp, false)
      or coalesce(health_diabetes, false)
      or coalesce(health_asthma, false)
      or (health_other is not null and btrim(health_other) <> '')
    );

alter table public.yatra_registrations
  drop constraint if exists yatra_registrations_required_for_review_check,
  add constraint yatra_registrations_required_for_review_check
    check (
      status not in ('needs_review', 'approved')
      or (
        coalesce(btrim(name_hi), '') <> ''
        and coalesce(btrim(father_name_hi), '') <> ''
        and coalesce(btrim(address_hi), '') <> ''
        and coalesce(btrim(aadhaar_no), '') <> ''
        and coalesce(btrim(phone), '') <> ''
        and coalesce(btrim(whatsapp), '') <> ''
        and dob is not null
        and age_years is not null
        and travel_mode is not null
        and reservation_by is not null
        and photo_url is not null and btrim(photo_url) <> ''
        and coalesce(btrim(accompanying_name), '') <> ''
        and coalesce(btrim(accompanying_guardian_name), '') <> ''
        and coalesce(btrim(accompanying_resident_of), '') <> ''
        and coalesce(btrim(accompanying_phone), '') <> ''
        and (
          travel_mode <> 'train'::travel_mode
          or coalesce(btrim(train_class), '') <> ''
        )
        and (
          coalesce(health_none, false)
          or coalesce(health_heart, false)
          or coalesce(health_bp, false)
          or coalesce(health_diabetes, false)
          or coalesce(health_asthma, false)
          or (health_other is not null and btrim(health_other) <> '')
        )
      )
    );

create index if not exists idx_yatra_registrations_category_id on public.yatra_registrations(category_id);

-- ---------------------------------------------------------------------
-- Trips and co-travel groups
-- ---------------------------------------------------------------------
create table if not exists public.yatra_trips (
  id uuid primary key default gen_random_uuid(),
  mode travel_mode not null,
  trip_name text not null,
  journey_date date not null,
  depart_at timestamptz,
  arrive_at timestamptz,
  train_no text,
  train_name text,
  from_station_code text,
  to_station_code text,
  from_station_name text,
  to_station_name text,
  default_class_code text,
  quota_code text,
  airline_code text,
  flight_no text,
  from_airport_code text,
  to_airport_code text,
  created_at timestamptz not null default now()
);

create index if not exists idx_yatra_trips_mode on public.yatra_trips(mode);
create index if not exists idx_yatra_trips_journey_date on public.yatra_trips(journey_date);
create index if not exists idx_yatra_trips_train_no on public.yatra_trips(train_no);
create index if not exists idx_yatra_trips_flight_no on public.yatra_trips(flight_no);

create table if not exists public.yatra_co_travel_groups (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.yatra_trips(id) on delete cascade,
  group_code text not null unique,
  pnr text,
  booking_status booking_status not null default 'planned',
  booking_channel booking_channel,
  booked_at timestamptz,
  booked_by_user_id uuid references auth.users(id),
  booked_by_registration_id uuid references public.yatra_registrations(id),
  total_fare_inr numeric,
  payment_status payment_status not null default 'pending',
  agent_ref text,
  class_code text,
  quota_code text,
  boarding_station_code text,
  reservation_upto_station_code text,
  group_size_target int not null default 6,
  incharge_registration_id uuid references public.yatra_registrations(id),
  created_at timestamptz not null default now(),
  constraint yatra_co_travel_groups_group_size_check check (group_size_target > 0),
  constraint yatra_co_travel_groups_booked_by_check check (
    booking_status not in ('booked', 'partially_booked')
    or (
      (booked_by_user_id is not null and booked_by_registration_id is null)
      or (booked_by_user_id is null and booked_by_registration_id is not null)
    )
  )
);

create index if not exists idx_yatra_co_travel_groups_trip_id on public.yatra_co_travel_groups(trip_id);
create index if not exists idx_yatra_co_travel_groups_pnr on public.yatra_co_travel_groups(pnr);

create table if not exists public.yatra_co_travel_group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.yatra_co_travel_groups(id) on delete cascade,
  registration_id uuid not null references public.yatra_registrations(id) on delete cascade,
  seat_no text,
  berth_no text,
  coach_no text,
  passenger_name_on_ticket text,
  passenger_age_on_ticket int,
  passenger_gender passenger_gender,
  berth_type berth_type,
  ticket_status ticket_status,
  wl_rac_no text,
  meal_pref meal_pref,
  senior_citizen boolean not null default false,
  ticket_number text,
  cabin_class text,
  baggage_allowance_kg numeric,
  ssr_notes text,
  created_at timestamptz not null default now(),
  constraint yatra_co_travel_group_members_unique unique (group_id, registration_id)
);

create index if not exists idx_yatra_co_travel_group_members_group_id on public.yatra_co_travel_group_members(group_id);
create index if not exists idx_yatra_co_travel_group_members_registration_id on public.yatra_co_travel_group_members(registration_id);
create index if not exists idx_yatra_co_travel_group_members_coach_no on public.yatra_co_travel_group_members(coach_no);

create table if not exists public.yatra_train_coaches (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.yatra_trips(id) on delete cascade,
  coach_no text not null,
  coach_incharge_registration_id uuid references public.yatra_registrations(id),
  created_at timestamptz not null default now(),
  constraint yatra_train_coaches_unique unique (trip_id, coach_no)
);

create index if not exists idx_yatra_train_coaches_incharge on public.yatra_train_coaches(coach_incharge_registration_id);

-- ---------------------------------------------------------------------
-- Hotels and stays
-- ---------------------------------------------------------------------
create table if not exists public.yatra_hotels (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('hotel', 'guest_house', 'dharamshala', 'other')),
  city text,
  address text,
  created_at timestamptz not null default now()
);

create table if not exists public.yatra_hotel_rooms (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.yatra_hotels(id) on delete cascade,
  room_no text not null,
  base_capacity int not null,
  extra_beds_max int not null default 0,
  created_at timestamptz not null default now(),
  constraint yatra_hotel_rooms_unique unique (hotel_id, room_no),
  constraint yatra_hotel_rooms_capacity_check check (base_capacity >= 0 and extra_beds_max >= 0)
);

create index if not exists idx_yatra_hotel_rooms_hotel_id on public.yatra_hotel_rooms(hotel_id);

create table if not exists public.yatra_room_stays (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.yatra_hotel_rooms(id) on delete cascade,
  registration_id uuid not null references public.yatra_registrations(id) on delete cascade,
  stay_from date,
  stay_to date,
  created_at timestamptz not null default now(),
  constraint yatra_room_stays_date_check check (stay_to is null or stay_from is null or stay_to >= stay_from)
);

create index if not exists idx_yatra_room_stays_room_id on public.yatra_room_stays(room_id);
create index if not exists idx_yatra_room_stays_registration_id on public.yatra_room_stays(registration_id);

create table if not exists public.yatra_room_incharges (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.yatra_hotel_rooms(id) on delete cascade,
  registration_id uuid not null references public.yatra_registrations(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint yatra_room_incharges_unique unique (room_id)
);

create table if not exists public.yatra_hotel_incharges (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.yatra_hotels(id) on delete cascade,
  registration_id uuid not null references public.yatra_registrations(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint yatra_hotel_incharges_unique unique (hotel_id)
);

-- ---------------------------------------------------------------------
-- Booking tasks
-- ---------------------------------------------------------------------
create table if not exists public.yatra_booking_tasks (
  id uuid primary key default gen_random_uuid(),
  task_type booking_task_type not null,
  trip_id uuid references public.yatra_trips(id) on delete set null,
  group_id uuid references public.yatra_co_travel_groups(id) on delete set null,
  hotel_id uuid references public.yatra_hotels(id) on delete set null,
  room_id uuid references public.yatra_hotel_rooms(id) on delete set null,
  booking_agent_user_id uuid references auth.users(id),
  booking_agent_registration_id uuid references public.yatra_registrations(id),
  notes text,
  status booking_task_status not null default 'open',
  created_at timestamptz not null default now(),
  constraint yatra_booking_tasks_agent_check check (
    (booking_agent_user_id is not null and booking_agent_registration_id is null)
    or (booking_agent_user_id is null and booking_agent_registration_id is not null)
  )
);

create index if not exists idx_yatra_booking_tasks_trip_id on public.yatra_booking_tasks(trip_id);
create index if not exists idx_yatra_booking_tasks_group_id on public.yatra_booking_tasks(group_id);
create index if not exists idx_yatra_booking_tasks_hotel_id on public.yatra_booking_tasks(hotel_id);
create index if not exists idx_yatra_booking_tasks_room_id on public.yatra_booking_tasks(room_id);

-- ---------------------------------------------------------------------
-- Volunteer roles
-- ---------------------------------------------------------------------
create table if not exists public.volunteer_roles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name_hi text,
  name_en text,
  created_at timestamptz not null default now()
);

create table if not exists public.volunteer_role_members (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references public.volunteer_roles(id) on delete cascade,
  registration_id uuid not null references public.yatra_registrations(id) on delete cascade,
  is_head boolean not null default false,
  created_at timestamptz not null default now(),
  constraint volunteer_role_members_unique unique (role_id, registration_id)
);

create unique index if not exists idx_volunteer_role_members_head
  on public.volunteer_role_members(role_id)
  where is_head = true;

insert into public.volunteer_roles (code, name_hi, name_en)
values
  ('yatra_contact', 'यात्री संपर्क', 'Yatra Contact'),
  ('accommodation_contact', 'आवास', 'Accommodation'),
  ('meals_contact', 'भोजन', 'Meals'),
  ('food_serving', 'पुरस्कारी', 'Food Serving'),
  ('prabhat_pheri', 'प्रभात फेरी', 'Prabhat Pheri'),
  ('housekeeping', 'हाउसकीपिंग', 'Housekeeping'),
  ('train_meals', 'ट्रेन भोजन', 'Train Meals'),
  ('medical_needs', 'चिकित्सा सहायता', 'Medical Needs'),
  ('enquiry_management', 'पूछताछ प्रबंधन', 'Enquiry Management')
on conflict (code) do nothing;

-- ---------------------------------------------------------------------
-- RLS policies for admin/reviewer only tables
-- ---------------------------------------------------------------------
alter table public.yatra_categories enable row level security;
alter table public.yatra_trips enable row level security;
alter table public.yatra_co_travel_groups enable row level security;
alter table public.yatra_co_travel_group_members enable row level security;
alter table public.yatra_train_coaches enable row level security;
alter table public.yatra_hotels enable row level security;
alter table public.yatra_hotel_rooms enable row level security;
alter table public.yatra_room_stays enable row level security;
alter table public.yatra_room_incharges enable row level security;
alter table public.yatra_hotel_incharges enable row level security;
alter table public.yatra_booking_tasks enable row level security;
alter table public.volunteer_roles enable row level security;
alter table public.volunteer_role_members enable row level security;

drop policy if exists "staff manage categories" on public.yatra_categories;
create policy "staff manage categories" on public.yatra_categories
for all using ((auth.jwt() ->> 'role') in ('reviewer', 'admin'))
with check ((auth.jwt() ->> 'role') in ('reviewer', 'admin'));

drop policy if exists "staff manage trips" on public.yatra_trips;
create policy "staff manage trips" on public.yatra_trips
for all using ((auth.jwt() ->> 'role') in ('reviewer', 'admin'))
with check ((auth.jwt() ->> 'role') in ('reviewer', 'admin'));

drop policy if exists "staff manage travel groups" on public.yatra_co_travel_groups;
create policy "staff manage travel groups" on public.yatra_co_travel_groups
for all using ((auth.jwt() ->> 'role') in ('reviewer', 'admin'))
with check ((auth.jwt() ->> 'role') in ('reviewer', 'admin'));

drop policy if exists "staff manage travel group members" on public.yatra_co_travel_group_members;
create policy "staff manage travel group members" on public.yatra_co_travel_group_members
for all using ((auth.jwt() ->> 'role') in ('reviewer', 'admin'))
with check ((auth.jwt() ->> 'role') in ('reviewer', 'admin'));

drop policy if exists "staff manage train coaches" on public.yatra_train_coaches;
create policy "staff manage train coaches" on public.yatra_train_coaches
for all using ((auth.jwt() ->> 'role') in ('reviewer', 'admin'))
with check ((auth.jwt() ->> 'role') in ('reviewer', 'admin'));

drop policy if exists "staff manage hotels" on public.yatra_hotels;
create policy "staff manage hotels" on public.yatra_hotels
for all using ((auth.jwt() ->> 'role') in ('reviewer', 'admin'))
with check ((auth.jwt() ->> 'role') in ('reviewer', 'admin'));

drop policy if exists "staff manage hotel rooms" on public.yatra_hotel_rooms;
create policy "staff manage hotel rooms" on public.yatra_hotel_rooms
for all using ((auth.jwt() ->> 'role') in ('reviewer', 'admin'))
with check ((auth.jwt() ->> 'role') in ('reviewer', 'admin'));

drop policy if exists "staff manage room stays" on public.yatra_room_stays;
create policy "staff manage room stays" on public.yatra_room_stays
for all using ((auth.jwt() ->> 'role') in ('reviewer', 'admin'))
with check ((auth.jwt() ->> 'role') in ('reviewer', 'admin'));

drop policy if exists "staff manage room incharges" on public.yatra_room_incharges;
create policy "staff manage room incharges" on public.yatra_room_incharges
for all using ((auth.jwt() ->> 'role') in ('reviewer', 'admin'))
with check ((auth.jwt() ->> 'role') in ('reviewer', 'admin'));

drop policy if exists "staff manage hotel incharges" on public.yatra_hotel_incharges;
create policy "staff manage hotel incharges" on public.yatra_hotel_incharges
for all using ((auth.jwt() ->> 'role') in ('reviewer', 'admin'))
with check ((auth.jwt() ->> 'role') in ('reviewer', 'admin'));

drop policy if exists "staff manage booking tasks" on public.yatra_booking_tasks;
create policy "staff manage booking tasks" on public.yatra_booking_tasks
for all using ((auth.jwt() ->> 'role') in ('reviewer', 'admin'))
with check ((auth.jwt() ->> 'role') in ('reviewer', 'admin'));

drop policy if exists "staff manage volunteer roles" on public.volunteer_roles;
create policy "staff manage volunteer roles" on public.volunteer_roles
for all using ((auth.jwt() ->> 'role') in ('reviewer', 'admin'))
with check ((auth.jwt() ->> 'role') in ('reviewer', 'admin'));

drop policy if exists "staff manage volunteer role members" on public.volunteer_role_members;
create policy "staff manage volunteer role members" on public.volunteer_role_members
for all using ((auth.jwt() ->> 'role') in ('reviewer', 'admin'))
with check ((auth.jwt() ->> 'role') in ('reviewer', 'admin'));

-- ---------------------------------------------------------------------
-- Helper functions / RPCs
-- ---------------------------------------------------------------------
create or replace function public.fn_generate_group_code(p_trip_id uuid)
returns text
language plpgsql
as $$
declare
  trip_rec record;
  seq_num int;
  prefix text;
  from_code text;
  to_code text;
begin
  select
    mode,
    journey_date,
    from_station_code,
    to_station_code,
    from_airport_code,
    to_airport_code
  into trip_rec
  from public.yatra_trips
  where id = p_trip_id;

  if trip_rec is null then
    raise exception 'Trip not found';
  end if;

  prefix := case when trip_rec.mode = 'air' then 'AIR' else 'TRN' end;
  from_code := upper(coalesce(
    case when trip_rec.mode = 'air' then trip_rec.from_airport_code else trip_rec.from_station_code end,
    'UNK'
  ));
  to_code := upper(coalesce(
    case when trip_rec.mode = 'air' then trip_rec.to_airport_code else trip_rec.to_station_code end,
    'UNK'
  ));

  select coalesce(max((regexp_match(group_code, '-(\\d{3})$'))[1]::int), 0) + 1
  into seq_num
  from public.yatra_co_travel_groups
  where trip_id = p_trip_id;

  return format('%s-%s-%s-%s-%s', prefix, trip_rec.journey_date::text, from_code, to_code, lpad(seq_num::text, 3, '0'));
end$$;

create or replace function public.fn_create_trip(
  p_mode travel_mode,
  p_trip_name text,
  p_journey_date date,
  p_depart_at timestamptz default null,
  p_arrive_at timestamptz default null,
  p_train_no text default null,
  p_train_name text default null,
  p_from_station_code text default null,
  p_to_station_code text default null,
  p_from_station_name text default null,
  p_to_station_name text default null,
  p_default_class_code text default null,
  p_quota_code text default null,
  p_airline_code text default null,
  p_flight_no text default null,
  p_from_airport_code text default null,
  p_to_airport_code text default null
) returns uuid
language plpgsql
as $$
declare new_id uuid;
begin
  insert into public.yatra_trips (
    mode, trip_name, journey_date, depart_at, arrive_at,
    train_no, train_name, from_station_code, to_station_code, from_station_name, to_station_name,
    default_class_code, quota_code,
    airline_code, flight_no, from_airport_code, to_airport_code
  ) values (
    p_mode, p_trip_name, p_journey_date, p_depart_at, p_arrive_at,
    p_train_no, p_train_name, p_from_station_code, p_to_station_code, p_from_station_name, p_to_station_name,
    p_default_class_code, p_quota_code,
    p_airline_code, p_flight_no, p_from_airport_code, p_to_airport_code
  )
  returning id into new_id;
  return new_id;
end$$;

create or replace function public.fn_create_co_travel_group(
  p_trip_id uuid,
  p_group_size_target int default null,
  p_incharge_registration_id uuid default null,
  p_pnr text default null,
  p_group_code text default null
) returns uuid
language plpgsql
as $$
declare new_id uuid;
declare resolved_code text;
declare mode_value travel_mode;
begin
  select mode into mode_value from public.yatra_trips where id = p_trip_id;
  if mode_value is null then
    raise exception 'Trip not found';
  end if;

  resolved_code := coalesce(p_group_code, public.fn_generate_group_code(p_trip_id));

  insert into public.yatra_co_travel_groups (
    trip_id, group_code, group_size_target, incharge_registration_id, pnr
  ) values (
    p_trip_id,
    resolved_code,
    coalesce(p_group_size_target, case when mode_value = 'train' then 6 else 6 end),
    p_incharge_registration_id,
    p_pnr
  )
  returning id into new_id;

  return new_id;
end$$;

create or replace function public.fn_update_co_travel_group(
  p_id uuid,
  p_patch jsonb
) returns void
language plpgsql
as $$
begin
  update public.yatra_co_travel_groups g
  set
    pnr = coalesce(p_patch->>'pnr', g.pnr),
    booking_status = coalesce((p_patch->>'booking_status')::booking_status, g.booking_status),
    booking_channel = coalesce((p_patch->>'booking_channel')::booking_channel, g.booking_channel),
    booked_at = coalesce((p_patch->>'booked_at')::timestamptz, g.booked_at),
    booked_by_user_id = coalesce((p_patch->>'booked_by_user_id')::uuid, g.booked_by_user_id),
    booked_by_registration_id = coalesce((p_patch->>'booked_by_registration_id')::uuid, g.booked_by_registration_id),
    total_fare_inr = coalesce((p_patch->>'total_fare_inr')::numeric, g.total_fare_inr),
    payment_status = coalesce((p_patch->>'payment_status')::payment_status, g.payment_status),
    agent_ref = coalesce(p_patch->>'agent_ref', g.agent_ref),
    class_code = coalesce(p_patch->>'class_code', g.class_code),
    quota_code = coalesce(p_patch->>'quota_code', g.quota_code),
    boarding_station_code = coalesce(p_patch->>'boarding_station_code', g.boarding_station_code),
    reservation_upto_station_code = coalesce(p_patch->>'reservation_upto_station_code', g.reservation_upto_station_code),
    group_size_target = coalesce((p_patch->>'group_size_target')::int, g.group_size_target),
    incharge_registration_id = coalesce((p_patch->>'incharge_registration_id')::uuid, g.incharge_registration_id)
  where g.id = p_id;
end$$;

create or replace function public.fn_upsert_co_travel_group_member(
  p_group_id uuid,
  p_registration_id uuid,
  p_patch jsonb
) returns void
language plpgsql
as $$
begin
  insert into public.yatra_co_travel_group_members (
    group_id,
    registration_id,
    seat_no,
    berth_no,
    coach_no,
    passenger_name_on_ticket,
    passenger_age_on_ticket,
    passenger_gender,
    berth_type,
    ticket_status,
    wl_rac_no,
    meal_pref,
    senior_citizen,
    ticket_number,
    cabin_class,
    baggage_allowance_kg,
    ssr_notes
  ) values (
    p_group_id,
    p_registration_id,
    p_patch->>'seat_no',
    p_patch->>'berth_no',
    p_patch->>'coach_no',
    p_patch->>'passenger_name_on_ticket',
    (p_patch->>'passenger_age_on_ticket')::int,
    (p_patch->>'passenger_gender')::passenger_gender,
    (p_patch->>'berth_type')::berth_type,
    (p_patch->>'ticket_status')::ticket_status,
    p_patch->>'wl_rac_no',
    (p_patch->>'meal_pref')::meal_pref,
    coalesce((p_patch->>'senior_citizen')::boolean, false),
    p_patch->>'ticket_number',
    p_patch->>'cabin_class',
    (p_patch->>'baggage_allowance_kg')::numeric,
    p_patch->>'ssr_notes'
  )
  on conflict (group_id, registration_id) do update
  set
    seat_no = coalesce(excluded.seat_no, yatra_co_travel_group_members.seat_no),
    berth_no = coalesce(excluded.berth_no, yatra_co_travel_group_members.berth_no),
    coach_no = coalesce(excluded.coach_no, yatra_co_travel_group_members.coach_no),
    passenger_name_on_ticket = coalesce(excluded.passenger_name_on_ticket, yatra_co_travel_group_members.passenger_name_on_ticket),
    passenger_age_on_ticket = coalesce(excluded.passenger_age_on_ticket, yatra_co_travel_group_members.passenger_age_on_ticket),
    passenger_gender = coalesce(excluded.passenger_gender, yatra_co_travel_group_members.passenger_gender),
    berth_type = coalesce(excluded.berth_type, yatra_co_travel_group_members.berth_type),
    ticket_status = coalesce(excluded.ticket_status, yatra_co_travel_group_members.ticket_status),
    wl_rac_no = coalesce(excluded.wl_rac_no, yatra_co_travel_group_members.wl_rac_no),
    meal_pref = coalesce(excluded.meal_pref, yatra_co_travel_group_members.meal_pref),
    senior_citizen = coalesce(excluded.senior_citizen, yatra_co_travel_group_members.senior_citizen),
    ticket_number = coalesce(excluded.ticket_number, yatra_co_travel_group_members.ticket_number),
    cabin_class = coalesce(excluded.cabin_class, yatra_co_travel_group_members.cabin_class),
    baggage_allowance_kg = coalesce(excluded.baggage_allowance_kg, yatra_co_travel_group_members.baggage_allowance_kg),
    ssr_notes = coalesce(excluded.ssr_notes, yatra_co_travel_group_members.ssr_notes);
end$$;

create or replace function public.fn_set_group_incharge(
  p_group_id uuid,
  p_registration_id uuid
) returns void
language plpgsql
as $$
begin
  update public.yatra_co_travel_groups
  set incharge_registration_id = p_registration_id
  where id = p_group_id;
end$$;

create or replace function public.fn_set_train_coach_incharge(
  p_trip_id uuid,
  p_coach_no text,
  p_registration_id uuid
) returns void
language plpgsql
as $$
begin
  insert into public.yatra_train_coaches (trip_id, coach_no, coach_incharge_registration_id)
  values (p_trip_id, p_coach_no, p_registration_id)
  on conflict (trip_id, coach_no) do update
    set coach_incharge_registration_id = excluded.coach_incharge_registration_id;
end$$;

create or replace function public.fn_create_hotel(
  p_name text,
  p_type text,
  p_city text,
  p_address text
) returns uuid
language plpgsql
as $$
declare new_id uuid;
begin
  insert into public.yatra_hotels (name, type, city, address)
  values (p_name, p_type, p_city, p_address)
  returning id into new_id;
  return new_id;
end$$;

create or replace function public.fn_create_hotel_room(
  p_hotel_id uuid,
  p_room_no text,
  p_base_capacity int,
  p_extra_beds_max int
) returns uuid
language plpgsql
as $$
declare new_id uuid;
begin
  insert into public.yatra_hotel_rooms (hotel_id, room_no, base_capacity, extra_beds_max)
  values (p_hotel_id, p_room_no, p_base_capacity, coalesce(p_extra_beds_max, 0))
  returning id into new_id;
  return new_id;
end$$;

create or replace function public.fn_assign_room_stay(
  p_room_id uuid,
  p_registration_id uuid,
  p_stay_from date default null,
  p_stay_to date default null,
  p_allow_overflow boolean default false
) returns void
language plpgsql
as $$
declare
  capacity_total int;
  current_count int;
begin
  select (base_capacity + extra_beds_max)
  into capacity_total
  from public.yatra_hotel_rooms
  where id = p_room_id;

  if capacity_total is null then
    raise exception 'Room not found';
  end if;

  select count(*)
  into current_count
  from public.yatra_room_stays
  where room_id = p_room_id;

  if not p_allow_overflow and current_count >= capacity_total then
    raise exception 'Room capacity exceeded';
  end if;

  insert into public.yatra_room_stays (room_id, registration_id, stay_from, stay_to)
  values (p_room_id, p_registration_id, p_stay_from, p_stay_to);
end$$;

create or replace function public.fn_set_room_incharge(
  p_room_id uuid,
  p_registration_id uuid
) returns void
language plpgsql
as $$
begin
  insert into public.yatra_room_incharges (room_id, registration_id)
  values (p_room_id, p_registration_id)
  on conflict (room_id) do update
    set registration_id = excluded.registration_id;
end$$;

create or replace function public.fn_set_hotel_incharge(
  p_hotel_id uuid,
  p_registration_id uuid
) returns void
language plpgsql
as $$
begin
  insert into public.yatra_hotel_incharges (hotel_id, registration_id)
  values (p_hotel_id, p_registration_id)
  on conflict (hotel_id) do update
    set registration_id = excluded.registration_id;
end$$;

create or replace function public.fn_create_booking_task(
  p_task_type booking_task_type,
  p_trip_id uuid default null,
  p_group_id uuid default null,
  p_hotel_id uuid default null,
  p_room_id uuid default null,
  p_booking_agent_user_id uuid default null,
  p_booking_agent_registration_id uuid default null,
  p_notes text default null
) returns uuid
language plpgsql
as $$
declare new_id uuid;
begin
  insert into public.yatra_booking_tasks (
    task_type,
    trip_id,
    group_id,
    hotel_id,
    room_id,
    booking_agent_user_id,
    booking_agent_registration_id,
    notes
  ) values (
    p_task_type,
    p_trip_id,
    p_group_id,
    p_hotel_id,
    p_room_id,
    p_booking_agent_user_id,
    p_booking_agent_registration_id,
    p_notes
  )
  returning id into new_id;
  return new_id;
end$$;

create or replace function public.fn_assert_registration_ready(
  p_registration_id uuid,
  p_target_status reg_status
) returns void
language plpgsql
as $$
declare r record;
begin
  select
    name_hi,
    father_name_hi,
    address_hi,
    aadhaar_no,
    phone,
    whatsapp,
    dob,
    age_years,
    travel_mode,
    train_class,
    reservation_by,
    photo_url,
    health_none,
    health_heart,
    health_bp,
    health_diabetes,
    health_asthma,
    health_other,
    accompanying_name,
    accompanying_guardian_name,
    accompanying_resident_of,
    accompanying_phone
  into r
  from public.yatra_registrations
  where id = p_registration_id;

  if r is null then
    raise exception 'Registration not found';
  end if;

  if p_target_status in ('needs_review', 'approved') then
    if coalesce(btrim(r.name_hi), '') = ''
      or coalesce(btrim(r.father_name_hi), '') = ''
      or coalesce(btrim(r.address_hi), '') = ''
      or coalesce(btrim(r.aadhaar_no), '') = ''
      or coalesce(btrim(r.phone), '') = ''
      or coalesce(btrim(r.whatsapp), '') = ''
      or r.dob is null
      or r.age_years is null
      or r.travel_mode is null
      or r.reservation_by is null
      or r.photo_url is null or btrim(r.photo_url) = ''
      or coalesce(btrim(r.accompanying_name), '') = ''
      or coalesce(btrim(r.accompanying_guardian_name), '') = ''
      or coalesce(btrim(r.accompanying_resident_of), '') = ''
      or coalesce(btrim(r.accompanying_phone), '') = ''
      or (r.travel_mode = 'train' and coalesce(btrim(r.train_class), '') = '')
      or not (
        coalesce(r.health_none, false)
        or coalesce(r.health_heart, false)
        or coalesce(r.health_bp, false)
        or coalesce(r.health_diabetes, false)
        or coalesce(r.health_asthma, false)
        or (r.health_other is not null and btrim(r.health_other) <> '')
      )
    then
      raise exception 'Registration is missing mandatory fields for %', p_target_status;
    end if;
  end if;
end$$;

create or replace function public.fn_report_city_counts()
returns table(city text, total int)
language sql
stable
as $$
  select
    coalesce(nullif(btrim(address_city), ''), 'Unknown') as city,
    count(*)::int as total
  from public.yatra_registrations
  group by 1
  order by total desc, city;
$$;

create or replace function public.fn_report_district_counts()
returns table(district text, total int)
language sql
stable
as $$
  select
    coalesce(nullif(btrim(address_district), ''), 'Unknown') as district,
    count(*)::int as total
  from public.yatra_registrations
  group by 1
  order by total desc, district;
$$;

create or replace function public.fn_report_travel_members(
  p_mode travel_mode default null,
  p_train_no text default null,
  p_flight_no text default null,
  p_coach_no text default null,
  p_class_code text default null
) returns table(
  registration_id uuid,
  name_hi text,
  phone text,
  trip_id uuid,
  trip_name text,
  journey_date date,
  mode travel_mode,
  train_no text,
  flight_no text,
  group_id uuid,
  group_code text,
  coach_no text,
  seat_no text,
  berth_no text,
  class_code text,
  ticket_status ticket_status
)
language sql
stable
as $$
  select
    r.id,
    r.name_hi,
    r.phone,
    t.id as trip_id,
    t.trip_name,
    t.journey_date,
    t.mode,
    t.train_no,
    t.flight_no,
    g.id as group_id,
    g.group_code,
    m.coach_no,
    m.seat_no,
    m.berth_no,
    coalesce(g.class_code, t.default_class_code) as class_code,
    m.ticket_status
  from public.yatra_co_travel_group_members m
  join public.yatra_co_travel_groups g on g.id = m.group_id
  join public.yatra_trips t on t.id = g.trip_id
  join public.yatra_registrations r on r.id = m.registration_id
  where (p_mode is null or t.mode = p_mode)
    and (p_train_no is null or t.train_no = p_train_no)
    and (p_flight_no is null or t.flight_no = p_flight_no)
    and (p_coach_no is null or m.coach_no = p_coach_no)
    and (p_class_code is null or coalesce(g.class_code, t.default_class_code) = p_class_code)
  order by t.journey_date desc, g.group_code, r.name_hi;
$$;

create or replace function public.fn_report_hotel_stays()
returns table(
  registration_id uuid,
  name_hi text,
  phone text,
  hotel_id uuid,
  hotel_name text,
  room_id uuid,
  room_no text,
  stay_from date,
  stay_to date
)
language sql
stable
as $$
  select
    r.id,
    r.name_hi,
    r.phone,
    h.id as hotel_id,
    h.name as hotel_name,
    hr.id as room_id,
    hr.room_no,
    rs.stay_from,
    rs.stay_to
  from public.yatra_room_stays rs
  join public.yatra_hotel_rooms hr on hr.id = rs.room_id
  join public.yatra_hotels h on h.id = hr.hotel_id
  join public.yatra_registrations r on r.id = rs.registration_id
  order by h.name, hr.room_no, r.name_hi;
$$;

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
  if (auth.jwt() ->> 'role') not in ('reviewer', 'admin') then
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
  where (p_registration_ids is null or r.id = any(p_registration_ids));
end$$;

-- ---------------------------------------------------------------------
-- Update registration patch function for new fields
-- ---------------------------------------------------------------------
create or replace function public.fn_update_registration(
  p_id uuid,
  p_patch jsonb
) returns void
language plpgsql
as $$
begin
  update public.yatra_registrations r
  set
    receipt_no = coalesce((p_patch->>'receipt_no'), r.receipt_no),
    name_hi = coalesce((p_patch->>'name_hi'), r.name_hi),
    guardian_relation = coalesce((p_patch->>'guardian_relation'), r.guardian_relation),
    father_name_hi = coalesce((p_patch->>'father_name_hi'), r.father_name_hi),
    address_hi = coalesce((p_patch->>'address_hi'), r.address_hi),
    address_state = coalesce((p_patch->>'address_state'), r.address_state),
    address_district = coalesce((p_patch->>'address_district'), r.address_district),
    address_city = coalesce((p_patch->>'address_city'), r.address_city),
    address_pin = coalesce((p_patch->>'address_pin'), r.address_pin),
    aadhaar_no = coalesce((p_patch->>'aadhaar_no'), r.aadhaar_no),
    dob = coalesce((p_patch->>'dob')::date, r.dob),
    age_years = coalesce((p_patch->>'age_years')::smallint, r.age_years),
    height_cm = coalesce((p_patch->>'height_cm')::numeric, r.height_cm),
    weight_kg = coalesce((p_patch->>'weight_kg')::numeric, r.weight_kg),
    phone = coalesce((p_patch->>'phone'), r.phone),
    whatsapp = coalesce((p_patch->>'whatsapp'), r.whatsapp),
    travel_mode = coalesce((p_patch->>'travel_mode')::travel_mode, r.travel_mode),
    train_class = case
      when coalesce((p_patch->>'travel_mode')::travel_mode, r.travel_mode) = 'air' then null
      else coalesce((p_patch->>'train_class'), r.train_class)
    end,
    reservation_by = coalesce((p_patch->>'reservation_by')::reservation_by, r.reservation_by),
    health_none = coalesce((p_patch->>'health_none')::boolean, r.health_none),
    health_bp = case
      when coalesce((p_patch->>'health_none')::boolean, r.health_none) then false
      else coalesce((p_patch->>'health_bp')::boolean, r.health_bp)
    end,
    health_bp_meds = case
      when coalesce((p_patch->>'health_none')::boolean, r.health_none) then null
      when coalesce((p_patch->>'health_bp')::boolean, r.health_bp) then coalesce((p_patch->>'health_bp_meds'), r.health_bp_meds)
      else null
    end,
    health_diabetes = case
      when coalesce((p_patch->>'health_none')::boolean, r.health_none) then false
      else coalesce((p_patch->>'health_diabetes')::boolean, r.health_diabetes)
    end,
    health_diabetes_meds = case
      when coalesce((p_patch->>'health_none')::boolean, r.health_none) then null
      when coalesce((p_patch->>'health_diabetes')::boolean, r.health_diabetes) then coalesce((p_patch->>'health_diabetes_meds'), r.health_diabetes_meds)
      else null
    end,
    health_heart = case
      when coalesce((p_patch->>'health_none')::boolean, r.health_none) then false
      else coalesce((p_patch->>'health_heart')::boolean, r.health_heart)
    end,
    health_heart_meds = case
      when coalesce((p_patch->>'health_none')::boolean, r.health_none) then null
      when coalesce((p_patch->>'health_heart')::boolean, r.health_heart) then coalesce((p_patch->>'health_heart_meds'), r.health_heart_meds)
      else null
    end,
    health_asthma = case
      when coalesce((p_patch->>'health_none')::boolean, r.health_none) then false
      else coalesce((p_patch->>'health_asthma')::boolean, r.health_asthma)
    end,
    health_asthma_meds = case
      when coalesce((p_patch->>'health_none')::boolean, r.health_none) then null
      when coalesce((p_patch->>'health_asthma')::boolean, r.health_asthma) then coalesce((p_patch->>'health_asthma_meds'), r.health_asthma_meds)
      else null
    end,
    health_common_meds = case
      when coalesce((p_patch->>'health_none')::boolean, r.health_none) then null
      when p_patch ? 'health_common_meds' then nullif((p_patch->>'health_common_meds'), '')
      when (
        p_patch ? 'health_heart'
        or p_patch ? 'health_bp'
        or p_patch ? 'health_diabetes'
        or p_patch ? 'health_asthma'
        or p_patch ? 'health_heart_meds'
        or p_patch ? 'health_bp_meds'
        or p_patch ? 'health_diabetes_meds'
        or p_patch ? 'health_asthma_meds'
      )
      then nullif(
        trim(both ', ' from concat_ws(
          ', ',
          case
            when coalesce((p_patch->>'health_heart')::boolean, r.health_heart)
              then coalesce((p_patch->>'health_heart_meds'), r.health_heart_meds)
            else null
          end,
          case
            when coalesce((p_patch->>'health_bp')::boolean, r.health_bp)
              then coalesce((p_patch->>'health_bp_meds'), r.health_bp_meds)
            else null
          end,
          case
            when coalesce((p_patch->>'health_diabetes')::boolean, r.health_diabetes)
              then coalesce((p_patch->>'health_diabetes_meds'), r.health_diabetes_meds)
            else null
          end,
          case
            when coalesce((p_patch->>'health_asthma')::boolean, r.health_asthma)
              then coalesce((p_patch->>'health_asthma_meds'), r.health_asthma_meds)
            else null
          end
        )),
        ''
      )
      else r.health_common_meds
    end,
    health_other = case
      when coalesce((p_patch->>'health_none')::boolean, r.health_none) then null
      else coalesce((p_patch->>'health_other'), r.health_other)
    end,
    health_other_meds = case
      when coalesce((p_patch->>'health_none')::boolean, r.health_none) then null
      when coalesce(nullif((p_patch->>'health_other'), ''), r.health_other) is null then null
      else coalesce((p_patch->>'health_other_meds'), r.health_other_meds)
    end,
    emergency_contact_name = coalesce((p_patch->>'emergency_contact_name'), r.emergency_contact_name),
    emergency_contact_father_name = coalesce((p_patch->>'emergency_contact_father_name'), r.emergency_contact_father_name),
    emergency_contact_age_years = coalesce((p_patch->>'emergency_contact_age_years')::smallint, r.emergency_contact_age_years),
    emergency_contact_address = coalesce((p_patch->>'emergency_contact_address'), r.emergency_contact_address),
    emergency_contact_phone = coalesce((p_patch->>'emergency_contact_phone'), r.emergency_contact_phone),
    photo_url = coalesce((p_patch->>'photo_url'), r.photo_url),
    form_image_url = coalesce((p_patch->>'form_image_url'), r.form_image_url),
    attended_badarinath_2024 = coalesce((p_patch->>'attended_badarinath_2024')::boolean, r.attended_badarinath_2024),
    sadhu_sant_category = coalesce((p_patch->>'sadhu_sant_category')::boolean, r.sadhu_sant_category),
    declaration_accepted = coalesce((p_patch->>'declaration_accepted')::boolean, r.declaration_accepted),
    declaration_signed_at = case
      when p_patch ? 'declaration_signed_at' then (p_patch->>'declaration_signed_at')::timestamptz
      when coalesce((p_patch->>'declaration_accepted')::boolean, r.declaration_accepted) = false then null
      when coalesce((p_patch->>'declaration_accepted')::boolean, r.declaration_accepted) = true
        and r.declaration_signed_at is null then now()
      else r.declaration_signed_at
    end,
    status = coalesce((p_patch->>'status')::reg_status, r.status),
    ocr_confidence = coalesce((p_patch->>'ocr_confidence')::numeric, r.ocr_confidence),
    raw_json = case
      when p_patch ? 'raw_json' then coalesce((p_patch->'raw_json')::jsonb, r.raw_json)
      else r.raw_json
    end,
    accompanying_name = coalesce((p_patch->>'accompanying_name'), r.accompanying_name),
    accompanying_guardian_name = coalesce((p_patch->>'accompanying_guardian_name'), r.accompanying_guardian_name),
    accompanying_resident_of = coalesce((p_patch->>'accompanying_resident_of'), r.accompanying_resident_of),
    accompanying_phone = coalesce((p_patch->>'accompanying_phone'), r.accompanying_phone),
    category_id = coalesce((p_patch->>'category_id')::uuid, r.category_id)
  where r.id = p_id;

  if p_patch ? 'status' then
    perform public.fn_assert_registration_ready(p_id, (p_patch->>'status')::reg_status);
  end if;
end$$;

-- Update create review to block approve if mandatory fields missing
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
  if p_action = 'approve' then
    perform public.fn_assert_registration_ready(p_registration_id, 'approved'::reg_status);
  end if;

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

commit;

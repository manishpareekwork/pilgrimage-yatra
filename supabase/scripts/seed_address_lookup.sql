-- Seed address lookup tables from CSV files.
-- Safe to re-run; uses upserts on primary keys.
-- Requires psql (uses \copy). Run from repo root:
--   psql "$SUPABASE_DB_URL" -f supabase/scripts/seed_address_lookup.sql

\set ON_ERROR_STOP on

begin;

create temp table tmp_address_states (
  id text,
  name text
);

\copy tmp_address_states (id, name) from 'supabase/data/address_states.csv' with (format csv, header true);

insert into public.address_states (id, name)
select id, name
from tmp_address_states
on conflict (id) do update
  set name = excluded.name;

create temp table tmp_address_districts (
  id text,
  state_id text,
  name text
);

\copy tmp_address_districts (id, state_id, name) from 'supabase/data/address_districts.csv' with (format csv, header true);

insert into public.address_districts (id, state_id, name)
select id, state_id, name
from tmp_address_districts
on conflict (id) do update
  set state_id = excluded.state_id,
      name = excluded.name;

commit;

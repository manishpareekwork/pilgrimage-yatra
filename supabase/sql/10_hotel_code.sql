
commit;


-- =====================================================================
-- Migration: supabase/migrations/20260109_hotel_code.sql
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- Auto hotel code
-- ---------------------------------------------------------------------
create sequence if not exists public.yatra_hotel_code_seq;

alter table public.yatra_hotels
  add column if not exists hotel_code text;

update public.yatra_hotels
set hotel_code = 'HOT-' || lpad(nextval('public.yatra_hotel_code_seq')::text, 4, '0')
where hotel_code is null or btrim(hotel_code) = '';

with max_code as (
  select max(nullif(regexp_replace(hotel_code, '\D', '', 'g'), '')::int) as value
  from public.yatra_hotels
)
select setval(
  'public.yatra_hotel_code_seq',
  coalesce((select value from max_code), 1),
  coalesce((select value from max_code), 0) > 0
);

create unique index if not exists idx_yatra_hotels_hotel_code on public.yatra_hotels(hotel_code);

alter table public.yatra_hotels
  alter column hotel_code set not null;

create or replace function public.fn_set_hotel_code()
returns trigger
language plpgsql
as $$
begin
  if new.hotel_code is null or btrim(new.hotel_code) = '' then
    new.hotel_code := 'HOT-' || lpad(nextval('public.yatra_hotel_code_seq')::text, 4, '0');
  end if;
  return new;
end$$;

drop trigger if exists trg_set_hotel_code on public.yatra_hotels;
create trigger trg_set_hotel_code
before insert on public.yatra_hotels

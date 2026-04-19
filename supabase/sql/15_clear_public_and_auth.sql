-- =====================================================================
-- 15 — CLEAR public data + Auth users (DEV / STAGING)
-- =====================================================================
-- Run AFTER 00–14 schema. Safe to re-run before 16.
-- Wipes ALL public rows (including address lookup seeds from 14) and all Auth users.
-- Re-run 14 after this if you need state/district dropdown data again.
-- Does NOT: drop schema, clear Storage (use Dashboard).
-- =====================================================================

begin;

-- ---------- Public tables (keep in sync with supabase/pilgrimage.sql) ----------
truncate table
  public.address_districts,
  public.address_states,
  public.master_stations,
  public.master_train_stops,
  public.master_trains,
  public.profiles,
  public.volunteer_role_members,
  public.volunteer_roles,
  public.yatra_booking_tasks,
  public.yatra_categories,
  public.yatra_co_travel_groups,
  public.yatra_co_travel_group_members,
  public.yatra_hotel_incharges,
  public.yatra_hotel_rooms,
  public.yatra_hotels,
  public.yatra_registrations,
  public.yatra_reviews,
  public.yatra_room_incharges,
  public.yatra_room_stays,
  public.yatra_train_coaches,
  public.yatra_trips
restart identity cascade;

-- ---------- Auth ----------
delete from auth.refresh_tokens where true;
delete from auth.sessions where true;
delete from auth.identities where true;
delete from auth.users where true;

commit;

-- Next: 16_seed_dev_admin.sql

-- =====================================================================
-- Fix: staff RLS must use fn_is_staff() (profiles + app_metadata).
-- Live DB had legacy policies checking auth.jwt() ->> 'role' = admin,
-- which is always "authenticated" — staff saw 0 rows; imported yatris have null owner.
-- Idempotent with 09_staff_role_policies.sql policy section.
-- =====================================================================

begin;

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

drop policy if exists "staff read forms" on storage.objects;
create policy "staff read forms" on storage.objects
for select using (
  bucket_id in ('forms','photos') and public.fn_is_staff()
);

commit;

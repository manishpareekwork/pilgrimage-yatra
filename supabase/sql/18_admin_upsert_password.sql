-- Dev/staging admin upsert (run manually in Supabase SQL editor when needed).
-- Default credentials after run: admin@admin.com / p@ss12
-- Requires: pgcrypto, existing admin_set_user_role().

begin;

create extension if not exists pgcrypto;

do $$
declare
  v_id uuid;
  v_encrypted_pw text := crypt('p@ss12', gen_salt('bf'));
  v_instance_id uuid;
begin
  select id into v_id from auth.users where email = 'admin@admin.com' limit 1;

  if v_id is null then
    v_id := gen_random_uuid();
    select coalesce((select id from auth.instances limit 1), '00000000-0000-0000-0000-000000000000'::uuid)
      into v_instance_id;
    insert into auth.users (
      id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      v_id, v_instance_id, 'authenticated', 'authenticated', 'admin@admin.com', v_encrypted_pw, now(),
      '{"provider":"email","providers":["email"],"role":"admin"}'::jsonb, '{}'::jsonb, now(), now(),
      '', '', '', ''
    );
    insert into auth.identities (
      id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
    ) values (
      v_id, v_id, format('{"sub":"%s","email":"admin@admin.com"}', v_id)::jsonb,
      'email', v_id::text, now(), now(), now()
    );
  else
    update auth.users
    set encrypted_password = v_encrypted_pw,
        email_confirmed_at = coalesce(email_confirmed_at, now()),
        raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
          || '{"provider":"email","providers":["email"],"role":"admin"}'::jsonb,
        updated_at = now()
    where id = v_id;
  end if;

  insert into public.profiles (id, role, name_hi)
  values (v_id, 'admin', 'Admin')
  on conflict (id) do update set role = 'admin';
end $$;

commit;

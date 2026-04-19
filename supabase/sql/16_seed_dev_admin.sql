-- =====================================================================
-- 16 — SEED dev admin (DEV / STAGING)
-- =====================================================================
-- Run AFTER 15_clear_public_and_auth.sql (or when Auth has no users).
-- Credentials: admin@admin.com / 12345678
-- =====================================================================

begin;

create extension if not exists pgcrypto;

do $$
declare
  v_user_id uuid := gen_random_uuid();
  v_instance_id uuid;
  v_encrypted_pw text := crypt('12345678', gen_salt('bf'));
begin
  select coalesce(
    (select id from auth.instances limit 1),
    '00000000-0000-0000-0000-000000000000'::uuid
  )
  into v_instance_id;

  insert into auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  )
  values (
    v_user_id,
    v_instance_id,
    'authenticated',
    'authenticated',
    'admin@admin.com',
    v_encrypted_pw,
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  insert into auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  )
  values (
    v_user_id,
    v_user_id,
    format('{"sub":"%s","email":"admin@admin.com"}', v_user_id)::jsonb,
    'email',
    v_user_id::text,
    now(),
    now(),
    now()
  );

  perform public.admin_set_user_role(v_user_id, 'admin');
end$$;

commit;

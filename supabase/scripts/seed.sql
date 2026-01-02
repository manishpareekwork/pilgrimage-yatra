-- Seed demo registrations for Pilgrimage Yatra
-- Usage: run in Supabase SQL editor or `psql` connected to your project.
-- Safe to re-run; uses fixed IDs for demo owners/creators (replace with real auth.user ids if needed).
-- For address lookup data, use supabase/scripts/seed_address_lookup.sql.

begin;

-- Pull two existing auth.users as owners/creators. If none exist, nothing is inserted.
with demo_users as (
  select
    (array_agg(id order by created_at))[1] as owner1,
    coalesce((array_agg(id order by created_at))[2], (array_agg(id order by created_at))[1]) as owner2
  from auth.users
  limit 1
)
insert into public.yatra_registrations (
  id, owner, created_by, name_hi, father_name_hi, address_hi, phone, whatsapp,
  travel_mode, train_class, health_bp, health_diabetes, health_other,
  emergency_contact_name, emergency_contact_phone, photo_url, form_image_url,
  status, created_at
)
select *
from (
  values
    (gen_random_uuid(), (select owner1 from demo_users), (select owner1 from demo_users),
     'राम कुमार', 'शिव प्रसाद', 'पुरी, ओडिशा', '+919812345678', '+919812345678',
     'train'::travel_mode, 'III AC', true, false, null, 'मोहन', '+919800000001',
     'photos/registrations/demo-1/photo.jpg', 'forms/registrations/demo-1/form.jpg', 'submitted'::reg_status, now() - interval '2 days'),
    (gen_random_uuid(), (select owner1 from demo_users), (select owner2 from demo_users),
     'सौरभ मिश्रा', 'अनिल मिश्रा', 'कटक, ओडिशा', '+919812300001', '+919812300001',
     'train'::travel_mode, 'II AC', false, false, 'शुगर चेक', 'रोहित', '+919800000002',
     null, 'forms/registrations/demo-2/form.jpg', 'needs_review'::reg_status, now() - interval '1 day'),
    (gen_random_uuid(), (select owner2 from demo_users), (select owner2 from demo_users),
     'रीता शर्मा', 'धर्मेश शर्मा', 'भुवनेश्वर', '+919812300002', '+919812300002',
     'air'::travel_mode, null, false, false, null, 'विकास', '+919800000003',
     'photos/registrations/demo-3/photo.jpg', null, 'approved'::reg_status, now() - interval '3 days'),
    (gen_random_uuid(), (select owner2 from demo_users), (select owner1 from demo_users),
     'अरुण पटनायक', 'गिरिधर पटनायक', 'खुर्दा', '+919812300003', '+919812300003',
     'train'::travel_mode, 'Sleeper', true, true, 'हेल्थ फॉलो-अप', 'मनोज', '+919800000004',
     null, 'forms/registrations/demo-4/form.jpg', 'rejected'::reg_status, now() - interval '5 days'),
    (gen_random_uuid(), (select owner1 from demo_users), (select owner1 from demo_users),
     'सुमन दास', 'शशि दास', 'कटक', '+919812300004', '+919812300004',
     'train'::travel_mode, 'III AC', false, false, null, 'दीपक', '+919800000005',
     'photos/registrations/demo-5/photo.jpg', null, 'submitted'::reg_status, now() - interval '6 hours')
) as t(id, owner, created_by, name_hi, father_name_hi, address_hi, phone, whatsapp,
        travel_mode, train_class, health_bp, health_diabetes, health_other,
        emergency_contact_name, emergency_contact_phone, photo_url, form_image_url,
        status, created_at)
where (select owner1 from demo_users) is not null
on conflict (id) do nothing;

commit;

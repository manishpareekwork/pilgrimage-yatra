# Pilgrimage – Yatra Tech Spec v0.1 (for Codex)

_Scope:_ Monorepo for Pilgrimage Yatra 2025 with Supabase backend, Cloud Run orchestrator, Next.js admin, and Flutter mobile app. This spec stays close to what was scaffolded so codegen stays consistent.

## 1. Architecture
- **Backend:** Supabase (Postgres + Auth + Storage + RLS).
- **Orchestrator:** Node/TS Express on Cloud Run. Responsibilities: signed URLs, privileged mutations via service role, Document AI OCR, admin helpers.
- **Admin Web:** Next.js (App Router, TS, Tailwind v4) using `@supabase/auth-helpers-nextjs` for SSR auth.
- **Mobile:** Flutter (Material 3) using `supabase_flutter`, `go_router`, `flutter_dotenv`.
- **Storage buckets:** `forms` (scanned forms), `photos` (profile photos). Private; staff read via SQL, uploads/downloads via signed URLs.

## 2. Environments & Secrets
- **Shared:** `SUPABASE_URL`, keys.
- **Admin (.env.local):** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- **Mobile (.env asset):** `SUPABASE_URL`, `SUPABASE_ANON_KEY`.
- **Cloud Run env/Secret Manager:** `SUPABASE_SERVICE_KEY`, `DOC_AI_LOCATION`, `DOC_AI_OCR_PROCESSOR_ID`, `DOC_AI_LAYOUT_PROCESSOR_ID`, `ZONE_MAP_JSON`, `THRESHOLDS_JSON`.
- **Orchestrator base:** Render deployment `https://pilgrimage-yatra.onrender.com` (override via `NEXT_PUBLIC_ORCHESTRATOR_URL` / `ORCHESTRATOR_URL`).
- Roles stored in `auth.users.raw_app_meta_data.role` and mirrored to `public.profiles.role`.

## 3. Database (see `supabase/pilgrimage_bootstrap.sql`)
- **Enums:** `user_role ('yatri','volunteer','reviewer','admin')`, `reg_status ('submitted','needs_review','approved','rejected')`, `travel_mode ('train','air')`.
- **Tables:**
  - `public.profiles`: `id uuid PK -> auth.users`, `role user_role default 'yatri'`, `name_hi`, `phone`, `created_at`.
  - `public.yatra_registrations`: `id uuid PK default gen_random_uuid()`, `owner uuid`, `created_by uuid`, `name_hi text not null`, `father_name_hi text`, `address_hi text`, `phone`, `whatsapp`, `travel_mode travel_mode`, `train_class text`, `health_bp bool`, `health_diabetes bool`, `health_other text`, `emergency_contact_name text`, `emergency_contact_phone text`, `photo_url text`, `form_image_url text`, `status reg_status default 'submitted'`, `ocr_confidence numeric`, `raw_json jsonb`, `created_at timestamptz default now()`.
  - `public.yatra_reviews`: `id uuid PK default gen_random_uuid()`, `registration_id uuid FK -> yatra_registrations`, `action text check in ('approve','reject','edit')`, `diff jsonb`, `actor uuid`, `created_at timestamptz default now()`.
- **Indexes:** profiles(created_at); registrations on owner, created_by, status; partial unique on phone where not null.
- **RLS (summary):**
  - profiles: user can select/update own row.
  - registrations: yatri CRUD own (`owner = auth.uid()`); volunteers CRUD created rows if role in `volunteer|reviewer|admin`; reviewers/admins can select/update all.
  - reviews: staff insert/select all; yatri can select rows for their registrations.
- **Functions:**
  - `fn_create_registration(owner, created_by, name_hi, father_name_hi, address_hi, phone, whatsapp, travel_mode, train_class, health_bp, health_diabetes, health_other, emergency_contact_name, emergency_contact_phone, photo_url, form_image_url) returns uuid`.
  - `fn_update_registration(id, patch jsonb)`.
  - `fn_create_review(registration_id, action, diff, actor) returns uuid` (auto-updates status on approve/reject).
  - `admin_set_user_role(user, role)` (SECURITY DEFINER, revoke PUBLIC).

## 4. Orchestrator (Cloud Run, `pilgrimage/cloud`)
- Express server with `/healthz` and stub `/sign-url`.
- Next steps: validate JWT, generate Supabase Storage signed URLs, add `/process-form` for Document AI ingestion, add admin endpoints (create user, set role) using service key.

## 5. Admin Web (Next.js, `pilgrimage/admin`)
- **Auth:** `@supabase/auth-helpers-nextjs` middleware redirects to `/login`. Email/password login against Supabase Auth (seeded `admin@admin.com` etc.).
- **Routes:**
  - `/login` – form login.
  - `/dashboard` – tiles with counts by status + total.
  - `/yatris` – table (name, phone, status, createdAt) with status + search filters.
  - `/yatris/[id]` – detail page showing core fields, form image/photo previews, inline edit form, approve/reject buttons calling `fn_create_review`.
  - `/users` – admin-only, list profiles (id, role, name, phone).
- **Layout:** sidebar/top nav with user email + role; Tailwind v4 styling.

## 6. Mobile App (Flutter, `pilgrimage/mobileapp`)
- **Auth:** Email/password login (Supabase).
- **Routes (go_router):** `/login`, `/home` (buttons: Create Registration, Admin if role admin|reviewer), `/registration` (manual form insert), `/admin/list` (needs_review by default, role-gated), `/admin/detail/:id` (detail, approve/reject buttons show snackbar placeholders).
- **Role detection:** `Supabase.instance.client.auth.currentUser?.appMetadata['role']`.
- **Data ops:** Insert `yatra_registrations` with `owner` + `created_by` = current user; list/detail read via Supabase client; uploads to go through orchestrator signed URLs later.

## 7. Deployment Notes
- **Admin:** configure `.env.local` with anon key + URL; Next 16 + React 19, Tailwind v4.
- **Cloud Run:** build from `pilgrimage/cloud/Dockerfile`; inject secrets as env vars; restrict ingress.
- **Mobile:** bundle `.env` (no service key), run `flutter run`; ensure platform setup for Android/iOS.

## 8. Future Enhancements
- Wire signed URL issuance + uploads; add Document AI `/process-form`.
- Add pagination + search chips to admin/mobile lists.
- Add notifications (OneSignal) on approve/reject.
- Add CI: lint/build for admin/cloud, `flutter analyze` for mobile.

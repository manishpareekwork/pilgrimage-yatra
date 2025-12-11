# Pilgrimage Monorepo

Mono-repo for Pilgrimage Yatra 2025. Major packages:
- `admin/` — Next.js admin console (Supabase Auth, Yatri CRUD).
- `mobileapp/` — Flutter client with Supabase auth + manual registrations.
- `cloud/` — Node/TS Express orchestrator (signed URLs, OCR, privileged writes).
- `supabase/` — SQL bootstrap (schema, RLS, helper functions).

Shared production orchestrator (Render): **https://pilgrimage-yatra.onrender.com**

Quick start:
1) `cd admin && npm install` (or `cd mobileapp && flutter pub get` / `cd cloud && npm install`)
2) Copy env templates and set `SUPABASE_URL` + keys (see package READMEs).
3) Run dev servers: `npm run dev` (admin), `flutter run` (mobileapp), `npm run dev` (cloud).

# Pilgrimage / Yatra Project — Progress & Next Steps Log

_Last updated: 2026-01-02_

Note: This document is the current source of truth; older versions are obsolete.

This document tracks all progress, configuration milestones, and next planned actions across the three major components:
1. **Cloud (GCP + Supabase Integration)**  
2. **Admin Web App (Next.js + Supabase)**  
3. **Mobile App (Flutter + Supabase)**

---

## ✅ Current Progress Summary

### Cloud Infrastructure (GCP)
| Task | Status | Notes |
|------|---------|-------|
| GCP Project + Billing | ✅ | `pilgrimage-yatra-ocr` created & billing linked. |
| Service Account | ✅ | `ocr-orchestrator-sa` with minimal roles (`documentai.apiUser`, `secretmanager.secretAccessor`, `logging.logWriter`). |
| Document AI Processors | ✅ | Enterprise OCR + Layout Parser (region: `asia-south1`). |
| Secret Manager | ✅ | `supabase-url`, `supabase-service-key`, `docai-*`, `zone-map-v1`, `ocr-thresholds`. |
| Cloud Run | ✅ | Service `yatra-ocr-orchestrator` deployed (private). |
| Secrets attached to Cloud Run | ✅ | Mounted as env vars `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`. |
| Health Check | ⚙️ In progress | `/healthz` implemented in Express middleware; deploy + monitor pending. |

---

### Supabase Backend
| Task | Status | Notes |
|------|---------|-------|
| Project Creation | ✅ | `pilgrimage-yatra` in Mumbai region. |
| Schema Setup | ✅ | `pilgrimage_bootstrap.sql` refreshed with travel_mode + reservation_by enums, full PDF registration columns, helper RPCs, RLS (migration `20251229_registration_alignment.sql`); added safe re-runnable `pilgrimage_bootstrap_safe.sql`. |
| Buckets | ✅ | `forms` and `photos` created (private) with staff read policy. |
| Address Lookup Tables | ✅ | `address_states` + `address_districts` with RPCs; seed pipeline in `supabase/scripts/build_address_lookup.py` + `seed_address_lookup.sql` (pincode table removed). |
| First Admin User | ⚙️ Pending | Create Auth user → run `select public.admin_set_user_role('<uuid>'::uuid, 'admin');` |
| Review/Volunteer Roles | ⚙️ Pending | To assign once reviewers onboarded. |
| Testing Data | ⚙️ Pending | Insert sample registration for UI testing. |

---

### Admin Web App (Next.js)
| Task | Status | Notes |
|------|---------|-------|
| Next.js Scaffold | ✅ | App Router + Tailwind v4, strict TS. |
| Supabase Auth Integration | ✅ | Email/password login (`/login`), middleware redirects unauthenticated users. |
| Dashboard | ✅ | Status tiles (inline styled) with banner header. |
| Yatris CRUD | ✅ | `/yatris` list with filters + column search, multi-format export, inline photo upload; `/yatris/[id]` detail + full PDF-aligned quick edit + uploads + approve/reject RPC; `/yatris/new` full PDF form (declaration required) using create+patch RPCs. |
| Users | ✅ | `/users` admin-only profile table. |
| Styling | ⚙️ Mixed | Some views use inline styling to bypass dev CSS issues; align via shared styles next. |

---

### Mobile App (Flutter)
| Task | Status | Notes |
|------|---------|-------|
| Flutter Environment | ✅ | Flutter SDK configured; null-safety enabled. |
| Supabase SDK Integration | ✅ | `supabase_flutter`, `go_router`, `flutter_dotenv` wired with `.env` loader. |
| Auth Screen | ✅ | Email/password login. |
| Registration Form | ✅ | Full PDF-aligned fields with medical toggles, reservation_by, declaration required; create → optional upload → patch flow storing `form_image_url`. |
| Admin Tab | ✅ | Role-gated list/detail; read-only detail shows all fields; approval wiring still pending. |

---

## 🔜 Immediate Next Steps

### 1. Supabase Ops
- [ ] Create admin/reviewer/volunteer auth users and set roles via `admin_set_user_role`.
- [ ] Seed 3–5 test registrations for UI flows.
- [ ] Run address lookup seed for states/districts once DB connection is confirmed.

### 2. Cloud API Middleware (Render: https://pilgrimage-yatra.onrender.com)
- [x] Scaffold Node.js + TypeScript Express service (`/healthz`, `/registrations`, `/process-form` mock).
- [x] Replace fake signed URL with Supabase Storage signed URL call + auth checks.
- [x] Add CORS middleware for browser clients (config via `ALLOWED_ORIGINS`).
- [ ] Implement real `/process-form` with OCR integration (Doc AI/Tesseract) and RLS-safe writes.
- [ ] Redeploy to Render with secrets.

### 3. Admin UI Next Pass
- [ ] Wire approve/reject to `/process-form`/RPC with optimistic feedback.
- [x] Add signed download URLs for private bucket photo thumbnails in the Yatris grid.
- [ ] Unify styling (remove inline fallbacks) once dev server root is stable.
- [ ] Add create-user flow via Cloud API (service key).

### 4. Mobile App Next Pass
- [ ] Hook approve/reject buttons to RPC or Cloud Run.
- [ ] Add list filters and basic offline cache (optional).
- [ ] Add upload flow via signed URL once available (currently direct to bucket).

### 5. Tooling & Docs
- [ ] Add `.env.template` files for admin/cloud/mobile.
- [ ] Add CI smoke tests: `npm run lint` in admin, `npm test` for cloud, `flutter analyze` for mobile.
- [x] Verify dashboard layout + report builder spacing; run `npm run build` for admin and cloud.

---

## 🧭 Upcoming Phases

| Phase | Focus | Key Deliverables |
|-------|--------|------------------|
| **A – Auth & Profiles** | Supabase auth on mobile + admin | Login/Signup flow, role sync, `profiles` auto-create trigger. |
| **B – Registrations (Manual)** | Form submission (no OCR) | Flutter form → `yatra_registrations` insert. Admin list + edit. |
| **C – Orchestrator Integration** | Cloud Run + Document AI | `/process-form` → parse → insert → mark `needs_review`. |
| **D – Review & Notifications** | Workflow | Approve/Reject in admin, OneSignal push to user. |
| **E – Metrics & Reports** | Observability | Stats dashboard, throughput, error alerts. |

---

## 🗂️ Reference Assets in Repo
| Path | Description |
|------|-------------|
| `supabase/pilgrimage_bootstrap.sql` | Full schema + policies. |
| `infra/zone-map-v1.json` | OCR coordinate zones. |
| `infra/thresholds.json` | Confidence thresholds. |
| `admin/` | Next.js admin panel scaffold. |
| `mobileapp/` | Flutter client with Supabase auth + manual registration. |
| `pilgrimage/cloud/` | Orchestrator API for Cloud Run (stubbed). |
| `project_progress_and_next_steps.md` | This document — update as milestones complete. |

---

## 📝 Update Log
| Date | Update |
|------|---------|
| 2026-01-09 | Analytics dashboard + Operations hub shipped; reports builder cleaned up with 12px padding and print-ready exports; volunteer CRUD moved behind API; default status now approved; admin/cloud builds pass. |
| 2026-01-02 | Added safe Supabase bootstrap script (non-destructive) and signed download URLs for private photo thumbnails in Yatris grid. |
| 2026-01-02 | Yatris grid refinement: table spacing, column search, multi-format export (CSV/Excel/PDF), inline photo upload; orchestrator CORS enabled for browser clients. |
| 2026-01-02 | Yatris grid UI tightened (filters layout, padded table, ellipsis row actions); fixed `/yatris/[id]` load by selecting all columns; resolved create-user cookies async warning; stabilized build (Tailwind PostCSS plugin resolution + `NODE_ENV=production` in build script). |
| 2026-01-02 | Address lookup pipeline added: scripts to generate `address_states.csv` + `address_districts.csv` from raw PIN dataset and seed Supabase tables. |
| 2026-01-02 | Generated address CSVs from the raw PIN dataset; pending Supabase DB connection string to run `seed_address_lookup.sql`. |
| 2026-01-02 | PIN lookup disabled in admin forms; PIN entry is manual/optional and no longer auto-fills from pincode table. |
| 2026-01-02 | Address inputs simplified: City/Village combined into one field, Tehsil removed from admin forms. |
| 2026-01-02 | Dropped `address_pincodes` + `fn_lookup_pincode`, removed address_village/address_tehsil columns via migration; updated bootstraps and seed docs. |
| 2026-01-01 | Dashboard hero + status cards refined: pill-based CTA, compact status tiles, and improved spacing/controls. |
| 2026-01-01 | Yatris listing upgraded to admin grid: server-side search/filter/sort/pagination, column customization + saved views, CSV export, responsive table/card view. |
| 2026-01-01 | Refined `/yatris/new` form layout: calmer spacing, updated input sizing, streamlined medical notes, and polished declaration/actions styling. |
| 2026-01-01 | Dashboard de-noised (removed filler copy), removed duplicate New Registration CTA from header, fixed app-shell main padding/max-width, corrected dark theme tokens for readable text, and improved theme toggle dropdown spacing. |
| 2026-01-01 | Dashboard and header cleaned up: removed filler copy, fixed spacing, improved card depth, replaced logo placeholder with image, redesigned theme toggle, and simplified CTA. |
| 2026-01-01 | Dashboard visual refresh (spacing, card depth, improved theme tokens) plus redesigned theme toggle dropdown; kept Database connected status label. |
| 2025-12-29 | Standardized Admin UI kit usage across dashboard, `/yatris/new`, `/yatris/[id]`, create user; fixed AppShell main container padding/max-width; fixed profiles ensureProfileRow to upsert. |
| 2025-12-29 | Introduced shared FormKit (PageContainer/PageHeader/SectionCard/Field inputs) and refactored `/yatris/new` and `/yatris/[id]` to professional responsive dark theme; added date/datetime pickers and sticky actions. |
| 2025-12-29 | Fixed `/yatris/[id]` load failure by fetching from base table + auth-aware server client; ensured profiles row exists; improved detail page layout and error diagnostics. |
| 2025-12-29 | Refined `/yatris/new` UI into sectioned card layout with reusable form components; added proper date/datetime pickers; fixed Fill Sample Data uniqueness. |
| 2025-12-29 | Fixed Next.js params/searchParams await warnings on /yatris/[id]; improved form contrast; signed_at date picker; father/guardian dropdown. |
| 2025-12-29 | Fixed React useActionState crash on NewRegistrationForm; added Fill Sample Data + Minimal mode; verified row insert + redirect. |
| 2025-12-29 | Registration form fully aligned with PDF; DB, Admin, Mobile updated; system snapshot generated. |
| 2025-12-29 | Admin dashboard spacing/radius improved; inner card content centering still pending (to polish next). |
| 2025-12-29 | New Yatri registration flow hardened (zod validation, inline error, owner/created_by set, redirect to detail) and upload checklist added on detail page. |
| **2025-12-23** | Fixed Admin layout regression: restored Tailwind globals + shared AppShell; dashboard cards visible; pages centered; docs noted as source of truth. |
| **2025-12-23** | Admin UI cards/layout refreshed (nav/header, empty states, buttons) and docs marked as current source of truth with implemented statuses. |
| **2025-12-23** | Dashboard counts fixed with error handling/empty-state CTA; Yatris list now shows empty-state CTA and stable filters; nav/buttons standardized; added Supabase seed script (`supabase/scripts/seed.sql`) with 5 demo rows. |
| **2025-12-22** | Resolved Next.js cookie access error in admin (await cookies before passing to Supabase helper) to fix `/yatris/new` and protected layout rendering. |
| **2025-12-22** | Fixed admin Supabase server client cookie handling (await cookies) to resolve Next.js sync cookies error on `/yatris/new`. |
| **2025-12-22** | Fixed async `searchParams` handling on `/yatris` to comply with Next.js dynamic API rules (filters/search now stable). |
| **2025-12-22** | Uploads now tied to registrationId paths (`forms/registrations/<id>/form.jpg`, `photos/registrations/<id>/photo.jpg`); admin and mobile flows updated, re-upload overwrites and persists; verified via UI upload + preview. |
| **2025-12-21** | Admin UI uploads for photo/form image via `/sign-url` implemented; verified by upload + persisted preview on Yatri detail. |
| **2025-12-21** | Implemented real signed URL issuance in orchestrator for private buckets; verified via curl upload (`docs/api/orchestrator.md`). |
| **2025-12-21** | Created `docs/ui_functional_spec.md` detailing UI layouts and functional behavior per screen for admin web and mobile; to be updated each milestone. |
| **2025-12-21** | Fixed Supabase server client cookie handling in admin (no async adapter) to resolve `nextCookies.get is not a function` in protected layout; test: `npm run dev` then load a protected page to confirm auth redirect works. |
| **2025-12-20** | Admin login: added autocomplete attributes and short cooldown after 429 responses to avoid repeated Supabase password token calls; test via rapid submits and observe wait messaging, then sign in normally to reach `/dashboard`. |
| **2025-12-20** | Admin login now throttles rapid submits and surfaces clear 429/too-many-attempts messaging to prevent duplicate Supabase password token calls; test: `cd pilgrimage/admin && npm run dev`, attempt rapid double-submit to see throttle message, then wait a second and sign in to reach `/dashboard`. |
| **2025-12-20** | Admin login form now guards double-submit (single Supabase token call) and refreshes router after sign-in; test via `cd pilgrimage/admin && npm run dev`, sign in, and confirm redirect to `/dashboard`. |
| **2025-12-20** | Replaced `/sign-url` stub with real Supabase Storage signed upload/download URLs behind Supabase JWT auth; added docs (`docs/api/orchestrator.md`) and `.env.template` for cloud. Testing: `cd pilgrimage/cloud && npm run build`; then POST `/sign-url` with a valid Supabase access token and verify upload via `curl -X PUT "$signedUrl" --upload-file sample.jpg`. |
| **2025‑11‑11** | Initial progress log created — cloud + admin scaffolds verified, Supabase schema live. |
| **2025‑11‑18** | Added Express-based middleware scaffold under `pilgrimage/cloud` with `/healthz` + `/sign-url` placeholder; document updated to reflect new structure. |
| **2025‑02‑14** | Documented Render base URL (`https://pilgrimage-yatra.onrender.com`), refreshed admin/mobile readmes, and noted inline-style fallback for admin UI while build cache issues are investigated. |
| **2025‑12‑11** | Admin app builds successfully on Vercel (Next 15.5.7) after regenerating lockfile, loosening PageProps typings, and pinning runtime to nodejs on Supabase pages. Vercel install command set to force fresh registry fetch. |

# Pilgrimage / Yatra Project — Progress & Next Steps Log

_Last updated: 2025‑12‑11_

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
| Schema Setup | ✅ | `pilgrimage_bootstrap.sql` refreshed with travel_mode enum, full registration columns, helper RPCs, RLS. |
| Buckets | ✅ | `forms` and `photos` created (private) with staff read policy. |
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
| Yatris CRUD | ✅ | `/yatris` list with filters; `/yatris/[id]` detail + inline edit + approve/reject RPC call; `/yatris/new` creates registrations. |
| Users | ✅ | `/users` admin-only profile table. |
| Styling | ⚙️ Mixed | Some views use inline styling to bypass dev CSS issues; align via shared styles next. |

---

### Mobile App (Flutter)
| Task | Status | Notes |
|------|---------|-------|
| Flutter Environment | ✅ | Flutter SDK configured; null-safety enabled. |
| Supabase SDK Integration | ✅ | `supabase_flutter`, `go_router`, `flutter_dotenv` wired with `.env` loader. |
| Auth Screen | ✅ | Email/password login. |
| Registration Form | ✅ | Manual registration inserts into `yatra_registrations`; captures form photo, uploads to `forms` bucket, stores `form_image_url`. |
| Admin Tab | ✅ | Role-gated list/detail for needs_review; approve/reject buttons stubbed. |

---

## 🔜 Immediate Next Steps

### 1. Supabase Ops
- [ ] Create admin/reviewer/volunteer auth users and set roles via `admin_set_user_role`.
- [ ] Seed 3–5 test registrations for UI flows.

### 2. Cloud API Middleware (Render: https://pilgrimage-yatra.onrender.com)
- [x] Scaffold Node.js + TypeScript Express service (`/healthz`, `/registrations`, `/process-form` mock).
- [ ] Replace fake signed URL with Supabase Storage signed URL call + auth checks.
- [ ] Implement real `/process-form` with OCR integration (Doc AI/Tesseract) and RLS-safe writes.
- [ ] Redeploy to Render with secrets.

### 3. Admin UI Next Pass
- [ ] Wire approve/reject to `/process-form`/RPC with optimistic feedback.
- [ ] Add pagination to `/yatris` table and surface form image/photo thumbnails.
- [ ] Unify styling (remove inline fallbacks) once dev server root is stable.
- [ ] Add create-user flow via Cloud API (service key).

### 4. Mobile App Next Pass
- [ ] Hook approve/reject buttons to RPC or Cloud Run.
- [ ] Add list filters and basic offline cache (optional).
- [ ] Add upload flow via signed URL once available (currently direct to bucket).

### 5. Tooling & Docs
- [ ] Add `.env.template` files for admin/cloud/mobile.
- [ ] Add CI smoke tests: `npm run lint` in admin, `npm test` for cloud, `flutter analyze` for mobile.

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
| **2025‑11‑11** | Initial progress log created — cloud + admin scaffolds verified, Supabase schema live. |
| **2025‑11‑18** | Added Express-based middleware scaffold under `pilgrimage/cloud` with `/healthz` + `/sign-url` placeholder; document updated to reflect new structure. |
| **2025‑02‑14** | Documented Render base URL (`https://pilgrimage-yatra.onrender.com`), refreshed admin/mobile readmes, and noted inline-style fallback for admin UI while build cache issues are investigated. |
| **2025‑12‑11** | Admin app builds successfully on Vercel (Next 15.5.7) after regenerating lockfile, loosening PageProps typings, and pinning runtime to nodejs on Supabase pages. Vercel install command set to force fresh registry fetch. |

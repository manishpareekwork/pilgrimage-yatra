# Pilgrimage / Yatra Project — Progress & Next Steps Log

_Last updated: 2025‑11‑18_

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
| Health Check | ⚙️ In progress | `/healthz` implemented in new Express middleware; deploy + monitor pending. |

---

### Supabase Backend
| Task | Status | Notes |
|------|---------|-------|
| Project Creation | ✅ | `pilgrimage-yatra` in Mumbai region. |
| Schema Setup | ✅ | `pilgrimage_bootstrap.sql` applied (tables, enums, RLS, CRUD helpers). |
| Buckets | ✅ | `forms` and `photos` created (private). |
| First Admin User | ⚙️ Pending | Create Auth user → run `select public.admin_set_user_role('<uuid>'::uuid, 'admin');` |
| Review/Volunteer Roles | ⚙️ Pending | To assign once reviewers onboarded. |
| Testing Data | ⚙️ Pending | Insert sample registration for UI testing. |

---

### Admin Web App (Next.js)
| Task | Status | Notes |
|------|---------|-------|
| Next.js Scaffold | ✅ | App boots successfully with Tailwind v4. |
| Tailwind Integration | ✅ | Using `@import "tailwindcss"` in `app/globals.css`. |
| Supabase Auth Integration | ✅ | Login page scaffolded with magic link flow. |
| Role Guard | ✅ | `RoleGuard` component restricts reviewer/admin routes. |
| Turbopack Warning | ⚠️ Minor | Harmless; can be silenced with `turbopack.root = __dirname`. |
| Admin Panel Layout | ⚙️ In progress | `/dashboard` + `/review` base pages ready. Styling pass pending. |

---

### Mobile App (Flutter)
| Task | Status | Notes |
|------|---------|-------|
| Flutter Environment | ✅ | Verified Flutter SDK ≥3.24. |
| Project Creation | ⚙️ Pending | To run: `flutter create mobileapp --org com.pilgrimage --platforms android,ios`. |
| Supabase SDK Integration | ⚙️ Pending | Will add `supabase_flutter` and `go_router` after scaffold. |
| Auth Screen | ⚙️ Pending | Simple login via email OTP or phone. |
| Registration Form | ⚙️ Pending | Manual input + image upload placeholder. |

---

## 🔜 Immediate Next Steps

### 1. Mobile App Scaffold
- [ ] Create Flutter app folder: `flutter create mobileapp --org com.pilgrimage --platforms android,ios`.
- [ ] Run default app (`flutter run`) to confirm environment.
- [ ] Add to repo structure:
  ```
  pilgrimage/
  ├── admin/
  ├── mobileapp/
  └── README.md
  ```

### 2. Cloud API Middleware
- [x] Scaffold Node.js + TypeScript Express service in `pilgrimage/cloud` (`/healthz`, `/sign-url` stub).
- [ ] Replace fake signed URL with Supabase Storage signed URL call + auth checks.
- [ ] Implement `/process-form` skeleton that loads config + hits Document AI.
- [ ] Use secrets `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` to verify DB write access.
- [ ] Redeploy Cloud Run with that image.

### 3. Supabase Users
- [ ] Create first Auth user (admin) and reviewer.
- [ ] Promote via SQL: `select public.admin_set_user_role('<uuid>'::uuid, 'admin');`
- [ ] Seed one fake registration for UI checks.

### 4. Admin UI Completion
- [ ] Verify `/login` → `/dashboard` flow works with real Supabase credentials.
- [ ] Add buttons on `/review/[id]` for Approve / Reject (call Supabase RPCs).
- [ ] Style improvements using Tailwind.

### 5. Documentation & CI
- [ ] Add root `README.md` for monorepo (setup commands, structure).
- [ ] Add `.env.template` for all environments (admin, cloud, mobile).
- [ ] Plan GitHub Actions for build/test of each app.

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
| `mobileapp/` | Flutter client (to be created). |
| `pilgrimage/cloud/` *(future)* | Orchestrator API for Cloud Run. |
| `project_progress_and_next_steps.md` | This document — update as milestones complete. |

---

## 📝 Update Log
| Date | Update |
|------|---------|
| **2025‑11‑11** | Initial progress log created — cloud + admin scaffolds verified, Supabase schema live. |
| **2025‑11‑18** | Added Express-based middleware scaffold under `pilgrimage/cloud` with `/healthz` + `/sign-url` placeholder; document updated to reflect new structure. |

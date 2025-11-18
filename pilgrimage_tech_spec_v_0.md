# Pilgrimage / Yatra — Technical Specification v0.1 (for Code Generation)

_Last updated: 2025-11-12_

This document defines **system architecture, data contracts, env vars, APIs, UI routes, and coding standards** for the Pilgrimage project. It is intended for programmatic code generation (e.g., Codex) and for developers to implement features consistently across **Web Admin (Next.js)**, **Mobile App (Flutter)**, and **Cloud Orchestrator (Cloud Run)**.

---

## 1. Architecture Overview
- **Backend System of Record:** Supabase (Postgres + Auth + Storage + RLS)
- **Orchestrator (server-only logic):** Cloud Run service (Node or Python) — handles OCR calls (Document AI), signed URL issuance, privileged mutations via Supabase **Service Role** key, and Admin management via Supabase **Admin API**.
- **OCR:** Google Cloud Document AI (Enterprise OCR + Layout) in `asia-south1`.
- **Web Admin:** Next.js (App Router) — SSR with `@supabase/auth-helpers-nextjs`.
- **Mobile App:** Flutter — `supabase_flutter`, `go_router` for routing, Admin Lite via role-gated screens.
- **Push (later):** OneSignal.

### Roles
- `yatri`, `volunteer`, `reviewer`, `admin`  
Stored in `auth.users.raw_app_meta_data.role` and mirrored to `public.profiles.role`. Enforced by Postgres **RLS**.

---

## 2. Environments & Variables

### 2.1 Environment Matrix
| Surface | Vars | Notes |
|--------|------|------|
| **Cloud Run (server)** | `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `DOC_AI_LOCATION`, `DOC_AI_OCR_PROCESSOR_ID`, `DOC_AI_LAYOUT_PROCESSOR_ID`, `THRESHOLDS_JSON`, `ZONE_MAP_JSON` | All via **Secret Manager** → **env** in Cloud Run. |
| **Admin (Next.js)** | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Set in `.env.local` and deployment provider (e.g., Vercel). |
| **Mobile (Flutter)** | `.env` file: `SUPABASE_URL`, `SUPABASE_ANON_KEY` | Stored locally in app assets (no service key on client). |

### 2.2 Secrets (GCP Secret Manager)
- `supabase-url`, `supabase-service-key`, `docai-location`, `docai-ocr-processor`, `docai-layout-processor`, `ocr-thresholds` (JSON), `zone-map-v1` (JSON).

---

## 3. Database (Supabase Postgres)

### 3.1 Enums
- `user_role`: `('yatri','volunteer','reviewer','admin')`
- `reg_status`: `('submitted','needs_review','approved','rejected')`
- `travel_mode`: `('train','air')`

### 3.2 Tables
- `public.profiles`  
  - `id uuid PK` (FK `auth.users.id`), `role user_role default 'yatri'`, `name_hi text`, `phone text`, `created_at timestamptz`
- `public.yatra_registrations`  
  - `id uuid PK`, `owner uuid`, `created_by uuid`, `name_hi text not null`, `address_hi text`, `phone text`, `whatsapp text`, `travel_mode travel_mode`, `health_bp bool`, `health_diabetes bool`, `photo_url text`, `form_image_url text`, `status reg_status default 'submitted'`, `ocr_confidence numeric`, `raw_json jsonb`, `created_at timestamptz`
- `public.yatra_reviews`  
  - `id uuid PK`, `registration_id uuid` (FK), `action text in ('approve','reject','edit')`, `diff jsonb`, `actor uuid`, `created_at timestamptz`

### 3.3 RLS Policies (summary)
- **profiles**: user can `SELECT/UPDATE` only own row.
- **yatra_registrations**:
  - Yatri: CRUD own (`owner = auth.uid()`).
  - Volunteer: CRUD created rows (`created_by = auth.uid()`), if role in `('volunteer','reviewer','admin')`.
  - Reviewer/Admin: `SELECT/UPDATE` all.
- **yatra_reviews**:
  - Read if owner of linked registration or staff; insert staff only (`reviewer|admin`).

### 3.4 Helper Functions
- `public.fn_create_registration(...) returns uuid`
- `public.fn_update_registration(p_id uuid, p_patch jsonb)`
- `public.fn_create_review(reg_id uuid, action text, diff jsonb, actor uuid) returns uuid`
- `public.admin_set_user_role(p_user uuid, p_role user_role)` (SECURITY DEFINER)

### 3.5 Storage Buckets
- `forms` (private), `photos` (private). Images accessed via **signed URLs**.

---

## 4. API Middleware / Orchestrator Service (Cloud Run)

#### 4.1 Purpose & Scope
This **API Middleware** is a thin, privileged façade that complements Supabase. It exists **only** for operations that cannot be performed safely from clients or Supabase SQL/RPC alone:
- Using the **Supabase Service Role Key** (never on client)
- Calling **Google Document AI** (OCR)
- Issuing **Supabase Storage signed URLs** for private uploads/downloads
- Admin-only actions via **Supabase Admin API**

All regular CRUD for `yatra_registrations`, etc., should go **directly** from Web/Mobile → Supabase (RLS-protected). Keep this service minimal.

### 4.2 Security & Auth Pattern
- **User calls (mobile/web):** `Authorization: Bearer <Supabase JWT>` — verify, then enforce role checks (e.g., `reviewer|admin`).
- **Server calls (Next.js server actions):** internal secret header or **Service Role** Bearer token (kept server-side only).
- Consider a narrow **CORS** allowlist for web origins.

### 4.3 Endpoints

#### `GET /healthz`
- **Auth:** none
- **200** `{ "ok": true }`

#### `POST /sign-url`
- **Auth:** Supabase JWT required; any authenticated user.
- **Body:** `{ "bucket": "forms"|"photos", "object": "forms/raw/<uuid>.jpg", "expires": 3600 }`
- **200:** `{ "url": "https://...signed" }`

#### `POST /process-form`
- **Auth:** Supabase JWT (role `volunteer|reviewer|admin`) **or** internal service key.
- **Body:**
```json
{ "registrationId": "uuid|null", "storagePath": "forms/raw/<uuid>.jpg", "options": { "reprocess": false } }
```
- **Steps:** Load `ZONE_MAP_JSON` & `THRESHOLDS_JSON` → call Document AI → map outputs → compute confidences → `INSERT/UPDATE` `yatra_registrations` → set `status` accordingly (`needs_review` on low confidence).
- **200:** `{ "id": "<registration_uuid>", "status": "needs_review|submitted", "confidence": 0.0-1.0 }`

#### `POST /admin/create-user`
- **Auth:** Admin only (service key or Admin JWT).
- **Body:** `{ "email":"","password":"","name":"","role":"admin|reviewer|volunteer|yatri" }`
- **Behavior:** Calls Supabase Admin API → runs `admin_set_user_role`.
- **200:** `{ "id":"<uuid>", "email":"...", "role":"..." }`

#### `POST /admin/set-role`
- **Auth:** Admin only (service key or Admin JWT).
- **Body:** `{ "userId":"<uuid>", "role":"admin|reviewer|volunteer|yatri" }`
- **200:** `{ "id":"<uuid>", "role":"..." }`

### 4.4 Error Codes
- `401` Unauthorized (missing/invalid token)
- `403` Forbidden (role not allowed)
- `422` Unprocessable (invalid inputs)
- `429` Too Many Requests
- `500` Internal Error

---

## 5. Web Admin (Next.js, App Router)
 Web Admin (Next.js, App Router)

### 5.1 Routing
- `/login` — email magic link login.
- `/dashboard` — default after login; summary tiles.
- `/yatris` — list with filters/search; server component, SSR.
- `/yatris/[id]` — detail; left: fields; right: image & actions.
- `/users` — admin only; list + “Create User” form.

### 5.2 Auth & Session
- `@supabase/auth-helpers-nextjs` server client for SSR (`cookies()` integration).
- Middleware redirects unauthenticated users to `/login`.
- Role guard: server components read `user.app_metadata.role` and 403 if insufficient.

### 5.3 Server Actions (examples)
- `createUser(formData)` → **POST /admin/create-user** (with service key) → returns `{id,email,role}`.
- `approveRegistration(id)` → Supabase `fn_create_review(...,'approve',...)` → update status.
- `rejectRegistration(id)` → similar with `'reject'`.

### 5.4 UI State
- Table pagination (page,size), sorting by `created_at` desc.
- Filters: status (`submitted|needs_review|approved|rejected`), search by phone or name.

---

## 6. Mobile App (Flutter)

### 6.1 Packages
- `supabase_flutter`, `go_router`, `flutter_dotenv`, `http`, `image_picker` (later), `intl` (optional)

### 6.2 Routes
- `/login` (magic link email, or later phone OTP)
- `/home` (default): buttons to **Create Registration**, **Admin** (if role)
- `/registration` (manual creation)
- `/admin` (visible if role ∈ {`admin`,`reviewer`})
  - `/admin/list` — needs review list
  - `/admin/detail/:id` — detail + approve/reject

### 6.3 Role detection
```dart
final role = Supabase.instance.client.auth.currentUser?.appMetadata['role'];
final isAdmin = role == 'admin' || role == 'reviewer';
```

### 6.4 Data Ops (client)
- Read/write via Supabase client with RLS protection.
- For file uploads, call **`/sign-url`** then PUT the image to Storage.

---

## 7. OCR Mapping & Thresholds

### 7.1 `zone-map-v1.json` (example fields)
```json
{
  "version": 1,
  "page_size": { "width_px": 2480, "height_px": 3508 },
  "fields": {
    "name_hi":   { "x": 220,  "y": 420,  "w": 1600, "h": 120 },
    "address_hi":{ "x": 220,  "y": 560,  "w": 2000, "h": 220, "multiline": true },
    "phone":     { "x": 220,  "y": 820,  "w": 700,  "h": 110, "post": "phone" },
    "whatsapp":  { "x": 1180, "y": 820,  "w": 700,  "h": 110, "post": "phone" },
    "travel_air":{ "type": "checkbox", "x": 220, "y": 980,  "w": 60, "h": 60 },
    "travel_train": { "type": "checkbox", "x": 600, "y": 980,  "w": 60, "h": 60 },
    "health_bp": { "type": "checkbox", "x": 220, "y": 1140, "w": 60, "h": 60 },
    "health_diabetes": { "type": "checkbox", "x": 600, "y": 1140, "w": 60, "h": 60 },
    "photo_box": { "type": "region",   "x": 1780, "y": 260,  "w": 520, "h": 640 }
  }
}
```

### 7.2 `thresholds.json` (example)
```json
{
  "required": ["name_hi", "phone"],
  "fields": {
    "phone": { "min_confidence": 0.90, "format": "E164_IN" },
    "name_hi": { "min_confidence": 0.85, "min_tokens": 2 },
    "checkbox": { "fill_ratio_checked": 0.55 }
  },
  "record_ok_if_all_required_pass": true
}
```

---

## 8. Coding Standards & Conventions

### 8.1 General
- **TypeScript** strict mode in admin; **Dart** null-safety in mobile.
- Use **ESM** in Next.js (no CommonJS `type` in `package.json`).
- Tailwind v4 (zero-config) — `@import "tailwindcss"` in `globals.css`.

### 8.2 Error Handling
- Return structured errors `{ code, message }` from Cloud API.
- Client UIs show toast/snackbar on failures; admins see detailed message.

### 8.3 Telemetry (later)
- Cloud Run: stdout logs with `trace_id` per request; add basic request timing.
- Admin/Mobile: log important actions (approve/reject) to `yatra_reviews`.

---

## 9. Acceptance Criteria (first milestones)

### M0 — Scaffolds
- Admin boots with `/login`, `/dashboard`, `/yatris` (empty state ok).
- Mobile boots with login + Create Registration that inserts a row.
- Cloud Run exposes `/healthz`.

### M1 — Users & Roles
- Seed 3 users; roles visible on JWT; admin can view /users.
- Admin Create User works (calls Admin API + `admin_set_user_role`).

### M2 — Registrations (manual)
- Mobile form creates registration; appears in Admin list; can edit.

### M3 — Orchestrator wiring (no OCR)
- Mobile can upload image via `/sign-url`; Cloud `/process-form` updates row.

### M4 — OCR & Review
- Cloud calls Document AI; parsed fields populate row; low-confidence → `needs_review`.
- Admin (web & mobile) can approve/reject.

---

## 10. Seed & Admin Ops
- Create users via Dashboard or `/admin/create-user` endpoint (server action).
- Promote via SQL: `select public.admin_set_user_role('<uuid>'::uuid, '<role>');`
- Use signed URLs for private images; avoid public buckets.

---

## 11. Repo Structure (suggested)
```
pilgrimage/
  admin/               # Next.js web admin
  mobileapp/           # Flutter app
  cloud/               # Orchestrator code (Node/Python)
  supabase/            # SQL bootstrap files
  infra/               # zone-map-v1.json, thresholds.json, docs
  project_progress_and_next_steps.md
  Pilgrimage Tech Spec v0.1 (for Codex).md
```

---

## 12. Open Items / TODO
- Decide Cloud language (Node vs Python) and generate starter.
- Add signed URL issuance in orchestrator (`/sign-url`).
- Add admin Create User UI (Next.js server action) and Users page.
- Mobile Admin Lite: list + detail + approve/reject.
- Add URL schemes for mobile auth deep links (iOS/Android).
- Add OneSignal integration (later phase).

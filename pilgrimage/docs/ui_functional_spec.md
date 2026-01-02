# UI & Functional Specification — Pilgrimage Yatra (Admin Web + Mobile)

Date: 2026-01-02

Note: This document is the current source of truth; older versions are obsolete.

## A) System Overview (brief)
- Roles: `yatri` (self registrations), `volunteer` (create/edit registrations they created), `reviewer` (read/update all), `admin` (read/update all + manage roles/users).
- Flow: Registration created (`submitted`) → processing/triage → `needs_review` (OCR/manual) → reviewer/admin sets `approved` or `rejected` (optionally with edits) via `yatra_reviews`.
- Storage: Supabase Storage buckets `forms` (form images) and `photos` (portraits); both private. Access via signed URLs (orchestrator will broker upload/download).

## B) Screen Inventory

| App | Screen | Route/Path | Access (roles) | Purpose |
| --- | --- | --- | --- | --- |
| Admin | Login | `/login` | Public | Email/password sign-in. |
| Admin | Dashboard | `/dashboard` | All authenticated | Status counts overview. |
| Admin | Yatris list | `/yatris` | All authenticated | List/filter registrations, go to detail. |
| Admin | Yatri detail | `/yatris/[id]` | All authenticated | View/edit full registration; uploads; approve/reject actions. |
| Admin | New Yatri | `/yatris/new` | All authenticated | Create full registration aligned to PDF. |
| Admin | Users (admin) | `/users` | Admin only | View profiles and create user with role. |
| Mobile | Login | `/login` | Public | Email/password sign-in. |
| Mobile | Home | `/home` | Authenticated | Welcome + quick actions; admin shortcut. |
| Mobile | Registration form | `/registration` | Authenticated | Submit manual registration (all PDF fields) + upload form photo. |
| Mobile | Admin list | `/admin/list` | Admin/Reviewer | Filtered list (status) of registrations. |
| Mobile | Admin detail | `/admin/detail/:id` | Admin/Reviewer | Read-only full detail (no actions). |

## C) Per-Screen Detailed Specs

### Admin — Login (`/login`)
- UI Layout: Centered card, email/password inputs, error text, submit button; seeded credentials hint.
- Functional: Calls `supabase.auth.signInWithPassword`; on success `router.replace("/dashboard")`; throttles rapid submits and handles 429 message.
- Data: Supabase Auth only.
- Validation: Email required, password required; disables during submit.
- Errors: Shows Supabase auth error or throttle message.
- Acceptance: Successful login redirects to dashboard; invalid creds show error; multiple rapid submits are throttled.

### Admin — Dashboard (`/dashboard`)
- Status: Implemented (verified); layout polish for inner card centering is next.
- UI Layout: Hero/banner card with total count; four status tiles (submitted, needs_review, approved, rejected).
- Functional: On load, fetches counts from `yatra_registrations` via server component queries (count only). Shows error banner on RLS/Supabase failure; empty-state CTA to create first registration when zero rows.
- Data: `yatra_registrations` counts.
- Validation: None (read-only).
- Errors: Friendly banner with Supabase error message on failure.
- Acceptance: Authenticated users see counts; unauthenticated redirected to login; empty-state CTA appears when no data.
- Aesthetic: Light cards, bold header, consistent spacing; nav present at top.
 - Layout smoke test: Uses shared AppShell (centered container, visible cards) verified 2025-12-23.

### Admin — Yatris List (`/yatris`)
- Status: Implemented (verified).
- UI Layout: Page header with Views/Columns controls and “+ New Registration”; filter toolbar with search, status multi-select popover, travel mode, date range, missing uploads, clear filters, and export menu; applied filter chips; table with sticky header and selectable rows; row actions exposed via an ellipsis menu; mobile card list view mirrors actions.
- Functional: Server-side search, filter, sort, and pagination over `yatra_registrations`; localStorage persistence for column visibility/order and saved views; CSV export for selected rows or filtered result set (capped). Query params are awaited before use to satisfy Next.js async `searchParams`. Empty-state CTA when no rows; error banner on failure.
- Data: `yatra_registrations` (uploads status derived from `photo_url`/`form_image_url`).
- Validation: Status/travel/missing values constrained to known options; date range uses `created_at`.
- Errors: Error banner with Supabase message; export cap message when applicable.
- Acceptance: Filters/sort/pagination work server-side; columns and views persist; export succeeds; rows link to detail; unauthenticated redirected to login.
- Aesthetic: Consistent card container with padded controls, responsive table/card layout, and compact actions menu.
 - Layout smoke test: Uses shared AppShell (centered container) verified 2025-12-23.

### Admin — Yatri Detail (`/yatris/[id]`)
- UI Layout: FormKit header + section cards (Applicant, Travel, Medical, Emergency, Declaration, Uploads) on a dark theme; status pill + meta (id, created_at) in header; Quick Edit uses FormKit inputs with medical rows (checkbox + meds), datetime picker, and Save; review actions in header; upload cards show previews/paths.
- Functional: Load registration by id. Upload buttons call orchestrator `/sign-url` (upload, buckets photos/forms) with Supabase JWT, PUT file to signed URL, then update `photo_url`/`form_image_url` via `fn_update_registration`; fixed paths `photos/registrations/<id>/photo.jpg` and `forms/registrations/<id>/form.jpg` overwrite on re-upload and log review diff. Quick Edit uses client-side form + server action `updateRegistrationAction` (patched into `fn_update_registration`) respecting meds-clearing rules and declaration required. Approve/Reject server actions call `fn_create_review` and status update.
- Data: `yatra_registrations`; `yatra_reviews`; storage objects for photo/form via orchestrator signed URLs.
- Validation: Upload buttons disabled during upload; name/address/phone/declaration required on save; status limited to enum; meds fields disabled/cleared when checkbox false; single photo/form path per registration.
- Errors: Error banner if fetch fails; inline upload errors; server action errors surface inline (no global fallback).
- Acceptance: Auth redirect works; uploads overwrite fixed paths and show preview; edits persist all fields; approve/reject revalidates detail.

### Admin — New Yatri (`/yatris/new`)
- UI Layout: FormKit page header + section cards. Applicant/Travel/Medical/Emergency/Additional/Declaration sections; medical rows show checkbox + meds input with subtle dividers; DOB uses date input; declaration_signed_at uses datetime-local with a quick "Now" button. Minimal mode shows core fields and collapses optional sections into a "More details (optional)" accordion. Uploads handled on detail page; sticky Save/Cancel actions; top error banner.
- Functional: Server action uses `fn_create_registration` (minimal) then `fn_update_registration` patch with all fields + status `submitted`; declaration timestamp auto-set when provided/accepted; meds cleared when toggles off; redirects to detail on success.
- Data: `yatra_registrations`; storage paths set after creation on detail.
- Validation: Required name_hi, address_hi, phone, declaration_accepted=true; age/emergency_age 0–120; meds blocked when checkbox false.
- Errors: Visible inline error message on validation/Supabase failure; partial creation shows ID + error without redirect.
- Acceptance: Creation succeeds and redirects; required fields enforced; meds enable/disable behaves per checkbox; unauthorized redirects to login.

### Admin — Users (`/users`) (Admin only)
- UI Layout: Header card, “Admin role required” pill, `CreateUserForm` (fields: email, password, name_hi, phone, role select), table of profiles (id, role, name, phone, created) with empty state.
- Functional: Checks current user role from `profiles` or app_metadata; non-admin redirects dashboard. Lists `profiles`. Create form calls Supabase Admin API via server action `CreateUserForm` (calls auth admin create + `admin_set_user_role`) — current code uses Supabase server client (service role needed via env).
- Data: `profiles`; Supabase Auth admin; RPC `admin_set_user_role`.
- Validation: Email/password required; role required; optional name/phone; disabled while submitting.
- Errors: Renders Supabase error text if list fails; form shows inline error.
- Acceptance: Admin-only access; creating user inserts profile and sets role; table updates on reload.

### Mobile — Login (`/login`)
- UI Layout: Fullscreen gradient/bg image; email/password text fields; error text; Sign in button; seeded creds hint.
- Functional: `supabase.auth.signInWithPassword`; on success navigate to `/home`.
- Data: Supabase Auth only.
- Validation: Fields required; disable while loading.
- Errors: Displays `AuthException` message or generic failure.
- Acceptance: Valid creds land on home; invalid shows error; unauthenticated routes redirect to login via router guard.

### Mobile — Home (`/home`)
- UI Layout: Banner background; AppBar with logout; “Welcome (role)” text; metric cards placeholders; action buttons: Create Registration, Admin (if role admin/reviewer).
- Functional: No data fetch yet for metrics (placeholder “—”); logout clears session and redirects to login; buttons navigate to `/registration` or `/admin/list`.
- Data: None yet (future metrics from `yatra_registrations`).
- Validation: None.
- Errors: None beyond auth guard.
- Acceptance: Authenticated view only; buttons navigate correctly; logout works.

### Mobile — Registration Form (`/registration`)
- UI Layout: Full PDF form including receipt_no, name/father/address (required), aadhaar, phone/whatsapp, DOB/age/height/weight, travel_mode dropdown, train_class, reservation_by dropdown, medical switches with meds textfields disabled/cleared when off, other condition+meds toggle, emergency contact (name/father/age/address/phone), additional questions, required declaration checkbox, optional form photo preview, “Extract & Fill (mock)” button, bottom submit.
- Functional: Two-step submit. Step 1 creates minimal row via `fn_create_registration` (owner/created_by, required fields, declaration timestamp) with status `submitted`. Step 2 (optional) uploads form image to `forms/registrations/<id>/form.jpg` (upsert). Step 3 patches all fields + `form_image_url` via `fn_update_registration` (includes meds clearing, status submitted). Mock extract fills sample data for new fields.
- Data: `yatra_registrations`; Storage `forms`; mock OCR filler (no orchestrator).
- Validation: Required: name, address, phone, declaration accepted. Age/emergency age bounded; meds disabled when switch off; travel defaults train/self but editable.
- Errors: Upload failure noted in message (registration still saved); camera failure uses snackbar.
- Acceptance: Valid submission inserts row; optional image stored at fixed path; fields persist and match Admin detail readout.

### Mobile — Admin List (`/admin/list`)
- UI Layout: AppBar with refresh; status dropdown filter; list of registrations (title name_hi, subtitle phone/status); empty-state text.
- Functional: On load and filter change, fetches `yatra_registrations` optionally filtered by status; only admin/reviewer (role check from appMetadata); refresh button reloads.
- Data: `yatra_registrations`.
- Validation: Status filter limited to enum options or all.
- Errors: Shows error text in list if fetch fails (currently generic).
- Acceptance: Non-admin sees “Admin/Reviewer only”; admin/reviewer sees list and can open detail.

### Mobile — Admin Detail (`/admin/detail/:id`)
- UI Layout: Read-only detail view listing applicant info, travel/reservation_by, all medical flags + meds, emergency companion, additional questions, declaration state, and storage paths for photo/form.
- Functional: Fetch single `yatra_registrations` by id; no approve/reject actions yet (pure read-only).
- Data: `yatra_registrations`.
- Validation: None (read-only).
- Errors: Shows “Unable to load registration” on error/empty.
- Acceptance: Data displays for valid id; no review actions yet (todo to wire `fn_create_review`).

## D) UI Aesthetics & Consistency
- Admin: Light theme cards, bold accent (orange/indigo), rounded corners, shadows; reduce inline styles over time in favor of Tailwind; pill/status badges uppercase; primary buttons consistent (`btn-primary`).
- Mobile: Material 3 theme with `colorSchemeSeed`; sectioned forms with rounded cards; consistent FilledButton/OutlinedButton usage; clear inline error/snackbar messages; maintain gradient/banner backgrounds with readable contrast.

## E) Known Gaps / TODOs
- OCR remains mock; Document AI integration pending.
- Signed download URLs not yet wired; uploads use orchestrator sign-URL but image display still uses raw paths.
- Mobile admin review actions not implemented (read-only detail; needs `fn_create_review` + status update).
- Admin build skips lint during `next build` (lint to run separately in CI).
- Metrics on mobile home are placeholders.

## Change Log
- 2026-01-02: Yatris list upgraded to full admin grid (filters, saved views, column controls, CSV export, responsive table/card view, row action menu).
- 2025-12-29: Registration UI aligned with PDF fields across admin/mobile (medical toggles, reservation_by, emergency companion, declaration required); mobile admin detail now read-only full view.
- 2025-12-21: Initial UI + functional spec documented for Admin Web and Mobile apps.

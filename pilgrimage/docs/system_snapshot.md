# System Snapshot — 2025-12-29

## Database: yatra_registrations (public)
| Column | Type | Required | Notes |
| --- | --- | --- | --- |
| id | uuid (pk) | yes | gen_random_uuid() |
| owner | uuid | no | auth.users reference |
| created_by | uuid | no | auth.users reference |
| receipt_no | text | no | PDF receipt number |
| name_hi | text | yes | applicant name (Hindi allowed) |
| guardian_relation | text | no | father/husband/guardian relation label |
| father_name_hi | text | no | applicant guardian |
| address_hi | text | yes | applicant address |
| address_state | text | no | state |
| address_district | text | no | district |
| address_city | text | no | city/village (combined in admin UI) |
| address_pin | text | no | PIN code |
| aadhaar_no | text | no | Aadhaar/ID number |
| phone | text | yes | primary phone |
| whatsapp | text | no | WhatsApp |
| dob | date | no | date of birth |
| age_years | smallint | no | CHECK 0–120 |
| height_cm | numeric(5,2) | no | applicant height |
| weight_kg | numeric(5,2) | no | applicant weight |
| travel_mode | enum travel_mode | no | train / air |
| train_class | text | no | coach/class |
| reservation_by | enum reservation_by | no | self / committee |
| health_none | boolean | no (default false) | no known conditions flag |
| health_heart | boolean | no (default false) | heart condition flag |
| health_heart_meds | text | no | cleared if health_heart=false |
| health_bp | boolean | no (default false) | blood pressure flag |
| health_bp_meds | text | no | cleared if health_bp=false |
| health_diabetes | boolean | no (default false) | diabetes flag |
| health_diabetes_meds | text | no | cleared if health_diabetes=false |
| health_asthma | boolean | no (default false) | asthma flag |
| health_asthma_meds | text | no | cleared if health_asthma=false |
| health_common_meds | text | no | shared notes for heart/bp/diabetes/asthma |
| health_other | text | no | other condition text |
| health_other_meds | text | no | cleared if health_other is null/empty |
| emergency_contact_name | text | no | companion/emergency name |
| emergency_contact_father_name | text | no | companion guardian |
| emergency_contact_age_years | smallint | no | CHECK 0–120 |
| emergency_contact_address | text | no | companion address |
| emergency_contact_phone | text | no | companion phone |
| photo_url | text | no | storage path photos/registrations/<id>/photo.jpg |
| form_image_url | text | no | storage path forms/registrations/<id>/form.jpg |
| attended_badarinath_2024 | boolean | no (default false) | additional question |
| sadhu_sant_category | boolean | no (default false) | additional question |
| declaration_accepted | boolean | yes (default false) | must be true to submit |
| declaration_signed_at | timestamptz | no | auto-set when accepted |
| status | enum reg_status | yes (default submitted) | workflow status |
| ocr_confidence | numeric | no | OCR confidence |
| raw_json | jsonb | no | OCR/raw payload |
| created_at | timestamptz | yes | default now() |

Enums: `travel_mode` (train, air), `reservation_by` (self, committee), `reg_status` (submitted, needs_review, approved, rejected). Meds columns are nulled automatically in fn_update_registration when the flag is false; health_common_meds is set when provided and cleared when all medical flags are false. Health choice requires `health_none=true` or at least one medical flag/other condition.

## Field Mapping (PDF → DB → Admin UI → Mobile UI → Validation)
| PDF Field | DB Column | Admin UI | Mobile UI | Validation |
| --- | --- | --- | --- | --- |
| Receipt No. | receipt_no | Applicant section | Applicant section | Optional |
| Name (Hindi) | name_hi | Required | Required | Required |
| Father/Husband/Guardian relation | guardian_relation | Dropdown (Father/Husband/Guardian) | TODO | Optional |
| Father/Guardian | father_name_hi | Applicant | Applicant | Optional |
| Address | address_hi | Required | Required | Required |
| State | address_state | Applicant | Applicant | Optional |
| District | address_district | Applicant | Applicant | Optional |
| City / Village | address_city | Applicant | Applicant | Optional |
| PIN code | address_pin | Applicant | Applicant | Optional |
| Aadhaar No. | aadhaar_no | Applicant | Applicant | Optional |
| Phone | phone | Required | Required | Required |
| WhatsApp | whatsapp | Applicant | Applicant | Optional |
| DOB | dob | Applicant | Applicant (text input) | Optional, date format |
| Age (years) | age_years | Applicant | Applicant | 0–120 |
| Height (cm) | height_cm | Applicant | Applicant | Optional numeric |
| Weight (kg) | weight_kg | Applicant | Applicant | Optional numeric |
| Photo | photo_url | Upload checklist + path | Upload checklist (read-only) | Optional, fixed path |
| Travel Mode | travel_mode | Travel select | Travel select | Optional enum |
| Train Class | train_class | Travel text | Travel text | Optional |
| Reservation By | reservation_by | Travel select | Travel select | Optional enum |
| No known conditions | health_none | Checkbox | Switch | Required: either this or another medical condition |
| Heart condition + meds | health_heart / health_heart_meds | Checkbox + meds (disabled when unchecked) | Switch + meds (disabled when off) | Meds cleared when unchecked |
| Blood Pressure + meds | health_bp / health_bp_meds | Checkbox + meds | Switch + meds | Meds cleared when unchecked |
| Diabetes + meds | health_diabetes / health_diabetes_meds | Checkbox + meds | Switch + meds | Meds cleared when unchecked |
| Asthma + meds | health_asthma / health_asthma_meds | Checkbox + meds | Switch + meds | Meds cleared when unchecked |
| Medicines / notes (common) | health_common_meds | Shared textarea | Shared textarea | Cleared when no medical flags |
| Other condition + meds | health_other / health_other_meds | Text + meds (tied to toggle) | Text + meds (toggle) | Meds cleared when empty/toggle off |
| Emergency Contact Name | emergency_contact_name | Emergency section | Emergency section | Optional |
| Emergency Father Name | emergency_contact_father_name | Emergency section | Emergency section | Optional |
| Emergency Age | emergency_contact_age_years | Emergency section | Emergency section | 0–120 |
| Emergency Address | emergency_contact_address | Emergency section | Emergency section | Optional |
| Emergency Phone | emergency_contact_phone | Emergency section | Emergency section | Optional |
| Attended Badarinath 2024 | attended_badarinath_2024 | Additional question | Additional question | Optional bool |
| Sadhu/Sant category | sadhu_sant_category | Additional question | Additional question | Optional bool |
| Declaration accepted | declaration_accepted | Required checkbox | Required checkbox | Must be true to submit |
| Declaration signed at | declaration_signed_at | Datetime input | Auto-set on submit | Auto-set if accepted |
| Form image | form_image_url | Upload checklist + preview | Upload checklist (read-only) | One per registration |

## Admin Routes & RPCs
- `/login` — Auth with Supabase password sign-in.
- `/dashboard` — Counts from `yatra_registrations` (no RPCs).
- `/yatris` — List/filter registrations (status + search).
- `/yatris/new` — Full PDF-aligned form; uses `fn_create_registration` (minimal + health flags) then `fn_update_registration` with all fields; health selection required; declaration required.
- `/yatris/[id]` — Editable view for all fields; quick edit uses `fn_update_registration`; uploads use `/sign-url` (photos/forms) then `fn_update_registration`; review actions call `fn_create_review`.
- `/users` — Admin-only (unchanged).

## Mobile Routes & Supabase Calls
- `/login` — Supabase password sign-in.
- `/home` — Nav hub; role-based buttons.
- `/registration` — Full PDF form; validates name/address/phone/declaration; calls `fn_create_registration` (minimal + health flags), optional upload to `forms/registrations/<id>/form.jpg`, then `fn_update_registration` with all fields + `form_image_url`.
- `/admin/list` — Admin/reviewer list filtered by status (select all columns).
- `/admin/detail/:id` — Read-only detail for all fields including medical, emergency, reservation, declaration, and storage paths.

## Orchestrator Endpoints
- `POST /sign-url` — `{bucket, object, action(upload|download), expiresIn}` → `{signedUrl, bucket, object, expiresAt}` (requires Supabase JWT).
- `POST /registrations` — Requires `owner`, `created_by`, `name_hi`, `address_hi`, `phone`, `declaration_accepted=true`; creates via `fn_create_registration` (includes health flags/health_none), patches via `fn_update_registration` (accepts all PDF fields, photo/form paths, status).
- `POST /process-form` (mock OCR) — Input: `{registrationId?, owner?, created_by?, storagePath}`; creates minimal registration if `registrationId` missing (includes health flags); patches via `fn_update_registration` with structured mock data (medical flags/meds, emergency, reservation, additional questions), sets `form_image_url=storagePath`, `status=needs_review`, and `raw_json` with medical breakdown.

## Known Gaps / TODOs
- OCR remains mock; real Document AI integration pending.
- Admin build skips lint during `next build` (eslint handled separately).
- Signed download URLs still require orchestrator; no direct client storage access.
- No DB-level NOT NULL on address/phone to avoid breaking legacy rows; UI enforces required fields.

## Manual Test Checklist
1. Run `supabase/pilgrimage.sql` in Supabase SQL editor; it applies schema, migrations, and address lookup seeds in one pass.
2. Admin `/yatris/new`: enter all PDF fields, select a medical choice (or No known conditions), ensure declaration required, submit -> redirect to detail; status=`submitted`.
3. Admin `/yatris/[id]`: toggle each medical checkbox off/on and confirm meds inputs disable/clear; save; re-open to verify persisted. Update declaration timestamp and status.
4. Admin uploads: upload photo and form image; confirm paths `photos/registrations/<id>/photo.jpg` and `forms/registrations/<id>/form.jpg` and checklist ticks.
5. Mobile `/registration`: required fields + declaration, optional image upload; verify form_image_url stored and status submitted.
6. Mobile admin detail: open record and confirm all fields (medical, emergency, reservation, declaration, paths) render read-only.
7. Orchestrator `/process-form`: POST with existing registrationId + storagePath; verify status needs_review, raw_json populated with medical structure.

## Change Log
- 2025-12-29 — Registration schema/UI/mobile aligned with PDF; new Supabase migration + reservation_by enum; orchestrator mock now patches full dataset; system snapshot documented.
- 2025-12-30 — Added health_common_meds for shared medical notes; UI uses combined medical notes field for heart/bp/diabetes/asthma.
- 2025-12-31 — Added address components (state/district/city/village/tehsil/PIN) across admin forms and schema.
- 2025-12-31 — Added address lookup tables + RPCs for state/district lists; PIN lookup optional, seed via CSV when needed.

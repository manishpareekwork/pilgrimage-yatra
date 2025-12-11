# Pilgrimage Mobile App (Flutter)

Flutter (Material 3) client for Pilgrimage Yatra 2025 with Supabase auth + Yatri registration.

## Env
Create `.env` in `assets/` (copied at build) with:
```
SUPABASE_URL=<supabase url>
SUPABASE_ANON_KEY=<anon key>
ORCHESTRATOR_URL=https://pilgrimage-yatra.onrender.com
```

## Run
```bash
flutter pub get
flutter run
```

## Features
- Email/password login via Supabase.
- Registration form inserts into `yatra_registrations` (captures and uploads form photo → `forms` bucket).
- Admin tab (role-gated) shows needs_review list + detail (approve/reject buttons stubbed).

## Notes
- Image assets live in `assets/images/` and are declared in `pubspec.yaml`.
- When wiring to orchestrator, use `ORCHESTRATOR_URL` for signed URLs / OCR once live.

# Pilgrimage Admin (Next.js)

Next.js 16 App Router admin console for Yatri registrations with Supabase Auth + RLS-aware CRUD.

## Env
Create `.env.local` with:
```
NEXT_PUBLIC_SUPABASE_URL=<supabase url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
NEXT_PUBLIC_ORCHESTRATOR_URL=https://pilgrimage-yatra.onrender.com
```

## Scripts
- `npm run dev` — Next dev (Turbopack) with `TURBOPACK_ROOT` pinned to this folder.
- `npm run dev:webpack` — fallback to webpack (`NEXT_FORCE_WEBPACK=1`) if styles stop updating.
- `npm run build && npm start` — production.

Tip: if styles feel stale, delete `.next/` then re-run `npm run dev:webpack`.

## Routes
- `/login` email/password auth.
- `/dashboard` status tiles.
- `/yatris`, `/yatris/[id]`, `/yatris/new` Yatri CRUD.
- `/users` admin-only profile list.

## Styling
Inline styles are used on key pages to avoid dev-server CSS cache issues. Gradually migrate back to Tailwind once dev root stabilizes.

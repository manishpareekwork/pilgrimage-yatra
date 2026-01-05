# Pilgrimage – Lessons Learned & Deploy Notes

Short reminders to keep admin/cloud/mobile deployments smooth.

## Vercel (Admin)
- **Install command:** use `npm cache clean --force && npm install --registry=https://registry.npmjs.org --prefer-online --cache .npm` to avoid stale tarball/integrity issues.
- **Do not hand-edit lockfiles.** When bumping Next/React, run a clean `rm -rf node_modules package-lock.json && npm install` locally so integrity hashes stay valid.
- **Runtime:** Supabase helpers rely on Node APIs. Export `runtime = "nodejs"` (and `dynamic = "force-dynamic"` / `revalidate = 0`) on pages using server Supabase to avoid Edge runtime warnings.
- **Route handlers:** `createRouteHandlerClient` must receive a sync cookie adapter (`cookies: () => cookieStore`), not an async function, or `nextCookies.get is not a function` will surface at runtime.
- **Page props typing:** Next 15’s `PageProps` can surface Promise-like `params/searchParams`; if types fight the build, relax to `any` or plain `{ id: string }` and avoid Promise unions.
- **Build command:** `npm run build` (Next 15.5.7). No custom output dir; `.next` is default.
- **Env vars:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_ORCHESTRATOR_URL` if used. Keep service keys off the client.

## npm / Registry
- If EINTEGRITY appears, clear cache and reinstall; prefer `--prefer-online` to bypass cached tarballs.
- Set `NPM_CONFIG_CACHE=.npm` and `NPM_CONFIG_REGISTRY=https://registry.npmjs.org` on Vercel to enforce a clean cache scope per build.

## Supabase + Runtimes
- Client-side Supabase is fine in browser/mobile; server helpers must run in Node (not Edge) because `process` APIs are used.
- For storage uploads, prefer signed-URL flow via orchestrator; current direct bucket writes are temporary.

## Upgrades
- Keep Next/React/Types aligned: Next 15.5.x + React 19.2.x + `@types/react`/`@types/react-dom` 19.2.x.
- After version bumps, run `npm run build` locally with `NODE_ENV=production` to catch PageProps/runtime quirks before CI.

## Misc
- Inline styles were added to bypass dev CSS cache oddities; plan to migrate back to shared styles once stable.
- Watch for `@supabase/auth-helpers-*` deprecation; migration path is `@supabase/ssr` later. 

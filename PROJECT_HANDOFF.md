# Pilgrimage Yatra — project handoff summary

Use this after **relocating the repo** so you can reinstall, run checks, and know what changed without digging through history.

---

## 1. Repository snapshot (committed work)

**Branch:** `main`  
**Example commit message (from prior session):**  
`feat(admin): Playwright login smoke, yatri quick-edit/actions, UI spacing`  
(Commit hash will differ if you amend or re-clone; use `git log -1` locally.)

**Files that were part of that focused commit** (only these were staged; nothing else):

| Path | Role |
|------|------|
| `.gitignore` | Ignore rules updated for local/tooling artifacts |
| `pilgrimage/admin/package.json` | Playwright (or related) scripts/deps for admin app |
| `pilgrimage/admin/playwright.config.ts` | Playwright configuration (base URL, projects, etc.) |
| `pilgrimage/admin/e2e/login-smoke.spec.ts` | Smoke E2E: login flow |
| `pilgrimage/admin/src/app/globals.css` | Shared admin styles (see §3 UI) |
| `pilgrimage/admin/src/app/(protected)/yatris/[id]/actions.ts` | Server actions for yatri detail / quick edit |
| `pilgrimage/admin/src/app/(protected)/yatris/[id]/QuickEditForm.tsx` | Quick-edit UI + error handling |
| `pilgrimage/admin/src/app/(protected)/yatris/new/actions.ts` | New-registration server actions / validation |
| `supabase/APPLY_SCHEMA.md` | Schema apply instructions / notes |

If your new clone is missing any of these paths, compare with `git show <commit> --stat` or `git diff origin/main` after pull.

---

## 2. What each area does (functional summary)

### 2.1 Playwright (admin)

- **Config:** `pilgrimage/admin/playwright.config.ts` — typically sets `baseURL` (e.g. local dev server), browser projects, timeouts, and where tests live (`e2e/`).
- **Smoke test:** `pilgrimage/admin/e2e/login-smoke.spec.ts` — navigates to the app and exercises **login** enough to catch broken auth UI or redirects.
- **package.json:** Expect `devDependencies` for `@playwright/test` and npm scripts such as `test:e2e` / `playwright test` (exact names: read `scripts` in your tree).

**After moving the project:**

```bash
cd pilgrimage/admin
npm install
npx playwright install   # browsers, first time only
# Start the app in another terminal if tests hit a live URL, then:
npm run test:e2e         # or whatever script name exists in package.json
```

Set env vars or `baseURL` in `playwright.config.ts` / `.env` so tests point at the correct host (local vs staging).

### 2.2 Yatri quick edit (`[id]`)

- **`actions.ts`:** Server actions for updating a yatri from the detail page; structured **`fieldErrors`** (or similar) returned to the client so the form can show per-field messages instead of a single generic error.
- **`QuickEditForm.tsx`:** Consumes those errors, maps them to inputs, and keeps UX aligned with the server contract.

When porting or debugging, grep for `fieldErrors`, `updateRegistration`, or the action names exported from `actions.ts`.

### 2.3 New registration (`yatris/new`)

- **`actions.ts`:** Health / validation handling (including edge cases such as **`health_none`** or equivalent mapping) so optional health fields don’t break submission or validation.

### 2.4 Supabase

- **`supabase/APPLY_SCHEMA.md`:** Step-by-step or reference for applying migrations/schema in the right order. Re-read after clone so your new machine’s Supabase CLI/project link matches this repo.

---

## 3. UI / CSS (`globals.css`) — notable patterns

These live under the admin app’s global stylesheet (BEM-style class names in places):

| Topic | Intent |
|-------|--------|
| **`.ops-tile__icon`** | Icon “chip” in operation tiles: **rounded only on the outer (inline-start) corners**; **square on the inner edge** toward text — uses logical radii (`border-start-start-radius`, `border-end-start-radius`, zero on `*-end-*`) for LTR/RTL. |
| **`.ops-hero` / `.ops-hero__content`** | Operations Console hero: more **vertical/horizontal padding** (`clamp` on horizontal sides), slightly taller **min-height**, so the hero isn’t cramped at the edges. |
| **`.yatris-list .yatris-hero`** | List pages that force hero padding with `!important`: replaced tight **20px** with **responsive `clamp(...)`** padding so heroes match the looser ops hero feel. |
| **`.app-shell__main`** | Slightly more **horizontal padding** on small viewports so page content (including heroes) isn’t flush against the viewport. |

If you merge CSS from another branch, preserve these selectors or re-apply the same rules to avoid regressions.

---

## 4. Relocation checklist (new folder / new machine)

1. **Clone or copy** the repo to the new path (prefer `git clone` to keep remotes and history).
2. **Node:** Use the Node version your team standardizes on (see `.nvmrc` / `engines` if present).
3. **Admin app**
   - `cd pilgrimage/admin && npm install`
   - Copy **`.env.local`** / **`.env`** from the old machine (never commit secrets). Compare with **`.env.template`** if the repo has one.
4. **Playwright:** `npx playwright install` under `pilgrimage/admin`.
5. **Supabase:** Link project, run migrations or follow `supabase/APPLY_SCHEMA.md`.
6. **Sanity commands** (adjust if your `package.json` differs):
   - `npm run lint`
   - `npm run build`
   - `npm run test:e2e` (with dev server running if required)

---

## 5. Cursor / IDE notes

- **Workspace root** should be the **monorepo root** (parent of `pilgrimage/`, `supabase/`, etc.) so imports and relative paths resolve.
- If you use **path aliases** (`@/...`), they are defined in `pilgrimage/admin`’s `tsconfig.json` / `next.config` — open the admin folder or root per your team convention.

---

## 6. Quick verification after setup

- [ ] `pilgrimage/admin` installs and `npm run build` succeeds  
- [ ] Dev server loads login page  
- [ ] Playwright smoke passes against your configured `baseURL`  
- [ ] Yatri detail quick edit shows field-level errors when server returns them  
- [ ] New registration accepts valid payloads and handles optional health fields  
- [ ] Operations (`/masters`) hero and tiles look correct (icon corners, padding)

---

## 7. Getting help from git only

```bash
git log --oneline -5
git show HEAD --stat
```

If this file was added **after** the commit described in §1, commit it separately with a message like `docs: add project handoff for relocated workspace`.

---

*Generated as a relocation / restart handoff. Update commit hashes, script names, and env var names to match your current tree after you open the project in its new location.*

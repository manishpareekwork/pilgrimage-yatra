# UX, UI & Accessibility — Tracking

_Last updated: 2026-04-19_

This document complements `pilgrimage/project_progress_and_next_steps.md` and the broader UI specs in `pilgrimage/docs/`. It tracks **user-facing quality** (UX, visual design, accessibility) and supports the **screen-by-screen review** you planned.

## How to use

1. **During implementation** — Check items off and add a one-line note (PR link or date).
2. **Screen-by-screen review** — Use the [Admin route checklist](#admin-route-checklist) and record gaps per screen.
3. **Definition of done** for UI changes — See [Quality bar](#quality-bar).

## Quality bar

| Area | Expectation |
|------|-------------|
| **Accessibility** | Keyboard operable flows; visible `:focus-visible`; form labels; errors in `aria-live` regions; dialogs use `role="dialog"` + title; images have useful `alt`. |
| **UX** | Loading states for async actions; clear errors; touch targets roughly 44×44px where possible; no blocking motion for users who prefer reduced motion. |
| **UI** | Align with `pilgrimage/admin/STYLEGUIDE.md` and shared tokens in `globals.css` (cards, pills, buttons). |

## Global platform work (cross-cutting)

| Item | Status | Notes |
|------|--------|--------|
| Skip link to main content | Done | `layout.tsx` + `#main-content` |
| Focus-visible ring for interactive controls | Done | `globals.css` |
| App shell: landmark + nav label + current page | Done | `AppShell` + `AppShellNav` |
| Theme toggle keyboard / menu roles | Done | Existing `ThemeToggle` |
| Login: dev seed hint gated | Done | Dev server only, or `NEXT_PUBLIC_SHOW_LOGIN_SEED_HINT=true` |
| `.env.template` for admin | Done | `pilgrimage/admin/.env.template` |
| Modal: dialog semantics | Done | `Modal.tsx` |
| Global loading overlay: live region | Done | `GlobalLoading.tsx` |

## Admin route checklist

Use this for the **screen-by-screen** pass. Mark **Pass / Partial / Gap** and short notes.

| Route | Pass | Notes |
|-------|------|-------|
| `/login` | Partial | Skip link, landmarks, errors (`role="alert"`), show/hide password, seed hint gated to dev or `NEXT_PUBLIC_SHOW_LOGIN_SEED_HINT`. |
| `/dashboard` | | |
| `/yatris` | | |
| `/yatris/new` | | |
| `/yatris/[id]` | | |
| `/masters` | | |
| `/masters/hotels` | | |
| `/masters/stations` | | |
| `/masters/trains` | | |
| `/masters/train-stops` | | |
| `/masters/trips` | | |
| `/masters/buckets` | | |
| `/reports` | | |
| `/volunteers` | | |
| `/booking-tasks` | | |
| `/categories` | | |
| `/groups/coaches` | | |
| `/groups/hotels` | | |
| `/groups/train` | | |
| `/hotels` | | |
| `/trips` | | |
| `/print/id-cards` | | |
| `/users` | | |

## Mobile app (Flutter) — backlog

Track separately when you start the mobile pass: semantic labels, contrast, form error text, large tap targets, and screen reader order on registration and admin list/detail.

## References

- Style: `pilgrimage/admin/STYLEGUIDE.md`
- UI specs: `pilgrimage/docs/ui_functional_spec.md`, `pilgrimage/docs/ui_ux_quick_reference.md`
- Product progress: `pilgrimage/project_progress_and_next_steps.md`

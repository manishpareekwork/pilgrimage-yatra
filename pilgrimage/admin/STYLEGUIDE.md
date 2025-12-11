# Pilgrimage Admin UI Style Guide

Palette
- Ink (text): `#0f172a`
- Muted: `#475569`
- Canvas: `#f8fafc`
- Card: `#ffffff`
- Accent (saffron): `#f97316`
- Accent-2 (sky): `#0ea5e9`
- Accent-dark (teal): `#0f766e`
- Border: `#e2e8f0`

Typography
- Font: Geist Sans (fallback: system-ui).
- Headings: semi-bold, tight tracking; uppercase micro-labels for section tags.
- Body: 14–16px, muted color for supporting text.

Core components
- `card`: rounded 16px, light border, soft shadow (`var(--shadow-soft)`).
- `pill`: inline badge for status/role chips.
- `btn-primary`: gradient saffron→sky, white text, rounded 12px.
- `btn-secondary`: dark ink background, white text, rounded 12px.

Layout
- Gradient canvas with subtle radial accents.
- Sidebar: light background with accent logomark; links use hover tint (`orange-50`).
- Content: max width 1200px; cards for primary sections.

Form & table styling
- Inputs: rounded 12px, `border-slate-200`, focus ring `orange-200`.
- Tables: use `card` wrapper; zebra/hover backgrounds with light orange tint.

Usage notes
- Prefer `btn-primary` for main actions, `btn-secondary` for contrasting actions.
- Use `pill` for status, roles, and small labels instead of plain text chips.
- Keep sections introduced with a micro-label (uppercase, orange tint) followed by an H1/H2.

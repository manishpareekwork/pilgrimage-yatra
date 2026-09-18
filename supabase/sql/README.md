# SQL scripts — run order (Supabase)

All numbered `.sql` files for this project live **here** (`supabase/sql/`). Run in **numeric order** when using the Dashboard SQL editor.

## First-time database (schema)

| Order | File | Purpose |
|------:|------|---------|
| 00 | `00_core_bootstrap.sql` | Extensions, enums, core tables, RLS, storage buckets |
| 01–06 | `01_*.sql` … `06_*.sql` | Incremental migrations |
| 07 | `07_operational_requirements.sql` | Large operational schema (run separately if the editor struggles; use `psql` if needed) |
| 08–13 | `08_*.sql` … `13_*.sql` | Master data, policies, registration tweaks |
| 14 | `14_address_lookup_seeds.sql` | Address state/district **data** (large) |

**RLS:** Piece `07` (and others) enable RLS. If the editor fails on RLS statements, run that file via **`psql`** once, or apply the full `../pilgrimage.sql` with `psql` (see `../APPLY_SCHEMA.md`).

## After schema succeeds — optional dev reset

Only if you want an **empty app database + one login**:

| Order | File | Purpose |
|------:|------|---------|
| 15 | `15_clear_public_and_auth.sql` | Truncates all `public` tables; deletes all Auth users |
| 16 | `16_seed_dev_admin.sql` | Creates `admin@admin.com` / `12345678` with admin role |

**Important:** `15` **also clears** address data from `14`. If you need dropdowns, run **`14_address_lookup_seeds.sql` again after `15`** (before or after `16`; order vs `16` does not matter for seeds).

**Skip 15–16** if you already have data you care about or you only need the admin user on an empty Auth (run **`16` only** — may fail if users already exist; use `15` first for a clean Auth).

## Regenerating 00–14 from the monolith

After editing `../pilgrimage.sql`:

```bash
./scripts/split_pilgrimage.sh
```

That writes into **`supabase/sql/`** (same names `00_`…`14_`).

## Alternate generator

`scripts/split_pilgrimage_sql.py` can emit commit-aligned chunks under **`_alternate_split_by_commit/`** (optional; filenames differ from `00_core_bootstrap.sql`, etc.). The canonical split for this repo is **`scripts/split_pilgrimage.sh`** into this directory.

## Post-handoff migrations (additive)

| File | Purpose |
|------|---------|
| `17_fix_staff_rls_fn_is_staff.sql` | Staff RLS via `fn_is_staff()` |
| `18_admin_upsert_password.sql` | Admin user upsert |
| `19_train_rake_berth_schema.sql` | Train rakes, coaches, berths, capacity view |
| `20_seed_train_20824.sql` | Train 20824 master + RAKE-1 berths |
| `21_train_route_enrichment.sql` | Routes, stop day fields, coach classes, views |
| `22_seed_train_20824_route.sql` | Full 44-stop route (etrain source JSON) |

See `../../docs/train-master-20824.md`, `../data/train_20824_route_stops.json`, and `../scripts/validate_train_20824.sql`.

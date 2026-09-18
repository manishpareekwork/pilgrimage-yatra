# Supabase scripts

## Run order (SQL)

All numbered SQL for the Dashboard lives in `**../sql/**`. See `**../sql/README.md**` for the full order: schema `**00`–`14**`, then optional dev reset `**15`–`16**`.

### Applying the big schema file

Read `**../APPLY_SCHEMA.md**`. For the **Dashboard**, run `**../sql/00_*.sql` … `14_*.sql` in order**. For a single file apply, use `**psql` or Supabase CLI** with `../pilgrimage.sql`.

### Regenerating `00`–`14` from the monolith

After editing `../pilgrimage.sql`:

```bash
./split_pilgrimage.sh
```

(from this directory) or `bash supabase/scripts/split_pilgrimage.sh` from the repo root.

### Alternative split (commit boundaries)

`split_pilgrimage_sql.py` writes to `**../sql/_alternate_split_by_commit/**` (different filenames than the canonical chunks). Prefer `**split_pilgrimage.sh**` for the files referenced in `../sql/README.md`.

### Supabase SQL editor + PL/pgSQL

The dashboard runner often mis-parses **PL/pgSQL**. Prefer `**LANGUAGE sql`** for new helpers where possible (`fn_generate_group_code`, `fn_create_co_travel_group`, …).


| Order | Location                                            | Purpose                                  |
| ----- | --------------------------------------------------- | ---------------------------------------- |
| **0** | `../sql/` (00→14) or `../pilgrimage.sql` via `psql` | Full schema                              |
| **1** | `../sql/15_clear_public_and_auth.sql`               | Truncate `public`; delete Auth users     |
| **2** | `../sql/16_seed_dev_admin.sql`                      | Dev admin `admin@admin.com` / `12345678` |
| **3** | `../sql/18_admin_upsert_password.sql`               | Upsert admin (see file for password)     |

## Jagannath Kath.xlsx import

Upserts roster rows with `import_batch = jagannath_kath_xlsx` (key: sheet + serial no).

```bash
export SUPABASE_URL="https://YOUR_REF.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"
python3 supabase/scripts/run_jagannath_import.py "/path/to/Jagannath Kath.xlsx"
```

Requires unique constraint `yatra_registrations_import_line_unique` on `(import_batch, source_sheet, source_sr_no)`.


## Storage

Supabase blocks SQL `DELETE` on `storage.objects`. Empty buckets via **Dashboard → Storage** or the Storage API.

## Address lookup pipeline

Inputs

- `supabase/data/address_pincodes.sample.csv` (raw postal dataset used to derive states/districts).
Expected columns: `circlename,regionname,divisionname,officename,pincode,officetype,delivery,district,statename,latitude,longitude`.

Outputs

- `supabase/data/address_states.csv`
- `supabase/data/address_districts.csv`

Build

```
python3 supabase/scripts/build_address_lookup.py
```

Seed into Supabase

```
Run sql/00–14 in order, or pilgrimage.sql via psql (includes address seeds in 14).
```

Notes

- State names are normalized (case, punctuation, leading "the") and mapped to fixed state codes.
- District IDs are generated as `<state_code>-<district_name>`; suffixes are added if collisions occur.
- The build script still generates `address_pincodes.csv`, but the pincode table is removed and the file is unused.
- If the CSVs change, refresh the seed section in `supabase/pilgrimage.sql`.

## Train 20824 master data

After `../sql/19`–`22` (rake/berth + route enrichment):

```bash
psql "$DATABASE_URL" -f supabase/scripts/validate_train_20824.sql
```

Documentation: `../../docs/train-master-20824.md`.


# Address lookup seed data

Place the India address CSVs in this folder before running the seed script.
Sample files are included as `*.sample.csv`; copy them to the expected names and replace with full data.

Expected files (CSV with header row):
- address_states.csv: id,name
- address_districts.csv: id,state_id,name

Notes:
- Use stable IDs (for example state codes) so re-seeding can upsert cleanly.

Run:
  psql "$SUPABASE_DB_URL" -f supabase/scripts/seed_address_lookup.sql

## Address lookup build pipeline

If you have the raw PIN dataset (CSV) in `address_pincodes.sample.csv`, run:

```
python3 supabase/scripts/build_address_lookup.py
```

This generates:
- `address_states.csv`
- `address_districts.csv`

The build script may also emit `address_pincodes.csv`, but the pincode table is removed and the file is unused.

Then seed with:

```
psql "$SUPABASE_DB_URL" -f supabase/scripts/seed_address_lookup.sql
```

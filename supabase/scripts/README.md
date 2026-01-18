# Supabase Scripts

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
Run supabase/pilgrimage.sql in Supabase SQL editor (includes address lookup seeds).
```

Notes
- State names are normalized (case, punctuation, leading "the") and mapped to fixed state codes.
- District IDs are generated as `<state_code>-<district_name>`; suffixes are added if collisions occur.
- The build script still generates `address_pincodes.csv`, but the pincode table is removed and the file is unused.
- If the CSVs change, refresh the seed section in `supabase/pilgrimage.sql`.

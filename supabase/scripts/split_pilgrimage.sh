#!/usr/bin/env bash
# Regenerate supabase/sql/00_*.sql … 14_*.sql from supabase/pilgrimage.sql (line ranges must match pilgrimage.sql structure).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/pilgrimage.sql"
OUT="$ROOT/sql"
mkdir -p "$OUT"

sed -n '1,629p'   "$SRC" > "$OUT/00_core_bootstrap.sql"
sed -n '632,807p' "$SRC" > "$OUT/01_registration_alignment.sql"
sed -n '810,894p' "$SRC" > "$OUT/02_guardian_relation.sql"
sed -n '897,1028p' "$SRC" > "$OUT/03_health_common_meds.sql"
sed -n '1031,1166p' "$SRC" > "$OUT/04_address_components.sql"
sed -n '1169,1269p' "$SRC" > "$OUT/05_address_lookup_tables.sql"
sed -n '1272,1415p' "$SRC" > "$OUT/06_remove_pincode.sql"
sed -n '1418,2701p' "$SRC" > "$OUT/07_operational_requirements.sql"
sed -n '2704,3197p' "$SRC" > "$OUT/08_master_data.sql"
sed -n '3200,3653p' "$SRC" > "$OUT/09_staff_role_policies.sql"
sed -n '3656,3706p' "$SRC" > "$OUT/10_hotel_code.sql"
sed -n '3709,3805p' "$SRC" > "$OUT/11_health_choice_create_registration.sql"
sed -n '3808,4003p' "$SRC" > "$OUT/12_relax_registration_checks.sql"
sed -n '4006,4189p' "$SRC" > "$OUT/13_registration_receipts_medical_group.sql"
sed -n '4192,5113p' "$SRC" > "$OUT/14_address_lookup_seeds.sql"

echo "Wrote $(ls -1 "$OUT"/*.sql | wc -l | tr -d ' ') files to $OUT"

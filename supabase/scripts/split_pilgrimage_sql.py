#!/usr/bin/env python3
"""
Split supabase/pilgrimage.sql at each top-level `commit;` into numbered files for the Supabase SQL editor.

Run from repo root:
  python3 supabase/scripts/split_pilgrimage_sql.py

Output: supabase/sql/_alternate_split_by_commit/00_*.sql … (regenerated each run).
Canonical Dashboard chunks (00_core_bootstrap.sql … 14_address_lookup_seeds.sql) live in supabase/sql/ and come from split_pilgrimage.sh only.
"""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "supabase" / "pilgrimage.sql"
OUT_DIR = ROOT / "supabase" / "sql" / "_alternate_split_by_commit"

# Slugs for each segment (must match number of transaction blocks = commits)
SLUGS = [
    "bootstrap_extensions_rls_storage",
    "migration_20251229_registration_alignment",
    "migration_20251229_guardian_relation",
    "migration_20251230_health_common_meds",
    "migration_20251231_address_components",
    "migration_20251231_address_lookup_tables",
    "migration_20260102_remove_pincode",
    "migration_20260105_operational_requirements",
    "migration_20260107_master_data",
    "migration_20260108_staff_role_policies",
    "migration_20260109_hotel_code",
    "migration_20260110_health_choice_create_registration",
    "migration_20260111_relax_registration_checks",
    "migration_20260112_receipts_medical_group",
    "address_lookup_seeds",
]


def main() -> None:
    text = SRC.read_text(encoding="utf-8")
    lines = text.splitlines(keepends=True)
    commit_idxs = [i for i, ln in enumerate(lines) if ln.strip() == "commit;"]
    if len(commit_idxs) != len(SLUGS):
        raise SystemExit(
            f"Expected {len(SLUGS)} commits, found {len(commit_idxs)}. Update SLUGS in split_pilgrimage_sql.py"
        )

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for p in OUT_DIR.glob("[0-9][0-9]_*.sql"):
        p.unlink()

    start = 0
    for idx, ci in enumerate(commit_idxs):
        chunk = lines[start : ci + 1]
        name = f"{idx:02d}_{SLUGS[idx]}.sql"
        path = OUT_DIR / name
        header = (
            f"-- {name}\n"
            f"-- Split from supabase/pilgrimage.sql — run in numeric order (00, 01, …).\n"
            f"-- Regenerate: python3 supabase/scripts/split_pilgrimage_sql.py\n\n"
        )
        path.write_text(header + "".join(chunk), encoding="utf-8")
        start = ci + 1

    if start < len(lines):
        raise SystemExit(f"Trailing lines after last commit: {len(lines) - start}")

    readme = OUT_DIR / "README_split_by_commit.md"
    body = (
        "# Schema parts (Supabase SQL editor)\n\n"
        "Run **`00_*.sql` through `14_*.sql` in order** in the Dashboard SQL editor, one file at a time.\n\n"
        "**Source of truth:** `supabase/pilgrimage.sql` (consolidated). These files are **generated** — do not edit them by hand; change `pilgrimage.sql` and re-run:\n\n"
        "```bash\npython3 supabase/scripts/split_pilgrimage_sql.py\n```\n\n"
        "For production or large applies, prefer **`psql`** (see `supabase/APPLY_SCHEMA.md`).\n\n"
        "| Order | File |\n|-------|------|\n"
    )
    for i, slug in enumerate(SLUGS):
        body += f"| {i:02d} | `{i:02d}_{slug}.sql` |\n"
    readme.write_text(body, encoding="utf-8")
    print(f"Wrote {len(SLUGS)} files to {OUT_DIR.relative_to(ROOT)}")


if __name__ == "__main__":
    main()

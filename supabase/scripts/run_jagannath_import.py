#!/usr/bin/env python3
"""Upsert Jagannath Kath.xlsx via Supabase REST (service role)."""

from __future__ import annotations

import os
import sys
from pathlib import Path

# Allow importing sibling module
sys.path.insert(0, str(Path(__file__).resolve().parent))
from import_jagannath_kath import collect_records  # noqa: E402


def main() -> int:
    xlsx = Path(sys.argv[1] if len(sys.argv) > 1 else "/Users/manishpareek/Downloads/Jagannath Kath.xlsx")
    url = os.environ.get("SUPABASE_URL", "").strip()
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    if not url or not key:
        print("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY", file=sys.stderr)
        return 1

    try:
        from supabase import create_client
    except ImportError:
        import subprocess

        subprocess.check_call([sys.executable, "-m", "pip", "install", "supabase", "-q"])
        from supabase import create_client

    records = collect_records(xlsx)
    client = create_client(url, key)
    batch_size = 50
    ok = 0
    for i in range(0, len(records), batch_size):
        chunk = records[i : i + batch_size]
        rows = []
        for rec in chunk:
            row = {k: v for k, v in rec.items() if k != "category_name"}
            cat = rec.get("category_name")
            if cat:
                cat_res = client.table("yatra_categories").select("id").eq("name", cat).limit(1).execute()
                row["category_id"] = cat_res.data[0]["id"] if cat_res.data else None
            rows.append(row)
        client.table("yatra_registrations").upsert(
            rows,
            on_conflict="import_batch,source_sheet,source_sr_no",
        ).execute()
        ok += len(chunk)
        print(f"Upserted {ok}/{len(records)}", file=sys.stderr)
    print(f"Done: {ok} rows")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

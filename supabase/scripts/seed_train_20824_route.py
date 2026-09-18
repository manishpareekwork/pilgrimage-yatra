#!/usr/bin/env python3
"""Load train_20824_route_stops.json into Supabase via service role (optional).

Usage:
  SUPABASE_URL=... SUPABASE_SERVICE_KEY=... python seed_train_20824_route.py

For production, prefer applying supabase/sql/21_seed_train_20824_route.sql via migration.
"""

from __future__ import annotations

import json
import os
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "train_20824_route_stops.json"


def halt_minutes(arr: str | None, dep: str | None, arr_day: int, dep_day: int) -> int | None:
    if not arr or not dep:
        return None
    ah, am = map(int, arr.split(":"))
    dh, dm = map(int, dep.split(":"))
    arr_m = (arr_day - 1) * 24 * 60 + ah * 60 + am
    dep_m = (dep_day - 1) * 24 * 60 + dh * 60 + dm
    if dep_m < arr_m:
        dep_m += 24 * 60
    return dep_m - arr_m


def main() -> int:
    if not DATA.exists():
        print(f"Missing {DATA}", file=sys.stderr)
        return 1
    payload = json.loads(DATA.read_text())
    stops = payload["stops"]
    for s in stops:
        s["halt_minutes"] = halt_minutes(
            s.get("arr"), s.get("dep"), s["arr_day"], s["dep_day"]
        )
    print(json.dumps({"stops": stops, "meta": {k: payload[k] for k in payload if k != "stops"}}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
"""Build Supabase address lookup CSVs from a raw India PIN dataset.

Input (raw):
- supabase/data/address_pincodes.sample.csv
  Expected columns: circlename, regionname, divisionname, officename, pincode,
  officetype, delivery, district, statename, latitude, longitude

Outputs:
- supabase/data/address_states.csv
- supabase/data/address_districts.csv
- supabase/data/address_pincodes.csv
"""

from __future__ import annotations

import argparse
import re
from pathlib import Path

import pandas as pd

STATE_CODES = {
    "Andhra Pradesh": "AP",
    "Arunachal Pradesh": "AR",
    "Assam": "AS",
    "Bihar": "BR",
    "Chhattisgarh": "CG",
    "Goa": "GA",
    "Gujarat": "GJ",
    "Haryana": "HR",
    "Himachal Pradesh": "HP",
    "Jharkhand": "JH",
    "Karnataka": "KA",
    "Kerala": "KL",
    "Madhya Pradesh": "MP",
    "Maharashtra": "MH",
    "Manipur": "MN",
    "Meghalaya": "ML",
    "Mizoram": "MZ",
    "Nagaland": "NL",
    "Odisha": "OD",
    "Punjab": "PB",
    "Rajasthan": "RJ",
    "Sikkim": "SK",
    "Tamil Nadu": "TN",
    "Telangana": "TS",
    "Tripura": "TR",
    "Uttar Pradesh": "UP",
    "Uttarakhand": "UK",
    "West Bengal": "WB",
    "Andaman and Nicobar Islands": "AN",
    "Chandigarh": "CH",
    "Dadra and Nagar Haveli and Daman and Diu": "DH",
    "Delhi": "DL",
    "Jammu and Kashmir": "JK",
    "Ladakh": "LA",
    "Lakshadweep": "LD",
    "Puducherry": "PY",
}

STATE_ALIASES = {
    "nct of delhi": "Delhi",
    "andaman & nicobar islands": "Andaman and Nicobar Islands",
    "andaman and nicobar islands": "Andaman and Nicobar Islands",
    "dadra & nagar haveli and daman & diu": "Dadra and Nagar Haveli and Daman and Diu",
    "dadra and nagar haveli and daman and diu": "Dadra and Nagar Haveli and Daman and Diu",
    "the dadra and nagar haveli and daman and diu": "Dadra and Nagar Haveli and Daman and Diu",
    "jammu & kashmir": "Jammu and Kashmir",
}


def normalize(value: str) -> str:
    value = value.strip().lower()
    value = value.replace("&", "and")
    value = re.sub(r"[^a-z0-9\s]", " ", value)
    value = re.sub(r"\s+", " ", value).strip()
    if value.startswith("the "):
        value = value[4:]
    return value


def build_state_lookup():
    lookup = {normalize(name): code for name, code in STATE_CODES.items()}
    for alias, canonical in STATE_ALIASES.items():
        code = STATE_CODES.get(canonical)
        if code:
            lookup[normalize(alias)] = code
    return lookup


def write_states_csv(output_path: Path) -> pd.DataFrame:
    states_df = pd.DataFrame(
        [{"id": code, "name": name} for name, code in STATE_CODES.items()]
    ).sort_values(["id"])
    states_df.to_csv(output_path, index=False, encoding="utf-8")
    return states_df


def main() -> None:
    parser = argparse.ArgumentParser(description="Build address lookup CSVs for Supabase.")
    parser.add_argument(
        "--pincode-source",
        default="supabase/data/address_pincodes.sample.csv",
        help="Raw PIN dataset CSV path.",
    )
    parser.add_argument(
        "--output-dir",
        default="supabase/data",
        help="Directory to write the generated CSVs.",
    )
    args = parser.parse_args()

    source_path = Path(args.pincode_source)
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    if not source_path.exists():
        raise SystemExit(f"Missing source CSV: {source_path}")

    state_lookup = build_state_lookup()
    state_name_by_code = {code: name for name, code in STATE_CODES.items()}

    states_csv = output_dir / "address_states.csv"
    districts_csv = output_dir / "address_districts.csv"
    pincodes_csv = output_dir / "address_pincodes.csv"

    write_states_csv(states_csv)

    pins_df = pd.read_csv(source_path, dtype=str)
    col_map = {c.lower(): c for c in pins_df.columns}
    required = [
        "circlename",
        "regionname",
        "divisionname",
        "officename",
        "pincode",
        "delivery",
        "district",
        "statename",
    ]
    missing = [col for col in required if col not in col_map]
    if missing:
        raise SystemExit(f"Missing columns in {source_path}: {missing}")

    # Build district map from raw file
    district_map = {}
    district_ids = set()

    for row in pins_df.itertuples(index=False):
        raw = row._asdict()
        state_raw = str(raw[col_map["statename"]]).strip()
        district_raw = str(raw[col_map["district"]]).strip()
        if not state_raw or not district_raw:
            continue

        state_id = state_lookup.get(normalize(state_raw))
        if not state_id:
            continue

        key = (state_id, normalize(district_raw))
        if key in district_map:
            continue

        display_name = re.sub(r"\s+", " ", district_raw).strip()
        if display_name.isupper():
            display_name = display_name.title()
        cleaned = display_name.replace(",", "").strip()

        base_id = f"{state_id}-{cleaned}"
        district_id = base_id
        suffix = 2
        while district_id in district_ids:
            district_id = f"{base_id}-{suffix}"
            suffix += 1

        district_map[key] = {"id": district_id, "state_id": state_id, "name": display_name}
        district_ids.add(district_id)

    district_rows = list(district_map.values())
    district_df = pd.DataFrame(district_rows).sort_values(["state_id", "name"])
    district_df.to_csv(districts_csv, index=False, encoding="utf-8")

    # Build pincode output
    records = []

    for row in pins_df.itertuples(index=False):
        raw = row._asdict()
        state_raw = str(raw[col_map["statename"]]).strip()
        district_raw = str(raw[col_map["district"]]).strip()
        office_name = str(raw[col_map["officename"]]).strip()
        pin_raw = str(raw[col_map["pincode"]]).strip()

        if not state_raw or not district_raw or not office_name or not pin_raw:
            continue

        state_id = state_lookup.get(normalize(state_raw))
        if not state_id:
            continue

        pin = pin_raw
        if pin.isdigit():
            pin = pin.zfill(6)
        else:
            pin_digits = re.sub(r"\D", "", pin_raw)
            if not pin_digits:
                continue
            pin = pin_digits.zfill(6)

        district_key = (state_id, normalize(district_raw))
        district_entry = district_map.get(district_key)

        records.append(
            {
                "pin": pin,
                "office_name": office_name,
                "district_id": district_entry["id"] if district_entry else "",
                "state_id": state_id,
                "district_name": district_entry["name"] if district_entry else district_raw.title(),
                "state_name": state_name_by_code[state_id],
                "delivery_status": str(raw[col_map["delivery"]]).strip(),
                "division": str(raw[col_map["divisionname"]]).strip(),
                "region": str(raw[col_map["regionname"]]).strip(),
                "circle": str(raw[col_map["circlename"]]).strip(),
            }
        )

    output_df = pd.DataFrame(records).drop_duplicates(subset=["pin", "office_name"])
    output_df.to_csv(pincodes_csv, index=False, encoding="utf-8")

    print("✅ Generated address lookup CSVs")
    print(f"States: {states_csv}")
    print(f"Districts: {districts_csv} ({len(district_df)})")
    print(f"Pincodes: {pincodes_csv} ({len(output_df)})")


if __name__ == "__main__":
    main()

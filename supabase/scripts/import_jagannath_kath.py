#!/usr/bin/env python3
"""Import Jagannath Kath.xlsx into yatra_registrations (upsert by import line key).

Usage:
  python import_jagannath_kath.py /path/to/Jagannath\\ Kath.xlsx [--batch-size 80] [--dry-run]

Prints SQL batches to stdout (BEGIN…INSERT…COMMIT). Pipe to psql or apply via Supabase SQL.
"""

from __future__ import annotations

import argparse
import re
import sys
from datetime import date, datetime
from pathlib import Path

IMPORT_BATCH = "jagannath_kath_xlsx"

SHEETS = [
    "Sheet1",
    "Family",
    "Relative",
    "MTC",
    "Kath-1",
    "SFS-1",
    "SFS-2",
    "Cancelled",
]

SKIP_SHEETS = {"Chart1", "Sheet8", "Sheet10", "Sheet9"}


def sql_str(value: str | None) -> str:
    if value is None:
        return "NULL"
    return "'" + value.replace("'", "''") + "'"


def sql_bool(value: bool) -> str:
    return "true" if value else "false"


def normalize_phone(raw) -> str | None:
    if raw is None:
        return None
    s = re.sub(r"\D", "", str(raw).split(".")[0])
    if not s:
        return None
    if len(s) > 10:
        s = s[-10:]
    return s if len(s) >= 10 else s or None


def normalize_aadhaar(raw) -> str | None:
    if raw is None:
        return None
    s = re.sub(r"\D", "", str(raw).split(".")[0])
    return s if len(s) >= 12 else (s or None)


def parse_dob(raw) -> date | None:
    if raw is None:
        return None
    if isinstance(raw, datetime):
        return raw.date()
    if isinstance(raw, date):
        return raw
    s = str(raw).strip()
    if not s:
        return None
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y"):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    return None


def parse_age(raw) -> int | None:
    if raw is None or str(raw).strip() == "":
        return None
    try:
        n = int(float(raw))
        return n if 0 <= n <= 120 else None
    except (TypeError, ValueError):
        return None


def map_reservation(raw) -> str:
    s = (raw or "").strip().upper()
    if s in ("MC", "COMMITTEE", "M/C"):
        return "committee"
    return "self"


def map_travel(raw) -> tuple[str | None, str | None]:
    s = (raw or "").strip()
    if not s:
        return None, None
    upper = s.upper()
    if "AIR" in upper or "FLIGHT" in upper:
        return "air", None
    if "ROAD" in upper or "BUS" in upper:
        return "road", None
    return "train", s.replace(" ", "")


def map_health(diseases: str | None) -> tuple[bool, bool, bool, bool, bool, bool, str | None]:
    if not diseases:
        return True, False, False, False, False, False, None
    d = diseases.strip().upper()
    if d in ("NIL", "NA", "N/A", "NO", "NONE", "-"):
        return True, False, False, False, False, False, None
    heart = "H" in d.split(",") or d.startswith("H") or " HEART" in d
    bp = "BP" in d
    sugar = "S" in d.split(",") or d == "S" or " DIAB" in d or "SUGAR" in d
    asthma = "A" in d.split(",") or d.startswith("A") or " ASTH" in d
    health_none = not (heart or bp or sugar or asthma)
    return health_none, heart, bp, sugar, asthma, False, diseases.strip()


def category_for_sheet(sheet: str) -> str | None:
    mapping = {
        "Family": "Family",
        "Relative": "Relative",
        "MTC": "Morning Tea club",
        "Kath-1": "Katha",
        "SFS-1": "SFS-1",
        "SFS-2": "SFS-2",
        "Sheet1": None,
        "Cancelled": "Family",
    }
    return mapping.get(sheet)


def row_to_record(sheet: str, sr_no: str, cells: tuple) -> dict | None:
    name = (cells[1] if len(cells) > 1 else None) or None
    if not name or not str(name).strip():
        return None
    name_hi = str(name).strip()
    father = str(cells[2]).strip() if len(cells) > 2 and cells[2] else None
    aadhaar = normalize_aadhaar(cells[3] if len(cells) > 3 else None)
    dob = parse_dob(cells[4] if len(cells) > 4 else None)
    age = parse_age(cells[5] if len(cells) > 5 else None)
    phone = normalize_phone(cells[6] if len(cells) > 6 else None)
    whatsapp = normalize_phone(cells[7] if len(cells) > 7 else None) or phone
    city = str(cells[8]).strip() if len(cells) > 8 and cells[8] else ""
    district = str(cells[9]).strip() if len(cells) > 9 and cells[9] else ""
    state = str(cells[10]).strip() if len(cells) > 10 and cells[10] else ""
    diseases = str(cells[11]).strip() if len(cells) > 11 and cells[11] else None
    sathi_name = str(cells[12]).strip() if len(cells) > 12 and cells[12] else None
    sathi_city = str(cells[13]).strip() if len(cells) > 13 and cells[13] else None
    sathi_phone = normalize_phone(cells[14] if len(cells) > 14 else None)
    self_mc = cells[15] if len(cells) > 15 else None
    travel_raw = cells[16] if len(cells) > 16 else None

    if not phone:
        return None

    address_hi = ", ".join(p for p in [city, district, state] if p) or city or "—"
    travel_mode, train_class = map_travel(travel_raw)
    reservation_by = map_reservation(self_mc)
    health_none, heart, bp, diabetes, asthma, _, med = map_health(diseases)
    status = "cancelled" if sheet == "Cancelled" else "submitted"
    cat = category_for_sheet(sheet)

    return {
        "name_hi": name_hi,
        "father_name_hi": father,
        "aadhaar_no": aadhaar,
        "dob": dob.isoformat() if dob else None,
        "age_years": age,
        "phone": phone,
        "whatsapp": whatsapp,
        "address_city": city or None,
        "address_district": district or None,
        "address_state": state or None,
        "address_hi": address_hi,
        "accompanying_name": sathi_name,
        "accompanying_resident_of": sathi_city,
        "accompanying_phone": sathi_phone,
        "reservation_by": reservation_by,
        "travel_mode": travel_mode,
        "train_class": train_class,
        "status": status,
        "source_sheet": sheet,
        "source_sr_no": sr_no,
        "import_batch": IMPORT_BATCH,
        "declaration_accepted": False,
        "health_none": health_none,
        "health_heart": heart,
        "health_bp": bp,
        "health_diabetes": diabetes,
        "health_asthma": asthma,
        "medical_conditions": med,
        "category_name": cat,
    }


def record_insert_sql(rec: dict) -> str:
    cat_sql = (
        f"(select id from public.yatra_categories where name = {sql_str(rec['category_name'])} limit 1)"
        if rec.get("category_name")
        else "NULL"
    )
    return f"""insert into public.yatra_registrations (
  name_hi, father_name_hi, aadhaar_no, dob, age_years, phone, whatsapp,
  address_city, address_district, address_state, address_hi,
  accompanying_name, accompanying_resident_of, accompanying_phone,
  reservation_by, travel_mode, train_class, status,
  source_sheet, source_sr_no, import_batch, declaration_accepted,
  health_none, health_heart, health_bp, health_diabetes, health_asthma,
  medical_conditions, category_id
) values (
  {sql_str(rec['name_hi'])}, {sql_str(rec.get('father_name_hi'))}, {sql_str(rec.get('aadhaar_no'))},
  {sql_str(rec['dob']) if rec.get('dob') else 'NULL'}::date, {rec['age_years'] if rec.get('age_years') is not None else 'NULL'},
  {sql_str(rec['phone'])}, {sql_str(rec.get('whatsapp'))},
  {sql_str(rec.get('address_city'))}, {sql_str(rec.get('address_district'))}, {sql_str(rec.get('address_state'))},
  {sql_str(rec['address_hi'])},
  {sql_str(rec.get('accompanying_name'))}, {sql_str(rec.get('accompanying_resident_of'))}, {sql_str(rec.get('accompanying_phone'))},
  {sql_str(rec['reservation_by'])}::reservation_by,
  {sql_str(rec['travel_mode']) + '::travel_mode' if rec.get('travel_mode') else 'NULL'},
  {sql_str(rec.get('train_class'))},
  {sql_str(rec['status'])}::reg_status,
  {sql_str(rec['source_sheet'])}, {sql_str(rec['source_sr_no'])}, {sql_str(rec['import_batch'])},
  {sql_bool(rec['declaration_accepted'])},
  {sql_bool(rec['health_none'])}, {sql_bool(rec['health_heart'])}, {sql_bool(rec['health_bp'])},
  {sql_bool(rec['health_diabetes'])}, {sql_bool(rec['health_asthma'])},
  {sql_str(rec.get('medical_conditions'))},
  {cat_sql}
)
on conflict (import_batch, source_sheet, source_sr_no) where import_batch is not null and source_sr_no is not null
do update set
  name_hi = excluded.name_hi,
  father_name_hi = excluded.father_name_hi,
  aadhaar_no = excluded.aadhaar_no,
  dob = excluded.dob,
  age_years = excluded.age_years,
  phone = excluded.phone,
  whatsapp = excluded.whatsapp,
  address_city = excluded.address_city,
  address_district = excluded.address_district,
  address_state = excluded.address_state,
  address_hi = excluded.address_hi,
  accompanying_name = excluded.accompanying_name,
  accompanying_resident_of = excluded.accompanying_resident_of,
  accompanying_phone = excluded.accompanying_phone,
  reservation_by = excluded.reservation_by,
  travel_mode = excluded.travel_mode,
  train_class = excluded.train_class,
  status = excluded.status,
  health_none = excluded.health_none,
  health_heart = excluded.health_heart,
  health_bp = excluded.health_bp,
  health_diabetes = excluded.health_diabetes,
  health_asthma = excluded.health_asthma,
  medical_conditions = excluded.medical_conditions,
  category_id = excluded.category_id;
"""


def load_workbook(path: Path):
    try:
        import openpyxl
    except ImportError:
        import subprocess

        subprocess.check_call([sys.executable, "-m", "pip", "install", "openpyxl", "-q"])
        import openpyxl

    return openpyxl.load_workbook(path, read_only=True, data_only=True)


def collect_records(path: Path) -> list[dict]:
    wb = load_workbook(path)
    by_key: dict[tuple[str, str], dict] = {}
    for sheet in wb.sheetnames:
        if sheet in SKIP_SHEETS:
            continue
        if sheet not in SHEETS and not sheet.startswith("SFS"):
            continue
        ws = wb[sheet]
        if not hasattr(ws, "iter_rows"):
            continue
        for row in ws.iter_rows(min_row=2, values_only=True):
            if not row:
                continue
            sr_raw = row[0]
            if sr_raw is None:
                continue
            sr_no = str(int(float(sr_raw))) if isinstance(sr_raw, (int, float)) else str(sr_raw).strip()
            if not sr_no:
                continue
            rec = row_to_record(sheet, sr_no, row)
            if rec:
                by_key[(sheet, sr_no)] = rec
    wb.close()
    return list(by_key.values())


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("xlsx", type=Path)
    parser.add_argument("--batch-size", type=int, default=60)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    records = collect_records(args.xlsx)
    print(f"-- rows parsed: {len(records)}", file=sys.stderr)
    if args.dry_run:
        return 0

    for i in range(0, len(records), args.batch_size):
        chunk = records[i : i + args.batch_size]
        print("begin;")
        for rec in chunk:
            print(record_insert_sql(rec))
        print("commit;")
        print()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

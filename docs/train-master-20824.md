# Train master data — 20824 Ajmer–Puri SuperFast Express

Engineering reference for train master, **route**, rakes, berths, sources, and SQL helpers.

## Train overview

| Field | Value | Status |
|-------|-------|--------|
| Train number | 20824 | VERIFIED |
| Name | Ajmer – Puri SuperFast Express | VERIFIED |
| Origin | Ajmer Junction (AII) | VERIFIED |
| Destination | Puri (PURI) | VERIFIED |
| Running days | Tue, Thu | VERIFIED (public timetables) |
| Zone | East Coast Railway (ECoR) | VERIFIED |
| Rake family | LHB | VERIFIED |
| Distance | **2476 km** (route end at PURI) | VERIFIED ([etrain.info](https://etrain.info/train/Aii-Puri-Exp-20824/schedule)) |
| Duration | ~43h 20m | DERIVED |
| AII departure | **19:20**, day 1 | VERIFIED (etrain) — see conflicts |
| PURI arrival | **14:40**, day 3 | VERIFIED |
| Route stops (DB) | **44** (incl. origin + destination) | VERIFIED |
| `scheduled_halts` on train row | **43** | DERIVED — often quoted excluding origin only |
| Max speed | 130 km/h | VERIFIED (secondary sources) |
| Active rake reserved berths | **1088** | DERIVED (LHB layout) |
| Active rake general nominal | **400** | ASSUMED (4×100 GS) |

Primary rake / composition reference: [IndiaRailInfo 20824](https://indiarailinfo.com/train/-train-ajmer-puri-sf-express-20824/22149/280/217)

Primary **route / timetable** reference: [etrain.info schedule](https://etrain.info/train/Aii-Puri-Exp-20824/schedule)

---

## Database model (existing + enrichment)

### Reused (from `08_master_data.sql`)

- `master_stations` — station code + name (+ optional state)
- `master_trains` — train header
- `master_train_stops` — **scheduled stops** (now linked to a route version)

### Rake / berth (from `19` + `20`)

- `master_train_rakes`, `master_rake_coaches`, `master_coach_berths`
- `train_rake_capacity_summary` view

### Route enrichment (`21_train_route_enrichment.sql`)

| Object | Role |
|--------|------|
| `master_train_routes` | Versioned scheduled route (`ROUTE-V1`, `valid_from` / `valid_to`, source URL) |
| `master_train_stops.*` | Extended: `route_id`, `arrive_day_number`, `depart_day_number`, `is_origin`, `is_destination`, `commercial_halt`, `halt_minutes_derived` |
| `master_coach_classes` | Normalized 2A / 3A / SL / GEN / PC / EOG / SLR / NONE |
| `master_data_sources` | Optional registry for traceability |
| `train_route_details` | Admin-friendly route listing |
| `train_rake_formation` | Coach order per rake |
| `train_rake_class_capacity` | Per-class counts and capacities |
| `train_master_summary` | One-row human summary for UI |
| `fn_validate_train_route(uuid)` | Route integrity checks |
| `fn_train_master_json(text)` | JSON payload for apps |
| `fn_stop_halt_minutes(...)` | Calendar-aware halt derivation |

**Future journeys:** `yatra_trips.train_master_id` already links trips to `master_trains`. Planned pattern: trip → `master_train_routes.id` + `master_train_rakes.id` + journey date (not implemented as a separate `journeys` table yet).

---

## Route — ROUTE-V1

Canonical data file: `supabase/data/train_20824_route_stops.json`  
Seed: `supabase/sql/22_seed_train_20824_route.sql` → `seed_train_20824_route()`

### Journey days

- **Day 1:** AII → … → Abu Road (and into day 2 after midnight at Palanpur)
- **Day 2:** Palanpur → … → Gondia
- **Day 3:** Durg → … → PURI

### Station sequence (44 stops)

| Seq | Code | Name | Arr | Dep | Arr day | Dep day | Halt | km |
|-----|------|------|-----|-----|---------|---------|------|-----|
| 1 | AII | Ajmer Junction | — | 19:20 | — | 1 | — | 0 |
| 2 | BER | Beawar | 19:56 | 19:58 | 1 | 1 | 2 | 53 |
| 3 | MJ | Marwar Junction | 21:10 | 21:15 | 1 | 1 | 5 | 140 |
| 4 | RANI | Rani | 21:48 | 21:50 | 1 | 1 | 2 | 192 |
| 5 | FA | Falna | 22:04 | 22:06 | 1 | 1 | 2 | 207 |
| 6 | PDWA | Pindwara | 22:42 | 22:44 | 1 | 1 | 2 | 262 |
| 7 | ABR | Abu Road | 23:20 | 23:30 | 1 | 1 | 10 | 306 |
| 8 | PNU | Palanpur Junction | 00:25 | 00:27 | 2 | 2 | 2 | 358 |
| 9 | UJA | Unjha | 01:02 | 01:04 | 2 | 2 | 2 | 403 |
| 10 | MSH | Mahesana Junction | 01:24 | 01:26 | 2 | 2 | 2 | 423 |
| 11 | SBIB | Sabarmati BG | 02:24 | 02:26 | 2 | 2 | 2 | 486 |
| 12 | ADI | Ahmedabad Junction | 03:05 | 03:15 | 2 | 2 | 10 | 492 |
| 13 | BRC | Vadodara Junction | 05:10 | 05:15 | 2 | 2 | 5 | 592 |
| 14 | ST | Surat | 07:10 | 07:15 | 2 | 2 | 5 | 721 |
| 15 | NDB | Nandurbar | 10:10 | 10:15 | 2 | 2 | 5 | 881 |
| 16 | DDE | Dondaicha | 11:03 | 11:05 | 2 | 2 | 2 | 916 |
| 17 | AN | Amalner | 11:58 | 12:00 | 2 | 2 | 2 | 976 |
| 18 | JL | Jalgaon Junction | 13:22 | 13:25 | 2 | 2 | 3 | 1032 |
| 19 | BSL | Bhusaval Junction | 13:50 | 13:55 | 2 | 2 | 5 | 1056 |
| 20 | MKU | Malkapur | 14:40 | 14:42 | 2 | 2 | 2 | 1106 |
| 21 | NN | Nandura | 15:04 | 15:05 | 2 | 2 | 1 | 1134 |
| 22 | SEG | Shegaon | 15:29 | 15:30 | 2 | 2 | 1 | 1159 |
| 23 | AK | Akola Junction | 16:00 | 16:05 | 2 | 2 | 5 | 1196 |
| 24 | BD | Badnera Junction | 17:22 | 17:25 | 2 | 2 | 3 | 1275 |
| 25 | WR | Wardha Junction | 18:32 | 18:35 | 2 | 2 | 3 | 1370 |
| 26 | NGP | Nagpur Junction | 20:05 | 20:10 | 2 | 2 | 5 | 1449 |
| 27 | G | Gondia Junction | 21:48 | 21:50 | 2 | 2 | 2 | 1579 |
| 28 | DURG | Durg | 00:05 | 00:10 | 3 | 3 | 5 | 1714 |
| 29 | R | Raipur Junction | 00:55 | 01:05 | 3 | 3 | 10 | 1751 |
| 30 | MSMD | Mahasamund | 01:58 | 02:00 | 3 | 3 | 2 | 1804 |
| 31 | KRAR | Khariar Road | 02:38 | 02:40 | 3 | 3 | 2 | 1856 |
| 32 | KBJ | Kantabanji | 03:45 | 03:50 | 3 | 3 | 5 | 1920 |
| 33 | TIG | Titlagarh | 04:25 | 04:45 | 3 | 3 | 20 | 1953 |
| 34 | BLGR | Balangir | 05:37 | 05:42 | 3 | 3 | 5 | 2017 |
| 35 | BRGA | Bargarh Road | 06:38 | 06:40 | 3 | 3 | 2 | 2093 |
| 36 | SBP | Sambalpur | 07:30 | 07:40 | 3 | 3 | 10 | 2135 |
| 37 | RAIR | Rairakhol | 08:42 | 08:44 | 3 | 3 | 2 | 2206 |
| 38 | ANGL | Angul | 10:25 | 10:27 | 3 | 3 | 2 | 2291 |
| 39 | DNKL | Dhenkanal | 11:25 | 11:27 | 3 | 3 | 2 | 2352 |
| 40 | NQR | Naraj Marthapur | 12:08 | 12:10 | 3 | 3 | 2 | 2389 |
| 41 | MCS | Mancheswar | 12:26 | 12:28 | 3 | 3 | 2 | 2407 |
| 42 | BBS | Bhubaneswar | 12:35 | 12:40 | 3 | 3 | 5 | 2414 |
| 43 | KUR | Khurda Road Junction | 13:00 | 13:05 | 3 | 3 | 5 | 2433 |
| 44 | PURI | Puri | 14:40 | — | 3 | — | — | 2476 |

Halts are **DERIVED** from verified arrival/departure times (stored with `halt_minutes_derived = true` where computed).

---

## Rake formations

| Rake | Active | Berths | Notes |
|------|--------|--------|-------|
| **RAKE-1** | yes | Full **1088** | SLR→…→EOG; `formation_direction = loco_toward_puri` |
| **RAKE-2** | no | skeleton | Includes **S7**; EOG near loco end (IRI alternate) |
| **RAKE-3** | no | skeleton | Reversed block; `loco_toward_aii` |

Coach capacities unchanged from prior doc (2A×52, 3A×72, SL×80, GEN×100 nominal).

---

## Berth layout

Unchanged — see prior sections in git history / `19_train_rake_berth_schema.sql` (LHB patterns, 1088 reserved total).

---

## Data sources

| Source | Used for |
|--------|----------|
| [etrain.info schedule](https://etrain.info/train/Aii-Puri-Exp-20824/schedule) | **Full route** times, days, distances, AII 19:20 |
| [IndiaRailInfo](https://indiarailinfo.com/train/-train-ajmer-puri-sf-express-20824/22149/280/217) | Rake variants, train metadata, 2478 km cite |
| [IndiaRailInfo PDF timetable](https://indiarailinfo.com/train/pdf/22149) | Cross-check halts / distance |
| LHB coach norms | Berth counts (DERIVED) |

---

## Known uncertainties / conflicts

| Topic | Existing / prior | Researched | Action |
|-------|------------------|------------|--------|
| AII departure | 19:10 in first seed | 19:20 etrain / ixigo | **Updated to 19:20** in DB; note kept |
| Total distance | 2478 km on train row | 2476 km at PURI on etrain | **Train + route use 2476**; IRI 2478 noted |
| Western line stop | Some sites list **Udhna** | etrain lists **Surat (ST)** at 721 km | **ST stored** — verify with official TT before ops |
| `scheduled_halts` | 40 | 43–44 depending on definition | Set to **43** (document 44 stop rows) |
| SLR capacity | NULL | UNKNOWN | Unchanged |
| Which rake runs which date | UNKNOWN | — | Use trip + rake assignment later |

---

## Migrations & seeds

| File | Purpose |
|------|---------|
| `supabase/sql/19_train_rake_berth_schema.sql` | Rakes, coaches, berths |
| `supabase/sql/20_seed_train_20824.sql` | Train + rakes + berths |
| `supabase/sql/21_train_route_enrichment.sql` | Routes, views, validation |
| `supabase/sql/22_seed_train_20824_route.sql` | Route seed function + invoke |
| `supabase/data/train_20824_route_stops.json` | Source-of-truth route JSON |
| `supabase/scripts/validate_train_20824.sql` | Berth + route checks |

Apply order: **19 → 20 → 21 → 22**, then validation script.

---

## Example queries

### Full route (admin)

```sql
select * from train_route_details
where train_no = '20824' and route_active
order by sequence_number;
```

### Next stop after sequence N

```sql
select * from train_route_details
where train_no = '20824' and sequence_number = (
  select min(sequence_number) from train_route_details
  where train_no = '20824' and sequence_number > :current_seq
);
```

### Does train stop at station?

```sql
select exists (
  select 1 from train_route_details
  where train_no = '20824' and station_code = 'NGP'
);
```

### Human summary (UI)

```sql
select * from train_master_summary where train_no = '20824';
```

### JSON API-shaped payload

```sql
select fn_train_master_json('20824');
```

### Coach formation (active rake)

```sql
select * from train_rake_formation
where train_no = '20824' and rake_code = 'RAKE-1'
order by position_number;
```

### Capacity by class

```sql
select * from train_rake_class_capacity
where train_no = '20824' and rake_code = 'RAKE-1';
```

### Berth S3 / 45

```sql
select c.coach_code, b.berth_number, b.berth_type, b.bay_number
from master_coach_berths b
join master_rake_coaches c on c.id = b.rake_coach_id
join master_train_rakes r on r.id = c.rake_id
join master_trains t on t.id = r.train_id
where t.train_no = '20824' and r.rake_code = 'RAKE-1'
  and c.coach_code = 'S3' and b.berth_number = 45;
```

### Bay lookup (e.g. S2 bay 4)

```sql
select b.* from master_coach_berths b
join master_rake_coaches c on c.id = b.rake_coach_id
where c.coach_code = 'S2' and b.bay_number = 4
  and c.rake_id = (
    select r.id from master_train_rakes r
    join master_trains t on t.id = r.train_id
    where t.train_no = '20824' and r.rake_code = 'RAKE-1'
  );
```

---

## Validation

```bash
psql "$DATABASE_URL" -f supabase/scripts/validate_train_20824.sql
```

Checks: single train row, **RAKE-1** berth totals (1088), **44** route stops, `fn_validate_train_route`, origin AII / destination PURI.

---

## Future journey / passenger allocation

- **Trip:** `yatra_trips` + `train_master_id`, optional future `route_id` / `rake_id` columns on trip or a dedicated `yatra_train_journeys` table.
- **Allocation:** operational berth fields on `yatra_co_travel_group_members`; link to `master_coach_berths.id` or (rake_coach_id, berth_number) when assigning PNR/coach/berth/boarding station.

Do not bind yatris only to `master_trains` without journey date + rake/route context when multiple formations or timetable versions exist.

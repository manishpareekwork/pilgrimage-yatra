import Link from "next/link";
import { PageHeader, Select, TextInput } from "@/components/ui";
import { requireStaff } from "@/lib/roleGuard";
import { ExportButton } from "./ExportButton";

type SummaryRow = { label: string; total: number };
type RoomSummaryRow = { hotel: string; room: string; total: number };

const groupCounts = (
  rows: any[],
  getKey: (row: any) => string | null | undefined,
  fallback: string
): SummaryRow[] => {
  const tally = new Map<string, number>();
  rows.forEach((row) => {
    const raw = getKey(row);
    const key = raw && String(raw).trim() ? String(raw).trim() : fallback;
    tally.set(key, (tally.get(key) ?? 0) + 1);
  });
  return Array.from(tally.entries())
    .map(([label, total]) => ({ label, total }))
    .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));
};

const groupRoomCounts = (rows: any[]): RoomSummaryRow[] => {
  const tally = new Map<string, RoomSummaryRow>();
  rows.forEach((row) => {
    const hotel = row.hotel_name?.trim() || "Unknown hotel";
    const room = row.room_no?.trim() || "Unknown room";
    const key = `${hotel}||${room}`;
    const current = tally.get(key) ?? { hotel, room, total: 0 };
    current.total += 1;
    tally.set(key, current);
  });
  return Array.from(tally.values()).sort(
    (a, b) => b.total - a.total || a.hotel.localeCompare(b.hotel)
  );
};

const SummaryGrid = ({ items, label }: { items: SummaryRow[]; label: string }) => {
  if (items.length === 0) {
    return <div className="text-xs text-[color:var(--muted)]">No results yet.</div>;
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {items.slice(0, 9).map((row) => (
        <div key={row.label} className="card p-3">
          <div className="text-xs text-[color:var(--muted)]">{label}</div>
          <div className="text-sm font-semibold text-[color:var(--ink)]">{row.label}</div>
          <div className="text-xs text-[color:var(--muted)]">Total {row.total}</div>
        </div>
      ))}
    </div>
  );
};

const reportCards = [
  {
    id: "city",
    title: "City",
    description: "Counts by city of residence.",
    accent: "#38bdf8",
    background: "radial-gradient(circle at top right, rgba(56, 189, 248, 0.15), transparent 60%)",
  },
  {
    id: "district",
    title: "District",
    description: "Counts by district of residence.",
    accent: "#22c55e",
    background: "radial-gradient(circle at top right, rgba(34, 197, 94, 0.15), transparent 60%)",
  },
  {
    id: "mode",
    title: "Travel mode",
    description: "Train vs air distribution.",
    accent: "#f59e0b",
    background: "radial-gradient(circle at top right, rgba(245, 158, 11, 0.15), transparent 60%)",
  },
  {
    id: "train",
    title: "Train",
    description: "Counts by train number.",
    accent: "#0ea5e9",
    background: "radial-gradient(circle at top right, rgba(14, 165, 233, 0.15), transparent 60%)",
  },
  {
    id: "coach",
    title: "Coach",
    description: "Coach-wise grouping.",
    accent: "#f97316",
    background: "radial-gradient(circle at top right, rgba(249, 115, 22, 0.15), transparent 60%)",
  },
  {
    id: "class",
    title: "Class",
    description: "Class-wise grouping.",
    accent: "#eab308",
    background: "radial-gradient(circle at top right, rgba(234, 179, 8, 0.15), transparent 60%)",
  },
  {
    id: "group",
    title: "Group",
    description: "Co-travel groups.",
    accent: "#10b981",
    background: "radial-gradient(circle at top right, rgba(16, 185, 129, 0.15), transparent 60%)",
  },
  {
    id: "trip",
    title: "Trip",
    description: "Trip instance counts.",
    accent: "#06b6d4",
    background: "radial-gradient(circle at top right, rgba(6, 182, 212, 0.15), transparent 60%)",
  },
  {
    id: "travel_list",
    title: "Travel list",
    description: "Member-level travel list.",
    accent: "#94a3b8",
    background: "radial-gradient(circle at top right, rgba(148, 163, 184, 0.15), transparent 60%)",
  },
  {
    id: "hotel",
    title: "Hotel",
    description: "Hotel-wise stays.",
    accent: "#a855f7",
    background: "radial-gradient(circle at top right, rgba(168, 85, 247, 0.15), transparent 60%)",
  },
  {
    id: "room",
    title: "Room",
    description: "Room-wise stays.",
    accent: "#7c3aed",
    background: "radial-gradient(circle at top right, rgba(124, 58, 237, 0.15), transparent 60%)",
  },
  {
    id: "hotel_list",
    title: "Hotel list",
    description: "Member-level stay list.",
    accent: "#ec4899",
    background: "radial-gradient(circle at top right, rgba(236, 72, 153, 0.15), transparent 60%)",
  },
];

export default async function ReportsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { supabase } = await requireStaff();
  const params = (await searchParams) ?? {};
  const reportsParam = params.reports;
  const reportsSelected = new Set(
    Array.isArray(reportsParam)
      ? reportsParam
      : reportsParam
        ? [reportsParam]
        : []
  );
  const reportsPresent = params.reports_present === "1";
  const showAll = !reportsPresent && reportsSelected.size === 0;
  const showNone = reportsPresent && reportsSelected.size === 0;
  const isSelected = (id: string) => showAll || reportsSelected.has(id);
  const showCity = isSelected("city");
  const showDistrict = isSelected("district");
  const showMode = isSelected("mode");
  const showTrain = isSelected("train");
  const showCoach = isSelected("coach");
  const showClass = isSelected("class");
  const showGroup = isSelected("group");
  const showTrip = isSelected("trip");
  const showTravelList = isSelected("travel_list");
  const showHotel = isSelected("hotel");
  const showRoom = isSelected("room");
  const showHotelList = isSelected("hotel_list");

  const needsTravel =
    showAll ||
    ["mode", "train", "coach", "class", "group", "trip", "travel_list"].some((id) =>
      reportsSelected.has(id)
    );
  const needsHotel =
    showAll || ["hotel", "room", "hotel_list"].some((id) => reportsSelected.has(id));

  const modeParam = Array.isArray(params.mode) ? params.mode?.[0] : params.mode;
  const trainNo = Array.isArray(params.train_no) ? params.train_no?.[0] : params.train_no;
  const flightNo = Array.isArray(params.flight_no) ? params.flight_no?.[0] : params.flight_no;
  const coachNo = Array.isArray(params.coach_no) ? params.coach_no?.[0] : params.coach_no;
  const classCode = Array.isArray(params.class_code) ? params.class_code?.[0] : params.class_code;
  const groupCode = Array.isArray(params.group_code) ? params.group_code?.[0] : params.group_code;
  const tripId = Array.isArray(params.trip_id) ? params.trip_id?.[0] : params.trip_id;
  const hotelId = Array.isArray(params.hotel_id) ? params.hotel_id?.[0] : params.hotel_id;
  const roomNo = Array.isArray(params.room_no) ? params.room_no?.[0] : params.room_no;
  const locationQuery = Array.isArray(params.location_q)
    ? params.location_q?.[0]
    : params.location_q;
  const locationTerm = locationQuery?.trim().toLowerCase() ?? "";

  const { data: trainOptions } = await supabase
    .from("master_trains")
    .select("train_no, train_name")
    .order("train_no");

  const { data: tripOptions } = await supabase
    .from("yatra_trips")
    .select("id, trip_name, journey_date, mode, train_no, flight_no")
    .order("journey_date", { ascending: false })
    .limit(50);

  const { data: hotelOptions } = await supabase
    .from("yatra_hotels")
    .select("id, name, hotel_code")
    .order("name");

  let cityCounts: any[] = [];
  let districtCounts: any[] = [];
  let travelMembers: any[] = [];
  let hotelStays: any[] = [];

  if (!showNone && showCity) {
    const { data } = await supabase.rpc("fn_report_city_counts");
    cityCounts = data ?? [];
  }
  if (!showNone && showDistrict) {
    const { data } = await supabase.rpc("fn_report_district_counts");
    districtCounts = data ?? [];
  }
  if (!showNone && needsTravel) {
    const { data } = await supabase.rpc("fn_report_travel_members", {
      p_mode: modeParam || null,
      p_train_no: trainNo || null,
      p_flight_no: flightNo || null,
      p_coach_no: coachNo || null,
      p_class_code: classCode || null,
    });
    travelMembers = data ?? [];
  }
  if (!showNone && needsHotel) {
    const { data } = await supabase.rpc("fn_report_hotel_stays");
    hotelStays = data ?? [];
  }

  const filteredCityCounts = locationTerm
    ? cityCounts.filter((row) => (row.city ?? "").toLowerCase().includes(locationTerm))
    : cityCounts;
  const filteredDistrictCounts = locationTerm
    ? districtCounts.filter((row) => (row.district ?? "").toLowerCase().includes(locationTerm))
    : districtCounts;

  const normalizedGroup = groupCode?.trim().toLowerCase() ?? "";
  const normalizedTrip = tripId?.trim() ?? "";
  const filteredTravelMembers = travelMembers.filter((row) => {
    if (normalizedGroup && !(row.group_code ?? "").toLowerCase().includes(normalizedGroup)) {
      return false;
    }
    if (normalizedTrip && row.trip_id !== normalizedTrip) {
      return false;
    }
    return true;
  });

  const normalizedRoom = roomNo?.trim().toLowerCase() ?? "";
  const filteredHotelStays = hotelStays.filter((row) => {
    if (hotelId && row.hotel_id !== hotelId) return false;
    if (normalizedRoom && !(row.room_no ?? "").toLowerCase().includes(normalizedRoom)) {
      return false;
    }
    return true;
  });

  const travelModeCounts = groupCounts(
    filteredTravelMembers,
    (row) => {
      if (!row.mode) return null;
      return row.mode === "train" ? "Train" : row.mode === "air" ? "Air" : String(row.mode);
    },
    "Unknown mode"
  );
  const travelTrainCounts = groupCounts(
    filteredTravelMembers.filter((row) => row.mode === "train"),
    (row) => row.train_no,
    "Unknown train"
  );
  const travelCoachCounts = groupCounts(
    filteredTravelMembers.filter((row) => row.mode === "train"),
    (row) => row.coach_no,
    "Unassigned coach"
  );
  const travelClassCounts = groupCounts(
    filteredTravelMembers.filter((row) => row.mode === "train"),
    (row) => row.class_code,
    "Unassigned class"
  );
  const travelGroupCounts = groupCounts(
    filteredTravelMembers,
    (row) => row.group_code,
    "Ungrouped"
  );
  const travelTripCounts = groupCounts(
    filteredTravelMembers,
    (row) =>
      row.trip_name
        ? `${row.trip_name}${row.journey_date ? ` · ${row.journey_date}` : ""}`
        : row.trip_id,
    "Unknown trip"
  );
  const hotelCounts = groupCounts(
    filteredHotelStays,
    (row) => row.hotel_name,
    "Unknown hotel"
  );
  const hotelRoomCounts = groupRoomCounts(filteredHotelStays);
  const citySummary = (filteredCityCounts ?? []).map((row: any) => ({
    label: row.city,
    total: row.total,
  }));
  const districtSummary = (filteredDistrictCounts ?? []).map((row: any) => ({
    label: row.district,
    total: row.total,
  }));
  const hotelRoomSummary = hotelRoomCounts.map((row) => ({
    label: `${row.hotel} · ${row.room}`,
    total: row.total,
  }));

  return (
    <div id="reports" className="yatris-grid reports-grid flex flex-col gap-6">
      <PageHeader
        className="relative z-30 overflow-visible yatris-hero"
        title="Reports"
        subtitle="Operational reports with CSV exports."
        actions={
          <div className="header-actions flex flex-wrap items-center gap-2">
            <a href="#report-builder" className="btn-primary master-action inline-flex items-center">
              Build report
            </a>
          </div>
        }
      />

      <section id="report-builder" className="card p-3 space-y-5 filters-compact report-builder">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
              Report builder
            </div>
            <div className="text-sm font-semibold text-[color:var(--ink)]">
              Choose report cards and filters
            </div>
            <p className="text-xs text-[color:var(--muted)]">
              Pick one or more report types, then add filters to combine criteria.
            </p>
          </div>
          <Link href="/reports" className="btn-secondary master-action">
            Clear all
          </Link>
        </div>

        <form method="get" className="space-y-5">
          <input type="hidden" name="reports_present" value="1" />
          <div className="space-y-3">
            <div className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
              Report types
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {reportCards.map((card) => {
              const checked = isSelected(card.id);
              return (
                <label
                  key={card.id}
                  className="card card--hover report-card flex items-start gap-3 p-3 cursor-pointer"
                  style={{ backgroundImage: card.background }}
                >
                  <input
                    type="checkbox"
                    name="reports"
                    value={card.id}
                    defaultChecked={checked}
                    className="mt-1 h-4 w-4 accent-[color:var(--accent)]"
                  />
                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-[color:var(--ink)]">
                      {card.title}
                    </div>
                    <div className="text-xs text-[color:var(--muted)]">{card.description}</div>
                  </div>
                  <span
                    className="ml-auto h-2 w-2 rounded-full"
                    style={{ backgroundColor: card.accent }}
                    aria-hidden="true"
                  />
                </label>
              );
            })}
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
              Filters
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
            <div className="card report-panel p-3 space-y-3">
              <div className="text-xs uppercase text-[color:var(--muted)]">Travel filters</div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Select name="mode" defaultValue={modeParam ?? ""}>
                  <option value="">Any mode</option>
                  <option value="train">Train</option>
                  <option value="air">Air</option>
                </Select>
                <Select name="train_no" defaultValue={trainNo ?? ""}>
                  <option value="">Any train</option>
                  {(trainOptions ?? []).map((train: any) => (
                    <option key={train.train_no} value={train.train_no}>
                      {train.train_no} · {train.train_name}
                    </option>
                  ))}
                </Select>
                <Select name="flight_no" defaultValue={flightNo ?? ""}>
                  <option value="">Any flight</option>
                  {(tripOptions ?? [])
                    .filter((trip: any) => trip.mode === "air" && trip.flight_no)
                    .map((trip: any) => (
                      <option key={trip.id} value={trip.flight_no}>
                        {trip.flight_no} · {trip.trip_name}
                      </option>
                    ))}
                </Select>
                <Select name="trip_id" defaultValue={tripId ?? ""}>
                  <option value="">Any trip</option>
                  {(tripOptions ?? []).map((trip: any) => (
                    <option key={trip.id} value={trip.id}>
                      {trip.trip_name} · {trip.journey_date}
                    </option>
                  ))}
                </Select>
                <TextInput
                  name="group_code"
                  placeholder="Group code"
                  defaultValue={groupCode ?? ""}
                />
                <TextInput
                  name="coach_no"
                  placeholder="Coach no"
                  defaultValue={coachNo ?? ""}
                />
                <TextInput
                  name="class_code"
                  placeholder="Class code"
                  defaultValue={classCode ?? ""}
                />
              </div>
            </div>

            <div className="card report-panel p-3 space-y-3">
              <div className="text-xs uppercase text-[color:var(--muted)]">Hotel filters</div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Select name="hotel_id" defaultValue={hotelId ?? ""}>
                  <option value="">Any hotel</option>
                  {(hotelOptions ?? []).map((hotel: any) => (
                    <option key={hotel.id} value={hotel.id}>
                      {hotel.hotel_code ?? "HOT"} · {hotel.name}
                    </option>
                  ))}
                </Select>
                <TextInput name="room_no" placeholder="Room no" defaultValue={roomNo ?? ""} />
              </div>
            </div>

            <div className="card report-panel p-3 space-y-3">
              <div className="text-xs uppercase text-[color:var(--muted)]">Location search</div>
              <TextInput
                name="location_q"
                placeholder="Search city or district"
                defaultValue={locationQuery ?? ""}
              />
              <div className="text-xs text-[color:var(--muted)]">
                Filters city and district report cards.
              </div>
            </div>
          </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-[color:var(--muted)]">
              Combine up to three criteria (mode + train + coach, hotel + room, city + district).
            </div>
            <button type="submit" className="btn-primary master-action">
              Generate report
            </button>
          </div>
        </form>
      </section>

      {showNone && (
        <div className="card p-6 text-center text-sm text-[color:var(--muted)]">
          Select at least one report card to see results.
        </div>
      )}

      {showCity && !showNone && (
        <section className="card p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-[color:var(--ink)]">City-wise</div>
              <div className="text-xs text-[color:var(--muted)]">Counts by city.</div>
            </div>
            <ExportButton
              filename="city-report.csv"
              headers={["City", "Total"]}
              rows={citySummary.map((row) => [row.label, row.total])}
            />
          </div>
          <SummaryGrid items={citySummary} label="City" />
        </section>
      )}

      {showDistrict && !showNone && (
        <section className="card p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-[color:var(--ink)]">District-wise</div>
              <div className="text-xs text-[color:var(--muted)]">Counts by district.</div>
            </div>
            <ExportButton
              filename="district-report.csv"
              headers={["District", "Total"]}
              rows={districtSummary.map((row) => [row.label, row.total])}
            />
          </div>
          <SummaryGrid items={districtSummary} label="District" />
        </section>
      )}

      {showMode && !showNone && (
        <section className="card p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-[color:var(--ink)]">Travel mode</div>
              <div className="text-xs text-[color:var(--muted)]">
                Train vs air distribution.
              </div>
            </div>
            <ExportButton
              filename="travel-mode.csv"
              headers={["Mode", "Total"]}
              rows={travelModeCounts.map((row) => [row.label, row.total])}
            />
          </div>
          <SummaryGrid items={travelModeCounts} label="Mode" />
        </section>
      )}

      {showTrain && !showNone && (
        <section className="card p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-[color:var(--ink)]">Train-wise</div>
              <div className="text-xs text-[color:var(--muted)]">Counts by train.</div>
            </div>
            <ExportButton
              filename="travel-by-train.csv"
              headers={["Train", "Total"]}
              rows={travelTrainCounts.map((row) => [row.label, row.total])}
            />
          </div>
          <SummaryGrid items={travelTrainCounts} label="Train" />
        </section>
      )}

      {showCoach && !showNone && (
        <section className="card p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-[color:var(--ink)]">Coach-wise</div>
              <div className="text-xs text-[color:var(--muted)]">Counts by coach.</div>
            </div>
            <ExportButton
              filename="travel-by-coach.csv"
              headers={["Coach", "Total"]}
              rows={travelCoachCounts.map((row) => [row.label, row.total])}
            />
          </div>
          <SummaryGrid items={travelCoachCounts} label="Coach" />
        </section>
      )}

      {showClass && !showNone && (
        <section className="card p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-[color:var(--ink)]">Class-wise</div>
              <div className="text-xs text-[color:var(--muted)]">Counts by class.</div>
            </div>
            <ExportButton
              filename="travel-by-class.csv"
              headers={["Class", "Total"]}
              rows={travelClassCounts.map((row) => [row.label, row.total])}
            />
          </div>
          <SummaryGrid items={travelClassCounts} label="Class" />
        </section>
      )}

      {showGroup && !showNone && (
        <section className="card p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-[color:var(--ink)]">Group-wise</div>
              <div className="text-xs text-[color:var(--muted)]">Counts by group.</div>
            </div>
            <ExportButton
              filename="travel-by-group.csv"
              headers={["Group", "Total"]}
              rows={travelGroupCounts.map((row) => [row.label, row.total])}
            />
          </div>
          <SummaryGrid items={travelGroupCounts} label="Group" />
        </section>
      )}

      {showTrip && !showNone && (
        <section className="card p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-[color:var(--ink)]">Trip-wise</div>
              <div className="text-xs text-[color:var(--muted)]">Counts by trip.</div>
            </div>
            <ExportButton
              filename="travel-by-trip.csv"
              headers={["Trip", "Total"]}
              rows={travelTripCounts.map((row) => [row.label, row.total])}
            />
          </div>
          <SummaryGrid items={travelTripCounts} label="Trip" />
        </section>
      )}

      {showTravelList && !showNone && (
        <section className="card p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-[color:var(--ink)]">
                Travel members
              </div>
              <div className="text-xs text-[color:var(--muted)]">
                Trip, train, coach, class, and group listings.
              </div>
            </div>
            <ExportButton
              filename="travel-members.csv"
              headers={[
                "Trip",
                "Date",
                "Mode",
                "Train",
                "Flight",
                "Group",
                "Coach",
                "Seat",
                "Berth",
                "Class",
                "Ticket",
                "Name",
                "Phone",
              ]}
              rows={(filteredTravelMembers ?? []).map((row: any) => [
                row.trip_name,
                row.journey_date,
                row.mode,
                row.train_no,
                row.flight_no,
                row.group_code,
                row.coach_no,
                row.seat_no,
                row.berth_no,
                row.class_code,
                row.ticket_status,
                row.name_hi,
                row.phone,
              ])}
            />
          </div>
          <div className="text-xs text-[color:var(--muted)]">
            Showing {filteredTravelMembers.length} members.
          </div>
        </section>
      )}

      {showHotel && !showNone && (
        <section className="card p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-[color:var(--ink)]">Hotel-wise</div>
              <div className="text-xs text-[color:var(--muted)]">Counts by hotel.</div>
            </div>
            <ExportButton
              filename="hotel-by-hotel.csv"
              headers={["Hotel", "Total"]}
              rows={hotelCounts.map((row) => [row.label, row.total])}
            />
          </div>
          <SummaryGrid items={hotelCounts} label="Hotel" />
        </section>
      )}

      {showRoom && !showNone && (
        <section className="card p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-[color:var(--ink)]">Room-wise</div>
              <div className="text-xs text-[color:var(--muted)]">Counts by room.</div>
            </div>
            <ExportButton
              filename="hotel-by-room.csv"
              headers={["Hotel", "Room", "Total"]}
              rows={hotelRoomCounts.map((row) => [row.hotel, row.room, row.total])}
            />
          </div>
          <SummaryGrid items={hotelRoomSummary} label="Room" />
        </section>
      )}

      {showHotelList && !showNone && (
        <section className="card p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-[color:var(--ink)]">Hotel stays</div>
              <div className="text-xs text-[color:var(--muted)]">Hotel and room assignments.</div>
            </div>
            <ExportButton
              filename="hotel-stays.csv"
              headers={["Hotel", "Room", "Name", "Phone", "Stay From", "Stay To"]}
              rows={(filteredHotelStays ?? []).map((row: any) => [
                row.hotel_name,
                row.room_no,
                row.name_hi,
                row.phone,
                row.stay_from,
                row.stay_to,
              ])}
            />
          </div>
          <div className="text-xs text-[color:var(--muted)]">
            Showing {filteredHotelStays.length} stays.
          </div>
        </section>
      )}
    </div>
  );
}

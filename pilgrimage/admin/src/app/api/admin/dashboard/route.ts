import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/apiAuth";

export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;

const parseRange = (value: string | null) => {
  const normalized = value?.trim().toLowerCase() || "30d";
  if (normalized === "all") return { key: "all", days: null };
  if (normalized === "7d") return { key: "7d", days: 7 };
  if (normalized === "90d") return { key: "90d", days: 90 };
  return { key: "30d", days: 30 };
};

const parseMode = (value: string | null) => {
  const normalized = value?.trim().toLowerCase();
  return normalized === "train" || normalized === "air" ? normalized : "all";
};

const toDateKey = (value: Date) => value.toISOString().slice(0, 10);

const buildSeries = (rows: Array<{ created_at?: string | null }>, days: number) => {
  const counts = new Map<string, number>();
  rows.forEach((row) => {
    if (!row.created_at) return;
    const key = row.created_at.slice(0, 10);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });

  const series: Array<{ date: string; total: number }> = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const key = toDateKey(new Date(Date.now() - i * DAY_MS));
    series.push({ date: key, total: counts.get(key) ?? 0 });
  }
  return series;
};

export async function GET(req: NextRequest) {
  const auth = await requireApiAuth({ requireStaff: true });
  if ("response" in auth) return auth.response;

  const { supabase } = auth;
  const url = new URL(req.url);
  const range = parseRange(url.searchParams.get("range"));
  const mode = parseMode(url.searchParams.get("mode"));

  const rangeStart = range.days ? new Date(Date.now() - range.days * DAY_MS) : null;
  const seriesDays = range.days ?? 30;
  const seriesStart = new Date(Date.now() - seriesDays * DAY_MS);

  let registrationCountQuery = supabase
    .from("yatra_registrations")
    .select("id", { count: "exact", head: true });

  let trainCountQuery = supabase
    .from("yatra_registrations")
    .select("id", { count: "exact", head: true })
    .eq("travel_mode", "train");

  let airCountQuery = supabase
    .from("yatra_registrations")
    .select("id", { count: "exact", head: true })
    .eq("travel_mode", "air");

  let unknownCountQuery = supabase
    .from("yatra_registrations")
    .select("id", { count: "exact", head: true })
    .is("travel_mode", null);

  if (rangeStart) {
    const rangeIso = rangeStart.toISOString();
    registrationCountQuery = registrationCountQuery.gte("created_at", rangeIso);
    trainCountQuery = trainCountQuery.gte("created_at", rangeIso);
    airCountQuery = airCountQuery.gte("created_at", rangeIso);
    unknownCountQuery = unknownCountQuery.gte("created_at", rangeIso);
  }

  if (mode !== "all") {
    registrationCountQuery = registrationCountQuery.eq("travel_mode", mode);
  }

  let registrationSeriesQuery = supabase
    .from("yatra_registrations")
    .select("created_at")
    .gte("created_at", seriesStart.toISOString());

  if (mode !== "all") {
    registrationSeriesQuery = registrationSeriesQuery.eq("travel_mode", mode);
  }

  const [
    registrationCountRes,
    trainCountRes,
    airCountRes,
    unknownCountRes,
    registrationSeriesRes,
    groupCountRes,
    bookingTasksRes,
    hotelsRes,
    roomsRes,
    staysRes,
    volunteerRolesRes,
    volunteerMembersRes,
    tripsRes,
  ] = await Promise.all([
    registrationCountQuery,
    trainCountQuery,
    airCountQuery,
    unknownCountQuery,
    registrationSeriesQuery,
    supabase.from("yatra_co_travel_groups").select("id", { count: "exact", head: true }),
    supabase.from("yatra_booking_tasks").select("id, status"),
    supabase.from("yatra_hotels").select("id"),
    supabase.from("yatra_hotel_rooms").select("id, base_capacity, extra_beds_max"),
    supabase.from("yatra_room_stays").select("room_id"),
    supabase.from("volunteer_roles").select("id"),
    supabase.from("volunteer_role_members").select("id, is_head"),
    supabase.from("yatra_trips").select("id"),
  ]);

  const errors = [
    registrationCountRes.error,
    trainCountRes.error,
    airCountRes.error,
    unknownCountRes.error,
    registrationSeriesRes.error,
    groupCountRes.error,
    bookingTasksRes.error,
    hotelsRes.error,
    roomsRes.error,
    staysRes.error,
    volunteerRolesRes.error,
    volunteerMembersRes.error,
    tripsRes.error,
  ]
    .filter(Boolean)
    .map((error) => (error as { message?: string }).message || "Unknown error");

  const registrationTotal = registrationCountRes.count ?? 0;
  const registrationSeriesRows = (registrationSeriesRes.data ?? []) as Array<{
    created_at?: string | null;
  }>;

  const bookingStatusCounts = { open: 0, in_progress: 0, done: 0 };
  (bookingTasksRes.data ?? []).forEach((task: any) => {
    const status = task.status as keyof typeof bookingStatusCounts;
    if (status && bookingStatusCounts[status] !== undefined) {
      bookingStatusCounts[status] += 1;
    }
  });

  const rooms = (roomsRes.data ?? []) as Array<{
    id: string;
    base_capacity: number | null;
    extra_beds_max: number | null;
  }>;
  const stays = staysRes.data ?? [];
  const totalCapacity = rooms.reduce(
    (sum, room) => sum + (room.base_capacity ?? 0) + (room.extra_beds_max ?? 0),
    0
  );
  const occupiedBeds = stays.length;
  const vacantBeds = Math.max(totalCapacity - occupiedBeds, 0);

  const volunteerMembers = volunteerMembersRes.data ?? [];
  const leadCount = volunteerMembers.filter((member: any) => member.is_head).length;

  return NextResponse.json({
    connected: errors.length === 0,
    errors,
    range: range.key,
    mode,
    metrics: {
      registrations: {
        total: registrationTotal,
        avg_per_day: range.days ? Number((registrationTotal / range.days).toFixed(1)) : null,
      },
      groups: {
        total: groupCountRes.count ?? 0,
      },
      bookings: {
        total: bookingTasksRes.data?.length ?? 0,
        status: bookingStatusCounts,
      },
      hotels: {
        total: hotelsRes.data?.length ?? 0,
        rooms: rooms.length,
        capacity: totalCapacity,
        occupied: occupiedBeds,
        vacant: vacantBeds,
      },
      volunteers: {
        roles: volunteerRolesRes.data?.length ?? 0,
        assignments: volunteerMembers.length,
        leads: leadCount,
      },
      trips: {
        total: tripsRes.data?.length ?? 0,
      },
    },
    series: {
      registrationsByDay: buildSeries(registrationSeriesRows, seriesDays),
      travelModes: {
        train: trainCountRes.count ?? 0,
        air: airCountRes.count ?? 0,
        unknown: unknownCountRes.count ?? 0,
      },
      series_window_days: seriesDays,
    },
  });
}

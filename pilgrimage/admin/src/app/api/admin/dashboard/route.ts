import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/apiAuth";

export const dynamic = "force-dynamic";
const TRAIN_GROUP_SIZE_TARGET = 6;

export async function GET(_req: NextRequest) {
  const auth = await requireApiAuth({ requireStaff: true });
  if ("response" in auth) return auth.response;

  const { supabase } = auth;

  const [
    registrationRes,
    reservationMembersRes,
    hotelsRes,
    roomsRes,
    categoriesRes,
    trainRegistrationsRes,
    trainTripsRes,
  ] = await Promise.all([
    supabase.from("yatra_registrations").select("id, reservation_by", { count: "exact" }),
    supabase.from("yatra_co_travel_group_members").select("registration_id"),
    supabase.from("yatra_hotels").select("id", { count: "exact", head: true }),
    supabase.from("yatra_hotel_rooms").select("id", { count: "exact", head: true }),
    supabase.from("yatra_categories").select("id", { count: "exact", head: true }),
    supabase
      .from("yatra_registrations")
      .select("id", { count: "exact", head: true })
      .eq("travel_mode", "train"),
    supabase.from("yatra_trips").select("id").eq("mode", "train"),
  ]);

  const trainTrips = (trainTripsRes.data ?? []) as Array<{ id: string }>;
  const trainTripIds = trainTrips.map((trip) => trip.id);
  let trainGroupsRes: { count: number | null; error: unknown } = { count: 0, error: null };
  if (trainTripIds.length > 0) {
    trainGroupsRes = await supabase
      .from("yatra_co_travel_groups")
      .select("id", { count: "exact", head: true })
      .in("trip_id", trainTripIds);
  }

  const errors = [
    registrationRes.error,
    reservationMembersRes.error,
    hotelsRes.error,
    roomsRes.error,
    categoriesRes.error,
    trainRegistrationsRes.error,
    trainTripsRes.error,
    trainGroupsRes.error,
  ]
    .filter(Boolean)
    .map((error) => (error as { message?: string }).message || "Unknown error");

  const registrations = (registrationRes.data ?? []) as Array<{
    id: string;
    reservation_by: "self" | "committee" | null;
  }>;
  const reservationIdSet = new Set<string>();
  const reservationMembers = (reservationMembersRes.data ?? []) as Array<{
    registration_id: string | null;
  }>;
  reservationMembers.forEach((row) => {
    if (row.registration_id) reservationIdSet.add(row.registration_id);
  });

  const reservationMetrics = {
    total: 0,
    self: 0,
    committee: 0,
    pending_self: 0,
    pending_committee: 0,
  };

  registrations.forEach((row) => {
    if (row.reservation_by !== "self" && row.reservation_by !== "committee") return;
    const hasReservation = reservationIdSet.has(row.id);
    if (hasReservation) {
      reservationMetrics.total += 1;
      if (row.reservation_by === "self") reservationMetrics.self += 1;
      else reservationMetrics.committee += 1;
    } else {
      if (row.reservation_by === "self") reservationMetrics.pending_self += 1;
      else reservationMetrics.pending_committee += 1;
    }
  });

  const trainRegistrations = trainRegistrationsRes.count ?? 0;
  const trainGroups = trainGroupsRes.count ?? 0;
  const trainGroupTarget = trainRegistrations
    ? Math.ceil(trainRegistrations / TRAIN_GROUP_SIZE_TARGET)
    : 0;
  const trainGroupGap = Math.max(trainGroupTarget - trainGroups, 0);

  return NextResponse.json({
    connected: errors.length === 0,
    errors,
    metrics: {
      registrations: {
        total: registrationRes.count ?? registrations.length,
      },
      hotels: {
        total: hotelsRes.count ?? 0,
      },
      rooms: {
        total: roomsRes.count ?? 0,
      },
      categories: {
        total: categoriesRes.count ?? 0,
      },
      reservations: reservationMetrics,
      train: {
        registrations: trainRegistrations,
        groups: trainGroups,
        group_target: trainGroupTarget,
        group_gap: trainGroupGap,
      },
    },
  });
}

import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/apiAuth";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  const auth = await requireApiAuth({ requireStaff: true });
  if ("response" in auth) return auth.response;

  const { supabase } = auth;

  const [
    registrationRes,
    reservationMembersRes,
    hotelsRes,
    roomsRes,
  ] = await Promise.all([
    supabase.from("yatra_registrations").select("id, reservation_by", { count: "exact" }),
    supabase.from("yatra_co_travel_group_members").select("registration_id"),
    supabase.from("yatra_hotels").select("id", { count: "exact", head: true }),
    supabase.from("yatra_hotel_rooms").select("id", { count: "exact", head: true }),
  ]);

  const errors = [
    registrationRes.error,
    reservationMembersRes.error,
    hotelsRes.error,
    roomsRes.error,
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
      reservations: reservationMetrics,
    },
  });
}

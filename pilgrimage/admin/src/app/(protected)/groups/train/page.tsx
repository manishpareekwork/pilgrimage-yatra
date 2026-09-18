import Link from "next/link";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader, FormSection } from "@/components/ui";
import { requireStaff } from "@/lib/roleGuard";
import { TrainGroupsClient } from "./TrainGroupsClient";

export default async function TrainGroupsPage() {
  const { supabase } = await requireStaff();
  const { data: trips, error } = await supabase
    .from("yatra_trips")
    .select(
      "id, trip_name, trip_kind, journey_date, mode, train_no, flight_no, from_station_code, to_station_code, from_airport_code, to_airport_code"
    )
    .order("journey_date", { ascending: false });

  return (
    <div className="page-stack">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/dashboard" },
          { label: "Operations", href: "/masters" },
          { label: "Travel groups" },
        ]}
      />
      <PageHeader
        title="Travel Groups"
        subtitle="Step 3 of committee train flow — build co-travel groups (up to 6 per CM257), then open CM257 forms per group."
        actions={
          <Link href="/bookings/railway-reservation" className="btn-primary">
            CM257 builder
          </Link>
        }
      />

      {error && (
        <FormSection title="Unable to load trips">
          <div className="rounded-xl border border-rose-500/40 bg-rose-950/40 p-3 text-sm text-rose-200">
            {error.message}
          </div>
        </FormSection>
      )}

      {!error && (!trips || trips.length === 0) && (
        <FormSection title="No trips">
          <div className="space-y-2 text-sm text-[color:var(--muted)]">
            <p>Create outbound (7 Dec) and return (13 Dec) legs first.</p>
            <Link href="/masters/trips" className="text-sky-400 underline">
              Masters → Trip instances
            </Link>
          </div>
        </FormSection>
      )}

      {trips && trips.length > 0 && (
        <TrainGroupsClient
          trips={trips.map((trip) => ({
            id: trip.id,
            mode: trip.mode,
            trip_name: trip.trip_name,
            trip_kind: trip.trip_kind,
            journey_date: trip.journey_date,
            train_no: trip.train_no,
            flight_no: trip.flight_no,
            from_station_code: trip.from_station_code,
            to_station_code: trip.to_station_code,
            from_airport_code: trip.from_airport_code,
            to_airport_code: trip.to_airport_code,
          }))}
        />
      )}
    </div>
  );
}

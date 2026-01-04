import { PageHeader, FormSection } from "@/components/ui";
import { requireStaff } from "@/lib/roleGuard";
import { TrainGroupsClient } from "./TrainGroupsClient";

export default async function TrainGroupsPage() {
  const { supabase } = await requireStaff();
  const { data: trips, error } = await supabase
    .from("yatra_trips")
    .select(
      "id, trip_name, journey_date, mode, train_no, flight_no, from_station_code, to_station_code, from_airport_code, to_airport_code"
    )
    .order("journey_date", { ascending: false });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Travel Groups"
        subtitle="Manage train/flight co-travel groups, in-charges, and members."
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
          <div className="text-sm text-[color:var(--muted)]">
            Create a trip before assigning groups.
          </div>
        </FormSection>
      )}

      {trips && trips.length > 0 && (
        <TrainGroupsClient
          trips={trips.map((trip) => ({
            id: trip.id,
            mode: trip.mode,
            trip_name: trip.trip_name,
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

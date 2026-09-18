import { Suspense } from "react";
import { PageHeader } from "@/components/ui";
import { requireStaff } from "@/lib/roleGuard";
import { RailwayReservationBuilder } from "./RailwayReservationBuilder";

export default async function RailwayReservationPage() {
  const { supabase } = await requireStaff();
  const { data: trips, error } = await supabase
    .from("yatra_trips")
    .select(
      "id, trip_name, trip_kind, journey_date, mode, train_no, from_station_code, to_station_code"
    )
    .order("journey_date", { ascending: false });

  return (
    <div className="space-y-6">
      {error && (
        <PageHeader
          title="Railway reservation forms"
          subtitle={error.message}
        />
      )}
      {!error && (
        <Suspense fallback={<p className="text-sm text-[color:var(--muted)]">Loading…</p>}>
          <RailwayReservationBuilder trips={trips ?? []} />
        </Suspense>
      )}
    </div>
  );
}

import { PageHeader, FormSection } from "@/components/ui";
import { requireStaff } from "@/lib/roleGuard";
import { CoachGroupsClient } from "./CoachGroupsClient";

export default async function CoachGroupsPage() {
  const { supabase } = await requireStaff();
  const { data: trips, error } = await supabase
    .from("yatra_trips")
    .select("id, trip_name, journey_date, train_no, mode")
    .eq("mode", "train")
    .order("journey_date", { ascending: false });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Train Coach Groups"
        subtitle="Assign coach in-charges and view coach-wise travelers."
      />

      {error && (
        <FormSection title="Unable to load trips">
          <div className="rounded-xl border border-rose-500/40 bg-rose-950/40 p-3 text-sm text-rose-200">
            {error.message}
          </div>
        </FormSection>
      )}

      {!error && (!trips || trips.length === 0) && (
        <FormSection title="No train trips">
          <div className="text-sm text-[color:var(--muted)]">
            Create a train trip before assigning coach in-charges.
          </div>
        </FormSection>
      )}

      {trips && trips.length > 0 && (
        <CoachGroupsClient
          trips={trips.map((trip) => ({
            id: trip.id,
            trip_name: trip.trip_name,
            journey_date: trip.journey_date,
            train_no: trip.train_no,
          }))}
        />
      )}
    </div>
  );
}

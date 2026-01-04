import { PageHeader, FormSection } from "@/components/ui";
import { requireStaff } from "@/lib/roleGuard";
import { getActionSupabase } from "@/lib/supabaseServer";
import { revalidatePath } from "next/cache";
import { TripForm } from "./TripForm";

async function createTrip(formData: FormData) {
  "use server";
  const mode = formData.get("mode")?.toString().trim();
  const tripName = formData.get("trip_name")?.toString().trim();
  const journeyDate = formData.get("journey_date")?.toString().trim();

  if (!mode || !tripName || !journeyDate) return;

  const supabase = await getActionSupabase();
  await supabase.rpc("fn_create_trip", {
    p_mode: mode,
    p_trip_name: tripName,
    p_journey_date: journeyDate,
    p_depart_at: formData.get("depart_at")?.toString() || null,
    p_arrive_at: formData.get("arrive_at")?.toString() || null,
    p_train_no: formData.get("train_no")?.toString() || null,
    p_train_name: formData.get("train_name")?.toString() || null,
    p_from_station_code: formData.get("from_station_code")?.toString() || null,
    p_to_station_code: formData.get("to_station_code")?.toString() || null,
    p_from_station_name: formData.get("from_station_name")?.toString() || null,
    p_to_station_name: formData.get("to_station_name")?.toString() || null,
    p_default_class_code: formData.get("default_class_code")?.toString() || null,
    p_quota_code: formData.get("quota_code")?.toString() || null,
    p_airline_code: formData.get("airline_code")?.toString() || null,
    p_flight_no: formData.get("flight_no")?.toString() || null,
    p_from_airport_code: formData.get("from_airport_code")?.toString() || null,
    p_to_airport_code: formData.get("to_airport_code")?.toString() || null,
  });

  revalidatePath("/trips");
}

export default async function TripsPage() {
  const { supabase } = await requireStaff();
  const { data: trips, error } = await supabase
    .from("yatra_trips")
    .select(
      "id, mode, trip_name, journey_date, train_no, flight_no, from_station_code, to_station_code, from_airport_code, to_airport_code, created_at"
    )
    .order("journey_date", { ascending: false });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trips"
        subtitle="Create and manage train/flight legs for grouping and bookings."
      />

      <TripForm action={createTrip} />

      <FormSection title="Existing trips" description="Latest configured travel legs.">
        {error && (
          <div className="mb-4 rounded-xl border border-rose-500/40 bg-rose-950/40 p-3 text-sm text-rose-200">
            {error.message}
          </div>
        )}
        <div className="overflow-hidden rounded-xl border border-slate-800/60">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-900 text-left text-xs font-semibold uppercase text-slate-300">
              <tr>
                <th className="px-4 py-3">Trip</th>
                <th className="px-4 py-3">Mode</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Route</th>
                <th className="px-4 py-3">Ref</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {(trips ?? []).map((trip) => {
                const fromCode = trip.mode === "air" ? trip.from_airport_code : trip.from_station_code;
                const toCode = trip.mode === "air" ? trip.to_airport_code : trip.to_station_code;
                const ref = trip.mode === "air" ? trip.flight_no : trip.train_no;
                return (
                  <tr key={trip.id} className="hover:bg-slate-900/40">
                    <td className="px-4 py-3 text-slate-100">{trip.trip_name}</td>
                    <td className="px-4 py-3 text-slate-300 uppercase">{trip.mode}</td>
                    <td className="px-4 py-3 text-slate-300">
                      {trip.journey_date ? new Date(trip.journey_date).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {[fromCode, toCode].filter(Boolean).join(" → ") || "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-300">{ref || "—"}</td>
                  </tr>
                );
              })}
              {trips?.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                    No trips yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </FormSection>
    </div>
  );
}

import { PageHeader, FormSection, Select, TextInput } from "@/components/ui";
import { requireStaff } from "@/lib/roleGuard";
import { getActionSupabase } from "@/lib/supabaseServer";
import { revalidatePath } from "next/cache";

const toText = (value: FormDataEntryValue | null) =>
  value ? value.toString().trim() : "";

const toOptional = (value: FormDataEntryValue | null) => {
  const text = toText(value);
  return text ? text : null;
};

const toDateTimeLocal = (value: string | null) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  const offset = parsed.getTimezoneOffset();
  const local = new Date(parsed.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
};

async function createTrainTrip(formData: FormData) {
  "use server";
  const trainNo = toText(formData.get("train_no"));
  const journeyDate = toText(formData.get("journey_date"));
  const tripKind = toOptional(formData.get("trip_kind")) ?? "other";
  if (!trainNo || !journeyDate) return;

  const departAt = toOptional(formData.get("depart_at"));
  const arriveAt = toOptional(formData.get("arrive_at"));
  const defaultClassCode = toOptional(formData.get("default_class_code"));
  const quotaCode = toOptional(formData.get("quota_code"));

  const supabase = await getActionSupabase();
  const { data, error } = await supabase.rpc("admin_create_trip_from_master", {
    p_train_no: trainNo,
    p_journey_date: journeyDate,
    p_trip_kind: tripKind,
  });
  if (!error && data) {
    await supabase
      .from("yatra_trips")
      .update({
        depart_at: departAt,
        arrive_at: arriveAt,
        default_class_code: defaultClassCode,
        quota_code: quotaCode,
      })
      .eq("id", data);
  }
  revalidatePath("/masters/trips");
}

async function createFlightTrip(formData: FormData) {
  "use server";
  const tripName = toText(formData.get("trip_name"));
  const journeyDate = toText(formData.get("journey_date"));
  const tripKind = toOptional(formData.get("trip_kind")) ?? "other";
  if (!tripName || !journeyDate) return;

  const supabase = await getActionSupabase();
  const { data, error } = await supabase.rpc("fn_create_trip", {
    p_mode: "air",
    p_trip_name: tripName,
    p_journey_date: journeyDate,
    p_depart_at: toOptional(formData.get("depart_at")),
    p_arrive_at: toOptional(formData.get("arrive_at")),
    p_airline_code: toOptional(formData.get("airline_code")),
    p_flight_no: toOptional(formData.get("flight_no")),
    p_from_airport_code: toOptional(formData.get("from_airport_code")),
    p_to_airport_code: toOptional(formData.get("to_airport_code")),
  });
  if (!error && data) {
    await supabase
      .from("yatra_trips")
      .update({ trip_kind: tripKind })
      .eq("id", data);
  }
  revalidatePath("/masters/trips");
}

async function updateTrip(formData: FormData) {
  "use server";
  const id = toText(formData.get("id"));
  if (!id) return;

  const supabase = await getActionSupabase();
  await supabase
    .from("yatra_trips")
    .update({
      trip_name: toOptional(formData.get("trip_name")),
      trip_kind: toOptional(formData.get("trip_kind")),
      journey_date: toOptional(formData.get("journey_date")),
      depart_at: toOptional(formData.get("depart_at")),
      arrive_at: toOptional(formData.get("arrive_at")),
      default_class_code: toOptional(formData.get("default_class_code")),
      quota_code: toOptional(formData.get("quota_code")),
      train_master_id: toOptional(formData.get("train_master_id")),
      train_no: toOptional(formData.get("train_no")),
      train_name: toOptional(formData.get("train_name")),
      from_station_code: toOptional(formData.get("from_station_code")),
      to_station_code: toOptional(formData.get("to_station_code")),
      flight_no: toOptional(formData.get("flight_no")),
      airline_code: toOptional(formData.get("airline_code")),
      from_airport_code: toOptional(formData.get("from_airport_code")),
      to_airport_code: toOptional(formData.get("to_airport_code")),
    })
    .eq("id", id);
  revalidatePath("/masters/trips");
}

async function deleteTrip(formData: FormData) {
  "use server";
  const id = toText(formData.get("id"));
  if (!id) return;

  const supabase = await getActionSupabase();
  await supabase.from("yatra_trips").delete().eq("id", id);
  revalidatePath("/masters/trips");
}

export default async function MasterTripsPage() {
  const { supabase } = await requireStaff();
  const { data: trains } = await supabase
    .from("master_trains")
    .select("id, train_no, train_name, source_station_code, destination_station_code")
    .order("train_no");

  const { data: trips, error } = await supabase
    .from("yatra_trips")
    .select(
      "id, mode, trip_name, trip_kind, journey_date, depart_at, arrive_at, train_master_id, train_no, train_name, from_station_code, to_station_code, default_class_code, quota_code, airline_code, flight_no, from_airport_code, to_airport_code, created_at"
    )
    .order("journey_date", { ascending: false });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Master Trip Instances"
        subtitle="Create outbound/return journey legs and manage overrides."
      />

      <FormSection title="Create train trip from master">
        <form action={createTrainTrip} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <Select name="train_no" required>
            <option value="">Select train</option>
            {(trains ?? []).map((train) => (
              <option key={train.id} value={train.train_no}>
                {train.train_no} · {train.train_name}
              </option>
            ))}
          </Select>
          <Select name="trip_kind" defaultValue="outbound">
            <option value="outbound">Outbound</option>
            <option value="return">Return</option>
            <option value="other">Other</option>
          </Select>
          <TextInput name="journey_date" type="date" required />
          <TextInput name="depart_at" type="datetime-local" placeholder="Depart override" />
          <TextInput name="arrive_at" type="datetime-local" placeholder="Arrive override" />
          <TextInput name="default_class_code" placeholder="Default class" />
          <TextInput name="quota_code" placeholder="Quota code" />
          <button type="submit" className="btn-primary sm:col-span-2 lg:col-span-6">
            Create train trip
          </button>
        </form>
      </FormSection>

      <FormSection title="Create flight trip">
        <form action={createFlightTrip} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <TextInput name="trip_name" placeholder="Trip name" required />
          <Select name="trip_kind" defaultValue="other">
            <option value="outbound">Outbound</option>
            <option value="return">Return</option>
            <option value="other">Other</option>
          </Select>
          <TextInput name="journey_date" type="date" required />
          <TextInput name="depart_at" type="datetime-local" placeholder="Depart at" />
          <TextInput name="arrive_at" type="datetime-local" placeholder="Arrive at" />
          <TextInput name="airline_code" placeholder="Airline code" />
          <TextInput name="flight_no" placeholder="Flight number" />
          <TextInput name="from_airport_code" placeholder="From airport" />
          <TextInput name="to_airport_code" placeholder="To airport" />
          <button type="submit" className="btn-primary sm:col-span-2 lg:col-span-6">
            Create flight trip
          </button>
        </form>
      </FormSection>

      <FormSection title="Existing trips" description="Update overrides or delete trip instances.">
        {error && (
          <div className="mb-4 rounded-xl border border-rose-500/40 bg-rose-950/40 p-3 text-sm text-rose-200">
            {error.message}
          </div>
        )}
        <div className="space-y-4">
          {(trips ?? []).map((trip) => (
            <div key={trip.id} className="card p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-[color:var(--ink)]">{trip.trip_name}</div>
                  <div className="text-xs text-[color:var(--muted)]">
                    {trip.mode.toUpperCase()} · {trip.journey_date}
                  </div>
                </div>
                <form action={deleteTrip}>
                  <input type="hidden" name="id" value={trip.id} />
                  <button type="submit" className="btn-secondary text-rose-300">Delete</button>
                </form>
              </div>

              <form action={updateTrip} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <input type="hidden" name="id" value={trip.id} />
                <TextInput name="trip_name" defaultValue={trip.trip_name} />
                <Select name="trip_kind" defaultValue={trip.trip_kind ?? "other"}>
                  <option value="outbound">Outbound</option>
                  <option value="return">Return</option>
                  <option value="other">Other</option>
                </Select>
                <TextInput name="journey_date" type="date" defaultValue={trip.journey_date} />
                <TextInput name="depart_at" type="datetime-local" defaultValue={toDateTimeLocal(trip.depart_at)} />
                <TextInput name="arrive_at" type="datetime-local" defaultValue={toDateTimeLocal(trip.arrive_at)} />
                <TextInput name="default_class_code" defaultValue={trip.default_class_code ?? ""} placeholder="Default class" />
                <TextInput name="quota_code" defaultValue={trip.quota_code ?? ""} placeholder="Quota" />

                {trip.mode === "train" ? (
                  <>
                    <Select name="train_master_id" defaultValue={trip.train_master_id ?? ""}>
                      <option value="">Train master (optional)</option>
                      {(trains ?? []).map((train) => (
                        <option key={train.id} value={train.id}>
                          {train.train_no} · {train.train_name}
                        </option>
                      ))}
                    </Select>
                    <TextInput name="train_no" defaultValue={trip.train_no ?? ""} placeholder="Train no" />
                    <TextInput name="train_name" defaultValue={trip.train_name ?? ""} placeholder="Train name" />
                    <TextInput name="from_station_code" defaultValue={trip.from_station_code ?? ""} placeholder="From station" />
                    <TextInput name="to_station_code" defaultValue={trip.to_station_code ?? ""} placeholder="To station" />
                  </>
                ) : (
                  <>
                    <TextInput name="airline_code" defaultValue={trip.airline_code ?? ""} placeholder="Airline code" />
                    <TextInput name="flight_no" defaultValue={trip.flight_no ?? ""} placeholder="Flight no" />
                    <TextInput name="from_airport_code" defaultValue={trip.from_airport_code ?? ""} placeholder="From airport" />
                    <TextInput name="to_airport_code" defaultValue={trip.to_airport_code ?? ""} placeholder="To airport" />
                  </>
                )}

                <button type="submit" className="btn-secondary sm:col-span-2 lg:col-span-4">
                  Save changes
                </button>
              </form>
            </div>
          ))}
          {trips?.length === 0 && (
            <div className="card p-6 text-center text-sm text-[color:var(--muted)]">
              No trips configured yet.
            </div>
          )}
        </div>
      </FormSection>
    </div>
  );
}

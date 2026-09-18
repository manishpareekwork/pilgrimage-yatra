import { requireStaff } from "@/lib/roleGuard";
import { getActionSupabase } from "@/lib/supabaseServer";
import { revalidatePath } from "next/cache";
import {
  YATRA_OUTBOUND_JOURNEY_DATE,
  YATRA_RETURN_JOURNEY_DATE,
  YATRA_TRAIN_NO,
} from "@/lib/tripDisplay";
import { MasterTripsClient } from "./MasterTripsClient";

const toText = (value: FormDataEntryValue | null) =>
  value ? value.toString().trim() : "";

const toOptional = (value: FormDataEntryValue | null) => {
  const text = toText(value);
  return text ? text : null;
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
  if (error) return;

  if (data) {
    const patch: Record<string, string> = {};
    if (defaultClassCode) patch.default_class_code = defaultClassCode;
    if (quotaCode) patch.quota_code = quotaCode;
    if (departAt) patch.depart_at = departAt;
    if (arriveAt) patch.arrive_at = arriveAt;

    if (tripKind === "return") {
      const { data: mt } = await supabase
        .from("master_trains")
        .select("train_name, source_station_code, destination_station_code")
        .eq("train_no", trainNo)
        .maybeSingle();
      if (mt?.source_station_code && mt.destination_station_code) {
        patch.from_station_code = mt.destination_station_code;
        patch.to_station_code = mt.source_station_code;
        patch.trip_name = `${trainNo} Return · ${mt.destination_station_code} → ${mt.source_station_code}`;
      }
    }

    if (Object.keys(patch).length > 0) {
      await supabase.from("yatra_trips").update(patch).eq("id", data);
    }
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
    await supabase.from("yatra_trips").update({ trip_kind: tripKind }).eq("id", data);
  }
  revalidatePath("/masters/trips");
}

async function updateTrip(formData: FormData) {
  "use server";
  const id = toText(formData.get("id"));
  if (!id) return;

  const supabase = await getActionSupabase();
  const payload: Record<string, string | null> = {
    trip_name: toOptional(formData.get("trip_name")),
    trip_kind: toOptional(formData.get("trip_kind")),
    journey_date: toOptional(formData.get("journey_date")),
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
  };

  const departAt = toOptional(formData.get("depart_at"));
  const arriveAt = toOptional(formData.get("arrive_at"));
  if (departAt) payload.depart_at = departAt;
  if (arriveAt) payload.arrive_at = arriveAt;

  await supabase.from("yatra_trips").update(payload).eq("id", id);
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

async function seedDefaultYatraTrips() {
  "use server";
  const supabase = await getActionSupabase();
  const legs = [
    { date: YATRA_OUTBOUND_JOURNEY_DATE, kind: "outbound" as const },
    { date: YATRA_RETURN_JOURNEY_DATE, kind: "return" as const },
  ];

  for (const leg of legs) {
    const { data: existing } = await supabase
      .from("yatra_trips")
      .select("id")
      .eq("train_no", YATRA_TRAIN_NO)
      .eq("journey_date", leg.date)
      .eq("trip_kind", leg.kind)
      .maybeSingle();

    if (existing?.id) continue;

    const { data: newId, error } = await supabase.rpc("admin_create_trip_from_master", {
      p_train_no: YATRA_TRAIN_NO,
      p_journey_date: leg.date,
      p_trip_kind: leg.kind,
    });
    if (error || !newId) continue;

    if (leg.kind === "return") {
      const { data: mt } = await supabase
        .from("master_trains")
        .select("train_name, source_station_code, destination_station_code")
        .eq("train_no", YATRA_TRAIN_NO)
        .maybeSingle();
      if (mt?.source_station_code && mt.destination_station_code) {
        await supabase
          .from("yatra_trips")
          .update({
            from_station_code: mt.destination_station_code,
            to_station_code: mt.source_station_code,
            trip_name: `${YATRA_TRAIN_NO} Return · ${mt.destination_station_code} → ${mt.source_station_code}`,
          })
          .eq("id", newId);
      }
    }
  }

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
    <MasterTripsClient
      trains={trains ?? []}
      trips={trips ?? []}
      errorMessage={error?.message}
      createTrainTrip={createTrainTrip}
      createFlightTrip={createFlightTrip}
      updateTrip={updateTrip}
      deleteTrip={deleteTrip}
      seedDefaultYatraTrips={seedDefaultYatraTrips}
    />
  );
}

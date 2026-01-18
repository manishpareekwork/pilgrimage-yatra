import Link from "next/link";
import { PageHeader, TextInput } from "@/components/ui";
import { FormStatusOverlay } from "@/components/GlobalLoading";
import { requireStaff } from "@/lib/roleGuard";
import { getActionSupabase } from "@/lib/supabaseServer";
import { revalidatePath } from "next/cache";
import { TrainCreateForm } from "./TrainCreateForm";

const toText = (value: FormDataEntryValue | null) =>
  value ? value.toString().trim() : "";

type StationOption = { code: string; name: string };

type TrainRow = {
  id: string;
  train_no: string;
  train_name: string;
  source_station_code: string;
  destination_station_code: string;
  typical_duration_minutes: number | null;
  created_at: string | null;
};

const formatDate = (value?: string | null) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleDateString();
};

const formatDuration = (minutes?: number | null) =>
  minutes ? `${minutes} min` : "—";

type TrainFormDefaults = {
  train_no?: string;
  train_name?: string;
  source_station_code?: string;
  source_station_name?: string;
  destination_station_code?: string;
  destination_station_name?: string;
  typical_duration_minutes?: number | null;
};

const TrainFields = ({ defaults }: { defaults?: TrainFormDefaults }) => (
  <>
    <TextInput
      name="train_no"
      placeholder="Train no (e.g., 20824)"
      required
      defaultValue={defaults?.train_no ?? ""}
    />
    <TextInput
      name="train_name"
      placeholder="Train name"
      required
      defaultValue={defaults?.train_name ?? ""}
    />
    <TextInput
      name="source_station_code"
      placeholder="Source station code (e.g., AII)"
      required
      defaultValue={defaults?.source_station_code ?? ""}
    />
    <TextInput
      name="source_station_name"
      placeholder="Source station name"
      required
      defaultValue={defaults?.source_station_name ?? ""}
    />
    <TextInput
      name="destination_station_code"
      placeholder="Destination station code (e.g., PURI)"
      required
      defaultValue={defaults?.destination_station_code ?? ""}
    />
    <TextInput
      name="destination_station_name"
      placeholder="Destination station name"
      required
      defaultValue={defaults?.destination_station_name ?? ""}
    />
    <TextInput
      name="typical_duration_minutes"
      type="number"
      min={0}
      placeholder="Duration (min)"
      defaultValue={defaults?.typical_duration_minutes ?? ""}
    />
  </>
);

async function createTrain(formData: FormData) {
  "use server";
  const trainNo = toText(formData.get("train_no"));
  const trainName = toText(formData.get("train_name"));
  const source = toText(formData.get("source_station_code")).toUpperCase();
  const sourceName = toText(formData.get("source_station_name"));
  const sourceArrive = toText(formData.get("source_arrive_time"));
  const sourceDepart = toText(formData.get("source_depart_time"));
  const destination = toText(formData.get("destination_station_code")).toUpperCase();
  const destinationName = toText(formData.get("destination_station_name"));
  const destinationArrive = toText(formData.get("destination_arrive_time"));
  const destinationDepart = toText(formData.get("destination_depart_time"));
  const duration = toText(formData.get("typical_duration_minutes"));
  if (
    !trainNo ||
    !trainName ||
    !source ||
    !sourceName ||
    !destination ||
    !destinationName ||
    !sourceArrive ||
    !sourceDepart ||
    !destinationArrive ||
    !destinationDepart
  ) {
    return;
  }

  const stopCodes = formData.getAll("stop_code").map((value) => toText(value).toUpperCase());
  const stopNames = formData.getAll("stop_name").map((value) => toText(value));
  const stopArrives = formData.getAll("stop_arrive_time").map((value) => toText(value));
  const stopDeparts = formData.getAll("stop_depart_time").map((value) => toText(value));

  const intermediateStops = [];
  for (let i = 0; i < stopCodes.length; i += 1) {
    const code = stopCodes[i] ?? "";
    const name = stopNames[i] ?? "";
    const arrive = stopArrives[i] ?? "";
    const depart = stopDeparts[i] ?? "";
    if (!code && !name && !arrive && !depart) continue;
    if (!code || !name || !arrive || !depart) return;
    intermediateStops.push({ code, name, arrive, depart });
  }

  const supabase = await getActionSupabase();
  const stationMap = new Map<string, string>();
  stationMap.set(source, sourceName);
  stationMap.set(destination, destinationName);
  intermediateStops.forEach((stop) => {
    stationMap.set(stop.code, stop.name);
  });

  const stationUpserts = Array.from(stationMap.entries()).map(([code, name]) => ({
    code,
    name,
  }));
  if (stationUpserts.length > 0) {
    const { error: stationError } = await supabase
      .from("master_stations")
      .upsert(stationUpserts, { onConflict: "code" });
    if (stationError) return;
  }

  const { error: trainError } = await supabase
    .from("master_trains")
    .insert({
      train_no: trainNo,
      train_name: trainName,
      source_station_code: source,
      destination_station_code: destination,
      typical_duration_minutes: duration ? Number(duration) : null,
    })
    .select("id")
    .single();
  if (trainError) return;

  const stopsPayload = [];
  let stopSeq = 1;
  stopsPayload.push({
    stop_seq: stopSeq,
    station_code: source,
    station_name: sourceName,
    arrive_time: sourceArrive,
    depart_time: sourceDepart,
  });
  stopSeq += 1;

  intermediateStops.forEach((stop) => {
    stopsPayload.push({
      stop_seq: stopSeq,
      station_code: stop.code,
      station_name: stop.name,
      arrive_time: stop.arrive,
      depart_time: stop.depart,
    });
    stopSeq += 1;
  });

  stopsPayload.push({
    stop_seq: stopSeq,
    station_code: destination,
    station_name: destinationName,
    arrive_time: destinationArrive,
    depart_time: destinationDepart,
  });

  await supabase.rpc("admin_upsert_train_stops", {
    p_train_no: trainNo,
    p_stops: stopsPayload,
  });
  revalidatePath("/masters/trains");
}

async function updateTrain(formData: FormData) {
  "use server";
  const id = toText(formData.get("id"));
  const trainNo = toText(formData.get("train_no"));
  const trainName = toText(formData.get("train_name"));
  const source = toText(formData.get("source_station_code")).toUpperCase();
  const sourceName = toText(formData.get("source_station_name"));
  const destination = toText(formData.get("destination_station_code")).toUpperCase();
  const destinationName = toText(formData.get("destination_station_name"));
  const duration = toText(formData.get("typical_duration_minutes"));
  if (!id || !trainNo || !trainName || !source || !destination) return;

  const supabase = await getActionSupabase();
  const stationUpserts = [];
  if (sourceName) stationUpserts.push({ code: source, name: sourceName });
  if (destinationName) stationUpserts.push({ code: destination, name: destinationName });
  if (stationUpserts.length > 0) {
    await supabase.from("master_stations").upsert(stationUpserts, { onConflict: "code" });
  }
  await supabase
    .from("master_trains")
    .update({
      train_no: trainNo,
      train_name: trainName,
      source_station_code: source,
      destination_station_code: destination,
      typical_duration_minutes: duration ? Number(duration) : null,
    })
    .eq("id", id);
  revalidatePath("/masters/trains");
}

async function deleteTrain(formData: FormData) {
  "use server";
  const id = toText(formData.get("id"));
  if (!id) return;

  const supabase = await getActionSupabase();
  await supabase.from("master_trains").delete().eq("id", id);
  revalidatePath("/masters/trains");
}

export default async function MasterTrainsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { supabase } = await requireStaff();
  const params = (await searchParams) ?? {};
  const queryParam = Array.isArray(params.q) ? params.q?.[0] : params.q;
  const q = queryParam?.trim() ?? "";

  let trainQuery = supabase
    .from("master_trains")
    .select(
      "id, train_no, train_name, source_station_code, destination_station_code, typical_duration_minutes, created_at"
    )
    .order("train_no");

  if (q) {
    trainQuery = trainQuery.or(
      `train_no.ilike.%${q}%,train_name.ilike.%${q}%,source_station_code.ilike.%${q}%,destination_station_code.ilike.%${q}%`
    );
  }

  const { data: trains, error } = await trainQuery;

  const { data: stations, error: stationError } = await supabase
    .from("master_stations")
    .select("code, name")
    .order("code");
  const stationOptions = (stations ?? []) as StationOption[];
  const stationLookup = new Map(
    stationOptions.map((station) => [station.code, station.name])
  );
  const trainCount = trains?.length ?? 0;

  return (
    <div id="trains" className="yatris-grid masters-trains flex flex-col gap-6">
      <PageHeader
        className="relative z-30 overflow-visible yatris-hero"
        title="Master Trains"
        subtitle="Manage train templates and default endpoints."
        actions={
          <div className="header-actions flex flex-wrap items-center gap-2">
            <a href="#train-create" className="btn-primary master-action inline-flex items-center">
              + Add train
            </a>
          </div>
        }
      />

      <div className="card relative z-20 p-6 space-y-4 overflow-visible filters-compact">
        <div className="space-y-3">
          <div className="flex flex-wrap items-end gap-2">
            <form method="get" className="flex flex-wrap items-end gap-2">
              <div className="w-full sm:w-72 lg:w-80">
                <TextInput
                  name="q"
                  placeholder="Search train no, name, or station"
                  defaultValue={q}
                />
              </div>
              <button type="submit" className="btn-secondary min-h-[36px]">
                Search
              </button>
            </form>
            {q && (
              <Link href="/masters/trains" className="btn-secondary min-h-[36px]">
                Clear search
              </Link>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[color:var(--muted)]">
            <span>
              {q ? `Results for "${q}"` : `Showing ${trainCount} trains`}
            </span>
            {stationError && <span className="text-rose-300">Station list unavailable.</span>}
          </div>
        </div>
      </div>

      <div className="space-y-4 p-2">
        {error && (
          <div className="card px-4 py-3 text-sm text-rose-200 border border-rose-500/40 bg-rose-950/30">
            {error.message}
          </div>
        )}
        {!error && trainCount === 0 && (
          <div className="card p-6 text-center">
            <div className="text-lg font-semibold text-[color:var(--ink)]">No trains found</div>
            <p className="mt-2 text-sm text-[color:var(--muted)]">
              Add a master train to start defining routes.
            </p>
          </div>
        )}

        {!error && trainCount > 0 && (
          <div className="card rounded-none overflow-visible p-2">
            <div className="overflow-x-auto overflow-y-visible p-2">
              <table className="min-w-full bg-[color:var(--surface)] text-[12px] text-center">
                <thead className="sticky top-0 bg-[color:var(--surface-muted)] text-[11px] font-semibold text-[color:var(--muted)] border-b border-[color:var(--border)]">
                  <tr>
                    <th className="h-[45px] px-4 py-0 align-middle text-center">Train No</th>
                    <th className="h-[45px] px-4 py-0 align-middle text-center border-l border-[color:var(--border)]/60">
                      Name
                    </th>
                    <th className="h-[45px] px-4 py-0 align-middle text-center border-l border-[color:var(--border)]/60">
                      Source
                    </th>
                    <th className="h-[45px] px-4 py-0 align-middle text-center border-l border-[color:var(--border)]/60">
                      Destination
                    </th>
                    <th className="h-[45px] px-4 py-0 align-middle text-center border-l border-[color:var(--border)]/60">
                      Duration
                    </th>
                    <th className="h-[45px] px-4 py-0 align-middle text-center border-l border-[color:var(--border)]/60">
                      Created
                    </th>
                    <th className="h-[45px] px-4 py-0 align-middle text-center border-l border-[color:var(--border)]/60">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--border)] bg-[color:var(--surface)]">
                  {(trains ?? []).map((train) => (
                    <tr
                      key={train.id}
                      className="odd:bg-[color:var(--surface-muted)]/35 even:bg-[color:var(--surface)] hover:bg-[color:var(--surface-muted)]/60"
                    >
                      <td className="px-4 py-2.5 align-middle text-center font-semibold text-[color:var(--ink)]">
                        {train.train_no}
                      </td>
                      <td className="px-4 py-2.5 align-middle text-center border-l border-[color:var(--border)]/60">
                        {train.train_name}
                      </td>
                      <td className="px-4 py-2.5 align-middle text-center border-l border-[color:var(--border)]/60 text-[color:var(--muted)]">
                        {train.source_station_code}
                      </td>
                      <td className="px-4 py-2.5 align-middle text-center border-l border-[color:var(--border)]/60 text-[color:var(--muted)]">
                        {train.destination_station_code}
                      </td>
                      <td className="px-4 py-2.5 align-middle text-center border-l border-[color:var(--border)]/60 text-[color:var(--muted)]">
                        {formatDuration(train.typical_duration_minutes)}
                      </td>
                      <td className="px-4 py-2.5 align-middle text-center border-l border-[color:var(--border)]/60 text-[color:var(--muted)]">
                        {formatDate(train.created_at)}
                      </td>
                      <td className="px-4 py-2.5 align-middle text-center border-l border-[color:var(--border)]/60">
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          <a
                            href={`#train-view-${train.id}`}
                            className="btn-secondary master-action"
                          >
                            View
                          </a>
                          <a
                            href={`#train-edit-${train.id}`}
                            className="btn-secondary master-action"
                          >
                            Edit
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div id="train-create" className="master-modal">
          <a href="#trains" className="master-modal__overlay" aria-label="Close" />
          <div className="master-modal__content card p-3" style={{ padding: "12px" }}>
            <div className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted)]">
              New train
            </div>
            <TrainCreateForm onCreate={createTrain} />
          </div>
        </div>

        {(trains ?? []).map((train) => (
          <div key={`train-view-${train.id}`} id={`train-view-${train.id}`} className="master-modal">
            <a href="#trains" className="master-modal__overlay" aria-label="Close" />
            <div className="master-modal__content card p-3" style={{ padding: "12px" }}>
              <div className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted)]">
                Train details
              </div>
              <div
                className="mt-3 space-y-3 text-sm text-[color:var(--ink)]"
                style={{ marginBottom: "12px" }}
              >
                <div>
                  <div className="text-xs text-[color:var(--muted)]">Train</div>
                  <div className="font-semibold">
                    {train.train_no} · {train.train_name}
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-[color:var(--muted)]">
                  <span>Source</span>
                  <span>
                    {train.source_station_code}
                    {stationLookup.get(train.source_station_code)
                      ? ` · ${stationLookup.get(train.source_station_code)}`
                      : ""}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-[color:var(--muted)]">
                  <span>Destination</span>
                  <span>
                    {train.destination_station_code}
                    {stationLookup.get(train.destination_station_code)
                      ? ` · ${stationLookup.get(train.destination_station_code)}`
                      : ""}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-[color:var(--muted)]">
                  <span>Duration</span>
                  <span>{formatDuration(train.typical_duration_minutes)}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-[color:var(--muted)]">
                  <span>Created</span>
                  <span>{formatDate(train.created_at)}</span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <a href="#trains" className="btn-secondary master-action w-full">
                  Close
                </a>
              </div>
            </div>
          </div>
        ))}

        {(trains ?? []).map((train) => (
          <div key={`train-edit-${train.id}`} id={`train-edit-${train.id}`} className="master-modal">
            <a href="#trains" className="master-modal__overlay" aria-label="Close" />
            <div className="master-modal__content card p-3" style={{ padding: "12px" }}>
              <a href="#trains" className="master-modal__close" aria-label="Close">
                ×
              </a>
              <div className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted)]">
                Edit train
              </div>
              <form action={updateTrain} className="mt-3 grid gap-3">
                <FormStatusOverlay message="Saving train..." />
                <input type="hidden" name="id" value={train.id} />
                <TrainFields
                  defaults={{
                    train_no: train.train_no,
                    train_name: train.train_name,
                    source_station_code: train.source_station_code,
                    source_station_name: stationLookup.get(train.source_station_code) ?? "",
                    destination_station_code: train.destination_station_code,
                    destination_station_name:
                      stationLookup.get(train.destination_station_code) ?? "",
                    typical_duration_minutes: train.typical_duration_minutes ?? null,
                  }}
                />
                <div className="mt-2 flex items-center justify-end gap-2">
                  <button type="submit" className="btn-secondary master-action">
                    Save changes
                  </button>
                  <button
                    type="submit"
                    form={`train-delete-${train.id}`}
                    className="btn-secondary master-action text-rose-300"
                  >
                    Delete train
                  </button>
                </div>
              </form>
              <form action={deleteTrain} id={`train-delete-${train.id}`}>
                <FormStatusOverlay message="Deleting train..." />
                <input type="hidden" name="id" value={train.id} />
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

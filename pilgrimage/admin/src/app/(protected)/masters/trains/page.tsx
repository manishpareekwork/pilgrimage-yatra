import Link from "next/link";
import { PageHeader, FormSection, Select, TextInput } from "@/components/ui";
import { requireStaff } from "@/lib/roleGuard";
import { getActionSupabase } from "@/lib/supabaseServer";
import { revalidatePath } from "next/cache";

const toText = (value: FormDataEntryValue | null) =>
  value ? value.toString().trim() : "";

async function createTrain(formData: FormData) {
  "use server";
  const trainNo = toText(formData.get("train_no"));
  const trainName = toText(formData.get("train_name"));
  const source = toText(formData.get("source_station_code")).toUpperCase();
  const destination = toText(formData.get("destination_station_code")).toUpperCase();
  const duration = toText(formData.get("typical_duration_minutes"));
  if (!trainNo || !trainName || !source || !destination) return;

  const supabase = await getActionSupabase();
  await supabase.from("master_trains").insert({
    train_no: trainNo,
    train_name: trainName,
    source_station_code: source,
    destination_station_code: destination,
    typical_duration_minutes: duration ? Number(duration) : null,
  });
  revalidatePath("/masters/trains");
}

async function updateTrain(formData: FormData) {
  "use server";
  const id = toText(formData.get("id"));
  const trainNo = toText(formData.get("train_no"));
  const trainName = toText(formData.get("train_name"));
  const source = toText(formData.get("source_station_code")).toUpperCase();
  const destination = toText(formData.get("destination_station_code")).toUpperCase();
  const duration = toText(formData.get("typical_duration_minutes"));
  if (!id || !trainNo || !trainName || !source || !destination) return;

  const supabase = await getActionSupabase();
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

export default async function MasterTrainsPage() {
  const { supabase } = await requireStaff();
  const { data: trains, error } = await supabase
    .from("master_trains")
    .select("id, train_no, train_name, source_station_code, destination_station_code, typical_duration_minutes, created_at")
    .order("train_no");

  const { data: stations } = await supabase
    .from("master_stations")
    .select("code, name")
    .order("code");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Master Trains"
        subtitle="Manage train templates and default endpoints."
      />

      <FormSection title="Add train">
        <form action={createTrain} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_2fr_1fr_1fr_1fr_auto]">
          <TextInput name="train_no" placeholder="Train no (e.g., 20824)" required />
          <TextInput name="train_name" placeholder="Train name" required />
          <Select name="source_station_code" required>
            <option value="">Source station</option>
            {(stations ?? []).map((station) => (
              <option key={station.code} value={station.code}>
                {station.code} · {station.name}
              </option>
            ))}
          </Select>
          <Select name="destination_station_code" required>
            <option value="">Destination station</option>
            {(stations ?? []).map((station) => (
              <option key={station.code} value={station.code}>
                {station.code} · {station.name}
              </option>
            ))}
          </Select>
          <TextInput name="typical_duration_minutes" type="number" min={0} placeholder="Duration (min)" />
          <button type="submit" className="btn-primary">Add</button>
        </form>
      </FormSection>

      <FormSection title="Existing trains" description="Update or remove train masters.">
        {error && (
          <div className="mb-4 rounded-xl border border-rose-500/40 bg-rose-950/40 p-3 text-sm text-rose-200">
            {error.message}
          </div>
        )}
        <div className="overflow-hidden rounded-xl border border-slate-800/60">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-900 text-left text-xs font-semibold uppercase text-slate-300">
              <tr>
                <th className="px-4 py-3">Train</th>
                <th className="px-4 py-3">Endpoints</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {(trains ?? []).map((train) => (
                <tr key={train.id} className="hover:bg-slate-900/40">
                  <td className="px-4 py-3">
                    <form action={updateTrain} className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="id" value={train.id} />
                      <TextInput name="train_no" defaultValue={train.train_no} required />
                      <TextInput name="train_name" defaultValue={train.train_name} required />
                      <Select name="source_station_code" defaultValue={train.source_station_code} required>
                        {(stations ?? []).map((station) => (
                          <option key={station.code} value={station.code}>
                            {station.code}
                          </option>
                        ))}
                      </Select>
                      <Select name="destination_station_code" defaultValue={train.destination_station_code} required>
                        {(stations ?? []).map((station) => (
                          <option key={station.code} value={station.code}>
                            {station.code}
                          </option>
                        ))}
                      </Select>
                      <TextInput
                        name="typical_duration_minutes"
                        type="number"
                        min={0}
                        defaultValue={train.typical_duration_minutes ?? ""}
                        placeholder="Duration"
                      />
                      <button type="submit" className="btn-secondary">Save</button>
                      <Link href={`/masters/train-stops?train_no=${train.train_no}`} className="btn-secondary">
                        Stops
                      </Link>
                    </form>
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {train.source_station_code} → {train.destination_station_code}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {train.typical_duration_minutes ? `${train.typical_duration_minutes} min` : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {new Date(train.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <form action={deleteTrain}>
                      <input type="hidden" name="id" value={train.id} />
                      <button type="submit" className="btn-secondary text-rose-300">Delete</button>
                    </form>
                  </td>
                </tr>
              ))}
              {trains?.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                    No trains yet.
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

import { PageHeader } from "@/components/ui";
import { requireStaff } from "@/lib/roleGuard";
import { TrainStopsClient } from "./TrainStopsClient";

export default async function MasterTrainStopsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { supabase } = await requireStaff();
  const params = (await searchParams) ?? {};
  const trainParam = Array.isArray(params.train_no)
    ? params.train_no?.[0]
    : params.train_no;

  const { data: trains, error } = await supabase
    .from("master_trains")
    .select("id, train_no, train_name")
    .order("train_no");

  const initialTrain = trains?.find((train) => train.train_no === trainParam);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Master Train Stops"
        subtitle="Manage stop sequences, timings, and bulk imports."
      />

      {error && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-950/40 p-3 text-sm text-rose-200">
          {error.message}
        </div>
      )}

      {!error && (!trains || trains.length === 0) && (
        <div className="card p-6 text-center text-sm text-[color:var(--muted)]">
          No master trains available. Create a train first.
        </div>
      )}

      {trains && trains.length > 0 && (
        <TrainStopsClient
          trains={trains}
          initialTrainId={initialTrain?.id ?? trains[0].id}
        />
      )}
    </div>
  );
}

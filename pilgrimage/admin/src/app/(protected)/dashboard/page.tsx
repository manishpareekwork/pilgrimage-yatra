import { getServerSupabase } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import Link from "next/link";

const statusLabels = [
  { key: "submitted", label: "Submitted" },
  { key: "needs_review", label: "Needs Review" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
] as const;

const statusColors: Record<string, string> = {
  submitted: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  needs_review: "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300",
  approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  rejected: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",
};

export default async function DashboardPage() {
  const supabase = await getServerSupabase();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) redirect("/login");

  let errorMessage: string | null = null;
  let allCount = 0;
  const totals: { key: string; label: string; count: number }[] = [];

  try {
    const { count: totalCount, error: allError } = await supabase
      .from("yatra_registrations")
      .select("id", { count: "exact", head: true });
    if (allError) throw allError;
    allCount = totalCount ?? 0;

    for (const { key, label } of statusLabels) {
      const { count, error } = await supabase
        .from("yatra_registrations")
        .select("id", { count: "exact", head: true })
        .eq("status", key);
      if (error) throw error;
      totals.push({ key, label, count: count ?? 0 });
    }
  } catch (err: any) {
    errorMessage = err?.message || "Unable to load dashboard data.";
  }

  const isConnected = !errorMessage;
  const dbLabel = isConnected ? "Database connected" : "Database disconnected";
  const dbDot = isConnected ? "bg-emerald-400" : "bg-rose-400";

  const showHeroCta = errorMessage || allCount > 0;

  return (
    <div>
      <section
        className="card card--hover dashboard-hero min-h-[200px]"
        style={{ backgroundImage: "url('/banner.png')", padding: "12px" }}
      >
        <div className="grid min-h-[200px] grid-rows-2 gap-4">
          <div className="flex flex-col items-start justify-start gap-4 sm:flex-row sm:items-start sm:justify-between">
            <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
            <span className="pill pill--contrast pill--wide sm:self-start">
              <span className={`h-2 w-2 rounded-full ${dbDot}`} />
              {dbLabel}
            </span>
          </div>

          <div className="flex flex-col items-start justify-end gap-4 sm:flex-row sm:items-end sm:justify-between">
            <span className="pill pill--contrast pill--metric pill--wide">
              <span className="pill__metric">{allCount}</span>
              <span>Total registrations</span>
            </span>
            {showHeroCta && (
              <Link
                href="/yatris/new"
                className="pill pill--contrast pill--metric pill--wide pill--clickable pill--cta inline-flex items-center"
              >
                <span className="pill__metric">+</span>
                <span>New Registration</span>
              </Link>
            )}
          </div>
        </div>
      </section>

      <div style={{ height: "24px" }} aria-hidden="true" />

      <div className="space-y-10">
        {errorMessage && (
          <section className="card border border-rose-400/40 bg-rose-500/10 p-6">
            <div className="text-sm text-rose-700 dark:text-rose-200">
              Failed to load: {errorMessage}
            </div>
          </section>
        )}

        {!errorMessage && allCount === 0 && (
          <section className="card card--hover p-6">
            <div className="space-y-4 text-sm text-[color:var(--muted)]">
              <p>No registrations yet.</p>
              <Link
                href="/yatris/new"
                className="btn-secondary inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm"
              >
                + New Registration
              </Link>
            </div>
          </section>
        )}

        {!errorMessage && (
          <div className="flex flex-wrap gap-6">
            {statusLabels.map(({ key, label }) => {
              const count = totals.find((t) => t.key === key)?.count ?? 0;
              const pct = Math.min(100, allCount ? (count / allCount) * 100 : 0);
              return (
                <section
                  key={key}
                  className="card card--hover overflow-hidden w-full flex-none sm:w-[200px] lg:w-[220px]"
                  style={{ padding: "12px" }}
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-baseline gap-2">
                        <div className="text-2xl font-semibold text-[color:var(--ink)]">
                          {count}
                        </div>
                        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
                          {label}
                        </div>
                      </div>
                      <div className="rounded-full bg-[color:var(--surface-muted)] px-2 py-1 text-[10px] font-semibold text-[color:var(--muted)]">
                        {pct.toFixed(0)}%
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="h-1.5 w-full overflow-hidden rounded-md border border-[color:var(--border)] bg-[color:var(--surface-muted)]">
                        <div
                          className="h-full rounded-md bg-[color:var(--accent)]"
                          style={{ width: `${pct.toFixed(0)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-end gap-2 rounded-md bg-[color:var(--surface-muted)] px-2 py-1.5">
                        <button
                          type="button"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[color:var(--border)] text-[color:var(--muted)] hover:bg-[color:var(--surface)] hover:text-[color:var(--ink)]"
                          aria-label={`View ${label}`}
                        >
                          <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                            <path
                              d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.6"
                            />
                            <circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[color:var(--border)] text-[color:var(--muted)] hover:bg-[color:var(--surface)] hover:text-[color:var(--ink)]"
                          aria-label={`Edit ${label}`}
                        >
                          <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                            <path
                              d="M4 16.5V20h3.5L18.3 9.2l-3.5-3.5L4 16.5Z"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.6"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M14.8 5.7l3.5 3.5"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.6"
                              strokeLinecap="round"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

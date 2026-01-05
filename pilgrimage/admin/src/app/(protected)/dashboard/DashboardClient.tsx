"use client";

import { useEffect, useMemo, useState } from "react";
import { Select } from "@/components/ui";

type DashboardMetrics = {
  registrations: { total: number; avg_per_day: number | null };
  groups: { total: number };
  bookings: { total: number; status: { open: number; in_progress: number; done: number } };
  hotels: { total: number; rooms: number; capacity: number; occupied: number; vacant: number };
  volunteers: { roles: number; assignments: number; leads: number };
  trips: { total: number };
};

type DashboardSeries = {
  registrationsByDay: Array<{ date: string; total: number }>;
  travelModes: { train: number; air: number; unknown: number };
  series_window_days: number;
};

type DashboardResponse = {
  connected: boolean;
  errors?: string[];
  range: string;
  mode: string;
  metrics: DashboardMetrics;
  series: DashboardSeries;
};

const rangeOptions = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "all", label: "All time" },
];

const modeOptions = [
  { value: "all", label: "All travel modes" },
  { value: "train", label: "Train only" },
  { value: "air", label: "Air only" },
];

const formatNumber = (value: number) => new Intl.NumberFormat("en-IN").format(value);

export function DashboardClient() {
  const [range, setRange] = useState("30d");
  const [mode, setMode] = useState("all");
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async (nextRange = range, nextMode = mode) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/dashboard?range=${nextRange}&mode=${nextMode}`, {
        cache: "no-store",
      });
      const payload = (await res.json()) as DashboardResponse & { error?: string };
      if (!res.ok) {
        throw new Error(payload.error || "Unable to load dashboard data.");
      }
      setData(payload);
    } catch (err: any) {
      setError(err?.message || "Unable to load dashboard data.");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const trend = data?.series.registrationsByDay ?? [];
  const maxTrend = useMemo(() => Math.max(...trend.map((item) => item.total), 1), [trend]);
  const travelModeTotal = (data?.series.travelModes.train ?? 0) +
    (data?.series.travelModes.air ?? 0) +
    (data?.series.travelModes.unknown ?? 0);

  const dbConnected = data?.connected ?? false;
  const dbLabel = dbConnected ? "Database connected" : "Database disconnected";
  const dbDot = dbConnected ? "bg-emerald-400" : "bg-rose-400";

  return (
    <div className="space-y-6">
      <section
        className="card card--hover dashboard-hero min-h-[220px]"
        style={{ backgroundImage: "url('/banner.png')", padding: "12px" }}
      >
        <div className="grid min-h-[220px] gap-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-white">Analytics Dashboard</h1>
              <p className="mt-2 text-sm text-white/80">
                Live operational signals across registrations, trips, and stays.
              </p>
            </div>
            <span className="pill pill--contrast pill--wide sm:self-start">
              <span className={`h-2 w-2 rounded-full ${dbDot}`} />
              {dbLabel}
            </span>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <Select
                value={range}
                onChange={(event) => {
                  const nextRange = event.target.value;
                  setRange(nextRange);
                  void loadData(nextRange, mode);
                }}
                className="min-h-[36px] bg-white/90 text-[color:var(--ink)] shadow-sm"
              >
                {rangeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
              <Select
                value={mode}
                onChange={(event) => {
                  const nextMode = event.target.value;
                  setMode(nextMode);
                  void loadData(range, nextMode);
                }}
                className="min-h-[36px] bg-white/90 text-[color:var(--ink)] shadow-sm"
              >
                {modeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
            <span className="pill pill--contrast pill--metric pill--wide">
              <span className="pill__metric">
                {loading ? "…" : formatNumber(data?.metrics.registrations.total ?? 0)}
              </span>
              <span>Total registrations</span>
            </span>
          </div>
        </div>
      </section>

      {error && (
        <section className="card dashboard-card border border-rose-400/40 bg-rose-500/10 p-3">
          <div className="text-sm text-rose-700 dark:text-rose-200">
            Failed to load: {error}
          </div>
        </section>
      )}

      {data && (
        <div className="grid gap-4 lg:grid-cols-3">
          <section className="card dashboard-card p-3 space-y-3">
            <div className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
              Pipeline
            </div>
            <div className="text-2xl font-semibold text-[color:var(--ink)]">
              {formatNumber(data.metrics.registrations.total)}
            </div>
            <div className="text-xs text-[color:var(--muted)]">
              Avg / day: {data.metrics.registrations.avg_per_day ?? "—"}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-[color:var(--muted)]">
              <span>{formatNumber(data.metrics.groups.total)} groups</span>
              <span>·</span>
              <span>{formatNumber(data.metrics.trips.total)} trips</span>
            </div>
          </section>

          <section className="card dashboard-card p-3 space-y-3">
            <div className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
              Bookings
            </div>
            <div className="text-2xl font-semibold text-[color:var(--ink)]">
              {formatNumber(data.metrics.bookings.total)}
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs text-[color:var(--muted)]">
              <div className="rounded-lg bg-[color:var(--surface-muted)] px-2 py-2 text-center">
                <div className="text-sm font-semibold text-[color:var(--ink)]">
                  {formatNumber(data.metrics.bookings.status.open)}
                </div>
                <div>Open</div>
              </div>
              <div className="rounded-lg bg-[color:var(--surface-muted)] px-2 py-2 text-center">
                <div className="text-sm font-semibold text-[color:var(--ink)]">
                  {formatNumber(data.metrics.bookings.status.in_progress)}
                </div>
                <div>In progress</div>
              </div>
              <div className="rounded-lg bg-[color:var(--surface-muted)] px-2 py-2 text-center">
                <div className="text-sm font-semibold text-[color:var(--ink)]">
                  {formatNumber(data.metrics.bookings.status.done)}
                </div>
                <div>Done</div>
              </div>
            </div>
          </section>

          <section className="card dashboard-card p-3 space-y-3">
            <div className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
              Stays
            </div>
            <div className="text-2xl font-semibold text-[color:var(--ink)]">
              {formatNumber(data.metrics.hotels.occupied)} / {formatNumber(data.metrics.hotels.capacity)}
            </div>
            <div className="text-xs text-[color:var(--muted)]">
              {formatNumber(data.metrics.hotels.total)} hotels · {formatNumber(data.metrics.hotels.rooms)} rooms
            </div>
            <div className="flex items-center gap-2 text-xs text-[color:var(--muted)]">
              <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-700">
                Vacant {formatNumber(data.metrics.hotels.vacant)}
              </span>
              <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-700">
                Occupied {formatNumber(data.metrics.hotels.occupied)}
              </span>
            </div>
          </section>

          <section className="card dashboard-card p-3 space-y-3 lg:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
                  Registration trend
                </div>
                <div className="text-sm text-[color:var(--muted)]">
                  Last {data.series.series_window_days} days
                </div>
              </div>
              <div className="text-xs text-[color:var(--muted)]">
                {loading ? "Updating..." : "Updated just now"}
              </div>
            </div>
            <div className="grid h-32 grid-cols-[repeat(auto-fit,minmax(10px,1fr))] items-end gap-1">
              {trend.map((item) => (
                <div key={item.date} className="flex flex-col items-center gap-1">
                  <div
                    className="w-full rounded-md bg-[color:var(--accent)]/80"
                    style={{ height: `${(item.total / maxTrend) * 100}%` }}
                    title={`${item.date}: ${item.total}`}
                  />
                </div>
              ))}
            </div>
          </section>

          <section className="card dashboard-card p-3 space-y-4">
            <div className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
              Travel split
            </div>
            <div className="space-y-3 text-sm">
              {[
                { label: "Train", value: data.series.travelModes.train, color: "bg-sky-400" },
                { label: "Air", value: data.series.travelModes.air, color: "bg-amber-400" },
                { label: "Unspecified", value: data.series.travelModes.unknown, color: "bg-slate-300" },
              ].map((item) => {
                const pct = travelModeTotal
                  ? Math.round((item.value / travelModeTotal) * 100)
                  : 0;
                return (
                  <div key={item.label} className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-[color:var(--muted)]">
                      <span>{item.label}</span>
                      <span>
                        {formatNumber(item.value)} · {pct}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[color:var(--surface-muted)]">
                      <div
                        className={`h-full ${item.color}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="rounded-lg bg-[color:var(--surface-muted)] px-3 py-2 text-xs text-[color:var(--muted)]">
              {formatNumber(data.metrics.volunteers.assignments)} volunteer assignments ·{" "}
              {formatNumber(data.metrics.volunteers.leads)} leads
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

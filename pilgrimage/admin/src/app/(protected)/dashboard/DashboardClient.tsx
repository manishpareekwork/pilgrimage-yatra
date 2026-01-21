"use client";

import { useEffect, useState } from "react";
import { useGlobalLoading } from "@/components/GlobalLoading";

type DashboardMetrics = {
  registrations: { total: number };
  hotels: { total: number };
  rooms: { total: number };
  reservations: {
    total: number;
    self: number;
    committee: number;
    pending_self: number;
    pending_committee: number;
  };
};

type DashboardResponse = {
  connected: boolean;
  errors?: string[];
  metrics: DashboardMetrics;
};

const formatNumber = (value: number) => new Intl.NumberFormat("en-IN").format(value);

export function DashboardClient() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { startLoading } = useGlobalLoading();

  const loadData = async () => {
    setLoading(true);
    setError(null);
    const stopLoading = startLoading("Loading dashboard...");
    try {
      const res = await fetch("/api/admin/dashboard", { cache: "no-store" });
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
      stopLoading();
    }
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const metrics = data?.metrics;
  const displayValue = (value?: number) => {
    if (!data) return loading ? "..." : "--";
    return loading ? "..." : formatNumber(value ?? 0);
  };

  const dbConnected = data?.connected ?? false;
  const dbLabel = dbConnected ? "Database connected" : "Database disconnected";
  const dbDot = dbConnected ? "bg-emerald-400" : "bg-rose-400";

  const cards = [
    {
      title: "Registrations",
      value: displayValue(metrics?.registrations.total),
      detail: "All time",
    },
    {
      title: "Hotels",
      value: displayValue(metrics?.hotels.total),
      detail: "Total properties",
    },
    {
      title: "Rooms",
      value: displayValue(metrics?.rooms.total),
      detail: "Total rooms",
    },
    {
      title: "Reservations so far",
      value: displayValue(metrics?.reservations.total),
      detail: "Data available",
    },
    {
      title: "Reservations self",
      value: displayValue(metrics?.reservations.self),
      detail: "Data available",
    },
    {
      title: "Reservations committee",
      value: displayValue(metrics?.reservations.committee),
      detail: "Data available",
    },
    {
      title: "Pending self",
      value: displayValue(metrics?.reservations.pending_self),
      detail: "Data missing",
    },
    {
      title: "Pending committee",
      value: displayValue(metrics?.reservations.pending_committee),
      detail: "Data missing",
    },
  ];

  return (
    <div className="space-y-6">
      <section
        className="card card--hover dashboard-hero min-h-[220px]"
        style={{
          backgroundImage: "url('/banner.png')",
          backgroundSize: "cover",
          backgroundPosition: "top center",
          padding: "12px",
        }}
      >
        <div className="grid min-h-[220px] gap-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-white">Analytics Dashboard</h1>
              <p className="mt-2 text-sm text-white/80">
                Live snapshot across registrations, reservations, and lodging.
              </p>
            </div>
            <span className="pill pill--contrast pill--wide sm:self-start">
              <span className={`h-2 w-2 rounded-full ${dbDot}`} />
              {dbLabel}
            </span>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="pill pill--contrast pill--metric pill--wide">
                <span className="pill__metric">
                  {displayValue(metrics?.registrations.total)}
                </span>
                <span>Total registrations</span>
              </span>
              <span className="pill pill--contrast pill--metric pill--wide">
                <span className="pill__metric">
                  {displayValue(metrics?.reservations.total)}
                </span>
                <span>Reservations logged</span>
              </span>
            </div>
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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <section key={card.title} className="card dashboard-card p-3 space-y-2">
            <div className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted)]">
              {card.title}
            </div>
            <div className="text-xl font-semibold text-[color:var(--ink)]">
              {card.value}
            </div>
            <div className="text-[11px] text-[color:var(--muted)]">{card.detail}</div>
          </section>
        ))}
      </div>
    </div>
  );
}

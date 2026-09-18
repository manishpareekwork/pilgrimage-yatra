"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { QuickActionsBar } from "@/components/layout/QuickActionsBar";
import { FormSection } from "@/components/ui";
import { useGlobalLoading } from "@/components/GlobalLoading";

type DashboardMetrics = {
  registrations: { total: number };
  hotels: { total: number };
  rooms: { total: number };
  categories: { total: number };
  reservations: {
    total: number;
    self: number;
    committee: number;
    pending_self: number;
    pending_committee: number;
  };
  train: {
    registrations: number;
    groups: number;
    group_target: number;
    group_gap: number;
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to load dashboard data.");
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
    if (!data) return loading ? "…" : "—";
    return loading ? "…" : formatNumber(value ?? 0);
  };

  const dbConnected = data?.connected ?? false;

  const statCards = [
    { label: "Registrations", value: displayValue(metrics?.registrations.total), hint: "All yatris" },
    {
      label: "Train + committee",
      value: displayValue(metrics?.reservations.committee),
      hint: "CM257-eligible pool",
    },
    {
      label: "Train yatris",
      value: displayValue(metrics?.train.registrations),
      hint: "Travel mode train",
    },
    {
      label: "Co-travel groups",
      value: displayValue(metrics?.train.groups),
      hint: `Gap ${displayValue(metrics?.train.group_gap)} vs target`,
    },
    {
      label: "Pending reservations",
      value: displayValue(
        (metrics?.reservations.pending_self ?? 0) + (metrics?.reservations.pending_committee ?? 0)
      ),
      hint: "Needs booking data",
    },
    { label: "Hotels / rooms", value: displayValue(metrics?.hotels.total), hint: `${displayValue(metrics?.rooms.total)} rooms` },
  ];

  return (
    <div className="page-stack">
      <section
        className="card dashboard-hero min-h-[200px] p-8 sm:p-10"
        style={{
          backgroundImage: "url('/banner.png')",
          backgroundSize: "cover",
          backgroundPosition: "top center",
        }}
      >
        <div className="relative z-[1] flex flex-col gap-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/85">Staff home</p>
              <h1 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">Pilgrimage operations</h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/80">
                Register yatris, set committee train reservations, build groups, and print CM257 forms for the
                counter.
              </p>
            </div>
            <span className="pill pill--contrast pill--wide">
              <span className={`h-2 w-2 rounded-full ${dbConnected ? "bg-emerald-400" : "bg-rose-400"}`} />
              {dbConnected ? "Database connected" : "Database disconnected"}
            </span>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/yatris/new" className="ops-hero__cta">
              New registration
            </Link>
            <Link href="/bookings/committee-train" className="ops-hero__link">
              Train booking guide
            </Link>
          </div>
        </div>
      </section>

      <FormSection title="Quick actions" description="Jump to the task you need — no hunting through menus.">
        <QuickActionsBar />
      </FormSection>

      {error && (
        <section className="card border border-rose-400/40 bg-rose-500/10 p-5 text-sm text-rose-800 dark:text-rose-200">
          Failed to load metrics: {error}
        </section>
      )}

      <section className="ops-section">
        <div className="ops-section__header">
          <h2 className="ops-section__title">Live metrics</h2>
          <p className="ops-section__desc">Snapshot from Supabase — refresh the page to update.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {statCards.map((card) => (
            <div key={card.label} className="card dashboard-card space-y-2">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
                {card.label}
              </div>
              <div className="text-2xl font-semibold text-[color:var(--ink)]">{card.value}</div>
              <div className="text-sm text-[color:var(--muted)]">{card.hint}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

import Link from "next/link";
import { requireStaff } from "@/lib/roleGuard";

const iconSize = 16;

const cards = [
  {
    title: "Stations",
    description: "Manage master railway stations used in routes.",
    href: "/masters/stations",
    accent: "#38bdf8",
    background: "radial-gradient(circle at top right, rgba(56, 189, 248, 0.2), transparent 60%)",
    icon: (
      <svg viewBox="0 0 24 24" width={iconSize} height={iconSize} aria-hidden="true">
        <path
          d="M12 22s7-6 7-12a7 7 0 1 0-14 0c0 6 7 12 7 12Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <circle cx="12" cy="10" r="2.6" fill="none" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    ),
  },
  {
    title: "Trains",
    description: "Manage train templates and default routes.",
    href: "/masters/trains",
    accent: "#f59e0b",
    background: "radial-gradient(circle at top right, rgba(245, 158, 11, 0.2), transparent 60%)",
    icon: (
      <svg viewBox="0 0 24 24" width={iconSize} height={iconSize} aria-hidden="true">
        <path
          d="M6 3h12a2 2 0 0 1 2 2v9a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V5a2 2 0 0 1 2-2Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <path d="M6 11h12" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M8 18l-2.5 3" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M16 18l2.5 3" fill="none" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    ),
  },
  {
    title: "Train Stops",
    description: "Edit train stop sequences and schedules.",
    href: "/masters/train-stops",
    accent: "#22c55e",
    background: "radial-gradient(circle at top right, rgba(34, 197, 94, 0.2), transparent 60%)",
    icon: (
      <svg viewBox="0 0 24 24" width={iconSize} height={iconSize} aria-hidden="true">
        <path d="M5 6h14M5 12h14M5 18h14" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="8" cy="6" r="1.5" fill="currentColor" />
        <circle cx="8" cy="12" r="1.5" fill="currentColor" />
        <circle cx="8" cy="18" r="1.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    title: "Trip Instances",
    description: "Create outbound/return journey legs for the yatra.",
    href: "/masters/trips",
    accent: "#a855f7",
    background: "radial-gradient(circle at top right, rgba(168, 85, 247, 0.2), transparent 60%)",
    icon: (
      <svg viewBox="0 0 24 24" width={iconSize} height={iconSize} aria-hidden="true">
        <rect x="4" y="5" width="16" height="15" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M4 9h16" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M8 3v4M16 3v4" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="9" cy="13" r="1.2" fill="currentColor" />
        <circle cx="13" cy="13" r="1.2" fill="currentColor" />
      </svg>
    ),
  },
  {
    title: "Yatri Buckets",
    description: "Manage grouping buckets for yatri registrations.",
    href: "/masters/buckets",
    accent: "#f97316",
    background: "radial-gradient(circle at top right, rgba(249, 115, 22, 0.2), transparent 60%)",
    icon: (
      <svg viewBox="0 0 24 24" width={iconSize} height={iconSize} aria-hidden="true">
        <circle cx="9" cy="9" r="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path
          d="M3.5 19a6 6 0 0 1 11 0"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <circle cx="17" cy="10" r="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M14.5 19a4 4 0 0 1 6 0" fill="none" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    ),
  },
  {
    title: "Hotels & Rooms",
    description: "Manage accommodation master records.",
    href: "/masters/hotels",
    accent: "#0ea5e9",
    background: "radial-gradient(circle at top right, rgba(14, 165, 233, 0.2), transparent 60%)",
    icon: (
      <svg viewBox="0 0 24 24" width={iconSize} height={iconSize} aria-hidden="true">
        <rect x="4" y="6" width="16" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M4 12h16" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="8" cy="10" r="1.3" fill="currentColor" />
      </svg>
    ),
  },
];

export default async function MastersPage() {
  await requireStaff();

  return (
    <div className="space-y-6">
      <section
        className="card card--hover dashboard-hero min-h-[180px]"
        style={{ backgroundImage: "url('/banner.png')", padding: "12px" }}
      >
        <div className="grid min-h-[180px] grid-rows-2 gap-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold text-white">Masters</h1>
              <p className="text-sm text-white/80">
                Travel, accommodation, and yatri master data for the Yatra.
              </p>
            </div>
            <span className="pill pill--contrast pill--wide sm:self-start">
              Master data console
            </span>
          </div>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <span className="pill pill--contrast pill--metric pill--wide">
              <span className="pill__metric">{cards.length}</span>
              <span>Master modules</span>
            </span>
            <Link
              href="/masters/buckets"
              className="pill pill--contrast pill--metric pill--wide pill--clickable pill--cta inline-flex items-center"
            >
              <span className="pill__metric">+</span>
              <span>New Bucket</span>
            </Link>
          </div>
        </div>
      </section>

      <div className="grid gap-4 justify-start justify-items-start [grid-template-columns:repeat(auto-fit,minmax(200px,200px))]">
        {cards.map((card) => (
          <div
            key={card.href}
            className="card card--hover p-0 overflow-hidden grid grid-rows-[3fr_1fr] justify-self-start"
            style={{
              width: "200px",
              height: "160px",
              borderRadius: "8px",
            }}
          >
            <div
              className="relative h-full"
              style={{
                padding: "12px",
                backgroundImage: card.background,
              }}
            >
              <div
                className="absolute -right-6 -top-6 h-16 w-16 rounded-full opacity-20"
                style={{ backgroundColor: card.accent }}
                aria-hidden="true"
              />
              <div className="flex items-center gap-2">
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: "rgba(15, 23, 42, 0.12)",
                    color: card.accent,
                  }}
                >
                  {card.icon}
                </div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
                  Master
                </div>
              </div>
              <div className="mt-3 space-y-1">
                <div className="text-sm font-semibold text-[color:var(--ink)]">{card.title}</div>
                <div className="text-[11px] text-[color:var(--muted)] leading-snug">
                  {card.description}
                </div>
              </div>
            </div>
            <div
              className="flex items-center justify-between gap-2 border-t border-[color:var(--border)] bg-[color:var(--surface-muted)]"
              style={{
                paddingTop: "5px",
                paddingRight: "12px",
                paddingBottom: "8px",
                paddingLeft: "12px",
              }}
            >
              <Link href={card.href} className="btn-secondary" style={{ padding: "8px" }}>
                View list
              </Link>
              <Link
                href={`${card.href}?mode=edit`}
                className="btn-secondary"
                style={{ padding: "8px" }}
              >
                Edit list
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

import Link from "next/link";
import type { ReactNode } from "react";
import { requireStaff } from "@/lib/roleGuard";

const iconSize = 16;

type Card = {
  title: string;
  description: string;
  href: string;
  accent: string;
  background: string;
  icon: ReactNode;
  tag: string;
  requireAdmin?: boolean;
};

type CardGroup = {
  title: string;
  description: string;
  cards: Card[];
};

const operationsCards: Card[] = [
  {
    title: "Yatris",
    description: "Registration roster, profiles, and intake history.",
    href: "/yatris",
    accent: "#38bdf8",
    background: "radial-gradient(circle at top right, rgba(56, 189, 248, 0.18), transparent 60%)",
    tag: "Operations",
    icon: (
      <svg viewBox="0 0 24 24" width={iconSize} height={iconSize} aria-hidden="true">
        <circle cx="12" cy="8" r="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M5 19a7 7 0 0 1 14 0" fill="none" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    ),
  },
  {
    title: "Groups",
    description: "Co-travel groups, tickets, and allocations.",
    href: "/groups/train",
    accent: "#f59e0b",
    background: "radial-gradient(circle at top right, rgba(245, 158, 11, 0.18), transparent 60%)",
    tag: "Operations",
    icon: (
      <svg viewBox="0 0 24 24" width={iconSize} height={iconSize} aria-hidden="true">
        <circle cx="7" cy="9" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="17" cy="9" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M3 19a6 6 0 0 1 8-5.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M21 19a6 6 0 0 0-8-5.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    ),
  },
  {
    title: "Bookings",
    description: "Ticketing and accommodation task tracking.",
    href: "/booking-tasks",
    accent: "#f97316",
    background: "radial-gradient(circle at top right, rgba(249, 115, 22, 0.18), transparent 60%)",
    tag: "Operations",
    icon: (
      <svg viewBox="0 0 24 24" width={iconSize} height={iconSize} aria-hidden="true">
        <rect x="4" y="5" width="16" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M7 9h10M7 13h6" fill="none" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    ),
  },
  {
    title: "Volunteers",
    description: "Assign roles and identify group leads.",
    href: "/volunteers",
    accent: "#22c55e",
    background: "radial-gradient(circle at top right, rgba(34, 197, 94, 0.18), transparent 60%)",
    tag: "Operations",
    icon: (
      <svg viewBox="0 0 24 24" width={iconSize} height={iconSize} aria-hidden="true">
        <path
          d="M12 3l2.2 4.3L19 8l-3.5 3.4.8 4.8L12 14.8 7.7 16.2l.8-4.8L5 8l4.8-.7L12 3Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.3"
        />
      </svg>
    ),
  },
  {
    title: "Users",
    description: "Roles, access provisioning, and staff accounts.",
    href: "/users",
    accent: "#0ea5e9",
    background: "radial-gradient(circle at top right, rgba(14, 165, 233, 0.18), transparent 60%)",
    tag: "Operations",
    requireAdmin: true,
    icon: (
      <svg viewBox="0 0 24 24" width={iconSize} height={iconSize} aria-hidden="true">
        <circle cx="12" cy="7.5" r="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M4 20a8 8 0 0 1 16 0" fill="none" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    ),
  },
];

const masterCards: Card[] = [
  {
    title: "Stations",
    description: "Manage master railway stations used in routes.",
    href: "/masters/stations",
    accent: "#38bdf8",
    background: "radial-gradient(circle at top right, rgba(56, 189, 248, 0.2), transparent 60%)",
    tag: "Master data",
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
    description: "Train templates and route definitions.",
    href: "/masters/trains",
    accent: "#f59e0b",
    background: "radial-gradient(circle at top right, rgba(245, 158, 11, 0.2), transparent 60%)",
    tag: "Master data",
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
    title: "Trips",
    description: "Trip instances built from train and air masters.",
    href: "/masters/trips",
    accent: "#0ea5e9",
    background: "radial-gradient(circle at top right, rgba(14, 165, 233, 0.2), transparent 60%)",
    tag: "Master data",
    icon: (
      <svg viewBox="0 0 24 24" width={iconSize} height={iconSize} aria-hidden="true">
        <path d="M4 12h16" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M12 4l4 4-4 4-4-4 4-4Z" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M12 12l4 4-4 4-4-4 4-4Z" fill="none" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    ),
  },
  {
    title: "Train Stops",
    description: "Stop sequences and timetable details.",
    href: "/masters/train-stops",
    accent: "#22c55e",
    background: "radial-gradient(circle at top right, rgba(34, 197, 94, 0.2), transparent 60%)",
    tag: "Master data",
    icon: (
      <svg viewBox="0 0 24 24" width={iconSize} height={iconSize} aria-hidden="true">
        <path d="M6 4h12v6H6z" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M6 14h12v6H6z" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M12 10v4" fill="none" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    ),
  },
  {
    title: "Yatri Buckets",
    description: "Grouping buckets for registrations.",
    href: "/masters/buckets",
    accent: "#f97316",
    background: "radial-gradient(circle at top right, rgba(249, 115, 22, 0.2), transparent 60%)",
    tag: "Master data",
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
    description: "Accommodation inventory and room capacity.",
    href: "/masters/hotels",
    accent: "#0ea5e9",
    background: "radial-gradient(circle at top right, rgba(14, 165, 233, 0.2), transparent 60%)",
    tag: "Master data",
    icon: (
      <svg viewBox="0 0 24 24" width={iconSize} height={iconSize} aria-hidden="true">
        <rect x="4" y="6" width="16" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M4 12h16" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="8" cy="10" r="1.3" fill="currentColor" />
      </svg>
    ),
  },
];

const renderCards = (cards: Card[]) => (
  <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
    {cards.map((card) => (
      <div
        key={card.href}
        className="card card--hover grid min-h-[176px] grid-rows-[1fr_auto] overflow-hidden p-0"
      >
        <div
          className="relative h-full"
          style={{
            padding: "14px",
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
              {card.tag}
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
          className="flex items-center justify-between gap-2 border-t border-[color:var(--border)] bg-[color:var(--surface-muted)] px-3 py-2.5"
        >
          <Link href={card.href} className="btn-secondary px-2.5 py-1.5 text-[11px]">
            View list
          </Link>
          <Link
            href={`${card.href}?mode=edit`}
            className="btn-secondary px-2.5 py-1.5 text-[11px]"
          >
            Edit list
          </Link>
        </div>
      </div>
    ))}
  </div>
);

const renderCardGroups = (groups: CardGroup[]) => (
  <div className="space-y-5">
    {groups.map((group) => (
      <div
        key={group.title}
        className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)]/70 p-4 sm:p-5"
      >
        <div className="mb-4 space-y-1">
          <div className="text-sm font-semibold text-[color:var(--ink)]">{group.title}</div>
          <div className="text-xs text-[color:var(--muted)]">{group.description}</div>
        </div>
        {renderCards(group.cards)}
      </div>
    ))}
  </div>
);

export default async function MastersPage() {
  const { role } = await requireStaff();
  const isAdmin = role === "admin";

  const visibleOperations = operationsCards.filter(
    (card) => !card.requireAdmin || isAdmin
  );
  const visibleMasters = masterCards;
  const moduleCount = visibleOperations.length + visibleMasters.length;
  const operationsGroups: CardGroup[] = [
    {
      title: "Core operations",
      description: "Registrations, groups, and booking oversight.",
      cards: visibleOperations.filter((card) =>
        ["Yatris", "Groups", "Bookings"].includes(card.title)
      ),
    },
    {
      title: "People & access",
      description: "Volunteer coordination and staff provisioning.",
      cards: visibleOperations.filter((card) =>
        ["Volunteers", "Users"].includes(card.title)
      ),
    },
  ].filter((group) => group.cards.length > 0);
  const masterGroups: CardGroup[] = [
    {
      title: "Travel masters",
      description: "Stations, trains, trips, and stop schedules.",
      cards: visibleMasters.filter((card) =>
        ["Stations", "Trains", "Trips", "Train Stops"].includes(card.title)
      ),
    },
    {
      title: "Hospitality & buckets",
      description: "Accommodation inventory and yatri grouping buckets.",
      cards: visibleMasters.filter((card) =>
        ["Hotels & Rooms", "Yatri Buckets"].includes(card.title)
      ),
    },
  ].filter((group) => group.cards.length > 0);

  return (
    <div className="space-y-6">
      <section
        className="card card--hover dashboard-hero min-h-[180px]"
        style={{ backgroundImage: "url('/banner.png')", padding: "12px" }}
      >
        <div className="grid min-h-[180px] grid-rows-2 gap-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold text-white">Operations</h1>
              <p className="text-sm text-white/80">
                Yatri ops, staffing, bookings, and master data in one console.
              </p>
            </div>
            <span className="pill pill--contrast pill--wide sm:self-start">
              Operations console
            </span>
          </div>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <span className="pill pill--contrast pill--metric pill--wide">
              <span className="pill__metric">{moduleCount}</span>
              <span>Modules</span>
            </span>
            <Link
              href="/yatris/new"
              className="pill pill--contrast pill--metric pill--wide pill--clickable pill--cta inline-flex items-center"
            >
              <span className="pill__metric">+</span>
              <span>New Registration</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--muted)]">
          Operations
        </div>
        {renderCardGroups(operationsGroups)}
      </section>

      <section className="space-y-3">
        <div className="text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--muted)]">
          Master data
        </div>
        {renderCardGroups(masterGroups)}
      </section>
    </div>
  );
}

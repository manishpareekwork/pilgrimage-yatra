import Link from "next/link";
import type { ReactNode } from "react";
import { requireStaff } from "@/lib/roleGuard";

const iconSize = 20;
const iconSizeSmall = 14;

type OperationItem = {
  title: string;
  description: string;
  href: string;
  accent: string;
  icon: ReactNode;
  requireAdmin?: boolean;
};

// Core operations - top priority modules
const coreOperations: OperationItem[] = [
  {
    title: "Yatris",
    description: "Registration roster & profiles",
    href: "/yatris",
    accent: "#38bdf8",
    icon: (
      <svg viewBox="0 0 24 24" width={iconSize} height={iconSize} aria-hidden="true">
        <circle cx="12" cy="8" r="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M5 19a7 7 0 0 1 14 0" fill="none" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    ),
  },
  {
    title: "Groups",
    description: "Travel groups & allocations",
    href: "/groups/train",
    accent: "#f59e0b",
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
    description: "Tickets & accommodation tasks",
    href: "/booking-tasks",
    accent: "#f97316",
    icon: (
      <svg viewBox="0 0 24 24" width={iconSize} height={iconSize} aria-hidden="true">
        <rect x="4" y="5" width="16" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M7 9h10M7 13h6" fill="none" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    ),
  },
];

// People & access
const peopleOperations: OperationItem[] = [
  {
    title: "Volunteers",
    description: "Roles & group leads",
    href: "/volunteers",
    accent: "#22c55e",
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
    description: "Staff access & provisioning",
    href: "/users",
    accent: "#0ea5e9",
    requireAdmin: true,
    icon: (
      <svg viewBox="0 0 24 24" width={iconSize} height={iconSize} aria-hidden="true">
        <circle cx="12" cy="7.5" r="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M4 20a8 8 0 0 1 16 0" fill="none" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    ),
  },
];

// Travel masters
const travelMasters: OperationItem[] = [
  {
    title: "Stations",
    description: "Railway station catalog",
    href: "/masters/stations",
    accent: "#38bdf8",
    icon: (
      <svg viewBox="0 0 24 24" width={iconSizeSmall} height={iconSizeSmall} aria-hidden="true">
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
    description: "Templates & routes",
    href: "/masters/trains",
    accent: "#f59e0b",
    icon: (
      <svg viewBox="0 0 24 24" width={iconSizeSmall} height={iconSizeSmall} aria-hidden="true">
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
    description: "Trip instances",
    href: "/masters/trips",
    accent: "#0ea5e9",
    icon: (
      <svg viewBox="0 0 24 24" width={iconSizeSmall} height={iconSizeSmall} aria-hidden="true">
        <path d="M4 12h16" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M12 4l4 4-4 4-4-4 4-4Z" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M12 12l4 4-4 4-4-4 4-4Z" fill="none" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    ),
  },
  {
    title: "Train Stops",
    description: "Schedules & stops",
    href: "/masters/train-stops",
    accent: "#22c55e",
    icon: (
      <svg viewBox="0 0 24 24" width={iconSizeSmall} height={iconSizeSmall} aria-hidden="true">
        <path d="M6 4h12v6H6z" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M6 14h12v6H6z" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M12 10v4" fill="none" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    ),
  },
];

// Hospitality masters
const hospitalityMasters: OperationItem[] = [
  {
    title: "Hotels & Rooms",
    description: "Accommodation inventory",
    href: "/masters/hotels",
    accent: "#0ea5e9",
    icon: (
      <svg viewBox="0 0 24 24" width={iconSizeSmall} height={iconSizeSmall} aria-hidden="true">
        <rect x="4" y="6" width="16" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M4 12h16" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="8" cy="10" r="1.3" fill="currentColor" />
      </svg>
    ),
  },
  {
    title: "Yatri Buckets",
    description: "Grouping buckets",
    href: "/masters/buckets",
    accent: "#f97316",
    icon: (
      <svg viewBox="0 0 24 24" width={iconSizeSmall} height={iconSizeSmall} aria-hidden="true">
        <circle cx="9" cy="9" r="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M3.5 19a6 6 0 0 1 11 0" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="17" cy="10" r="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M14.5 19a4 4 0 0 1 6 0" fill="none" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    ),
  },
];

// Quick action tile (larger)
const OperationTile = ({ item }: { item: OperationItem }) => (
  <Link
    href={item.href}
    className="ops-tile group"
    style={{
      "--tile-accent": item.accent,
    } as React.CSSProperties}
  >
    <div className="ops-tile__icon" style={{ color: item.accent }}>
      {item.icon}
    </div>
    <div className="ops-tile__content">
      <div className="ops-tile__title">{item.title}</div>
      <div className="ops-tile__desc">{item.description}</div>
    </div>
    <div className="ops-tile__arrow">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 18l6-6-6-6" />
      </svg>
    </div>
  </Link>
);

// Master data link (compact)
const MasterLink = ({ item }: { item: OperationItem }) => (
  <Link
    href={item.href}
    className="master-link group"
    style={{
      "--tile-accent": item.accent,
    } as React.CSSProperties}
  >
    <div className="master-link__icon" style={{ color: item.accent }}>
      {item.icon}
    </div>
    <span className="master-link__title">{item.title}</span>
    <span className="master-link__desc">{item.description}</span>
    <svg className="master-link__arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 18l6-6-6-6" />
    </svg>
  </Link>
);

export default async function MastersPage() {
  const { role } = await requireStaff();
  const isAdmin = role === "admin";

  const visiblePeopleOps = peopleOperations.filter(
    (item) => !item.requireAdmin || isAdmin
  );

  const moduleCount =
    coreOperations.length +
    visiblePeopleOps.length +
    travelMasters.length +
    hospitalityMasters.length;

  return (
    <div className="ops-page">
      {/* Hero Banner */}
      <section
        className="ops-hero"
        style={{ backgroundImage: "url('/banner.png')" }}
      >
        <div className="ops-hero__overlay" />
        <div className="ops-hero__content">
          <div className="ops-hero__top">
            <div>
              <h1 className="ops-hero__title">Operations Console</h1>
              <p className="ops-hero__subtitle">
                Manage yatris, groups, bookings, and master data
              </p>
            </div>
            <div className="ops-hero__badge">
              <span className="ops-hero__count">{moduleCount}</span>
              <span>modules</span>
            </div>
          </div>
          <div className="ops-hero__actions">
            <Link href="/yatris/new" className="ops-hero__cta">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 5v14M5 12h14" />
              </svg>
              New Registration
            </Link>
            <Link href="/dashboard" className="ops-hero__link">
              View Dashboard →
            </Link>
          </div>
        </div>
      </section>

      {/* Core Operations */}
      <section className="ops-section">
        <div className="ops-section__header">
          <h2 className="ops-section__title">Core Operations</h2>
          <p className="ops-section__desc">Registrations, groups, and booking oversight</p>
        </div>
        <div className="ops-tiles-grid">
          {coreOperations.map((item) => (
            <OperationTile key={item.href} item={item} />
          ))}
        </div>
      </section>

      {/* People & Access */}
      {visiblePeopleOps.length > 0 && (
        <section className="ops-section">
          <div className="ops-section__header">
            <h2 className="ops-section__title">People & Access</h2>
            <p className="ops-section__desc">Volunteer coordination and staff provisioning</p>
          </div>
          <div className="ops-tiles-grid ops-tiles-grid--2col">
            {visiblePeopleOps.map((item) => (
              <OperationTile key={item.href} item={item} />
            ))}
          </div>
        </section>
      )}

      {/* Master Data */}
      <section className="ops-section ops-section--masters">
        <div className="ops-section__header">
          <h2 className="ops-section__title">Master Data</h2>
          <p className="ops-section__desc">Reference data powering operations</p>
        </div>
        
        <div className="masters-grid">
          {/* Travel */}
          <div className="masters-group">
            <div className="masters-group__header">
              <span className="masters-group__dot" style={{ background: "#38bdf8" }} />
              <span className="masters-group__label">Travel</span>
            </div>
            <div className="masters-list">
              {travelMasters.map((item) => (
                <MasterLink key={item.href} item={item} />
              ))}
            </div>
          </div>

          {/* Hospitality */}
          <div className="masters-group">
            <div className="masters-group__header">
              <span className="masters-group__dot" style={{ background: "#0ea5e9" }} />
              <span className="masters-group__label">Hospitality</span>
            </div>
            <div className="masters-list">
              {hospitalityMasters.map((item) => (
                <MasterLink key={item.href} item={item} />
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

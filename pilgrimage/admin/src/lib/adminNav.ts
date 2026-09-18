/** Primary staff navigation — keep in sync with AppShell. */
export const PRIMARY_NAV = [
  { href: "/dashboard", label: "Home" },
  { href: "/yatris", label: "Yatris" },
  { href: "/bookings/committee-train", label: "Train booking" },
  { href: "/masters", label: "Operations" },
  { href: "/reports", label: "Reports" },
] as const;

export const QUICK_ACTIONS = [
  {
    title: "New yatri",
    description: "Register a pilgrim",
    href: "/yatris/new",
    tone: "primary" as const,
  },
  {
    title: "Committee train flow",
    description: "Register → reservation → CM257",
    href: "/bookings/committee-train",
    tone: "secondary" as const,
  },
  {
    title: "CM257 forms",
    description: "Select passengers & print",
    href: "/bookings/railway-reservation",
    tone: "secondary" as const,
  },
  {
    title: "Travel groups",
    description: "Co-travel & berths",
    href: "/groups/train",
    tone: "secondary" as const,
  },
  {
    title: "Trip legs",
    description: "Outbound 7 Dec · return 13 Dec",
    href: "/masters/trips",
    tone: "secondary" as const,
  },
];

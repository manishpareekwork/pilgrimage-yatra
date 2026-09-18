"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type AppShellNavItem = {
  href: string;
  label: string;
};

function isActivePath(pathname: string, href: string) {
  if (pathname === href) return true;
  if (href === "/dashboard") return pathname === "/dashboard";
  if (href === "/bookings/committee-train") {
    return (
      pathname.startsWith("/bookings/committee-train") ||
      pathname.startsWith("/bookings/railway-reservation")
    );
  }
  if (href === "/masters") {
    return pathname.startsWith("/masters") || pathname.startsWith("/groups") || pathname.startsWith("/booking-tasks");
  }
  return pathname.startsWith(`${href}/`) || pathname === href;
}

export function AppShellNavDesktop({ items }: { items: AppShellNavItem[] }) {
  const pathname = usePathname();
  return (
    <>
      {items.map((item) => {
        const active = isActivePath(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`app-shell__nav-link${active ? " app-shell__nav-link--active" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </>
  );
}

export function AppShellNavMobile({ items }: { items: AppShellNavItem[] }) {
  const pathname = usePathname();
  return (
    <>
      {items.map((item) => {
        const active = isActivePath(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`app-shell__nav-chip${active ? " app-shell__nav-chip--active" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type AppShellNavItem = {
  href: string;
  label: string;
};

function isActivePath(pathname: string, href: string) {
  if (pathname === href) return true;
  if (href === "/dashboard") return false;
  return pathname.startsWith(`${href}/`);
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
            className="app-shell__nav-link"
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
            className="app-shell__nav-chip"
            aria-current={active ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </>
  );
}

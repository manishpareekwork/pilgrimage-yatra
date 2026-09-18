"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
type NavItem = { href: string; label: string };

function isActivePath(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  if (href === "/bookings/committee-train") {
    return (
      pathname.startsWith("/bookings/committee-train") ||
      pathname.startsWith("/bookings/railway-reservation")
    );
  }
  if (href === "/masters") {
    return (
      pathname.startsWith("/masters") ||
      pathname.startsWith("/groups") ||
      pathname.startsWith("/booking-tasks")
    );
  }
  return pathname.startsWith(`${href}/`) || pathname === href;
}

export function AppShellMobileDrawer({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="app-drawer md:hidden">
      <button
        type="button"
        className="app-drawer__trigger"
        aria-expanded={open}
        aria-controls="app-mobile-nav"
        onClick={() => setOpen((v) => !v)}
      >
        Menu
      </button>
      {open && (
        <>
          <button
            type="button"
            className="app-drawer__backdrop"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <nav id="app-mobile-nav" className="app-drawer__panel" aria-label="Mobile">
            <div className="app-drawer__panel-head">
              <span className="app-drawer__title">Navigate</span>
              <button type="button" className="app-drawer__close" onClick={() => setOpen(false)}>
                ×
              </button>
            </div>
            <ul className="app-drawer__links">
              {items.map((item) => {
                const active = isActivePath(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`app-drawer__link${active ? " app-drawer__link--active" : ""}`}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </>
      )}
    </div>
  );
}

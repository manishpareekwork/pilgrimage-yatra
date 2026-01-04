import Image from "next/image";
import Link from "next/link";
import React from "react";
import { ThemeToggle } from "@/components/ThemeToggle";

type NavItem = {
  href: string;
  label: string;
  requireAdmin?: boolean;
  requireStaff?: boolean;
};

export function AppShell({
  children,
  email,
  role,
  onLogoutAction,
}: {
  children: React.ReactNode;
  email: string;
  role?: string;
  onLogoutAction: React.ReactNode;
}) {
  const nav: NavItem[] = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/yatris", label: "Yatris" },
    { href: "/masters", label: "Masters", requireStaff: true },
    { href: "/groups/train", label: "Groups", requireStaff: true },
    { href: "/booking-tasks", label: "Bookings", requireStaff: true },
    { href: "/volunteers", label: "Volunteers", requireStaff: true },
    { href: "/reports", label: "Reports", requireStaff: true },
    { href: "/users", label: "Users", requireAdmin: true },
  ];
  const isAdmin = role === "admin";
  const isStaff = role === "admin" || role === "reviewer";

  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <div className="app-shell__inner">
          <div className="app-shell__brand">
            <div className="app-shell__logo">
              <Image
                src="/logo.png"
                alt="Pilgrimage Admin"
                width={40}
                height={40}
                className="app-shell__logo-image rounded-xl"
                unoptimized
              />
            </div>
            <div>
              <div className="app-shell__title">Pilgrimage Admin</div>
              <div className="app-shell__subtitle">Jagannath Puri 2025</div>
            </div>
          </div>
          <nav className="app-shell__nav-desktop">
            {nav
              .filter((item) => (!item.requireAdmin || isAdmin) && (!item.requireStaff || isStaff))
              .map((item) => (
                <Link key={item.href} href={item.href} className="app-shell__nav-link">
                  {item.label}
                </Link>
              ))}
            <div className="app-shell__nav-actions">
              <ThemeToggle />
              {onLogoutAction}
            </div>
          </nav>
        </div>
        <div className="app-shell__nav-mobile">
          <div className="app-shell__nav-mobile-links">
            {nav
              .filter((item) => (!item.requireAdmin || isAdmin) && (!item.requireStaff || isStaff))
              .map((item) => (
                <Link key={item.href} href={item.href} className="app-shell__nav-chip">
                  {item.label}
                </Link>
              ))}
          </div>
          <div className="app-shell__nav-actions">
            <ThemeToggle />
            {onLogoutAction}
          </div>
        </div>
        <div className="app-shell__meta">
          <div className="app-shell__inner">
            <div className="app-shell__meta-text">
              Signed in as <span className="app-shell__meta-highlight">{email}</span> ·
              Role:{" "}
              <span className="app-shell__meta-role">{role || "yatri"}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="app-shell__main">{children}</main>
    </div>
  );
}

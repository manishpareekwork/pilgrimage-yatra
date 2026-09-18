import Image from "next/image";
import Link from "next/link";
import React from "react";
import { AppShellNavDesktop } from "@/components/AppShellNav";
import { AppShellMobileDrawer } from "@/components/AppShellMobileDrawer";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PRIMARY_NAV } from "@/lib/adminNav";

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
  const isStaff = role === "admin" || role === "reviewer";
  const nav = PRIMARY_NAV.filter((item) => item.href !== "/reports" || isStaff);

  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <div className="app-shell__inner">
          <div className="app-shell__brand">
            <Link href="/dashboard" className="app-shell__brand-link">
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
                <div className="app-shell__subtitle">Jagannath Puri Yatra</div>
              </div>
            </Link>
          </div>
          <nav className="app-shell__nav-desktop" aria-label="Primary">
            <AppShellNavDesktop items={[...nav]} />
            <div className="app-shell__nav-actions app-shell__nav-actions--desktop">
              <ThemeToggle />
              {onLogoutAction}
            </div>
          </nav>
          <div className="app-shell__nav-mobile-bar md:hidden">
            <AppShellMobileDrawer items={[...nav]} />
            <div className="app-shell__nav-actions">
              <ThemeToggle />
              {onLogoutAction}
            </div>
          </div>
        </div>
        <div className="app-shell__meta">
          <div className="app-shell__inner">
            <div className="app-shell__meta-text">
              Signed in as <span className="app-shell__meta-highlight">{email}</span> · Role:{" "}
              <span className="app-shell__meta-role">{role || "yatri"}</span>
            </div>
          </div>
        </div>
      </header>

      <main id="main-content" className="app-shell__main" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}

"use client";

import { usePathname } from "next/navigation";
import React from "react";
import { AppShell } from "@/components/AppShell";

/** Full chrome for admin pages; bare content for /print/* so Save as PDF works. */
export function PrintLayoutGate({
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
  const pathname = usePathname() ?? "";
  const isPrintRoute = pathname.startsWith("/print/");

  if (isPrintRoute) {
    return <div className="print-route-root">{children}</div>;
  }

  return (
    <AppShell email={email} role={role} onLogoutAction={onLogoutAction}>
      {children}
    </AppShell>
  );
}

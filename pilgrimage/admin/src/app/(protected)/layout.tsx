import { getActionSupabase, getServerSupabase } from "@/lib/supabaseServer";
import Link from "next/link";
import { redirect } from "next/navigation";
import React from "react";

async function signOut() {
  "use server";
  const supabase = await getActionSupabase();
  await supabase.auth.signOut();
  redirect("/login");
}

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await getServerSupabase();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) {
    redirect("/login");
  }

  const user = userData.user;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, name_hi")
    .eq("id", user.id)
    .single();

  const role =
    (profile?.role as string | undefined) ||
    ((user.app_metadata as Record<string, unknown> | null)?.role as string | undefined) ||
    "yatri";

  const nav = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/yatris", label: "Yatris" },
    ...(role === "admin" ? [{ href: "/users", label: "Users" }] : []),
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", color: "#e2e8f0" }}>
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <aside
          style={{
            display: "none",
            width: 240,
            flexDirection: "column",
            borderRight: "1px solid rgba(148,163,184,0.35)",
            background: "rgba(15,23,42,0.75)",
            padding: "24px 16px",
            gap: 16,
          }}
          className="md:flex"
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                height: 40,
                width: 40,
                borderRadius: 14,
                background: "linear-gradient(135deg, #f97316, #0ea5e9)",
              }}
            />
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>
                Pilgrimage Admin
              </div>
              <div style={{ fontSize: 11, color: "#cbd5e1" }}>Jagannath Puri 2025</div>
            </div>
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: "block",
                  padding: "10px 12px",
                  borderRadius: 10,
                  color: "#e2e8f0",
                  fontWeight: 600,
                  fontSize: 14,
                  textDecoration: "none",
                  background: "transparent",
                }}
              >
                {item.label}
              </Link>
            ))}
          </div>
          <div style={{ marginTop: "auto", fontSize: 12, color: "#cbd5e1" }}>
            <div style={{ marginBottom: 2 }}>Signed in as</div>
            <div style={{ fontSize: 13, color: "#fff", wordBreak: "break-all" }}>{user.email}</div>
            <div style={{ fontSize: 11, textTransform: "uppercase", color: "#94a3b8" }}>
              {role}
            </div>
            <form action={signOut} style={{ marginTop: 8 }}>
              <button
                type="submit"
                style={{
                  color: "#f97316",
                  fontWeight: 700,
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                }}
              >
                Sign out
              </button>
            </form>
          </div>
        </aside>

        <main style={{ flex: 1 }}>
          <header
            className="md:hidden"
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid rgba(148,163,184,0.4)",
              background: "rgba(15,23,42,0.9)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#f97316" }}>Pilgrimage Admin</div>
              <div style={{ fontSize: 12, color: "#cbd5e1" }}>{user.email}</div>
            </div>
            <div style={{ display: "flex", gap: 12, fontSize: 13 }}>
              {nav.map((item) => (
                <Link key={item.href} href={item.href} style={{ color: "#f97316", fontWeight: 700 }}>
                  {item.label}
                </Link>
              ))}
            </div>
          </header>

          <div style={{ padding: "16px 16px 32px 16px" }}>{children}</div>
        </main>
      </div>
    </div>
  );
}

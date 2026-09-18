import { getActionSupabase, getServerSupabase } from "@/lib/supabaseServer";
import { PrintLayoutGate } from "@/components/PrintLayoutGate";
import { FormStatusOverlay } from "@/components/GlobalLoading";
import { redirect } from "next/navigation";
import React from "react";
import { createClient } from "@supabase/supabase-js";

const ensureProfileRow = async (user: {
  id: string;
  app_metadata?: Record<string, unknown> | null;
  user_metadata?: Record<string, unknown> | null;
  phone?: string | null;
}) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return;

  const role =
    (user.app_metadata as Record<string, unknown> | null)?.role ||
    (user.user_metadata as Record<string, unknown> | null)?.role ||
    "yatri";

  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const { error } = await adminClient
    .from("profiles")
    .upsert(
      {
        id: user.id,
        role,
        name_hi: (user.user_metadata as Record<string, unknown> | null)?.name_hi ?? null,
        phone: user.phone ?? (user.user_metadata as Record<string, unknown> | null)?.phone ?? null,
      },
      { onConflict: "id", ignoreDuplicates: true }
    );

  if (error && process.env.NODE_ENV !== "production") {
    console.warn("ensureProfileRow upsert failed:", error.message);
  }
};

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
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, name_hi")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile && !profileError) {
    await ensureProfileRow(user);
  }

  const role =
    (profile?.role as string | undefined) ||
    ((user.app_metadata as Record<string, unknown> | null)?.role as string | undefined) ||
    "yatri";

  return (
    <PrintLayoutGate
      email={user.email ?? ""}
      role={role}
      onLogoutAction={
        <form action={signOut}>
          <FormStatusOverlay message="Signing out..." />
          <button type="submit" className="app-shell__logout" aria-label="Sign out">
            Logout
          </button>
        </form>
      }
    >
      {children}
    </PrintLayoutGate>
  );
}

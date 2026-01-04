import { getServerSupabase } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";

type RoleResult = {
  supabase: Awaited<ReturnType<typeof getServerSupabase>>;
  user: NonNullable<Awaited<ReturnType<Awaited<ReturnType<typeof getServerSupabase>>["auth"]["getUser"]>>["data"]["user"]>;
  role: string;
};

const resolveRole = async (): Promise<RoleResult> => {
  const supabase = await getServerSupabase();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .maybeSingle();

  const role =
    (profile?.role as string | undefined) ||
    ((userData.user.app_metadata as Record<string, unknown> | null)?.role as string | undefined) ||
    "yatri";

  return { supabase, user: userData.user, role };
};

export const requireStaff = async (): Promise<RoleResult> => {
  const result = await resolveRole();
  if (result.role !== "admin" && result.role !== "reviewer") {
    redirect("/dashboard");
  }
  return result;
};

export const requireAdmin = async (): Promise<RoleResult> => {
  const result = await resolveRole();
  if (result.role !== "admin") {
    redirect("/dashboard");
  }
  return result;
};

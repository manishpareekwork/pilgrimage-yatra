import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import type { User } from "@supabase/supabase-js";

type Role = "admin" | "reviewer" | "volunteer" | "yatri";

type ApiAuthSuccess = {
  supabase: ReturnType<typeof createRouteHandlerClient>;
  user: User;
  role: Role;
};

type ApiAuthFailure = {
  response: NextResponse;
};

type ApiAuthOptions = {
  requireStaff?: boolean;
  requireAdmin?: boolean;
};

const resolveRole = async (
  supabase: ReturnType<typeof createRouteHandlerClient>,
  user: { id: string; app_metadata?: Record<string, unknown> | null; user_metadata?: Record<string, unknown> | null }
) => {
  const supabaseAny = supabase as any;
  const { data: profile } = await supabaseAny
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const metadataRole =
    (user.app_metadata as Record<string, unknown> | null)?.role ||
    (user.user_metadata as Record<string, unknown> | null)?.role;

  return (profile?.role || metadataRole || "yatri") as Role;
};

export const requireApiAuth = async (
  options: ApiAuthOptions = {}
): Promise<ApiAuthSuccess | ApiAuthFailure> => {
  const cookieStore = await cookies();
  const supabase = createRouteHandlerClient({ cookies: (() => cookieStore) as any });
  const { data: userData, error } = await supabase.auth.getUser();

  if (error || !userData?.user) {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const role = await resolveRole(supabase, userData.user);

  if (options.requireAdmin && role !== "admin") {
    return {
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  if (options.requireStaff && role !== "admin" && role !== "reviewer") {
    return {
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { supabase, user: userData.user, role };
};

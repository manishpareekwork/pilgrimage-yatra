import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";

type Body = {
  email?: string;
  password?: string;
  role?: string;
};

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createRouteHandlerClient({ cookies: (() => cookieStore) as any });
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const callerRole =
    (userData.user.app_metadata as Record<string, unknown> | null)?.role ||
    (userData.user.user_metadata as Record<string, unknown> | null)?.role;

  if (callerRole !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as Body;
  const email = body.email?.trim();
  const password = body.password ?? "";
  const targetRole = body.role ?? "";

  if (!email || !password || !targetRole) {
    return NextResponse.json({ error: "email, password, role are required" }, { status: 400 });
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "Server missing Supabase env (SUPABASE_SERVICE_ROLE_KEY or URL)" },
      { status: 500 }
    );
  }

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role: targetRole },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const userId = data.user?.id;
  if (userId) {
    const { error: roleErr } = await adminClient.rpc("admin_set_user_role", {
      p_user: userId,
      p_role: targetRole,
    });
    if (roleErr) {
      return NextResponse.json(
        { error: `User created but role sync failed: ${roleErr.message}`, id: userId },
        { status: 400 }
      );
    }
  }

  return NextResponse.json({ id: userId, email, role: targetRole });
}

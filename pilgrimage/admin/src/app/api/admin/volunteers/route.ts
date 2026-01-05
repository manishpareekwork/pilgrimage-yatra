import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/apiAuth";

export const dynamic = "force-dynamic";

type VolunteerMemberPayload = {
  roleId?: string;
  registrationId?: string;
  memberId?: string;
  makeLead?: boolean;
};

export async function GET() {
  const auth = await requireApiAuth({ requireStaff: true });
  if ("response" in auth) return auth.response;

  const { supabase } = auth;
  const supabaseAny = supabase as any;
  const [rolesRes, membersRes, registrationsRes, profilesRes] = await Promise.all([
    supabase.from("volunteer_roles").select("id, code, name_hi, name_en").order("code"),
    supabaseAny
      .from("volunteer_role_members")
      .select(
        "id, role_id, registration_id, is_head, registration:yatra_registrations(name_hi, phone, aadhaar_no)"
      )
      .order("created_at", { ascending: true }),
    supabase
      .from("yatra_registrations")
      .select("id, name_hi, phone, aadhaar_no, owner, created_at")
      .order("name_hi"),
    supabase.from("profiles").select("id, name_hi, phone, role").order("created_at", { ascending: false }),
  ]);

  const error =
    rolesRes.error || membersRes.error || registrationsRes.error || profilesRes.error;
  if (error) {
    return NextResponse.json(
      { error: error.message || "Failed to load volunteer data." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    roles: rolesRes.data ?? [],
    members: membersRes.data ?? [],
    registrations: registrationsRes.data ?? [],
    profiles: profilesRes.data ?? [],
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireApiAuth({ requireStaff: true });
  if ("response" in auth) return auth.response;

  const { supabase } = auth;
  const supabaseAny = supabase as any;
  const body = (await req.json()) as VolunteerMemberPayload;
  const roleId = body.roleId?.trim();
  const registrationId = body.registrationId?.trim();
  const makeLead = Boolean(body.makeLead);

  if (!roleId || !registrationId) {
    return NextResponse.json(
      { error: "roleId and registrationId are required." },
      { status: 400 }
    );
  }

  if (makeLead) {
    const { error } = await supabaseAny
      .from("volunteer_role_members")
      .update({ is_head: false })
      .eq("role_id", roleId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }

  const { error } = await supabaseAny.from("volunteer_role_members").insert({
    role_id: roleId,
    registration_id: registrationId,
    is_head: makeLead,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireApiAuth({ requireStaff: true });
  if ("response" in auth) return auth.response;

  const { supabase } = auth;
  const supabaseAny = supabase as any;
  const body = (await req.json()) as VolunteerMemberPayload;
  const roleId = body.roleId?.trim();
  const memberId = body.memberId?.trim();

  if (!roleId || !memberId) {
    return NextResponse.json(
      { error: "roleId and memberId are required." },
      { status: 400 }
    );
  }

  const { error: resetError } = await supabaseAny
    .from("volunteer_role_members")
    .update({ is_head: false })
    .eq("role_id", roleId);

  if (resetError) {
    return NextResponse.json({ error: resetError.message }, { status: 400 });
  }

  const { error } = await supabaseAny
    .from("volunteer_role_members")
    .update({ is_head: true })
    .eq("id", memberId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireApiAuth({ requireStaff: true });
  if ("response" in auth) return auth.response;

  const { supabase } = auth;
  const supabaseAny = supabase as any;
  const body = (await req.json()) as VolunteerMemberPayload;
  const memberId = body.memberId?.trim();

  if (!memberId) {
    return NextResponse.json({ error: "memberId is required." }, { status: 400 });
  }

  const { error } = await supabaseAny
    .from("volunteer_role_members")
    .delete()
    .eq("id", memberId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

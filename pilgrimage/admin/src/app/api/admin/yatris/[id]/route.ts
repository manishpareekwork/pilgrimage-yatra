import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireApiAuth } from "@/lib/apiAuth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const getAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    throw new Error("Server missing Supabase env (SUPABASE_SERVICE_ROLE_KEY or URL)");
  }
  return createClient(supabaseUrl, serviceKey);
};

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<Record<string, string | string[] | undefined>> }
) {
  const auth = await requireApiAuth({ requireAdmin: true });
  if ("response" in auth) return auth.response;

  const resolvedParams = await params;
  const rawId = Array.isArray(resolvedParams?.id) ? resolvedParams?.id?.[0] : resolvedParams?.id;
  const id = rawId?.trim();
  if (!id) {
    return NextResponse.json({ error: "Missing registration id." }, { status: 400 });
  }

  let adminClient;
  try {
    adminClient = getAdminClient();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server misconfigured." },
      { status: 500 }
    );
  }

  const actorId = auth.user.id;
  const errors: string[] = [];

  const { error: bookedByError } = await adminClient
    .from("yatra_co_travel_groups")
    .update({ booked_by_registration_id: null, booked_by_user_id: actorId })
    .eq("booked_by_registration_id", id);
  if (bookedByError) errors.push(`travel groups (booked_by): ${bookedByError.message}`);

  const { error: inchargeError } = await adminClient
    .from("yatra_co_travel_groups")
    .update({ incharge_registration_id: null })
    .eq("incharge_registration_id", id);
  if (inchargeError) errors.push(`travel groups (incharge): ${inchargeError.message}`);

  const { error: coachError } = await adminClient
    .from("yatra_train_coaches")
    .update({ coach_incharge_registration_id: null })
    .eq("coach_incharge_registration_id", id);
  if (coachError) errors.push(`train coaches: ${coachError.message}`);

  const { error: taskError } = await adminClient
    .from("yatra_booking_tasks")
    .update({ booking_agent_registration_id: null, booking_agent_user_id: actorId })
    .eq("booking_agent_registration_id", id);
  if (taskError) errors.push(`booking tasks: ${taskError.message}`);

  if (errors.length) {
    return NextResponse.json({ error: errors.join("; ") }, { status: 400 });
  }

  const { data, error } = await adminClient
    .from("yatra_registrations")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ error: "Registration not found." }, { status: 404 });
  }

  return NextResponse.json({ id });
}

import { PageHeader, FormSection, Field, Select, TextArea, TextInput } from "@/components/ui";
import { requireStaff } from "@/lib/roleGuard";
import { getActionSupabase } from "@/lib/supabaseServer";
import { revalidatePath } from "next/cache";

async function createBookingTask(formData: FormData) {
  "use server";
  const taskType = formData.get("task_type")?.toString().trim();
  if (!taskType) return;

  const supabase = await getActionSupabase();
  await supabase.rpc("fn_create_booking_task", {
    p_task_type: taskType,
    p_trip_id: formData.get("trip_id")?.toString() || null,
    p_group_id: formData.get("group_id")?.toString() || null,
    p_hotel_id: formData.get("hotel_id")?.toString() || null,
    p_room_id: formData.get("room_id")?.toString() || null,
    p_booking_agent_user_id: formData.get("booking_agent_user_id")?.toString() || null,
    p_booking_agent_registration_id: formData.get("booking_agent_registration_id")?.toString() || null,
    p_notes: formData.get("notes")?.toString() || null,
  });
  revalidatePath("/booking-tasks");
}

async function updateBookingTask(formData: FormData) {
  "use server";
  const id = formData.get("id")?.toString().trim();
  const status = formData.get("status")?.toString().trim();
  if (!id || !status) return;

  const supabase = await getActionSupabase();
  await supabase.from("yatra_booking_tasks").update({ status }).eq("id", id);
  revalidatePath("/booking-tasks");
}

export default async function BookingTasksPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { supabase } = await requireStaff();
  const params = (await searchParams) ?? {};
  const statusParam = Array.isArray(params.status)
    ? params.status?.[0]
    : params.status;

  let query = supabase
    .from("yatra_booking_tasks")
    .select(
      "id, task_type, status, notes, created_at, trip_id, group_id, hotel_id, room_id, booking_agent_user_id, booking_agent_registration_id"
    )
    .order("created_at", { ascending: false });

  if (statusParam) query = query.eq("status", statusParam);

  const { data: tasks, error } = await query;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Booking Tasks"
        subtitle="Assign ticketing and accommodation booking responsibilities."
      />

      <FormSection title="Create booking task">
        <form action={createBookingTask} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Task type" htmlFor="task_type" required>
            <Select id="task_type" name="task_type" required defaultValue="train">
              <option value="train">Train</option>
              <option value="air">Air</option>
              <option value="hotel">Hotel</option>
            </Select>
          </Field>
          <Field label="Trip ID" htmlFor="trip_id">
            <TextInput id="trip_id" name="trip_id" placeholder="Trip ID (optional)" />
          </Field>
          <Field label="Group ID" htmlFor="group_id">
            <TextInput id="group_id" name="group_id" placeholder="Group ID (optional)" />
          </Field>
          <Field label="Hotel ID" htmlFor="hotel_id">
            <TextInput id="hotel_id" name="hotel_id" placeholder="Hotel ID (optional)" />
          </Field>
          <Field label="Room ID" htmlFor="room_id">
            <TextInput id="room_id" name="room_id" placeholder="Room ID (optional)" />
          </Field>
          <Field label="Booking agent user ID" htmlFor="booking_agent_user_id">
            <TextInput id="booking_agent_user_id" name="booking_agent_user_id" placeholder="auth.users id" />
          </Field>
          <Field label="Booking agent registration ID" htmlFor="booking_agent_registration_id">
            <TextInput
              id="booking_agent_registration_id"
              name="booking_agent_registration_id"
              placeholder="registration id"
            />
          </Field>
          <Field label="Notes" htmlFor="notes">
            <TextArea id="notes" name="notes" rows={2} placeholder="Notes" />
          </Field>
          <button type="submit" className="btn-primary">Create task</button>
        </form>
      </FormSection>

      <FormSection title="Tasks">
        {error && (
          <div className="mb-4 rounded-xl border border-rose-500/40 bg-rose-950/40 p-3 text-sm text-rose-200">
            {error.message}
          </div>
        )}
        <div className="overflow-hidden rounded-xl border border-slate-800/60">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-900 text-left text-xs font-semibold uppercase text-slate-300">
              <tr>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Refs</th>
                <th className="px-3 py-2">Assignee</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {(tasks ?? []).map((task) => (
                <tr key={task.id}>
                  <td className="px-3 py-2 text-slate-100 uppercase">{task.task_type}</td>
                  <td className="px-3 py-2 text-xs text-slate-300">
                    {task.trip_id && <div>Trip: {task.trip_id}</div>}
                    {task.group_id && <div>Group: {task.group_id}</div>}
                    {task.hotel_id && <div>Hotel: {task.hotel_id}</div>}
                    {task.room_id && <div>Room: {task.room_id}</div>}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-300">
                    {task.booking_agent_user_id && <div>User: {task.booking_agent_user_id}</div>}
                    {task.booking_agent_registration_id && (
                      <div>Reg: {task.booking_agent_registration_id}</div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <form action={updateBookingTask} className="flex items-center gap-2">
                      <input type="hidden" name="id" value={task.id} />
                      <Select name="status" defaultValue={task.status}>
                        <option value="open">Open</option>
                        <option value="in_progress">In progress</option>
                        <option value="done">Done</option>
                      </Select>
                      <button type="submit" className="btn-secondary">Update</button>
                    </form>
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-300">{task.notes || "—"}</td>
                </tr>
              ))}
              {tasks?.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-center text-slate-400">
                    No booking tasks yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </FormSection>
    </div>
  );
}

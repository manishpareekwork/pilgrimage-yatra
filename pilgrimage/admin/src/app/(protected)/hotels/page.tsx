import { PageHeader, FormSection, Field, Select, TextArea, TextInput } from "@/components/ui";
import { requireStaff } from "@/lib/roleGuard";
import { getActionSupabase } from "@/lib/supabaseServer";
import { revalidatePath } from "next/cache";

async function createHotel(formData: FormData) {
  "use server";
  const name = formData.get("name")?.toString().trim();
  const type = formData.get("type")?.toString().trim();
  const city = formData.get("city")?.toString().trim() || null;
  const address = formData.get("address")?.toString().trim() || null;
  if (!name || !type) return;

  const supabase = await getActionSupabase();
  await supabase.rpc("fn_create_hotel", {
    p_name: name,
    p_type: type,
    p_city: city,
    p_address: address,
  });
  revalidatePath("/hotels");
}

async function createRoom(formData: FormData) {
  "use server";
  const hotelId = formData.get("hotel_id")?.toString().trim();
  const roomNo = formData.get("room_no")?.toString().trim();
  const baseCapacity = Number(formData.get("base_capacity") || 0);
  const extraBeds = Number(formData.get("extra_beds_max") || 0);
  if (!hotelId || !roomNo) return;

  const supabase = await getActionSupabase();
  await supabase.rpc("fn_create_hotel_room", {
    p_hotel_id: hotelId,
    p_room_no: roomNo,
    p_base_capacity: baseCapacity,
    p_extra_beds_max: extraBeds,
  });
  revalidatePath("/hotels");
}

export default async function HotelsPage() {
  const { supabase } = await requireStaff();
  const { data: hotels, error: hotelError } = await supabase
    .from("yatra_hotels")
    .select("id, name, type, city, address, created_at")
    .order("name");

  const { data: rooms, error: roomError } = await supabase
    .from("yatra_hotel_rooms")
    .select("id, hotel_id, room_no, base_capacity, extra_beds_max")
    .order("room_no");

  const roomsByHotel = new Map<string, typeof rooms>();
  (rooms ?? []).forEach((room) => {
    const list = roomsByHotel.get(room.hotel_id) ?? [];
    list.push(room);
    roomsByHotel.set(room.hotel_id, list);
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hotels & Rooms"
        subtitle="Manage accommodations and room capacity."
      />

      <FormSection title="Add hotel">
        <form action={createHotel} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Hotel name" htmlFor="name" required>
            <TextInput id="name" name="name" required placeholder="Hotel name" />
          </Field>
          <Field label="Type" htmlFor="type" required>
            <Select id="type" name="type" required defaultValue="hotel">
              <option value="hotel">Hotel</option>
              <option value="guest_house">Guest house</option>
              <option value="dharamshala">Dharamshala</option>
              <option value="other">Other</option>
            </Select>
          </Field>
          <Field label="City" htmlFor="city">
            <TextInput id="city" name="city" placeholder="City" />
          </Field>
          <Field label="Address" htmlFor="address">
            <TextArea id="address" name="address" rows={2} placeholder="Address" />
          </Field>
          <button type="submit" className="btn-primary">Add hotel</button>
        </form>
      </FormSection>

      <FormSection title="Hotels">
        {(hotelError || roomError) && (
          <div className="mb-4 rounded-xl border border-rose-500/40 bg-rose-950/40 p-3 text-sm text-rose-200">
            {hotelError?.message || roomError?.message}
          </div>
        )}
        <div className="space-y-4">
          {(hotels ?? []).map((hotel) => (
            <div key={hotel.id} className="card p-5 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-[color:var(--ink)]">{hotel.name}</div>
                  <div className="text-xs text-[color:var(--muted)]">
                    {hotel.city || "—"} · {hotel.type}
                  </div>
                </div>
              </div>

              <form action={createRoom} className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_1fr_auto] items-end">
                <input type="hidden" name="hotel_id" value={hotel.id} />
                <TextInput name="room_no" placeholder="Room no" required />
                <TextInput name="base_capacity" type="number" min={0} placeholder="Base capacity" />
                <TextInput name="extra_beds_max" type="number" min={0} placeholder="Extra beds max" />
                <button type="submit" className="btn-secondary">Add room</button>
              </form>

              <div className="overflow-hidden rounded-xl border border-slate-800/60">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-900 text-left text-xs font-semibold uppercase text-slate-300">
                    <tr>
                      <th className="px-3 py-2">Room</th>
                      <th className="px-3 py-2">Base</th>
                      <th className="px-3 py-2">Extra</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {(roomsByHotel.get(hotel.id) ?? []).map((room) => (
                      <tr key={room.id}>
                        <td className="px-3 py-2 text-slate-100">{room.room_no}</td>
                        <td className="px-3 py-2 text-slate-300">{room.base_capacity}</td>
                        <td className="px-3 py-2 text-slate-300">{room.extra_beds_max}</td>
                      </tr>
                    ))}
                    {(roomsByHotel.get(hotel.id) ?? []).length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-3 py-3 text-center text-slate-400">
                          No rooms yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          {hotels?.length === 0 && (
            <div className="card p-6 text-center text-sm text-[color:var(--muted)]">
              No hotels yet.
            </div>
          )}
        </div>
      </FormSection>
    </div>
  );
}

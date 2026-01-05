import Link from "next/link";
import { PageHeader, Select, TextArea, TextInput } from "@/components/ui";
import { requireStaff } from "@/lib/roleGuard";
import { getActionSupabase } from "@/lib/supabaseServer";
import { revalidatePath } from "next/cache";
import { HotelCreateForm } from "./HotelCreateForm";

type HotelRow = {
  id: string;
  hotel_code: string | null;
  name: string;
  type: string;
  city: string | null;
  address: string | null;
  created_at: string | null;
};

type RoomRow = {
  id: string;
  hotel_id: string;
  room_no: string;
  base_capacity: number;
  extra_beds_max: number | null;
};

const toText = (value: FormDataEntryValue | null) =>
  value ? value.toString().trim() : "";

const parseNumber = (value: FormDataEntryValue | null) => {
  if (!value) return null;
  const parsed = Number(value.toString());
  return Number.isNaN(parsed) ? null : parsed;
};

const formatDate = (value?: string | null) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleDateString();
};

const formatType = (value?: string | null) =>
  value ? value.replace(/_/g, " ") : "--";

async function createHotel(formData: FormData) {
  "use server";
  const name = toText(formData.get("name"));
  const type = toText(formData.get("type"));
  const city = toText(formData.get("city")) || null;
  const address = toText(formData.get("address")) || null;
  if (!name || !type) return;

  const roomNos = formData.getAll("room_no").map((value) => toText(value));
  const baseCaps = formData.getAll("base_capacity").map((value) => toText(value));
  const extraBeds = formData.getAll("extra_beds_max").map((value) => toText(value));
  const rooms: Array<{ room_no: string; base_capacity: number; extra_beds_max: number }> = [];

  for (let i = 0; i < roomNos.length; i += 1) {
    const roomNo = roomNos[i];
    const baseCapacity = parseNumber(baseCaps[i]);
    const extraBedsMax = parseNumber(extraBeds[i]);
    if (!roomNo && baseCapacity === null && extraBedsMax === null) continue;
    if (!roomNo || baseCapacity === null || extraBedsMax === null) return;
    if (baseCapacity < 1 || extraBedsMax < 0) return;
    rooms.push({
      room_no: roomNo,
      base_capacity: baseCapacity,
      extra_beds_max: extraBedsMax,
    });
  }

  if (rooms.length === 0) return;

  const supabase = await getActionSupabase();
  const { data: hotelId, error: hotelError } = await supabase.rpc("fn_create_hotel", {
    p_name: name,
    p_type: type,
    p_city: city,
    p_address: address,
  });
  if (hotelError || !hotelId) return;

  const { error: roomError } = await supabase.from("yatra_hotel_rooms").insert(
    rooms.map((room) => ({
      hotel_id: hotelId,
      room_no: room.room_no,
      base_capacity: room.base_capacity,
      extra_beds_max: room.extra_beds_max,
    }))
  );
  if (roomError) return;
  revalidatePath("/hotels");
  revalidatePath("/masters/hotels");
}

async function createRoom(formData: FormData) {
  "use server";
  const hotelId = toText(formData.get("hotel_id"));
  const roomNo = toText(formData.get("room_no"));
  const baseCapacity = parseNumber(formData.get("base_capacity"));
  const extraBeds = parseNumber(formData.get("extra_beds_max"));
  if (!hotelId || !roomNo || baseCapacity === null || extraBeds === null) return;
  if (baseCapacity < 1 || extraBeds < 0) return;

  const supabase = await getActionSupabase();
  await supabase.from("yatra_hotel_rooms").insert({
    hotel_id: hotelId,
    room_no: roomNo,
    base_capacity: baseCapacity,
    extra_beds_max: extraBeds,
  });
  revalidatePath("/hotels");
  revalidatePath("/masters/hotels");
}

async function updateHotel(formData: FormData) {
  "use server";
  const id = toText(formData.get("id"));
  const name = toText(formData.get("name"));
  const type = toText(formData.get("type"));
  const city = toText(formData.get("city")) || null;
  const address = toText(formData.get("address")) || null;
  if (!id || !name || !type) return;

  const supabase = await getActionSupabase();
  await supabase
    .from("yatra_hotels")
    .update({ name, type, city, address })
    .eq("id", id);
  revalidatePath("/hotels");
  revalidatePath("/masters/hotels");
}

async function deleteHotel(formData: FormData) {
  "use server";
  const id = toText(formData.get("id"));
  if (!id) return;

  const supabase = await getActionSupabase();
  await supabase.from("yatra_hotels").delete().eq("id", id);
  revalidatePath("/hotels");
  revalidatePath("/masters/hotels");
}

async function updateRoom(formData: FormData) {
  "use server";
  const id = toText(formData.get("id"));
  const roomNo = toText(formData.get("room_no"));
  const baseCapacity = parseNumber(formData.get("base_capacity"));
  const extraBeds = parseNumber(formData.get("extra_beds_max"));
  if (!id || !roomNo || baseCapacity === null || extraBeds === null) return;
  if (baseCapacity < 1 || extraBeds < 0) return;

  const supabase = await getActionSupabase();
  await supabase
    .from("yatra_hotel_rooms")
    .update({
      room_no: roomNo,
      base_capacity: baseCapacity,
      extra_beds_max: extraBeds,
    })
    .eq("id", id);
  revalidatePath("/hotels");
  revalidatePath("/masters/hotels");
}

async function deleteRoom(formData: FormData) {
  "use server";
  const id = toText(formData.get("id"));
  if (!id) return;

  const supabase = await getActionSupabase();
  await supabase.from("yatra_hotel_rooms").delete().eq("id", id);
  revalidatePath("/hotels");
  revalidatePath("/masters/hotels");
}

export default async function HotelsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { supabase } = await requireStaff();
  const params = (await searchParams) ?? {};
  const queryParam = Array.isArray(params.q) ? params.q?.[0] : params.q;
  const q = queryParam?.trim() ?? "";

  let hotelQuery = supabase
    .from("yatra_hotels")
    .select("id, hotel_code, name, type, city, address, created_at")
    .order("name");

  if (q) {
    hotelQuery = hotelQuery.or(
      `name.ilike.%${q}%,city.ilike.%${q}%,type.ilike.%${q}%`
    );
  }

  const { data: hotels, error: hotelError } = await hotelQuery;

  const { data: rooms, error: roomError } = await supabase
    .from("yatra_hotel_rooms")
    .select("id, hotel_id, room_no, base_capacity, extra_beds_max")
    .order("room_no");

  const { data: stays, error: stayError } = await supabase
    .from("yatra_room_stays")
    .select("room_id");

  const roomsByHotel = new Map<string, RoomRow[]>();
  (rooms ?? []).forEach((room) => {
    const list = roomsByHotel.get(room.hotel_id) ?? [];
    list.push(room as RoomRow);
    roomsByHotel.set(room.hotel_id, list);
  });

  const hotelList = (hotels ?? []) as HotelRow[];
  const hotelCount = hotelList.length;

  const stayCountByRoom = new Map<string, number>();
  (stays ?? []).forEach((stay) => {
    const current = stayCountByRoom.get(stay.room_id) ?? 0;
    stayCountByRoom.set(stay.room_id, current + 1);
  });

  const capacityByHotel = new Map<string, number>();
  const occupiedByHotel = new Map<string, number>();
  const vacantByHotel = new Map<string, number>();
  roomsByHotel.forEach((list, hotelId) => {
    let total = 0;
    let occupied = 0;
    list.forEach((room) => {
      total += room.base_capacity + (room.extra_beds_max ?? 0);
      occupied += stayCountByRoom.get(room.id) ?? 0;
    });
    capacityByHotel.set(hotelId, total);
    occupiedByHotel.set(hotelId, occupied);
    vacantByHotel.set(hotelId, Math.max(total - occupied, 0));
  });

  return (
    <div id="hotels" className="yatris-grid masters-hotels flex flex-col gap-6">
      <PageHeader
        className="relative z-30 overflow-visible yatris-hero"
        title="Hotels & Rooms"
        subtitle="Manage accommodations and room capacity."
        actions={
          <div className="header-actions flex flex-wrap items-center gap-2">
            <a href="#hotel-create" className="btn-primary master-action inline-flex items-center">
              + Add hotel
            </a>
          </div>
        }
      />

      <div className="card relative z-20 p-6 space-y-4 overflow-visible filters-compact">
        <div className="space-y-3">
          <div className="flex flex-wrap items-end gap-2">
            <form method="get" className="flex flex-wrap items-end gap-2">
              <div className="w-full sm:w-72 lg:w-80">
                <TextInput name="q" placeholder="Search hotel, city, or type" defaultValue={q} />
              </div>
              <button type="submit" className="btn-secondary min-h-[36px]">
                Search
              </button>
            </form>
            {q && (
              <Link href="/masters/hotels" className="btn-secondary min-h-[36px]">
                Clear search
              </Link>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[color:var(--muted)]">
            <span>{q ? `Results for "${q}"` : `Showing ${hotelCount} hotels`}</span>
            <span>Vacant beds reflect current room stays.</span>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-2">
        {(hotelError || roomError || stayError) && (
          <div className="card px-4 py-3 text-sm text-rose-200 border border-rose-500/40 bg-rose-950/30">
            {hotelError?.message || roomError?.message || stayError?.message}
          </div>
        )}

        {!hotelError && !roomError && !stayError && hotelCount === 0 && (
          <div className="card p-6 text-center">
            <div className="text-lg font-semibold text-[color:var(--ink)]">No hotels found</div>
            <p className="mt-2 text-sm text-[color:var(--muted)]">
              Add a hotel with room details to start assigning stays.
            </p>
          </div>
        )}

        {!hotelError && !roomError && !stayError && hotelCount > 0 && (
          <div className="card rounded-none overflow-visible p-2">
            <div className="overflow-x-auto overflow-y-visible p-2">
              <table className="min-w-full bg-[color:var(--surface)] text-[12px] text-center">
                <thead className="sticky top-0 bg-[color:var(--surface-muted)] text-[11px] font-semibold text-[color:var(--muted)] border-b border-[color:var(--border)]">
                  <tr>
                    <th className="h-[45px] px-4 py-0 align-middle text-center">Hotel ID</th>
                    <th className="h-[45px] px-4 py-0 align-middle text-center border-l border-[color:var(--border)]/60">
                      Hotel
                    </th>
                    <th className="h-[45px] px-4 py-0 align-middle text-center border-l border-[color:var(--border)]/60">
                      City
                    </th>
                    <th className="h-[45px] px-4 py-0 align-middle text-center border-l border-[color:var(--border)]/60">
                      Type
                    </th>
                    <th className="h-[45px] px-4 py-0 align-middle text-center border-l border-[color:var(--border)]/60">
                      Rooms
                    </th>
                    <th className="h-[45px] px-4 py-0 align-middle text-center border-l border-[color:var(--border)]/60">
                      Capacity
                    </th>
                    <th className="h-[45px] px-4 py-0 align-middle text-center border-l border-[color:var(--border)]/60">
                      Vacant
                    </th>
                    <th className="h-[45px] px-4 py-0 align-middle text-center border-l border-[color:var(--border)]/60">
                      Created
                    </th>
                    <th className="h-[45px] px-4 py-0 align-middle text-center border-l border-[color:var(--border)]/60">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--border)] bg-[color:var(--surface)]">
                  {hotelList.map((hotel) => {
                    const hotelRooms = roomsByHotel.get(hotel.id) ?? [];
                    const roomsCount = hotelRooms.length;
                    const totalCapacity = capacityByHotel.get(hotel.id) ?? 0;
                    const vacantBeds = vacantByHotel.get(hotel.id) ?? 0;
                    return (
                      <tr
                        key={hotel.id}
                        className="odd:bg-[color:var(--surface-muted)]/35 even:bg-[color:var(--surface)] hover:bg-[color:var(--surface-muted)]/60"
                      >
                        <td className="px-4 py-2.5 align-middle text-center font-semibold text-[color:var(--ink)]">
                          {hotel.hotel_code ?? "—"}
                        </td>
                        <td className="px-4 py-2.5 align-middle text-center border-l border-[color:var(--border)]/60">
                          {hotel.name}
                        </td>
                        <td className="px-4 py-2.5 align-middle text-center border-l border-[color:var(--border)]/60 text-[color:var(--muted)]">
                          {hotel.city ?? "—"}
                        </td>
                        <td className="px-4 py-2.5 align-middle text-center border-l border-[color:var(--border)]/60 text-[color:var(--muted)]">
                          {formatType(hotel.type)}
                        </td>
                        <td className="px-4 py-2.5 align-middle text-center border-l border-[color:var(--border)]/60 text-[color:var(--muted)]">
                          {roomsCount}
                        </td>
                        <td className="px-4 py-2.5 align-middle text-center border-l border-[color:var(--border)]/60 text-[color:var(--muted)]">
                          {totalCapacity}
                        </td>
                        <td className="px-4 py-2.5 align-middle text-center border-l border-[color:var(--border)]/60 text-[color:var(--muted)]">
                          {vacantBeds}
                        </td>
                        <td className="px-4 py-2.5 align-middle text-center border-l border-[color:var(--border)]/60 text-[color:var(--muted)]">
                          {formatDate(hotel.created_at)}
                        </td>
                        <td className="px-4 py-2.5 align-middle text-center border-l border-[color:var(--border)]/60">
                          <div className="flex flex-wrap items-center justify-center gap-2">
                            <a
                              href={`#hotel-view-${hotel.id}`}
                              className="btn-secondary master-action"
                            >
                              View
                            </a>
                            <a
                              href={`#hotel-edit-${hotel.id}`}
                              className="btn-secondary master-action"
                            >
                              Edit
                            </a>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div id="hotel-create" className="master-modal">
          <a href="#hotels" className="master-modal__overlay" aria-label="Close" />
          <div
            className="master-modal__content master-modal__content--wide card p-3"
            style={{ padding: "12px" }}
          >
            <div className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted)]">
              New hotel
            </div>
            <HotelCreateForm onCreate={createHotel} />
          </div>
        </div>

        {hotelList.map((hotel) => {
          const hotelRooms = roomsByHotel.get(hotel.id) ?? [];
          const totalCapacity = capacityByHotel.get(hotel.id) ?? 0;
          const occupiedBeds = occupiedByHotel.get(hotel.id) ?? 0;
          const vacantBeds = vacantByHotel.get(hotel.id) ?? 0;
          return (
            <div key={`hotel-view-${hotel.id}`} id={`hotel-view-${hotel.id}`} className="master-modal">
              <a href="#hotels" className="master-modal__overlay" aria-label="Close" />
              <div
                className="master-modal__content master-modal__content--wide card p-3"
                style={{ padding: "12px" }}
              >
                <div className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted)]">
                  Hotel details
                </div>
                <div
                  className="mt-3 space-y-3 text-sm text-[color:var(--ink)]"
                  style={{ marginBottom: "12px" }}
                >
                  <div className="flex items-center justify-between text-xs text-[color:var(--muted)]">
                    <span>Hotel ID</span>
                    <span>{hotel.hotel_code ?? "—"}</span>
                  </div>
                  <div>
                    <div className="text-xs text-[color:var(--muted)]">Hotel</div>
                    <div className="font-semibold">{hotel.name}</div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-[color:var(--muted)]">
                    <span>City</span>
                    <span>{hotel.city ?? "—"}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-[color:var(--muted)]">
                    <span>Type</span>
                    <span>{formatType(hotel.type)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-[color:var(--muted)]">
                    <span>Rooms</span>
                    <span>{hotelRooms.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-[color:var(--muted)]">
                    <span>Total capacity</span>
                    <span>{totalCapacity}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-[color:var(--muted)]">
                    <span>Occupied beds</span>
                    <span>{occupiedBeds}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-[color:var(--muted)]">
                    <span>Vacant beds</span>
                    <span>{vacantBeds}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-[color:var(--muted)]">
                    <span>Created</span>
                    <span>{formatDate(hotel.created_at)}</span>
                  </div>
                  {hotel.address && (
                    <div>
                      <div className="text-xs text-[color:var(--muted)]">Address</div>
                      <div className="text-xs text-[color:var(--muted)]">{hotel.address}</div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted)]">
                    Rooms
                  </div>
                  <div className="overflow-hidden rounded-xl border border-[color:var(--border)]/70">
                    <table className="min-w-full text-[11px] text-center">
                      <thead className="bg-[color:var(--surface-muted)] text-[10px] font-semibold uppercase text-[color:var(--muted)]">
                        <tr>
                          <th className="px-3 py-2">Room</th>
                          <th className="px-3 py-2 border-l border-[color:var(--border)]/60">Base</th>
                          <th className="px-3 py-2 border-l border-[color:var(--border)]/60">Extra</th>
                          <th className="px-3 py-2 border-l border-[color:var(--border)]/60">Total</th>
                          <th className="px-3 py-2 border-l border-[color:var(--border)]/60">Occupied</th>
                          <th className="px-3 py-2 border-l border-[color:var(--border)]/60">Vacant</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[color:var(--border)]">
                        {hotelRooms.map((room) => {
                          const roomTotal = room.base_capacity + (room.extra_beds_max ?? 0);
                          const roomOccupied = stayCountByRoom.get(room.id) ?? 0;
                          const roomVacant = Math.max(roomTotal - roomOccupied, 0);
                          return (
                            <tr key={room.id}>
                              <td className="px-3 py-2">{room.room_no}</td>
                              <td className="px-3 py-2 border-l border-[color:var(--border)]/60">
                                {room.base_capacity}
                              </td>
                              <td className="px-3 py-2 border-l border-[color:var(--border)]/60">
                                {room.extra_beds_max ?? 0}
                              </td>
                              <td className="px-3 py-2 border-l border-[color:var(--border)]/60">
                                {roomTotal}
                              </td>
                              <td className="px-3 py-2 border-l border-[color:var(--border)]/60">
                                {roomOccupied}
                              </td>
                              <td className="px-3 py-2 border-l border-[color:var(--border)]/60">
                                {roomVacant}
                              </td>
                            </tr>
                          );
                        })}
                        {hotelRooms.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-3 py-3 text-center text-[color:var(--muted)]">
                              No rooms yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <a href="#hotels" className="btn-secondary master-action w-full mt-3">
                  Close
                </a>
              </div>
            </div>
          );
        })}

        {hotelList.map((hotel) => {
          const hotelRooms = roomsByHotel.get(hotel.id) ?? [];
          return (
            <div key={`hotel-edit-${hotel.id}`} id={`hotel-edit-${hotel.id}`} className="master-modal">
              <a href="#hotels" className="master-modal__overlay" aria-label="Close" />
              <div
                className="master-modal__content master-modal__content--wide card p-3"
                style={{ padding: "12px" }}
              >
                <a href="#hotels" className="master-modal__close" aria-label="Close">
                  ×
                </a>
                <div className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted)]">
                  Edit hotel
                </div>
                <form action={updateHotel} className="mt-3 grid gap-3">
                  <input type="hidden" name="id" value={hotel.id} />
                  <div className="text-xs text-[color:var(--muted)]">
                    Hotel ID: <span className="font-semibold text-[color:var(--ink)]">{hotel.hotel_code ?? "—"}</span>
                  </div>
                  <TextInput name="name" defaultValue={hotel.name} placeholder="Hotel name" required />
                  <Select name="type" required defaultValue={hotel.type}>
                    <option value="hotel">Hotel</option>
                    <option value="guest_house">Guest house</option>
                    <option value="dharamshala">Dharamshala</option>
                    <option value="other">Other</option>
                  </Select>
                  <TextInput name="city" defaultValue={hotel.city ?? ""} placeholder="City" />
                  <TextArea
                    name="address"
                    rows={2}
                    defaultValue={hotel.address ?? ""}
                    placeholder="Address"
                  />
                  <div className="mt-2 flex items-center justify-end gap-2">
                    <button type="submit" className="btn-secondary master-action">
                      Save changes
                    </button>
                    <button
                      type="submit"
                      form={`hotel-delete-${hotel.id}`}
                      className="btn-secondary master-action text-rose-300"
                    >
                      Delete hotel
                    </button>
                  </div>
                </form>
                <form action={deleteHotel} id={`hotel-delete-${hotel.id}`}>
                  <input type="hidden" name="id" value={hotel.id} />
                </form>

                <div className="mt-4 space-y-3">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted)]">
                    Add room
                  </div>
                  <form
                    action={createRoom}
                    className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto] items-end"
                  >
                    <input type="hidden" name="hotel_id" value={hotel.id} />
                    <TextInput name="room_no" placeholder="Room no" required />
                    <TextInput
                      name="base_capacity"
                      type="number"
                      min={1}
                      placeholder="Base capacity"
                      required
                    />
                    <TextInput
                      name="extra_beds_max"
                      type="number"
                      min={0}
                      placeholder="Extra beds"
                      required
                      defaultValue={0}
                    />
                    <button type="submit" className="btn-secondary master-action">
                      Add room
                    </button>
                  </form>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted)]">
                    Existing rooms
                  </div>
                  {hotelRooms.length === 0 && (
                    <div className="text-xs text-[color:var(--muted)]">No rooms yet.</div>
                  )}
                  {hotelRooms.map((room) => {
                    const roomTotal = room.base_capacity + (room.extra_beds_max ?? 0);
                    const roomOccupied = stayCountByRoom.get(room.id) ?? 0;
                    const roomVacant = Math.max(roomTotal - roomOccupied, 0);
                    return (
                      <div
                        key={room.id}
                        className="rounded-lg border border-[color:var(--border)]/70 bg-[color:var(--surface-muted)]/35 p-3 space-y-2"
                      >
                        <form
                          action={updateRoom}
                          className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto] items-end"
                        >
                          <input type="hidden" name="id" value={room.id} />
                          <TextInput name="room_no" defaultValue={room.room_no} required />
                          <TextInput
                            name="base_capacity"
                            type="number"
                            min={1}
                            defaultValue={room.base_capacity}
                            required
                          />
                          <TextInput
                            name="extra_beds_max"
                            type="number"
                            min={0}
                            defaultValue={room.extra_beds_max ?? 0}
                            required
                          />
                          <button type="submit" className="btn-secondary master-action">
                            Save
                          </button>
                        </form>
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[color:var(--muted)]">
                          <span>
                            Total {roomTotal} · Occupied {roomOccupied} · Vacant {roomVacant}
                          </span>
                          <form action={deleteRoom}>
                            <input type="hidden" name="id" value={room.id} />
                            <button type="submit" className="btn-secondary master-action text-rose-300">
                              Delete room
                            </button>
                          </form>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

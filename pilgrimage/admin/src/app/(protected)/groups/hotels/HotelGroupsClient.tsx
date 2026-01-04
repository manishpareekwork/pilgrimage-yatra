"use client";

import { useEffect, useMemo, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabaseBrowser";
import { ChakraSpinner, Field, TextInput } from "@/components/ui";

type Hotel = {
  id: string;
  name: string;
  city: string | null;
  type: string;
};

type Room = {
  id: string;
  hotel_id: string;
  room_no: string;
  base_capacity: number;
  extra_beds_max: number;
};

type Stay = {
  id: string;
  room_id: string;
  registration_id: string;
  stay_from: string | null;
  stay_to: string | null;
  registration?: { name_hi: string | null; phone: string | null } | null;
};

type Incharge = {
  registration_id: string;
  registration?: { name_hi: string | null } | null;
};

const toCsv = (rows: string[][]) =>
  rows
    .map((row) =>
      row
        .map((value) => `"${String(value ?? "").replace(/\"/g, '""')}"`)
        .join(",")
    )
    .join("\n");

export function HotelGroupsClient() {
  const supabase = useMemo(() => getBrowserSupabase(), []);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [stays, setStays] = useState<Stay[]>([]);
  const [hotelIncharges, setHotelIncharges] = useState<Record<string, Incharge>>({});
  const [roomIncharges, setRoomIncharges] = useState<Record<string, Incharge>>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const loadAll = async () => {
    setLoading(true);
    const [hotelRes, roomRes, stayRes, hotelIcRes, roomIcRes] = await Promise.all([
      supabase.from("yatra_hotels").select("id, name, city, type").order("name"),
      supabase
        .from("yatra_hotel_rooms")
        .select("id, hotel_id, room_no, base_capacity, extra_beds_max")
        .order("room_no"),
      supabase
        .from("yatra_room_stays")
        .select("id, room_id, registration_id, stay_from, stay_to, registration:yatra_registrations(name_hi, phone)"),
      supabase
        .from("yatra_hotel_incharges")
        .select("hotel_id, registration_id, registration:yatra_registrations(name_hi)"),
      supabase
        .from("yatra_room_incharges")
        .select("room_id, registration_id, registration:yatra_registrations(name_hi)"),
    ]);

    if (hotelRes.error || roomRes.error || stayRes.error || hotelIcRes.error || roomIcRes.error) {
      setMessage(
        hotelRes.error?.message ||
          roomRes.error?.message ||
          stayRes.error?.message ||
          hotelIcRes.error?.message ||
          roomIcRes.error?.message ||
          "Failed to load hotels"
      );
    } else {
      setMessage(null);
      setHotels((hotelRes.data ?? []) as Hotel[]);
      setRooms((roomRes.data ?? []) as Room[]);
      setStays((stayRes.data ?? []) as Stay[]);

      const hotelIc: Record<string, Incharge> = {};
      (hotelIcRes.data ?? []).forEach((row: any) => {
        hotelIc[row.hotel_id] = row as Incharge;
      });
      setHotelIncharges(hotelIc);

      const roomIc: Record<string, Incharge> = {};
      (roomIcRes.data ?? []).forEach((row: any) => {
        roomIc[row.room_id] = row as Incharge;
      });
      setRoomIncharges(roomIc);
    }

    setLoading(false);
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const grouped = useMemo(() => {
    const hotelMap = new Map<string, { hotel: Hotel; rooms: Room[] }>();
    hotels.forEach((hotel) => {
      hotelMap.set(hotel.id, { hotel, rooms: [] });
    });
    rooms.forEach((room) => {
      const entry = hotelMap.get(room.hotel_id);
      if (entry) entry.rooms.push(room);
    });
    return Array.from(hotelMap.values());
  }, [hotels, rooms]);

  const staysByRoom = useMemo(() => {
    const map: Record<string, Stay[]> = {};
    stays.forEach((stay) => {
      if (!map[stay.room_id]) map[stay.room_id] = [];
      map[stay.room_id].push(stay);
    });
    return map;
  }, [stays]);

  const filtered = useMemo(() => {
    if (!search.trim()) return grouped;
    const needle = search.trim().toLowerCase();
    return grouped.filter(({ hotel, rooms }) => {
      if (hotel.name.toLowerCase().includes(needle)) return true;
      if (hotel.city?.toLowerCase().includes(needle)) return true;
      return rooms.some((room) => {
        if (room.room_no.toLowerCase().includes(needle)) return true;
        return (staysByRoom[room.id] ?? []).some((stay) =>
          stay.registration?.name_hi?.toLowerCase().includes(needle)
        );
      });
    });
  }, [grouped, search, staysByRoom]);

  const setHotelIncharge = async (hotelId: string, registrationId: string) => {
    const { error } = await supabase.rpc("fn_set_hotel_incharge", {
      p_hotel_id: hotelId,
      p_registration_id: registrationId || null,
    });
    if (error) setMessage(error.message);
    else setMessage(null);
    await loadAll();
  };

  const setRoomIncharge = async (roomId: string, registrationId: string) => {
    const { error } = await supabase.rpc("fn_set_room_incharge", {
      p_room_id: roomId,
      p_registration_id: registrationId || null,
    });
    if (error) setMessage(error.message);
    else setMessage(null);
    await loadAll();
  };

  const addStay = async (roomId: string, formData: FormData) => {
    const registrationId = formData.get("registration_id")?.toString().trim();
    if (!registrationId) return;
    const { error } = await supabase.rpc("fn_assign_room_stay", {
      p_room_id: roomId,
      p_registration_id: registrationId,
      p_stay_from: formData.get("stay_from")?.toString() || null,
      p_stay_to: formData.get("stay_to")?.toString() || null,
      p_allow_overflow: formData.get("allow_overflow") === "on",
    });
    if (error) setMessage(error.message);
    else setMessage(null);
    await loadAll();
  };

  const exportCsv = () => {
    const rows: string[][] = [["Hotel", "Room", "Occupant", "Phone", "Stay From", "Stay To"]];
    filtered.forEach(({ hotel, rooms }) => {
      rooms.forEach((room) => {
        const roomStays = staysByRoom[room.id] ?? [];
        if (!roomStays.length) {
          rows.push([hotel.name, room.room_no, "", "", "", ""]);
          return;
        }
        roomStays.forEach((stay) => {
          rows.push([
            hotel.name,
            room.room_no,
            stay.registration?.name_hi ?? stay.registration_id,
            stay.registration?.phone ?? "",
            stay.stay_from ?? "",
            stay.stay_to ?? "",
          ]);
        });
      });
    });
    const csv = toCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "hotel-groups.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="card p-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto] items-end">
          <Field label="Search" htmlFor="search">
            <TextInput
              id="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Hotel, room, occupant"
            />
          </Field>
          <button type="button" className="btn-secondary" onClick={exportCsv}>
            Export CSV
          </button>
        </div>
        {message && <div className="text-sm text-rose-300">{message}</div>}
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-[color:var(--muted)]">
          <ChakraSpinner />
          Loading hotels...
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="card p-6 text-center text-sm text-[color:var(--muted)]">
          No hotels configured yet.
        </div>
      )}

      <div className="space-y-4">
        {filtered.map(({ hotel, rooms: hotelRooms }) => (
          <div key={hotel.id} className="card p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-[color:var(--ink)]">{hotel.name}</div>
                <div className="text-xs text-[color:var(--muted)]">{hotel.city || "—"}</div>
              </div>
              <form
                className="flex flex-wrap items-center gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  void setHotelIncharge(hotel.id, form.get("hotel_incharge")?.toString().trim() || "");
                }}
              >
                <TextInput
                  name="hotel_incharge"
                  placeholder="Hotel in-charge registration ID"
                  defaultValue={hotelIncharges[hotel.id]?.registration_id ?? ""}
                />
                <button type="submit" className="btn-secondary">Set in-charge</button>
              </form>
            </div>

            <div className="space-y-3">
              {hotelRooms.map((room) => {
                const occupants = staysByRoom[room.id] ?? [];
                return (
                  <div key={room.id} className="rounded-xl border border-slate-800/60 p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-[color:var(--ink)]">
                        Room {room.room_no} · Capacity {room.base_capacity + room.extra_beds_max}
                      </div>
                      <form
                        className="flex flex-wrap items-center gap-2"
                        onSubmit={(event) => {
                          event.preventDefault();
                          const form = new FormData(event.currentTarget);
                          void setRoomIncharge(room.id, form.get("room_incharge")?.toString().trim() || "");
                        }}
                      >
                        <TextInput
                          name="room_incharge"
                          placeholder="Room in-charge registration ID"
                          defaultValue={roomIncharges[room.id]?.registration_id ?? ""}
                        />
                        <button type="submit" className="btn-secondary">Set room in-charge</button>
                      </form>
                    </div>

                    <div className="overflow-hidden rounded-xl border border-slate-800/60">
                      <table className="min-w-full text-sm">
                        <thead className="bg-slate-900 text-left text-xs font-semibold uppercase text-slate-300">
                          <tr>
                            <th className="px-3 py-2">Occupant</th>
                            <th className="px-3 py-2">Phone</th>
                            <th className="px-3 py-2">Stay</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {occupants.map((stay) => (
                            <tr key={stay.id}>
                              <td className="px-3 py-2 text-slate-100">
                                {stay.registration?.name_hi || stay.registration_id}
                              </td>
                              <td className="px-3 py-2 text-slate-300">
                                {stay.registration?.phone || "—"}
                              </td>
                              <td className="px-3 py-2 text-slate-300">
                                {[stay.stay_from, stay.stay_to].filter(Boolean).join(" → ") || "—"}
                              </td>
                            </tr>
                          ))}
                          {occupants.length === 0 && (
                            <tr>
                              <td colSpan={3} className="px-3 py-3 text-center text-slate-400">
                                No occupants assigned.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    <form
                      className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] items-end"
                      onSubmit={(event) => {
                        event.preventDefault();
                        void addStay(room.id, new FormData(event.currentTarget));
                        event.currentTarget.reset();
                      }}
                    >
                      <TextInput name="registration_id" placeholder="Registration ID" required />
                      <TextInput name="stay_from" type="date" placeholder="Stay from" />
                      <TextInput name="stay_to" type="date" placeholder="Stay to" />
                      <label className="flex items-center gap-2 text-xs text-[color:var(--muted)]">
                        <input type="checkbox" name="allow_overflow" className="h-4 w-4" />
                        Allow over capacity
                      </label>
                      <button type="submit" className="btn-secondary">Add stay</button>
                    </form>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

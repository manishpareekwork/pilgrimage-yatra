"use client";

import { useState } from "react";
import { Select, TextArea, TextInput } from "@/components/ui";

type RoomRow = { id: string };

const createRoomRow = () => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
});

export function HotelCreateForm({
  onCreate,
}: {
  onCreate: (formData: FormData) => void;
}) {
  const [rooms, setRooms] = useState<RoomRow[]>([createRoomRow()]);

  const addRoom = () => setRooms((prev) => [...prev, createRoomRow()]);

  const removeRoom = (id: string) => {
    setRooms((prev) => {
      const next = prev.filter((room) => room.id !== id);
      return next.length > 0 ? next : prev;
    });
  };

  return (
    <form action={onCreate} className="mt-3 grid gap-4">
      <div className="space-y-2">
        <div className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted)]">
          Hotel details
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextInput name="name" placeholder="Hotel name" required />
          <Select name="type" required defaultValue="hotel">
            <option value="hotel">Hotel</option>
            <option value="guest_house">Guest house</option>
            <option value="dharamshala">Dharamshala</option>
            <option value="other">Other</option>
          </Select>
          <TextInput name="city" placeholder="City" />
          <TextArea name="address" rows={2} placeholder="Address" className="sm:col-span-2" />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted)]">
            Rooms
          </div>
          <span className="text-xs text-[color:var(--muted)]">Total rooms: {rooms.length}</span>
        </div>
        <div className="space-y-3">
          {rooms.map((room, index) => (
            <div
              key={room.id}
              className="rounded-lg border border-[color:var(--border)]/70 bg-[color:var(--surface-muted)]/35 p-3"
            >
              <div className="grid gap-3 sm:grid-cols-3">
                <TextInput name="room_no" placeholder={`Room ${index + 1}`} required />
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
                  defaultValue={0}
                  placeholder="Extra beds"
                  required
                />
              </div>
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  className="btn-secondary master-action"
                  onClick={() => removeRoom(room.id)}
                >
                  Remove room
                </button>
              </div>
            </div>
          ))}
        </div>
        <button type="button" className="btn-secondary master-action" onClick={addRoom}>
          + Add room
        </button>
        <div className="text-xs text-[color:var(--muted)]">
          Enter every room number with base capacity and extra bed capacity.
        </div>
      </div>

      <button type="submit" className="btn-primary master-action w-full">
        Add hotel
      </button>
      <a href="#hotels" className="btn-secondary master-action w-full">
        Close
      </a>
    </form>
  );
}

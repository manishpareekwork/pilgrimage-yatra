"use client";

import { useState } from "react";
import { TextInput } from "@/components/ui";
import { FormStatusOverlay } from "@/components/GlobalLoading";

type StopRow = {
  id: string;
};

const createStopRow = () => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
});

export function TrainCreateForm({
  onCreate,
}: {
  onCreate: (formData: FormData) => void;
}) {
  const [stops, setStops] = useState<StopRow[]>([]);

  const addStop = () => {
    setStops((prev) => [...prev, createStopRow()]);
  };

  const removeStop = (id: string) => {
    setStops((prev) => prev.filter((stop) => stop.id !== id));
  };

  return (
    <form action={onCreate} className="mt-3 grid gap-4">
      <FormStatusOverlay message="Creating train..." />
      <div className="space-y-2">
        <div className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted)]">
          Train details
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextInput name="train_no" placeholder="Train no (e.g., 20824)" required />
          <TextInput name="train_name" placeholder="Train name" required />
          <TextInput
            name="typical_duration_minutes"
            type="number"
            min={0}
            placeholder="Duration (min)"
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted)]">
          Source station
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextInput name="source_station_code" placeholder="Source code (e.g., AII)" required />
          <TextInput name="source_station_name" placeholder="Source name" required />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextInput
            name="source_arrive_time"
            type="time"
            step={60}
            required
            title="Use 24-hour HH:MM format"
            placeholder="Arrive (HH:MM)"
          />
          <TextInput
            name="source_depart_time"
            type="time"
            step={60}
            required
            title="Use 24-hour HH:MM format"
            placeholder="Depart (HH:MM)"
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted)]">
          Destination station
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextInput
            name="destination_station_code"
            placeholder="Destination code (e.g., PURI)"
            required
          />
          <TextInput name="destination_station_name" placeholder="Destination name" required />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextInput
            name="destination_arrive_time"
            type="time"
            step={60}
            required
            title="Use 24-hour HH:MM format"
            placeholder="Arrive (HH:MM)"
          />
          <TextInput
            name="destination_depart_time"
            type="time"
            step={60}
            required
            title="Use 24-hour HH:MM format"
            placeholder="Depart (HH:MM)"
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted)]">
            Intermediate stops
          </div>
          <button type="button" className="btn-secondary master-action" onClick={addStop}>
            + Add stop
          </button>
        </div>

        {stops.length === 0 && (
          <div className="text-xs text-[color:var(--muted)]">
            Add stops in between if this train halts at other stations.
          </div>
        )}

        <div className="space-y-3">
          {stops.map((stop, index) => (
            <div
              key={stop.id}
              className="rounded-lg border border-[color:var(--border)]/60 bg-[color:var(--surface-muted)]/35 p-3"
            >
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <TextInput name="stop_code" placeholder={`Stop ${index + 1} code`} required />
                <TextInput name="stop_name" placeholder="Station name" required />
                <TextInput
                  name="stop_arrive_time"
                  type="time"
                  step={60}
                  required
                  title="Use 24-hour HH:MM format"
                  placeholder="Arrive (HH:MM)"
                />
                <TextInput
                  name="stop_depart_time"
                  type="time"
                  step={60}
                  required
                  title="Use 24-hour HH:MM format"
                  placeholder="Depart (HH:MM)"
                />
              </div>
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  className="btn-secondary master-action"
                  onClick={() => removeStop(stop.id)}
                >
                  Remove stop
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="text-xs text-[color:var(--muted)]">
          Times use 24-hour HH:MM for all stations.
        </div>
      </div>

      <button type="submit" className="btn-primary master-action w-full">
        Add train
      </button>
      <a href="#trains" className="btn-secondary master-action w-full">
        Close
      </a>
    </form>
  );
}

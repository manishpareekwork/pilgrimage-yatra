"use client";

import { useEffect, useMemo, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabaseBrowser";
import { ChakraSpinner, Field, Select, TextArea, TextInput } from "@/components/ui";

type Train = {
  id: string;
  train_no: string;
  train_name: string;
};

type Stop = {
  id: string;
  stop_seq: number;
  station_code: string;
  distance_km: number | null;
  arrive_time: string | null;
  depart_time: string | null;
  day_offset: number | null;
  halt_minutes: number | null;
  station?: { code: string; name: string } | null;
};

type RawStop = Omit<Stop, "station"> & {
  station?: { code: string; name: string }[] | { code: string; name: string } | null;
};

const toTimeValue = (value: string | null) => (value ? value.slice(0, 5) : "");

const parseNumber = (value: FormDataEntryValue | null) => {
  if (!value) return null;
  const parsed = Number(value.toString());
  return Number.isNaN(parsed) ? null : parsed;
};

const parseCsvStops = (text: string) => {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const stops = [];
  for (const line of lines) {
    const parts = line.split(",").map((part) => part.trim());
    if (!parts[0] || Number.isNaN(Number(parts[0]))) continue;
    stops.push({
      stop_seq: Number(parts[0]),
      station_code: (parts[1] ?? "").toUpperCase(),
      station_name: parts[2] ?? null,
      arrive_time: parts[3] ?? null,
      depart_time: parts[4] ?? null,
      day_offset: parts[5] ?? null,
      distance_km: parts[6] ?? null,
      halt_minutes: parts[7] ?? null,
    });
  }
  return stops;
};

export function TrainStopsClient({
  trains,
  initialTrainId,
}: {
  trains: Train[];
  initialTrainId: string;
}) {
  const supabase = useMemo(() => getBrowserSupabase(), []);
  const [selectedTrainId, setSelectedTrainId] = useState(initialTrainId || trains[0]?.id || "");
  const [stops, setStops] = useState<Stop[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [csvText, setCsvText] = useState("");
  const [refreshToken, setRefreshToken] = useState(0);

  const selectedTrain = useMemo(
    () => trains.find((train) => train.id === selectedTrainId) ?? null,
    [trains, selectedTrainId]
  );

  useEffect(() => {
    if (!selectedTrainId) return;
    let isActive = true;
    const loadStops = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("master_train_stops")
        .select(
          "id, stop_seq, station_code, distance_km, arrive_time, depart_time, day_offset, halt_minutes, station:master_stations(code,name)"
        )
        .eq("train_id", selectedTrainId)
        .order("stop_seq");
      if (!isActive) return;
      if (error) {
        setMessage(error.message);
        setStops([]);
      } else {
        setMessage(null);
        const normalizedStops = (data ?? []).map((stop) => {
          const rawStop = stop as RawStop;
          const station = Array.isArray(rawStop.station)
            ? rawStop.station[0] ?? null
            : rawStop.station ?? null;
          return { ...rawStop, station } as Stop;
        });
        setStops(normalizedStops);
      }
      setLoading(false);
    };
    void loadStops();
    return () => {
      isActive = false;
    };
  }, [selectedTrainId, supabase, refreshToken]);

  const addStop = async (formData: FormData) => {
    if (!selectedTrain || !selectedTrain.train_no) return;
    const payload = {
      stop_seq: parseNumber(formData.get("stop_seq")),
      station_code: formData.get("station_code")?.toString().trim().toUpperCase(),
      station_name: formData.get("station_name")?.toString().trim() || null,
      arrive_time: formData.get("arrive_time")?.toString() || null,
      depart_time: formData.get("depart_time")?.toString() || null,
      day_offset: parseNumber(formData.get("day_offset")),
      distance_km: parseNumber(formData.get("distance_km")),
      halt_minutes: parseNumber(formData.get("halt_minutes")),
    };
    const { error } = await supabase.rpc("admin_upsert_train_stops", {
      p_train_no: selectedTrain.train_no,
      p_stops: [payload],
    });
    if (error) setMessage(error.message);
    else setMessage(null);
    setRefreshToken((prev) => prev + 1);
  };

  const updateStop = async (stopId: string, formData: FormData) => {
    const payload = {
      stop_seq: parseNumber(formData.get("stop_seq")),
      station_code: formData.get("station_code")?.toString().trim().toUpperCase() || null,
      arrive_time: formData.get("arrive_time")?.toString() || null,
      depart_time: formData.get("depart_time")?.toString() || null,
      day_offset: parseNumber(formData.get("day_offset")),
      distance_km: parseNumber(formData.get("distance_km")),
      halt_minutes: parseNumber(formData.get("halt_minutes")),
    };
    const { error } = await supabase
      .from("master_train_stops")
      .update(payload)
      .eq("id", stopId);
    if (error) setMessage(error.message);
    else setMessage(null);
    setRefreshToken((prev) => prev + 1);
  };

  const deleteStop = async (stopId: string) => {
    const { error } = await supabase.from("master_train_stops").delete().eq("id", stopId);
    if (error) setMessage(error.message);
    else setMessage(null);
    setRefreshToken((prev) => prev + 1);
  };

  const bulkImport = async () => {
    if (!selectedTrain || !selectedTrain.train_no) return;
    const parsed = parseCsvStops(csvText);
    if (parsed.length === 0) {
      setMessage("No valid rows found in CSV input.");
      return;
    }
    const { error } = await supabase.rpc("admin_upsert_train_stops", {
      p_train_no: selectedTrain.train_no,
      p_stops: parsed,
    });
    if (error) setMessage(error.message);
    else {
      setMessage(null);
      setCsvText("");
    }
    setRefreshToken((prev) => prev + 1);
  };

  return (
    <div className="space-y-6">
      <div className="card p-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto] items-end">
          <Field label="Train" htmlFor="train_id">
            <Select
              id="train_id"
              name="train_id"
              value={selectedTrainId}
              onChange={(event) => setSelectedTrainId(event.target.value)}
            >
              {trains.map((train) => (
                <option key={train.id} value={train.id}>
                  {train.train_no} · {train.train_name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <form
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          onSubmit={(event) => {
            event.preventDefault();
            void addStop(new FormData(event.currentTarget));
            event.currentTarget.reset();
          }}
        >
          <TextInput name="stop_seq" type="number" min={1} placeholder="Seq" required />
          <TextInput name="station_code" placeholder="Station code" required />
          <TextInput name="station_name" placeholder="Station name (optional)" />
          <TextInput name="arrive_time" type="time" placeholder="Arrive" />
          <TextInput name="depart_time" type="time" placeholder="Depart" />
          <TextInput name="day_offset" type="number" min={0} placeholder="Day" />
          <TextInput name="distance_km" type="number" min={0} placeholder="Km" />
          <TextInput name="halt_minutes" type="number" min={0} placeholder="Halt min" />
          <button type="submit" className="btn-primary sm:col-span-2 lg:col-span-4">
            Add stop
          </button>
        </form>
        {message && <div className="text-sm text-rose-300">{message}</div>}
      </div>

      <div className="card p-4 space-y-3">
        <div className="text-xs font-semibold uppercase text-slate-400">Bulk import (CSV)</div>
        <TextArea
          rows={6}
          value={csvText}
          onChange={(event) => setCsvText(event.target.value)}
          placeholder="stop_seq,station_code,station_name,arrive_time,depart_time,day_offset,distance_km,halt_minutes"
        />
        <div className="flex items-center gap-2">
          <button type="button" className="btn-secondary" onClick={bulkImport}>
            Import stops
          </button>
          <span className="text-xs text-[color:var(--muted)]">
            Times should be HH:MM. Header rows are ignored.
          </span>
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-[color:var(--muted)]">
          <ChakraSpinner />
          Loading stops...
        </div>
      )}

      {!loading && stops.length === 0 && (
        <div className="card p-6 text-center text-sm text-[color:var(--muted)]">
          No stops yet.
        </div>
      )}

      <div className="space-y-4">
        {stops.map((stop) => (
          <div key={stop.id} className="card p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-semibold text-[color:var(--ink)]">
                {stop.stop_seq}. {stop.station?.name || stop.station_code}
              </div>
              <button
                type="button"
                className="btn-secondary text-rose-300"
                onClick={() => void deleteStop(stop.id)}
              >
                Delete
              </button>
            </div>
            <form
              className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
              onSubmit={(event) => {
                event.preventDefault();
                void updateStop(stop.id, new FormData(event.currentTarget));
              }}
            >
              <TextInput name="stop_seq" type="number" min={1} defaultValue={stop.stop_seq} required />
              <TextInput name="station_code" defaultValue={stop.station_code} required />
              <TextInput
                name="arrive_time"
                type="time"
                defaultValue={toTimeValue(stop.arrive_time)}
              />
              <TextInput
                name="depart_time"
                type="time"
                defaultValue={toTimeValue(stop.depart_time)}
              />
              <TextInput
                name="day_offset"
                type="number"
                min={0}
                defaultValue={stop.day_offset ?? ""}
              />
              <TextInput
                name="distance_km"
                type="number"
                min={0}
                defaultValue={stop.distance_km ?? ""}
              />
              <TextInput
                name="halt_minutes"
                type="number"
                min={0}
                defaultValue={stop.halt_minutes ?? ""}
              />
              <button type="submit" className="btn-secondary sm:col-span-2 lg:col-span-4">
                Save changes
              </button>
            </form>
            <div className="text-xs text-[color:var(--muted)]">
              {stop.arrive_time ? `Arrive ${toTimeValue(stop.arrive_time)}` : "Arrive —"} ·{" "}
              {stop.depart_time ? `Depart ${toTimeValue(stop.depart_time)}` : "Depart —"} · Day{" "}
              {stop.day_offset ?? 0}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { Field, FormSection, PageHeader, Select, TextInput } from "@/components/ui";
import { FormStatusOverlay } from "@/components/GlobalLoading";
import {
  formatDateTime,
  formatJourneyDate,
  tripKindLabel,
  tripSummaryLine,
  toDateTimeLocalValue,
  YATRA_OUTBOUND_JOURNEY_DATE,
  YATRA_RETURN_JOURNEY_DATE,
  YATRA_TRAIN_NO,
} from "@/lib/tripDisplay";

type TrainMaster = {
  id: string;
  train_no: string;
  train_name: string;
  source_station_code: string | null;
  destination_station_code: string | null;
};

export type TripRow = {
  id: string;
  mode: string;
  trip_name: string;
  trip_kind: string | null;
  journey_date: string;
  depart_at: string | null;
  arrive_at: string | null;
  train_master_id: string | null;
  train_no: string | null;
  train_name: string | null;
  from_station_code: string | null;
  to_station_code: string | null;
  default_class_code: string | null;
  quota_code: string | null;
  airline_code: string | null;
  flight_no: string | null;
  from_airport_code: string | null;
  to_airport_code: string | null;
};

type Props = {
  trains: TrainMaster[];
  trips: TripRow[];
  errorMessage?: string | null;
  createTrainTrip: (formData: FormData) => void;
  createFlightTrip: (formData: FormData) => void;
  updateTrip: (formData: FormData) => void;
  deleteTrip: (formData: FormData) => void;
  seedDefaultYatraTrips: () => void;
};

function TripKindBadge({ kind }: { kind: string | null }) {
  const label = tripKindLabel(kind);
  const tone =
    kind === "outbound"
      ? "bg-sky-500/15 text-sky-200 border-sky-500/30"
      : kind === "return"
        ? "bg-amber-500/15 text-amber-100 border-amber-500/30"
        : "bg-slate-500/15 text-slate-300 border-slate-500/30";
  return (
    <span className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-medium ${tone}`}>
      {label}
    </span>
  );
}

export function MasterTripsClient({
  trains,
  trips,
  errorMessage,
  createTrainTrip,
  createFlightTrip,
  updateTrip,
  deleteTrip,
  seedDefaultYatraTrips,
}: Props) {
  const defaultTrainNo = useMemo(() => {
    if (trains.some((t) => t.train_no === YATRA_TRAIN_NO)) return YATRA_TRAIN_NO;
    return trains[0]?.train_no ?? "";
  }, [trains]);

  const [trainKind, setTrainKind] = useState<"outbound" | "return" | "other">("outbound");
  const [trainJourneyDate, setTrainJourneyDate] = useState(YATRA_OUTBOUND_JOURNEY_DATE);
  const [showTrainOverrides, setShowTrainOverrides] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const sortedTrips = useMemo(() => {
    const order = { outbound: 0, return: 1, other: 2 } as Record<string, number>;
    return [...trips].sort((a, b) => {
      const byDate = b.journey_date.localeCompare(a.journey_date);
      if (byDate !== 0) return byDate;
      return (order[a.trip_kind ?? "other"] ?? 9) - (order[b.trip_kind ?? "other"] ?? 9);
    });
  }, [trips]);

  const onTrainKindChange = (kind: "outbound" | "return" | "other") => {
    setTrainKind(kind);
    if (kind === "outbound") setTrainJourneyDate(YATRA_OUTBOUND_JOURNEY_DATE);
    else if (kind === "return") setTrainJourneyDate(YATRA_RETURN_JOURNEY_DATE);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trip instances"
        subtitle="One row per journey leg (outbound Dec 7 · return Dec 13 for train 20824). Used by travel groups and CM257 forms."
        kicker="Masters"
        actions={
          <form action={seedDefaultYatraTrips}>
            <FormStatusOverlay message="Seeding default trips…" />
            <button type="submit" className="btn-primary">
              Seed 20824 outbound + return
            </button>
          </form>
        }
      />

      {errorMessage && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-950/40 p-3 text-sm text-rose-200">
          {errorMessage}
        </div>
      )}

      <FormSection
        title="Add train leg from master"
        description="Pick train, leg type, and journey date. Times come from the route unless you add overrides below."
      >
        <form action={createTrainTrip} className="space-y-4">
          <FormStatusOverlay message="Creating train trip…" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Train" htmlFor="train_no" required>
              <Select
                id="train_no"
                name="train_no"
                required
                defaultValue={defaultTrainNo}
              >
                <option value="">Select train</option>
                {trains.map((train) => (
                  <option key={train.id} value={train.train_no}>
                    {train.train_no} · {train.train_name} ({train.source_station_code}→
                    {train.destination_station_code})
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Leg" htmlFor="trip_kind" required>
              <Select
                id="trip_kind"
                name="trip_kind"
                value={trainKind}
                onChange={(e) =>
                  onTrainKindChange(e.target.value as "outbound" | "return" | "other")
                }
                required
              >
                <option value="outbound">Outbound (to Puri)</option>
                <option value="return">Return (from Puri)</option>
                <option value="other">Other</option>
              </Select>
            </Field>
            <Field label="Journey date" htmlFor="journey_date" required>
              <TextInput
                id="journey_date"
                name="journey_date"
                type="date"
                required
                value={trainJourneyDate}
                onChange={(e) => setTrainJourneyDate(e.target.value)}
              />
            </Field>
            <Field label="Default class" htmlFor="default_class_code">
              <TextInput id="default_class_code" name="default_class_code" placeholder="e.g. SL, 3A" />
            </Field>
            <Field label="Quota" htmlFor="quota_code">
              <TextInput id="quota_code" name="quota_code" placeholder="e.g. GN" />
            </Field>
          </div>

          <div>
            <button
              type="button"
              className="text-sm text-sky-400 underline"
              onClick={() => setShowTrainOverrides((v) => !v)}
            >
              {showTrainOverrides ? "Hide" : "Show"} optional depart/arrive overrides
            </button>
            {showTrainOverrides && (
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <Field label="Depart (override)" htmlFor="depart_at">
                  <TextInput id="depart_at" name="depart_at" type="datetime-local" />
                </Field>
                <Field label="Arrive (override)" htmlFor="arrive_at">
                  <TextInput id="arrive_at" name="arrive_at" type="datetime-local" />
                </Field>
              </div>
            )}
          </div>

          <button type="submit" className="btn-primary">
            Create train trip
          </button>
        </form>
      </FormSection>

      <FormSection title="Add flight leg" description="Manual flight entry when not using train master.">
        <form action={createFlightTrip} className="space-y-4">
          <FormStatusOverlay message="Creating flight trip…" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Trip name" htmlFor="flight_trip_name" required>
              <TextInput id="flight_trip_name" name="trip_name" required placeholder="Delhi → Bhubaneswar" />
            </Field>
            <Field label="Leg" htmlFor="flight_trip_kind">
              <Select id="flight_trip_kind" name="trip_kind" defaultValue="other">
                <option value="outbound">Outbound</option>
                <option value="return">Return</option>
                <option value="other">Other</option>
              </Select>
            </Field>
            <Field label="Journey date" htmlFor="flight_journey_date" required>
              <TextInput id="flight_journey_date" name="journey_date" type="date" required />
            </Field>
            <Field label="Airline" htmlFor="airline_code">
              <TextInput id="airline_code" name="airline_code" placeholder="AI" />
            </Field>
            <Field label="Flight number" htmlFor="flight_no">
              <TextInput id="flight_no" name="flight_no" placeholder="AI877" />
            </Field>
            <Field label="From airport" htmlFor="from_airport_code">
              <TextInput id="from_airport_code" name="from_airport_code" placeholder="DEL" />
            </Field>
            <Field label="To airport" htmlFor="to_airport_code">
              <TextInput id="to_airport_code" name="to_airport_code" placeholder="BBI" />
            </Field>
            <Field label="Depart" htmlFor="flight_depart_at">
              <TextInput id="flight_depart_at" name="depart_at" type="datetime-local" />
            </Field>
            <Field label="Arrive" htmlFor="flight_arrive_at">
              <TextInput id="flight_arrive_at" name="arrive_at" type="datetime-local" />
            </Field>
          </div>
          <button type="submit" className="btn-secondary">
            Create flight trip
          </button>
        </form>
      </FormSection>

      <FormSection
        title="Configured trips"
        description="Outbound and return should be separate rows. Duplicate outbound rows can be deleted."
      >
        {sortedTrips.length === 0 ? (
          <div className="card p-6 text-center text-sm text-[color:var(--muted)]">
            No trips yet. Use &quot;Seed 20824 outbound + return&quot; or create a leg above.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-[color:var(--border)]">
            <table className="min-w-full text-sm">
              <thead className="bg-[color:var(--surface-muted)] text-left text-xs font-semibold uppercase text-[color:var(--muted)]">
                <tr>
                  <th className="px-4 py-3">Leg</th>
                  <th className="px-4 py-3">Trip</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Route</th>
                  <th className="px-4 py-3">Schedule</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--border)]">
                {sortedTrips.map((trip) => {
                  const route =
                    trip.mode === "train"
                      ? [trip.from_station_code, trip.to_station_code].filter(Boolean).join(" → ")
                      : [trip.from_airport_code, trip.to_airport_code].filter(Boolean).join(" → ");
                  return (
                    <tr key={trip.id} className="hover:bg-[color:var(--surface-muted)]/50">
                      <td className="px-4 py-3">
                        <TripKindBadge kind={trip.trip_kind} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-[color:var(--ink)]">{trip.trip_name}</div>
                        <div className="text-xs text-[color:var(--muted)]">
                          {trip.mode.toUpperCase()}
                          {trip.train_no ? ` · ${trip.train_no}` : ""}
                          {trip.flight_no ? ` · ${trip.flight_no}` : ""}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[color:var(--ink)]">
                        {formatJourneyDate(trip.journey_date)}
                      </td>
                      <td className="px-4 py-3 text-[color:var(--muted)]">{route || "—"}</td>
                      <td className="px-4 py-3 text-xs text-[color:var(--muted)]">
                        <div>Dep: {formatDateTime(trip.depart_at)}</div>
                        <div>Arr: {formatDateTime(trip.arrive_at)}</div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            className="btn-secondary min-h-[32px] px-2 py-1 text-xs"
                            onClick={() => setEditingId(editingId === trip.id ? null : trip.id)}
                          >
                            {editingId === trip.id ? "Close" : "Edit"}
                          </button>
                          <form action={deleteTrip}>
                            <FormStatusOverlay message="Deleting…" />
                            <input type="hidden" name="id" value={trip.id} />
                            <button
                              type="submit"
                              className="btn-secondary min-h-[32px] px-2 py-1 text-xs text-rose-300"
                            >
                              Delete
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {editingId && (
          <div className="mt-4">
            {sortedTrips
              .filter((t) => t.id === editingId)
              .map((trip) => (
                <div key={trip.id} className="card space-y-4 p-4">
                  <div>
                    <div className="text-sm font-semibold text-[color:var(--ink)]">Edit trip</div>
                    <div className="text-xs text-[color:var(--muted)]">{tripSummaryLine(trip)}</div>
                  </div>
                  <form action={updateTrip} className="space-y-4">
                    <FormStatusOverlay message="Saving…" />
                    <input type="hidden" name="id" value={trip.id} />
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      <Field label="Display name" htmlFor={`name-${trip.id}`}>
                        <TextInput
                          id={`name-${trip.id}`}
                          name="trip_name"
                          defaultValue={trip.trip_name}
                        />
                      </Field>
                      <Field label="Leg" htmlFor={`kind-${trip.id}`}>
                        <Select
                          id={`kind-${trip.id}`}
                          name="trip_kind"
                          defaultValue={trip.trip_kind ?? "other"}
                        >
                          <option value="outbound">Outbound</option>
                          <option value="return">Return</option>
                          <option value="other">Other</option>
                        </Select>
                      </Field>
                      <Field label="Journey date" htmlFor={`date-${trip.id}`}>
                        <TextInput
                          id={`date-${trip.id}`}
                          name="journey_date"
                          type="date"
                          defaultValue={trip.journey_date.slice(0, 10)}
                        />
                      </Field>
                      <Field label="Depart" htmlFor={`dep-${trip.id}`}>
                        <TextInput
                          id={`dep-${trip.id}`}
                          name="depart_at"
                          type="datetime-local"
                          defaultValue={toDateTimeLocalValue(trip.depart_at)}
                        />
                      </Field>
                      <Field label="Arrive" htmlFor={`arr-${trip.id}`}>
                        <TextInput
                          id={`arr-${trip.id}`}
                          name="arrive_at"
                          type="datetime-local"
                          defaultValue={toDateTimeLocalValue(trip.arrive_at)}
                        />
                      </Field>
                      <Field label="Default class" htmlFor={`class-${trip.id}`}>
                        <TextInput
                          id={`class-${trip.id}`}
                          name="default_class_code"
                          defaultValue={trip.default_class_code ?? ""}
                        />
                      </Field>
                      <Field label="Quota" htmlFor={`quota-${trip.id}`}>
                        <TextInput
                          id={`quota-${trip.id}`}
                          name="quota_code"
                          defaultValue={trip.quota_code ?? ""}
                        />
                      </Field>
                      {trip.mode === "train" ? (
                        <>
                          <Field label="Train master" htmlFor={`tm-${trip.id}`}>
                            <Select
                              id={`tm-${trip.id}`}
                              name="train_master_id"
                              defaultValue={trip.train_master_id ?? ""}
                            >
                              <option value="">—</option>
                              {trains.map((train) => (
                                <option key={train.id} value={train.id}>
                                  {train.train_no} · {train.train_name}
                                </option>
                              ))}
                            </Select>
                          </Field>
                          <Field label="Train no." htmlFor={`tno-${trip.id}`}>
                            <TextInput
                              id={`tno-${trip.id}`}
                              name="train_no"
                              defaultValue={trip.train_no ?? ""}
                            />
                          </Field>
                          <Field label="From station" htmlFor={`from-${trip.id}`}>
                            <TextInput
                              id={`from-${trip.id}`}
                              name="from_station_code"
                              defaultValue={trip.from_station_code ?? ""}
                            />
                          </Field>
                          <Field label="To station" htmlFor={`to-${trip.id}`}>
                            <TextInput
                              id={`to-${trip.id}`}
                              name="to_station_code"
                              defaultValue={trip.to_station_code ?? ""}
                            />
                          </Field>
                        </>
                      ) : (
                        <>
                          <Field label="Airline" htmlFor={`al-${trip.id}`}>
                            <TextInput
                              id={`al-${trip.id}`}
                              name="airline_code"
                              defaultValue={trip.airline_code ?? ""}
                            />
                          </Field>
                          <Field label="Flight no." htmlFor={`fl-${trip.id}`}>
                            <TextInput
                              id={`fl-${trip.id}`}
                              name="flight_no"
                              defaultValue={trip.flight_no ?? ""}
                            />
                          </Field>
                        </>
                      )}
                    </div>
                    <p className="text-xs text-[color:var(--muted)]">
                      Leave depart/arrive blank and save to keep existing schedule from master route.
                    </p>
                    <button type="submit" className="btn-primary">
                      Save changes
                    </button>
                  </form>
                </div>
              ))}
          </div>
        )}
      </FormSection>
    </div>
  );
}

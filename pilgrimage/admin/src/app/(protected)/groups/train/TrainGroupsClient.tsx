"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useGlobalLoading } from "@/components/GlobalLoading";
import { getBrowserSupabase } from "@/lib/supabaseBrowser";
import { ChakraSpinner, Field, Select, TextInput } from "@/components/ui";

type Trip = {
  id: string;
  mode: "train" | "air";
  trip_name: string;
  journey_date: string;
  train_no: string | null;
  flight_no: string | null;
  from_station_code: string | null;
  to_station_code: string | null;
  from_airport_code: string | null;
  to_airport_code: string | null;
};

type Member = {
  id: string;
  registration_id: string;
  coach_no: string | null;
  seat_no: string | null;
  berth_no: string | null;
  berth_type: string | null;
  ticket_status: string | null;
  wl_rac_no: string | null;
  passenger_name_on_ticket: string | null;
  passenger_age_on_ticket: number | null;
  passenger_gender: string | null;
  meal_pref: string | null;
  senior_citizen: boolean | null;
  ticket_number: string | null;
  cabin_class: string | null;
  baggage_allowance_kg: number | null;
  ssr_notes: string | null;
  registration?: { id: string; name_hi: string | null; phone: string | null } | null;
};

type RawMember = Omit<Member, "registration"> & {
  registration?: { id: string; name_hi: string | null; phone: string | null }[] | { id: string; name_hi: string | null; phone: string | null } | null;
};

type Group = {
  id: string;
  group_code: string;
  pnr: string | null;
  booking_status: string | null;
  booking_channel: string | null;
  booked_at: string | null;
  booked_by_user_id: string | null;
  booked_by_registration_id: string | null;
  total_fare_inr: number | null;
  payment_status: string | null;
  agent_ref: string | null;
  class_code: string | null;
  quota_code: string | null;
  boarding_station_code: string | null;
  reservation_upto_station_code: string | null;
  group_size_target: number | null;
  incharge_registration_id: string | null;
  incharge?: { id: string; name_hi: string | null } | null;
  members?: Member[] | null;
};

type RawGroup = Omit<Group, "incharge" | "members"> & {
  incharge?: { id: string; name_hi: string | null }[] | { id: string; name_hi: string | null } | null;
  members?: RawMember[] | null;
};

const toCsv = (rows: string[][]) =>
  rows
    .map((row) =>
      row
        .map((value) => `"${String(value ?? "").replace(/\"/g, '""')}"`)
        .join(",")
    )
    .join("\n");

const toDateTimeLocal = (value: string | null) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  const offset = parsed.getTimezoneOffset();
  const local = new Date(parsed.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
};

const readField = (formData: FormData, key: string) => {
  const value = formData.get(key);
  if (value === null || value === undefined) return null;
  const text = value.toString().trim();
  return text === "" ? null : text;
};

export function TrainGroupsClient({ trips }: { trips: Trip[] }) {
  const supabase = useMemo(() => getBrowserSupabase(), []);
  const { startLoading } = useGlobalLoading();
  const [selectedTripId, setSelectedTripId] = useState(trips[0]?.id ?? "");
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [refreshToken, setRefreshToken] = useState(0);

  const selectedTrip = useMemo(
    () => trips.find((trip) => trip.id === selectedTripId) ?? null,
    [trips, selectedTripId]
  );
  const isTrain = selectedTrip?.mode !== "air";

  useEffect(() => {
    if (!selectedTripId) return;
    let isActive = true;
    const loadGroups = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("yatra_co_travel_groups")
        .select(
          "id, group_code, pnr, booking_status, booking_channel, booked_at, booked_by_user_id, booked_by_registration_id, total_fare_inr, payment_status, agent_ref, class_code, quota_code, boarding_station_code, reservation_upto_station_code, group_size_target, incharge_registration_id, incharge:yatra_registrations(id,name_hi), members:yatra_co_travel_group_members(id, registration_id, coach_no, seat_no, berth_no, berth_type, ticket_status, wl_rac_no, passenger_name_on_ticket, passenger_age_on_ticket, passenger_gender, meal_pref, senior_citizen, ticket_number, cabin_class, baggage_allowance_kg, ssr_notes, registration:yatra_registrations(id,name_hi,phone))"
        )
        .eq("trip_id", selectedTripId)
        .order("created_at", { ascending: true });
      if (!isActive) return;
      if (error) {
        setMessage(error.message);
        setGroups([]);
      } else {
        setMessage(null);
        const normalizedGroups = (data ?? []).map((group) => {
          const rawGroup = group as RawGroup;
          const incharge = Array.isArray(rawGroup.incharge)
            ? rawGroup.incharge[0] ?? null
            : rawGroup.incharge ?? null;
          const members = (rawGroup.members ?? []).map((member) => {
            const registration = Array.isArray(member.registration)
              ? member.registration[0] ?? null
              : member.registration ?? null;
            return { ...member, registration };
          });
          return { ...rawGroup, incharge, members };
        });
        setGroups(normalizedGroups);
      }
      setLoading(false);
    };
    void loadGroups();
    return () => {
      isActive = false;
    };
  }, [selectedTripId, supabase, refreshToken]);

  const filteredGroups = useMemo(() => {
    if (!search.trim()) return groups;
    const needle = search.trim().toLowerCase();
    return groups.filter((group) => {
      if (group.group_code.toLowerCase().includes(needle)) return true;
      if (group.pnr?.toLowerCase().includes(needle)) return true;
      if (group.incharge?.name_hi?.toLowerCase().includes(needle)) return true;
      return (group.members ?? []).some((member) =>
        member.registration?.name_hi?.toLowerCase().includes(needle)
      );
    });
  }, [groups, search]);

  const createGroup = async (formData: FormData) => {
    if (!selectedTripId) return;
    const stopLoading = startLoading("Creating group...");
    const sizeTarget = readField(formData, "group_size_target");
    const payload = {
      p_trip_id: selectedTripId,
      p_group_size_target: sizeTarget ? Number(sizeTarget) : null,
      p_pnr: readField(formData, "pnr"),
      p_incharge_registration_id: readField(formData, "incharge_registration_id"),
      p_group_code: readField(formData, "group_code"),
    };
    try {
      const { error } = await supabase.rpc("fn_create_co_travel_group", payload);
      if (error) setMessage(error.message);
      else setMessage(null);
      setRefreshToken((prev) => prev + 1);
    } finally {
      stopLoading();
    }
  };

  const setIncharge = async (groupId: string, registrationId: string) => {
    const stopLoading = startLoading("Saving in-charge...");
    try {
      const { error } = await supabase.rpc("fn_set_group_incharge", {
        p_group_id: groupId,
        p_registration_id: registrationId || null,
      });
      if (error) setMessage(error.message);
      else setMessage(null);
      setRefreshToken((prev) => prev + 1);
    } finally {
      stopLoading();
    }
  };

  const updateBookingDetails = async (groupId: string, formData: FormData) => {
    const stopLoading = startLoading("Saving booking details...");
    const patch = {
      pnr: readField(formData, "pnr"),
      booking_status: readField(formData, "booking_status"),
      booking_channel: readField(formData, "booking_channel"),
      booked_at: readField(formData, "booked_at"),
      booked_by_user_id: readField(formData, "booked_by_user_id"),
      booked_by_registration_id: readField(formData, "booked_by_registration_id"),
      total_fare_inr: readField(formData, "total_fare_inr"),
      payment_status: readField(formData, "payment_status"),
      agent_ref: readField(formData, "agent_ref"),
      class_code: readField(formData, "class_code"),
      quota_code: readField(formData, "quota_code"),
      boarding_station_code: readField(formData, "boarding_station_code"),
      reservation_upto_station_code: readField(formData, "reservation_upto_station_code"),
      group_size_target: readField(formData, "group_size_target"),
    };
    try {
      const { error } = await supabase.rpc("fn_update_co_travel_group", {
        p_id: groupId,
        p_patch: patch,
      });
      if (error) setMessage(error.message);
      else setMessage(null);
      setRefreshToken((prev) => prev + 1);
    } finally {
      stopLoading();
    }
  };

  const addMember = async (groupId: string, formData: FormData) => {
    const registrationId = readField(formData, "registration_id");
    if (!registrationId) return;
    const stopLoading = startLoading("Saving group member...");
    const patch = {
      coach_no: readField(formData, "coach_no"),
      seat_no: readField(formData, "seat_no"),
      berth_no: readField(formData, "berth_no"),
      berth_type: readField(formData, "berth_type"),
      ticket_status: readField(formData, "ticket_status"),
      passenger_name_on_ticket: readField(formData, "passenger_name_on_ticket"),
      passenger_age_on_ticket: readField(formData, "passenger_age_on_ticket"),
      passenger_gender: readField(formData, "passenger_gender"),
      meal_pref: readField(formData, "meal_pref"),
      wl_rac_no: readField(formData, "wl_rac_no"),
      senior_citizen: formData.get("senior_citizen") === "on",
      ticket_number: readField(formData, "ticket_number"),
      cabin_class: readField(formData, "cabin_class"),
      baggage_allowance_kg: readField(formData, "baggage_allowance_kg"),
      ssr_notes: readField(formData, "ssr_notes"),
    };
    try {
      const { error } = await supabase.rpc("fn_upsert_co_travel_group_member", {
        p_group_id: groupId,
        p_registration_id: registrationId,
        p_patch: patch,
      });
      if (error) setMessage(error.message);
      else setMessage(null);
      setRefreshToken((prev) => prev + 1);
    } finally {
      stopLoading();
    }
  };

  const exportCsv = () => {
    const tripName = selectedTrip?.trip_name ?? "";
    const journeyDate = selectedTrip?.journey_date ?? "";
    const trainNo = selectedTrip?.train_no ?? "";
    const flightNo = selectedTrip?.flight_no ?? "";
    const rows: string[][] = [
      isTrain
        ? [
          "Trip",
          "Date",
          "Train No",
          "Group Code",
          "PNR",
          "Booking Status",
          "Class Code",
          "Incharge",
          "Member",
          "Phone",
          "Coach",
          "Seat",
          "Berth",
          "Berth Type",
          "Ticket Status",
          "Ticket Name",
          "Ticket Age",
          "Gender",
          "Meal Pref",
          "WL/RAC",
          "Senior Citizen",
        ]
        : [
          "Trip",
          "Date",
          "Flight No",
          "Group Code",
          "PNR",
          "Booking Status",
          "Class Code",
          "Incharge",
          "Member",
          "Phone",
          "Seat",
          "Cabin",
          "Ticket No",
          "Baggage Kg",
          "Ticket Name",
          "Ticket Age",
          "Gender",
          "SSR Notes",
        ],
    ];
    filteredGroups.forEach((group) => {
      const incharge = group.incharge?.name_hi || "";
      (group.members ?? []).forEach((member) => {
        if (isTrain) {
          rows.push([
            tripName,
            journeyDate,
            trainNo,
            group.group_code,
            group.pnr ?? "",
            group.booking_status ?? "",
            group.class_code ?? "",
            incharge,
            member.registration?.name_hi ?? "",
            member.registration?.phone ?? "",
            member.coach_no ?? "",
            member.seat_no ?? "",
            member.berth_no ?? "",
            member.berth_type ?? "",
            member.ticket_status ?? "",
            member.passenger_name_on_ticket ?? "",
            member.passenger_age_on_ticket?.toString() ?? "",
            member.passenger_gender ?? "",
            member.meal_pref ?? "",
            member.wl_rac_no ?? "",
            member.senior_citizen ? "yes" : "no",
          ]);
        } else {
          rows.push([
            tripName,
            journeyDate,
            flightNo,
            group.group_code,
            group.pnr ?? "",
            group.booking_status ?? "",
            group.class_code ?? "",
            incharge,
            member.registration?.name_hi ?? "",
            member.registration?.phone ?? "",
            member.seat_no ?? "",
            member.cabin_class ?? "",
            member.ticket_number ?? "",
            member.baggage_allowance_kg?.toString() ?? "",
            member.passenger_name_on_ticket ?? "",
            member.passenger_age_on_ticket?.toString() ?? "",
            member.passenger_gender ?? "",
            member.ssr_notes ?? "",
          ]);
        }
      });
    });
    const csv = toCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = isTrain ? "train-groups.csv" : "air-groups.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="card p-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto_auto] items-end">
          <Field label="Trip" htmlFor="trip_id">
            <Select
              id="trip_id"
              name="trip_id"
              value={selectedTripId}
              onChange={(event) => setSelectedTripId(event.target.value)}
            >
              {trips.map((trip) => {
                const ref = trip.mode === "air" ? trip.flight_no : trip.train_no;
                const route =
                  trip.mode === "air"
                    ? [trip.from_airport_code, trip.to_airport_code].filter(Boolean).join(" → ")
                    : [trip.from_station_code, trip.to_station_code].filter(Boolean).join(" → ");
                return (
                  <option key={trip.id} value={trip.id}>
                    {trip.trip_name} · {trip.mode.toUpperCase()} · {ref || "--"} · {trip.journey_date}
                    {route ? ` · ${route}` : ""}
                  </option>
                );
              })}
            </Select>
          </Field>
          <Field label="Search" htmlFor="search">
            <TextInput
              id="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Group code, PNR, name"
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            {isTrain && selectedTripId ? (
              <Link
                href={`/bookings/railway-reservation?tripId=${selectedTripId}`}
                className="btn-secondary"
              >
                CM257 forms
              </Link>
            ) : null}
            <button type="button" className="btn-secondary" onClick={exportCsv}>
              Export CSV
            </button>
          </div>
        </div>
        <form
          className="grid gap-4 sm:grid-cols-[1fr_1fr_1fr_1fr_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            void createGroup(new FormData(event.currentTarget));
            event.currentTarget.reset();
          }}
        >
          <TextInput name="group_code" placeholder="Group code (optional)" />
          <TextInput name="pnr" placeholder="PNR (optional)" />
          <TextInput name="group_size_target" type="number" min={1} placeholder="Group size" />
          <TextInput name="incharge_registration_id" placeholder="Incharge registration ID" />
          <button type="submit" className="btn-primary">Add group</button>
        </form>
        {message && <div className="text-sm text-rose-300">{message}</div>}
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-[color:var(--muted)]">
          <ChakraSpinner />
          Loading groups...
        </div>
      )}

      {!loading && filteredGroups.length === 0 && (
        <div className="card p-6 text-center text-sm text-[color:var(--muted)]">
          No groups found.
        </div>
      )}

      <div className="space-y-4">
        {filteredGroups.map((group) => {
          const memberCount = group.members?.length ?? 0;
          const limit = group.group_size_target ?? 6;
          const overLimit = memberCount > limit;
          return (
            <div key={group.id} className="card p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-[color:var(--ink)]">{group.group_code}</div>
                  <div className="text-xs text-[color:var(--muted)]">
                    PNR: {group.pnr || "—"} · Status: {group.booking_status ?? "planned"}
                  </div>
                </div>
                <div className={`text-xs ${overLimit ? "text-rose-300" : "text-[color:var(--muted)]"}`}>
                  Members: {memberCount} / {limit}
                </div>
              </div>

              <form
                className="grid gap-3 sm:grid-cols-[1fr_auto]"
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  void setIncharge(group.id, readField(form, "incharge_registration_id") ?? "");
                }}
              >
                <TextInput
                  name="incharge_registration_id"
                  placeholder="Incharge registration ID"
                  defaultValue={group.incharge_registration_id ?? ""}
                />
                <button type="submit" className="btn-secondary">Set in-charge</button>
              </form>

              <div className="rounded-xl border border-slate-800/60 p-4 space-y-3">
                <div className="text-xs font-semibold uppercase text-slate-400">Booking details</div>
                <form
                  className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void updateBookingDetails(group.id, new FormData(event.currentTarget));
                  }}
                >
                  <TextInput name="pnr" placeholder="PNR" defaultValue={group.pnr ?? ""} />
                  <Select name="booking_status" defaultValue={group.booking_status ?? "planned"}>
                    <option value="planned">Planned</option>
                    <option value="booked">Booked</option>
                    <option value="partially_booked">Partially booked</option>
                    <option value="cancelled">Cancelled</option>
                  </Select>
                  <Select name="booking_channel" defaultValue={group.booking_channel ?? ""}>
                    <option value="">Booking channel</option>
                    <option value="irctc">IRCTC</option>
                    <option value="agent">Agent</option>
                    <option value="committee">Committee</option>
                    <option value="other">Other</option>
                  </Select>
                  <TextInput
                    name="booked_at"
                    type="datetime-local"
                    defaultValue={toDateTimeLocal(group.booked_at)}
                  />
                  <TextInput
                    name="booked_by_user_id"
                    placeholder="Booked by user ID"
                    defaultValue={group.booked_by_user_id ?? ""}
                  />
                  <TextInput
                    name="booked_by_registration_id"
                    placeholder="Booked by registration ID"
                    defaultValue={group.booked_by_registration_id ?? ""}
                  />
                  <TextInput
                    name="total_fare_inr"
                    type="number"
                    step="0.01"
                    placeholder="Total fare (INR)"
                    defaultValue={group.total_fare_inr ?? ""}
                  />
                  <Select name="payment_status" defaultValue={group.payment_status ?? "pending"}>
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="partial">Partial</option>
                    <option value="refunded">Refunded</option>
                  </Select>
                  <TextInput name="agent_ref" placeholder="Agent ref" defaultValue={group.agent_ref ?? ""} />
                  {isTrain ? (
                    <>
                      <TextInput name="class_code" placeholder="Class code" defaultValue={group.class_code ?? ""} />
                      <TextInput name="quota_code" placeholder="Quota code" defaultValue={group.quota_code ?? ""} />
                      <TextInput
                        name="boarding_station_code"
                        placeholder="Boarding station"
                        defaultValue={group.boarding_station_code ?? ""}
                      />
                      <TextInput
                        name="reservation_upto_station_code"
                        placeholder="Reservation upto"
                        defaultValue={group.reservation_upto_station_code ?? ""}
                      />
                    </>
                  ) : (
                    <TextInput
                      name="class_code"
                      placeholder="Class code (optional)"
                      defaultValue={group.class_code ?? ""}
                    />
                  )}
                  <TextInput
                    name="group_size_target"
                    type="number"
                    min={1}
                    placeholder="Group size target"
                    defaultValue={group.group_size_target ?? ""}
                  />
                  <button type="submit" className="btn-secondary sm:col-span-2 lg:col-span-4">
                    Save booking details
                  </button>
                </form>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-800/60">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-900 text-left text-xs font-semibold uppercase text-slate-300">
                    {isTrain ? (
                      <tr>
                        <th className="px-3 py-2">Member</th>
                        <th className="px-3 py-2">Phone</th>
                        <th className="px-3 py-2">Coach</th>
                        <th className="px-3 py-2">Seat</th>
                        <th className="px-3 py-2">Berth</th>
                        <th className="px-3 py-2">Ticket status</th>
                        <th className="px-3 py-2">Berth type</th>
                      </tr>
                    ) : (
                      <tr>
                        <th className="px-3 py-2">Member</th>
                        <th className="px-3 py-2">Phone</th>
                        <th className="px-3 py-2">Seat</th>
                        <th className="px-3 py-2">Cabin</th>
                        <th className="px-3 py-2">Ticket no</th>
                        <th className="px-3 py-2">Baggage</th>
                      </tr>
                    )}
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {(group.members ?? []).map((member) => {
                      const passengerMeta = [
                        member.passenger_age_on_ticket ? `${member.passenger_age_on_ticket}y` : null,
                        member.passenger_gender || null,
                      ]
                        .filter(Boolean)
                        .join(" · ");
                      const statusSuffix = member.wl_rac_no ? ` (${member.wl_rac_no})` : "";
                      return (
                        <tr key={member.id}>
                          <td className="px-3 py-2 text-slate-100">
                            <div>{member.registration?.name_hi || member.registration_id}</div>
                            {member.passenger_name_on_ticket && (
                              <div className="text-xs text-slate-400">
                                Ticket: {member.passenger_name_on_ticket}
                              </div>
                            )}
                            {passengerMeta && (
                              <div className="text-xs text-slate-500">{passengerMeta}</div>
                            )}
                          </td>
                          <td className="px-3 py-2 text-slate-300">{member.registration?.phone || "—"}</td>
                          {isTrain ? (
                            <>
                              <td className="px-3 py-2 text-slate-300">{member.coach_no || "—"}</td>
                              <td className="px-3 py-2 text-slate-300">{member.seat_no || "—"}</td>
                              <td className="px-3 py-2 text-slate-300">{member.berth_no || "—"}</td>
                              <td className="px-3 py-2 text-slate-300">
                                {member.ticket_status ? `${member.ticket_status}${statusSuffix}` : "—"}
                              </td>
                              <td className="px-3 py-2 text-slate-300">{member.berth_type || "—"}</td>
                            </>
                          ) : (
                            <>
                              <td className="px-3 py-2 text-slate-300">{member.seat_no || "—"}</td>
                              <td className="px-3 py-2 text-slate-300">{member.cabin_class || "—"}</td>
                              <td className="px-3 py-2 text-slate-300">{member.ticket_number || "—"}</td>
                              <td className="px-3 py-2 text-slate-300">
                                {member.baggage_allowance_kg ?? "—"}
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                    {memberCount === 0 && (
                      <tr>
                        <td colSpan={isTrain ? 7 : 6} className="px-3 py-3 text-center text-slate-400">
                          No members assigned yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <form
                className="space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  void addMember(group.id, new FormData(event.currentTarget));
                  event.currentTarget.reset();
                }}
              >
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                  <TextInput
                    name="registration_id"
                    placeholder="Registration ID"
                    required
                    className="lg:col-span-2"
                  />
                  {isTrain && <TextInput name="coach_no" placeholder="Coach" />}
                  <TextInput name="seat_no" placeholder="Seat" />
                  {isTrain && <TextInput name="berth_no" placeholder="Berth" />}
                  {isTrain ? (
                    <Select name="ticket_status" defaultValue="">
                      <option value="">Ticket status</option>
                      <option value="CNF">CNF</option>
                      <option value="RAC">RAC</option>
                      <option value="WL">WL</option>
                      <option value="CAN">CAN</option>
                    </Select>
                  ) : (
                    <TextInput name="cabin_class" placeholder="Cabin class" />
                  )}
                  {isTrain ? (
                    <Select name="berth_type" defaultValue="">
                      <option value="">Berth type</option>
                      <option value="LB">LB</option>
                      <option value="MB">MB</option>
                      <option value="UB">UB</option>
                      <option value="SL">SL</option>
                      <option value="SU">SU</option>
                      <option value="WS">WS</option>
                      <option value="AS">AS</option>
                    </Select>
                  ) : (
                    <TextInput name="ticket_number" placeholder="Ticket number" />
                  )}
                  {!isTrain && (
                    <TextInput
                      name="baggage_allowance_kg"
                      type="number"
                      step="0.1"
                      placeholder="Baggage kg"
                    />
                  )}
                </div>
                <details className="rounded-xl border border-slate-800/60 p-3">
                  <summary className="cursor-pointer text-xs font-semibold uppercase text-slate-400">
                    Ticket details
                  </summary>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <TextInput
                      name="passenger_name_on_ticket"
                      placeholder="Passenger name on ticket"
                    />
                    <TextInput
                      name="passenger_age_on_ticket"
                      type="number"
                      min={0}
                      placeholder="Passenger age"
                    />
                    <Select name="passenger_gender" defaultValue="">
                      <option value="">Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </Select>
                    {isTrain && <TextInput name="wl_rac_no" placeholder="WL/RAC no" />}
                    {isTrain && (
                      <Select name="meal_pref" defaultValue="">
                        <option value="">Meal pref</option>
                        <option value="veg">Veg</option>
                        <option value="nonveg">Non-veg</option>
                        <option value="jain">Jain</option>
                        <option value="none">None</option>
                      </Select>
                    )}
                    <TextInput name="ssr_notes" placeholder="SSR notes" className="sm:col-span-2" />
                    <label className="flex items-center gap-2 text-sm text-slate-200">
                      <input
                        type="checkbox"
                        name="senior_citizen"
                        className="h-4 w-4 accent-[color:var(--accent)]"
                      />
                      Senior citizen
                    </label>
                  </div>
                </details>
                <button type="submit" className="btn-secondary">Add / update member</button>
              </form>
            </div>
          );
        })}
      </div>
    </div>
  );
}

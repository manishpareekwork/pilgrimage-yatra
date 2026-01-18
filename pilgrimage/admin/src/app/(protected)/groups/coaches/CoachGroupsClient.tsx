"use client";

import { useEffect, useMemo, useState } from "react";
import { useGlobalLoading } from "@/components/GlobalLoading";
import { getBrowserSupabase } from "@/lib/supabaseBrowser";
import { ChakraSpinner, Field, Select, TextInput } from "@/components/ui";

type Trip = {
  id: string;
  trip_name: string;
  journey_date: string;
  train_no: string | null;
};

type MemberRow = {
  coach_no: string | null;
  seat_no: string | null;
  berth_no: string | null;
  registration?: { name_hi: string | null; phone: string | null } | null;
};

type RawMemberRow = {
  coach_no: string | null;
  seat_no: string | null;
  berth_no: string | null;
  registration?: { name_hi: string | null; phone: string | null }[] | { name_hi: string | null; phone: string | null } | null;
};

type CoachIncharge = {
  coach_no: string;
  coach_incharge_registration_id: string | null;
  incharge?: { name_hi: string | null } | null;
};

type RawCoachIncharge = {
  coach_no: string;
  coach_incharge_registration_id: string | null;
  incharge?: { name_hi: string | null }[] | { name_hi: string | null } | null;
};

const toCsv = (rows: string[][]) =>
  rows
    .map((row) =>
      row
        .map((value) => `"${String(value ?? "").replace(/\"/g, '""')}"`)
        .join(",")
    )
    .join("\n");

export function CoachGroupsClient({ trips }: { trips: Trip[] }) {
  const supabase = useMemo(() => getBrowserSupabase(), []);
  const { startLoading } = useGlobalLoading();
  const [selectedTripId, setSelectedTripId] = useState(trips[0]?.id ?? "");
  const [coachMembers, setCoachMembers] = useState<Record<string, MemberRow[]>>({});
  const [coachIncharges, setCoachIncharges] = useState<Record<string, CoachIncharge>>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!selectedTripId) return;
    let isActive = true;
    const loadData = async () => {
      setLoading(true);
      const { data: groups, error: groupErr } = await supabase
        .from("yatra_co_travel_groups")
        .select(
          "id, trip_id, members:yatra_co_travel_group_members(coach_no, seat_no, berth_no, registration:yatra_registrations(name_hi, phone))"
        )
        .eq("trip_id", selectedTripId);
      if (!isActive) return;
      if (groupErr) {
        setMessage(groupErr.message);
        setCoachMembers({});
      } else {
        const members = (groups ?? []).flatMap((group) => group.members ?? []) as RawMemberRow[];
        const normalizedMembers: MemberRow[] = members.map((member) => {
          const registration = Array.isArray(member.registration)
            ? member.registration[0] ?? null
            : member.registration ?? null;
          return { ...member, registration };
        });
        const grouped: Record<string, MemberRow[]> = {};
        normalizedMembers.forEach((member) => {
          const coach = member.coach_no || "Unassigned";
          if (!grouped[coach]) grouped[coach] = [];
          grouped[coach].push(member);
        });
        setCoachMembers(grouped);
      }

      const { data: coaches, error: coachErr } = await supabase
        .from("yatra_train_coaches")
        .select("coach_no, coach_incharge_registration_id, incharge:yatra_registrations(name_hi)")
        .eq("trip_id", selectedTripId);
      if (!isActive) return;
      if (coachErr) {
        setMessage(coachErr.message);
      } else {
        const mapping: Record<string, CoachIncharge> = {};
        (coaches ?? []).forEach((coach) => {
          const rawCoach = coach as RawCoachIncharge;
          const incharge = Array.isArray(rawCoach.incharge)
            ? rawCoach.incharge[0] ?? null
            : rawCoach.incharge ?? null;
          mapping[rawCoach.coach_no] = {
            coach_no: rawCoach.coach_no,
            coach_incharge_registration_id: rawCoach.coach_incharge_registration_id,
            incharge,
          };
        });
        setCoachIncharges(mapping);
      }
      setLoading(false);
    };
    void loadData();
    return () => {
      isActive = false;
    };
  }, [selectedTripId, supabase]);

  const coachesList = useMemo(() => {
    const keys = new Set<string>([
      ...Object.keys(coachMembers),
      ...Object.keys(coachIncharges),
    ]);
    let list = Array.from(keys).sort();
    if (search.trim()) {
      const needle = search.toLowerCase();
      list = list.filter((coach) => coach.toLowerCase().includes(needle));
    }
    return list;
  }, [coachMembers, coachIncharges, search]);

  const setCoachIncharge = async (coachNo: string, registrationId: string) => {
    if (!selectedTripId) return;
    const stopLoading = startLoading("Saving coach in-charge...");
    try {
      const { error } = await supabase.rpc("fn_set_train_coach_incharge", {
        p_trip_id: selectedTripId,
        p_coach_no: coachNo,
        p_registration_id: registrationId || null,
      });
      if (error) setMessage(error.message);
      else setMessage(null);
      setSelectedTripId(selectedTripId);
    } finally {
      stopLoading();
    }
  };

  const exportCsv = () => {
    const rows: string[][] = [["Coach", "Member", "Phone", "Seat", "Berth"]];
    coachesList.forEach((coach) => {
      const members = coachMembers[coach] ?? [];
      members.forEach((member) => {
        rows.push([
          coach,
          member.registration?.name_hi ?? "",
          member.registration?.phone ?? "",
          member.seat_no ?? "",
          member.berth_no ?? "",
        ]);
      });
    });
    const csv = toCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "train-coaches.csv";
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
              {trips.map((trip) => (
                <option key={trip.id} value={trip.id}>
                  {trip.trip_name} · {trip.train_no || "--"} · {trip.journey_date}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Coach search" htmlFor="search">
            <TextInput
              id="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Coach number"
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
          Loading coach data...
        </div>
      )}

      {!loading && coachesList.length === 0 && (
        <div className="card p-6 text-center text-sm text-[color:var(--muted)]">
          No coach assignments yet.
        </div>
      )}

      <div className="space-y-4">
        {coachesList.map((coach) => {
          const members = coachMembers[coach] ?? [];
          const incharge = coachIncharges[coach];
          return (
            <div key={coach} className="card p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm font-semibold text-[color:var(--ink)]">Coach {coach}</div>
                <div className="text-xs text-[color:var(--muted)]">
                  Members: {members.length}
                </div>
              </div>
              <form
                className="grid gap-3 sm:grid-cols-[1fr_auto]"
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  void setCoachIncharge(coach, form.get("coach_incharge_registration_id")?.toString().trim() || "");
                }}
              >
                <TextInput
                  name="coach_incharge_registration_id"
                  placeholder="Coach in-charge registration ID"
                  defaultValue={incharge?.coach_incharge_registration_id ?? ""}
                />
                <button type="submit" className="btn-secondary">Set in-charge</button>
              </form>
              <div className="overflow-hidden rounded-xl border border-slate-800/60">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-900 text-left text-xs font-semibold uppercase text-slate-300">
                    <tr>
                      <th className="px-3 py-2">Member</th>
                      <th className="px-3 py-2">Phone</th>
                      <th className="px-3 py-2">Seat</th>
                      <th className="px-3 py-2">Berth</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {members.map((member, index) => (
                      <tr key={`${coach}-${index}`}>
                        <td className="px-3 py-2 text-slate-100">
                          {member.registration?.name_hi || "--"}
                        </td>
                        <td className="px-3 py-2 text-slate-300">
                          {member.registration?.phone || "—"}
                        </td>
                        <td className="px-3 py-2 text-slate-300">{member.seat_no || "—"}</td>
                        <td className="px-3 py-2 text-slate-300">{member.berth_no || "—"}</td>
                      </tr>
                    ))}
                    {members.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-3 py-3 text-center text-slate-400">
                          No members assigned to this coach.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Cm257ReservationForm } from "@/components/railway/Cm257ReservationForm";
import { Field, FormSection, PageHeader, Select, TextInput } from "@/components/ui";
import { useGlobalLoading } from "@/components/GlobalLoading";
import {
  buildFormsFromGroupMembers,
  buildFormsFromRegistrations,
  type GroupMemberRow,
  type RegistrationRow,
  type TripRow,
} from "@/lib/railwayReservation/mapRegistration";
import {
  eligibilitySkipMessage,
  filterEligibleRegistrations,
  isEligibleForCommitteeCm257,
} from "@/lib/railwayReservation/eligibility";
import { saveCm257PrintPayload } from "@/lib/railwayReservation/printStorage";
import type {
  Cm257FormDraft,
  Cm257PrintLayout,
  Cm257PrintPayload,
  IrClassCode,
  PassengerGender,
} from "@/lib/railwayReservation/types";
import {
  CM257_MAX_PASSENGERS,
  CM257_PRINT_LAYOUT_LABELS,
} from "@/lib/railwayReservation/types";
import { getBrowserSupabase } from "@/lib/supabaseBrowser";

type Trip = TripRow & { mode: string };

type CoTravelGroup = {
  id: string;
  group_code: string;
  pnr: string | null;
  class_code: string | null;
  boarding_station_code: string | null;
  reservation_upto_station_code: string | null;
  members: GroupMemberRow[];
};

const REGISTRATION_SELECT =
  "id, name_hi, father_name_hi, address_hi, address_state, address_district, address_city, address_pin, phone, whatsapp, dob, age_years, train_class, travel_mode, reservation_by, source_sheet, aadhaar_no";

/** Map URL aliases like SFS1 → import sheet SFS-1 */
function normalizeImportSheet(raw: string): string {
  const t = raw.trim();
  if (!t) return t;
  const upper = t.toUpperCase().replace(/\s+/g, "");
  if (upper === "SFS1" || upper === "SFS-1") return "SFS-1";
  if (upper === "SFS2" || upper === "SFS-2") return "SFS-2";
  return t;
}

export function RailwayReservationBuilder({ trips }: { trips: Trip[] }) {
  const supabase = useMemo(() => getBrowserSupabase(), []);
  const { startLoading } = useGlobalLoading();
  const searchParams = useSearchParams();
  const trainTrips = useMemo(() => trips.filter((t) => t.mode === "train"), [trips]);

  const initialTripId =
    searchParams.get("tripId") && trainTrips.some((t) => t.id === searchParams.get("tripId"))
      ? (searchParams.get("tripId") as string)
      : (trainTrips[0]?.id ?? "");
  const initialGroupId = searchParams.get("groupId") ?? "";
  const initialGroupCode = searchParams.get("groupCode") ?? "";
  const initialSheet = searchParams.get("sheet") ?? "";
  const autoGenerate = searchParams.get("auto") === "1";
  const initialIdsParam = searchParams.get("ids") ?? "";
  const initialSelectedIds = initialIdsParam
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  const [tripId, setTripId] = useState(initialTripId);
  const [source, setSource] = useState<"yatris" | "group">(
    initialGroupId ? "group" : "yatris"
  );
  const [yatriSearch, setYatriSearch] = useState("");
  const [travelFilter, setTravelFilter] = useState<"all" | "train" | "committee-train">("committee-train");
  const [sheetFilter, setSheetFilter] = useState(normalizeImportSheet(initialSheet));
  const [yatriList, setYatriList] = useState<RegistrationRow[]>([]);
  const [yatriListLoading, setYatriListLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds);
  const [printLayout, setPrintLayout] = useState<Cm257PrintLayout>("full");
  const [groups, setGroups] = useState<CoTravelGroup[]>([]);
  const [groupId, setGroupId] = useState(initialGroupId);
  const [forms, setForms] = useState<Cm257FormDraft[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const autoRanRef = useRef(false);

  const selectedTrip = useMemo(
    () => trainTrips.find((t) => t.id === tripId) ?? null,
    [trainTrips, tripId]
  );

  useEffect(() => {
    if (!tripId) return;
    let active = true;
    const load = async () => {
      const { data, error } = await supabase
        .from("yatra_co_travel_groups")
        .select(
          `id, group_code, pnr, class_code, boarding_station_code, reservation_upto_station_code,
          members:yatra_co_travel_group_members(
            registration_id, passenger_name_on_ticket, passenger_age_on_ticket, passenger_gender, berth_type,
            registration:yatra_registrations(${REGISTRATION_SELECT})
          )`
        )
        .eq("trip_id", tripId)
        .order("created_at", { ascending: true });
      if (!active) return;
      if (error) {
        setMessage(error.message);
        setGroups([]);
        return;
      }
      const normalized: CoTravelGroup[] = (data ?? []).map((g) => {
        const members = (g.members ?? []).map((raw) => {
          const m = raw as GroupMemberRow & {
            registration?: RegistrationRow | RegistrationRow[] | null;
          };
          const registration = Array.isArray(m.registration)
            ? m.registration[0]
            : m.registration ?? null;
          return { ...m, registration };
        });
        return { ...g, members } as CoTravelGroup;
      });
      setGroups(normalized);
      const codeNeedle = initialGroupCode.trim().toLowerCase();
      const byCode = codeNeedle
        ? normalized.find((g) => g.group_code.toLowerCase() === codeNeedle)
        : undefined;
      const byId = initialGroupId
        ? normalized.find((g) => g.id === initialGroupId)
        : undefined;
      const pick = byCode ?? byId;
      if (pick) {
        setGroupId(pick.id);
        setSource("group");
      } else {
        setGroupId((prev) => (prev && normalized.some((g) => g.id === prev) ? prev : normalized[0]?.id ?? ""));
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [tripId, supabase, initialGroupCode, initialGroupId]);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      setYatriListLoading(true);
      let query = supabase
        .from("yatra_registrations")
        .select(REGISTRATION_SELECT)
        .order("name_hi", { ascending: true })
        .limit(200);
      if (travelFilter === "train") {
        query = query.eq("travel_mode", "train");
      } else if (travelFilter === "committee-train") {
        query = query.eq("travel_mode", "train").eq("reservation_by", "committee");
      }
      const sheet = sheetFilter.trim();
      if (sheet) {
        query = query.eq("source_sheet", sheet);
      }
      const needle = yatriSearch.trim();
      if (needle) {
        query = query.or(
          `name_hi.ilike.%${needle}%,phone.ilike.%${needle}%,aadhaar_no.ilike.%${needle}%,source_sheet.ilike.%${needle}%`
        );
      }
      const { data, error } = await query;
      if (!active) return;
      setYatriListLoading(false);
      if (error) {
        setMessage(error.message);
        setYatriList([]);
        return;
      }
      setYatriList((data ?? []) as RegistrationRow[]);
    }, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [yatriSearch, travelFilter, sheetFilter, supabase]);

  useEffect(() => {
    const sheet = normalizeImportSheet(initialSheet);
    if (!sheet) return;
    let active = true;
    void (async () => {
      const { data, error } = await supabase
        .from("yatra_registrations")
        .select(REGISTRATION_SELECT)
        .eq("source_sheet", sheet)
        .eq("travel_mode", "train")
        .eq("reservation_by", "committee");
      if (!active || error) return;
      const rows = (data ?? []) as RegistrationRow[];
      setSelectedIds(rows.map((r) => r.id));
      setSource("yatris");
      setSheetFilter(sheet);
      setTravelFilter("committee-train");
    })();
    return () => {
      active = false;
    };
  }, [initialSheet, supabase]);

  const toggleYatri = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectAllVisible = () => {
    setSelectedIds((prev) => [...new Set([...prev, ...yatriList.map((r) => r.id)])]);
  };

  const clearSelection = () => setSelectedIds([]);

  const loadFullRegistrations = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return [] as RegistrationRow[];
      const { data, error } = await supabase
        .from("yatra_registrations")
        .select(REGISTRATION_SELECT)
        .in("id", ids);
      if (error) throw new Error(error.message);
      return (data ?? []) as RegistrationRow[];
    },
    [supabase]
  );

  const buildFormsCore = useCallback(async (): Promise<Cm257FormDraft[]> => {
    if (!selectedTrip) {
      throw new Error("Select a train trip.");
    }
    if (source === "group") {
      const group = groups.find((g) => g.id === groupId);
      if (!group || group.members.length === 0) {
        throw new Error("Select a group with at least one member.");
      }
      const allMembers = group.members;
      const members = allMembers.filter((m) =>
        m.registration ? isEligibleForCommitteeCm257(m.registration) : false
      );
      if (members.length === 0) {
        throw new Error("No eligible members (train + committee reservation) in this group.");
      }
      let built = buildFormsFromGroupMembers(selectedTrip, members);
      if (group.class_code || group.boarding_station_code || group.reservation_upto_station_code) {
        built = built.map((f) => ({
          ...f,
          journey: {
            ...f.journey,
            classCode: (group.class_code as IrClassCode) || f.journey.classCode,
            boardingStation: group.boarding_station_code ?? f.journey.boardingStation,
            reservationUpto: group.reservation_upto_station_code ?? f.journey.reservationUpto,
          },
        }));
      }
      const skipNote = eligibilitySkipMessage(allMembers.length, members.length);
      setMessage(
        [
          skipNote,
          built.length > 1
            ? `${members.length} passengers → ${built.length} forms (max ${CM257_MAX_PASSENGERS} per form).`
            : `${members.length} passenger(s) on ${built.length} form(s).`,
        ]
          .filter(Boolean)
          .join(" ")
      );
      return built;
    }

    const ids = selectedIds;
    if (ids.length === 0) {
      throw new Error("Select at least one yatri.");
    }
    const registrations = await loadFullRegistrations(ids);
    const ordered = ids
      .map((id) => registrations.find((r) => r.id === id))
      .filter(Boolean) as RegistrationRow[];
    const eligible = filterEligibleRegistrations(ordered);
    if (eligible.length === 0) {
      throw new Error("No eligible yatris (train travel + committee reservation).");
    }
    const built = buildFormsFromRegistrations(selectedTrip, eligible);
    const skipNote = eligibilitySkipMessage(ordered.length, eligible.length);
    setMessage(
      [
        skipNote,
        built.length > 1
          ? `${eligible.length} passengers → ${built.length} forms (max ${CM257_MAX_PASSENGERS} per form).`
          : null,
      ]
        .filter(Boolean)
        .join(" ")
    );
    return built;
  }, [
    selectedTrip,
    source,
    groups,
    groupId,
    selectedIds,
    loadFullRegistrations,
  ]);

  const openPrintWithForms = (built: Cm257FormDraft[]) => {
    if (built.length === 0) {
      setMessage("No forms to print.");
      return;
    }
    const missingGender = built.some((f) =>
      f.passengers.some((p) => p.nameOnTicket.trim() && !p.sex)
    );
    if (missingGender) {
      const proceed = window.confirm(
        "Some passengers are missing Sex (M/F). Counters may reject the form. Continue anyway?"
      );
      if (!proceed) return;
    }
    const payload: Cm257PrintPayload = {
      tripId,
      tripName: selectedTrip?.trip_name ?? undefined,
      forms: built,
      generatedAt: new Date().toISOString(),
      layout: printLayout,
    };
    saveCm257PrintPayload(payload);
    window.open("/print/railway-reservation?autoprint=1", "_blank", "noopener,noreferrer");
  };

  const generateForms = async () => {
    const stop = startLoading("Building CM257 forms...");
    try {
      const built = await buildFormsCore();
      setForms(built);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to build forms.");
      setForms([]);
    } finally {
      stop();
    }
  };

  const generateAndPrint = async () => {
    const stop = startLoading("Building CM257 PDF…");
    try {
      const built = await buildFormsCore();
      setForms(built);
      openPrintWithForms(built);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to build forms.");
      setForms([]);
    } finally {
      stop();
    }
  };

  useEffect(() => {
    if (!autoGenerate || autoRanRef.current) return;
    if (!selectedTrip) return;
    if (source === "group" && !groupId) return;
    if (source === "yatris" && selectedIds.length === 0 && !initialSheet) return;
    autoRanRef.current = true;
    const stop = startLoading("Building CM257 PDF…");
    void (async () => {
      try {
        const built = await buildFormsCore();
        setForms(built);
        openPrintWithForms(built);
      } catch (err) {
        setMessage(err instanceof Error ? err.message : "Failed to build forms.");
      } finally {
        stop();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once when URL auto=1 and prerequisites are ready
  }, [autoGenerate, selectedTrip, source, groupId, selectedIds.length, initialSheet]);

  const updatePassenger = (
    formIndex: number,
    serialNo: number,
    patch: Partial<{ sex: PassengerGender; berthPreference: string; nameOnTicket: string; age: string }>
  ) => {
    setForms((prev) =>
      prev.map((form, fi) => {
        if (fi !== formIndex) return form;
        return {
          ...form,
          passengers: form.passengers.map((p) =>
            p.serialNo === serialNo ? { ...p, ...patch } : p
          ),
        };
      })
    );
  };

  const updateJourney = (formIndex: number, field: keyof Cm257FormDraft["journey"], value: string) => {
    setForms((prev) =>
      prev.map((form, fi) =>
        fi === formIndex
          ? {
              ...form,
              journey: {
                ...form.journey,
                [field]: field === "classCode" ? (value as IrClassCode) : value,
              },
            }
          : form
      )
    );
  };

  const openPrint = () => {
    if (forms.length === 0) {
      setMessage("Generate forms before printing.");
      return;
    }
    openPrintWithForms(forms);
  };

  if (trainTrips.length === 0) {
    return (
      <FormSection title="No train trips">
        <p className="text-sm text-[color:var(--muted)]">
          Create a train trip under Masters → Trips before generating reservation forms.
        </p>
      </FormSection>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Railway reservation forms (CM257)"
        subtitle={`Committee train bookings only — max ${CM257_MAX_PASSENGERS} passengers per CM257. Use co-travel group, import sheet (e.g. SFS-1), or pick yatris.`}
        kicker="PRS counter"
        actions={
          <Link href="/groups/train" className="btn-secondary">
            Travel groups
          </Link>
        }
      />

      {message && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-950/30 px-4 py-3 text-sm text-amber-100">
          {message}
        </div>
      )}

      <FormSection title="1. Trip & source" description="Pick journey details and who to include.">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Train trip" htmlFor="trip_id">
            <Select
              id="trip_id"
              value={tripId}
              onChange={(e) => {
                setTripId(e.target.value);
                setForms([]);
              }}
            >
              {trainTrips.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.trip_name} — {t.journey_date} ({t.train_no ?? "train"})
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Passenger source" htmlFor="source">
            <Select id="source" value={source} onChange={(e) => setSource(e.target.value as "yatris" | "group")}>
              <option value="yatris">Selected yatris (search)</option>
              <option value="group">Co-travel group</option>
            </Select>
          </Field>
        </div>

        {source === "yatris" ? (
          <div className="mt-4 space-y-3">
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              <Field label="Filter list" htmlFor="yatri_search">
                <TextInput
                  id="yatri_search"
                  value={yatriSearch}
                  onChange={(e) => setYatriSearch(e.target.value)}
                  placeholder="Name, phone, Aadhaar, or sheet"
                />
              </Field>
              <Field label="Eligibility filter" htmlFor="travel_filter">
                <Select
                  id="travel_filter"
                  value={travelFilter}
                  onChange={(e) =>
                    setTravelFilter(e.target.value as "all" | "train" | "committee-train")
                  }
                >
                  <option value="committee-train">Train + committee books (CM257)</option>
                  <option value="train">Train only</option>
                  <option value="all">All yatris (up to 200)</option>
                </Select>
              </Field>
              <Field label="Import sheet (optional)" htmlFor="sheet_filter">
                <TextInput
                  id="sheet_filter"
                  value={sheetFilter}
                  onChange={(e) => setSheetFilter(normalizeImportSheet(e.target.value))}
                  placeholder="e.g. SFS-1, Family, Kath-1"
                />
              </Field>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-[color:var(--muted)]">
              <span>
                Selected: {selectedIds.length} · List: {yatriList.length}
                {yatriListLoading ? " (loading…)" : ""}
              </span>
              <button type="button" className="btn-secondary min-h-[28px] px-2 py-1 text-xs" onClick={selectAllVisible}>
                Select all in list
              </button>
              <button type="button" className="btn-secondary min-h-[28px] px-2 py-1 text-xs" onClick={clearSelection}>
                Clear selection
              </button>
            </div>
            <p className="text-xs text-[color:var(--muted)]">
              Tip: select yatris on <Link href="/yatris" className="text-sky-400 underline">Yatris</Link> and use
              &quot;CM257 forms&quot; to open here with them pre-selected.
            </p>
            <div className="max-h-72 overflow-y-auto rounded-xl border border-[color:var(--border)]">
              {yatriList.length === 0 && !yatriListLoading ? (
                <p className="p-3 text-sm text-[color:var(--muted)]">No yatris match this filter.</p>
              ) : (
                <ul className="divide-y divide-[color:var(--border)]">
                  {yatriList.map((row) => {
                    const checked = selectedIds.includes(row.id);
                    return (
                      <li key={row.id}>
                        <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-[color:var(--surface-muted)]">
                          <input type="checkbox" checked={checked} onChange={() => toggleYatri(row.id)} />
                          <span className="flex-1 text-sm">
                            <span className="font-medium">{row.name_hi}</span>
                            <span className="text-[color:var(--muted)]">
                              {" "}
                              · {row.age_years ?? "—"} yrs · {row.train_class ?? row.travel_mode ?? "—"} ·{" "}
                              {row.reservation_by ?? "—"} · {row.source_sheet ?? "—"} · {row.phone ?? "—"}
                            </span>
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-4">
            <Field label="Co-travel group" htmlFor="group_id">
              <Select id="group_id" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
                {groups.length === 0 ? (
                  <option value="">No groups for this trip</option>
                ) : (
                  groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.group_code} ({g.members.length} members){g.pnr ? ` · PNR ${g.pnr}` : ""}
                    </option>
                  ))
                )}
              </Select>
            </Field>
          </div>
        )}

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Field label="Print layout (PDF)" htmlFor="print_layout">
            <Select
              id="print_layout"
              value={printLayout}
              onChange={(e) => setPrintLayout(e.target.value as Cm257PrintLayout)}
            >
              {(Object.keys(CM257_PRINT_LAYOUT_LABELS) as Cm257PrintLayout[]).map((key) => (
                <option key={key} value={key}>
                  {CM257_PRINT_LAYOUT_LABELS[key]}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="btn-primary" onClick={() => void generateForms()}>
            Generate forms
          </button>
          <button type="button" className="btn-primary" onClick={() => void generateAndPrint()}>
            Generate &amp; PDF
          </button>
          {forms.length > 0 && (
            <button type="button" className="btn-secondary" onClick={openPrint}>
              Print / Save PDF ({forms.length} form{forms.length > 1 ? "s" : ""})
            </button>
          )}
        </div>
      </FormSection>

      {forms.length > 0 && (
        <FormSection
          title="2. Review & edit"
          description="Set Sex (M/F) for each passenger before printing. Names print in BLOCK LETTERS."
        >
          <div className="space-y-8">
            {forms.map((form, formIndex) => (
              <div key={formIndex} className="space-y-4 rounded-xl border border-[color:var(--border)] p-4">
                <h3 className="text-sm font-semibold text-[color:var(--ink)]">
                  {form.formLabel ?? `Form ${formIndex + 1}`}
                </h3>
                <div className="grid gap-3 md:grid-cols-3">
                  <Field label="Train no. & name">
                    <TextInput
                      value={form.journey.trainNoAndName}
                      onChange={(e) => updateJourney(formIndex, "trainNoAndName", e.target.value)}
                    />
                  </Field>
                  <Field label="Journey date (DD/MM/YY)">
                    <TextInput
                      value={form.journey.journeyDate}
                      onChange={(e) => updateJourney(formIndex, "journeyDate", e.target.value)}
                    />
                  </Field>
                  <Field label="Class code">
                    <Select
                      value={form.journey.classCode}
                      onChange={(e) => updateJourney(formIndex, "classCode", e.target.value)}
                    >
                      <option value="">—</option>
                      {["SL", "2A", "3A", "CC", "EC", "1A", "FC", "2S", "3E"].map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="From">
                    <TextInput
                      value={form.journey.fromStation}
                      onChange={(e) => updateJourney(formIndex, "fromStation", e.target.value)}
                    />
                  </Field>
                  <Field label="To">
                    <TextInput
                      value={form.journey.toStation}
                      onChange={(e) => updateJourney(formIndex, "toStation", e.target.value)}
                    />
                  </Field>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase text-[color:var(--muted)]">
                        <th className="p-2">#</th>
                        <th className="p-2">Name on ticket</th>
                        <th className="p-2">Sex</th>
                        <th className="p-2">Age</th>
                        <th className="p-2">Berth pref.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.passengers
                        .filter((p) => p.nameOnTicket.trim())
                        .map((pax) => (
                          <tr key={pax.serialNo} className="border-t border-[color:var(--border)]">
                            <td className="p-2">{pax.serialNo}</td>
                            <td className="p-2">
                              <TextInput
                                value={pax.nameOnTicket}
                                onChange={(e) =>
                                  updatePassenger(formIndex, pax.serialNo, {
                                    nameOnTicket: e.target.value.toUpperCase(),
                                  })
                                }
                              />
                            </td>
                            <td className="p-2">
                              <Select
                                value={pax.sex}
                                onChange={(e) =>
                                  updatePassenger(formIndex, pax.serialNo, {
                                    sex: e.target.value as PassengerGender,
                                  })
                                }
                              >
                                <option value="">—</option>
                                <option value="M">M</option>
                                <option value="F">F</option>
                                <option value="T">T</option>
                              </Select>
                            </td>
                            <td className="p-2">
                              <TextInput
                                value={pax.age}
                                onChange={(e) =>
                                  updatePassenger(formIndex, pax.serialNo, { age: e.target.value })
                                }
                                className="max-w-[4rem]"
                              />
                            </td>
                            <td className="p-2">
                              <Select
                                value={pax.berthPreference}
                                onChange={(e) =>
                                  updatePassenger(formIndex, pax.serialNo, {
                                    berthPreference: e.target.value,
                                  })
                                }
                              >
                                <option value="">—</option>
                                {["LB", "MB", "UB", "SL", "SU", "WS"].map((b) => (
                                  <option key={b} value={b}>
                                    {b}
                                  </option>
                                ))}
                              </Select>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                <details className="text-sm">
                  <summary className="cursor-pointer text-[color:var(--accent)]">Preview this form</summary>
                  <div className="mt-4 overflow-x-auto rounded-lg border border-[color:var(--border)] bg-[#e8e8e8] p-4">
                    <div style={{ transform: "scale(0.55)", transformOrigin: "top left", width: "210mm" }}>
                      <Cm257ReservationForm draft={form} />
                    </div>
                  </div>
                </details>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <button type="button" className="btn-primary" onClick={openPrint}>
              Print / Save PDF
            </button>
          </div>
        </FormSection>
      )}

      <FormSection title="Counter-ready PDF">
        <p className="text-sm text-[color:var(--muted)]">
          For pixel-perfect alignment with the printed CM257 issued by Indian Railways, place a scan at{" "}
          <code className="text-xs">public/forms/cm257-en.png</code> (300 DPI, cropped to A4). The app will overlay
          your data on that template when the file exists.
        </p>
      </FormSection>
    </div>
  );
}

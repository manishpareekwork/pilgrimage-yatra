"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
import {
  formatTripSelectLabel,
  YATRA_OUTBOUND_JOURNEY_DATE,
} from "@/lib/tripDisplay";
import { CM257_OFFICIAL_PDF_URL } from "@/lib/railwayReservation/cm257Official";
import { ImportBucketSelect } from "@/components/forms/ImportBucketSelect";
import { CommitteeTrainStepBar } from "@/components/workflow/CommitteeTrainStepBar";
import { pickDefaultImportBucket, type ImportBucketOption } from "@/lib/importBuckets";

type PassengerSource = "yatris" | "group" | "sheet";

type Trip = TripRow & { mode: string; trip_kind?: string | null };

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

export function RailwayReservationBuilder({
  trips,
  importBuckets,
}: {
  trips: Trip[];
  importBuckets: ImportBucketOption[];
}) {
  const supabase = useMemo(() => getBrowserSupabase(), []);
  const router = useRouter();
  const { startLoading } = useGlobalLoading();
  const searchParams = useSearchParams();
  const trainTrips = useMemo(() => trips.filter((t) => t.mode === "train"), [trips]);

  const defaultTrainTripId = useMemo(() => {
    const preferred = trainTrips.find(
      (t) =>
        t.trip_kind === "outbound" &&
        (t.journey_date?.slice(0, 10) === YATRA_OUTBOUND_JOURNEY_DATE ||
          t.journey_date === YATRA_OUTBOUND_JOURNEY_DATE)
    );
    return preferred?.id ?? trainTrips[0]?.id ?? "";
  }, [trainTrips]);

  const initialTripId =
    searchParams.get("tripId") && trainTrips.some((t) => t.id === searchParams.get("tripId"))
      ? (searchParams.get("tripId") as string)
      : defaultTrainTripId;
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
  const [source, setSource] = useState<PassengerSource>(
    initialGroupId ? "group" : "sheet"
  );
  const [yatriSearch, setYatriSearch] = useState("");
  const [travelFilter, setTravelFilter] = useState<"all" | "train" | "committee-train">("committee-train");
  const [sheetFilter, setSheetFilter] = useState(() => {
    const fromUrl = normalizeImportSheet(initialSheet);
    if (fromUrl) return fromUrl;
    return pickDefaultImportBucket(importBuckets)?.name ?? "";
  });
  const [yatriList, setYatriList] = useState<RegistrationRow[]>([]);
  const [yatriListLoading, setYatriListLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds);
  const [printLayout, setPrintLayout] = useState<Cm257PrintLayout>("a5-double");
  const [groups, setGroups] = useState<CoTravelGroup[]>([]);
  const [groupId, setGroupId] = useState(initialGroupId);
  const [selectedGroupMemberRegIds, setSelectedGroupMemberRegIds] = useState<string[]>([]);
  const [forms, setForms] = useState<Cm257FormDraft[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const autoRanRef = useRef(false);
  const groupSelectionInitRef = useRef<string | null>(null);
  const sheetAutoSelectKeyRef = useRef("");
  const [printPageUrl, setPrintPageUrl] = useState<string | null>(null);

  const selectedTrip = useMemo(
    () => trainTrips.find((t) => t.id === tripId) ?? null,
    [trainTrips, tripId]
  );

  const activeGroup = useMemo(
    () => groups.find((g) => g.id === groupId) ?? null,
    [groups, groupId]
  );

  useEffect(() => {
    if (!activeGroup) {
      setSelectedGroupMemberRegIds([]);
      return;
    }
    if (groupSelectionInitRef.current === activeGroup.id) return;
    groupSelectionInitRef.current = activeGroup.id;

    const memberRegIds = new Set(activeGroup.members.map((m) => m.registration_id));
    const defaultEligible = activeGroup.members
      .filter((m) => m.registration && isEligibleForCommitteeCm257(m.registration))
      .map((m) => m.registration_id);

    const fromUrl =
      initialSelectedIds.length > 0 &&
      (activeGroup.id === initialGroupId ||
        (initialGroupCode &&
          activeGroup.group_code.toLowerCase() === initialGroupCode.trim().toLowerCase()))
        ? initialSelectedIds.filter((id) => memberRegIds.has(id))
        : [];

    setSelectedGroupMemberRegIds(fromUrl.length > 0 ? fromUrl : defaultEligible);
  }, [
    activeGroup,
    initialGroupId,
    initialGroupCode,
    initialSelectedIds,
  ]);

  const listEligibleCount = useMemo(() => {
    if (source === "group") {
      if (!activeGroup) return 0;
      return activeGroup.members.filter(
        (m) => m.registration && isEligibleForCommitteeCm257(m.registration)
      ).length;
    }
    return yatriList.filter(isEligibleForCommitteeCm257).length;
  }, [source, activeGroup, yatriList]);

  const selectedEligibleCount = useMemo(() => {
    if (source === "group") {
      if (!activeGroup) return 0;
      return activeGroup.members.filter(
        (m) =>
          selectedGroupMemberRegIds.includes(m.registration_id) &&
          m.registration &&
          isEligibleForCommitteeCm257(m.registration)
      ).length;
    }
    return yatriList.filter(
      (r) => selectedIds.includes(r.id) && isEligibleForCommitteeCm257(r)
    ).length;
  }, [source, activeGroup, selectedGroupMemberRegIds, yatriList, selectedIds]);

  const estimatedFormCount =
    selectedEligibleCount > 0
      ? Math.ceil(selectedEligibleCount / CM257_MAX_PASSENGERS)
      : 0;

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
      const sheet = sheetFilter.trim();
      if (source === "sheet" && !sheet) {
        setYatriList([]);
        setYatriListLoading(false);
        return;
      }

      setYatriListLoading(true);
      let query = supabase
        .from("yatra_registrations")
        .select(REGISTRATION_SELECT)
        .order("name_hi", { ascending: true })
        .limit(source === "sheet" ? 500 : 200);

      if (source === "sheet") {
        query = query.eq("source_sheet", sheet);
      } else {
        if (travelFilter === "train") {
          query = query.eq("travel_mode", "train");
        } else if (travelFilter === "committee-train") {
          query = query.eq("travel_mode", "train").eq("reservation_by", "committee");
        }
        if (sheet) {
          query = query.eq("source_sheet", sheet);
        }
        const needle = yatriSearch.trim();
        if (needle) {
          query = query.or(
            `name_hi.ilike.%${needle}%,phone.ilike.%${needle}%,aadhaar_no.ilike.%${needle}%,source_sheet.ilike.%${needle}%`
          );
        }
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
  }, [yatriSearch, travelFilter, sheetFilter, supabase, source]);

  useEffect(() => {
    if (source !== "sheet") return;
    const sheet = sheetFilter.trim();
    if (!sheet || yatriListLoading) return;
    const key = `${sheet}:${yatriList.length}`;
    if (sheetAutoSelectKeyRef.current === key) return;
    sheetAutoSelectKeyRef.current = key;
    const eligibleIds = yatriList.filter(isEligibleForCommitteeCm257).map((r) => r.id);
    setSelectedIds(eligibleIds);
    if (eligibleIds.length === 0 && yatriList.length > 0) {
      setMessage(
        `${yatriList.length} on sheet “${sheet}” — none have Train + committee reservation yet. Open the roster to fix, then return here.`
      );
    } else if (eligibleIds.length > 0) {
      setMessage(null);
    }
  }, [source, sheetFilter, yatriListLoading, yatriList]);

  const pickSheet = (name: string) => {
    sheetAutoSelectKeyRef.current = "";
    setSheetFilter(normalizeImportSheet(name));
    setForms([]);
  };

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
      setSource("sheet");
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
    const ids =
      source === "sheet"
        ? yatriList.filter(isEligibleForCommitteeCm257).map((r) => r.id)
        : yatriList.map((r) => r.id);
    setSelectedIds((prev) => [...new Set([...prev, ...ids])]);
  };

  const clearSelection = () => setSelectedIds([]);

  const toggleGroupMember = (registrationId: string) => {
    setSelectedGroupMemberRegIds((prev) =>
      prev.includes(registrationId)
        ? prev.filter((id) => id !== registrationId)
        : [...prev, registrationId]
    );
  };

  const selectAllEligibleGroupMembers = () => {
    if (!activeGroup) return;
    setSelectedGroupMemberRegIds(
      activeGroup.members
        .filter((m) => m.registration && isEligibleForCommitteeCm257(m.registration))
        .map((m) => m.registration_id)
    );
  };

  const selectAllGroupMembers = () => {
    if (!activeGroup) return;
    setSelectedGroupMemberRegIds(activeGroup.members.map((m) => m.registration_id));
  };

  const clearGroupMemberSelection = () => setSelectedGroupMemberRegIds([]);

  const loadFullRegistrations = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return [] as RegistrationRow[];
      const chunkSize = 80;
      const rows: RegistrationRow[] = [];
      for (let i = 0; i < ids.length; i += chunkSize) {
        const slice = ids.slice(i, i + chunkSize);
        const { data, error } = await supabase
          .from("yatra_registrations")
          .select(REGISTRATION_SELECT)
          .in("id", slice);
        if (error) throw new Error(error.message);
        rows.push(...((data ?? []) as RegistrationRow[]));
      }
      return rows;
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
      if (selectedGroupMemberRegIds.length === 0) {
        throw new Error("Select at least one group member, then generate.");
      }
      const selectedSet = new Set(selectedGroupMemberRegIds);
      const allMembers = group.members.filter((m) => selectedSet.has(m.registration_id));
      const members = allMembers.filter((m) =>
        m.registration ? isEligibleForCommitteeCm257(m.registration) : false
      );
      if (members.length === 0) {
        throw new Error(
          "No eligible members among your selection (need train travel + committee reservation)."
        );
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
    selectedGroupMemberRegIds,
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
    const payload: Cm257PrintPayload = {
      tripId,
      tripName: selectedTrip?.trip_name ?? undefined,
      forms: built,
      generatedAt: new Date().toISOString(),
      layout: printLayout,
    };
    saveCm257PrintPayload(payload);
    const printUrl = "/print/railway-reservation?download=1";
    setPrintPageUrl(printUrl);
    if (missingGender) {
      setMessage(
        "Tip: some passengers are missing Sex (M/F) — set them in Review below before counter print."
      );
    }
    const popup = window.open(printUrl, "_blank");
    if (!popup) {
      router.push(printUrl);
      return;
    }
    setMessage(
      `Building PDF for ${built.length} form(s) — download should start in the new tab (no print dialog).`
    );
  };

  const assertCanGenerate = (): boolean => {
    if (!selectedTrip) {
      setMessage("Choose a train trip first.");
      return false;
    }
    if (selectedEligibleCount === 0) {
      if (source === "sheet" && listEligibleCount === 0 && yatriList.length > 0) {
        setMessage(
          "No CM257-eligible yatris on this sheet. Set Travel mode = Train and Reservation = Committee on the roster, then try again."
        );
      } else {
        setMessage(
          "Select at least one passenger (train travel + committee reservation). “Eligible on list” shows who can go on a CM257."
        );
      }
      return false;
    }
    return true;
  };

  const generateForms = async () => {
    if (!assertCanGenerate()) return;
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
    if (!assertCanGenerate()) return;
    const stop = startLoading("Building CM257 download…");
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
    if (source === "group" && (!groupId || selectedGroupMemberRegIds.length === 0)) return;
    if ((source === "yatris" || source === "sheet") && selectedIds.length === 0 && !initialSheet)
      return;
    autoRanRef.current = true;
    const stop = startLoading("Building CM257 download…");
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
  }, [
    autoGenerate,
    selectedTrip,
    source,
    groupId,
    selectedGroupMemberRegIds.length,
    selectedIds.length,
    initialSheet,
  ]);

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
    <div className="page-stack">
      <PageHeader
        title="CM257 — print at PRS counter"
        subtitle={`Pick passengers → Generate & download PDF (direct file). Up to ${CM257_MAX_PASSENGERS} passengers per form.`}
        kicker="Step 4 · Train booking"
        actions={
          <a
            href={CM257_OFFICIAL_PDF_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
          >
            Official blank (SCR)
          </a>
        }
      />

      <CommitteeTrainStepBar currentStep="cm257" />

      {message && (
        <div className="cm257-alert" role="status">
          {message}
          {message.includes("roster") || message.includes("Reservation") ? (
            <span className="mt-2 block">
              <Link
                href={`/yatris?travel=committee-train&travel_mode=train${sheetFilter.trim() ? `&source_sheet=${encodeURIComponent(sheetFilter.trim())}` : ""}`}
                className="text-sky-400 underline"
              >
                Open roster to fix reservation fields
              </Link>
            </span>
          ) : null}
        </div>
      )}

      {printPageUrl && (
        <div className="cm257-alert cm257-alert--success">
          PDF page —{" "}
          <Link href={printPageUrl} target="_blank" rel="noopener noreferrer" className="font-semibold underline">
            Download again
          </Link>
          . Layout: {CM257_PRINT_LAYOUT_LABELS[printLayout]}.
        </div>
      )}

      <FormSection
        title="1. Trip & passengers"
        description="Import sheet (e.g. Family, SFS-1) is fastest for committee batches."
      >
        <div className="form-grid form-grid--2">
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
                  {formatTripSelectLabel(t)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="How to select passengers" htmlFor="source">
            <Select
              id="source"
              value={source}
              onChange={(e) => setSource(e.target.value as PassengerSource)}
            >
              <option value="sheet">Import sheet / bucket (recommended)</option>
              <option value="yatris">Roster search (pick individuals)</option>
              <option value="group">Co-travel group</option>
            </Select>
          </Field>
        </div>

        {source === "sheet" ? (
          <div className="cm257-sheet-panel">
            <ImportBucketSelect
              id="sheet_only"
              buckets={importBuckets}
              value={sheetFilter}
              onChange={pickSheet}
              required
            />
            {yatriList.length > 0 && listEligibleCount < yatriList.length ? (
              <p className="text-sm text-amber-800 dark:text-amber-200">
                {yatriList.length - listEligibleCount} on this sheet are not CM257-ready (need Train + committee).{" "}
                <Link
                  href={`/yatris?source_sheet=${encodeURIComponent(sheetFilter.trim())}`}
                  className="underline"
                >
                  Fix on roster
                </Link>
              </p>
            ) : null}
            <div className="cm257-sheet-toolbar">
              <p className="cm257-sheet-toolbar__stats">
                On sheet: <strong>{yatriList.length}</strong>
                {yatriListLoading ? " (loading…)" : ""} · CM257-ready:{" "}
                <strong>{listEligibleCount}</strong> · Selected: <strong>{selectedEligibleCount}</strong>
                {estimatedFormCount > 0
                  ? ` → ${estimatedFormCount} form${estimatedFormCount > 1 ? "s" : ""}`
                  : ""}
              </p>
              <div className="cm257-sheet-toolbar__actions">
                <button type="button" className="btn-secondary" onClick={selectAllVisible}>
                  Select all CM257-ready
                </button>
                <button type="button" className="btn-secondary" onClick={clearSelection}>
                  Clear
                </button>
              </div>
            </div>
            <div className="cm257-passenger-list">
              {!sheetFilter.trim() ? (
                <p className="p-5 text-sm text-[color:var(--muted)]">
                  Choose a bucket from the list above (or tap a chip).
                </p>
              ) : yatriList.length === 0 && !yatriListLoading ? (
                <p className="p-5 text-sm text-[color:var(--muted)]">
                  No yatris on this sheet yet. Assign the bucket on the roster.
                </p>
              ) : (
                <ul className="divide-y divide-[color:var(--border)]">
                  {yatriList.map((row) => {
                    const checked = selectedIds.includes(row.id);
                    const eligible = isEligibleForCommitteeCm257(row);
                    return (
                      <li key={row.id}>
                        <label
                          className={`flex cursor-pointer items-center gap-3 hover:bg-[color:var(--surface-muted)] ${!eligible ? "opacity-70" : ""}`}
                        >
                          <input type="checkbox" checked={checked} onChange={() => toggleYatri(row.id)} />
                          <span className="flex-1 text-sm">
                            <span className="font-medium">{row.name_hi}</span>
                            <span className="text-[color:var(--muted)]">
                              {" "}
                              · {row.age_years ?? "—"} yrs · {row.train_class ?? "—"} · {row.phone ?? "—"}
                              {!eligible ? " · not CM257-eligible" : ""}
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
        ) : source === "yatris" ? (
          <div className="cm257-sheet-panel">
            <div className="form-grid form-grid--3">
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
              <ImportBucketSelect
                id="sheet_filter"
                label="Limit to bucket (optional)"
                buckets={importBuckets}
                value={sheetFilter}
                onChange={pickSheet}
                showChips={false}
                emptyLabel="All buckets"
                helperText="Optional — narrow the roster list to one import sheet."
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-[color:var(--muted)]">
              <span>
                List: {yatriList.length}
                {yatriListLoading ? " (loading…)" : ""} · CM257-ready on list: {listEligibleCount} · Selected for
                print: {selectedEligibleCount}
                {estimatedFormCount > 0
                  ? ` → ${estimatedFormCount} form${estimatedFormCount > 1 ? "s" : ""}`
                  : ""}
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
            <div className="cm257-passenger-list">
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
          <div className="mt-6 space-y-4">
            <Field label="Co-travel group" htmlFor="group_id">
              <Select
                id="group_id"
                value={groupId}
                onChange={(e) => {
                  groupSelectionInitRef.current = null;
                  setGroupId(e.target.value);
                  setForms([]);
                }}
              >
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
            <div className="flex flex-wrap items-center gap-2 text-xs text-[color:var(--muted)]">
              <span>
                Members selected: {selectedGroupMemberRegIds.length} · Eligible: {selectedEligibleCount}
                {estimatedFormCount > 0
                  ? ` → ${estimatedFormCount} CM257 form${estimatedFormCount > 1 ? "s" : ""} (max ${CM257_MAX_PASSENGERS}/form)`
                  : ""}
              </span>
              <button
                type="button"
                className="btn-secondary min-h-[28px] px-2 py-1 text-xs"
                onClick={selectAllEligibleGroupMembers}
              >
                Select all eligible
              </button>
              <button
                type="button"
                className="btn-secondary min-h-[28px] px-2 py-1 text-xs"
                onClick={selectAllGroupMembers}
              >
                Select all in group
              </button>
              <button
                type="button"
                className="btn-secondary min-h-[28px] px-2 py-1 text-xs"
                onClick={clearGroupMemberSelection}
              >
                Clear selection
              </button>
            </div>
            <p className="text-xs text-[color:var(--muted)]">
              Tick the members to include, then use Generate forms. More than {CM257_MAX_PASSENGERS}{" "}
              passengers are split automatically per railway rules.
            </p>
            <div className="cm257-passenger-list">
              {!activeGroup || activeGroup.members.length === 0 ? (
                <p className="p-3 text-sm text-[color:var(--muted)]">No members in this group.</p>
              ) : (
                <ul className="divide-y divide-[color:var(--border)]">
                  {activeGroup.members.map((member) => {
                    const reg = member.registration;
                    const eligible = reg ? isEligibleForCommitteeCm257(reg) : false;
                    const checked = selectedGroupMemberRegIds.includes(member.registration_id);
                    const displayName =
                      member.passenger_name_on_ticket?.trim() || reg?.name_hi || member.registration_id;
                    return (
                      <li key={member.registration_id}>
                        <label
                          className={`flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-[color:var(--surface-muted)] ${!eligible ? "opacity-70" : ""}`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleGroupMember(member.registration_id)}
                          />
                          <span className="flex-1 text-sm">
                            <span className="font-medium">{displayName}</span>
                            <span className="text-[color:var(--muted)]">
                              {" "}
                              · {member.passenger_age_on_ticket ?? reg?.age_years ?? "—"} yrs ·{" "}
                              {member.berth_type ?? "—"} · {reg?.train_class ?? reg?.travel_mode ?? "—"} ·{" "}
                              {reg?.reservation_by ?? "—"}
                              {!eligible ? " · not CM257-eligible" : ""}
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
        )}

        <div className="form-grid form-grid--2">
          <Field
            label="Print layout"
            htmlFor="print_layout"
            helperText="Used when building the PDF file (A4 full vs platform slip layout)."
          >
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
                  <summary className="cursor-pointer text-[color:var(--accent)]">
                    Preview this form (table grid — matches print/PDF)
                  </summary>
                  <div className="cm257-preview-frame mt-4">
                    <Cm257ReservationForm
                      draft={form}
                      template={printLayout === "a4-full" ? "a4" : "a5"}
                    />
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

      <div className="cm257-action-bar print:hidden">
        <div className="cm257-action-bar__summary">
          {selectedEligibleCount > 0 ? (
            <>
              <strong>{selectedEligibleCount}</strong> passenger{selectedEligibleCount !== 1 ? "s" : ""} →{" "}
              <strong>{estimatedFormCount}</strong> CM257 form{estimatedFormCount !== 1 ? "s" : ""}
            </>
          ) : (
            <span>Select passengers above to enable PDF</span>
          )}
        </div>
        <div className="cm257-action-bar__actions">
          <button
            type="button"
            className="btn-secondary"
            disabled={selectedEligibleCount === 0}
            onClick={() => void generateForms()}
          >
            Preview only
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={selectedEligibleCount === 0}
            onClick={() => void generateAndPrint()}
          >
            Generate &amp; download PDF
          </button>
          {forms.length > 0 ? (
            <button type="button" className="btn-secondary" onClick={openPrint}>
              Download again
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

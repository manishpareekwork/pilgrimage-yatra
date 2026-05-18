import { normalizeTrainClass } from "@/lib/trainClasses";
import type {
  Cm257Applicant,
  Cm257FormDraft,
  Cm257Journey,
  Cm257Passenger,
  IrClassCode,
  PassengerGender,
} from "./types";
import { CM257_MAX_PASSENGERS } from "./types";

export type RegistrationRow = {
  id: string;
  name_hi: string | null;
  father_name_hi: string | null;
  address_hi: string | null;
  address_state: string | null;
  address_district: string | null;
  address_city: string | null;
  address_pin: string | null;
  phone: string | null;
  whatsapp: string | null;
  dob: string | null;
  age_years: number | null;
  train_class: string | null;
  travel_mode: string | null;
  aadhaar_no: string | null;
};

export type TripRow = {
  id: string;
  trip_name: string | null;
  journey_date: string | null;
  train_no: string | null;
  from_station_code: string | null;
  to_station_code: string | null;
};

export type GroupMemberRow = {
  registration_id: string;
  passenger_name_on_ticket: string | null;
  passenger_age_on_ticket: number | null;
  passenger_gender: string | null;
  berth_type: string | null;
  registration?: RegistrationRow | null;
};

const IR_CLASS_CODES: IrClassCode[] = ["SL", "2A", "3A", "CC", "EC", "1A", "FC", "2S", "3E"];

export const mapTrainClassToIrCode = (trainClass: string | null | undefined): IrClassCode | "" => {
  const normalized = normalizeTrainClass(trainClass);
  if (/2\s*ac|2a/i.test(normalized)) return "2A";
  if (/3\s*ac|3a/i.test(normalized)) return "3A";
  if (/sleeper|\bsl\b/i.test(normalized)) return "SL";
  if (/1\s*ac|1a/i.test(normalized)) return "1A";
  if (/cc|chair\s*car/i.test(normalized)) return "CC";
  if (/ec|executive/i.test(normalized)) return "EC";
  if (/fc|first/i.test(normalized)) return "FC";
  if (/2s|second\s*seating/i.test(normalized)) return "2S";
  if (/3e/i.test(normalized)) return "3E";
  return "";
};

export const mapDbGenderToCm257 = (value: string | null | undefined): PassengerGender => {
  const g = (value ?? "").toLowerCase();
  if (g === "male" || g === "m") return "M";
  if (g === "female" || g === "f") return "F";
  if (g === "transgender" || g === "other" || g === "t") return "T";
  return "";
};

export const formatJourneyDate = (isoDate: string | null | undefined): string => {
  if (!isoDate) return "";
  const d = new Date(isoDate.includes("T") ? isoDate : `${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
};

export const buildApplicantAddress = (row: RegistrationRow): string => {
  const parts = [
    row.address_hi,
    row.address_city,
    row.address_district,
    row.address_state,
    row.address_pin ? `PIN ${row.address_pin}` : null,
  ].filter(Boolean);
  return parts.join(", ");
};

export const registrationToPassenger = (
  row: RegistrationRow,
  index: number,
  overrides?: Partial<Cm257Passenger>
): Cm257Passenger => ({
  registrationId: row.id,
  serialNo: index + 1,
  nameOnTicket: (row.name_hi ?? "").toUpperCase(),
  sex: overrides?.sex ?? "",
  age: row.age_years != null ? String(row.age_years) : "",
  concession: overrides?.concession ?? "",
  berthPreference: overrides?.berthPreference ?? "",
});

export const memberToPassenger = (
  member: GroupMemberRow,
  index: number
): Cm257Passenger => {
  const reg = member.registration;
  const name =
    member.passenger_name_on_ticket?.trim() ||
    reg?.name_hi?.trim() ||
    "";
  const age =
    member.passenger_age_on_ticket != null
      ? String(member.passenger_age_on_ticket)
      : reg?.age_years != null
        ? String(reg.age_years)
        : "";
  return {
    registrationId: member.registration_id,
    serialNo: index + 1,
    nameOnTicket: name.toUpperCase(),
    sex: mapDbGenderToCm257(member.passenger_gender),
    age,
    concession: "",
    berthPreference: (member.berth_type ?? "").toUpperCase(),
  };
};

export const buildJourneyFromTrip = (
  trip: TripRow,
  registrations: RegistrationRow[],
  overrides?: Partial<Cm257Journey>
): Cm257Journey => {
  const trainNo = trip.train_no?.trim() ?? "";
  const tripLabel = trip.trip_name?.trim() ?? "";
  const trainNoAndName = [trainNo, tripLabel].filter(Boolean).join(" — ") || tripLabel || trainNo;
  const classCode =
    overrides?.classCode ??
    mapTrainClassToIrCode(registrations.find((r) => r.train_class)?.train_class) ??
    "";

  return {
    trainNoAndName: overrides?.trainNoAndName ?? trainNoAndName,
    journeyDate: overrides?.journeyDate ?? formatJourneyDate(trip.journey_date),
    classCode,
    berthCount: overrides?.berthCount ?? String(Math.min(registrations.length, CM257_MAX_PASSENGERS)),
    fromStation: overrides?.fromStation ?? (trip.from_station_code ?? ""),
    toStation: overrides?.toStation ?? (trip.to_station_code ?? ""),
    boardingStation: overrides?.boardingStation ?? (trip.from_station_code ?? ""),
    reservationUpto: overrides?.reservationUpto ?? (trip.to_station_code ?? ""),
  };
};

export const buildApplicantFromRegistration = (
  row: RegistrationRow | undefined,
  overrides?: Partial<Cm257Applicant>
): Cm257Applicant => {
  if (!row) {
    return {
      name: overrides?.name ?? "",
      address: overrides?.address ?? "",
      phone: overrides?.phone ?? "",
      date: overrides?.date ?? formatJourneyDate(new Date().toISOString().slice(0, 10)),
    };
  }
  return {
    name: overrides?.name ?? (row.name_hi ?? ""),
    address: overrides?.address ?? buildApplicantAddress(row),
    phone: overrides?.phone ?? (row.phone ?? row.whatsapp ?? ""),
    date: overrides?.date ?? formatJourneyDate(new Date().toISOString().slice(0, 10)),
  };
};

export const chunkPassengers = <T>(items: T[], size = CM257_MAX_PASSENGERS): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

export const padPassengerRows = (passengers: Cm257Passenger[]): Cm257Passenger[] => {
  const rows = [...passengers];
  while (rows.length < CM257_MAX_PASSENGERS) {
    rows.push({
      registrationId: "",
      serialNo: rows.length + 1,
      nameOnTicket: "",
      sex: "",
      age: "",
      concession: "",
      berthPreference: "",
    });
  }
  return rows.slice(0, CM257_MAX_PASSENGERS);
};

export const buildFormsFromRegistrations = (
  trip: TripRow,
  registrations: RegistrationRow[],
  options?: {
    applicantRegistrationId?: string;
    journeyOverrides?: Partial<Cm257Journey>;
    passengerOverrides?: Record<string, Partial<Cm257Passenger>>;
  }
): Cm257FormDraft[] => {
  const passengers = registrations.map((row, idx) =>
    registrationToPassenger(row, idx, options?.passengerOverrides?.[row.id])
  );
  const chunks = chunkPassengers(passengers);
  const applicantRow =
    registrations.find((r) => r.id === options?.applicantRegistrationId) ?? registrations[0];

  return chunks.map((chunk, formIndex) => ({
    formLabel: chunks.length > 1 ? `Form ${formIndex + 1} of ${chunks.length}` : undefined,
    journey: buildJourneyFromTrip(trip, registrations, {
      ...options?.journeyOverrides,
      berthCount: String(chunk.filter((p) => p.nameOnTicket.trim()).length),
    }),
    passengers: padPassengerRows(chunk.map((p, i) => ({ ...p, serialNo: i + 1 }))),
    applicant: buildApplicantFromRegistration(applicantRow),
    vikalpOptIn: null,
    choiceIfBerthNotAvailable: "",
    mealPreference: "",
  }));
};

export const buildFormsFromGroupMembers = (
  trip: TripRow,
  members: GroupMemberRow[],
  applicant?: Cm257Applicant
): Cm257FormDraft[] => {
  const passengers = members.map((m, idx) => memberToPassenger(m, idx));
  const chunks = chunkPassengers(passengers);
  const firstReg = members[0]?.registration;

  return chunks.map((chunk, formIndex) => ({
    formLabel: chunks.length > 1 ? `Form ${formIndex + 1} of ${chunks.length}` : undefined,
    journey: buildJourneyFromTrip(
      trip,
      members.map((m) => m.registration).filter(Boolean) as RegistrationRow[],
      { berthCount: String(chunk.filter((p) => p.nameOnTicket.trim()).length) }
    ),
    passengers: padPassengerRows(chunk.map((p, i) => ({ ...p, serialNo: i + 1 }))),
    applicant: applicant ?? buildApplicantFromRegistration(firstReg ?? undefined),
    vikalpOptIn: null,
    choiceIfBerthNotAvailable: "",
    mealPreference: "",
  }));
};

export { IR_CLASS_CODES };

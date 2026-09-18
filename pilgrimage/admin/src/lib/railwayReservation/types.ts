/** Indian Railways CM257 — max passengers per requisition form. */
export const CM257_MAX_PASSENGERS = 6;

export type IrClassCode = "SL" | "2A" | "3A" | "CC" | "EC" | "1A" | "FC" | "2S" | "3E";

export type PassengerGender = "M" | "F" | "T" | "";

export type BerthPreference = "LB" | "MB" | "UB" | "SL" | "SU" | "WS" | "" | string;

export type Cm257Passenger = {
  registrationId: string;
  serialNo: number;
  nameOnTicket: string;
  sex: PassengerGender;
  age: string;
  concession: string;
  berthPreference: BerthPreference;
};

export type Cm257Journey = {
  trainNoAndName: string;
  journeyDate: string;
  classCode: IrClassCode | "";
  berthCount: string;
  fromStation: string;
  toStation: string;
  boardingStation: string;
  reservationUpto: string;
};

export type Cm257Applicant = {
  name: string;
  address: string;
  phone: string;
  date: string;
};

export type Cm257FormDraft = {
  journey: Cm257Journey;
  passengers: Cm257Passenger[];
  applicant: Cm257Applicant;
  vikalpOptIn: boolean | null;
  choiceIfBerthNotAvailable: string;
  mealPreference: string;
  formLabel?: string;
};

/** ISO A4 — full counter copy / committee archive. */
export const CM257_A4_MM = { width: 210, height: 297 } as const;

/**
 * Platform slip size (~5.8×8.3 in, ISO A5).
 * Half the area of A4; used at PRS counters.
 */
export const CM257_PLATFORM_MM = { width: 148, height: 210 } as const;

/** @deprecated use CM257_PLATFORM_MM */
export const CM257_PHYSICAL_MM = CM257_PLATFORM_MM;

export type Cm257PrintLayout = "a4-full" | "a5-single" | "a5-double";

export const CM257_PRINT_LAYOUT_LABELS: Record<Cm257PrintLayout, string> = {
  "a4-full": "A4 full — 1 CM257 per sheet (210×297 mm, generous margins)",
  "a5-single": "Platform slip — 1 per A4 (148×210 mm, centred)",
  "a5-double": "Platform slip — 2 per A4 (each 148×210 mm content, fitted to half-page)",
};

export type Cm257PrintPayload = {
  tripId?: string;
  tripName?: string;
  forms: Cm257FormDraft[];
  generatedAt: string;
  layout?: Cm257PrintLayout | string;
};

export const CM257_PRINT_STORAGE_KEY = "pilgrimage:cm257-print";

/** Map legacy sessionStorage layout values to current templates. */
export function normalizeCm257PrintLayout(raw: string | undefined): Cm257PrintLayout {
  switch (raw) {
    case "a4-full":
    case "full":
      return "a4-full";
    case "a5-single":
    case "a5-physical":
    case "mini-tile":
      return "a5-single";
    case "a5-double":
    case "two-up":
      return "a5-double";
    default:
      return "a4-full";
  }
}

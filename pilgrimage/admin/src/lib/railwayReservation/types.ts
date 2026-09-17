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

/** Full A4 page — one CM257 per sheet (default). */
export type Cm257PrintLayout = "full" | "two-up" | "mini-tile";

export const CM257_PRINT_LAYOUT_LABELS: Record<Cm257PrintLayout, string> = {
  full: "Full page — 1 form per A4",
  "two-up": "Compact — 2 forms per A4",
  "mini-tile": "Counter size — tiled on A4 (max per sheet)",
};

/** Approx. physical CM257 slip size used for mini-tile (mm). Adjust if your division uses another print. */
export const CM257_PHYSICAL_MM = { width: 105, height: 138 } as const;

export type Cm257PrintPayload = {
  tripId?: string;
  tripName?: string;
  forms: Cm257FormDraft[];
  generatedAt: string;
  layout?: Cm257PrintLayout;
};

export const CM257_PRINT_STORAGE_KEY = "pilgrimage:cm257-print";

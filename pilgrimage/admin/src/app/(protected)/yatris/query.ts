import type { SupabaseClient } from "@supabase/supabase-js";

export type YatriRow = {
  id: string;
  created_at: string | null;
  updated_at?: string | null;
  name_hi: string | null;
  phone: string | null;
  travel_mode: string | null;
  train_class: string | null;
  category_id: string | null;
  category?: { id: string; name: string } | null;
  photo_url: string | null;
  form_image_url: string | null;
  receipt_no: string | null;
  aadhaar_no: string | null;
  age_years: number | null;
  dob: string | null;
  reservation_by: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  health_heart: boolean | null;
  health_bp: boolean | null;
  health_diabetes: boolean | null;
  health_asthma: boolean | null;
};

type RawYatriRow = Omit<YatriRow, "category"> & {
  category?: { id: string; name: string }[] | { id: string; name: string } | null;
};

export const COLUMN_FILTER_PREFIX = "cf_";

export const COLUMN_FILTER_KEYS = [
  "created_at",
  "name_hi",
  "phone",
  "category",
  "travel",
  "uploads",
  "receipt_no",
  "aadhaar_no",
  "age_years",
  "dob",
  "reservation_by",
  "emergency_contact",
  "health_flags",
  "updated_at",
] as const;

export type ColumnFilterKey = (typeof COLUMN_FILTER_KEYS)[number];
export type ColumnFilters = Partial<Record<ColumnFilterKey, string>>;

export type YatrisListParams = {
  q: string;
  travel_mode: string;
  date_from: string;
  date_to: string;
  missing: string;
  sort: "created_at" | "name";
  dir: "asc" | "desc";
  columnFilters: ColumnFilters;
  page: number;
  pageSize: number;
};

export type YatrisFilters = Omit<YatrisListParams, "page" | "pageSize">;

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

const SORT_VALUES = new Set(["created_at", "name"]);
const MISSING_VALUES = new Set(["photo", "form", "any"]);

export const SELECT_COLUMNS =
  "id,created_at,name_hi,phone,travel_mode,train_class,category_id,category:yatra_categories(id,name),photo_url,form_image_url,receipt_no,aadhaar_no,age_years,dob,reservation_by,emergency_contact_name,emergency_contact_phone,health_heart,health_bp,health_diabetes,health_asthma";

export const normalizeYatriRows = (rows: unknown[]): YatriRow[] =>
  rows.map((row) => {
    const raw = row as RawYatriRow;
    const category = Array.isArray(raw.category)
      ? raw.category[0] ?? null
      : raw.category ?? null;
    return { ...raw, category };
  });

const getParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] ?? "" : value ?? "";

const sanitizeSearch = (value: string) => value.replace(/[,%]/g, "").trim();

const normalizeDateFilter = (value?: string | null) => {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(/^(\d{1,2})[\\/](\d{1,2})[\\/](\d{4})$/);
  if (!match) return "";
  const day = match[1].padStart(2, "0");
  const month = match[2].padStart(2, "0");
  return `${match[3]}-${month}-${day}`;
};

const parseColumnFilters = (
  params: Record<string, string | string[] | undefined>
): ColumnFilters => {
  const filters: ColumnFilters = {};
  COLUMN_FILTER_KEYS.forEach((key) => {
    const raw = getParam(params[`${COLUMN_FILTER_PREFIX}${key}`]);
    const value = sanitizeSearch(raw);
    if (value) filters[key] = value;
  });
  return filters;
};

const normalizeColumnFilters = (filters?: ColumnFilters): ColumnFilters => {
  if (!filters) return {};
  const normalized: ColumnFilters = {};
  COLUMN_FILTER_KEYS.forEach((key) => {
    const raw = filters[key];
    if (!raw) return;
    const value = sanitizeSearch(raw);
    if (value) normalized[key] = value;
  });
  return normalized;
};

export const parseListParams = (
  params: Record<string, string | string[] | undefined>
): YatrisListParams => {
  const q = sanitizeSearch(getParam(params.q));
  const travel_mode = getParam(params.travel_mode);
  const date_from = getParam(params.date_from);
  const date_to = getParam(params.date_to);
  const missing = getParam(params.missing);
  const sortRaw = getParam(params.sort);
  const dirRaw = getParam(params.dir);
  const sort = SORT_VALUES.has(sortRaw) ? (sortRaw as YatrisListParams["sort"]) : "created_at";
  const dir = dirRaw === "asc" ? "asc" : "desc";
  const page = Math.max(1, Number.parseInt(getParam(params.page) || "1", 10) || 1);
  const pageSizeRaw = Number.parseInt(getParam(params.pageSize) || "25", 10);
  const pageSize = PAGE_SIZE_OPTIONS.includes(pageSizeRaw as (typeof PAGE_SIZE_OPTIONS)[number])
    ? pageSizeRaw
    : 25;
  const columnFilters = parseColumnFilters(params);

  return {
    q,
    travel_mode,
    date_from,
    date_to,
    missing: MISSING_VALUES.has(missing) ? missing : "",
    sort,
    dir,
    columnFilters,
    page,
    pageSize,
  };
};

export const normalizeFilters = (filters: Partial<YatrisFilters>): YatrisFilters => {
  const q = sanitizeSearch(filters.q ?? "");
  const travel_mode = filters.travel_mode ?? "";
  const date_from = filters.date_from ?? "";
  const date_to = filters.date_to ?? "";
  const missing = filters.missing && MISSING_VALUES.has(filters.missing) ? filters.missing : "";
  const sort = SORT_VALUES.has(filters.sort ?? "")
    ? (filters.sort as YatrisFilters["sort"])
    : "created_at";
  const dir = filters.dir === "asc" ? "asc" : "desc";
  const columnFilters = normalizeColumnFilters(filters.columnFilters);

  return {
    q,
    travel_mode,
    date_from,
    date_to,
    missing,
    sort,
    dir,
    columnFilters,
  };
};

export const applyYatrisFilters = (query: any, filters: YatrisFilters) => {
  let next = query;

  if (filters.travel_mode) {
    next = next.eq("travel_mode", filters.travel_mode);
  }

  if (filters.q) {
    const likeValue = `%${filters.q}%`;
    next = next.or(
      `name_hi.ilike.${likeValue},phone.ilike.${likeValue},receipt_no.ilike.${likeValue}`
    );
  }

  if (filters.date_from) {
    next = next.gte("created_at", `${filters.date_from}T00:00:00`);
  }

  if (filters.date_to) {
    next = next.lte("created_at", `${filters.date_to}T23:59:59`);
  }

  if (filters.missing === "photo") {
    next = next.is("photo_url", null);
  }

  if (filters.missing === "form") {
    next = next.is("form_image_url", null);
  }

  if (filters.missing === "any") {
    next = next.or("photo_url.is.null,form_image_url.is.null");
  }

  const columnFilters = filters.columnFilters ?? {};
  const applyIlike = (field: string, value?: string) => {
    if (!value) return;
    next = next.ilike(field, `%${value}%`);
  };
  const applyDateRange = (field: string, value?: string) => {
    const normalized = normalizeDateFilter(value);
    if (!normalized) return;
    next = next.gte(field, `${normalized}T00:00:00`).lte(field, `${normalized}T23:59:59`);
  };

  applyDateRange("created_at", columnFilters.created_at);
  applyDateRange("updated_at", columnFilters.updated_at);

  const dobValue = normalizeDateFilter(columnFilters.dob);
  if (dobValue) {
    next = next.eq("dob", dobValue);
  }

  if (columnFilters.age_years) {
    const ageValue = Number.parseInt(columnFilters.age_years, 10);
    if (!Number.isNaN(ageValue)) {
      next = next.eq("age_years", ageValue);
    }
  }

  applyIlike("name_hi", columnFilters.name_hi);
  applyIlike("phone", columnFilters.phone);
  applyIlike("receipt_no", columnFilters.receipt_no);
  applyIlike("aadhaar_no", columnFilters.aadhaar_no);
  applyIlike("reservation_by", columnFilters.reservation_by);

  if (columnFilters.travel) {
    const likeValue = `%${columnFilters.travel}%`;
    next = next.or(`travel_mode.ilike.${likeValue},train_class.ilike.${likeValue}`);
  }

  if (columnFilters.emergency_contact) {
    const likeValue = `%${columnFilters.emergency_contact}%`;
    next = next.or(
      `emergency_contact_name.ilike.${likeValue},emergency_contact_phone.ilike.${likeValue}`
    );
  }

  if (columnFilters.category) {
    const likeValue = `%${columnFilters.category}%`;
    next = next.or(`category.name.ilike.${likeValue}`);
  }

  if (columnFilters.uploads) {
    const normalized = columnFilters.uploads.toLowerCase();
    const isMissing = ["missing", "no", "none", "add"].some((token) => normalized.includes(token));
    const isPresent = ["yes", "has", "present", "photo"].some((token) => normalized.includes(token));
    if (isMissing) {
      next = next.is("photo_url", null);
    } else if (isPresent) {
      next = next.not("photo_url", "is", null);
    }
  }

  if (columnFilters.health_flags) {
    const tokens = columnFilters.health_flags.toLowerCase().split(/[\s,]+/).filter(Boolean);
    const wantsHeart = tokens.some((token) => token.includes("heart"));
    const wantsBp = tokens.some((token) => token === "bp" || token.includes("blood"));
    const wantsDiabetes = tokens.some((token) => token.includes("diabetes"));
    const wantsAsthma = tokens.some((token) => token.includes("asthma"));
    if (wantsHeart) next = next.eq("health_heart", true);
    if (wantsBp) next = next.eq("health_bp", true);
    if (wantsDiabetes) next = next.eq("health_diabetes", true);
    if (wantsAsthma) next = next.eq("health_asthma", true);
  }

  return next;
};

export const applyYatrisSort = (query: any, sort: YatrisFilters["sort"], dir: YatrisFilters["dir"]) => {
  const sortField = sort === "name" ? "name_hi" : sort;
  return query.order(sortField, { ascending: dir === "asc" });
};

export const buildYatrisQuery = (
  supabase: SupabaseClient,
  filters: YatrisFilters,
  withCount = false
) => {
  let query = supabase
    .from("yatra_registrations")
    .select(SELECT_COLUMNS, withCount ? { count: "exact" } : undefined);

  query = applyYatrisFilters(query, filters);
  query = applyYatrisSort(query, filters.sort, filters.dir);

  return query;
};

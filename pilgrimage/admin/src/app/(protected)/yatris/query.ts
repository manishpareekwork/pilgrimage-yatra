import type { SupabaseClient } from "@supabase/supabase-js";

export type YatriRow = {
  id: string;
  created_at: string | null;
  updated_at?: string | null;
  name_hi: string | null;
  phone: string | null;
  status: string | null;
  travel_mode: string | null;
  train_class: string | null;
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

export type YatrisListParams = {
  q: string;
  status: string[];
  travel_mode: string;
  date_from: string;
  date_to: string;
  missing: string;
  sort: "created_at" | "name" | "status";
  dir: "asc" | "desc";
  page: number;
  pageSize: number;
};

export type YatrisFilters = Omit<YatrisListParams, "page" | "pageSize">;

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

const STATUS_VALUES = new Set(["submitted", "needs_review", "approved", "rejected"]);
const SORT_VALUES = new Set(["created_at", "name", "status"]);
const MISSING_VALUES = new Set(["photo", "form", "any"]);

export const SELECT_COLUMNS =
  "id,created_at,name_hi,phone,status,travel_mode,train_class,photo_url,form_image_url,receipt_no,aadhaar_no,age_years,dob,reservation_by,emergency_contact_name,emergency_contact_phone,health_heart,health_bp,health_diabetes,health_asthma";

const getParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] ?? "" : value ?? "";

const sanitizeSearch = (value: string) => value.replace(/[,%]/g, "").trim();

export const parseListParams = (
  params: Record<string, string | string[] | undefined>
): YatrisListParams => {
  const q = sanitizeSearch(getParam(params.q));
  const rawStatus = getParam(params.status);
  const status = rawStatus
    ? rawStatus
        .split(",")
        .map((value) => value.trim())
        .filter((value) => STATUS_VALUES.has(value))
    : [];
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

  return {
    q,
    status,
    travel_mode,
    date_from,
    date_to,
    missing: MISSING_VALUES.has(missing) ? missing : "",
    sort,
    dir,
    page,
    pageSize,
  };
};

export const normalizeFilters = (filters: Partial<YatrisFilters>): YatrisFilters => {
  const q = sanitizeSearch(filters.q ?? "");
  const status = (filters.status ?? []).filter((value) => STATUS_VALUES.has(value));
  const travel_mode = filters.travel_mode ?? "";
  const date_from = filters.date_from ?? "";
  const date_to = filters.date_to ?? "";
  const missing = filters.missing && MISSING_VALUES.has(filters.missing) ? filters.missing : "";
  const sort = SORT_VALUES.has(filters.sort ?? "")
    ? (filters.sort as YatrisFilters["sort"])
    : "created_at";
  const dir = filters.dir === "asc" ? "asc" : "desc";

  return {
    q,
    status,
    travel_mode,
    date_from,
    date_to,
    missing,
    sort,
    dir,
  };
};

export const applyYatrisFilters = (query: any, filters: YatrisFilters) => {
  let next = query;

  if (filters.status.length > 0) {
    next = next.in("status", filters.status);
  }

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

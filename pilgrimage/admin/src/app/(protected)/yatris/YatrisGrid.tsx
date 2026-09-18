"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ChakraSpinner, PageHeader, Select, TextInput } from "@/components/ui";
import { Modal } from "@/components/Modal";
import { useGlobalLoading } from "@/components/GlobalLoading";
import { getBrowserSupabase } from "@/lib/supabaseBrowser";
import type { ExportPayload, ExportResult } from "./actions";
import { YatriBulkReservationPanel } from "./YatriBulkReservationPanel";
import {
  COLUMN_FILTER_KEYS,
  COLUMN_FILTER_PREFIX,
  type ColumnFilterKey,
  type ColumnFilters,
  type YatriRow,
  type YatrisFilters,
  type YatrisListParams,
} from "./query";

const COLUMN_STORAGE_KEY = "yatris_grid_columns_v1";
const VIEW_STORAGE_KEY = "yatris_grid_views_v1";

type ColumnDef = {
  id: string;
  label: string;
  sortable?: boolean;
  exportable?: boolean;
  cell: (row: YatriRow) => React.ReactNode;
  exportValue?: (row: YatriRow, opts: { includeFullAadhaar: boolean }) => string;
};

type ColumnConfig = {
  order: string[];
  hidden: string[];
};

type SavedView = {
  name: string;
  params: Partial<YatrisFilters>;
  columns?: ColumnConfig;
};

type ExportFormat = "csv" | "excel" | "pdf";

type YatrisGridProps = {
  rows: YatriRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  filters: YatrisListParams;
  currentRole: string;
  error?: string | null;
  exportAction: (payload: ExportPayload) => Promise<ExportResult>;
};

const DEFAULT_COLUMNS: ColumnConfig = {
  order: [
    "created_at",
    "name_hi",
    "phone",
    "category",
    "travel",
    "uploads",
    "actions",
    "receipt_no",
    "aadhaar_no",
    "age_years",
    "dob",
    "reservation_by",
    "emergency_contact",
    "health_flags",
    "updated_at",
  ],
  hidden: [
    "receipt_no",
    "aadhaar_no",
    "age_years",
    "dob",
    "reservation_by",
    "emergency_contact",
    "health_flags",
    "updated_at",
  ],
};

const DEFAULT_VIEWS: SavedView[] = [
  { name: "Default", params: {} },
  {
    name: "Committee train (CM257)",
    params: {
      travel_mode: "train",
      columnFilters: { reservation_by: "committee" },
    },
  },
  { name: "Missing Uploads", params: { missing: "any" } },
];

const areColumnFiltersEqual = (a: ColumnFilters = {}, b: ColumnFilters = {}) => {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) => a[key as keyof ColumnFilters] === b[key as keyof ColumnFilters]);
};

const FILTERABLE_COLUMNS = new Set<string>(["travel", "age_years", "category"]);

const SortIcon = ({ direction }: { direction: "asc" | "desc" }) => (
  <svg
    viewBox="0 0 12 12"
    className="h-3 w-3"
    aria-hidden="true"
    focusable="false"
  >
    <path
      d={direction === "asc" ? "M3.5 7.5L6 5l2.5 2.5" : "M3.5 4.5L6 7l2.5-2.5"}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.6"
    />
  </svg>
);

const FilterIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 12 12"
    className={className ?? "h-3 w-3"}
    aria-hidden="true"
    focusable="false"
  >
    <path
      d="M2 3h8L7 7v3L5 11V7L2 3z"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.4"
    />
  </svg>
);

const formatDateTime = (value?: string | null) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString("en-GB");
};

const formatDate = (value?: string | null) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleDateString("en-GB");
};

const formatCount = (value: number) => value.toLocaleString("en-IN");

const maskAadhaar = (value: string | null, includeFull: boolean) => {
  if (!value) return "--";
  const digits = value.replace(/\D/g, "");
  if (includeFull || digits.length <= 4) return value;
  return `**** **** ${digits.slice(-4)}`;
};

const healthSummary = (row: YatriRow) => {
  const values = [
    row.health_heart ? "Heart" : null,
    row.health_bp ? "BP" : null,
    row.health_diabetes ? "Diabetes" : null,
    row.health_asthma ? "Asthma" : null,
  ].filter(Boolean);
  return values.length ? values.join(", ") : "--";
};

const toDateInput = (value: string) => value || "";

const buildSearchParams = (params: YatrisListParams) => {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.travel_mode) search.set("travel_mode", params.travel_mode);
  if (params.date_from) search.set("date_from", params.date_from);
  if (params.date_to) search.set("date_to", params.date_to);
  if (params.missing) search.set("missing", params.missing);
  if (params.sort) search.set("sort", params.sort);
  if (params.dir) search.set("dir", params.dir);
  COLUMN_FILTER_KEYS.forEach((key) => {
    const value = params.columnFilters?.[key];
    if (value) search.set(`${COLUMN_FILTER_PREFIX}${key}`, value);
  });
  search.set("page", String(params.page));
  search.set("pageSize", String(params.pageSize));
  return search.toString();
};

const mergeColumnConfig = (config: ColumnConfig | null) => {
  if (!config) return DEFAULT_COLUMNS;
  const order = config.order.filter((id) => DEFAULT_COLUMNS.order.includes(id));
  const missing = DEFAULT_COLUMNS.order.filter((id) => !order.includes(id));
  const hidden = config.hidden.filter((id) => DEFAULT_COLUMNS.order.includes(id));
  return {
    order: [...order, ...missing],
    hidden,
  };
};

const csvEscape = (value: string) => {
  if (value.includes(",") || value.includes("\n") || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const escapePdfText = (value: string) =>
  value
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/[\r\n]+/g, " ");

const downloadBlob = (blob: Blob, filename: string) => {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
};

const buildPdf = (headers: string[], rows: string[][]) => {
  const pageWidth = 792;
  const pageHeight = 612;
  const margin = 36;
  const fontSize = 8;
  const lineHeight = 11;
  const minWidth = 4;
  const maxWidth = 18;
  const separator = " | ";
  const separatorWidth = separator.length;
  const encoder = new TextEncoder();

  const charWidth = fontSize * 0.6;
  const maxCharsPerLine = Math.max(
    60,
    Math.floor((pageWidth - margin * 2) / charWidth)
  );

  const maxLengths = headers.map((header) => header.length);
  rows.slice(0, 50).forEach((row) => {
    row.forEach((cell, index) => {
      maxLengths[index] = Math.max(maxLengths[index] ?? 0, cell.length);
    });
  });

  const widths = maxLengths.map((length) =>
    Math.min(maxWidth, Math.max(minWidth, length))
  );

  const totalWidth = () =>
    widths.reduce((sum, width) => sum + width, 0) +
    separatorWidth * Math.max(0, headers.length - 1);

  let currentWidth = totalWidth();
  while (currentWidth > maxCharsPerLine) {
    let adjusted = false;
    for (let index = 0; index < widths.length; index += 1) {
      if (currentWidth <= maxCharsPerLine) break;
      if (widths[index] > minWidth) {
        widths[index] -= 1;
        currentWidth -= 1;
        adjusted = true;
      }
    }
    if (!adjusted) break;
  }

  const pad = (value: string, width: number) => {
    const trimmed = value.length > width ? value.slice(0, width) : value;
    return trimmed.padEnd(width, " ");
  };

  const splitCell = (value: string, width: number) => {
    if (!value) return [""];
    const segments: string[] = [];
    for (let index = 0; index < value.length; index += width) {
      segments.push(value.slice(index, index + width));
    }
    return segments.length ? segments : [""];
  };

  const headerLine = headers
    .map((header, index) => pad(header, widths[index]))
    .join(separator);
  const dividerLine = widths.map((width) => "-".repeat(width)).join("-+-");

  const bodyLines = rows.flatMap((row) => {
    const cells = row.map((cell, index) => splitCell(cell, widths[index]));
    const lineCount = Math.max(...cells.map((lines) => lines.length), 1);
    const lines: string[] = [];
    for (let lineIndex = 0; lineIndex < lineCount; lineIndex += 1) {
      const line = cells
        .map((lines, index) => pad(lines[lineIndex] ?? "", widths[index]))
        .join(separator);
      lines.push(line);
    }
    return lines;
  });

  const maxLines = Math.max(1, Math.floor((pageHeight - margin * 2) / lineHeight));
  const headerLines = [headerLine, dividerLine];
  const linesPerPage = Math.max(1, maxLines - headerLines.length);
  const pages: string[][] = [];

  if (bodyLines.length === 0) {
    pages.push([...headerLines, "No data"]);
  } else {
    for (let index = 0; index < bodyLines.length; index += linesPerPage) {
      pages.push([...headerLines, ...bodyLines.slice(index, index + linesPerPage)]);
    }
  }

  const pageContents = pages.map((lines) => {
    const contentLines = [
      "BT",
      `/F1 ${fontSize} Tf`,
      `${margin} ${pageHeight - margin} Td`,
    ];
    lines.forEach((line, idx) => {
      contentLines.push(`(${escapePdfText(line)}) Tj`);
      if (idx < lines.length - 1) contentLines.push(`0 -${lineHeight} Td`);
    });
    contentLines.push("ET");
    const content = contentLines.join("\n");
    const length = encoder.encode(content).length;
    return `<< /Length ${length} >>\nstream\n${content}\nendstream`;
  });

  const kids = pageContents.map((_, index) => `${4 + index * 2} 0 R`).join(" ");

  const objects: string[] = [];
  objects.push(`<< /Type /Catalog /Pages 2 0 R >>`);
  objects.push(`<< /Type /Pages /Kids [${kids}] /Count ${pageContents.length} >>`);
  objects.push(`<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>`);

  pageContents.forEach((content, index) => {
    const pageObjNum = 4 + index * 2;
    const contentObjNum = pageObjNum + 1;
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjNum} 0 R >>`
    );
    objects.push(content);
  });

  let pdf = "%PDF-1.3\n";
  const offsets: number[] = [];

  objects.forEach((obj, index) => {
    offsets.push(encoder.encode(pdf).length);
    pdf += `${index + 1} 0 obj\n${obj}\nendobj\n`;
  });

  const xrefStart = encoder.encode(pdf).length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  offsets.forEach((offset) => {
    pdf += `${offset.toString().padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return new Blob([pdf], { type: "application/pdf" });
};

export function YatrisGrid({
  rows,
  totalCount,
  page,
  pageSize,
  filters,
  currentRole,
  error,
  exportAction,
}: YatrisGridProps) {
  const router = useRouter();
  const supabase = useMemo(() => getBrowserSupabase(), []);
  const { startLoading, startNavigation } = useGlobalLoading();
  const orchestratorUrl = process.env.NEXT_PUBLIC_ORCHESTRATOR_URL;
  const [isPending, startTransition] = useTransition();
  const [searchValue, setSearchValue] = useState(filters.q);
  const [localFilters, setLocalFilters] = useState<YatrisFilters>({
    ...filters,
    columnFilters: filters.columnFilters ?? {},
  });
  const [localPageSize, setLocalPageSize] = useState(pageSize);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [columnConfig, setColumnConfig] = useState<ColumnConfig>(DEFAULT_COLUMNS);
  const [views, setViews] = useState<SavedView[]>(DEFAULT_VIEWS);
  const [includeFullAadhaar, setIncludeFullAadhaar] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("csv");
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<Record<string, { path: string; url: string }>>({});
  const [categoryOptions, setCategoryOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [categoryMessage, setCategoryMessage] = useState<string | null>(null);
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [dragColumn, setDragColumn] = useState<string | null>(null);
  const [openRowMenuId, setOpenRowMenuId] = useState<string | null>(null);
  const [openModal, setOpenModal] = useState<"views" | "columns" | "export" | null>(null);

  const canDelete = currentRole === "admin";

  const closeModal = () => setOpenModal(null);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest?.("[data-row-menu]")) {
        setOpenRowMenuId(null);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  useEffect(() => {
    setSearchValue(filters.q);
    setLocalFilters({ ...filters, columnFilters: filters.columnFilters ?? {} });
    setLocalPageSize(pageSize);
  }, [filters, pageSize]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [rows]);

  useEffect(() => {
    if (!orchestratorUrl) return;
    let isActive = true;
    const rowsNeedingPreview = rows.filter((row) => {
      if (!row.photo_url) return false;
      if (row.photo_url.startsWith("http")) return false;
      if (!row.photo_url.startsWith("photos/")) return false;
      const cached = photoPreviewUrls[row.id];
      return !cached || cached.path !== row.photo_url;
    });
    if (!rowsNeedingPreview.length) return;

    const fetchPreviews = async () => {
      await Promise.all(
        rowsNeedingPreview.map(async (row) => {
          if (!row.photo_url) return;
          try {
            const signedUrl = await signUrl("download", "photos", row.photo_url);
            if (!isActive) return;
            setPhotoPreviewUrls((prev) => ({
              ...prev,
              [row.id]: { path: row.photo_url as string, url: signedUrl },
            }));
          } catch {
            // ignore preview failures
          }
        })
      );
    };
    void fetchPreviews();

    return () => {
      isActive = false;
    };
  }, [rows, orchestratorUrl, photoPreviewUrls]);

  useEffect(() => {
    let isActive = true;
    const loadCategories = async () => {
      const { data, error } = await supabase
        .from("yatra_categories")
        .select("id, name")
        .order("name");
      if (!isActive) return;
      if (error) {
        setCategoryError(error.message);
        return;
      }
      setCategoryOptions(data ?? []);
    };
    void loadCategories();
    return () => {
      isActive = false;
    };
  }, [supabase]);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(COLUMN_STORAGE_KEY) : null;
    if (stored) {
      try {
        setColumnConfig(mergeColumnConfig(JSON.parse(stored)));
      } catch {
        setColumnConfig(DEFAULT_COLUMNS);
      }
    }
  }, []);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(VIEW_STORAGE_KEY) : null;
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as SavedView[];
        setViews([...DEFAULT_VIEWS, ...parsed]);
      } catch {
        setViews(DEFAULT_VIEWS);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(columnConfig));
  }, [columnConfig]);

  const updateParams = (next: Partial<YatrisListParams>) => {
    const merged = {
      ...filters,
      ...localFilters,
      ...next,
      page: next.page ?? 1,
      pageSize: next.pageSize ?? localPageSize,
    } as YatrisListParams;

    const queryString = buildSearchParams(merged);
    startTransition(() => {
      startNavigation("Loading yatri list...");
      router.replace(`/yatris?${queryString}`);
    });
  };

  useEffect(() => {
    if (searchValue === filters.q) return;
    const timer = setTimeout(() => {
      updateParams({ q: searchValue, page: 1 });
    }, 350);
    return () => clearTimeout(timer);
  }, [searchValue]);

  useEffect(() => {
    const nextFilters = localFilters.columnFilters ?? {};
    const currentFilters = filters.columnFilters ?? {};
    if (areColumnFiltersEqual(nextFilters, currentFilters)) return;
    const timer = setTimeout(() => {
      updateParams({ columnFilters: nextFilters, page: 1 });
    }, 350);
    return () => clearTimeout(timer);
  }, [localFilters.columnFilters, filters.columnFilters]);

  const renderRowActions = (row: YatriRow, align: "center" | "end" = "end") => {
    const isOpen = openRowMenuId === row.id;
    return (
      <div
        className={`relative flex w-full items-center ${align === "center" ? "justify-center" : "justify-end"}`}
        data-row-menu
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Row actions"
          aria-haspopup="menu"
          aria-expanded={isOpen}
          onClick={(event) => {
            event.stopPropagation();
            setOpenRowMenuId((prev) => (prev === row.id ? null : row.id));
          }}
          className="row-action-trigger inline-flex h-7 w-7 items-center justify-center rounded-md border border-[color:var(--border)] text-[color:var(--muted)] hover:border-[color:var(--accent)]"
        >
          <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" aria-hidden="true">
            <circle cx="10" cy="4" r="1.6" fill="currentColor" />
            <circle cx="10" cy="10" r="1.6" fill="currentColor" />
            <circle cx="10" cy="16" r="1.6" fill="currentColor" />
          </svg>
        </button>
        {isOpen && (
          <div
            role="menu"
            className="row-action-menu absolute right-0 top-full z-50 mt-2 w-44 rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-2 shadow-lg"
          >
            <div className="space-y-1">
              <Link
                href={`/yatris/${row.id}`}
                onClick={() => setOpenRowMenuId(null)}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[color:var(--ink)] hover:bg-[color:var(--surface-muted)]"
              >
                <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
                  <path
                    d="M1.5 10s3-5.5 8.5-5.5 8.5 5.5 8.5 5.5-3 5.5-8.5 5.5S1.5 10 1.5 10z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <circle cx="10" cy="10" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
                </svg>
                View
              </Link>
              <Link
                href={`/yatris/${row.id}`}
                onClick={() => setOpenRowMenuId(null)}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[color:var(--ink)] hover:bg-[color:var(--surface-muted)]"
              >
                <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
                  <path
                    d="M3 14.5V17h2.5l8-8-2.5-2.5-8 8z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M12.5 4.5l2.5 2.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                </svg>
                Edit
              </Link>
              <Link
                href={`/print/id-cards?ids=${row.id}`}
                target="_blank"
                onClick={() => setOpenRowMenuId(null)}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[color:var(--ink)] hover:bg-[color:var(--surface-muted)]"
              >
                <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
                  <rect
                    x="4"
                    y="3"
                    width="12"
                    height="6"
                    rx="1.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <rect
                    x="5"
                    y="11"
                    width="10"
                    height="6"
                    rx="1.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M6 7h8"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                </svg>
                Print ID Card
              </Link>
              {canDelete && (
                <button
                  type="button"
                  onClick={() => void handleDelete(row)}
                  disabled={deletingId === row.id}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-rose-300 hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
                    <path
                      d="M5 6h10M8 6V4h4v2m-5 0v10m6-10v10M4 6h12"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {deletingId === row.id ? "Deleting..." : "Delete"}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(row.id);
                  setOpenRowMenuId(null);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-[color:var(--muted)] hover:bg-[color:var(--surface-muted)]"
              >
                <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
                  <rect
                    x="6"
                    y="6"
                    width="9"
                    height="11"
                    rx="2"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <rect
                    x="4"
                    y="3"
                    width="9"
                    height="11"
                    rx="2"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                </svg>
                Copy ID
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const signUrl = async (action: "download", bucket: "photos", object: string) => {
    if (!orchestratorUrl) {
      throw new Error("Image previews are disabled. Configure NEXT_PUBLIC_ORCHESTRATOR_URL.");
    }
    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;
    if (!token) throw new Error("Not authenticated");
    const res = await fetch(`${orchestratorUrl}/sign-url`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        bucket,
        object,
        action,
        expiresIn: 600,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error?.message || "Failed to get signed URL");
    }
    const json = await res.json();
    return json.signedUrl as string;
  };

  const updateCategory = useCallback(async (row: YatriRow, categoryId: string) => {
    setCategoryMessage(null);
    const stopLoading = startLoading("Saving category...");
    try {
      const { error } = await supabase.rpc("fn_update_registration", {
        p_id: row.id,
        p_patch: { category_id: categoryId || null },
      });
      if (error) {
        setCategoryMessage(error.message);
        return;
      }
      router.refresh();
    } finally {
      stopLoading();
    }
  }, [router, supabase, startLoading]);

  const handleDelete = useCallback(async (row: YatriRow) => {
    if (!canDelete) return;
    const label = row.name_hi ? `"${row.name_hi}"` : "this registration";
    const confirmed = window.confirm(`Delete ${label}? This removes the registration and linked data.`);
    if (!confirmed) {
      setOpenRowMenuId(null);
      return;
    }
    setDeleteMessage(null);
    setDeletingId(row.id);
    const stopLoading = startLoading("Deleting registration...");
    try {
      const res = await fetch(`/api/admin/yatris/${row.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "Delete failed.");
      }
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(row.id);
        return next;
      });
      router.refresh();
    } catch (err) {
      setDeleteMessage(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      stopLoading();
      setDeletingId(null);
      setOpenRowMenuId(null);
    }
  }, [canDelete, router, startLoading]);

  const columns: Record<string, ColumnDef> = useMemo(() => {
    return {
      created_at: {
        id: "created_at",
        label: "Created",
        sortable: true,
        cell: (row) => <span className="text-[11px] text-[color:var(--muted)]">{formatDateTime(row.created_at)}</span>,
        exportValue: (row) => formatDateTime(row.created_at),
      },
      updated_at: {
        id: "updated_at",
        label: "Updated",
        sortable: false,
        cell: (row) => <span className="text-[11px] text-[color:var(--muted)]">{formatDateTime(row.updated_at)}</span>,
        exportValue: (row) => formatDateTime(row.updated_at),
      },
      name_hi: {
        id: "name_hi",
        label: "Name",
        sortable: true,
        cell: (row) => <span className="text-[12px] font-semibold text-[color:var(--ink)]">{row.name_hi || "--"}</span>,
        exportValue: (row) => row.name_hi ?? "",
      },
      phone: {
        id: "phone",
        label: "Phone",
        cell: (row) => <span className="text-[12px] text-[color:var(--ink)]">{row.phone || "--"}</span>,
        exportValue: (row) => row.phone ?? "",
      },
      category: {
        id: "category",
        label: "Bucket",
        cell: (row) => {
          if (!categoryOptions.length) {
            return (
              <span className="text-[11px] text-[color:var(--muted)]">
                {row.category?.name || "Unassigned"}
              </span>
            );
          }
          return (
            <select
              className="h-8 rounded-md border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-2 text-[11px] text-[color:var(--ink)]"
              value={row.category_id ?? ""}
              onChange={(event) => updateCategory(row, event.target.value)}
            >
              <option value="">Unassigned</option>
              {categoryOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          );
        },
        exportValue: (row) => row.category?.name ?? "",
      },
      travel: {
        id: "travel",
        label: "Travel",
        cell: (row) => (
          <div className="text-[11px] text-[color:var(--muted)] text-center leading-tight">
            <div className="font-medium text-[color:var(--ink)]">{row.travel_mode || "--"}</div>
            <div>{row.train_class || ""}</div>
          </div>
        ),
        exportValue: (row) => [row.travel_mode, row.train_class].filter(Boolean).join(" "),
      },
      uploads: {
        id: "uploads",
        label: "Image",
        cell: (row) => {
          const rawPhotoPath = row.photo_url ?? "";
          const cachedPreview = photoPreviewUrls[row.id];
          const signedUrl = cachedPreview?.path === rawPhotoPath ? cachedPreview.url : "";
          const directUrl = rawPhotoPath.startsWith("http") ? rawPhotoPath : "";
          const previewUrl = signedUrl || directUrl;
          const isLoadingPreview = Boolean(rawPhotoPath) && !previewUrl && Boolean(orchestratorUrl);
          return (
            <div className="yatri-image-cell">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt={row.name_hi ? `${row.name_hi} image` : "Yatri image"}
                  className="yatri-image-thumb"
                  loading="lazy"
                />
              ) : (
                <div className="yatri-image-thumb yatri-image-thumb--empty">
                  {isLoadingPreview && <ChakraSpinner className="h-4 w-4" title="Loading" />}
                </div>
              )}
            </div>
          );
        },
        exportValue: (row) => (row.photo_url ? "Yes" : "No"),
      },
      receipt_no: {
        id: "receipt_no",
        label: "Receipt",
        cell: (row) => <span className="text-[11px] text-[color:var(--muted)]">{row.receipt_no || "--"}</span>,
        exportValue: (row) => row.receipt_no ?? "",
      },
      aadhaar_no: {
        id: "aadhaar_no",
        label: "Aadhaar",
        cell: (row) => <span className="text-[11px] text-[color:var(--muted)]">{maskAadhaar(row.aadhaar_no, false)}</span>,
        exportValue: (row, opts) => maskAadhaar(row.aadhaar_no, opts.includeFullAadhaar),
      },
      age_years: {
        id: "age_years",
        label: "Age",
        cell: (row) => <span className="text-[11px] text-[color:var(--muted)]">{row.age_years ?? "--"}</span>,
        exportValue: (row) => (row.age_years ?? "").toString(),
      },
      dob: {
        id: "dob",
        label: "Dob",
        cell: (row) => <span className="text-[11px] text-[color:var(--muted)]">{formatDate(row.dob)}</span>,
        exportValue: (row) => formatDate(row.dob),
      },
      reservation_by: {
        id: "reservation_by",
        label: "Reservation",
        cell: (row) => <span className="text-[11px] text-[color:var(--muted)]">{row.reservation_by || "--"}</span>,
        exportValue: (row) => row.reservation_by ?? "",
      },
      emergency_contact: {
        id: "emergency_contact",
        label: "Emergency",
        cell: (row) => (
          <div className="text-[11px] text-[color:var(--muted)] text-center leading-tight">
            <div className="font-medium text-[color:var(--ink)]">{row.emergency_contact_name || "--"}</div>
            <div>{row.emergency_contact_phone || ""}</div>
          </div>
        ),
        exportValue: (row) =>
          [row.emergency_contact_name, row.emergency_contact_phone].filter(Boolean).join(" "),
      },
      health_flags: {
        id: "health_flags",
        label: "Health",
        cell: (row) => <span className="text-[11px] text-[color:var(--muted)]">{healthSummary(row)}</span>,
        exportValue: (row) => healthSummary(row),
      },
      actions: {
        id: "actions",
        label: "Actions",
        exportable: false,
        cell: (row) => renderRowActions(row, "center"),
      },
    };
  }, [
    renderRowActions,
    photoPreviewUrls,
    orchestratorUrl,
    categoryOptions,
    updateCategory,
  ]);

  const orderedColumns = useMemo(() => {
    const all = columnConfig.order.map((id) => columns[id]).filter(Boolean);
    const actionsColumn = all.find((column) => column.id === "actions");
    const withoutActions = all.filter((column) => column.id !== "actions");
    return actionsColumn ? [...withoutActions, actionsColumn] : withoutActions;
  }, [columnConfig.order, columns]);

  const visibleColumns = orderedColumns.filter(
    (column) => !columnConfig.hidden.includes(column.id)
  );

  const updateColumnFilter = (columnId: ColumnFilterKey, value: string) => {
    const trimmed = value.trim();
    setLocalFilters((prev) => {
      const nextColumnFilters = { ...(prev.columnFilters ?? {}) };
      if (trimmed) {
        nextColumnFilters[columnId] = trimmed;
      } else {
        delete nextColumnFilters[columnId];
      }
      return { ...prev, columnFilters: nextColumnFilters };
    });
  };

  const clearFilters = () => {
    setSearchValue("");
    setLocalFilters({
      ...localFilters,
      q: "",
      travel_mode: "",
      date_from: "",
      date_to: "",
      missing: "",
      sort: "created_at",
      dir: "desc",
      columnFilters: {},
    });
    updateParams({
      q: "",
      travel_mode: "",
      date_from: "",
      date_to: "",
      missing: "",
      sort: "created_at",
      dir: "desc",
      columnFilters: {},
      page: 1,
    });
  };

  const toggleColumn = (id: string) => {
    if (id === "actions") return;
    const hidden = columnConfig.hidden.includes(id)
      ? columnConfig.hidden.filter((item) => item !== id)
      : [...columnConfig.hidden, id];
    setColumnConfig({ ...columnConfig, hidden });
  };

  const handleReorder = (targetId: string) => {
    if (!dragColumn || dragColumn === targetId) return;
    const order = [...columnConfig.order];
    const fromIndex = order.indexOf(dragColumn);
    const toIndex = order.indexOf(targetId);
    if (fromIndex === -1 || toIndex === -1) return;
    order.splice(fromIndex, 1);
    order.splice(toIndex, 0, dragColumn);
    setColumnConfig({ ...columnConfig, order });
    setDragColumn(null);
  };

  const applyView = (view: SavedView) => {
    if (view.columns) {
      setColumnConfig(mergeColumnConfig(view.columns));
    }
    const mergedFilters: YatrisListParams = {
      ...filters,
      q: view.params.q ?? "",
      travel_mode: view.params.travel_mode ?? "",
      date_from: view.params.date_from ?? "",
      date_to: view.params.date_to ?? "",
      missing: view.params.missing ?? "",
      sort: view.params.sort ?? "created_at",
      dir: view.params.dir ?? "desc",
      columnFilters: view.params.columnFilters ?? {},
      page: 1,
      pageSize: localPageSize,
    };
    setSearchValue(mergedFilters.q);
    setLocalFilters({ ...mergedFilters });
    updateParams(mergedFilters);
  };

  const saveCurrentView = () => {
    const name = window.prompt("Save current view as");
    if (!name) return;
    const entry: SavedView = {
      name,
      params: {
        q: localFilters.q,
        travel_mode: localFilters.travel_mode,
        date_from: localFilters.date_from,
        date_to: localFilters.date_to,
        missing: localFilters.missing,
        sort: localFilters.sort,
        dir: localFilters.dir,
        columnFilters: localFilters.columnFilters ?? {},
      },
      columns: columnConfig,
    };
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(VIEW_STORAGE_KEY) : null;
    const existing = stored ? (JSON.parse(stored) as SavedView[]) : [];
    const updated = [...existing.filter((view) => view.name !== name), entry];
    window.localStorage.setItem(VIEW_STORAGE_KEY, JSON.stringify(updated));
    setViews([...DEFAULT_VIEWS, ...updated]);
  };

  const pageStats = useMemo(() => {
    const missingPhoto = rows.filter((row) => !row.photo_url).length;
    const missingForm = rows.filter((row) => !row.form_image_url).length;
    const missingAny = rows.filter((row) => !row.photo_url || !row.form_image_url).length;
    return { missingPhoto, missingForm, missingAny };
  }, [rows]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (localFilters.q) count += 1;
    if (localFilters.travel_mode) count += 1;
    if (localFilters.date_from) count += 1;
    if (localFilters.date_to) count += 1;
    if (localFilters.missing) count += 1;
    count += Object.keys(localFilters.columnFilters ?? {}).length;
    return count;
  }, [localFilters]);

  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
  const rangeStart = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(totalCount, page * pageSize);

  const allSelected = rows.length > 0 && rows.every((row) => selectedIds.has(row.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(rows.map((row) => row.id)));
  };

  const toggleRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const exportRows = (data: YatriRow[], format: ExportFormat) => {
    const exportColumns = orderedColumns.filter((column) => column.exportable !== false);
    const headers = exportColumns.map((column) => column.label);
    const rowsData = data.map((row) =>
      exportColumns.map((column) => {
        const raw = column.exportValue ? column.exportValue(row, { includeFullAadhaar }) : "";
        return String(raw ?? "");
      })
    );
    const fileBase = `yatris-${new Date().toISOString().slice(0, 10)}`;

    if (format === "excel") {
      const thead = `<thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead>`;
      const tbody = `<tbody>${rowsData
        .map(
          (row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`
        )
        .join("")}</tbody>`;
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8" /></head><body><table>${thead}${tbody}</table></body></html>`;
      const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
      downloadBlob(blob, `${fileBase}.xls`);
      return;
    }

    if (format === "pdf") {
      const blob = buildPdf(headers, rowsData);
      downloadBlob(blob, `${fileBase}.pdf`);
      return;
    }

    const lines = rowsData.map((row) => row.map((cell) => csvEscape(cell)).join(","));
    const csv = [headers.map(csvEscape).join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    downloadBlob(blob, `${fileBase}.csv`);
  };

  const exportSelected = () => {
    const selectedRows = rows.filter((row) => selectedIds.has(row.id));
    if (!selectedRows.length) return;
    exportRows(selectedRows, exportFormat);
  };

  const printSelected = () => {
    if (!selectedIds.size) return;
    const ids = Array.from(selectedIds).join(",");
    window.open(`/print/id-cards?ids=${ids}`, "_blank", "noopener");
  };

  const openCm257ForSelected = (autoPdf = false) => {
    if (!selectedIds.size) return;
    const selectedRows = rows.filter((row) => selectedIds.has(row.id));
    const eligible = selectedRows.filter(
      (row) => row.travel_mode === "train" && row.reservation_by === "committee"
    );
    if (eligible.length === 0) {
      window.alert(
        "None of the selected yatris are eligible. CM257 batch needs travel mode train and reservation by committee."
      );
      return;
    }
    const skipped = selectedRows.length - eligible.length;
    if (skipped > 0) {
      const ok = window.confirm(
        `${skipped} selected yatri(s) will be skipped (not train + committee). Continue with ${eligible.length}?`
      );
      if (!ok) return;
    }
    const ids = eligible.map((row) => row.id).join(",");
    const auto = autoPdf ? "&auto=1" : "";
    window.open(`/bookings/railway-reservation?ids=${ids}${auto}`, "_blank", "noopener,noreferrer");
  };

  const exportFiltered = async () => {
    setExportMessage(null);
    setExporting(true);
    const stopLoading = startLoading("Preparing export...");
    try {
      const result = await exportAction({
        filters: {
          q: localFilters.q,
          travel_mode: localFilters.travel_mode,
          date_from: localFilters.date_from,
          date_to: localFilters.date_to,
          missing: localFilters.missing,
          sort: localFilters.sort,
          dir: localFilters.dir,
          columnFilters: localFilters.columnFilters ?? {},
        },
      });
      if (result.rows.length === 0) {
        setExportMessage("No rows available for export.");
        return;
      }
      if (result.overLimit) {
        setExportMessage("Export capped at 2000 rows. Narrow filters to export more.");
      }
      exportRows(result.rows, exportFormat);
    } finally {
      setExporting(false);
      stopLoading();
    }
  };

  const recentView: SavedView = useMemo(() => {
    const from = new Date();
    from.setDate(from.getDate() - 7);
    return {
      name: "Recent (7 days)",
      params: { date_from: from.toISOString().slice(0, 10) },
    };
  }, []);

  const allViews = useMemo(() => {
    const withoutRecent = views.filter((view) => view.name !== "Recent (7 days)");
    return [...withoutRecent, recentView];
  }, [views, recentView]);

  return (
    <div className="yatris-grid yatris-list page-stack flex flex-col">
      <PageHeader
        className="relative z-30 overflow-visible yatris-hero"
        title="Yatris"
        subtitle="Review registrations, uploads, and travel details in one view."
        kicker="Pilgrimage Ops"
        backgroundImage="/banner.png"
        actions={
          <div className="header-actions flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setOpenModal("views")}
              className="btn-secondary inline-flex min-h-[32px] items-center"
            >
              Views
            </button>

            <button
              type="button"
              onClick={() => setOpenModal("columns")}
              className="btn-secondary inline-flex min-h-[32px] items-center"
            >
              Columns
            </button>

            <Link href="/yatris/new" className="btn-primary inline-flex min-h-[32px] items-center">
              + New Registration
            </Link>
          </div>
        }
      />

      <div className="yatris-summary-grid">
        <div className="yatris-summary-card">
          <div className="summary-label">Total registrations</div>
          <div className="summary-value">{formatCount(totalCount)}</div>
          <div className="summary-sub">
            Showing {formatCount(rangeStart)}-{formatCount(rangeEnd)}
          </div>
        </div>
        <div className="yatris-summary-card">
          <div className="summary-label">Uploads missing (page)</div>
          <div className="summary-value">{formatCount(pageStats.missingAny)}</div>
          <div className="summary-sub">
            Image {formatCount(pageStats.missingPhoto)} | Form {formatCount(pageStats.missingForm)}
          </div>
        </div>
        <div className="yatris-summary-card">
          <div className="summary-label">Active filters</div>
          <div className="summary-value">{formatCount(activeFiltersCount)}</div>
          <div className="summary-sub">
            {activeFiltersCount ? "Tap chips to clear" : "No filters applied"}
          </div>
        </div>
      </div>

      {selectedIds.size > 0 && (
        <YatriBulkReservationPanel
          selectedIds={Array.from(selectedIds)}
          onClearSelection={() => setSelectedIds(new Set())}
          onDone={() => router.refresh()}
        />
      )}

      <div className="card relative z-20 p-6 sm:p-8 space-y-5 overflow-visible filters-compact yatris-filters">
        <div className="filters-header">
          <div className="filters-title">
            <div className="filters-kicker">Filters</div>
            <div className="filters-meta">
              <span>
                {isPending
                  ? "Updating..."
                  : `Showing ${formatCount(rangeStart)}-${formatCount(rangeEnd)} of ${formatCount(totalCount)}`}
              </span>
              {selectedIds.size > 0 && <span>{`${formatCount(selectedIds.size)} selected`}</span>}
            </div>
          </div>
          <div className="filters-actions">
            <button type="button" className="btn-secondary min-h-[36px] w-full sm:w-auto" onClick={clearFilters}>
              Clear filters
            </button>
            <div className="w-[140px]">
              <Select
                value={exportFormat}
                onChange={(event) => setExportFormat(event.target.value as ExportFormat)}
                className="export-format-select text-[11px]"
                aria-label="Export format"
              >
                <option value="csv">CSV</option>
                <option value="excel">Excel</option>
                <option value="pdf">PDF</option>
              </Select>
            </div>
            <button
              type="button"
              onClick={() => setOpenModal("export")}
              className="btn-secondary inline-flex min-h-[36px] w-full sm:w-auto items-center justify-center"
            >
              Export
            </button>
            {selectedIds.size > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="btn-secondary min-h-[36px] w-full sm:w-auto"
                  onClick={exportSelected}
                >
                  Export selected
                </button>
                <button
                  type="button"
                  className="btn-secondary min-h-[36px] w-full sm:w-auto"
                  onClick={printSelected}
                >
                  Print ID Cards
                </button>
                <button
                  type="button"
                  className="btn-secondary min-h-[36px] w-full sm:w-auto"
                  onClick={() => openCm257ForSelected(false)}
                >
                  CM257 forms
                </button>
                <Link
                  href="/bookings/committee-train"
                  className="btn-secondary inline-flex min-h-[36px] w-full sm:w-auto items-center justify-center"
                >
                  Train workflow
                </Link>
                <button
                  type="button"
                  className="btn-primary min-h-[36px] w-full sm:w-auto"
                  onClick={() => openCm257ForSelected(true)}
                >
                  CM257 PDF
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="filters-grid">
          <div className="filters-field filters-field--search">
            <TextInput
              placeholder="Search name, phone, receipt"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
            />
          </div>
          <div className="filters-field">
            <Select
              value={localFilters.travel_mode}
              onChange={(event) => {
                const value = event.target.value;
                setLocalFilters({ ...localFilters, travel_mode: value });
                updateParams({ travel_mode: value, page: 1 });
              }}
            >
              <option value="">All travel</option>
              <option value="train">Train</option>
              <option value="air">Air</option>
            </Select>
          </div>
          <div className="filters-field">
            <Select
              value={localFilters.missing}
              onChange={(event) => {
                const value = event.target.value;
                setLocalFilters({ ...localFilters, missing: value });
                updateParams({ missing: value, page: 1 });
              }}
            >
                <option value="">All uploads</option>
                <option value="photo">Missing image</option>
                <option value="form">Missing form</option>
                <option value="any">Missing any</option>
              </Select>
          </div>
          <div className="filters-field filters-field--dates">
            <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
              <TextInput
                type="date"
                value={toDateInput(localFilters.date_from)}
                onChange={(event) => {
                  const value = event.target.value;
                  setLocalFilters({ ...localFilters, date_from: value });
                  updateParams({ date_from: value, page: 1 });
                }}
                className="filters-date-input"
              />
              <span className="text-xs text-[color:var(--muted)]">to</span>
              <TextInput
                type="date"
                value={toDateInput(localFilters.date_to)}
                onChange={(event) => {
                  const value = event.target.value;
                  setLocalFilters({ ...localFilters, date_to: value });
                  updateParams({ date_to: value, page: 1 });
                }}
                className="filters-date-input"
              />
            </div>
          </div>
        </div>

        <div className="filters-chips">
          {localFilters.q && (
            <button
              type="button"
              className="filter-chip"
              onClick={() => {
                setSearchValue("");
                setLocalFilters({ ...localFilters, q: "" });
                updateParams({ q: "", page: 1 });
              }}
            >
              Search: {localFilters.q} x
            </button>
          )}
          {localFilters.travel_mode && (
            <button
              type="button"
              className="filter-chip"
              onClick={() => {
                setLocalFilters({ ...localFilters, travel_mode: "" });
                updateParams({ travel_mode: "", page: 1 });
              }}
            >
              Travel: {localFilters.travel_mode} x
            </button>
          )}
          {localFilters.date_from && (
            <button
              type="button"
              className="filter-chip"
              onClick={() => {
                setLocalFilters({ ...localFilters, date_from: "" });
                updateParams({ date_from: "", page: 1 });
              }}
            >
              From: {localFilters.date_from} x
            </button>
          )}
          {localFilters.date_to && (
            <button
              type="button"
              className="filter-chip"
              onClick={() => {
                setLocalFilters({ ...localFilters, date_to: "" });
                updateParams({ date_to: "", page: 1 });
              }}
            >
              To: {localFilters.date_to} x
            </button>
          )}
          {localFilters.missing && (
            <button
              type="button"
              className="filter-chip"
              onClick={() => {
                setLocalFilters({ ...localFilters, missing: "" });
                updateParams({ missing: "", page: 1 });
              }}
            >
              Missing: {localFilters.missing} x
            </button>
          )}
        </div>
      </div>

      {exportMessage && (
        <div className="card px-4 py-3 text-sm text-amber-200 border border-amber-500/40 bg-amber-950/30">
          {exportMessage}
        </div>
      )}

      {categoryMessage && (
        <div className="card px-4 py-3 text-sm text-rose-200 border border-rose-500/40 bg-rose-950/30">
          {categoryMessage}
        </div>
      )}

      {deleteMessage && (
        <div className="card px-4 py-3 text-sm text-rose-200 border border-rose-500/40 bg-rose-950/30">
          {deleteMessage}
        </div>
      )}

      {categoryError && (
        <div className="card px-4 py-3 text-sm text-rose-200 border border-rose-500/40 bg-rose-950/30">
          Bucket load failed: {categoryError}
        </div>
      )}

      {error && (
        <div className="card p-6 text-sm text-rose-200 border border-rose-500/40 bg-rose-950/30">
          Failed to load registrations: {error}
        </div>
      )}

      {!error && rows.length === 0 && (
        <div className="card p-6 text-center">
          <div className="text-lg font-semibold text-[color:var(--ink)]">No registrations found</div>
          <p className="mt-2 text-sm text-[color:var(--muted)]">Try adjusting filters or create a new registration.</p>
          <div className="mt-4 flex justify-center">
            <Link href="/yatris/new" className="btn-primary">
              + New Registration
            </Link>
          </div>
        </div>
      )}

      {!error && rows.length > 0 && (
        <div className="space-y-4 p-2">
          <div className="card yatris-table overflow-visible">
            <div className="yatris-table__scroll hidden overflow-x-auto overflow-y-visible p-2 md:block">
              <table className="yatris-table__table min-w-full bg-[color:var(--surface)] text-[12px] text-center">
                <thead className="yatris-table__head sticky top-0 bg-[color:var(--surface-muted)] text-[11px] font-semibold text-[color:var(--muted)] border-b border-[color:var(--border)]">
                  <tr className="text-center">
                    <th className="h-[45px] px-6 py-0 align-middle text-center">
                      <input type="checkbox" checked={allSelected} onChange={toggleAll} />
                    </th>
                    {visibleColumns.map((column) => {
                      const sortKey = column.id === "name_hi" ? "name" : column.id;
                      const isSorted = column.sortable && filters.sort === sortKey;
                      const sortDirection = filters.dir === "asc" ? "asc" : "desc";
                      const isFilterable = FILTERABLE_COLUMNS.has(column.id);
                      const showDivider = isSorted && isFilterable;
                      const headerContent = (
                        <span className="inline-flex items-center justify-center gap-1.5">
                          <span>{column.label}</span>
                          {isSorted && (
                            <span className="text-[color:var(--ink)]">
                              <SortIcon direction={sortDirection} />
                            </span>
                          )}
                          {showDivider && <span className="h-3 w-px bg-[color:var(--border)]" aria-hidden="true" />}
                          {isFilterable && (
                            <span className="text-[color:var(--muted)] opacity-70" aria-hidden="true">
                              <FilterIcon className="h-3 w-3" />
                            </span>
                          )}
                        </span>
                      );

                      return (
                        <th
                          key={column.id}
                          className="h-[45px] px-4 py-0 align-middle text-center border-l border-[color:var(--border)]/60"
                        >
                          {column.sortable ? (
                            <button
                              type="button"
                              className="inline-flex w-full items-center justify-center gap-1 text-center"
                              onClick={() => {
                                const nextDir =
                                  filters.sort === sortKey && filters.dir === "asc" ? "desc" : "asc";
                                setLocalFilters((prev) => ({
                                  ...prev,
                                  sort: sortKey as YatrisListParams["sort"],
                                  dir: nextDir,
                                }));
                                updateParams({ sort: sortKey as YatrisListParams["sort"], dir: nextDir, page: 1 });
                              }}
                            >
                              {headerContent}
                            </button>
                          ) : (
                            <div className="inline-flex w-full items-center justify-center gap-1 text-center">
                              {headerContent}
                            </div>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                  <tr className="text-center bg-[color:var(--surface)]">
                    <th className="px-6 py-2 align-middle text-center border-t border-[color:var(--border)]">
                      <span className="sr-only">Select</span>
                    </th>
                    {visibleColumns.map((column) => {
                      const isDisabled = column.id === "actions";
                      return (
                        <th
                          key={`${column.id}-filter`}
                          className="px-3 py-2 align-middle text-center border-l border-t border-[color:var(--border)]/60"
                        >
                          <input
                            type="text"
                            value={isDisabled ? "" : localFilters.columnFilters?.[column.id as ColumnFilterKey] ?? ""}
                            onChange={
                              isDisabled
                                ? undefined
                                : (event) => updateColumnFilter(column.id as ColumnFilterKey, event.target.value)
                            }
                            placeholder={isDisabled ? "" : "Search"}
                            disabled={isDisabled}
                            className={`yatris-table__filter-input w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-2 py-1 text-[11px] text-center text-[color:var(--ink)] placeholder:text-[color:var(--subtle)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] ${
                              isDisabled ? "cursor-not-allowed opacity-50" : ""
                            }`}
                          />
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="yatris-table__body divide-y divide-[color:var(--border)] bg-[color:var(--surface)]">
                  {rows.map((row) => (
                    <tr
                      key={row.id}
                      data-selected={selectedIds.has(row.id) ? "true" : "false"}
                      className="yatris-table__row cursor-pointer odd:bg-[color:var(--surface-muted)]/35 even:bg-[color:var(--surface)] hover:bg-[color:var(--surface-muted)]/60"
                      onClick={(event) => {
                        const target = event.target as HTMLElement;
                        if (target.closest("button") || target.closest("a") || target.closest("input")) return;
                        startNavigation("Loading registration...");
                        router.push(`/yatris/${row.id}`);
                      }}
                    >
                      <td className="px-6 py-2.5 align-middle text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(row.id)}
                          onChange={() => toggleRow(row.id)}
                        />
                      </td>
                      {visibleColumns.map((column) => (
                        <td
                          key={column.id}
                          className="px-4 py-2.5 align-middle text-center border-l border-[color:var(--border)]/60"
                        >
                          {column.cell(row)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-3 p-4 md:hidden">
              {rows.map((row) => {
                const rawPhotoPath = row.photo_url ?? "";
                const cachedPreview = photoPreviewUrls[row.id];
                const signedUrl = cachedPreview?.path === rawPhotoPath ? cachedPreview.url : "";
                const directUrl = rawPhotoPath.startsWith("http") ? rawPhotoPath : "";
                const previewUrl = signedUrl || directUrl;
                const initial = row.name_hi?.trim()?.charAt(0) || "Y";
                return (
                  <div
                    key={row.id}
                    className="yatri-card"
                    onClick={(event) => {
                      const target = event.target as HTMLElement;
                      if (target.closest("button") || target.closest("a") || target.closest("input")) return;
                      startNavigation("Loading registration...");
                      router.push(`/yatris/${row.id}`);
                    }}
                  >
                    <div className="yatri-card__header">
                      <div className="yatri-card__identity">
                        <div className="yatri-card__avatar">
                          {previewUrl ? (
                            <img
                              src={previewUrl}
                              alt={row.name_hi ? `${row.name_hi} image` : "Yatri image"}
                              className="yatri-card__avatar-image"
                              loading="lazy"
                            />
                          ) : (
                            <span className="yatri-card__avatar-fallback">{initial}</span>
                          )}
                        </div>
                        <div>
                          <div className="yatri-card__name">{row.name_hi || "--"}</div>
                          <div className="yatri-card__phone">{row.phone || "--"}</div>
                        </div>
                      </div>
                    </div>
                    <div className="yatri-card__meta">
                      <span>Created: {formatDate(row.created_at)}</span>
                      <span>Travel: {row.travel_mode || "--"}</span>
                      <span>Bucket: {row.category?.name || "Unassigned"}</span>
                    </div>
                    <div className="yatri-card__actions">
                      {renderRowActions(row)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pagination-compact flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="flex items-center gap-2 text-[11px] text-[color:var(--muted)]">
              Page {page} of {pageCount}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="btn-secondary pagination-prev"
                onClick={() => updateParams({ page: Math.max(1, page - 1) })}
                disabled={page <= 1}
              >
                Previous
              </button>
              <button
                type="button"
                className="btn-secondary pagination-next"
                onClick={() => updateParams({ page: Math.min(pageCount, page + 1) })}
                disabled={page >= pageCount}
              >
                Next
              </button>
              <div className="w-[120px]">
                <Select
                  value={String(localPageSize)}
                  onChange={(event) => {
                    const nextSize = Number.parseInt(event.target.value, 10);
                    setLocalPageSize(nextSize);
                    updateParams({ pageSize: nextSize, page: 1 });
                  }}
                  className="text-[11px]"
                >
                  <option value="10">10 / page</option>
                  <option value="25">25 / page</option>
                  <option value="50">50 / page</option>
                  <option value="100">100 / page</option>
                </Select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Views Modal */}
      <Modal isOpen={openModal === "views"} onClose={closeModal} title="Saved Views">
        <div className="space-y-2">
          {allViews.map((view) => (
            <button
              key={view.name}
              type="button"
              onClick={() => {
                applyView(view);
                closeModal();
              }}
              className="flex w-full items-center justify-between rounded-lg px-4 py-3 text-left text-[14px] font-medium text-[color:var(--ink)] hover:bg-[color:var(--surface-muted)] transition-colors"
            >
              {view.name}
              <span className="text-[13px] text-[color:var(--muted)]">Apply</span>
            </button>
          ))}
          <div className="pt-3 mt-3 border-t border-[color:var(--border)]">
            <button
              type="button"
              onClick={() => {
                saveCurrentView();
                closeModal();
              }}
              className="w-full rounded-lg border border-[color:var(--border)] px-4 py-3 text-[14px] font-medium text-[color:var(--muted)] hover:border-[color:var(--accent)] hover:text-[color:var(--ink)] transition-colors"
            >
              Save current view
            </button>
          </div>
        </div>
      </Modal>

      {/* Columns Modal */}
      <Modal isOpen={openModal === "columns"} onClose={closeModal} title="Visible Columns" maxWidth="lg">
        <div className="space-y-1.5 max-h-[480px] overflow-y-auto">
          {columnConfig.order.map((id) => {
            const column = columns[id];
            if (!column) return null;
            const isLocked = id === "actions";
            return (
              <div
                key={id}
                className="flex items-center gap-3 rounded-lg px-4 py-3 text-[14px] text-[color:var(--ink)] hover:bg-[color:var(--surface-muted)] transition-colors"
                draggable={!isLocked}
                onDragStart={() => setDragColumn(id)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => handleReorder(id)}
              >
                <span className="cursor-grab text-[color:var(--muted)] text-base leading-none select-none">::</span>
                <label className="flex flex-1 items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!columnConfig.hidden.includes(id)}
                    onChange={() => toggleColumn(id)}
                    disabled={isLocked}
                    className="h-4 w-4 rounded border-[color:var(--border)] text-[color:var(--accent)] focus:ring-[color:var(--accent)] focus:ring-offset-0"
                  />
                  <span className="font-medium">{column.label}</span>
                </label>
              </div>
            );
          })}
        </div>
      </Modal>

      {/* Export Modal */}
      <Modal isOpen={openModal === "export"} onClose={closeModal} title="Export Data" maxWidth="sm">
        <div className="space-y-4">
          <label className="flex items-center gap-3 text-[14px] font-medium text-[color:var(--ink)] cursor-pointer">
            <input
              type="checkbox"
              checked={includeFullAadhaar}
              onChange={(event) => setIncludeFullAadhaar(event.target.checked)}
              className="h-4 w-4 rounded border-[color:var(--border)] text-[color:var(--accent)] focus:ring-[color:var(--accent)] focus:ring-offset-0"
            />
            Include full Aadhaar
          </label>
          <div className="pt-2 border-t border-[color:var(--border)]">
            <button
              type="button"
              className="btn-secondary w-full min-h-[44px] text-[14px] font-semibold"
              onClick={() => {
                exportFiltered();
                closeModal();
              }}
              disabled={exporting}
            >
              {exporting ? "Exporting..." : "Export filtered (max 2000)"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { PageHeader, Select, TextInput } from "@/components/ui";
import type { ExportPayload, ExportResult } from "./actions";
import type { YatriRow, YatrisFilters, YatrisListParams } from "./query";

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
    "status",
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
  { name: "Needs Review", params: { status: ["needs_review"] } },
  { name: "Approved", params: { status: ["approved"] } },
  { name: "Missing Uploads", params: { missing: "any" } },
];

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

const statusLabel = (status?: string | null) => {
  if (!status) return "Submitted";
  return status.replace(/_/g, " ");
};

const statusClass = (status?: string | null) => {
  switch (status) {
    case "approved":
      return "bg-emerald-500/20 text-emerald-300";
    case "rejected":
      return "bg-rose-500/20 text-rose-300";
    case "needs_review":
      return "bg-amber-500/20 text-amber-300";
    default:
      return "bg-slate-500/20 text-slate-200";
  }
};

const toDateInput = (value: string) => value || "";

const buildSearchParams = (params: YatrisListParams) => {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.status.length) search.set("status", params.status.join(","));
  if (params.travel_mode) search.set("travel_mode", params.travel_mode);
  if (params.date_from) search.set("date_from", params.date_from);
  if (params.date_to) search.set("date_to", params.date_to);
  if (params.missing) search.set("missing", params.missing);
  if (params.sort) search.set("sort", params.sort);
  if (params.dir) search.set("dir", params.dir);
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
  const [isPending, startTransition] = useTransition();
  const [searchValue, setSearchValue] = useState(filters.q);
  const [localFilters, setLocalFilters] = useState<YatrisFilters>({ ...filters });
  const [localPageSize, setLocalPageSize] = useState(pageSize);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [columnConfig, setColumnConfig] = useState<ColumnConfig>(DEFAULT_COLUMNS);
  const [views, setViews] = useState<SavedView[]>(DEFAULT_VIEWS);
  const [includeFullAadhaar, setIncludeFullAadhaar] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [dragColumn, setDragColumn] = useState<string | null>(null);
  const [openRowMenuId, setOpenRowMenuId] = useState<string | null>(null);
  const viewsRef = useRef<HTMLDetailsElement>(null);
  const columnsRef = useRef<HTMLDetailsElement>(null);
  const statusRef = useRef<HTMLDetailsElement>(null);
  const exportRef = useRef<HTMLDetailsElement>(null);
  const detailRefs = [viewsRef, columnsRef, statusRef, exportRef];

  const canReview = currentRole === "admin" || currentRole === "reviewer";

  const closeAllDetails = () => {
    detailRefs.forEach((ref) => {
      if (ref.current) {
        ref.current.open = false;
      }
    });
  };

  const openExclusive = (activeRef: React.RefObject<HTMLDetailsElement>) => {
    setOpenRowMenuId(null);
    detailRefs.forEach((ref) => {
      if (ref.current && ref !== activeRef) {
        ref.current.open = false;
      }
    });
  };

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      const isInside = detailRefs.some((ref) => ref.current && ref.current.contains(target));
      if (!isInside) closeAllDetails();
      if (!(target as HTMLElement | null)?.closest?.("[data-row-menu]")) {
        setOpenRowMenuId(null);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  useEffect(() => {
    setSearchValue(filters.q);
    setLocalFilters({ ...filters });
    setLocalPageSize(pageSize);
  }, [filters, pageSize]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [rows]);

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

  const statusOptions = [
    { value: "submitted", label: "Submitted" },
    { value: "needs_review", label: "Needs review" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" },
  ];

  const renderRowActions = (row: YatriRow) => {
    const canReviewRow =
      canReview && (row.status === "needs_review" || row.status === "submitted" || !row.status);
    const isOpen = openRowMenuId === row.id;
    return (
      <div
        className="relative flex items-center justify-end"
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
            closeAllDetails();
            setOpenRowMenuId((prev) => (prev === row.id ? null : row.id));
          }}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[color:var(--border)] text-[color:var(--muted)] hover:border-[color:var(--accent)]"
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
            <circle cx="10" cy="4" r="1.6" fill="currentColor" />
            <circle cx="10" cy="10" r="1.6" fill="currentColor" />
            <circle cx="10" cy="16" r="1.6" fill="currentColor" />
          </svg>
        </button>
        {isOpen && (
          <div
            role="menu"
            className="absolute right-0 top-full z-50 mt-2 w-44 rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-2 shadow-lg"
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
              {canReviewRow && (
                <Link
                  href={`/yatris/${row.id}`}
                  onClick={() => setOpenRowMenuId(null)}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-emerald-300 hover:bg-emerald-500/10"
                >
                  <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
                    <path
                      d="M4 10.5l3.5 3.5L16 5.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Approve
                </Link>
              )}
              {canReviewRow && (
                <Link
                  href={`/yatris/${row.id}`}
                  onClick={() => setOpenRowMenuId(null)}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-rose-300 hover:bg-rose-500/10"
                >
                  <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
                    <path
                      d="M5 5l10 10M15 5L5 15"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                  Reject
                </Link>
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

  const columns: Record<string, ColumnDef> = useMemo(() => {
    return {
      created_at: {
        id: "created_at",
        label: "Created",
        sortable: true,
        cell: (row) => <span className="text-xs text-[color:var(--muted)]">{formatDateTime(row.created_at)}</span>,
        exportValue: (row) => formatDateTime(row.created_at),
      },
      updated_at: {
        id: "updated_at",
        label: "Updated",
        sortable: false,
        cell: (row) => <span className="text-xs text-[color:var(--muted)]">{formatDateTime(row.updated_at)}</span>,
        exportValue: (row) => formatDateTime(row.updated_at),
      },
      name_hi: {
        id: "name_hi",
        label: "Name",
        sortable: true,
        cell: (row) => <span className="font-semibold text-[color:var(--ink)]">{row.name_hi || "--"}</span>,
        exportValue: (row) => row.name_hi ?? "",
      },
      phone: {
        id: "phone",
        label: "Phone",
        cell: (row) => <span className="text-sm text-[color:var(--ink)]">{row.phone || "--"}</span>,
        exportValue: (row) => row.phone ?? "",
      },
      status: {
        id: "status",
        label: "Status",
        sortable: true,
        cell: (row) => (
          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(row.status)}`}>
            {statusLabel(row.status)}
          </span>
        ),
        exportValue: (row) => statusLabel(row.status),
      },
      travel: {
        id: "travel",
        label: "Travel",
        cell: (row) => (
          <div className="text-xs text-[color:var(--muted)]">
            <div className="font-medium text-[color:var(--ink)]">{row.travel_mode || "--"}</div>
            <div>{row.train_class || ""}</div>
          </div>
        ),
        exportValue: (row) => [row.travel_mode, row.train_class].filter(Boolean).join(" "),
      },
      uploads: {
        id: "uploads",
        label: "Uploads",
        cell: (row) => (
          <div className="flex items-center gap-2 text-xs">
            <span className={row.photo_url ? "text-emerald-300" : "text-slate-400"}>Photo</span>
            <span className={row.form_image_url ? "text-emerald-300" : "text-slate-400"}>Form</span>
          </div>
        ),
        exportValue: (row) =>
          `Photo: ${row.photo_url ? "Yes" : "No"}; Form: ${row.form_image_url ? "Yes" : "No"}`,
      },
      receipt_no: {
        id: "receipt_no",
        label: "Receipt",
        cell: (row) => <span className="text-xs text-[color:var(--muted)]">{row.receipt_no || "--"}</span>,
        exportValue: (row) => row.receipt_no ?? "",
      },
      aadhaar_no: {
        id: "aadhaar_no",
        label: "Aadhaar",
        cell: (row) => <span className="text-xs text-[color:var(--muted)]">{maskAadhaar(row.aadhaar_no, false)}</span>,
        exportValue: (row, opts) => maskAadhaar(row.aadhaar_no, opts.includeFullAadhaar),
      },
      age_years: {
        id: "age_years",
        label: "Age",
        cell: (row) => <span className="text-xs text-[color:var(--muted)]">{row.age_years ?? "--"}</span>,
        exportValue: (row) => (row.age_years ?? "").toString(),
      },
      dob: {
        id: "dob",
        label: "DOB",
        cell: (row) => <span className="text-xs text-[color:var(--muted)]">{formatDate(row.dob)}</span>,
        exportValue: (row) => formatDate(row.dob),
      },
      reservation_by: {
        id: "reservation_by",
        label: "Reservation",
        cell: (row) => <span className="text-xs text-[color:var(--muted)]">{row.reservation_by || "--"}</span>,
        exportValue: (row) => row.reservation_by ?? "",
      },
      emergency_contact: {
        id: "emergency_contact",
        label: "Emergency",
        cell: (row) => (
          <div className="text-xs text-[color:var(--muted)]">
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
        cell: (row) => <span className="text-xs text-[color:var(--muted)]">{healthSummary(row)}</span>,
        exportValue: (row) => healthSummary(row),
      },
      actions: {
        id: "actions",
        label: "Actions",
        exportable: false,
        cell: (row) => renderRowActions(row),
      },
    };
  }, [renderRowActions]);

  const orderedColumns = useMemo(() => {
    const all = columnConfig.order.map((id) => columns[id]).filter(Boolean);
    const actionsColumn = all.find((column) => column.id === "actions");
    const withoutActions = all.filter((column) => column.id !== "actions");
    return actionsColumn ? [...withoutActions, actionsColumn] : withoutActions;
  }, [columnConfig.order, columns]);

  const visibleColumns = orderedColumns.filter(
    (column) => !columnConfig.hidden.includes(column.id)
  );

  const toggleStatus = (value: string) => {
    const next = localFilters.status.includes(value)
      ? localFilters.status.filter((status) => status !== value)
      : [...localFilters.status, value];
    setLocalFilters({ ...localFilters, status: next });
    updateParams({ status: next, page: 1 });
  };

  const clearFilters = () => {
    setSearchValue("");
    setLocalFilters({
      ...localFilters,
      q: "",
      status: [],
      travel_mode: "",
      date_from: "",
      date_to: "",
      missing: "",
      sort: "created_at",
      dir: "desc",
    });
    updateParams({
      q: "",
      status: [],
      travel_mode: "",
      date_from: "",
      date_to: "",
      missing: "",
      sort: "created_at",
      dir: "desc",
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
      status: view.params.status ?? [],
      travel_mode: view.params.travel_mode ?? "",
      date_from: view.params.date_from ?? "",
      date_to: view.params.date_to ?? "",
      missing: view.params.missing ?? "",
      sort: view.params.sort ?? "created_at",
      dir: view.params.dir ?? "desc",
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
        status: localFilters.status,
        travel_mode: localFilters.travel_mode,
        date_from: localFilters.date_from,
        date_to: localFilters.date_to,
        missing: localFilters.missing,
        sort: localFilters.sort,
        dir: localFilters.dir,
      },
      columns: columnConfig,
    };
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(VIEW_STORAGE_KEY) : null;
    const existing = stored ? (JSON.parse(stored) as SavedView[]) : [];
    const updated = [...existing.filter((view) => view.name !== name), entry];
    window.localStorage.setItem(VIEW_STORAGE_KEY, JSON.stringify(updated));
    setViews([...DEFAULT_VIEWS, ...updated]);
  };

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

  const exportRows = (data: YatriRow[]) => {
    const exportColumns = visibleColumns.filter((column) => column.exportable !== false);
    const headers = exportColumns.map((column) => column.label);
    const lines = data.map((row) =>
      exportColumns
        .map((column) => {
          const raw = column.exportValue ? column.exportValue(row, { includeFullAadhaar }) : "";
          return csvEscape(raw ?? "");
        })
        .join(",")
    );
    const csv = [headers.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `yatris-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const exportSelected = () => {
    const selectedRows = rows.filter((row) => selectedIds.has(row.id));
    if (!selectedRows.length) return;
    exportRows(selectedRows);
  };

  const exportFiltered = async () => {
    setExportMessage(null);
    setExporting(true);
    try {
      const result = await exportAction({
        filters: {
          q: localFilters.q,
          status: localFilters.status,
          travel_mode: localFilters.travel_mode,
          date_from: localFilters.date_from,
          date_to: localFilters.date_to,
          missing: localFilters.missing,
          sort: localFilters.sort,
          dir: localFilters.dir,
        },
      });
      if (result.rows.length === 0) {
        setExportMessage("No rows available for export.");
        return;
      }
      if (result.overLimit) {
        setExportMessage("Export capped at 2000 rows. Narrow filters to export more.");
      }
      exportRows(result.rows);
    } finally {
      setExporting(false);
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
    <div className="yatris-grid space-y-6">
      <PageHeader
        className="relative z-30 overflow-visible"
        title="Yatris"
        subtitle="Manage registrations with powerful filters, saved views, and exports."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <details
              ref={viewsRef}
              className="relative z-40"
              onToggle={() => {
                if (viewsRef.current?.open) {
                  openExclusive(viewsRef);
                }
              }}
            >
              <summary className="btn-secondary inline-flex min-h-[44px] items-center justify-between cursor-pointer list-none">
                Views
              </summary>
              <div className="absolute right-0 z-50 mt-2 w-64 rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-3 shadow-lg">
                <div className="space-y-2">
                  {allViews.map((view) => (
                    <button
                      key={view.name}
                      type="button"
                      onClick={() => applyView(view)}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-[color:var(--ink)] hover:bg-[color:var(--surface-muted)]"
                    >
                      {view.name}
                      <span className="text-xs text-[color:var(--muted)]">Apply</span>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={saveCurrentView}
                    className="w-full rounded-lg border border-[color:var(--border)] px-3 py-2 text-sm text-[color:var(--muted)] hover:border-[color:var(--accent)]"
                  >
                    Save current view
                  </button>
                </div>
              </div>
            </details>

            <details
              ref={columnsRef}
              className="relative z-40"
              onToggle={() => {
                if (columnsRef.current?.open) {
                  openExclusive(columnsRef);
                }
              }}
            >
              <summary className="btn-secondary inline-flex min-h-[44px] items-center justify-between cursor-pointer list-none">
                Columns
              </summary>
              <div className="absolute right-0 z-50 mt-2 w-72 rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-3 shadow-lg">
                <div className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">Visible columns</div>
                <div className="mt-2 space-y-1">
                  {columnConfig.order.map((id) => {
                    const column = columns[id];
                    if (!column) return null;
                    const isLocked = id === "actions";
                    return (
                      <div
                        key={id}
                        className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm text-[color:var(--ink)]"
                        draggable={!isLocked}
                        onDragStart={() => setDragColumn(id)}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={() => handleReorder(id)}
                      >
                        <span className="cursor-grab text-[color:var(--muted)]">::</span>
                        <label className="flex flex-1 items-center gap-2">
                          <input
                            type="checkbox"
                            checked={!columnConfig.hidden.includes(id)}
                            onChange={() => toggleColumn(id)}
                            disabled={isLocked}
                          />
                          {column.label}
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>
            </details>

            <Link href="/yatris/new" className="btn-primary inline-flex min-h-[44px] items-center">
              + New Registration
            </Link>
          </div>
        }
      />

      <div className="card relative z-20 p-6 space-y-4 overflow-visible">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
            <div className="sm:col-span-2 lg:col-span-2 xl:col-span-2">
              <TextInput
                placeholder="Search name, phone, receipt"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
              />
            </div>
            <details
              ref={statusRef}
              className="relative z-30"
              onToggle={() => {
                if (statusRef.current?.open) {
                  openExclusive(statusRef);
                }
              }}
            >
              <summary className="btn-secondary inline-flex min-h-[44px] w-full items-center justify-between cursor-pointer list-none">
                Status
              </summary>
              <div className="absolute left-0 z-50 mt-2 w-56 rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-3 shadow-lg">
                <div className="space-y-2">
                  {statusOptions.map((option) => (
                    <label key={option.value} className="flex items-center gap-2 text-sm text-[color:var(--ink)]">
                      <input
                        type="checkbox"
                        checked={localFilters.status.includes(option.value)}
                        onChange={() => toggleStatus(option.value)}
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </div>
            </details>
            <div>
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
            <div className="sm:col-span-2 lg:col-span-2 xl:col-span-2">
              <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
                <TextInput
                  type="date"
                  value={toDateInput(localFilters.date_from)}
                  onChange={(event) => {
                    const value = event.target.value;
                    setLocalFilters({ ...localFilters, date_from: value });
                    updateParams({ date_from: value, page: 1 });
                  }}
                  className="text-sm"
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
                  className="text-sm"
                />
              </div>
            </div>
            <div>
              <Select
                value={localFilters.missing}
                onChange={(event) => {
                  const value = event.target.value;
                  setLocalFilters({ ...localFilters, missing: value });
                  updateParams({ missing: value, page: 1 });
                }}
              >
                <option value="">All uploads</option>
                <option value="photo">Missing photo</option>
                <option value="form">Missing form</option>
                <option value="any">Missing any</option>
              </Select>
            </div>
            <button type="button" className="btn-secondary min-h-[44px] w-full" onClick={clearFilters}>
              Clear filters
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-[color:var(--muted)] lg:justify-end">
            <span>{isPending ? "Updating..." : `Showing ${rangeStart}-${rangeEnd} of ${totalCount}`}</span>
            <details
              ref={exportRef}
              className="relative z-30"
              onToggle={() => {
                if (exportRef.current?.open) {
                  openExclusive(exportRef);
                }
              }}
            >
              <summary className="btn-secondary inline-flex min-h-[44px] items-center justify-between cursor-pointer list-none">
                Export
              </summary>
              <div className="absolute right-0 z-50 mt-2 w-64 rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-3 shadow-lg">
                <div className="space-y-3 text-sm text-[color:var(--ink)]">
                  <label className="flex items-center gap-2 text-xs text-[color:var(--muted)]">
                    <input
                      type="checkbox"
                      checked={includeFullAadhaar}
                      onChange={(event) => setIncludeFullAadhaar(event.target.checked)}
                    />
                    Include full Aadhaar
                  </label>
                  <button type="button" className="btn-secondary w-full" onClick={exportFiltered} disabled={exporting}>
                    Export filtered (max 2000)
                  </button>
                  <button
                    type="button"
                    className="btn-secondary w-full"
                    onClick={exportSelected}
                    disabled={selectedIds.size === 0}
                  >
                    Export selected
                  </button>
                </div>
              </div>
            </details>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-[color:var(--muted)]">
          {localFilters.q && (
            <span className="rounded-full border border-[color:var(--border)] px-3 py-1">
              Search: {localFilters.q}
            </span>
          )}
          {localFilters.status.map((status) => (
            <button
              key={status}
              type="button"
              className="rounded-full border border-[color:var(--border)] px-3 py-1"
              onClick={() => toggleStatus(status)}
            >
              Status: {statusLabel(status)} x
            </button>
          ))}
          {localFilters.travel_mode && (
            <button
              type="button"
              className="rounded-full border border-[color:var(--border)] px-3 py-1"
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
              className="rounded-full border border-[color:var(--border)] px-3 py-1"
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
              className="rounded-full border border-[color:var(--border)] px-3 py-1"
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
              className="rounded-full border border-[color:var(--border)] px-3 py-1"
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

      {selectedIds.size > 0 && (
        <div className="card px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-[color:var(--ink)]">
              {selectedIds.size} selected on this page
            </div>
            <button type="button" className="btn-secondary" onClick={exportSelected}>
              Export selected
            </button>
          </div>
        </div>
      )}

      {exportMessage && (
        <div className="card px-4 py-3 text-sm text-amber-200 border border-amber-500/40 bg-amber-950/30">
          {exportMessage}
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
        <div className="space-y-4">
          <div className="card rounded-none overflow-visible p-3">
            <div className="hidden overflow-x-auto overflow-y-visible p-2 md:block">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 bg-[color:var(--surface-muted)] text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
                  <tr className="text-left">
                    <th className="px-5 py-3">
                      <input type="checkbox" checked={allSelected} onChange={toggleAll} />
                    </th>
                    {visibleColumns.map((column) => (
                      <th
                        key={column.id}
                        className="px-5 py-3 font-semibold"
                      >
                        {column.sortable ? (
                          <button
                            type="button"
                            className="flex items-center gap-2"
                            onClick={() => {
                              const nextSort = column.id === "name_hi" ? "name" : column.id;
                              const nextDir =
                                filters.sort === nextSort && filters.dir === "asc" ? "desc" : "asc";
                              setLocalFilters((prev) => ({
                                ...prev,
                                sort: nextSort as YatrisListParams["sort"],
                                dir: nextDir,
                              }));
                              updateParams({ sort: nextSort as YatrisListParams["sort"], dir: nextDir, page: 1 });
                            }}
                          >
                            {column.label}
                            {filters.sort === (column.id === "name_hi" ? "name" : column.id) && (
                              <span className="text-[color:var(--ink)]">{filters.dir === "asc" ? "^" : "v"}</span>
                            )}
                          </button>
                        ) : (
                          column.label
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--border)]">
                  {rows.map((row) => (
                    <tr
                      key={row.id}
                      className="cursor-pointer hover:bg-[color:var(--surface-muted)]/50"
                      onClick={(event) => {
                        const target = event.target as HTMLElement;
                        if (target.closest("button") || target.closest("a") || target.closest("input")) return;
                        router.push(`/yatris/${row.id}`);
                      }}
                    >
                      <td className="px-5 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(row.id)}
                          onChange={() => toggleRow(row.id)}
                        />
                      </td>
                      {visibleColumns.map((column) => (
                        <td key={column.id} className="px-5 py-3">
                          {column.cell(row)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-3 p-4 md:hidden">
              {rows.map((row) => (
                <div key={row.id} className="rounded-2xl border border-[color:var(--border)] p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-base font-semibold text-[color:var(--ink)]">{row.name_hi || "--"}</div>
                      <div className="text-xs text-[color:var(--muted)]">{row.phone || "--"}</div>
                    </div>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(row.status)}`}>
                      {statusLabel(row.status)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[color:var(--muted)]">
                    <span>Created: {formatDate(row.created_at)}</span>
                    <span>Travel: {row.travel_mode || "--"}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[color:var(--muted)]">
                    <span className={row.photo_url ? "text-emerald-300" : "text-slate-400"}>Photo</span>
                    <span className={row.form_image_url ? "text-emerald-300" : "text-slate-400"}>Form</span>
                  </div>
                  <div className="flex justify-end">
                    {renderRowActions(row)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-[color:var(--muted)]">
              Page {page} of {pageCount}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => updateParams({ page: Math.max(1, page - 1) })}
                disabled={page <= 1}
              >
                Previous
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => updateParams({ page: Math.min(pageCount, page + 1) })}
                disabled={page >= pageCount}
              >
                Next
              </button>
              <Select
                value={String(localPageSize)}
                onChange={(event) => {
                  const nextSize = Number.parseInt(event.target.value, 10);
                  setLocalPageSize(nextSize);
                  updateParams({ pageSize: nextSize, page: 1 });
                }}
              >
                <option value="10">10 / page</option>
                <option value="25">25 / page</option>
                <option value="50">50 / page</option>
                <option value="100">100 / page</option>
              </Select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import Link from "next/link";
import { PageHeader, TextInput } from "@/components/ui";
import { requireStaff } from "@/lib/roleGuard";
import { getActionSupabase } from "@/lib/supabaseServer";
import { revalidatePath } from "next/cache";

const orchestratorUrl = process.env.NEXT_PUBLIC_ORCHESTRATOR_URL?.replace(/\/$/, "");

type StationRow = {
  id: string;
  code: string;
  name: string;
  state: string | null;
  created_at: string | null;
};

const toText = (value: FormDataEntryValue | null) =>
  value ? value.toString().trim() : "";

const formatDate = (value?: string | null) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleDateString();
};

const StationFields = ({
  defaults,
}: {
  defaults?: { code?: string | null; name?: string | null; state?: string | null };
}) => (
  <>
    <TextInput
      name="code"
      placeholder="Code (e.g., AII)"
      required
      defaultValue={defaults?.code ?? ""}
    />
    <TextInput
      name="name"
      placeholder="Station name"
      required
      defaultValue={defaults?.name ?? ""}
    />
    <TextInput
      name="state"
      placeholder="State (optional)"
      defaultValue={defaults?.state ?? ""}
    />
  </>
);

async function createStation(formData: FormData) {
  "use server";
  const code = toText(formData.get("code")).toUpperCase();
  const name = toText(formData.get("name"));
  const state = toText(formData.get("state")) || null;
  if (!code || !name) return;

  if (!orchestratorUrl) {
    throw new Error("NEXT_PUBLIC_ORCHESTRATOR_URL is not configured.");
  }

  const supabase = await getActionSupabase();
  const { data: session } = await supabase.auth.getSession();
  const token = session.session?.access_token;
  if (!token) {
    throw new Error("Unable to read auth session.");
  }

  const response = await fetch(`${orchestratorUrl}/master-stations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ code, name, state }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error?.message ?? "Failed to create station.");
  }
  revalidatePath("/masters/stations");
}

async function updateStation(formData: FormData) {
  "use server";
  const id = toText(formData.get("id"));
  const code = toText(formData.get("code")).toUpperCase();
  const name = toText(formData.get("name"));
  const state = toText(formData.get("state")) || null;
  if (!id || !code || !name) return;

  if (!orchestratorUrl) {
    throw new Error("NEXT_PUBLIC_ORCHESTRATOR_URL is not configured.");
  }

  const supabase = await getActionSupabase();
  const { data: session } = await supabase.auth.getSession();
  const token = session.session?.access_token;
  if (!token) {
    throw new Error("Unable to read auth session.");
  }

  const response = await fetch(`${orchestratorUrl}/master-stations/${id}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ code, name, state }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error?.message ?? "Failed to update station.");
  }
  revalidatePath("/masters/stations");
}

async function deleteStation(formData: FormData) {
  "use server";
  const id = toText(formData.get("id"));
  if (!id) return;

  if (!orchestratorUrl) {
    throw new Error("NEXT_PUBLIC_ORCHESTRATOR_URL is not configured.");
  }

  const supabase = await getActionSupabase();
  const { data: session } = await supabase.auth.getSession();
  const token = session.session?.access_token;
  if (!token) {
    throw new Error("Unable to read auth session.");
  }

  const response = await fetch(`${orchestratorUrl}/master-stations/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error?.message ?? "Failed to delete station.");
  }
  revalidatePath("/masters/stations");
}

export default async function MasterStationsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { supabase } = await requireStaff();
  const params = (await searchParams) ?? {};
  const queryParam = Array.isArray(params.q) ? params.q?.[0] : params.q;
  const q = queryParam?.trim() ?? "";

  const { data: session } = await supabase.auth.getSession();
  const token = session.session?.access_token;

  let stations: StationRow[] = [];
  let errorMessage: string | null = null;
  if (!orchestratorUrl) {
    errorMessage = "NEXT_PUBLIC_ORCHESTRATOR_URL is not configured.";
  } else if (!token) {
    errorMessage = "Unable to read auth session.";
  } else {
    const url = new URL(`${orchestratorUrl}/master-stations`);
    if (q) url.searchParams.set("q", q);
    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      errorMessage = payload?.error?.message ?? "Failed to load stations.";
    } else {
      const payload = await response.json().catch(() => null);
      stations = (payload?.data ?? []) as StationRow[];
    }
  }

  const error = errorMessage ? { message: errorMessage } : null;
  const stationCount = stations.length;

  return (
    <div id="stations" className="yatris-grid masters-stations flex flex-col gap-6">
      <PageHeader
        className="relative z-30 overflow-visible yatris-hero"
        title="Master Stations"
        subtitle="Create and edit station codes used in train routes."
        actions={
          <div className="header-actions flex flex-wrap items-center gap-2">
            <a href="#station-create" className="btn-primary station-action inline-flex items-center">
              + Add station
            </a>
          </div>
        }
      />

      <div className="card relative z-20 p-6 space-y-4 overflow-visible filters-compact">
        <div className="space-y-3">
          <div className="flex flex-wrap items-end gap-2">
            <form method="get" className="flex flex-wrap items-end gap-2">
              <div className="w-full sm:w-72 lg:w-80">
                <TextInput
                  name="q"
                  placeholder="Search by code or name"
                  defaultValue={q}
                />
              </div>
              <button type="submit" className="btn-secondary min-h-[36px]">
                Search
              </button>
            </form>
            {q && (
              <Link href="/masters/stations" className="btn-secondary min-h-[36px]">
                Clear search
              </Link>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[color:var(--muted)]">
            <span>
              {q ? `Results for "${q}"` : `Showing ${stationCount} stations`}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-2">
        {error && (
          <div className="card px-4 py-3 text-sm text-rose-200 border border-rose-500/40 bg-rose-950/30">
            {error.message}
          </div>
        )}
        {!error && stationCount === 0 && (
          <div className="card p-6 text-center">
            <div className="text-lg font-semibold text-[color:var(--ink)]">No stations found</div>
            <p className="mt-2 text-sm text-[color:var(--muted)]">
              Try adjusting your search or add a new station.
            </p>
          </div>
        )}

        {!error && stationCount > 0 && (
          <div className="card rounded-none overflow-visible p-2">
            <div className="overflow-x-auto overflow-y-visible p-2">
              <table className="min-w-full bg-[color:var(--surface)] text-[12px] text-center">
                <thead className="sticky top-0 bg-[color:var(--surface-muted)] text-[11px] font-semibold text-[color:var(--muted)] border-b border-[color:var(--border)]">
                  <tr>
                    <th className="h-[45px] px-4 py-0 align-middle text-center">Code</th>
                    <th className="h-[45px] px-4 py-0 align-middle text-center border-l border-[color:var(--border)]/60">
                      Name
                    </th>
                    <th className="h-[45px] px-4 py-0 align-middle text-center border-l border-[color:var(--border)]/60">
                      State
                    </th>
                    <th className="h-[45px] px-4 py-0 align-middle text-center border-l border-[color:var(--border)]/60">
                      Created
                    </th>
                    <th className="h-[45px] px-4 py-0 align-middle text-center border-l border-[color:var(--border)]/60">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--border)] bg-[color:var(--surface)]">
                  {(stations ?? []).map((station) => (
                    <tr
                      key={station.id}
                      className="odd:bg-[color:var(--surface-muted)]/35 even:bg-[color:var(--surface)] hover:bg-[color:var(--surface-muted)]/60"
                    >
                      <td className="px-4 py-2.5 align-middle text-center font-semibold text-[color:var(--ink)]">
                        {station.code}
                      </td>
                      <td className="px-4 py-2.5 align-middle text-center border-l border-[color:var(--border)]/60">
                        {station.name}
                      </td>
                      <td className="px-4 py-2.5 align-middle text-center border-l border-[color:var(--border)]/60 text-[color:var(--muted)]">
                        {station.state ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 align-middle text-center border-l border-[color:var(--border)]/60 text-[color:var(--muted)]">
                        {formatDate(station.created_at)}
                      </td>
                      <td className="px-4 py-2.5 align-middle text-center border-l border-[color:var(--border)]/60">
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          <a
                            href={`#station-view-${station.id}`}
                            className="btn-secondary station-action"
                          >
                            View
                          </a>
                          <a
                            href={`#station-edit-${station.id}`}
                            className="btn-secondary station-action"
                          >
                            Edit
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        <div id="station-create" className="station-modal">
          <a href="#stations" className="station-modal__overlay" aria-label="Close" />
          <div className="station-modal__content card p-3" style={{ padding: "12px" }}>
            <div className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted)]">
              New station
            </div>
            <form action={createStation} className="mt-3 grid gap-3">
              <StationFields />
              <button type="submit" className="btn-primary station-action w-full">
                Add station
              </button>
              <a href="#stations" className="btn-secondary station-action w-full">
                Close
              </a>
            </form>
          </div>
        </div>

        {(stations ?? []).map((station) => (
          <div key={`station-view-${station.id}`} id={`station-view-${station.id}`} className="station-modal">
            <a href="#stations" className="station-modal__overlay" aria-label="Close" />
            <div className="station-modal__content card p-3" style={{ padding: "12px" }}>
              <div className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted)]">
                Station
              </div>
              <div
                className="mt-3 space-y-3 text-sm text-[color:var(--ink)]"
                style={{ marginBottom: "12px" }}
              >
                <div>
                  <div className="text-xs text-[color:var(--muted)]">Code</div>
                  <div className="font-semibold">{station.code}</div>
                </div>
                <div>
                  <div className="text-xs text-[color:var(--muted)]">Name</div>
                  <div className="font-semibold">{station.name}</div>
                </div>
                <div className="flex items-center justify-between text-xs text-[color:var(--muted)]">
                  <span>State</span>
                  <span>{station.state ?? "—"}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-[color:var(--muted)]">
                  <span>Created</span>
                  <span>{formatDate(station.created_at)}</span>
                </div>
              </div>
              <a href="#stations" className="btn-secondary station-action w-full">
                Close
              </a>
            </div>
          </div>
        ))}

        {(stations ?? []).map((station) => (
          <div key={`station-edit-${station.id}`} id={`station-edit-${station.id}`} className="station-modal">
            <a href="#stations" className="station-modal__overlay" aria-label="Close" />
            <div className="station-modal__content card p-3" style={{ padding: "12px" }}>
              <a href="#stations" className="station-modal__close" aria-label="Close">
                ×
              </a>
              <div className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted)]">
                Edit station
              </div>
              <form action={updateStation} className="mt-3 grid gap-3">
                <input type="hidden" name="id" value={station.id} />
                <StationFields
                  defaults={{
                    code: station.code,
                    name: station.name,
                    state: station.state ?? "",
                  }}
                />
                <div className="mt-2 flex items-center justify-end gap-2">
                  <button type="submit" className="btn-secondary station-action">
                    Save changes
                  </button>
                  <button
                    type="submit"
                    form={`station-delete-${station.id}`}
                    className="btn-secondary station-action text-rose-300"
                  >
                    Delete station
                  </button>
                </div>
              </form>
              <form action={deleteStation} id={`station-delete-${station.id}`}>
                <input type="hidden" name="id" value={station.id} />
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

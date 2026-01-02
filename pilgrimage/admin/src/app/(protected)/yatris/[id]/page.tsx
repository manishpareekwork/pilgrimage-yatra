import { approveRegistration, rejectRegistration } from "./actions";
import { QuickEditForm } from "./QuickEditForm";
import { UploadThumbnails } from "./UploadThumbnails";
import { getServerSupabase } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import Link from "next/link";
import { FormSection, PageHeader } from "@/components/ui";

const formatDateTime = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-GB");
};

const formatStatus = (status?: string | null) => {
  if (!status) return "Submitted";
  return status.replace(/_/g, " ");
};

const StatusPill = ({ status, className = "" }: { status?: string | null; className?: string }) => {
  const base = `inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${className}`.trim();
  const label = formatStatus(status);
  switch (status) {
    case "approved":
      return (
        <span className={`${base} bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200`}>
          {label}
        </span>
      );
    case "rejected":
      return (
        <span className={`${base} bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200`}>
          {label}
        </span>
      );
    case "needs_review":
      return (
        <span className={`${base} bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200`}>
          {label}
        </span>
      );
    default:
      return (
        <span className={`${base} bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-200`}>
          {label}
        </span>
      );
  }
};

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export default async function YatriDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const createdValue = Array.isArray(sp?.created) ? sp?.created[0] : sp?.created;
  const orchestratorUrl = process.env.NEXT_PUBLIC_ORCHESTRATOR_URL;
  const supabase = await getServerSupabase();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) redirect("/login");

  const user = userData.user;
  const currentRole =
    (user.app_metadata as Record<string, unknown> | null)?.role ||
    (user.user_metadata as Record<string, unknown> | null)?.role ||
    "yatri";

  const { data: registration, error } = await supabase
    .from("yatra_registrations")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  const isDev = process.env.NODE_ENV !== "production";
  const isNotFound = !registration && (!error || error.code === "PGRST116");

  if (error && !isNotFound) {
    return (
      <FormSection title="Unable to load registration" description="The record could not be fetched.">
        <div className="space-y-3 text-sm text-[color:var(--muted)]">
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-rose-600 dark:text-rose-200">
            Please try again or contact support if this persists.
          </div>
          <dl className="grid gap-2 sm:grid-cols-2">
            <div>
              <dt className="text-[color:var(--subtle)]">Registration ID</dt>
              <dd className="font-semibold text-[color:var(--ink)] break-all">{id}</dd>
            </div>
            <div>
              <dt className="text-[color:var(--subtle)]">Signed in as</dt>
              <dd className="font-semibold text-[color:var(--ink)]">
                {user.email || "—"} · {String(currentRole || "—")}
              </dd>
            </div>
            {isDev && (
              <div className="sm:col-span-2">
                <dt className="text-[color:var(--subtle)]">Supabase error</dt>
                <dd className="font-mono text-xs text-rose-600 dark:text-rose-200">
                  {error.message}
                  {error.code ? ` (code: ${error.code})` : ""}
                </dd>
              </div>
            )}
          </dl>
          <Link
            href="/yatris"
            className="btn-secondary inline-flex items-center"
          >
            Back to Yatris
          </Link>
        </div>
      </FormSection>
    );
  }

  if (isNotFound) {
    return (
      <FormSection title="Registration not found">
        <div className="space-y-3 text-sm text-[color:var(--muted)]">
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-amber-700 dark:text-amber-200">
            We could not find a registration with this ID.
          </div>
          <dl className="grid gap-2 sm:grid-cols-2">
            <div>
              <dt className="text-[color:var(--subtle)]">Registration ID</dt>
              <dd className="font-semibold text-[color:var(--ink)] break-all">{id}</dd>
            </div>
            <div>
              <dt className="text-[color:var(--subtle)]">Signed in as</dt>
              <dd className="font-semibold text-[color:var(--ink)]">
                {user.email || "—"} · {String(currentRole || "—")}
              </dd>
            </div>
            {isDev && (
              <div>
                <dt className="text-[color:var(--subtle)]">Current user ID</dt>
                <dd className="font-mono text-xs text-[color:var(--subtle)] break-all">{user.id}</dd>
              </div>
            )}
          </dl>
          <Link
            href="/yatris"
            className="btn-secondary inline-flex items-center"
          >
            Back to Yatris
          </Link>
        </div>
      </FormSection>
    );
  }

  const created = createdValue === "1";

  return (
    <div className="yatri-detail space-y-6">
      <div className="space-y-2">
        <div className="relative">
          <PageHeader
            className="relative z-30 overflow-visible yatris-hero yatri-detail-hero"
            title={registration.name_hi || "Registration"}
            actions={
              <div className="header-actions flex flex-wrap items-center gap-2">
                <button type="submit" form="quick-edit-form" className="btn-primary inline-flex items-center">
                  Save changes
                </button>
                <form action={approveRegistration}>
                  <input type="hidden" name="id" value={registration.id} />
                  <button
                    type="submit"
                    className="btn-secondary inline-flex items-center text-emerald-600 dark:text-emerald-300"
                  >
                    Approve
                  </button>
                </form>
                <form action={rejectRegistration}>
                  <input type="hidden" name="id" value={registration.id} />
                  <button
                    type="submit"
                    className="btn-secondary inline-flex items-center text-rose-600 dark:text-rose-300"
                  >
                    Reject
                  </button>
                </form>
                <Link href="/yatris" className="btn-secondary inline-flex items-center">
                  Back to list
                </Link>
              </div>
            }
          />
          <div className="detail-thumbs">
            <UploadThumbnails
              registrationId={registration.id}
              photoPath={registration.photo_url}
              formPath={registration.form_image_url}
              orchestratorUrl={orchestratorUrl}
            />
          </div>
        </div>
        <div className="detail-meta flex flex-wrap items-center gap-3 text-xs text-[color:var(--muted)]">
          <StatusPill status={registration.status} className="detail-pill" />
          <span className="detail-pill detail-pill--neutral">ID: {registration.id}</span>
          <span className="detail-pill detail-pill--neutral">Created: {formatDateTime(registration.created_at)}</span>
        </div>
      </div>

      {created && (
        <div className="card border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-200">
          Registration created.
        </div>
      )}

      <div className="space-y-6">
        <QuickEditForm registration={registration} formId="quick-edit-form" />
      </div>
    </div>
  );
}

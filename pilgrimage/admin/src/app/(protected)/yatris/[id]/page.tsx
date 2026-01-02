import { approveRegistration, rejectRegistration } from "./actions";
import { QuickEditForm } from "./QuickEditForm";
import { UploadControls } from "./UploadControls";
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

const StatusPill = ({ status }: { status?: string | null }) => {
  const base = "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold";
  switch (status) {
    case "approved":
      return <span className={`${base} bg-emerald-500/20 text-emerald-300`}>Approved</span>;
    case "rejected":
      return <span className={`${base} bg-rose-500/20 text-rose-300`}>Rejected</span>;
    case "needs_review":
      return <span className={`${base} bg-amber-500/20 text-amber-300`}>Needs Review</span>;
    default:
      return <span className={`${base} bg-slate-500/20 text-slate-300`}>{status || "Submitted"}</span>;
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
        <div className="space-y-3 text-sm text-slate-300">
          <div className="rounded-xl border border-red-500/40 bg-red-950/40 px-3 py-2 text-red-200">
            Please try again or contact support if this persists.
          </div>
          <dl className="grid gap-2 sm:grid-cols-2">
            <div>
              <dt className="text-slate-500">Registration ID</dt>
              <dd className="font-semibold text-slate-100 break-all">{id}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Signed in as</dt>
              <dd className="font-semibold text-slate-100">
                {user.email || "—"} · {String(currentRole || "—")}
              </dd>
            </div>
            {isDev && (
              <div className="sm:col-span-2">
                <dt className="text-slate-500">Supabase error</dt>
                <dd className="font-mono text-xs text-red-200">
                  {error.message}
                  {error.code ? ` (code: ${error.code})` : ""}
                </dd>
              </div>
            )}
          </dl>
          <Link
            href="/yatris"
            className="inline-flex rounded-xl border border-slate-700/60 px-4 py-2 text-sm text-slate-200"
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
        <div className="space-y-3 text-sm text-slate-300">
          <div className="rounded-xl border border-amber-500/30 bg-amber-950/40 px-3 py-2 text-amber-200">
            We could not find a registration with this ID.
          </div>
          <dl className="grid gap-2 sm:grid-cols-2">
            <div>
              <dt className="text-slate-500">Registration ID</dt>
              <dd className="font-semibold text-slate-100 break-all">{id}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Signed in as</dt>
              <dd className="font-semibold text-slate-100">
                {user.email || "—"} · {String(currentRole || "—")}
              </dd>
            </div>
            {isDev && (
              <div>
                <dt className="text-slate-500">Current user ID</dt>
                <dd className="font-mono text-xs text-slate-400 break-all">{user.id}</dd>
              </div>
            )}
          </dl>
          <Link
            href="/yatris"
            className="inline-flex rounded-xl border border-slate-700/60 px-4 py-2 text-sm text-slate-200"
          >
            Back to Yatris
          </Link>
        </div>
      </FormSection>
    );
  }

  const created = createdValue === "1";

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <PageHeader
          title={registration.name_hi || "Registration"}
          subtitle="Review details, uploads, and quick edits."
          actions={
            <>
              <button
                type="submit"
                form="quick-edit-form"
                className="rounded-xl bg-gradient-to-r from-orange-500 to-sky-500 px-4 py-2 text-sm font-semibold text-black shadow"
              >
                Save changes
              </button>
              <form action={approveRegistration}>
                <input type="hidden" name="id" value={registration.id} />
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
                >
                  Approve
                </button>
              </form>
              <form action={rejectRegistration}>
                <input type="hidden" name="id" value={registration.id} />
                <button
                  type="submit"
                  className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-500"
                >
                  Reject
                </button>
              </form>
              <Link
                href="/yatris"
                className="rounded-xl border border-slate-700/60 px-4 py-2 text-sm text-slate-200"
              >
                Back to list
              </Link>
            </>
          }
        />
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
          <StatusPill status={registration.status} />
          <span>ID: {registration.id}</span>
          <span>Created: {formatDateTime(registration.created_at)}</span>
        </div>
      </div>

      {created && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200">
          Registration created.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <QuickEditForm registration={registration} formId="quick-edit-form" />
        </div>
        <div className="space-y-6">
          <UploadControls
            registrationId={registration.id}
            initialPhotoPath={registration.photo_url}
            initialFormPath={registration.form_image_url}
            orchestratorUrl={orchestratorUrl}
          />
        </div>
      </div>
    </div>
  );
}

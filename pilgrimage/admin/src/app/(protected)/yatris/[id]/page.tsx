import { YatriDetailClient } from "./YatriDetailClient";
import { getServerSupabase } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import Link from "next/link";
import { FormSection } from "@/components/ui";

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
    <YatriDetailClient
      registration={registration}
      orchestratorUrl={orchestratorUrl}
      created={created}
    />
  );
}

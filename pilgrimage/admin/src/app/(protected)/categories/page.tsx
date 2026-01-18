import Link from "next/link";
import { PageHeader, TextInput } from "@/components/ui";
import { FormStatusOverlay } from "@/components/GlobalLoading";
import { requireStaff } from "@/lib/roleGuard";
import { getActionSupabase } from "@/lib/supabaseServer";
import { revalidatePath } from "next/cache";

type BucketRow = {
  id: string;
  name: string;
  whatsapp_group_ref: string | null;
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

async function createCategory(formData: FormData) {
  "use server";
  const name = toText(formData.get("name"));
  const whatsapp = toText(formData.get("whatsapp_group_ref")) || null;
  if (!name) return;

  const supabase = await getActionSupabase();
  await supabase.from("yatra_categories").insert({ name, whatsapp_group_ref: whatsapp });
  revalidatePath("/categories");
  revalidatePath("/masters/buckets");
}

async function updateCategory(formData: FormData) {
  "use server";
  const id = toText(formData.get("id"));
  const name = toText(formData.get("name"));
  const whatsapp = toText(formData.get("whatsapp_group_ref")) || null;
  if (!id || !name) return;

  const supabase = await getActionSupabase();
  await supabase.from("yatra_categories").update({ name, whatsapp_group_ref: whatsapp }).eq("id", id);
  revalidatePath("/categories");
  revalidatePath("/masters/buckets");
}

async function deleteCategory(formData: FormData) {
  "use server";
  const id = toText(formData.get("id"));
  if (!id) return;

  const supabase = await getActionSupabase();
  await supabase.from("yatra_categories").delete().eq("id", id);
  revalidatePath("/categories");
  revalidatePath("/masters/buckets");
}

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { supabase } = await requireStaff();
  const params = (await searchParams) ?? {};
  const queryParam = Array.isArray(params.q) ? params.q?.[0] : params.q;
  const q = queryParam?.trim() ?? "";

  let query = supabase
    .from("yatra_categories")
    .select("id, name, whatsapp_group_ref, created_at")
    .order("name");

  if (q) {
    query = query.or(`name.ilike.%${q}%,whatsapp_group_ref.ilike.%${q}%`);
  }

  const { data: categories, error } = await query;
  const buckets = (categories ?? []) as BucketRow[];
  const bucketCount = buckets.length;

  return (
    <div id="buckets" className="yatris-grid masters-buckets flex flex-col gap-6">
      <PageHeader
        className="relative z-30 overflow-visible yatris-hero"
        title="Yatri Buckets"
        subtitle="Manage grouping buckets and optional WhatsApp references."
        actions={
          <div className="header-actions flex flex-wrap items-center gap-2">
            <a href="#bucket-create" className="btn-primary master-action inline-flex items-center">
              + Add bucket
            </a>
          </div>
        }
      />

      <div className="card relative z-20 p-6 space-y-4 overflow-visible filters-compact">
        <div className="space-y-3">
          <div className="flex flex-wrap items-end gap-2">
            <form method="get" className="flex flex-wrap items-end gap-2">
              <div className="w-full sm:w-72 lg:w-80">
                <TextInput name="q" placeholder="Search bucket or WhatsApp ref" defaultValue={q} />
              </div>
              <button type="submit" className="btn-secondary min-h-[36px]">
                Search
              </button>
            </form>
            {q && (
              <Link href="/masters/buckets" className="btn-secondary min-h-[36px]">
                Clear search
              </Link>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[color:var(--muted)]">
            <span>
              {q ? `Results for "${q}"` : `Showing ${bucketCount} buckets`}
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
        {!error && bucketCount === 0 && (
          <div className="card p-6 text-center">
            <div className="text-lg font-semibold text-[color:var(--ink)]">No buckets found</div>
            <p className="mt-2 text-sm text-[color:var(--muted)]">
              Add a bucket to start grouping yatris.
            </p>
          </div>
        )}

        {!error && bucketCount > 0 && (
          <div className="card rounded-none overflow-visible p-2">
            <div className="overflow-x-auto overflow-y-visible p-2">
              <table className="min-w-full bg-[color:var(--surface)] text-[12px] text-center">
                <thead className="sticky top-0 bg-[color:var(--surface-muted)] text-[11px] font-semibold text-[color:var(--muted)] border-b border-[color:var(--border)]">
                  <tr>
                    <th className="h-[45px] px-4 py-0 align-middle text-center">Bucket</th>
                    <th className="h-[45px] px-4 py-0 align-middle text-center border-l border-[color:var(--border)]/60">
                      WhatsApp Ref
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
                  {buckets.map((bucket) => (
                    <tr
                      key={bucket.id}
                      className="odd:bg-[color:var(--surface-muted)]/35 even:bg-[color:var(--surface)] hover:bg-[color:var(--surface-muted)]/60"
                    >
                      <td className="px-4 py-2.5 align-middle text-center font-semibold text-[color:var(--ink)]">
                        {bucket.name}
                      </td>
                      <td className="px-4 py-2.5 align-middle text-center border-l border-[color:var(--border)]/60 text-[color:var(--muted)]">
                        {bucket.whatsapp_group_ref ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 align-middle text-center border-l border-[color:var(--border)]/60 text-[color:var(--muted)]">
                        {formatDate(bucket.created_at)}
                      </td>
                      <td className="px-4 py-2.5 align-middle text-center border-l border-[color:var(--border)]/60">
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          <a
                            href={`#bucket-view-${bucket.id}`}
                            className="btn-secondary master-action"
                          >
                            View
                          </a>
                          <a
                            href={`#bucket-edit-${bucket.id}`}
                            className="btn-secondary master-action"
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

        <div id="bucket-create" className="master-modal">
          <a href="#buckets" className="master-modal__overlay" aria-label="Close" />
          <div className="master-modal__content card p-3" style={{ padding: "12px" }}>
            <div className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted)]">
              New bucket
            </div>
            <form action={createCategory} className="mt-3 grid gap-3">
              <FormStatusOverlay message="Creating bucket..." />
              <TextInput name="name" placeholder="Bucket name" required />
              <TextInput name="whatsapp_group_ref" placeholder="WhatsApp group ref (optional)" />
              <button type="submit" className="btn-primary master-action w-full">
                Add bucket
              </button>
              <a href="#buckets" className="btn-secondary master-action w-full">
                Close
              </a>
            </form>
          </div>
        </div>

        {buckets.map((bucket) => (
          <div key={`bucket-view-${bucket.id}`} id={`bucket-view-${bucket.id}`} className="master-modal">
            <a href="#buckets" className="master-modal__overlay" aria-label="Close" />
            <div className="master-modal__content card p-3" style={{ padding: "12px" }}>
              <div className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted)]">
                Bucket details
              </div>
              <div
                className="mt-3 space-y-3 text-sm text-[color:var(--ink)]"
                style={{ marginBottom: "12px" }}
              >
                <div>
                  <div className="text-xs text-[color:var(--muted)]">Bucket</div>
                  <div className="font-semibold">{bucket.name}</div>
                </div>
                <div className="flex items-center justify-between text-xs text-[color:var(--muted)]">
                  <span>WhatsApp</span>
                  <span>{bucket.whatsapp_group_ref ?? "—"}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-[color:var(--muted)]">
                  <span>Created</span>
                  <span>{formatDate(bucket.created_at)}</span>
                </div>
              </div>
              <a href="#buckets" className="btn-secondary master-action w-full">
                Close
              </a>
            </div>
          </div>
        ))}

        {buckets.map((bucket) => (
          <div key={`bucket-edit-${bucket.id}`} id={`bucket-edit-${bucket.id}`} className="master-modal">
            <a href="#buckets" className="master-modal__overlay" aria-label="Close" />
            <div className="master-modal__content card p-3" style={{ padding: "12px" }}>
              <a href="#buckets" className="master-modal__close" aria-label="Close">
                ×
              </a>
              <div className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted)]">
                Edit bucket
              </div>
              <form action={updateCategory} className="mt-3 grid gap-3">
                <FormStatusOverlay message="Saving bucket..." />
                <input type="hidden" name="id" value={bucket.id} />
                <TextInput name="name" defaultValue={bucket.name} required />
                <TextInput
                  name="whatsapp_group_ref"
                  defaultValue={bucket.whatsapp_group_ref ?? ""}
                  placeholder="WhatsApp group ref"
                />
                <div className="mt-2 flex items-center justify-end gap-2">
                  <button type="submit" className="btn-secondary master-action">
                    Save changes
                  </button>
                  <button
                    type="submit"
                    form={`bucket-delete-${bucket.id}`}
                    className="btn-secondary master-action text-rose-300"
                  >
                    Delete bucket
                  </button>
                </div>
              </form>
              <form action={deleteCategory} id={`bucket-delete-${bucket.id}`}>
                <FormStatusOverlay message="Deleting bucket..." />
                <input type="hidden" name="id" value={bucket.id} />
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

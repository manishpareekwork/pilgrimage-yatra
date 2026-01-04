import { PageHeader, FormSection, TextInput } from "@/components/ui";
import { requireStaff } from "@/lib/roleGuard";
import { getActionSupabase } from "@/lib/supabaseServer";
import { revalidatePath } from "next/cache";

async function createCategory(formData: FormData) {
  "use server";
  const name = formData.get("name")?.toString().trim();
  const whatsapp = formData.get("whatsapp_group_ref")?.toString().trim() || null;
  if (!name) return;

  const supabase = await getActionSupabase();
  await supabase.from("yatra_categories").insert({ name, whatsapp_group_ref: whatsapp });
  revalidatePath("/categories");
  revalidatePath("/masters/buckets");
}

async function updateCategory(formData: FormData) {
  "use server";
  const id = formData.get("id")?.toString().trim();
  const name = formData.get("name")?.toString().trim();
  const whatsapp = formData.get("whatsapp_group_ref")?.toString().trim() || null;
  if (!id || !name) return;

  const supabase = await getActionSupabase();
  await supabase.from("yatra_categories").update({ name, whatsapp_group_ref: whatsapp }).eq("id", id);
  revalidatePath("/categories");
  revalidatePath("/masters/buckets");
}

async function deleteCategory(formData: FormData) {
  "use server";
  const id = formData.get("id")?.toString().trim();
  if (!id) return;

  const supabase = await getActionSupabase();
  await supabase.from("yatra_categories").delete().eq("id", id);
  revalidatePath("/categories");
  revalidatePath("/masters/buckets");
}

export default async function CategoriesPage() {
  const { supabase } = await requireStaff();
  const { data: categories, error } = await supabase
    .from("yatra_categories")
    .select("id, name, whatsapp_group_ref, created_at")
    .order("name");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Yatri Buckets"
        subtitle="Manage grouping buckets and optional WhatsApp references."
      />

      <FormSection title="Add bucket">
        <form action={createCategory} className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_1fr_auto]">
          <TextInput name="name" placeholder="Bucket name" required />
          <TextInput name="whatsapp_group_ref" placeholder="WhatsApp group ref (optional)" />
          <button type="submit" className="btn-primary">Add</button>
        </form>
      </FormSection>

      <FormSection title="Existing buckets" description="Update or remove buckets.">
        {error && (
          <div className="mb-4 rounded-xl border border-rose-500/40 bg-rose-950/40 p-3 text-sm text-rose-200">
            {error.message}
          </div>
        )}
        <div className="overflow-hidden rounded-xl border border-slate-800/60">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-900 text-left text-xs font-semibold uppercase text-slate-300">
              <tr>
                <th className="px-4 py-3">Bucket</th>
                <th className="px-4 py-3">WhatsApp Ref</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {(categories ?? []).map((category) => (
                <tr key={category.id} className="hover:bg-slate-900/40">
                  <td className="px-4 py-3">
                    <form action={updateCategory} className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="id" value={category.id} />
                      <TextInput name="name" defaultValue={category.name} required />
                      <TextInput
                        name="whatsapp_group_ref"
                        defaultValue={category.whatsapp_group_ref ?? ""}
                        placeholder="WhatsApp ref"
                      />
                      <button type="submit" className="btn-secondary">Save</button>
                    </form>
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {category.whatsapp_group_ref || "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {new Date(category.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <form action={deleteCategory}>
                      <input type="hidden" name="id" value={category.id} />
                      <button type="submit" className="btn-secondary text-rose-300">Delete</button>
                    </form>
                  </td>
                </tr>
              ))}
              {categories?.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                    No buckets yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </FormSection>
    </div>
  );
}

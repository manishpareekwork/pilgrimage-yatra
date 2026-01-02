import { getServerSupabase } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import { CreateUserForm } from "./CreateUserForm";
import { FormSection } from "@/components/ui";

export default async function UsersPage() {
  const supabase = await getServerSupabase();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) redirect("/login");

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();

  const myRole =
    me?.role ||
    ((userData.user.app_metadata as Record<string, unknown> | null)?.role as
      string | undefined);

  if (myRole !== "admin") {
    redirect("/dashboard");
  }

  const { data: users, error } = await supabase
    .from("profiles")
    .select("id, role, name_hi, phone, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <CreateUserForm />

      {error && (
        <FormSection title="Profiles">
          <div className="rounded-xl border border-red-500/40 bg-red-950/40 p-4 text-sm text-red-200">
            {error.message}
          </div>
        </FormSection>
      )}

      <FormSection title="Profiles" description="Latest users and roles.">
        <div className="overflow-hidden rounded-xl border border-slate-800/60">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-900 text-left text-xs font-semibold uppercase text-slate-300">
              <tr>
                <th className="px-4 py-3">User ID</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {(users ?? []).map((user) => (
                <tr key={user.id} className="hover:bg-slate-900/40">
                  <td className="px-4 py-3 font-mono text-xs text-slate-300">
                    {user.id}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full border border-slate-700/60 bg-slate-950/40 px-2 py-1 text-xs uppercase text-slate-300">
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-100">
                    {user.name_hi || "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {user.phone || "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {new Date(user.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
              {users?.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                    No users found. Seed admin/reviewer users in Supabase Auth.
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

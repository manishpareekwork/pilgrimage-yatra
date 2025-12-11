import { getServerSupabase } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import { CreateUserForm } from "./CreateUserForm";

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
    <div className="space-y-5">
      <div className="card p-6 bg-white/90 border border-orange-100/70">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-orange-600 font-semibold">
              Access Control
            </p>
            <h1 className="text-2xl font-semibold text-slate-900">Users</h1>
            <p className="text-sm text-slate-600">
              Admin-only view of Supabase profiles (email managed in Supabase Auth).
            </p>
          </div>
          <div className="pill bg-orange-50 text-orange-700 border border-orange-100">
            Admin role required
          </div>
        </div>
      </div>

      <CreateUserForm />

      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {error.message}
        </div>
      )}
      <div className="overflow-hidden card bg-white/95">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-900 text-left font-semibold text-white uppercase text-xs">
            <tr>
              <th className="px-4 py-3">User ID</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(users ?? []).map((user) => (
              <tr key={user.id} className="hover:bg-orange-50/60">
                <td className="px-4 py-3 font-mono text-xs text-slate-700">
                  {user.id}
                </td>
                <td className="px-4 py-3">
                  <span className="pill bg-slate-100 text-slate-700 uppercase">
                    {user.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-900">
                  {user.name_hi || "—"}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {user.phone || "—"}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {new Date(user.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
            {users?.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-6 text-center text-slate-500"
                >
                  No users found. Seed admin/reviewer users in Supabase Auth.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

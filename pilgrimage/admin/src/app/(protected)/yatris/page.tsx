import { getServerSupabase } from "@/lib/supabaseServer";
import Link from "next/link";
import { redirect } from "next/navigation";

type SearchParams = {
  status?: string;
  search?: string;
};

export default async function YatrisPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await getServerSupabase();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) redirect("/login");

  const status = searchParams.status ?? "";
  const search = searchParams.search?.toString().trim() ?? "";
  const safeSearch = search.replace(/[,%]/g, "");

  let query = supabase
    .from("yatra_registrations")
    .select("id,name_hi,phone,status,created_at")
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  if (safeSearch) {
    const likeValue = `%${safeSearch}%`;
    query = query.or(`name_hi.ilike.${likeValue},phone.ilike.${likeValue}`);
  }

  const { data, error } = await query;

  if (error) {
    return (
      <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-md p-3">
        Failed to load registrations: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card p-6 bg-white/90 border border-orange-100/70">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-orange-600 font-semibold">
              Registrations
            </p>
            <h1 className="text-2xl font-semibold text-slate-900">Yatris</h1>
            <p className="text-sm text-slate-600">
              Filter by status or search by name/phone.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <form className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <select
                name="status"
                defaultValue={status}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-orange-300 focus:ring-2 focus:ring-orange-200"
              >
                <option value="">All statuses</option>
                <option value="submitted">Submitted</option>
                <option value="needs_review">Needs Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
              <input
                name="search"
                defaultValue={search}
                placeholder="Search name or phone"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-orange-300 focus:ring-2 focus:ring-orange-200"
              />
              <button
                type="submit"
                className="btn-primary text-sm px-5 py-2"
              >
                Apply
              </button>
            </form>
            <Link
              href="/yatris/new"
              className="rounded-xl bg-slate-900 text-white px-4 py-2 text-sm font-semibold hover:bg-slate-800 shadow"
            >
              + New
            </Link>
          </div>
        </div>
      </div>

      <div className="overflow-hidden card bg-white/95">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-900 text-left text-xs font-semibold text-white uppercase">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {(data ?? []).map((row) => (
              <tr key={row.id} className="hover:bg-orange-50/60">
                <td className="px-4 py-3 font-medium text-slate-900">
                  {row.name_hi}
                </td>
                <td className="px-4 py-3 text-slate-700">{row.phone}</td>
                <td className="px-4 py-3">
                  <span className="pill bg-slate-100 text-slate-700 uppercase">
                    {row.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {new Date(row.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/yatris/${row.id}`}
                    className="font-semibold text-orange-700 hover:text-orange-900"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
            {data?.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-6 text-center text-slate-500"
                >
                  No registrations found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

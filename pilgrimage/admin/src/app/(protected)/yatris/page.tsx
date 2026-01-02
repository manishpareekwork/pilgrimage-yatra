import { getServerSupabase } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import { exportYatrisRows } from "./actions";
import { YatrisGrid } from "./YatrisGrid";
import { buildYatrisQuery, parseListParams } from "./query";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function YatrisPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await getServerSupabase();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) redirect("/login");

  const params = await searchParams;
  const listParams = parseListParams(params);

  const currentRole =
    (userData.user.app_metadata as Record<string, unknown> | null)?.role ||
    (userData.user.user_metadata as Record<string, unknown> | null)?.role ||
    "yatri";

  const from = (listParams.page - 1) * listParams.pageSize;
  const to = from + listParams.pageSize - 1;

  const query = buildYatrisQuery(supabase, listParams, true).range(from, to);
  const { data, error, count } = await query;

  return (
    <YatrisGrid
      rows={data ?? []}
      totalCount={count ?? 0}
      page={listParams.page}
      pageSize={listParams.pageSize}
      filters={listParams}
      currentRole={String(currentRole)}
      error={error?.message ?? null}
      exportAction={exportYatrisRows}
    />
  );
}

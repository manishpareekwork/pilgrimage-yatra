import { PageHeader, FormSection } from "@/components/ui";
import { requireStaff } from "@/lib/roleGuard";
import { IdCardPrintClient } from "./IdCardPrintClient";

export default async function IdCardsPrintPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { supabase } = await requireStaff();
  const params = (await searchParams) ?? {};
  const rawIds = Array.isArray(params.ids)
    ? params.ids?.[0]
    : params.ids;
  const ids = rawIds
    ? rawIds
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
    : [];

  if (!ids.length) {
    return (
      <div className="space-y-6">
        <PageHeader title="ID Cards" subtitle="Select yatris to print ID cards." />
        <FormSection title="No IDs provided">
          <div className="text-sm text-[color:var(--muted)]">
            Add ids via the query string: <code>?ids=uuid1,uuid2</code>
          </div>
        </FormSection>
      </div>
    );
  }

  const { data, error } = await supabase.rpc("fn_id_card_data", {
    p_registration_ids: ids,
  });

  if (error) {
    return (
      <FormSection title="Unable to load ID cards">
        <div className="rounded-xl border border-rose-500/40 bg-rose-950/40 p-3 text-sm text-rose-200">
          {error.message}
        </div>
      </FormSection>
    );
  }

  return (
    <div className="space-y-6">
      <IdCardPrintClient rows={data ?? []} />
    </div>
  );
}

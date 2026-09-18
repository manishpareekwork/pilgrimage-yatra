import { Suspense } from "react";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/ui";
import { requireStaff } from "@/lib/roleGuard";
import { fetchImportBucketOptions } from "@/lib/importBuckets";
import { RailwayReservationBuilder } from "./RailwayReservationBuilder";

export default async function RailwayReservationPage() {
  const { supabase } = await requireStaff();
  const importBuckets = await fetchImportBucketOptions(supabase);
  const { data: trips, error } = await supabase
    .from("yatra_trips")
    .select(
      "id, trip_name, trip_kind, journey_date, mode, train_no, from_station_code, to_station_code"
    )
    .order("journey_date", { ascending: false });

  return (
    <div className="page-stack page-stack--cm257">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/dashboard" },
          { label: "Train booking", href: "/bookings/committee-train" },
          { label: "CM257 forms" },
        ]}
      />
      {error && (
        <PageHeader
          title="Railway reservation forms"
          subtitle={error.message}
        />
      )}
      {!error && (
        <Suspense fallback={<p className="text-sm text-[color:var(--muted)]">Loading…</p>}>
          <RailwayReservationBuilder trips={trips ?? []} importBuckets={importBuckets} />
        </Suspense>
      )}
    </div>
  );
}

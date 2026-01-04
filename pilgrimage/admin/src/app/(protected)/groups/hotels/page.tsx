import { PageHeader, FormSection } from "@/components/ui";
import { requireStaff } from "@/lib/roleGuard";
import { HotelGroupsClient } from "./HotelGroupsClient";

export default async function HotelGroupsPage() {
  await requireStaff();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hotel Groups"
        subtitle="View hotel rooms, occupants, and set in-charges."
      />

      <FormSection title="Hotel occupancy">
        <HotelGroupsClient />
      </FormSection>
    </div>
  );
}

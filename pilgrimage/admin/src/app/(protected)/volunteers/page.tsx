import { PageHeader } from "@/components/ui";
import { requireStaff } from "@/lib/roleGuard";
import { VolunteerAssignmentsClient } from "./VolunteerAssignmentsClient";

export default async function VolunteersPage() {
  await requireStaff();

  return (
    <div id="volunteers" className="yatris-grid volunteers-grid flex flex-col gap-6">
      <PageHeader
        className="relative z-30 overflow-visible yatris-hero"
        title="Volunteer Assignments"
        subtitle="Assign members to volunteer roles and set group manager/lead."
      />

      <VolunteerAssignmentsClient />
    </div>
  );
}

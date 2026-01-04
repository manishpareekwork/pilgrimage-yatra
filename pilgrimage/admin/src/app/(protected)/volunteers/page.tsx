import { PageHeader, FormSection } from "@/components/ui";
import { requireStaff } from "@/lib/roleGuard";
import { VolunteerAssignmentsClient } from "./VolunteerAssignmentsClient";

export default async function VolunteersPage() {
  await requireStaff();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Volunteer Assignments"
        subtitle="Assign yatris to volunteer roles and set SPOC per role."
      />

      <FormSection title="Roles & Members">
        <VolunteerAssignmentsClient />
      </FormSection>
    </div>
  );
}

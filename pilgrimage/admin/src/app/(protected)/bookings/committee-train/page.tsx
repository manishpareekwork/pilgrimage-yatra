import Link from "next/link";
import { CommitteeTrainWorkflow } from "@/components/workflow/CommitteeTrainWorkflow";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { QuickActionsBar } from "@/components/layout/QuickActionsBar";
import { FormSection, PageHeader } from "@/components/ui";
import {
  CM257_LOCAL_PDF_PATH,
  CM257_OFFICIAL_PDF_URL,
} from "@/lib/railwayReservation/cm257Official";
import { requireStaff } from "@/lib/roleGuard";

export default async function CommitteeTrainHubPage() {
  await requireStaff();

  return (
    <div className="page-stack">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/dashboard" },
          { label: "Train booking" },
        ]}
      />
      <PageHeader
        title="Committee train booking"
        subtitle="Guided path from yatri registration to CM257 counter forms for Indian Railways."
        kicker="Railway PRS"
        actions={
          <Link href="/bookings/railway-reservation" className="btn-primary">
            Go to CM257 builder
          </Link>
        }
      />

      <FormSection title="Quick actions">
        <QuickActionsBar />
      </FormSection>

      <FormSection
        title="Workflow"
        description="Follow these steps in order. You can jump back to any step when data changes."
      >
        <CommitteeTrainWorkflow currentStep="register" />
      </FormSection>

      <FormSection
        title="Official CM257 template"
        description="Our print layout follows the Indian Railways requisition form. For pixel-perfect alignment, use the official PDF as reference or background."
      >
        <ul className="list-disc space-y-3 pl-5 text-sm text-[color:var(--muted)]">
          <li>
            <a
              href={CM257_OFFICIAL_PDF_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-500 underline"
            >
              Download official CM257 PDF (SCR)
            </a>
          </li>
          <li>
            Optional local copy:{" "}
            <a href={CM257_LOCAL_PDF_PATH} className="text-sky-500 underline">
              {CM257_LOCAL_PDF_PATH}
            </a>{" "}
            — export page 1 as <code className="text-xs">cm257-en.png</code> for print overlay (see{" "}
            <code className="text-xs">public/forms/README.md</code>).
          </li>
        </ul>
      </FormSection>
    </div>
  );
}

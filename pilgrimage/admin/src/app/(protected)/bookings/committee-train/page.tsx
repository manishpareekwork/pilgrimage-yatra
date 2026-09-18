import Link from "next/link";
import { CommitteeTrainWorkflow } from "@/components/workflow/CommitteeTrainWorkflow";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { CommitteeTrainStepBar } from "@/components/workflow/CommitteeTrainStepBar";
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

      <CommitteeTrainStepBar currentStep="register" />

      <FormSection
        title="What to do at each step"
        description="Register yatris → set train + committee reservation on the roster → optional co-travel groups → generate CM257 and Save as PDF at the counter."
      >
        <CommitteeTrainWorkflow currentStep="register" compact />
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

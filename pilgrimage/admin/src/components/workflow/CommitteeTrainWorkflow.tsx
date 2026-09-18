import Link from "next/link";

export type CommitteeTrainStepId = "register" | "reservation" | "organize" | "cm257";

const STEPS: {
  id: CommitteeTrainStepId;
  title: string;
  summary: string;
  href: string;
  cta: string;
}[] = [
  {
    id: "register",
    title: "1. Register yatris",
    summary: "Add names, contact, ID, and travel intent on the roster.",
    href: "/yatris/new",
    cta: "New registration",
  },
  {
    id: "reservation",
    title: "2. Reservation details",
    summary: "Set travel mode Train, reservation By committee, class, and sheet/bucket.",
    href: "/yatris?travel=committee-train&travel_mode=train",
    cta: "Open roster",
  },
  {
    id: "organize",
    title: "3. Groups & buckets",
    summary: "Build co-travel groups (max 6 per CM257) or filter by import sheet (SFS-1, etc.).",
    href: "/groups/train",
    cta: "Travel groups",
  },
  {
    id: "cm257",
    title: "4. CM257 forms",
    summary: "Select passengers, generate forms (6 per sheet), print or Save as PDF.",
    href: "/bookings/railway-reservation",
    cta: "Generate forms",
  },
];

export function CommitteeTrainWorkflow({
  currentStep = "cm257",
  compact = false,
}: {
  currentStep?: CommitteeTrainStepId;
  compact?: boolean;
}) {
  return (
    <nav
      className={`committee-flow ${compact ? "committee-flow--compact" : ""}`}
      aria-label="Committee train booking workflow"
    >
      {!compact ? (
        <div className="committee-flow__intro">
          <p className="committee-flow__kicker">End-to-end flow</p>
          <p className="committee-flow__lead">
            Register → set committee train reservation → group or bucket → print official{" "}
            <strong>CM257</strong> at the PRS counter.
          </p>
        </div>
      ) : null}
      <ol className="committee-flow__steps">
        {STEPS.map((step) => {
          const active = step.id === currentStep;
          return (
            <li
              key={step.id}
              className={`committee-flow__step${active ? " committee-flow__step--active" : ""}`}
            >
              <div className="committee-flow__step-head">
                <span className="committee-flow__step-title">{step.title}</span>
                {active ? (
                  <span className="committee-flow__badge">You are here</span>
                ) : null}
              </div>
              <p className="committee-flow__step-summary">{step.summary}</p>
              {active && step.id === "cm257" ? (
                <span className="text-xs text-[color:var(--muted)]">
                  Use the passenger list and <strong>Generate &amp; PDF</strong> below.
                </span>
              ) : (
                <Link
                  href={step.href}
                  className={active ? "btn-primary committee-flow__cta" : "btn-secondary committee-flow__cta"}
                >
                  {step.cta}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

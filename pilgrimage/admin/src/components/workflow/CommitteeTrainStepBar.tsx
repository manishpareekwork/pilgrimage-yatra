import Link from "next/link";
import type { CommitteeTrainStepId } from "./CommitteeTrainWorkflow";

const STEPS: { id: CommitteeTrainStepId; short: string; href: string }[] = [
  { id: "register", short: "Register", href: "/yatris/new" },
  { id: "reservation", short: "Reservation", href: "/yatris?travel=committee-train&travel_mode=train" },
  { id: "organize", short: "Groups", href: "/groups/train" },
  { id: "cm257", short: "CM257 PDF", href: "/bookings/railway-reservation" },
];

export function CommitteeTrainStepBar({
  currentStep,
}: {
  currentStep: CommitteeTrainStepId;
}) {
  const currentIndex = STEPS.findIndex((s) => s.id === currentStep);

  return (
    <nav className="train-step-bar" aria-label="Committee train steps">
      <ol className="train-step-bar__list">
        {STEPS.map((step, index) => {
          const done = index < currentIndex;
          const active = step.id === currentStep;
          return (
            <li key={step.id} className="train-step-bar__item">
              {index > 0 ? <span className="train-step-bar__sep" aria-hidden /> : null}
              {active ? (
                <span className="train-step-bar__pill train-step-bar__pill--active">
                  <span className="train-step-bar__num">{index + 1}</span>
                  {step.short}
                </span>
              ) : (
                <Link
                  href={step.href}
                  className={`train-step-bar__pill${done ? " train-step-bar__pill--done" : ""}`}
                >
                  <span className="train-step-bar__num">{index + 1}</span>
                  {step.short}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

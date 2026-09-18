import Link from "next/link";
import { QUICK_ACTIONS } from "@/lib/adminNav";

export function QuickActionsBar({ className = "" }: { className?: string }) {
  return (
    <div className={`quick-actions ${className}`.trim()}>
      {QUICK_ACTIONS.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          className={
            action.tone === "primary" ? "quick-actions__item quick-actions__item--primary" : "quick-actions__item"
          }
        >
          <span className="quick-actions__title">{action.title}</span>
          <span className="quick-actions__desc">{action.description}</span>
        </Link>
      ))}
    </div>
  );
}

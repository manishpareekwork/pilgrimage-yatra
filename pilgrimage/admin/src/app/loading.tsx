import { ChakraSpinner } from "@/components/ui";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-950/40 backdrop-blur-sm">
      <div className="flex min-w-[220px] flex-col items-center gap-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] px-6 py-5 text-center shadow-[var(--shadow-soft)]">
        <ChakraSpinner className="h-8 w-8" title="Loading" />
        <div className="text-sm font-semibold text-[color:var(--ink)]">Loading...</div>
        <div className="text-xs text-[color:var(--muted)]">Please wait...</div>
      </div>
    </div>
  );
}

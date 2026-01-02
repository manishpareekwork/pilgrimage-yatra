export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4">
      <div className="max-w-md text-center space-y-3">
        <div className="text-2xl font-bold text-white">Page not found</div>
        <p className="text-sm text-slate-300">
          The page you’re looking for does not exist. Check the URL or return to the dashboard.
        </p>
        <a
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-orange-400"
        >
          Back to dashboard
        </a>
      </div>
    </div>
  );
}

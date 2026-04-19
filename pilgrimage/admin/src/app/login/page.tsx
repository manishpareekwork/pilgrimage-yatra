"use client";

import { useGlobalLoading } from "@/components/GlobalLoading";
import { getBrowserSupabase } from "@/lib/supabaseBrowser";
import { useRouter } from "next/navigation";
import { useId, useState, FormEvent } from "react";

const showLoginSeedHint =
  process.env.NEXT_PUBLIC_SHOW_LOGIN_SEED_HINT === "true" ||
  process.env.NODE_ENV === "development";

export default function LoginPage() {
  const supabase = getBrowserSupabase();
  const router = useRouter();
  const { startLoading, startNavigation } = useGlobalLoading();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastAttemptAt, setLastAttemptAt] = useState<number | null>(null);
  const [retryAfterMs, setRetryAfterMs] = useState<number>(0);
  const errorId = useId();

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const now = Date.now();
    if (loading) return;
    if (retryAfterMs && now < retryAfterMs) {
      const seconds = Math.ceil((retryAfterMs - now) / 1000);
      setError(`Too many attempts. Please wait ${seconds}s before retrying.`);
      return;
    }
    if (lastAttemptAt && now - lastAttemptAt < 1500) {
      setError("Please wait a moment before trying again.");
      return;
    }
    setLastAttemptAt(now);
    setError(null);
    setLoading(true);
    const stopLoading = startLoading("Signing in...");
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        const message =
          signInError.status === 429
            ? "Too many attempts. Please wait a few seconds before retrying."
            : signInError.message;
        setError(message);
        if (signInError.status === 429) {
          setRetryAfterMs(Date.now() + 5_000);
        }
        return;
      }

      startNavigation("Loading dashboard...");
      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in. Please try again.");
    } finally {
      stopLoading();
      setLoading(false);
    }
  };

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 px-4 py-10 text-slate-200"
    >
      <div className="w-full max-w-md">
        <div className="mb-5 text-center">
          <div
            className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-sky-500 text-lg font-bold text-white shadow-lg"
            aria-hidden="true"
          >
            ॐ
          </div>
          <h1 className="text-xl font-semibold text-white">Pilgrimage Admin</h1>
          <p className="mt-1 text-sm text-slate-400">Sign in to manage yatri registrations</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur-sm">
          <form
            onSubmit={onSubmit}
            className="grid gap-4"
            aria-busy={loading}
            aria-describedby={error ? errorId : undefined}
          >
            <div className="grid gap-2">
              <label htmlFor="email" className="text-sm text-slate-300">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                aria-invalid={error ? true : undefined}
                className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-orange-400/80 focus:outline-none focus:ring-2 focus:ring-sky-400/80 disabled:opacity-60"
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="password" className="text-sm text-slate-300">
                Password
              </label>
              <div className="flex gap-2">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  aria-invalid={error ? true : undefined}
                  className="min-w-0 flex-1 rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-orange-400/80 focus:outline-none focus:ring-2 focus:ring-sky-400/80 disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="shrink-0 rounded-xl border border-white/15 bg-white/5 px-3 text-xs font-semibold text-slate-200 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-sky-400/80 disabled:opacity-60"
                  aria-pressed={showPassword}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  disabled={loading}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>
            {error && (
              <div
                id={errorId}
                role="alert"
                aria-live="polite"
                className="rounded-lg border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-sm text-rose-100"
              >
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-orange-500 via-orange-400 to-sky-500 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-orange-500/25 transition hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-sky-400 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
          {showLoginSeedHint && (
            <p className="mt-4 text-center text-xs text-slate-500">
              Dev hint: seeded users may include <span className="text-slate-400">admin@admin.com</span> /{" "}
              <span className="text-slate-400">12345678</span>
            </p>
          )}
        </div>
      </div>
    </main>
  );
}

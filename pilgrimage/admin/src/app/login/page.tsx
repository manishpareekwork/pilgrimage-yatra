"use client";

import { useGlobalLoading } from "@/components/GlobalLoading";
import { getBrowserSupabase } from "@/lib/supabaseBrowser";
import { useRouter } from "next/navigation";
import { useId, useState, FormEvent } from "react";

const showLoginSeedHint =
  process.env.NEXT_PUBLIC_SHOW_LOGIN_SEED_HINT === "true" ||
  process.env.NODE_ENV === "development";

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
      <path
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 12s3.75-6.75 9.75-6.75S21.75 12 21.75 12s-3.75 6.75-9.75 6.75S2.25 12 2.25 12Z"
      />
      <path strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
    </svg>
  );
}

function EyeOffIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
      <path
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.182 4.182L12 12"
      />
    </svg>
  );
}

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
      className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 px-5 py-14 text-slate-200 sm:px-10"
    >
      <div className="w-full max-w-[420px]">
        <div className="mb-10 text-center">
          <div
            className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-sky-500 text-lg font-bold text-white shadow-lg"
            aria-hidden="true"
          >
            ॐ
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">Pilgrimage Admin</h1>
          <p className="mt-2 text-sm text-slate-400">Sign in to manage yatri registrations</p>
        </div>

        <div className="rounded-2xl border border-white/12 bg-white/[0.07] p-8 shadow-2xl backdrop-blur-md sm:p-10">
          <form
            onSubmit={onSubmit}
            className="grid gap-6"
            aria-busy={loading}
            aria-describedby={error ? errorId : undefined}
          >
            <div className="grid gap-2.5">
              <label htmlFor="email" className="text-sm font-medium text-slate-300">
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
                className="min-h-[46px] w-full rounded-[10px] border border-white/20 bg-white/10 px-3.5 py-2.5 text-sm text-white shadow-inner shadow-black/10 placeholder:text-slate-500 focus:border-orange-400/80 focus:outline-none focus:ring-2 focus:ring-sky-500/45 disabled:opacity-60"
              />
            </div>
            <div className="grid gap-2.5">
              <label htmlFor="password" className="text-sm font-medium text-slate-300">
                Password
              </label>
              <div className="relative">
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
                  className="min-h-[46px] w-full rounded-[10px] border border-white/20 bg-white/10 py-2.5 pl-3.5 pr-12 text-sm text-white placeholder:text-slate-500 shadow-inner shadow-black/10 focus:border-orange-400/80 focus:outline-none focus:ring-2 focus:ring-sky-500/45 disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-1.5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 disabled:opacity-50"
                  aria-pressed={showPassword}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  disabled={loading}
                >
                  {showPassword ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                </button>
              </div>
            </div>
            {error && (
              <div
                id={errorId}
                role="alert"
                aria-live="polite"
                className="rounded-md border border-rose-500/35 bg-rose-950/35 px-3 py-2 text-sm text-rose-100"
              >
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="min-h-[48px] w-full rounded-[10px] bg-gradient-to-r from-orange-500 via-orange-400 to-sky-500 px-4 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-orange-500/25 transition hover:brightness-[1.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
          {showLoginSeedHint && (
            <p className="mt-8 border-t border-white/10 pt-6 text-center text-xs text-slate-500">
              Dev hint: seeded users may include <span className="text-slate-400">admin@admin.com</span> /{" "}
              <span className="text-slate-400">12345678</span>
            </p>
          )}
        </div>
      </div>
    </main>
  );
}

"use client";

import { ChakraSpinner } from "@/components/ui";
import { usePathname, useSearchParams } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useFormStatus } from "react-dom";

type LoadingHandle = () => void;

type LoadingContextValue = {
  startLoading: (message?: string) => LoadingHandle;
  startNavigation: (message?: string) => void;
  stopLoading: () => void;
  setMessage: (message: string) => void;
  isLoading: boolean;
  message: string;
};

const LoadingContext = createContext<LoadingContextValue | null>(null);

const LoadingOverlay = ({ message }: { message: string }) => (
  <div
    className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-950/40 backdrop-blur-sm"
    role="status"
    aria-live="polite"
    aria-busy="true"
  >
    <div className="flex min-w-[220px] flex-col items-center gap-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] px-6 py-5 text-center shadow-[var(--shadow-soft)]">
      <ChakraSpinner className="h-8 w-8" title="Loading" />
      <div className="text-sm font-semibold text-[color:var(--ink)]">{message}</div>
      <div className="text-xs text-[color:var(--muted)]">Please wait...</div>
    </div>
  </div>
);

export function GlobalLoadingProvider({ children }: { children: React.ReactNode }) {
  const [count, setCount] = useState(0);
  const [message, setMessage] = useState("Working...");
  const navigationStopRef = useRef<LoadingHandle | null>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const startLoading = useCallback((nextMessage?: string) => {
    if (nextMessage) setMessage(nextMessage);
    setCount((prev) => prev + 1);
    let stopped = false;
    return () => {
      if (stopped) return;
      stopped = true;
      setCount((prev) => Math.max(0, prev - 1));
    };
  }, []);

  const startNavigation = useCallback(
    (nextMessage?: string) => {
      if (navigationStopRef.current) return;
      navigationStopRef.current = startLoading(nextMessage ?? "Loading...");
    },
    [startLoading]
  );

  const stopLoading = useCallback(() => {
    setCount((prev) => Math.max(0, prev - 1));
  }, []);

  useEffect(() => {
    if (count === 0) setMessage("Working...");
  }, [count]);

  useEffect(() => {
    if (navigationStopRef.current) {
      navigationStopRef.current();
      navigationStopRef.current = null;
    }
  }, [pathname, searchParams]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      if (href.startsWith("mailto:") || href.startsWith("tel:")) return;

      const url = new URL(href, window.location.origin);
      if (url.origin !== window.location.origin) return;
      startNavigation("Loading...");
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [startNavigation]);

  const value = useMemo(
    () => ({
      startLoading,
      startNavigation,
      stopLoading,
      setMessage,
      isLoading: count > 0,
      message,
    }),
    [startLoading, startNavigation, stopLoading, message, count]
  );

  return (
    <LoadingContext.Provider value={value}>
      {children}
      {count > 0 && <LoadingOverlay message={message} />}
    </LoadingContext.Provider>
  );
}

export const useGlobalLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error("useGlobalLoading must be used within GlobalLoadingProvider");
  }
  return context;
};

export function FormStatusOverlay({ message }: { message: string }) {
  const { pending } = useFormStatus();
  const { startLoading } = useGlobalLoading();
  const stopRef = useRef<LoadingHandle | null>(null);

  useEffect(() => {
    if (pending && !stopRef.current) {
      stopRef.current = startLoading(message);
      return;
    }
    if (!pending && stopRef.current) {
      stopRef.current();
      stopRef.current = null;
    }
  }, [pending, message, startLoading]);

  useEffect(
    () => () => {
      if (stopRef.current) {
        stopRef.current();
        stopRef.current = null;
      }
    },
    []
  );

  return null;
}

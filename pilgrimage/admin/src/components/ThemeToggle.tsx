"use client";

import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";

const options = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
] as const;

type ThemeValue = (typeof options)[number]["value"];

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="theme-toggle__icon">
      <circle cx="12" cy="12" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 3.5v2.5M12 18v2.5M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M3.5 12h2.5M18 12h2.5M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.6"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="theme-toggle__icon">
      <path
        d="M16.8 15.4a6.8 6.8 0 0 1-8.2-8.2 7.5 7.5 0 1 0 8.2 8.2Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SystemIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="theme-toggle__icon">
      <rect
        x="4"
        y="5"
        width="16"
        height="11"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path d="M8 19h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="theme-toggle__check">
      <path
        d="M3.5 8.5l2.3 2.3 4.9-5.1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function iconForTheme(theme: ThemeValue) {
  if (theme === "light") return <SunIcon />;
  if (theme === "dark") return <MoonIcon />;
  return <SystemIcon />;
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      setOpen(false);
    };

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  if (!mounted) {
    return <div className="theme-toggle" aria-hidden="true" />;
  }

  const activeTheme = (theme ?? "system") as ThemeValue;

  return (
    <div className="theme-toggle" data-open={open}>
      <button
        ref={buttonRef}
        type="button"
        className="theme-toggle__button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Theme"
        onClick={() => setOpen((prev) => !prev)}
      >
        {iconForTheme(activeTheme)}
      </button>
      {open && (
        <div className="theme-toggle__menu" role="menu" ref={menuRef}>
          {options.map((option) => {
            const isActive = option.value === activeTheme;
            return (
              <button
                key={option.value}
                type="button"
                className="theme-toggle__option"
                role="menuitemradio"
                aria-checked={isActive}
                data-active={isActive}
                onClick={() => {
                  setTheme(option.value);
                  setOpen(false);
                }}
              >
                <span className="theme-toggle__option-main">
                  {iconForTheme(option.value)}
                  <span>{option.label}</span>
                </span>
                {isActive ? <CheckIcon /> : <span className="theme-toggle__check-placeholder" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

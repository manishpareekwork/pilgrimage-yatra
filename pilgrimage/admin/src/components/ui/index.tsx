import React from "react";

const cn = (...classes: Array<string | undefined | false | null>) =>
  classes.filter(Boolean).join(" ");

const inputBaseClass =
  "w-full min-h-[48px] rounded-[10px] border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-4 py-3 text-[15px] leading-[1.4] text-[color:var(--ink)] shadow-[0_1px_2px_rgba(15,23,42,0.04)] placeholder:text-[color:var(--subtle)] transition-colors focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)] focus:border-[color:var(--accent)] disabled:opacity-60 disabled:cursor-not-allowed";
const inputErrorClass =
  "border-red-500/70 focus:ring-red-400 focus:border-red-500/70";

export function PageHeader({
  title,
  subtitle,
  kicker,
  actions,
  className,
  backgroundImage,
  backgroundStyle,
}: {
  title: string;
  subtitle?: string;
  kicker?: string;
  actions?: React.ReactNode;
  className?: string;
  backgroundImage?: string;
  backgroundStyle?: React.CSSProperties;
}) {
  const hasBackground = Boolean(backgroundImage);
  
  return (
    <div 
      className={cn("card p-7 sm:p-9 lg:p-10", className)} 
      style={
        hasBackground
          ? {
              backgroundImage: `url('${backgroundImage}')`,
              backgroundSize: "cover",
              backgroundPosition: "top center",
              ...backgroundStyle,
            }
          : undefined
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          {kicker && (
            <p className={cn(
              "text-xs font-semibold uppercase tracking-[0.25em]",
              hasBackground ? "text-white/90" : "text-[color:var(--accent)]"
            )}>
              {kicker}
            </p>
          )}
          <h1 className={cn(
            "text-xl font-semibold",
            hasBackground ? "text-white" : "text-[color:var(--ink)]"
          )}>{title}</h1>
          {subtitle && (
            <p className={cn(
              "text-sm",
              hasBackground ? "text-white/80" : "text-[color:var(--muted)]"
            )}>{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function FormSection({
  title,
  description,
  children,
  actions,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn("card space-y-8 p-7 sm:p-9 lg:p-10", className)}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1.5">
          <div className="text-base font-semibold text-[color:var(--ink)]">{title}</div>
          {description && (
            <p className="text-sm leading-relaxed text-[color:var(--muted)]">{description}</p>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

export function Field({
  label,
  htmlFor,
  required,
  helperText,
  error,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  helperText?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("form-field flex flex-col gap-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className="text-sm font-medium text-[color:var(--ink)]"
      >
        {label}
        {required && <span className="text-red-400"> *</span>}
      </label>
      {helperText && (
        <p className="text-xs text-[color:var(--subtle)]">{helperText}</p>
      )}
      {children}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

export function TextInput({
  error,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean }) {
  return (
    <input
      {...props}
      className={cn(inputBaseClass, error && inputErrorClass, className)}
    />
  );
}

export function TextArea({
  error,
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean }) {
  return (
    <textarea
      {...props}
      className={cn(
        inputBaseClass,
        "min-h-28 resize-y",
        error && inputErrorClass,
        className
      )}
    />
  );
}

export function Select({
  error,
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { error?: boolean }) {
  return (
    <select
      {...props}
      className={cn(inputBaseClass, error && inputErrorClass, className)}
    />
  );
}

export function ChakraSpinner({
  className,
  animate = true,
  title = "Loading",
}: {
  className?: string;
  animate?: boolean;
  title?: string;
}) {
  const blades = Array.from({ length: 12 }, (_, index) => {
    const angle = (index * 360) / 12;
    return (
      <rect
        key={index}
        x="11.2"
        y="1.6"
        width="1.6"
        height="4.4"
        rx="0.8"
        transform={`rotate(${angle} 12 12)`}
      />
    );
  });

  return (
    <svg
      viewBox="0 0 24 24"
      className={cn(
        "h-4 w-4 text-[color:var(--accent)]",
        animate && "animate-spin",
        className
      )}
      role="img"
      aria-label={title}
    >
      {blades.map((blade) => React.cloneElement(blade, { fill: "currentColor" }))}
      <circle cx="12" cy="12" r="7.2" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}

export function CheckboxRow({
  label,
  helperText,
  children,
  className,
  inputClassName,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  helperText?: string;
  children?: React.ReactNode;
  inputClassName?: string;
}) {
  const hasAside = Boolean(children);

  return (
    <div
      className={cn(
        hasAside
          ? "grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] items-start"
          : "flex items-start gap-3",
        className
      )}
    >
      <label className="flex items-start gap-2 text-sm text-[color:var(--muted)]">
        <input
          {...props}
          type="checkbox"
          className={cn(
            "mt-1 h-4 w-4 rounded border-[color:var(--border)] bg-[color:var(--surface-muted)] text-[color:var(--accent)] focus:ring-[color:var(--accent)]",
            inputClassName
          )}
        />
        <div>
          <div className="font-medium text-[color:var(--ink)]">{label}</div>
          {helperText && (
            <p className="text-xs text-[color:var(--subtle)]">{helperText}</p>
          )}
        </div>
      </label>
      {hasAside && <div className="w-full">{children}</div>}
    </div>
  );
}

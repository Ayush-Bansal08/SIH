import clsx from "clsx";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/* ------------------------------------------------------------------ Card */

export function Card({
  className,
  children,
  as: Tag = "section",
  ...rest
}: Omit<ComponentProps<"section">, "ref"> & { as?: "section" | "div" | "article" }) {
  return (
    <Tag
      className={clsx("min-w-0 rounded-2xl border border-line bg-surface shadow-[var(--shadow-card)]", className)}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export function CardHeader({
  title,
  description,
  action,
  eyebrow,
  id,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  eyebrow?: ReactNode;
  id?: string;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-subtle">{eyebrow}</p>}
        <h2 id={id} className="text-base font-semibold text-ink">
          {title}
        </h2>
        {description && <p className="mt-0.5 text-sm text-ink-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function CardBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={clsx("px-5 py-4", className)}>{children}</div>;
}

/* ------------------------------------------------------------------ Badge */

export type Tone = "neutral" | "info" | "success" | "warning" | "danger" | "brand";

const TONES: Record<Tone, string> = {
  neutral: "bg-canvas text-ink-muted ring-line-strong",
  info: "bg-prism-50 text-prism-800 ring-prism-100",
  success: "bg-risk-low-bg text-risk-low ring-risk-low-line",
  warning: "bg-risk-moderate-bg text-risk-moderate ring-risk-moderate-line",
  danger: "bg-risk-high-bg text-risk-high ring-risk-high-line",
  brand: "bg-navy-50 text-navy-800 ring-navy-100",
};

export function Badge({ tone = "neutral", className, children, icon }: { tone?: Tone; className?: string; children: ReactNode; icon?: ReactNode }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        TONES[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ Buttons */

type Variant = "primary" | "secondary" | "ghost" | "accent";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-ink text-white hover:bg-navy-700",
  accent: "bg-ink text-white hover:bg-navy-700",
  secondary: "bg-surface text-ink ring-1 ring-inset ring-line-strong hover:bg-canvas",
  ghost: "text-ink underline-offset-4 hover:underline",
};

const SIZES = {
  sm: "h-8 px-3 text-sm gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-5 text-base gap-2",
};

export function buttonClass(variant: Variant = "primary", size: keyof typeof SIZES = "md", className?: string) {
  return clsx(
    "inline-flex items-center justify-center rounded-full font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50",
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...rest
}: ComponentProps<"button"> & { variant?: Variant; size?: keyof typeof SIZES }) {
  return <button type="button" className={buttonClass(variant, size, className)} {...rest} />;
}

export function LinkButton({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
}: {
  href: string;
  variant?: Variant;
  size?: keyof typeof SIZES;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)}>
      {children}
    </Link>
  );
}

/* ------------------------------------------------------------------ Page header */

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  meta,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <header className="animate-rise flex flex-wrap items-end justify-between gap-6 pt-4">
      <div className="max-w-3xl">
        {eyebrow && <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.18em] text-ink-subtle">{eyebrow}</p>}
        <h1 className="text-balance text-3xl font-normal tracking-[-0.02em] text-ink sm:text-[2.6rem] sm:leading-[1.1]">{title}</h1>
        {description && <p className="mt-4 text-lg leading-relaxed text-ink-muted">{description}</p>}
        {meta && <div className="mt-4 flex flex-wrap items-center gap-2">{meta}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

/** Centred section heading with one plain-language line underneath. */
export function SectionTitle({ id, title, text }: { id: string; title: ReactNode; text?: ReactNode }) {
  return (
    <div className="mx-auto mb-10 max-w-2xl text-center">
      <h2 id={id} className="text-balance text-3xl font-normal tracking-[-0.02em] text-ink sm:text-4xl">{title}</h2>
      {text && <p className="mt-3 text-base leading-relaxed text-ink-muted">{text}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ States */

export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line-strong bg-surface px-6 py-12 text-center">
      {icon && <div className="mb-3 text-ink-subtle">{icon}</div>}
      <p className="text-base font-semibold text-ink">{title}</p>
      {children && <div className="mt-1 max-w-md text-sm text-ink-muted">{children}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={clsx(
        "animate-shimmer rounded-md bg-[linear-gradient(90deg,#eceef2_25%,#f6f7f9_50%,#eceef2_75%)] bg-[length:200%_100%]",
        className,
      )}
    />
  );
}

/* ------------------------------------------------------------------ Callout */

export function Callout({
  tone = "info",
  icon,
  title,
  children,
  className,
}: {
  tone?: "info" | "warning" | "illustrative";
  icon?: ReactNode;
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const tones = {
    info: "border-prism-100 bg-prism-50 text-prism-800",
    warning: "border-risk-moderate-line bg-risk-moderate-bg text-risk-moderate",
    illustrative: "border-[#f5d9a8] bg-ev-illustrative-bg text-ev-illustrative",
  };
  return (
    <div role="note" className={clsx("flex gap-3 rounded-lg border px-4 py-3 text-sm", tones[tone], className)}>
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      <div>
        {title && <p className="font-semibold">{title}</p>}
        <div className={clsx(title && "mt-0.5", "leading-relaxed")}>{children}</div>
      </div>
    </div>
  );
}

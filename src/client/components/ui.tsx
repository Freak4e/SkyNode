import type { ButtonHTMLAttributes, ElementType, FormHTMLAttributes, HTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import { Link, type LinkProps } from "react-router-dom";

type Tone = "primary" | "secondary" | "ghost" | "light" | "danger";
type Size = "sm" | "md" | "lg";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const buttonTone: Record<Tone, string> = {
  primary: "bg-linear-to-r from-brand-600 to-accent-500 text-white shadow-md shadow-blue-500/20 hover:shadow-lg",
  secondary: "bg-ink-950 text-white hover:bg-brand-700",
  ghost: "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-brand-50 hover:text-brand-700",
  light: "bg-white/10 text-white ring-1 ring-white/15 hover:bg-white/20",
  danger: "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
};

const buttonSize: Record<Size, string> = {
  sm: "px-3 py-2 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-3 text-sm",
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: ReactNode;
  size?: Size;
  tone?: Tone;
};

export function Button({ children, className, icon, size = "md", tone = "primary", type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-xl font-black no-underline transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60",
        buttonTone[tone],
        buttonSize[size],
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}

type ButtonLinkProps = LinkProps & {
  icon?: ReactNode;
  size?: Size;
  tone?: Tone;
};

export function ButtonLink({ children, className, icon, size = "md", tone = "primary", ...props }: ButtonLinkProps) {
  return (
    <Link
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-xl font-black no-underline transition hover:scale-[1.01]",
        buttonTone[tone],
        buttonSize[size],
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </Link>
  );
}

type CardProps = (HTMLAttributes<HTMLElement> | FormHTMLAttributes<HTMLFormElement>) & {
  as?: "article" | "aside" | "div" | "form" | "section";
  children: ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
  tone?: "default" | "muted" | "dashed" | "interactive";
};

export function Card({ as: Tag = "section", children, className, padding = "md", tone = "default", ...props }: CardProps) {
  const Component = Tag as ElementType;
  const paddingClass = padding === "none" ? "" : padding === "sm" ? "p-4" : padding === "lg" ? "p-8" : "p-5";
  const toneClass = tone === "muted"
    ? "border border-slate-100 bg-slate-50"
    : tone === "dashed"
    ? "border border-dashed border-slate-200 bg-white"
    : tone === "interactive"
    ? "border border-slate-100 bg-white transition hover:border-brand-200 hover:bg-brand-50"
    : "border border-slate-100 bg-white shadow-card";

  return <Component className={cx("rounded-3xl", toneClass, paddingClass, className)} {...props}>{children}</Component>;
}

type AccentCardProps = HTMLAttributes<HTMLElement> & {
  as?: "article" | "aside" | "div" | "section";
  children: ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
};

export function AccentCard({ as: Tag = "section", children, className, padding = "md", ...props }: AccentCardProps) {
  const Component = Tag as ElementType;
  const paddingClass = padding === "none" ? "" : padding === "sm" ? "p-4" : padding === "lg" ? "p-8" : "p-6";

  return (
    <Component
      className={cx(
        "group relative overflow-hidden rounded-3xl border border-white/80 bg-white shadow-xl shadow-slate-200/70 transition hover:-translate-y-1 hover:border-blue-100 hover:shadow-2xl hover:shadow-blue-200/50",
        paddingClass,
        className,
      )}
      {...props}
    >
      <span className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-linear-to-br from-blue-400/20 to-cyan-300/20 blur-2xl transition group-hover:scale-125" />
      <span className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-linear-to-r from-blue-500 via-cyan-400 to-indigo-500 opacity-70" />
      <div className="relative">{children}</div>
    </Component>
  );
}

type SectionHeaderProps = {
  align?: "left" | "center";
  className?: string;
  eyebrow: ReactNode;
  icon?: ReactNode;
  subtitle?: ReactNode;
  title: ReactNode;
};

export function SectionHeader({ align = "left", className, eyebrow, icon, subtitle, title }: SectionHeaderProps) {
  const centered = align === "center";

  return (
    <div className={cx(centered && "text-center", className)}>
      <p className={cx("mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-blue-500", centered && "justify-center")}>
        {icon}
        {eyebrow}
      </p>
      <h2 className="text-2xl font-black text-slate-950 md:text-3xl">{title}</h2>
      {subtitle && <p className="mt-2 text-base text-slate-600">{subtitle}</p>}
    </div>
  );
}

type PageShellProps = {
  children: ReactNode;
  className?: string;
  containerClassName?: string;
  flush?: boolean;
};

export function PageShell({ children, className, containerClassName, flush = false }: PageShellProps) {
  return (
    <main className={cx(flush ? "app-main-flush" : "app-main", className)}>
      <div className={cx("app-container", containerClassName)}>{children}</div>
    </main>
  );
}

type HeroPanelProps = {
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  description?: ReactNode;
  eyebrow?: ReactNode;
  title: ReactNode;
};

export function HeroPanel({ actions, children, className, description, eyebrow, title }: HeroPanelProps) {
  return (
    <section className={cx("relative mb-8 min-h-64 overflow-visible rounded-3xl bg-hero-panel p-6 text-white shadow-card-strong sm:p-8 lg:p-10", className)}>
      <div className="pointer-events-none absolute inset-0 rounded-3xl bg-[radial-gradient(circle_at_18%_20%,rgba(56,189,248,0.18),transparent_32%),radial-gradient(circle_at_86%_12%,rgba(20,184,166,0.14),transparent_34%)]" />
      <div className="relative grid min-h-44 items-center gap-8 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0 max-w-3xl">
          {eyebrow && <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-slate-100">{eyebrow}</p>}
          <h1 className="text-4xl font-black leading-tight text-white md:text-5xl">{title}</h1>
          {description && <p className="mt-4 max-w-2xl text-sm font-bold leading-relaxed text-slate-300">{description}</p>}
        </div>
        {actions && <div className="flex w-full min-w-0 flex-wrap items-center justify-start gap-2 lg:w-auto lg:justify-end">{actions}</div>}
      </div>
      {children && <div className="relative">{children}</div>}
    </section>
  );
}

type EmptyStateProps = {
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
  title: ReactNode;
};

export function EmptyState({ action, children, className, title }: EmptyStateProps) {
  return (
    <Card tone="dashed" padding="lg" className={cx("text-center shadow-card", className)}>
      <p className="text-xl font-black text-slate-950">{title}</p>
      {children && <div className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </Card>
  );
}

type FormFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  onValueChange?: (value: string) => void;
};

export function FormField({ className, label, onChange, onValueChange, ...props }: FormFieldProps) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold text-slate-600">{label}</span>
      <input
        className={cx("form-field", className)}
        onChange={(event) => {
          onChange?.(event);
          onValueChange?.(event.target.value);
        }}
        {...props}
      />
    </label>
  );
}

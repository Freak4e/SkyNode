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
    <section className={cx("mb-8 overflow-hidden rounded-3xl bg-hero-panel p-8 text-white shadow-card-strong", className)}>
      <div className="flex flex-wrap items-end justify-between gap-8">
        <div>
          {eyebrow && <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-black text-slate-200">{eyebrow}</p>}
          <h1 className="text-4xl font-black leading-tight md:text-6xl">{title}</h1>
          {description && <p className="mt-4 max-w-2xl text-sm font-bold leading-relaxed text-slate-300">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
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

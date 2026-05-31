import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

type Variant = "light" | "dark";

type Option = {
  value: string;
  label: string;
  description?: string;
};

type Props = {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  variant?: Variant;
  className?: string;
};

export function FilterDropdown({ label, value, options, onChange, variant = "light", className = "" }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value) || options[0];

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const triggerClass = variant === "dark"
    ? "border-white/10 bg-white/10 text-white hover:bg-white/15"
    : "border-slate-200 bg-white text-slate-900 hover:border-blue-200 hover:bg-blue-50";
  const menuClass = variant === "dark"
    ? "border-white/10 bg-slate-950 text-white shadow-black/30"
    : "border-slate-200 bg-white text-slate-900 shadow-slate-900/12";
  const itemHover = variant === "dark" ? "hover:bg-white/10" : "hover:bg-blue-50";
  const labelClass = variant === "dark" ? "text-slate-300" : "text-slate-600";

  return (
    <div ref={ref} className={`relative ${className}`}>
      <span className={`mb-1 block text-xs font-black uppercase tracking-widest ${labelClass}`}>{label}</span>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`flex w-full items-center justify-between gap-2 rounded-xl border px-4 py-3 text-left text-sm font-bold transition ${triggerClass}`}
      >
        <span>{selected?.label || "Any"}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className={`absolute left-0 right-0 top-full z-60 mt-2 overflow-hidden rounded-2xl border p-1 shadow-2xl ${menuClass}`}>
          {options.map((option) => (
            <button
              key={option.value || "any"}
              type="button"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left transition ${itemHover}`}
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-black">{option.label}</span>
                {option.description && (
                  <span className={`block text-xs font-semibold ${variant === "dark" ? "text-slate-400" : "text-slate-500"}`}>
                    {option.description}
                  </span>
                )}
              </span>
              {value === option.value && <Check className="h-4 w-4 shrink-0 text-blue-500" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function FilterDropdownMenuItem({
  children,
  onSelect,
}: {
  children: ReactNode;
  onSelect: () => void;
}) {
  return (
    <button type="button" onClick={onSelect} className="block w-full rounded-xl px-3 py-2 text-left text-sm font-bold transition hover:bg-blue-50">
      {children}
    </button>
  );
}

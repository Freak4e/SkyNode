import { Globe2, Plane } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import type { CurrencyCode } from "../../shared/types.js";
import { currencyOptions, getStoredCurrency, storeCurrency } from "../utils/currency.js";

const navLinks = [
  { label: "Flights", to: "/search" },
  { label: "Live Flights", to: "/live-flights", accent: true },
  { label: "AI Planner", to: "/planner" },
  { label: "Destinations", to: "/destinations" },
  { label: "Assistant", to: "/assistant" },
  { label: "About", to: "/about" },
];

type Props = { transparent?: boolean };

export function Navbar({ transparent = false }: Props) {
  const location = useLocation();
  const [currency, setCurrency] = useState<CurrencyCode>(() => getStoredCurrency());

  function handleCurrencyChange(nextCurrency: CurrencyCode) {
    setCurrency(nextCurrency);
    storeCurrency(nextCurrency);
  }

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4 transition-all duration-300 ${
        transparent ? "bg-transparent" : "bg-white/90 backdrop-blur-md border-b border-slate-100 shadow-sm"
      }`}
    >
      <Link to="/" className="flex items-center gap-2 no-underline">
        <div className="w-9 h-9 rounded-xl bg-linear-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-md">
          <Plane className="w-5 h-5 text-white" strokeWidth={2.5} />
        </div>
        <span className={`text-lg font-bold tracking-tight ${transparent ? "text-white" : "text-slate-900"}`}>
          SkyNode
        </span>
      </Link>

      <div className="hidden md:flex items-center gap-7">
        {navLinks.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className={
              link.accent
                ? `rounded-full px-3 py-1.5 text-sm font-black no-underline transition-all ${
                    location.pathname === link.to
                      ? "bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/25"
                      : transparent
                      ? "bg-emerald-400/15 text-emerald-100 ring-1 ring-emerald-300/30 hover:bg-emerald-300 hover:text-slate-950"
                      : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-500 hover:text-white hover:ring-emerald-500"
                  }`
                : `text-sm font-medium transition-colors no-underline ${
                    transparent
                      ? location.pathname === link.to
                        ? "text-white"
                        : "text-white/70 hover:text-white"
                      : location.pathname === link.to
                      ? "text-blue-600"
                      : "text-slate-500 hover:text-slate-900"
                  }`
            }
          >
            {link.label}
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <label
          className={`hidden items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-bold transition-colors sm:flex ${
            transparent
              ? "border-white/20 bg-white/10 text-white"
              : "border-slate-200 bg-white text-slate-700 shadow-sm"
          }`}
        >
          <Globe2 className="h-3.5 w-3.5" />
          <select
            value={currency}
            onChange={(event) => handleCurrencyChange(event.target.value as CurrencyCode)}
            className={`bg-transparent text-xs font-black outline-none ${transparent ? "text-white" : "text-slate-800"}`}
            aria-label="Currency"
          >
            {currencyOptions.map((option) => (
              <option key={option.code} value={option.code} className="text-slate-900">
                {option.code}
              </option>
            ))}
          </select>
        </label>
        <button className={`text-sm font-medium transition-colors ${transparent ? "text-white/80 hover:text-white" : "text-slate-600 hover:text-slate-900"}`}>
          Sign in
        </button>
        <Link
          to="/planner"
          className="text-sm font-semibold px-4 py-2 rounded-full bg-linear-to-r from-blue-500 to-cyan-400 text-white shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200 no-underline"
        >
          Get started
        </Link>
      </div>
    </nav>
  );
}

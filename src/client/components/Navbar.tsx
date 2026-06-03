import { Check, ChevronDown, Globe2, Menu, UserRound, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import type { CurrencyCode } from "../../shared/types.js";
import { useAuth } from "../auth/AuthContext";
import { currencyOptions, getStoredCurrency, storeCurrency } from "../utils/currency.js";
import logo from "../../../assets/logo_skynode_horizontal.png";

const baseNavLinks: Array<{ label: string; to: string; accent?: boolean }> = [
  { label: "Flights", to: "/search" },
  { label: "Live Flights", to: "/live-flights", accent: true },
  { label: "Trips", to: "/planner" },
  { label: "Destinations", to: "/destinations" },
  { label: "Assistant", to: "/assistant" },
];

const communityNavLink: { label: string; to: string; accent?: boolean } = { label: "Community", to: "/explore-trips" };

type Props = { transparent?: boolean };

function userImage(user: ReturnType<typeof useAuth>["user"]) {
  const metadata = user?.user_metadata || {};
  const direct = metadata.avatar_url || metadata.picture;
  const identityData = user?.identities?.find((identity) => identity.identity_data)?.identity_data || {};
  const identityImage = identityData.avatar_url || identityData.picture;

  return typeof direct === "string" && direct
    ? direct
    : typeof identityImage === "string" && identityImage
    ? identityImage
    : "";
}

export function Navbar({ transparent = false }: Props) {
  const location = useLocation();
  const { user } = useAuth();
  const [currency, setCurrency] = useState<CurrencyCode>(() => getStoredCurrency());
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const currencyRef = useRef<HTMLDivElement>(null);
  const overlay = transparent && !scrolled;

  useEffect(() => {
    if (!transparent) {
      setScrolled(false);
      return;
    }

    function updateScrolled() {
      setScrolled(window.scrollY > 24);
    }

    updateScrolled();
    window.addEventListener("scroll", updateScrolled, { passive: true });
    return () => window.removeEventListener("scroll", updateScrolled);
  }, [transparent]);

  function handleCurrencyChange(nextCurrency: CurrencyCode) {
    setCurrency(nextCurrency);
    storeCurrency(nextCurrency);
    setCurrencyOpen(false);
  }

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (currencyRef.current && !currencyRef.current.contains(event.target as Node)) {
        setCurrencyOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const avatarUrl = userImage(user);
  const navLinks = user ? [...baseNavLinks, communityNavLink] : baseNavLinks;

  return (
    <>
    <nav
      className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between border-b px-5 py-3 transition-all duration-300 md:px-8 ${
        overlay ? "border-slate-100 bg-white/90 shadow-sm backdrop-blur-md lg:border-transparent lg:bg-transparent lg:shadow-none lg:backdrop-blur-0" : "border-slate-100 bg-white/90 shadow-sm backdrop-blur-md"
      }`}
    >
      <Link to="/" className="flex items-center gap-2 no-underline">
        <img
          src={logo}
          alt="SkyNode"
          className={`h-14 w-auto object-contain transition duration-300 ${overlay ? "lg:brightness-0 lg:invert" : ""}`}
        />
      </Link>

      <div className="hidden items-center gap-7 lg:flex">
        {navLinks.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className={
              link.accent
                ? `rounded-full px-3 py-1.5 text-sm font-black no-underline transition-all ${
                    location.pathname === link.to && !overlay
                      ? "bg-cyan-50 text-cyan-800 ring-1 ring-cyan-200 shadow-sm"
                      : overlay
                      ? "bg-white/10 text-sky-50 ring-1 ring-white/25 hover:bg-white/20"
                      : "bg-sky-50/70 text-sky-700 ring-1 ring-sky-100 hover:bg-cyan-50 hover:text-cyan-800 hover:ring-cyan-200"
                  }`
                : `text-sm font-medium transition-colors no-underline ${
                    overlay
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
        <div ref={currencyRef} className="relative hidden sm:block">
          <button
            type="button"
            onClick={() => setCurrencyOpen((open) => !open)}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-bold transition-colors ${
            overlay
              ? "border-slate-200 bg-white text-slate-700 shadow-sm lg:border-white/20 lg:bg-white/10 lg:text-white"
              : "border-slate-200 bg-white text-slate-700 shadow-sm"
          }`}
            aria-label="Currency"
          >
            <Globe2 className="h-3.5 w-3.5" />
            <span className="font-black">{currency}</span>
            <ChevronDown className={`h-3.5 w-3.5 transition ${currencyOpen ? "rotate-180" : ""}`} />
          </button>

          {currencyOpen && (
            <div className="absolute right-0 top-full z-60 mt-2 max-h-64 w-48 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 text-slate-900 shadow-2xl shadow-slate-900/12">
              <p className="px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Currency</p>
              {currencyOptions.map((option) => (
                <button
                  key={option.code}
                  type="button"
                  onClick={() => handleCurrencyChange(option.code)}
                  className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition hover:bg-blue-50"
                >
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-slate-100 text-[11px] font-black text-slate-700">{option.symbol}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-black leading-tight text-slate-950">{option.code}</span>
                    <span className="block truncate text-[11px] font-semibold text-slate-500">{option.label}</span>
                  </span>
                  {currency === option.code && <Check className="h-4 w-4 text-blue-600" />}
                </button>
              ))}
            </div>
          )}
        </div>
        {user ? (
          <Link
            to="/account"
            className="block rounded-full no-underline transition hover:opacity-85 focus:outline-none focus:ring-4 focus:ring-blue-100"
            title="My account"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover" />
            ) : (
              <span className="grid h-7 w-7 place-items-center rounded-full bg-violet-600 text-white">
                <UserRound className="h-4 w-4" />
              </span>
            )}
          </Link>
        ) : (
          <Link
            to="/auth"
            className={`text-sm font-medium no-underline transition-colors ${overlay ? "text-slate-600 hover:text-slate-900 lg:text-white/80 lg:hover:text-white" : "text-slate-600 hover:text-slate-900"}`}
          >
            Sign in
          </Link>
        )}

        <div className="relative lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            className="grid h-11 w-11 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50"
            aria-label="Open navigation menu"
            aria-expanded={mobileOpen}
          >
            <Menu className="h-5 w-5" />
          </button>

        </div>
      </div>

    </nav>

    <div className={`fixed inset-0 z-[80] transition lg:hidden ${mobileOpen ? "pointer-events-auto" : "pointer-events-none"}`}>
          <button
            type="button"
            className={`absolute inset-0 bg-slate-950/55 backdrop-blur-sm transition-opacity duration-300 ${mobileOpen ? "opacity-100" : "opacity-0"}`}
            aria-label="Close navigation menu"
            onClick={() => setMobileOpen(false)}
          />
          <aside
            className={`fixed bottom-0 right-0 top-0 isolate flex h-dvh w-[min(22rem,86vw)] flex-col border-l border-slate-200 bg-white p-5 text-slate-950 shadow-2xl transition-transform duration-300 ease-out ${
              mobileOpen ? "translate-x-0" : "translate-x-full"
            }`}
          >
            <div className="absolute inset-0 -z-10 bg-white" />
            <div className="mb-6 flex items-center justify-between gap-4 bg-white">
              <img src={logo} alt="SkyNode" className="h-12 w-auto object-contain" />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
                aria-label="Close navigation menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-1 bg-white">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center justify-between rounded-2xl px-4 py-3 text-base font-black no-underline transition ${
                    location.pathname === link.to
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-700 hover:bg-slate-50 hover:text-slate-950"
                  }`}
                >
                  {link.label}
                  {link.accent && <span className="rounded-full bg-cyan-50 px-2 py-0.5 text-[10px] uppercase tracking-wider text-cyan-700">Live</span>}
                </Link>
              ))}
            </div>
          </aside>
    </div>
    </>
  );
}

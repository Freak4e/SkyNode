import { Globe2, Menu, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import type { CurrencyCode } from "../../shared/types.js";
import { useAuth } from "../auth/AuthContext";
import { currencyOptions, getStoredCurrency, storeCurrency } from "../utils/currency.js";
import logo from "../../../assets/logo_skynode_horizontal.png";

const navLinks = [
  { label: "Flights", to: "/search" },
  { label: "Live Flights", to: "/live-flights", accent: true },
  { label: "Trips", to: "/planner" },
  { label: "Destinations", to: "/destinations" },
  { label: "Assistant", to: "/assistant" },
  { label: "About", to: "/about" },
];

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
  const [scrolled, setScrolled] = useState(false);
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
  }

  const avatarUrl = userImage(user);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 py-3 transition-all duration-300 md:px-8 ${
        overlay ? "bg-transparent" : "bg-white/90 backdrop-blur-md border-b border-slate-100 shadow-sm"
      }`}
    >
      <Link to="/" className="flex items-center gap-2 no-underline">
        <img
          src={logo}
          alt="SkyNode"
          className={`h-14 w-auto object-contain transition duration-300 ${overlay ? "brightness-0 invert" : ""}`}
        />
      </Link>

      <div className="hidden md:flex items-center gap-7">
        {navLinks.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className={
              link.accent
                ? `rounded-full px-3 py-1.5 text-sm font-black no-underline transition-all ${
                    location.pathname === link.to && !overlay
                      ? "bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/25"
                      : overlay
                      ? "bg-emerald-400/15 text-emerald-100 ring-1 ring-emerald-300/30 hover:bg-emerald-300 hover:text-slate-950"
                      : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-500 hover:text-white hover:ring-emerald-500"
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
        <label
          className={`hidden items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-bold transition-colors sm:flex ${
            overlay
              ? "border-white/20 bg-white/10 text-white"
              : "border-slate-200 bg-white text-slate-700 shadow-sm"
          }`}
        >
          <Globe2 className="h-3.5 w-3.5" />
          <select
            value={currency}
            onChange={(event) => handleCurrencyChange(event.target.value as CurrencyCode)}
            className={`bg-transparent text-xs font-black outline-none ${overlay ? "text-white" : "text-slate-800"}`}
            aria-label="Currency"
          >
            {currencyOptions.map((option) => (
              <option key={option.code} value={option.code} className="text-slate-900">
                {option.code}
              </option>
            ))}
          </select>
        </label>
        {user ? (
          <Link
            to="/account"
            className={`flex items-center gap-2 rounded-full border px-2 py-1.5 no-underline shadow-sm transition ${
              overlay
                ? "border-white/25 bg-white/10 text-white hover:bg-white/20"
                : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50"
            }`}
            title="My account"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover" />
            ) : (
              <span className={`grid h-7 w-7 place-items-center rounded-full ${
                overlay ? "bg-white/20 text-white" : "bg-slate-900 text-white"
              }`}>
                <UserRound className="h-4 w-4" />
              </span>
            )}
            <Menu className="h-5 w-5" />
          </Link>
        ) : (
          <Link
            to="/auth"
            className={`text-sm font-medium no-underline transition-colors ${overlay ? "text-white/80 hover:text-white" : "text-slate-600 hover:text-slate-900"}`}
          >
            Sign in
          </Link>
        )}
      </div>
    </nav>
  );
}

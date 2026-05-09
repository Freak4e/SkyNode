import { Plane } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const navLinks = [
  { label: "Flights", to: "/search" },
  { label: "AI Planner", to: "/planner" },
  { label: "Destinations", to: "/destinations" },
  { label: "Assistant", to: "/assistant" },
  { label: "About", to: "/about" },
];

type Props = { transparent?: boolean };

export function Navbar({ transparent = false }: Props) {
  const location = useLocation();

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4 transition-all duration-300 ${
        transparent ? "bg-transparent" : "bg-white/90 backdrop-blur-md border-b border-slate-100 shadow-sm"
      }`}
    >
      <Link to="/" className="flex items-center gap-2 no-underline">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-md">
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
            className={`text-sm font-medium transition-colors no-underline ${
              transparent
                ? location.pathname === link.to
                  ? "text-white"
                  : "text-white/70 hover:text-white"
                : location.pathname === link.to
                ? "text-blue-600"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            {link.label}
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button className={`text-sm font-medium transition-colors ${transparent ? "text-white/80 hover:text-white" : "text-slate-600 hover:text-slate-900"}`}>
          Sign in
        </button>
        <button className="text-sm font-semibold px-4 py-2 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 text-white shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200">
          Get started
        </button>
      </div>
    </nav>
  );
}

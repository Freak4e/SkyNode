import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import logo from "../../../assets/logo_skynode.png";

const baseColumns = [
  {
    heading: "PLAN",
    links: [
      { label: "Search flights", to: "/search" },
      { label: "Trip planner", to: "/planner" },
      { label: "AI assistant", to: "/assistant" },
    ],
  },
  {
    heading: "DISCOVER",
    links: [
      { label: "Destinations", to: "/destinations" },
      { label: "Community trips", to: "/explore-trips" },
      { label: "Live flights", to: "/live-flights" },
    ],
  },
  {
    heading: "ACCOUNT",
    links: [
      { label: "My trips", to: "/trip-library" },
      { label: "Profile", to: "/account" },
    ],
  },
];

export function Footer() {
  const { user } = useAuth();
  const columns = baseColumns.map((column) => (
    column.heading === "ACCOUNT"
      ? {
        ...column,
        links: [
          ...column.links,
          user
            ? { label: "Travel missions", to: "/account" }
            : { label: "Sign in", to: "/auth" },
        ],
      }
      : column
  ));

  return (
    <footer className="bg-slate-900 px-5 pb-8 pt-12 text-white sm:px-6 sm:pt-16">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 grid grid-cols-1 gap-9 sm:grid-cols-2 lg:mb-12 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:gap-10">
          <div className="max-w-sm sm:col-span-2 lg:col-span-1">
            <div className="mb-3">
              <img src={logo} alt="SkyNode" className="h-20 w-auto max-w-full object-contain brightness-0 invert sm:h-24" />
            </div>
            <p className="text-sm leading-relaxed text-slate-400">
              Search flights, plan itineraries, save trips, and coordinate travel ideas in one workspace.
            </p>
          </div>

          {columns.map((col) => (
            <div key={col.heading}>
              <p className="mb-4 text-xs font-semibold tracking-widest text-slate-500">{col.heading}</p>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={`${link.label}-${link.to}`}>
                    <Link to={link.to} className="text-sm text-slate-400 no-underline transition-colors hover:text-white">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-start justify-between gap-3 border-t border-slate-800 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center">
          <span>© 2026 SkyNode. All rights reserved.</span>
          <span>Built for flight search, itinerary planning, and saved trips.</span>
        </div>
      </div>
    </footer>
  );
}

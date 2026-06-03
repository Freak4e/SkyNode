import { Link } from "react-router-dom";
import logo from "../../../assets/logo_skynode.png";

const columns = [
  {
    heading: "PRODUCT",
    links: ["Flights", "AI Planner", "Assistant", "Dashboard"],
  },
  {
    heading: "EXPLORE",
    links: ["Tokyo", "Santorini", "Bali", "Iceland"],
  },
  {
    heading: "COMPANY",
    links: ["About", "Careers", "Press", "Contact"],
  },
];

export function Footer() {
  return (
    <footer className="bg-slate-900 px-5 pb-8 pt-12 text-white sm:px-6 sm:pt-16">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 grid grid-cols-1 gap-9 sm:grid-cols-2 lg:mb-12 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:gap-10">
          <div className="max-w-sm sm:col-span-2 lg:col-span-1">
            <div className="mb-3">
              <img src={logo} alt="SkyNode" className="h-20 w-auto max-w-full object-contain brightness-0 invert sm:h-24" />
            </div>
            <p className="text-sm leading-relaxed text-slate-400">
              The intelligent travel companion. Plan, book and explore the world with AI-powered insight.
            </p>
            <div className="mt-4 flex gap-3">
              {["𝕏", "✈", "◎"].map((icon) => (
                <button key={icon} className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-slate-700 hover:text-white transition-colors text-sm">
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {columns.map((col) => (
            <div key={col.heading}>
              <p className="mb-4 text-xs font-semibold tracking-widest text-slate-500">{col.heading}</p>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link}>
                    <Link to="#" className="text-sm text-slate-400 no-underline transition-colors hover:text-white">
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-start justify-between gap-3 border-t border-slate-800 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center">
          <span>© 2026 SkyNode Labs. All rights reserved.</span>
          <span>Designed for the next generation of travelers ✦</span>
        </div>
      </div>
    </footer>
  );
}

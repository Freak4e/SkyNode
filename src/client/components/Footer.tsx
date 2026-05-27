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
    <footer className="bg-slate-900 text-white pt-16 pb-8">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
          <div>
            <div className="mb-3 pl-4">
              <img src={logo} alt="SkyNode" className="h-32 w-auto max-w-full object-contain brightness-0 invert" />
            </div>
            <p className="text-slate-400 text-sm leading-relaxed">
              The intelligent travel companion. Plan, book and explore the world with AI-powered insight.
            </p>
            <div className="flex gap-3 mt-4">
              {["𝕏", "✈", "◎"].map((icon) => (
                <button key={icon} className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-slate-700 hover:text-white transition-colors text-sm">
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {columns.map((col) => (
            <div key={col.heading}>
              <p className="text-xs font-semibold text-slate-500 tracking-widest mb-4">{col.heading}</p>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link}>
                    <Link to="#" className="text-slate-400 hover:text-white text-sm transition-colors no-underline">
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-800 pt-6 flex flex-col md:flex-row justify-between items-center gap-3 text-slate-500 text-xs">
          <span>© 2026 SkyNode Labs. All rights reserved.</span>
          <span>Designed for the next generation of travelers ✦</span>
        </div>
      </div>
    </footer>
  );
}

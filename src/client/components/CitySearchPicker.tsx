import { useEffect, useMemo, useRef, useState } from "react";
import { Building2, Search, X } from "lucide-react";
import { searchPlaces } from "../api/flightsApi";
import type { Place } from "../../shared/types.js";

type Variant = "light" | "dark";

type Props = {
  label: string;
  value: string;
  onChange: (cityName: string) => void;
  placeholder?: string;
  variant?: Variant;
};

function normalizeSearchText(value: string): string {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

function cityMatchScore(place: Place, query: string): number {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return 0;

  const cityName = normalizeSearchText(place.cityName || place.name || "");
  const country = normalizeSearchText(place.countryName || "");

  if (cityName === normalizedQuery) return 100;
  if (cityName.startsWith(normalizedQuery)) return 80;
  if (cityName.includes(normalizedQuery)) return 60;
  if (country.includes(normalizedQuery)) return 20;

  return 0;
}

export function CitySearchPicker({
  label,
  value,
  onChange,
  placeholder = "Search city",
  variant = "light",
}: Props) {
  const [query, setQuery] = useState(value);
  const [places, setPlaces] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const cities = useMemo(() => {
    const seen = new Set<string>();
    const results: Place[] = [];

    for (const place of places) {
      const city: Place = place.type === "city"
        ? place
        : {
            code: place.cityCode || place.code,
            name: place.cityName || place.name,
            cityName: place.cityName || place.name,
            countryName: place.countryName,
            type: "city",
            coordinates: place.coordinates,
          };

      const key = `${city.cityName || city.name}|${city.countryName || ""}`.toLowerCase();

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      results.push(city);
    }

    return results
      .map((city) => ({ city, score: cityMatchScore(city, query) }))
      .filter((entry) => entry.score > 0 || !query.trim())
      .sort((a, b) => b.score - a.score || (a.city.cityName || a.city.name).localeCompare(b.city.cityName || b.city.name))
      .map((entry) => entry.city);
  }, [places, query]);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      const normalizedQuery = query.trim();

      if (normalizedQuery.length < 2) {
        setPlaces([]);
        return;
      }

      try {
        setPlaces(await searchPlaces(normalizedQuery, controller.signal));
      } catch {
        setPlaces([]);
      }
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [query]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
        setQuery(value);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [value]);

  function selectCity(city: Place) {
    const cityName = city.cityName || city.name;
    onChange(cityName);
    setQuery(cityName);
    setOpen(false);
  }

  function clearCity() {
    onChange("");
    setQuery("");
    setOpen(false);
  }

  const labelClass = variant === "dark" ? "text-slate-300" : "text-slate-600";
  const fieldClass = variant === "dark"
    ? "border-white/10 bg-white/10 text-white placeholder:text-slate-400"
    : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400";
  const menuClass = variant === "dark"
    ? "border-white/10 bg-slate-950 text-white shadow-black/30"
    : "border-slate-200 bg-white text-slate-900 shadow-slate-900/12";

  return (
    <div ref={wrapperRef} className="relative">
      <span className={`mb-1 block text-xs font-black uppercase tracking-widest ${labelClass}`}>{label}</span>
      <div className="relative">
        <Search className={`pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${variant === "dark" ? "text-slate-400" : "text-slate-400"}`} />
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className={`w-full rounded-xl border py-3 pl-10 pr-10 text-sm font-bold outline-none ${fieldClass}`}
        />
        {value && (
          <button
            type="button"
            onClick={clearCity}
            className={`absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 transition ${variant === "dark" ? "text-slate-300 hover:bg-white/10" : "text-slate-400 hover:bg-slate-100"}`}
            aria-label="Clear city"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {open && query.trim().length >= 2 && (
        <div className={`absolute left-0 right-0 top-full z-60 mt-2 max-h-64 overflow-y-auto rounded-2xl border p-1.5 shadow-2xl ${menuClass}`}>
          {cities.length === 0 ? (
            <p className={`px-3 py-2 text-sm font-semibold ${variant === "dark" ? "text-slate-400" : "text-slate-500"}`}>
              No cities found
            </p>
          ) : cities.map((city) => (
            <button
              key={`${city.cityName || city.name}-${city.countryName || ""}`}
              type="button"
              onClick={() => selectCity(city)}
              className={`flex w-full items-start gap-2.5 rounded-xl px-3 py-2.5 text-left transition ${variant === "dark" ? "hover:bg-white/10" : "hover:bg-blue-50"}`}
            >
              <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl ${variant === "dark" ? "bg-white/10 text-white" : "bg-blue-50 text-blue-700"}`}>
                <Building2 className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-black leading-tight">
                  {city.cityName || city.name}
                  {city.countryName && (
                    <span className={`ml-1 font-semibold ${variant === "dark" ? "text-slate-400" : "text-slate-500"}`}>
                      , {city.countryName}
                    </span>
                  )}
                </span>
                <span className={`mt-0.5 block text-[11px] font-semibold ${variant === "dark" ? "text-slate-400" : "text-slate-500"}`}>
                  City only
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

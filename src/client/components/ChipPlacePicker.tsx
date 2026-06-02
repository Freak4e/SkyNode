import { useEffect, useMemo, useRef, useState } from "react";
import { Building2, ChevronDown, MapPin, Plane } from "lucide-react";
import { searchPlaces } from "../api/flightsApi";
import type { Place } from "../../shared/types.js";

type Props = {
  label: string;
  value: Place;
  onChange: (place: Place) => void;
  chipColor?: "blue" | "cyan";
};

type PlaceGroup = {
  cityKey: string;
  city: Place | null;
  airports: Array<Place & { distanceKm?: number }>;
};

function formatPlace(place: Place): string {
  return place.type === "airport"
    ? place.cityName || place.name
    : place.cityName || place.name;
}

function distanceKm(a?: { lat: number; lon: number }, b?: { lat: number; lon: number }): number | undefined {
  if (!a || !b) return undefined;

  const R = 6371;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

function normalizeSearchText(value: string): string {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

function textMatchScore(place: Place | undefined | null, query: string): number {
  if (!place) return 0;

  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return 0;

  const cityName = normalizeSearchText(place.cityName || "");
  const name = normalizeSearchText(place.name || "");
  const code = normalizeSearchText(place.code || "");
  const country = normalizeSearchText(place.countryName || "");

  if (cityName === normalizedQuery || name === normalizedQuery || code === normalizedQuery) return 100;
  if (cityName.startsWith(normalizedQuery) || name.startsWith(normalizedQuery)) return 80;
  if (cityName.includes(normalizedQuery) || name.includes(normalizedQuery)) return 60;
  if (country === normalizedQuery) return 20;

  return 0;
}

function groupMatchScore(group: PlaceGroup, query: string): number {
  return Math.max(textMatchScore(group.city, query), ...group.airports.map((airport) => textMatchScore(airport, query)));
}

function groupPlaces(places: Place[], query: string): PlaceGroup[] {
  const groups = new Map<string, PlaceGroup>();

  for (const place of places) {
    const key = (place.type === "city" ? place.code : place.cityCode || place.cityName || place.code || place.name).toUpperCase();

    if (!groups.has(key)) {
      groups.set(key, { cityKey: key, city: null, airports: [] });
    }

    const group = groups.get(key)!;

    if (place.type === "city") {
      group.city = place;
    } else {
      group.airports.push({ ...place });
    }
  }

  for (const group of groups.values()) {
    if (group.city?.coordinates) {
      group.airports = group.airports.map((airport) => ({
        ...airport,
        distanceKm: distanceKm(group.city?.coordinates, airport.coordinates),
      }));
    }

    group.airports.sort((a, b) => (a.distanceKm ?? 1e9) - (b.distanceKm ?? 1e9) || a.code.localeCompare(b.code));
  }

  return Array.from(groups.values()).sort((a, b) => {
    const scoreDiff = groupMatchScore(b, query) - groupMatchScore(a, query);
    if (scoreDiff !== 0) return scoreDiff;

    if (a.city && !b.city) return -1;
    if (!a.city && b.city) return 1;
    const aName = a.city?.cityName || a.city?.name || a.airports[0]?.cityName || a.airports[0]?.name || "";
    const bName = b.city?.cityName || b.city?.name || b.airports[0]?.cityName || b.airports[0]?.name || "";
    return aName.localeCompare(bName);
  });
}

export function ChipPlacePicker({ label, value, onChange }: Props) {
  const [query, setQuery] = useState(formatPlace(value));
  const [places, setPlaces] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const grouped = useMemo(() => groupPlaces(places, query), [places, query]);

  useEffect(() => {
    setQuery(formatPlace(value));
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

    return () => { controller.abort(); window.clearTimeout(timeout); };
  }, [query]);

  useEffect(() => {
    function outside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery(formatPlace(value));
      }
    }
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, [value]);

  function selectPlace(place: Place) {
    onChange(place);
    setQuery(formatPlace(place));
    setOpen(false);
  }

  return (
    <div ref={wrapperRef} className="relative min-w-0">
      <label className="block">
        <span className="block text-xs text-slate-400 font-medium mb-1">{label}</span>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={(event) => {
              setOpen(true);
              event.currentTarget.select();
            }}
            placeholder={`${label} city or airport`}
            className="w-28 min-w-0 text-sm font-semibold text-slate-800 bg-transparent outline-none placeholder:text-slate-400 sm:w-36"
            required
          />
          {value.code ? (
            <span className="shrink-0 rounded-lg bg-blue-50 px-2 py-1 text-xs font-black text-blue-600">
              {value.code}
            </span>
          ) : null}
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        </div>
      </label>

      {open && grouped.length > 0 && (
        <div
          className="absolute left-0 z-50 mt-2 max-h-64 w-[min(360px,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-white/70 bg-white p-1.5 shadow-2xl shadow-slate-900/15"
          style={{ top: "100%" }}
        >
          {grouped.map((group) => (
            <div key={group.cityKey} className="mb-1.5 overflow-hidden rounded-2xl border border-slate-100 last:mb-0">
              {group.city && (
                <button
                  type="button"
                  onClick={() => selectPlace(group.city!)}
                  className="flex w-full items-start gap-2.5 bg-white px-3 py-2 text-left transition-colors hover:bg-blue-50"
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                    <Building2 className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-black leading-tight text-slate-950">
                      {group.city.cityName || group.city.name}
                      {group.city.countryName && (
                        <span className="ml-1 font-semibold text-slate-500">, {group.city.countryName}</span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-[11px] font-semibold text-slate-500">
                      City search · all airports{group.airports.length > 0 ? ` · ${group.airports.length} airport${group.airports.length === 1 ? "" : "s"}` : ""}
                    </span>
                  </span>
                  <span className="ml-2 rounded-xl bg-blue-600 px-2.5 py-1 text-xs font-black text-white">
                    {group.city.code}
                  </span>
                </button>
              )}

              {group.airports.map((airport) => (
                <button
                  type="button"
                  key={`${group.cityKey}-${airport.code}`}
                  onClick={() => selectPlace(airport)}
                  className="flex w-full items-start gap-2.5 border-t border-slate-100 px-3 py-2 pl-8 text-left transition-colors hover:bg-slate-50"
                >
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                    <Plane className="h-3 w-3" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold leading-tight text-slate-900">{airport.name}</span>
                    <span className="mt-0.5 block text-[11px] text-slate-500">
                      Airport in {airport.cityName || group.city?.cityName || group.cityKey}
                      {typeof airport.distanceKm === "number" ? ` · ${airport.distanceKm} km from center` : ""}
                    </span>
                  </span>
                  <span className="ml-2 rounded-lg bg-slate-100 px-2 py-1 text-xs font-black text-slate-700">{airport.code}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      {open && query.trim().length >= 2 && grouped.length === 0 && (
        <div
          className="absolute left-0 right-0 z-50 mt-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-xl"
          style={{ top: "100%", minWidth: 280 }}
        >
          No places found
        </div>
      )}
    </div>
  );
}

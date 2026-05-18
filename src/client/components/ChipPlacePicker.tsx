import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, MapPin, Plane } from "lucide-react";
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
  return place.cityName || place.name;
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

function groupPlaces(places: Place[]): PlaceGroup[] {
  const groups = new Map<string, PlaceGroup>();

  for (const place of places) {
    const key = (place.cityCode || place.cityName || place.code || place.name).toUpperCase();

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

    group.airports.sort((a, b) => (a.distanceKm ?? 1e9) - (b.distanceKm ?? 1e9));
  }

  return Array.from(groups.values()).sort((a, b) => {
    if (a.city && !b.city) return -1;
    if (!a.city && b.city) return 1;
    return 0;
  });
}

export function ChipPlacePicker({ label, value, onChange }: Props) {
  const [query, setQuery] = useState(formatPlace(value));
  const [places, setPlaces] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const grouped = useMemo(() => groupPlaces(places), [places]);

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
            className="min-w-0 flex-1 text-slate-800 font-semibold text-sm bg-transparent outline-none placeholder:text-slate-400"
            required
          />
          <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-bold text-blue-600">
            {value.code}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        </div>
      </label>

      {open && grouped.length > 0 && (
        <div
          className="absolute left-0 right-0 z-50 mt-2 max-h-96 overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl"
          style={{ top: "100%", minWidth: 340 }}
        >
          {grouped.map((group) => (
            <div key={group.cityKey} className="border-b border-slate-100 last:border-b-0">
              {group.city && (
                <button
                  type="button"
                  onClick={() => selectPlace(group.city!)}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-blue-50"
                >
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                    <MapPin className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-black text-slate-950">
                      {group.city.cityName || group.city.name}
                      {group.city.countryName && (
                        <span className="ml-1 font-semibold text-slate-500">, {group.city.countryName}</span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-xs font-semibold text-slate-500">
                      All airports{group.airports.length > 0 ? ` · ${group.airports.length}` : ""}
                    </span>
                  </span>
                  <span className="ml-2 rounded-md bg-slate-100 px-2 py-1 text-xs font-black text-slate-700">
                    {group.city.code}
                  </span>
                </button>
              )}

              {group.airports.map((airport) => (
                <button
                  type="button"
                  key={`${group.cityKey}-${airport.code}`}
                  onClick={() => selectPlace(airport)}
                  className="flex w-full items-start gap-3 px-4 py-2.5 pl-12 text-left transition-colors hover:bg-blue-50"
                >
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                    <Plane className="h-3 w-3" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-slate-800">
                      <span className="font-black text-slate-950">{airport.code}</span>
                      <span className="ml-2">{airport.name}</span>
                    </span>
                    {typeof airport.distanceKm === "number" && (
                      <span className="mt-0.5 block text-xs text-slate-500">
                        {airport.distanceKm} km from the city center
                      </span>
                    )}
                  </span>
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

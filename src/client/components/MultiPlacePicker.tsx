import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Building2, Plane, X } from "lucide-react";
import { searchPlaces } from "../api/flightsApi";
import type { Place } from "../../shared/types.js";

type MultiPlacePickerProps = {
  label: string;
  values: Place[];
  onChange: (places: Place[]) => void;
  placeholder?: string;
  menuMode?: "floating" | "inline";
};

type PlaceGroup = {
  cityKey: string;
  city: Place | null;
  airports: Array<Place & { distanceKm?: number }>;
};

function placeLabel(place: Place): string {
  return place.cityName || place.name;
}

function hasVisiblePlaceValue(place: Place): boolean {
  return Boolean(place.code.trim() || placeLabel(place).trim());
}

function distanceKm(a?: { lat: number; lon: number }, b?: { lat: number; lon: number }): number | undefined {
  if (!a || !b) return undefined;

  const earthRadiusKm = 6371;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  return Math.round(2 * earthRadiusKm * Math.asin(Math.sqrt(h)));
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

  places.forEach((place) => {
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
  });

  groups.forEach((group) => {
    if (group.city?.coordinates) {
      group.airports = group.airports.map((airport) => ({
        ...airport,
        distanceKm: distanceKm(group.city?.coordinates, airport.coordinates),
      }));
    }

    group.airports.sort((a, b) => (a.distanceKm ?? 1e9) - (b.distanceKm ?? 1e9) || a.code.localeCompare(b.code));
  });

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

export function MultiPlacePicker({ label, values, onChange, placeholder, menuMode = "floating" }: MultiPlacePickerProps) {
  const [query, setQuery] = useState("");
  const [places, setPlaces] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const wrapperRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const visibleValues = useMemo(() => values.filter(hasVisiblePlaceValue), [values]);
  const selectedCodes = useMemo(() => new Set(visibleValues.map((place) => place.code.toUpperCase()).filter(Boolean)), [visibleValues]);
  const groupedPlaces = useMemo(() => groupPlaces(places, query), [places, query]);
  const menuOpen = open && query.trim().length >= 2;
  const floatingMenu = menuMode === "floating";

  const updateMenuPosition = useCallback(() => {
    const wrapper = wrapperRef.current;

    if (!wrapper) return;

    const rect = wrapper.getBoundingClientRect();
    const viewportMargin = 12;
    const availableWidth = Math.max(280, window.innerWidth - viewportMargin * 2);
    const preferredWidth = window.innerWidth < 640 ? availableWidth : Math.max(rect.width, 384);
    const width = Math.min(preferredWidth, availableWidth);
    const left = Math.min(Math.max(rect.left, viewportMargin), window.innerWidth - width - viewportMargin);
    const spaceBelow = window.innerHeight - rect.bottom - viewportMargin;
    const maxHeight = Math.max(220, Math.min(384, spaceBelow - 8));
    const top = rect.bottom + 8;

    setMenuStyle({
      left,
      maxHeight,
      top,
      width,
    });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      const cleanQuery = query.trim();

      if (cleanQuery.length < 2) {
        setPlaces([]);
        return;
      }

      try {
        setPlaces(await searchPlaces(cleanQuery, controller.signal));
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
      const target = event.target as Node;

      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setOpen(false);
        setQuery("");
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (!menuOpen || !floatingMenu) return undefined;

    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);

    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [floatingMenu, menuOpen, updateMenuPosition]);

  function addPlace(place: Place) {
    if (!selectedCodes.has(place.code.toUpperCase())) {
      onChange([...visibleValues, place]);
    }

    setQuery("");
    setPlaces([]);
    setOpen(false);
  }

  function removePlace(code: string) {
    onChange(values.filter((place) => place.code !== code));
  }

  const menu = menuOpen ? (
    <div
      ref={menuRef}
      className={floatingMenu
        ? "fixed z-[9999] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-900/12"
        : "absolute left-0 right-0 top-full z-[170] mt-3 max-h-96 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-900/12 sm:min-w-96"
      }
      style={floatingMenu ? menuStyle : undefined}
    >
      {groupedPlaces.length === 0 ? (
        <p className="px-4 py-3 text-sm font-bold text-slate-500">No cities or airports found</p>
      ) : groupedPlaces.slice(0, 8).map((group) => {
        const cityName = group.city?.cityName || group.city?.name || group.airports[0]?.cityName || group.airports[0]?.name || group.cityKey;
        const countryName = group.city?.countryName || group.airports[0]?.countryName || "";

        return (
          <div key={group.cityKey} className="overflow-hidden rounded-2xl border border-slate-100 bg-white last:mb-0">
            <div className="bg-slate-50 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
              {cityName}{countryName ? `, ${countryName}` : ""}
            </div>

            {group.city && (
              <button
                type="button"
                onClick={() => addPlace(group.city!)}
                disabled={selectedCodes.has(group.city.code.toUpperCase())}
                className="flex w-full items-center gap-3 px-3 py-3 text-left transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-700">
                  <Building2 className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-black text-slate-950">{cityName}</span>
                  <span className="mt-0.5 block truncate text-xs font-semibold text-slate-500">
                    Search all airports in this city{group.airports.length > 0 ? ` - ${group.airports.length} airport${group.airports.length === 1 ? "" : "s"}` : ""}
                  </span>
                </span>
                <span className="rounded-xl bg-blue-600 px-2.5 py-1 text-xs font-black text-white">{group.city.code}</span>
              </button>
            )}

            {group.airports.map((airport) => (
              <button
                key={`${group.cityKey}-${airport.code}`}
                type="button"
                onClick={() => addPlace(airport)}
                disabled={selectedCodes.has(airport.code.toUpperCase())}
                className="flex w-full items-center gap-3 border-t border-slate-100 px-3 py-2.5 pl-8 text-left transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600">
                  <Plane className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-slate-900">{airport.name}</span>
                  <span className="mt-0.5 block truncate text-xs font-semibold text-slate-500">
                    Airport in {airport.cityName || cityName}
                    {typeof airport.distanceKm === "number" ? ` - ${airport.distanceKm} km from center` : ""}
                  </span>
                </span>
                <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-black text-slate-700">{airport.code}</span>
              </button>
            ))}
          </div>
        );
      })}
    </div>
  ) : null;

  return (
    <div ref={wrapperRef} className={`relative min-w-0 ${open ? "z-[150]" : "z-10"}`}>
      <div className="scrollbar-none flex min-h-11 min-w-0 items-center gap-2 overflow-x-auto whitespace-nowrap pr-1">
        {label && <span className="shrink-0 text-sm font-semibold text-slate-600">{label}</span>}
        {visibleValues.map((place) => (
          <span key={place.code} className="inline-flex max-w-32 shrink-0 items-center gap-1.5 rounded-lg border border-sky-200/70 bg-sky-50/90 px-2.5 py-1.5 text-sm font-black text-sky-800 shadow-sm">
            <span className="truncate">{placeLabel(place)}</span>
            <button type="button" onClick={() => removePlace(place.code)} className="rounded-full p-0.5 text-sky-500 transition hover:bg-sky-100 hover:text-sky-900" aria-label={`Remove ${placeLabel(place)}`}>
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
        <label className="flex min-w-28 shrink-0 items-center">
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder={visibleValues.length === 0 ? placeholder || "Add city or airport" : "Add more"}
            className="w-32 bg-transparent text-sm font-bold text-slate-900 outline-none placeholder:text-slate-500"
          />
        </label>
      </div>

      {floatingMenu && menu && typeof document !== "undefined" ? createPortal(menu, document.body) : menu}
    </div>
  );
}

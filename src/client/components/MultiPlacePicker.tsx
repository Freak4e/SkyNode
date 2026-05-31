import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin, Plane, Plus, X } from "lucide-react";
import { searchPlaces } from "../api/flightsApi";
import type { Place } from "../../shared/types.js";

type MultiPlacePickerProps = {
  label: string;
  values: Place[];
  onChange: (places: Place[]) => void;
  placeholder?: string;
};

function placeLabel(place: Place): string {
  const city = place.cityName || place.name;
  return place.type === "airport" ? `${city} (${place.code})` : `${city} (${place.code})`;
}

export function MultiPlacePicker({ label, values, onChange, placeholder }: MultiPlacePickerProps) {
  const [query, setQuery] = useState("");
  const [places, setPlaces] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const selectedCodes = useMemo(() => new Set(values.map((place) => place.code)), [values]);

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
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function addPlace(place: Place) {
    if (!selectedCodes.has(place.code)) {
      onChange([...values, place]);
    }

    setQuery("");
    setPlaces([]);
    setOpen(false);
  }

  function removePlace(code: string) {
    if (values.length <= 1) {
      return;
    }

    onChange(values.filter((place) => place.code !== code));
  }

  return (
    <div ref={wrapperRef} className="relative min-w-0">
      <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">{label}</span>
      <div className="mt-1 flex min-h-10 flex-wrap items-center gap-2">
        {values.map((place) => (
          <span key={place.code} className="inline-flex max-w-full items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-700 ring-1 ring-blue-100">
            {place.type === "airport" ? <Plane className="h-3.5 w-3.5 shrink-0" /> : <MapPin className="h-3.5 w-3.5 shrink-0" />}
            <span className="truncate">{placeLabel(place)}</span>
            <button type="button" onClick={() => removePlace(place.code)} className="rounded-full p-0.5 text-blue-500 hover:bg-blue-100 hover:text-blue-800" aria-label={`Remove ${placeLabel(place)}`}>
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
        <label className="flex min-w-40 flex-1 items-center gap-2">
          <Plus className="h-3.5 w-3.5 text-slate-400" />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder || "Add city or airport"}
            className="min-w-24 flex-1 bg-transparent text-sm font-bold text-slate-900 outline-none placeholder:text-slate-400"
          />
        </label>
      </div>

      {open && query.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-80 overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl" style={{ minWidth: 320 }}>
          {places.length === 0 ? (
            <p className="px-4 py-3 text-sm font-bold text-slate-500">No places found</p>
          ) : places.slice(0, 10).map((place) => (
            <button
              key={`${place.type}-${place.code}`}
              type="button"
              onClick={() => addPlace(place)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-blue-50 disabled:opacity-40"
              disabled={selectedCodes.has(place.code)}
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-600">
                {place.type === "airport" ? <Plane className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-black text-slate-950">{place.cityName || place.name}</span>
                <span className="block truncate text-xs font-semibold text-slate-500">{place.name} {place.countryName ? `- ${place.countryName}` : ""}</span>
              </span>
              <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-black text-slate-700">{place.code}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

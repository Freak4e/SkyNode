import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { searchPlaces } from "../api/flightsApi";
import type { Place } from "../../shared/types.js";

type Props = {
  label: string;
  value: Place;
  onChange: (place: Place) => void;
  chipColor?: "blue" | "cyan";
};

function formatPlace(place: Place): string {
  return place.cityName || place.name;
}

export function ChipPlacePicker({ label, value, onChange }: Props) {
  const [query, setQuery] = useState(formatPlace(value));
  const [places, setPlaces] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

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

      {/* Dropdown */}
      {open && places.length > 0 && (
        <div className="place-menu" style={{ top: "calc(100% + 8px)", minWidth: 280 }}>
          {places.map((p) => (
            <button
              type="button"
              key={`${p.code}-${p.type}`}
              onClick={() => selectPlace(p)}
            >
              <span>{p.cityName || p.name}, {p.countryName}</span>
              <strong>{p.code}</strong>
            </button>
          ))}
        </div>
      )}

      {open && query.trim().length >= 2 && places.length === 0 && (
        <div className="place-menu" style={{ top: "calc(100% + 8px)", minWidth: 280 }}>
          <div className="px-3.5 py-3 text-sm text-slate-500">No places found</div>
        </div>
      )}
    </div>
  );
}

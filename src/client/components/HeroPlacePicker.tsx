import { useEffect, useRef, useState } from "react";
import { searchPlaces } from "../api/flightsApi";
import type { Place } from "../../shared/types.js";

type Props = {
  label: string;
  icon: React.ReactNode;
  value: Place;
  onChange: (place: Place) => void;
};

function formatPlace(place: Place): string {
  return place.cityName && place.cityName !== place.name
    ? `${place.cityName}, ${place.countryName}`
    : `${place.name}, ${place.countryName}`;
}

export function HeroPlacePicker({ label, icon, value, onChange }: Props) {
  const [query, setQuery] = useState(formatPlace(value));
  const [places, setPlaces] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      if (query.length < 2) { setPlaces([]); return; }
      try {
        setPlaces(await searchPlaces(query, controller.signal));
      } catch {
        setPlaces([]);
      }
    }, 180);
    return () => { controller.abort(); window.clearTimeout(timeout); };
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function selectPlace(place: Place) {
    onChange(place);
    setQuery(formatPlace(place));
    setOpen(false);
  }

  return (
    <div ref={wrapperRef} className="relative flex-1 min-w-0">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
        {icon} {label}
      </p>
      <input
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={`City or airport`}
        className="w-full text-slate-900 font-semibold text-sm bg-transparent outline-none placeholder:text-slate-400 truncate"
        required
      />
      <p className="text-xs text-slate-400 mt-0.5">{value.code}</p>

      {open && places.length > 0 && (
        <div className="place-menu">
          {places.map((place) => (
            <button
              type="button"
              key={`${place.code}-${place.type}`}
              onClick={() => selectPlace(place)}
            >
              <span>{place.cityName || place.name}, {place.countryName}</span>
              <strong>{place.code}</strong>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

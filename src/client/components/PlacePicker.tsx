import { useEffect, useState } from "react";
import { searchPlaces } from "../api/flightsApi";
import type { Place } from "../../shared/types.js";

type Props = {
  label: string;
  value: Place;
  onChange: (place: Place) => void;
};

export function PlacePicker({ label, value, onChange }: Props) {
  const [query, setQuery] = useState(formatPlace(value));
  const [places, setPlaces] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      try {
        setPlaces(await searchPlaces(query, controller.signal));
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setPlaces([]);
        }
      }
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [query]);

  function selectPlace(place: Place) {
    onChange(place);
    setQuery(formatPlace(place));
    setOpen(false);
  }

  return (
    <label className="place-picker">
      {label === "From" ? "🌍 From" : "🏁 To"}
      <input
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        required
      />
      {open && places.length > 0 && (
        <div className="place-menu">
          {places.map((place) => (
            <button type="button" key={`${place.code}-${place.type}`} onClick={() => selectPlace(place)}>
              <span>{formatPlace(place)}</span>
              <strong>{place.code}</strong>
            </button>
          ))}
        </div>
      )}
      <span className="selected-code">{label}: {value.code}</span>
    </label>
  );
}

function formatPlace(place: Place): string {
  const placeName = place.name === place.cityName ? place.name : `${place.name}, ${place.cityName}`;
  return [placeName, place.countryName].filter(Boolean).join(", ");
}

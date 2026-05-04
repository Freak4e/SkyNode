import type { FormEvent } from "react";
import { PlacePicker } from "./PlacePicker";
import type { Place, ProviderId } from "../../shared/types.js";

type Props = {
  from: Place;
  to: Place;
  date: string;
  provider: ProviderId;
  loading: boolean;
  onFromChange: (place: Place) => void;
  onToChange: (place: Place) => void;
  onDateChange: (date: string) => void;
  onProviderChange: (provider: ProviderId) => void;
  onSubmit: (event: FormEvent) => void;
};

export function SearchForm({
  from,
  to,
  date,
  provider,
  loading,
  onFromChange,
  onToChange,
  onDateChange,
  onProviderChange,
  onSubmit,
}: Props) {
  return (
    <form className="search-panel" onSubmit={onSubmit}>
      <PlacePicker label="From" value={from} onChange={onFromChange} />
      <PlacePicker label="To" value={to} onChange={onToChange} />

      <label>
        🛫 Code
        <input value={from.code} readOnly title="IATA code sent to the flight provider" />
      </label>

      <label>
        🛬 Code
        <input value={to.code} readOnly title="IATA code sent to the flight provider" />
      </label>

      <label>
        📅 Depart
        <input type="date" value={date} onChange={(event) => onDateChange(event.target.value)} required />
      </label>

      <label>
        ⚙️ Provider
        <select value={provider} onChange={(event) => onProviderChange(event.target.value as ProviderId)}>
          <option value="scrapingbee">ScrapingBee live fetch</option>
          <option value="auto">Live fetch, then cached data</option>
          <option value="travelpayouts">Travelpayouts cached data</option>
        </select>
      </label>

      <button type="submit" disabled={loading}>
        {loading ? "Searching..." : "Search ✨"}
      </button>
    </form>
  );
}

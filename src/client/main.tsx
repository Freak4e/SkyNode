import { FormEvent, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { searchFlights } from "./api/flightsApi";
import { ResultsList } from "./components/ResultsList";
import { SearchForm } from "./components/SearchForm";
import type { FlightSearchResponse, Place, ProviderId } from "../shared/types.js";
import "./styles.css";

const today = new Date().toISOString().slice(0, 10);
const defaultFrom: Place = {
  code: "SKP",
  name: "Skopje",
  cityName: "Skopje",
  countryName: "North Macedonia",
  type: "city",
};
const defaultTo: Place = {
  code: "IST",
  name: "Istanbul",
  cityName: "Istanbul",
  countryName: "Turkey",
  type: "city",
};

function App() {
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [date, setDate] = useState(today);
  const [provider, setProvider] = useState<ProviderId>("scrapingbee");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FlightSearchResponse | null>(null);
  const [error, setError] = useState("");

  const requestUrl = useMemo(() => {
    const params = new URLSearchParams({
      from: from.code,
      to: to.code,
      date,
      provider,
    });

    return `/api/flights?${params.toString()}`;
  }, [date, from.code, provider, to.code]);

  async function handleSearch(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      setResult(await searchFlights({ from: from.code, to: to.code, date, provider }));
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : "Flight search failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="shell">
      <section className="toolbar">
        <div>
          <p className="eyebrow"><span>✈️</span> SkyNode prototype</p>
          <h1>Find a flight path without fighting provider URLs.</h1>
          <div className="route-preview" aria-label="Selected route">
            <span>{from.code}</span>
            <b>→</b>
            <span>{to.code}</span>
            <small>{date}</small>
          </div>
        </div>
        <div className="hero-card">
          <span className="hero-emoji">🧭</span>
          <strong>{result?.source || "ready"}</strong>
          <small>{loading ? "Searching skies" : "Provider status"}</small>
        </div>
      </section>

      <SearchForm
        from={from}
        to={to}
        date={date}
        provider={provider}
        loading={loading}
        onFromChange={setFrom}
        onToChange={setTo}
        onDateChange={setDate}
        onProviderChange={setProvider}
        onSubmit={handleSearch}
      />

      <section className="quick-strip" aria-label="Search details">
        <span>🌍 {from.cityName}</span>
        <span>🛬 {to.cityName}</span>
        <span>📅 {date}</span>
        <span>⚙️ {provider}</span>
      </section>

      <code className="request-line">{requestUrl}</code>

      {error && <div className="notice error">{error}</div>}

      {result?.warnings.map((warning) => (
        <div className="notice" key={warning}>{warning}</div>
      ))}

      <ResultsList result={result} />
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<App />);

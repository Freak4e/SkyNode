import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import {
  Activity,
  AlertTriangle,
  Compass,
  Gauge,
  Globe2,
  Info,
  MapPinned,
  Maximize2,
  Plane,
  Radar,
  RefreshCw,
  Search,
  Wind,
  X,
} from "lucide-react";
import { Footer } from "../components/Footer";
import { Navbar } from "../components/Navbar";
import type { LiveFlight, LiveFlightsResponse } from "../../shared/types";
import { formatAltitude, formatHeading, formatSpeed } from "../../shared/liveFlightUtils";

type WeatherSelection = {
  status: "idle" | "loading" | "ready" | "error";
  placeName?: string;
  country?: string;
  imageUrl?: string;
  lat?: number;
  lon?: number;
  temperature?: number;
  apparentTemperature?: number;
  humidity?: number;
  windSpeed?: number;
  weatherCode?: number;
  forecast?: ForecastDay[];
  updatedAt?: string;
  error?: string;
};

type ForecastDay = {
  date: string;
  min: number;
  max: number;
  precipitationChance?: number;
  weatherCode?: number;
};

type RadarRegion = {
  id: string;
  label: string;
  detail: string;
  bbox?: { lamin: number; lomin: number; lamax: number; lomax: number };
  center: L.LatLngExpression;
};

const DEFAULT_MAP_CENTER: L.LatLngExpression = [20, 0];
const DEFAULT_MAP_ZOOM = 2;
const REGION_VIEW_MAX_ZOOM = 3;

function regionBounds(region: RadarRegion): L.LatLngBounds | null {
  if (!region.bbox) return null;
  return L.latLngBounds(
    [region.bbox.lamin, region.bbox.lomin],
    [region.bbox.lamax, region.bbox.lomax],
  );
}

function applyRegionView(map: L.Map, region: RadarRegion): void {
  const bounds = regionBounds(region);

  if (bounds) {
    map.flyToBounds(bounds, {
      padding: [48, 48],
      maxZoom: REGION_VIEW_MAX_ZOOM,
      duration: 0.75,
    });
    return;
  }

  map.flyTo(DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM, { duration: 0.75 });
}

const radarRegions: RadarRegion[] = [
  { id: "world", label: "World", detail: "Sampled global mix", center: [20, 0] },
  { id: "europe", label: "Europe", detail: "Dense coverage", bbox: { lamin: 35, lomin: -12, lamax: 62, lomax: 35 }, center: [50, 15] },
  { id: "north-america", label: "North America", detail: "US & Canada", bbox: { lamin: 24, lomin: -130, lamax: 55, lomax: -60 }, center: [42, -98] },
  { id: "asia", label: "Asia", detail: "East & Southeast", bbox: { lamin: -10, lomin: 70, lamax: 55, lomax: 145 }, center: [25, 100] },
];

const overlayPanelClass = "rounded-2xl border border-white/60 bg-white/78 shadow-xl backdrop-blur-md";

const statusStyles: Record<LiveFlight["status"], string> = {
  Cruising: "bg-sky-50 text-sky-700 ring-sky-100",
  Climbing: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  Descending: "bg-amber-50 text-amber-700 ring-amber-100",
  "On ground": "bg-slate-100 text-slate-600 ring-slate-200",
};

export function LiveFlightsPage() {
  const [weather, setWeather] = useState<WeatherSelection>({ status: "idle" });
  const [flights, setFlights] = useState<LiveFlight[]>([]);
  const [totalAvailable, setTotalAvailable] = useState(0);
  const [flightWarnings, setFlightWarnings] = useState<string[]>([]);
  const [flightStatus, setFlightStatus] = useState<"loading" | "ready" | "error">("loading");
  const [updatedAt, setUpdatedAt] = useState<string | undefined>();
  const [expandedMap, setExpandedMap] = useState(false);
  const [selectedRegionId, setSelectedRegionId] = useState("world");
  const [selectedFlightId, setSelectedFlightId] = useState<string | null>(null);
  const [feedQuery, setFeedQuery] = useState("");
  const feedListRef = useRef<HTMLDivElement>(null);

  const selectedRegion = radarRegions.find((region) => region.id === selectedRegionId) || radarRegions[0];
  const selectedFlight = flights.find((flight) => flight.id === selectedFlightId) || null;

  const filteredFlights = feedQuery.trim()
    ? flights.filter((flight) => {
        const query = feedQuery.trim().toLowerCase();
        return (
          flight.callsign.toLowerCase().includes(query)
          || flight.airline.toLowerCase().includes(query)
          || flight.originCountry.toLowerCase().includes(query)
        );
      })
    : flights;

  const loadFlights = useCallback(async (region: RadarRegion = selectedRegion) => {
    setFlightStatus((current) => (current === "ready" ? "ready" : "loading"));

    try {
      const params = new URLSearchParams({
        samplePercent: region.id === "world" ? "5" : "10",
      });
      if (region.bbox) {
        params.set("lamin", String(region.bbox.lamin));
        params.set("lomin", String(region.bbox.lomin));
        params.set("lamax", String(region.bbox.lamax));
        params.set("lomax", String(region.bbox.lomax));
      }

      const response = await fetch(`/api/live-flights?${params.toString()}`);
      const data = await response.json() as LiveFlightsResponse;

      if (!response.ok) {
        throw new Error(data.warnings?.[0] || "Could not load live flights.");
      }

      setFlights(data.flights);
      setTotalAvailable(data.totalAvailable || data.flights.length);
      setFlightWarnings(data.warnings || []);
      setUpdatedAt(data.updatedAt);
      setFlightStatus("ready");
      setSelectedFlightId((current) => (
        current && data.flights.some((flight) => flight.id === current) ? current : data.flights[0]?.id || null
      ));
    } catch (error) {
      setFlightWarnings([error instanceof Error ? error.message : "Could not load live flights."]);
      setFlightStatus("error");
    }
  }, [selectedRegion]);

  useEffect(() => {
    void loadFlights(selectedRegion);
    const interval = window.setInterval(() => void loadFlights(selectedRegion), 30000);
    return () => window.clearInterval(interval);
  }, [loadFlights, selectedRegion]);

  useEffect(() => {
    if (!selectedFlightId || !feedListRef.current) {
      return;
    }

    const row = feedListRef.current.querySelector(`[data-flight-id="${selectedFlightId}"]`);
    row?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedFlightId, filteredFlights.length]);

  const handleLocationSelect = useCallback(async ({ lat, lon }: { lat: number; lon: number }) => {
    setWeather({ status: "loading", lat, lon });

    try {
      const weatherUrl = new URL("https://api.open-meteo.com/v1/forecast");
      weatherUrl.searchParams.set("latitude", String(lat));
      weatherUrl.searchParams.set("longitude", String(lon));
      weatherUrl.searchParams.set("current", "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m");
      weatherUrl.searchParams.set("daily", "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max");
      weatherUrl.searchParams.set("forecast_days", "5");
      weatherUrl.searchParams.set("timezone", "auto");

      const reverseUrl = new URL("https://nominatim.openstreetmap.org/reverse");
      reverseUrl.searchParams.set("format", "jsonv2");
      reverseUrl.searchParams.set("lat", String(lat));
      reverseUrl.searchParams.set("lon", String(lon));
      reverseUrl.searchParams.set("zoom", "10");
      reverseUrl.searchParams.set("addressdetails", "1");

      const [weatherResponse, locationResponse] = await Promise.allSettled([
        fetch(weatherUrl),
        fetch(reverseUrl),
      ]);

      if (weatherResponse.status !== "fulfilled" || !weatherResponse.value.ok) {
        throw new Error("Weather unavailable for this point.");
      }

      const weatherData = await weatherResponse.value.json();
      const current = weatherData.current;
      let placeName = "Map location";
      let country = "";

      if (locationResponse.status === "fulfilled" && locationResponse.value.ok) {
        const locationData = await locationResponse.value.json();
        const address = locationData.address || {};
        placeName = address.city || address.town || address.village || address.state || locationData.name || placeName;
        country = address.country || "";
      }

      const imageUrl = await fetchWikipediaImage(placeName, country);

      setWeather({
        status: "ready",
        placeName,
        country,
        imageUrl,
        lat,
        lon,
        temperature: current.temperature_2m,
        apparentTemperature: current.apparent_temperature,
        humidity: current.relative_humidity_2m,
        windSpeed: current.wind_speed_10m,
        weatherCode: current.weather_code,
        forecast: parseForecast(weatherData.daily),
        updatedAt: current.time,
      });
    } catch (error) {
      setWeather({
        status: "error",
        lat,
        lon,
        error: error instanceof Error ? error.message : "Could not load weather.",
      });
    }
  }, []);

  const selectFlight = useCallback((flight: LiveFlight) => {
    setSelectedFlightId(flight.id);
  }, []);

  useEffect(() => {
    if (!expandedMap) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setExpandedMap(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [expandedMap]);

  useEffect(() => {
    document.body.style.overflow = expandedMap ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [expandedMap]);

  const sidebar = (layout: "sidebar" | "overlay") => (
    <LiveFlightsSidebar
      layout={layout}
      selectedFlight={selectedFlight}
      updatedAt={updatedAt}
      selectedRegion={selectedRegion}
      filteredFlights={filteredFlights}
      flights={flights}
      flightStatus={flightStatus}
      feedQuery={feedQuery}
      selectedFlightId={selectedFlightId}
      feedListRef={feedListRef}
      totalAvailable={totalAvailable}
      onFeedQueryChange={setFeedQuery}
      onSelectFlight={selectFlight}
      weather={weather}
      feedMaxHeight={layout === "overlay" ? "140px" : "340px"}
    />
  );

  return (
    <div className="min-h-screen bg-[#f6f8fc] text-slate-950">
      <Navbar />

      <main className="pt-24">
        <section className="relative overflow-hidden bg-white px-4 pb-8 pt-6 sm:px-6 lg:px-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(59,130,246,0.14),transparent_28%),radial-gradient(circle_at_88%_0%,rgba(14,165,233,0.12),transparent_32%)]" />
          <div className="relative mx-auto max-w-7xl">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <span className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-sky-700">
                  <Radar className="h-4 w-4" />
                  Live flight radar
                </span>
                <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
                  See aircraft moving in real time
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
                  OpenSky tracks aircraft worldwide. World view shows 5% of live positions, mixed globally. Zoom in to reveal individual planes — clusters show counts when zoomed out.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <StatCard
                  icon={Plane}
                  label="Aircraft"
                  value={formatFlightCount(flights.length, totalAvailable)}
                />
                <StatCard icon={Globe2} label="Coverage" value="Global" />
                <StatCard icon={Activity} label="Refresh" value="30s" />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {radarRegions.map((region) => {
                const active = region.id === selectedRegion.id;
                return (
                  <button
                    key={region.id}
                    type="button"
                    onClick={() => {
                      setSelectedRegionId(region.id);
                      setSelectedFlightId(null);
                    }}
                    className={`rounded-2xl border px-4 py-3 text-left transition ${
                      active
                        ? "border-blue-500 bg-blue-600 text-white shadow-md shadow-blue-500/20"
                        : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50/70"
                    }`}
                  >
                    <span className="block text-sm font-black">{region.label}</span>
                    <span className={`mt-0.5 block text-xs font-semibold ${active ? "text-blue-100" : "text-slate-400"}`}>
                      {region.detail}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="px-4 pb-10 sm:px-6 lg:px-10">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
              <div className="relative min-h-[520px] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-card-strong">
                <MapStatusBadge flightStatus={flightStatus} selectedRegion={selectedRegion} flightsCount={flights.length} />

                <div className="absolute right-4 top-4 z-20 flex gap-2">
                  <button
                    type="button"
                    onClick={() => void loadFlights(selectedRegion)}
                    className="grid h-10 w-10 place-items-center rounded-full border border-white/80 bg-white/95 text-blue-600 shadow-md backdrop-blur hover:bg-blue-50"
                    aria-label="Refresh live flights"
                  >
                    <RefreshCw className={`h-4 w-4 ${flightStatus === "loading" ? "animate-spin" : ""}`} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpandedMap(true)}
                    className="grid h-10 w-10 place-items-center rounded-full border border-white/80 bg-white/95 text-blue-600 shadow-md backdrop-blur hover:bg-blue-50"
                    aria-label="Open fullscreen radar"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </button>
                </div>

                {flightWarnings.length > 0 && (
                  <div className="absolute bottom-4 left-4 z-20 max-w-sm rounded-2xl border border-amber-200 bg-white/95 p-3 text-xs font-semibold text-amber-800 shadow-md backdrop-blur">
                    <div className="flex gap-2">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{flightWarnings[0]}</span>
                    </div>
                  </div>
                )}

                {!expandedMap ? (
                  <LiveFlightMap
                    mapKey="inline"
                    flights={flights}
                    region={selectedRegion}
                    selectedFlightId={selectedFlightId}
                    onFlightSelect={selectFlight}
                    onLocationSelect={handleLocationSelect}
                  />
                ) : (
                  <div className="absolute inset-0 z-0 flex flex-col items-center justify-center bg-slate-100 px-6 text-center">
                    <Radar className="h-10 w-10 text-blue-400" />
                    <p className="mt-4 text-sm font-black text-slate-800">Fullscreen radar is open</p>
                    <p className="mt-1 max-w-xs text-xs font-semibold text-slate-500">
                      Expanded radar is open — panels float on the map.
                    </p>
                    <button
                      type="button"
                      onClick={() => setExpandedMap(false)}
                      className="mt-4 rounded-full bg-blue-600 px-4 py-2 text-xs font-black text-white hover:bg-blue-700"
                    >
                      Close fullscreen
                    </button>
                  </div>
                )}
              </div>

              {!expandedMap && sidebar("sidebar")}
            </div>

            <OpenSkyDisclaimer />
          </div>
        </section>
      </main>

      {expandedMap && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Expanded live flight radar"
          className="fixed inset-0 z-[120]"
        >
          <LiveFlightMap
            mapKey="fullscreen"
            flights={flights}
            region={selectedRegion}
            selectedFlightId={selectedFlightId}
            onFlightSelect={selectFlight}
            onLocationSelect={handleLocationSelect}
            large
          />

          <MapStatusBadge flightStatus={flightStatus} selectedRegion={selectedRegion} flightsCount={flights.length} />

          <div className="absolute right-4 top-4 z-30 flex gap-2">
            <button
              type="button"
              onClick={() => void loadFlights(selectedRegion)}
              className="grid h-10 w-10 place-items-center rounded-full border border-white/80 bg-white/90 text-blue-600 shadow-md backdrop-blur hover:bg-blue-50"
              aria-label="Refresh live flights"
            >
              <RefreshCw className={`h-4 w-4 ${flightStatus === "loading" ? "animate-spin" : ""}`} />
            </button>
            <button
              type="button"
              onClick={() => setExpandedMap(false)}
              className="grid h-10 w-10 place-items-center rounded-full border border-white/80 bg-white/90 text-slate-700 shadow-md backdrop-blur hover:bg-red-50 hover:text-red-600"
              aria-label="Close expanded radar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {flightWarnings.length > 0 && (
            <div className="absolute left-4 top-16 z-30 max-w-sm rounded-2xl border border-amber-200/80 bg-white/85 p-3 text-xs font-semibold text-amber-800 shadow-md backdrop-blur">
              <div className="flex gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{flightWarnings[0]}</span>
              </div>
            </div>
          )}

          <div className="pointer-events-none absolute inset-x-3 bottom-10 z-30 sm:inset-x-4 sm:bottom-11">
            {sidebar("overlay")}
          </div>

          <OpenSkyDisclaimer floating />
        </div>
      )}

      <Footer />
    </div>
  );
}

function OpenSkyDisclaimer({ floating = false }: { floating?: boolean }) {
  return (
    <div
      className={
        floating
          ? "pointer-events-auto absolute inset-x-0 bottom-0 z-20 border-t border-slate-200/70 bg-white/88 px-3 py-2 text-center shadow-[0_-4px_20px_-8px_rgba(15,23,42,0.25)] backdrop-blur sm:px-4"
          : "mt-4 rounded-2xl border border-slate-200 bg-slate-50/90 px-4 py-2.5 text-center"
      }
    >
      <p className="text-[11px] leading-5 text-slate-600 sm:text-xs">
        Live aircraft data from{" "}
        <a
          href="https://opensky-network.org/"
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold text-blue-600 underline decoration-blue-200 underline-offset-2 hover:text-blue-700"
        >
          OpenSky Network
        </a>
        . Used for non-commercial, educational purposes only as part of this project.
      </p>
    </div>
  );
}

function MapStatusBadge({
  flightStatus,
  selectedRegion,
  flightsCount,
}: {
  flightStatus: "loading" | "ready" | "error";
  selectedRegion: RadarRegion;
  flightsCount: number;
}) {
  return (
    <div className="absolute left-4 top-4 z-20 flex items-center gap-2 rounded-full border border-white/80 bg-white/95 px-3 py-2 text-xs font-bold text-slate-700 shadow-md backdrop-blur">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
      </span>
      {flightStatus === "loading" ? "Updating…" : `${selectedRegion.label} · ${flightsCount} shown`}
    </div>
  );
}

function LiveFlightsSidebar({
  layout,
  selectedFlight,
  updatedAt,
  selectedRegion,
  filteredFlights,
  flights,
  flightStatus,
  feedQuery,
  selectedFlightId,
  feedListRef,
  totalAvailable,
  onFeedQueryChange,
  onSelectFlight,
  weather,
  feedMaxHeight,
}: {
  layout: "sidebar" | "overlay";
  selectedFlight: LiveFlight | null;
  updatedAt?: string;
  selectedRegion: RadarRegion;
  filteredFlights: LiveFlight[];
  flights: LiveFlight[];
  flightStatus: "loading" | "ready" | "error";
  feedQuery: string;
  selectedFlightId: string | null;
  feedListRef: RefObject<HTMLDivElement | null>;
  totalAvailable: number;
  onFeedQueryChange: (value: string) => void;
  onSelectFlight: (flight: LiveFlight) => void;
  weather: WeatherSelection;
  feedMaxHeight: string;
}) {
  const feedPanel = (
    <AircraftFeedPanel
      selectedRegion={selectedRegion}
      filteredFlights={filteredFlights}
      flights={flights}
      flightStatus={flightStatus}
      feedQuery={feedQuery}
      selectedFlightId={selectedFlightId}
      feedListRef={feedListRef}
      totalAvailable={totalAvailable}
      onFeedQueryChange={onFeedQueryChange}
      onSelectFlight={onSelectFlight}
      feedMaxHeight={feedMaxHeight}
      compact={layout !== "sidebar"}
      overlay={layout === "overlay"}
    />
  );

  if (layout === "overlay") {
    return (
      <div className="pointer-events-auto mx-auto grid max-h-[42vh] w-full max-w-7xl gap-3 overflow-hidden md:grid-cols-2 lg:grid-cols-[minmax(220px,260px)_minmax(0,1fr)_minmax(220px,260px)]">
        <SelectedFlightCard flight={selectedFlight} updatedAt={updatedAt} compact overlay />
        {feedPanel}
        <WeatherCard weather={weather} compact overlay />
      </div>
    );
  }

  return (
    <aside className="space-y-4">
      <SelectedFlightCard flight={selectedFlight} updatedAt={updatedAt} />
      {feedPanel}
      <WeatherCard weather={weather} />
    </aside>
  );
}

function AircraftFeedPanel({
  selectedRegion,
  filteredFlights,
  flights,
  flightStatus,
  feedQuery,
  selectedFlightId,
  feedListRef,
  totalAvailable,
  onFeedQueryChange,
  onSelectFlight,
  feedMaxHeight,
  compact,
  overlay,
}: {
  selectedRegion: RadarRegion;
  filteredFlights: LiveFlight[];
  flights: LiveFlight[];
  flightStatus: "loading" | "ready" | "error";
  feedQuery: string;
  selectedFlightId: string | null;
  feedListRef: RefObject<HTMLDivElement | null>;
  totalAvailable: number;
  onFeedQueryChange: (value: string) => void;
  onSelectFlight: (flight: LiveFlight) => void;
  feedMaxHeight: string;
  compact?: boolean;
  overlay?: boolean;
}) {
  return (
    <div className={`${overlay ? overlayPanelClass : "rounded-3xl border border-slate-200 bg-white shadow-card"} ${compact ? "p-3" : "p-5"}`}>
      <div className={compact ? "mb-2" : "mb-4"}>
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-500">Aircraft feed</p>
        <h2 className={`mt-0.5 font-black text-slate-950 ${compact ? "text-sm" : "mt-1 text-lg"}`}>
          {filteredFlights.length} in {selectedRegion.label}
        </h2>
        {totalAvailable > flights.length && (
          <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
            {formatFlightCount(flights.length, totalAvailable)} airborne
          </p>
        )}
      </div>

      <label className={`relative block ${compact ? "mb-2" : "mb-4"}`}>
        <Search className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 ${compact ? "h-3.5 w-3.5" : "h-4 w-4"}`} />
        <input
          type="search"
          value={feedQuery}
          onChange={(event) => onFeedQueryChange(event.target.value)}
          placeholder="Search callsign, airline, country…"
          className={`w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-3 font-semibold text-slate-700 outline-none ring-blue-200 transition focus:border-blue-300 focus:bg-white focus:ring-2 ${compact ? "py-1.5 text-xs" : "py-2.5 text-sm"}`}
        />
      </label>

      <div
        ref={feedListRef}
        className="space-y-2 overflow-y-auto pr-1"
        style={{ maxHeight: feedMaxHeight }}
      >
        {flightStatus === "loading" && flights.length === 0 && <FeedSkeleton />}

        {filteredFlights.length === 0 && flightStatus !== "loading" && (
          <p className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">
            No aircraft match this filter.
          </p>
        )}

        {filteredFlights.map((flight) => (
          <FlightFeedRow
            key={flight.id}
            flight={flight}
            active={flight.id === selectedFlightId}
            onSelect={() => onSelectFlight(flight)}
            compact={compact}
          />
        ))}
      </div>

      {!compact && (
        <p className="mt-4 rounded-2xl bg-sky-50 p-3 text-xs leading-5 text-sky-900">
          <Info className="mb-1 inline h-3.5 w-3.5" />
          {" "}
          Callsigns like TVF are radio IDs. Airline and registered country come from OpenSky — not departure/arrival airports.
        </p>
      )}
    </div>
  );
}

function formatFlightCount(shown: number, total: number): string {
  if (!shown) return "—";
  if (!total || total <= shown) return shown.toLocaleString();
  return `${shown.toLocaleString()}/${total.toLocaleString()}`;
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Plane; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-card">
      <Icon className="h-4 w-4 text-blue-500" />
      <p className="mt-2 text-xl font-black text-slate-950">{value}</p>
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{label}</p>
    </div>
  );
}

function SelectedFlightCard({ flight, updatedAt, compact, overlay }: { flight: LiveFlight | null; updatedAt?: string; compact?: boolean; overlay?: boolean }) {
  if (!flight) {
    return (
      <div className={`text-center ${overlay ? overlayPanelClass : "rounded-3xl border border-dashed border-slate-200 bg-white shadow-card"} ${compact ? "p-4" : "p-6"}`}>
        <Plane className="mx-auto h-8 w-8 text-slate-300" />
        <p className="mt-3 text-sm font-black text-slate-800">Select an aircraft</p>
        {!compact && (
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Click a plane on the map or pick one from the feed — both stay in sync.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={`overflow-hidden ${overlay ? overlayPanelClass : "rounded-3xl border border-slate-200 bg-white shadow-card"}`}>
      <div className={`border-b border-slate-100/80 bg-linear-to-br from-blue-50/90 via-white/80 to-sky-50/90 ${compact ? "px-4 py-4" : "px-5 py-5"}`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-500">Selected aircraft</p>
            <h2 className={`mt-1 font-black tracking-tight text-slate-950 ${compact ? "text-xl" : "text-2xl"}`}>{flight.callsign}</h2>
            <p className="mt-1 text-sm font-semibold text-slate-600">{flight.airline}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ring-inset ${statusStyles[flight.status]}`}>
            {flight.status}
          </span>
        </div>
      </div>

      <div className={`grid grid-cols-2 gap-3 ${compact ? "p-4" : "p-5"}`}>
        <DetailTile icon={Gauge} label="Altitude" value={formatAltitude(flight.altitudeMeters)} />
        <DetailTile icon={Activity} label="Speed" value={formatSpeed(flight.speedKmh)} />
        <DetailTile icon={Compass} label="Heading" value={formatHeading(flight.heading)} />
        <DetailTile icon={MapPinned} label="Registered" value={flight.originCountry} />
      </div>

      {!compact && (
        <div className="border-t border-slate-100 px-5 py-4 text-xs font-semibold text-slate-500">
          <p>
            Position {flight.lat.toFixed(2)}°, {flight.lon.toFixed(2)}°
            {flight.lastContact ? ` · seen ${new Date(flight.lastContact).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}
          </p>
          {updatedAt && (
            <p className="mt-1 text-slate-400">Feed updated {new Date(updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
          )}
        </div>
      )}
    </div>
  );
}

function DetailTile({ icon: Icon, label, value }: { icon: typeof Gauge; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
      <div className="flex items-center gap-2 text-slate-400">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[11px] font-black uppercase tracking-[0.14em]">{label}</span>
      </div>
      <p className="mt-2 text-sm font-black text-slate-900">{value}</p>
    </div>
  );
}

function FlightFeedRow({
  flight,
  active,
  onSelect,
  compact,
}: {
  flight: LiveFlight;
  active: boolean;
  onSelect: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      data-flight-id={flight.id}
      onClick={onSelect}
      className={`flex w-full items-center gap-3 rounded-2xl border text-left transition ${
        compact ? "px-2.5 py-2" : "px-3 py-3"
      } ${
        active
          ? "border-blue-300 bg-blue-50/80 shadow-sm ring-2 ring-blue-200/60"
          : "border-slate-100 bg-slate-50/70 hover:border-blue-100 hover:bg-white"
      }`}
    >
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${active ? "bg-blue-600 text-white" : "bg-white text-blue-600 shadow-sm"}`}>
        <Plane className="h-4 w-4" style={{ transform: `rotate(${flight.heading}deg)` }} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-black text-slate-950">{flight.callsign}</span>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ring-1 ring-inset ${statusStyles[flight.status]}`}>
            {flight.status}
          </span>
        </span>
        <span className="mt-0.5 block truncate text-xs font-semibold text-slate-500">
          {flight.airline} · {flight.originCountry}
        </span>
        <span className="mt-1 block text-[11px] font-semibold text-slate-400">
          {formatAltitude(flight.altitudeMeters)} · {formatSpeed(flight.speedKmh)}
        </span>
      </span>
    </button>
  );
}

function FeedSkeleton() {
  return (
    <>
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="animate-pulse rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <div className="h-3 w-24 rounded-full bg-slate-200" />
          <div className="mt-3 h-2 w-40 rounded-full bg-slate-200" />
        </div>
      ))}
    </>
  );
}

function WeatherCard({ weather, compact, overlay }: { weather: WeatherSelection; compact?: boolean; overlay?: boolean }) {
  const forecastRange = weather.forecast ? getForecastRange(weather.forecast) : null;

  return (
    <div className={`overflow-hidden ${overlay ? overlayPanelClass : "rounded-3xl border border-slate-200 bg-white shadow-card"}`}>
      <div className={`relative overflow-hidden border-b border-slate-100 bg-linear-to-br from-sky-100 via-blue-50 to-white ${compact ? "min-h-24 p-4" : "min-h-32 p-5"}`}>
        {weather.status === "ready" && weather.imageUrl && (
          <img
            src={weather.imageUrl}
            alt={weather.placeName ? `${weather.placeName} city view` : "Selected location"}
            className="absolute inset-0 h-full w-full object-cover opacity-40"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
        )}
        <div className="absolute inset-0 bg-linear-to-t from-white via-white/70 to-white/20" />
        <div className="relative flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Wind className="h-4 w-4 text-sky-600" />
              <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-700">Map weather</p>
            </div>
            <h3 className="mt-2 text-xl font-black text-slate-950">
              {weather.status === "ready" ? weather.placeName : "Click the map"}
            </h3>
            {weather.status === "ready" && weather.country && (
              <p className="mt-1 text-sm font-semibold text-slate-600">{weather.country}</p>
            )}
          </div>
          {weather.status === "ready" && (
            <p className="text-4xl font-black text-slate-950">{Math.round(weather.temperature ?? 0)}°</p>
          )}
        </div>
      </div>

      <div className={compact ? "p-4" : "p-5"}>
        {weather.status === "idle" && (
          <p className="text-sm leading-6 text-slate-500">
            Click empty map space (not on a plane) to load a city photo, current weather, and a 5-day forecast.
          </p>
        )}

        {weather.status === "loading" && (
          <div className="animate-pulse space-y-3">
            <div className="h-3 w-32 rounded-full bg-slate-200" />
            <div className="h-10 w-20 rounded-xl bg-slate-200" />
          </div>
        )}

        {weather.status === "error" && (
          <p className="text-sm font-semibold text-red-600">{weather.error}</p>
        )}

        {weather.status === "ready" && (
          <>
            <p className="text-sm font-semibold text-slate-600">
              {weatherCodeLabel(weather.weatherCode)} · feels like {Math.round(weather.apparentTemperature ?? 0)}°C
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Wind</p>
                <p className="mt-1 text-lg font-black text-slate-900">{Math.round(weather.windSpeed ?? 0)} km/h</p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Humidity</p>
                <p className="mt-1 text-lg font-black text-slate-900">{Math.round(weather.humidity ?? 0)}%</p>
              </div>
            </div>

            {weather.forecast && forecastRange && !compact && (
              <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                <p className="mb-3 text-sm font-black text-slate-900">Next 5 days</p>
                <div className="space-y-3">
                  {weather.forecast.map((day) => (
                    <ForecastRow key={day.date} day={day} range={forecastRange} />
                  ))}
                </div>
              </div>
            )}

            {weather.lat !== undefined && weather.lon !== undefined && (
              <p className="mt-4 text-xs text-slate-400">
                {weather.lat.toFixed(3)}, {weather.lon.toFixed(3)}
                {weather.updatedAt ? ` · ${new Date(weather.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ForecastRow({ day, range }: { day: ForecastDay; range: { min: number; max: number } }) {
  const span = Math.max(1, range.max - range.min);
  const left = ((day.min - range.min) / span) * 100;
  const width = Math.max(8, ((day.max - day.min) / span) * 100);

  return (
    <div className="grid grid-cols-[3.5rem_1.25rem_1fr_4rem] items-center gap-2 text-sm">
      <span className="font-black text-slate-700">{formatForecastDay(day.date)}</span>
      <span className="text-base">{weatherIcon(day.weatherCode)}</span>
      <div className="relative h-2 rounded-full bg-slate-200">
        <span
          className="absolute top-0 h-2 rounded-full bg-linear-to-r from-sky-400 to-blue-500"
          style={{ left: `${left}%`, width: `${width}%` }}
        />
      </div>
      <span className="text-right font-black text-slate-800">
        {Math.round(day.min)}°/{Math.round(day.max)}°
      </span>
    </div>
  );
}

function aircraftClusterIcon(count: number): L.DivIcon {
  const size = count >= 100 ? 48 : count >= 30 ? 42 : 36;
  const fontSize = count >= 100 ? 13 : 12;

  return L.divIcon({
    className: "",
    iconSize: L.point(size, size),
    iconAnchor: L.point(size / 2, size / 2),
    html: `
      <div style="
        width:${size}px;
        height:${size}px;
        border-radius:9999px;
        background:linear-gradient(135deg,#2563eb,#1d4ed8);
        color:#fff;
        border:2px solid rgba(255,255,255,0.95);
        display:grid;
        place-items:center;
        font:700 ${fontSize}px/1 ui-sans-serif,system-ui,sans-serif;
        box-shadow:0 8px 20px rgba(37,99,235,0.45);
      ">${count}</div>
    `,
  });
}

function createFlightClusterGroup(): L.MarkerClusterGroup {
  return L.markerClusterGroup({
    maxClusterRadius: 58,
    disableClusteringAtZoom: 8,
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    zoomToBoundsOnClick: true,
    removeOutsideVisibleBounds: true,
    animate: true,
    iconCreateFunction: (cluster) => aircraftClusterIcon(cluster.getChildCount()),
  });
}

const INDIVIDUAL_AIRCRAFT_ZOOM = 8;

function aircraftMarkerHtml(heading: number, selected: boolean): string {
  const planeColor = selected ? "#ffffff" : "#7dd3fc";
  const shellBorder = selected ? "#3b82f6" : "#ffffff";
  const shellBg = selected ? "#2563eb" : "#0f172a";

  return `
    <div class="relative flex h-10 w-10 items-center justify-center">
      ${selected ? '<span class="absolute h-10 w-10 rounded-full bg-blue-400/30 animate-pulse"></span>' : '<span class="absolute h-9 w-9 rounded-full bg-sky-400/20 blur-[2px]"></span>'}
      <span
        class="relative flex h-8 w-8 items-center justify-center rounded-full shadow-lg"
        style="border:2px solid ${shellBorder}; background:${shellBg}; box-shadow:0 4px 14px rgba(15,23,42,0.35);"
      >
        <svg
          style="transform:rotate(${heading}deg); display:block;"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="${planeColor}"
          stroke="${planeColor}"
          stroke-width="1.6"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M17.8 19.2 16 11l3.5-3.5c1-1 1.4-2.5.8-3.1-.6-.6-2.1-.2-3.1.8L13.7 8.7 5.5 6.9c-.5-.1-.9 0-1.2.4L3.2 8.4l6.2 3.1-2.6 2.6-2.7-.4-.8.8 3.4 2.1 2.1 3.4.8-.8-.4-2.7 2.6-2.6 3.1 6.2 1.1-1.1c.3-.3.5-.8.4-1.2Z"/>
        </svg>
      </span>
    </div>
  `;
}

function LiveFlightMap({
  mapKey,
  flights,
  region,
  selectedFlightId,
  onFlightSelect,
  onLocationSelect,
  large = false,
}: {
  mapKey: string;
  flights: LiveFlight[];
  region: RadarRegion;
  selectedFlightId: string | null;
  onFlightSelect: (flight: LiveFlight) => void;
  onLocationSelect: (location: { lat: number; lon: number }) => void;
  large?: boolean;
}) {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
  const markerByIdRef = useRef<Map<string, L.Marker>>(new Map());
  const onFlightSelectRef = useRef(onFlightSelect);
  const onLocationSelectRef = useRef(onLocationSelect);

  onFlightSelectRef.current = onFlightSelect;
  onLocationSelectRef.current = onLocationSelect;

  useEffect(() => {
    if (!mapElementRef.current || mapRef.current) return;

    const map = L.map(mapElementRef.current, {
      center: DEFAULT_MAP_CENTER,
      zoom: DEFAULT_MAP_ZOOM,
      minZoom: 2,
      maxZoom: 12,
      worldCopyJump: true,
      zoomControl: false,
    });
    mapRef.current = map;

    L.control.zoom({ position: large ? "bottomleft" : "bottomright" }).addTo(map);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; CARTO',
    }).addTo(map);
    clusterGroupRef.current = createFlightClusterGroup().addTo(map);

    map.on("click", (event: L.LeafletMouseEvent) => {
      onLocationSelectRef.current({
        lat: event.latlng.lat,
        lon: event.latlng.lng,
      });
    });

    return () => {
      clusterGroupRef.current?.clearLayers();
      map.remove();
      mapRef.current = null;
      clusterGroupRef.current = null;
      markerByIdRef.current.clear();
    };
  }, [mapKey]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    window.setTimeout(() => map.invalidateSize(), 80);
  }, [mapKey]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    applyRegionView(map, region);
  }, [region.id]);

  useEffect(() => {
    const map = mapRef.current;
    const clusterGroup = clusterGroupRef.current;

    if (!map || !clusterGroup) return;

    clusterGroup.clearLayers();
    markerByIdRef.current.clear();

    flights.forEach((flight) => {
      const position: L.LatLngExpression = [flight.lat, flight.lon];
      const selected = flight.id === selectedFlightId;

      const marker = L.marker(position, {
        icon: L.divIcon({
          className: "",
          html: aircraftMarkerHtml(flight.heading, selected),
          iconSize: [40, 40],
          iconAnchor: [20, 20],
        }),
        zIndexOffset: selected ? 1000 : 0,
      });

      marker.on("click", (event) => {
        L.DomEvent.stopPropagation(event);
        onFlightSelectRef.current(flight);
      });

      clusterGroup.addLayer(marker);
      markerByIdRef.current.set(flight.id, marker);
    });
  }, [flights, selectedFlightId]);

  return (
    <>
      <div ref={mapElementRef} className="absolute inset-0 z-0 bg-slate-100" />
    </>
  );
}

function weatherCodeLabel(code: number | undefined): string {
  if (code === 0) return "Clear sky";
  if (code !== undefined && [1, 2, 3].includes(code)) return "Partly cloudy";
  if (code !== undefined && [45, 48].includes(code)) return "Fog";
  if (code !== undefined && [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Rain";
  if (code !== undefined && [71, 73, 75, 77, 85, 86].includes(code)) return "Snow";
  if (code !== undefined && [95, 96, 99].includes(code)) return "Thunderstorm";
  return "Current conditions";
}

function parseForecast(daily: Record<string, unknown>): ForecastDay[] {
  const dates = (daily.time as string[] | undefined) || [];

  return dates.slice(0, 5).map((date, index) => ({
    date,
    min: Number((daily.temperature_2m_min as number[] | undefined)?.[index] ?? 0),
    max: Number((daily.temperature_2m_max as number[] | undefined)?.[index] ?? 0),
    precipitationChance: (daily.precipitation_probability_max as number[] | undefined)?.[index],
    weatherCode: (daily.weather_code as number[] | undefined)?.[index],
  }));
}

function getForecastRange(forecast: ForecastDay[]): { min: number; max: number } {
  return {
    min: Math.min(...forecast.map((day) => day.min)),
    max: Math.max(...forecast.map((day) => day.max)),
  };
}

function formatForecastDay(date: string): string {
  return new Intl.DateTimeFormat("en", { weekday: "short" }).format(new Date(date));
}

async function fetchWikipediaImage(placeName: string, country: string): Promise<string | undefined> {
  const candidates = [placeName, country ? `${placeName}, ${country}` : "", country].filter(Boolean);

  for (const candidate of candidates) {
    try {
      const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(candidate)}`;
      const response = await fetch(url);

      if (!response.ok) continue;

      const data = await response.json();
      const imageUrl = data?.originalimage?.source || data?.thumbnail?.source;

      if (typeof imageUrl === "string" && imageUrl.startsWith("https://")) {
        return imageUrl;
      }
    } catch {
      // Gradient fallback in the card header.
    }
  }

  return undefined;
}

function weatherIcon(code: number | undefined): string {
  if (code === 0) return "☀";
  if (code !== undefined && [1, 2, 3].includes(code)) return "◐";
  if (code !== undefined && [45, 48].includes(code)) return "≋";
  if (code !== undefined && [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "☂";
  if (code !== undefined && [71, 73, 75, 77, 85, 86].includes(code)) return "❄";
  if (code !== undefined && [95, 96, 99].includes(code)) return "ϟ";
  return "◌";
}

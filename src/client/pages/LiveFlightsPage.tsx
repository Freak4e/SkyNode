import { useCallback, useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Activity, Clock3, Plane, Radar, RadioTower, Route, Satellite } from "lucide-react";
import { Footer } from "../components/Footer";
import { Navbar } from "../components/Navbar";

type LiveFlight = {
  code: string;
  airline: string;
  from: string;
  to: string;
  status: string;
  lat: number;
  lon: number;
  rotation: number;
};

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

const liveFlights: LiveFlight[] = [
  { code: "JU621", airline: "Air Serbia", from: "LJU", to: "BEG", status: "Cruising", lat: 45.4, lon: 17.4, rotation: 120 },
  { code: "TK1062", airline: "Turkish Airlines", from: "LJU", to: "IST", status: "Climbing", lat: 43.7, lon: 20.9, rotation: 135 },
  { code: "W64740", airline: "Wizz Air", from: "LJU", to: "SKP", status: "On time", lat: 43.2, lon: 19.0, rotation: 128 },
  { code: "LH1459", airline: "Lufthansa", from: "LJU", to: "FRA", status: "Descending", lat: 47.4, lon: 12.7, rotation: 295 },
];

const stats = [
  { label: "Tracked flights", value: "4", icon: Plane },
  { label: "Radar regions", value: "Global", icon: Radar },
  { label: "Refresh mode", value: "API ready", icon: Activity },
];

export function LiveFlightsPage() {
  const [weather, setWeather] = useState<WeatherSelection>({ status: "idle" });

  const handleLocationSelect = useCallback(async ({ lat, lon }: { lat: number; lon: number }) => {
    setWeather({
      status: "loading",
      lat,
      lon,
    });

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
        throw new Error("Weather API did not return data for this location.");
      }

      const weatherData = await weatherResponse.value.json();
      const current = weatherData.current;
      let placeName = "Selected location";
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
        error: error instanceof Error ? error.message : "Could not load weather data.",
      });
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Navbar />

      <main className="pt-24">
        <section className="relative overflow-hidden px-6 py-10 sm:px-8 lg:px-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.28),transparent_34%),radial-gradient(circle_at_80%_20%,rgba(14,165,233,0.22),transparent_32%),linear-gradient(135deg,#020617,#0f172a_55%,#042f2e)]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] bg-size-[48px_48px] opacity-20" />

          <div className="relative mx-auto max-w-7xl">
            <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-emerald-200">
                  <Satellite className="h-4 w-4" />
                  Live Flights
                </span>
                <h1 className="mt-5 text-4xl font-black tracking-tight text-white sm:text-5xl">
                  Real-time world radar for SkyNode
                </h1>
                <p className="mt-4 text-base leading-7 text-slate-300">
                  First version of the live-flight map. The visualization is ready for real-time aircraft data, with mock flight markers for now.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 lg:w-130">
                {stats.map((stat) => (
                  <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/10 p-4 shadow-2xl backdrop-blur">
                    <stat.icon className="h-5 w-5 text-emerald-300" />
                    <p className="mt-3 text-xl font-black">{stat.value}</p>
                    <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
              <section className="relative min-h-140 overflow-hidden rounded-4xl border border-white/10 bg-slate-900/80 shadow-2xl shadow-emerald-950/30">
                <div className="absolute left-6 top-6 z-10 flex items-center gap-3 rounded-full border border-emerald-300/20 bg-slate-950/70 px-4 py-2 text-sm font-bold text-emerald-100 backdrop-blur">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-300" />
                  </span>
                  Radar preview online
                </div>

                <LiveFlightMap flights={liveFlights} onLocationSelect={handleLocationSelect} />
              </section>

              <aside className="space-y-4">
                <WeatherPanel weather={weather} />

                <div className="rounded-4xl border border-white/10 bg-white/10 p-5 shadow-2xl backdrop-blur">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-200">Next phase</p>
                      <h2 className="mt-2 text-xl font-black">Connect live aircraft API</h2>
                    </div>
                    <RadioTower className="h-6 w-6 text-emerald-300" />
                  </div>
                  <p className="mt-4 text-sm leading-6 text-slate-300">
                    The page is prepared for live positions, altitude, speed, route, and callsign data. We can add the provider after choosing an API.
                  </p>
                </div>

                <div className="rounded-4xl border border-white/10 bg-slate-900/80 p-5">
                  <div className="mb-4 flex items-center gap-2 text-sm font-black text-white">
                    <Route className="h-4 w-4 text-emerald-300" />
                    Preview Flights
                  </div>
                  <div className="space-y-3">
                    {liveFlights.map((flight) => (
                      <div key={flight.code} className="rounded-2xl border border-white/10 bg-white/6 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-black text-white">{flight.code}</p>
                            <p className="mt-1 text-xs text-slate-400">{flight.airline}</p>
                          </div>
                          <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-black text-emerald-200">
                            {flight.status}
                          </span>
                        </div>
                        <div className="mt-3 flex items-center gap-2 text-sm font-bold text-slate-200">
                          <span>{flight.from}</span>
                          <span className="h-px flex-1 bg-linear-to-r from-emerald-300/70 to-cyan-300/70" />
                          <span>{flight.to}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-4xl border border-cyan-300/20 bg-cyan-400/10 p-5 text-sm leading-6 text-cyan-50">
                  <Clock3 className="mb-3 h-5 w-5 text-cyan-200" />
                  This is intentionally visual-only for now. The next step is adding an endpoint like <span className="font-black">/api/live-flights</span> and feeding this map real aircraft positions.
                </div>
              </aside>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function WeatherPanel({ weather }: { weather: WeatherSelection }) {
  const coordinates = typeof weather.lat === "number" && typeof weather.lon === "number"
    ? `${weather.lat.toFixed(3)}, ${weather.lon.toFixed(3)}`
    : "Click any country or city on the map";
  const forecastRange = weather.forecast ? getForecastRange(weather.forecast) : null;

  return (
    <div className="overflow-hidden rounded-4xl border border-emerald-300/20 bg-slate-950/75 shadow-2xl shadow-emerald-950/30 backdrop-blur">
      <div className="relative min-h-38 overflow-hidden border-b border-white/10 bg-linear-to-br from-emerald-400/30 via-cyan-400/15 to-slate-950 p-5">
        {weather.status === "ready" && weather.imageUrl && (
          <img
            src={weather.imageUrl}
            alt={weather.placeName ? `${weather.placeName} city view` : "Selected city"}
            className="absolute inset-0 h-full w-full object-cover opacity-45"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
        )}
        <div className="absolute inset-0 bg-linear-to-t from-slate-950 via-slate-950/45 to-transparent" />
        <div className="relative flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-100">Live Weather</p>
            <h2 className="mt-2 text-2xl font-black">
              {weather.status === "ready" ? weather.placeName : "Select a location"}
            </h2>
            {weather.status === "ready" && weather.country && (
              <p className="mt-1 text-sm font-semibold text-slate-200">{weather.country}</p>
            )}
          </div>
          <Radar className="h-7 w-7 text-emerald-200" />
        </div>
      </div>

      <div className="p-5">
        {weather.status === "idle" && (
          <div className="rounded-3xl border border-white/10 bg-white/6 p-5">
            <p className="text-sm leading-6 text-slate-300">
              Click on any country or city to load current weather, a city visual, and a 5-day forecast.
            </p>
          </div>
        )}

        {weather.status === "loading" && (
          <div className="rounded-3xl border border-white/10 bg-white/6 p-5">
            <div className="h-3 w-32 animate-pulse rounded-full bg-emerald-200/40" />
            <div className="mt-4 h-12 w-24 animate-pulse rounded-2xl bg-white/10" />
            <p className="mt-4 text-xs text-slate-400">{coordinates}</p>
          </div>
        )}

        {weather.status === "error" && (
          <div className="rounded-3xl border border-red-300/20 bg-red-400/10 p-5">
            <p className="text-sm font-bold text-red-100">Weather unavailable</p>
            <p className="mt-1 text-xs text-red-100/80">{weather.error}</p>
            <p className="mt-2 text-xs text-slate-400">{coordinates}</p>
          </div>
        )}

        {weather.status === "ready" && (
          <>
            <div className="rounded-3xl border border-white/10 bg-white/6 p-5">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-6xl font-black tracking-tight text-white">
                    {Math.round(weather.temperature ?? 0)}°C
                  </p>
                  <p className="mt-2 text-sm font-bold text-emerald-100">
                    {weatherCodeLabel(weather.weatherCode)} · feels like {Math.round(weather.apparentTemperature ?? 0)}°C
                  </p>
                </div>
                <div className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-3 py-2 text-right">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-100">Now</p>
                  <p className="mt-1 text-sm font-black text-white">{weatherIcon(weather.weatherCode)}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/6 p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Wind</p>
                <p className="mt-2 text-lg font-black text-white">{Math.round(weather.windSpeed ?? 0)} km/h</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/6 p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Humidity</p>
                <p className="mt-2 text-lg font-black text-white">{Math.round(weather.humidity ?? 0)}%</p>
              </div>
            </div>

            {weather.forecast && forecastRange && (
              <div className="mt-4 rounded-3xl border border-white/10 bg-white/6 p-4">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm font-black text-white">Next 5 days</p>
                  <p className="text-xs font-bold text-slate-400">Open-Meteo forecast</p>
                </div>
                <div className="space-y-3">
                  {weather.forecast.map((day) => (
                    <ForecastRow key={day.date} day={day} range={forecastRange} />
                  ))}
                </div>
              </div>
            )}

            <p className="mt-4 text-xs leading-5 text-slate-400">
              Coordinates: {coordinates}
              {weather.updatedAt ? ` · Updated ${new Date(weather.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}
            </p>
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
    <div className="grid grid-cols-[3.8rem_1.5rem_1fr_4.5rem] items-center gap-3 text-sm">
      <span className="font-black text-slate-200">{formatForecastDay(day.date)}</span>
      <span className="text-base">{weatherIcon(day.weatherCode)}</span>
      <div className="relative h-2 rounded-full bg-white/10">
        <span
          className="absolute top-0 h-2 rounded-full bg-linear-to-r from-cyan-300 to-emerald-300 shadow-[0_0_16px_rgba(45,212,191,0.45)]"
          style={{ left: `${left}%`, width: `${width}%` }}
        />
      </div>
      <span className="text-right font-black text-white">
        {Math.round(day.min)}°/{Math.round(day.max)}°
      </span>
      {typeof day.precipitationChance === "number" && (
        <span className="col-start-3 text-xs font-semibold text-slate-400">
          {day.precipitationChance}% rain chance
        </span>
      )}
    </div>
  );
}

function weatherCodeLabel(code: number | undefined): string {
  if (code === undefined) return "Current weather";
  if (code === 0) return "Clear sky";
  if ([1, 2, 3].includes(code)) return "Partly cloudy";
  if ([45, 48].includes(code)) return "Fog";
  if ([51, 53, 55, 56, 57].includes(code)) return "Drizzle";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snow";
  if ([95, 96, 99].includes(code)) return "Thunderstorm";
  return "Current weather";
}

function parseForecast(daily: any): ForecastDay[] {
  const dates: string[] = daily?.time || [];

  return dates.slice(0, 5).map((date, index) => ({
    date,
    min: Number(daily.temperature_2m_min?.[index] ?? 0),
    max: Number(daily.temperature_2m_max?.[index] ?? 0),
    precipitationChance: daily.precipitation_probability_max?.[index],
    weatherCode: daily.weather_code?.[index],
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
  const candidates = [
    placeName,
    country ? `${placeName}, ${country}` : "",
    country,
  ].filter(Boolean);

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
      // Try the next candidate; the weather card has a gradient fallback.
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

function LiveFlightMap({
  flights,
  onLocationSelect,
}: {
  flights: LiveFlight[];
  onLocationSelect: (location: { lat: number; lon: number }) => void;
}) {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapElementRef.current || mapRef.current) return;

    const map = L.map(mapElementRef.current, {
      center: [43, 12],
      zoom: 4,
      minZoom: 2,
      maxZoom: 10,
      worldCopyJump: true,
      zoomControl: false,
    });
    mapRef.current = map;

    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    map.on("click", (event: L.LeafletMouseEvent) => {
      onLocationSelect({
        lat: event.latlng.lat,
        lon: event.latlng.lng,
      });
    });

    const bounds = L.latLngBounds([]);

    flights.forEach((flight) => {
      const position: L.LatLngExpression = [flight.lat, flight.lon];
      bounds.extend(position);

      const marker = L.marker(position, {
        icon: L.divIcon({
          className: "",
          html: `
            <div class="relative flex h-10 w-10 items-center justify-center">
              <span class="absolute h-10 w-10 rounded-full bg-emerald-400/25 blur-md"></span>
              <span class="relative flex h-8 w-8 items-center justify-center rounded-full border border-emerald-200/60 bg-slate-950 text-emerald-200 shadow-lg shadow-emerald-500/30">
                <svg style="transform: rotate(${flight.rotation}deg)" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M17.8 19.2 16 11l3.5-3.5c1-1 1.4-2.5.8-3.1-.6-.6-2.1-.2-3.1.8L13.7 8.7 5.5 6.9c-.5-.1-.9 0-1.2.4L3.2 8.4l6.2 3.1-2.6 2.6-2.7-.4-.8.8 3.4 2.1 2.1 3.4.8-.8-.4-2.7 2.6-2.6 3.1 6.2 1.1-1.1c.3-.3.5-.8.4-1.2Z"/>
                </svg>
              </span>
            </div>
          `,
          iconSize: [40, 40],
          iconAnchor: [20, 20],
        }),
      }).addTo(map);

      marker.bindPopup(`
        <div style="min-width: 150px">
          <strong>${flight.code}</strong><br />
          <span>${flight.airline}</span><br />
          <span>${flight.from} -> ${flight.to}</span><br />
          <span>${flight.status}</span>
        </div>
      `);
    });

    if (bounds.isValid()) {
      map.fitBounds(bounds.pad(0.9));
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [flights, onLocationSelect]);

  return (
    <>
      <div ref={mapElementRef} className="absolute inset-0 z-0 bg-slate-900" />
      <div className="pointer-events-none absolute inset-0 z-10 bg-linear-to-b from-slate-950/10 via-transparent to-slate-950/30" />
    </>
  );
}

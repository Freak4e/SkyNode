import { useEffect, useState } from "react";
import { Card } from "../../components/ui";
import type { GeneratedItinerary } from "../../../shared/types.js";
import { itineraryCoordinates, parseForecast, weatherIcon } from "./plannerUtils";
import type { WeatherState } from "./plannerTypes";

export function WeatherPanel({ itinerary }: { itinerary: GeneratedItinerary }) {
  const [weather, setWeather] = useState<WeatherState>({ status: "idle" });

  useEffect(() => {
    const controller = new AbortController();

    async function loadWeather() {
      setWeather({ status: "loading" });

      try {
        let coordinates = itineraryCoordinates(itinerary);

        if (!coordinates) {
          const searchUrl = new URL("https://nominatim.openstreetmap.org/search");
          searchUrl.searchParams.set("format", "jsonv2");
          searchUrl.searchParams.set("limit", "1");
          searchUrl.searchParams.set("q", itinerary.destinationName);
          const searchResponse = await fetch(searchUrl, { signal: controller.signal });
          const searchBody = await searchResponse.json();
          const firstResult = Array.isArray(searchBody) ? searchBody[0] : undefined;

          if (firstResult?.lat && firstResult?.lon) {
            coordinates = { lat: Number(firstResult.lat), lon: Number(firstResult.lon) };
          }
        }

        if (!coordinates) {
          throw new Error("No destination coordinates available.");
        }

        const weatherUrl = new URL("https://api.open-meteo.com/v1/forecast");
        weatherUrl.searchParams.set("latitude", String(coordinates.lat));
        weatherUrl.searchParams.set("longitude", String(coordinates.lon));
        weatherUrl.searchParams.set("daily", "weather_code,temperature_2m_max,temperature_2m_min");
        weatherUrl.searchParams.set("forecast_days", "5");
        weatherUrl.searchParams.set("timezone", "auto");

        const response = await fetch(weatherUrl, { signal: controller.signal });
        const body = await response.json();

        if (!response.ok) {
          throw new Error("Weather API did not return data.");
        }

        setWeather({ status: "ready", forecast: parseForecast(body.daily), placeName: itinerary.destinationName });
      } catch (error) {
        if (!controller.signal.aborted) {
          setWeather({ status: "error", message: error instanceof Error ? error.message : "Weather unavailable." });
        }
      }
    }

    void loadWeather();
    return () => controller.abort();
  }, [itinerary]);

  return (
    <Card>
      <p className="mb-1 text-sm font-black text-slate-900">Weather forecast</p>
      <p className="mb-4 text-xs font-bold text-slate-500">Open-Meteo forecast</p>

      {weather.status === "loading" && <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />}
      {weather.status === "error" && <p className="rounded-2xl bg-slate-50 p-3 text-xs font-bold text-slate-500">{weather.message}</p>}
      {weather.status === "ready" && (
        <div className="grid grid-cols-5 gap-2">
          {weather.forecast.map((day) => {
            const Icon = weatherIcon(day.weatherCode);
            return (
              <div key={day.date} className="rounded-2xl bg-slate-50 p-2 text-center">
                <p className="text-xs font-bold text-slate-500">{new Date(`${day.date}T00:00:00`).toLocaleDateString(undefined, { weekday: "short" })}</p>
                <Icon className="mx-auto mt-2 h-5 w-5 text-blue-500" />
                <p className="mt-1 text-xs font-black text-slate-900">{day.max} deg</p>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

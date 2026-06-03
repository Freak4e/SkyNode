import { Cloud, CloudLightning, CloudRain, CloudSun, Snowflake, Sun, Umbrella } from "lucide-react";
import type { BudgetLevel, GeneratedItinerary, ItineraryDay } from "../../../shared/types.js";
import type { ForecastDay } from "./plannerTypes";

export const plannerInterests = ["culture", "food", "nature", "nightlife", "museums", "shopping", "relaxing", "hidden gems"];

export function budgetLevelFromAmount(value: number): BudgetLevel {
  if (value < 900) return "low";
  if (value > 2600) return "high";
  return "medium";
}

export function emptyDays(count: number): ItineraryDay[] {
  return Array.from({ length: count }, (_, index) => ({
    dayNumber: index + 1,
    title: `Day ${index + 1}`,
    summary: "",
    estimatedCost: 0,
    items: [],
  }));
}

export function parseTripCities(value: string | string[] | undefined): string[] {
  const values = Array.isArray(value) ? value : (value || "").split(",");
  const seen = new Set<string>();

  return values
    .map((city) => city.trim())
    .filter(Boolean)
    .filter((city) => {
      const key = city.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function assignDayCities(days: ItineraryDay[], cityNames: string[]): ItineraryDay[] {
  const cleanCities = parseTripCities(cityNames);
  if (cleanCities.length === 0) return days;

  return days.map((day, index) => ({
    ...day,
    cityName: cleanCities.includes(day.cityName || "") ? day.cityName : cleanCities[Math.min(index, cleanCities.length - 1)],
  }));
}

export function cleanTime(value: string): string {
  return ({ morning: "09:00", afternoon: "14:00", evening: "19:00" } as Record<string, string>)[value] || value || "09:00";
}

export function cleanDayTitle(title: string, dayNumber: number): string {
  return title.replace(new RegExp(`^\\s*day\\s*${dayNumber}\\s*:?\\s*`, "i"), "").trim() || title;
}

export function parseMoney(text: string | undefined): number {
  const match = (text || "").replace(/,/g, "").match(/\d+/);
  return match ? Number(match[0]) : 0;
}

export function tripDate(startDate: string, dayNumber: number): Date {
  const date = new Date(`${startDate}T00:00:00`);
  date.setDate(date.getDate() + dayNumber - 1);
  return date;
}

export function dateRange(startDate: string, dayCount: number): string {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(start);
  end.setDate(start.getDate() + Math.max(dayCount - 1, 0));
  return `${start.toLocaleDateString(undefined, { month: "short", day: "2-digit" })} - ${end.toLocaleDateString(undefined, { month: "short", day: "2-digit" })}`;
}

export function normalizeDays(days: ItineraryDay[]): ItineraryDay[] {
  return days.map((day, index) => {
    const items = day.items
      .map((item, itemIndex) => ({
        ...item,
        order: item.order ?? itemIndex + 1,
        timeOfDay: cleanTime(item.timeOfDay),
        title: item.title.trim() || "Activity",
        description: item.description.trim() || "Activity notes.",
        attractionName: item.attractionName?.trim() || undefined,
        category: item.category?.trim() || undefined,
        location: item.location?.name?.trim()
          ? {
              ...item.location,
              name: item.location.name.trim(),
              address: item.location.address?.trim() || undefined,
              city: item.location.city?.trim() || undefined,
            }
          : item.attractionName?.trim()
          ? { name: item.attractionName.trim() }
          : undefined,
        notes: item.notes?.trim() || undefined,
        tags: item.tags?.map((tag) => tag.trim()).filter(Boolean),
        durationMinutes: Math.max(0, Number(item.durationMinutes) || 0) || undefined,
        estimatedCost: Math.max(0, Number(item.estimatedCost) || 0),
      }))
      .sort((a, b) => cleanTime(a.timeOfDay).localeCompare(cleanTime(b.timeOfDay)))
      .map((item, itemIndex) => ({ ...item, order: itemIndex + 1 }));

    return {
      ...day,
      dayNumber: index + 1,
      cityName: day.cityName?.trim() || undefined,
      title: day.title.trim() || `Day ${index + 1}`,
      summary: day.summary.trim() || "Custom day plan.",
      estimatedCost: items.reduce((sum, item) => sum + item.estimatedCost, 0),
      items,
    };
  });
}

export function weatherIcon(code: number | undefined) {
  if (code === undefined) return CloudSun;
  if (code === 0 || code === 1) return Sun;
  if (code === 2 || code === 3 || code === 45 || code === 48) return Cloud;
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return CloudRain;
  if (code >= 71 && code <= 77) return Snowflake;
  if (code >= 95) return CloudLightning;
  return Umbrella;
}

export function parseForecast(daily: any): ForecastDay[] {
  const dates = Array.isArray(daily?.time) ? daily.time : [];
  return dates.slice(0, 5).map((date: string, index: number) => ({
    date,
    max: Math.round(Number(daily.temperature_2m_max?.[index] ?? 0)),
    min: Math.round(Number(daily.temperature_2m_min?.[index] ?? 0)),
    weatherCode: daily.weather_code?.[index],
  }));
}

export function itineraryCoordinates(itinerary: GeneratedItinerary): { lat: number; lon: number } | undefined {
  const points = itinerary.attractions.filter((attraction) => typeof attraction.lat === "number" && typeof attraction.lon === "number");
  if (points.length === 0) return undefined;

  return {
    lat: points.reduce((sum, point) => sum + point.lat!, 0) / points.length,
    lon: points.reduce((sum, point) => sum + point.lon!, 0) / points.length,
  };
}

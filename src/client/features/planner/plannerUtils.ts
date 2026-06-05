import { Cloud, CloudLightning, CloudRain, CloudSun, Snowflake, Sun, Umbrella } from "lucide-react";
import type { BudgetLevel, GeneratedItinerary, ItineraryDay, ItineraryItem, TripBudgetCategory } from "../../../shared/types.js";
import type { ForecastDay } from "./plannerTypes";

export const plannerInterests = ["culture", "food", "nature", "nightlife", "museums", "shopping", "relaxing", "hidden gems"];

export const budgetCategoryDefinitions = [
  { id: "flights", label: "Flights", color: "bg-blue-500", softColor: "bg-blue-500/20" },
  { id: "hotels", label: "Hotels", color: "bg-cyan-500", softColor: "bg-cyan-500/20" },
  { id: "activities", label: "Activities", color: "bg-violet-500", softColor: "bg-violet-500/20" },
  { id: "other", label: "Other", color: "bg-emerald-500", softColor: "bg-emerald-500/20" },
] as const;

export function budgetLevelFromAmount(value: number): BudgetLevel {
  if (value < 900) return "low";
  if (value > 2600) return "high";
  return "medium";
}

export function defaultBudgetCategories(totalBudget: number): TripBudgetCategory[] {
  return budgetCategoriesFromPercentages(totalBudget, [25, 35, 20, 20]);
}

export function normalizeBudgetCategories(categories: TripBudgetCategory[] | undefined, totalBudget: number): TripBudgetCategory[] {
  const total = Math.max(0, Math.round(totalBudget || 0));
  const cleanCategories = budgetCategoryDefinitions.map((definition) => {
    const existing = categories?.find((category) => category.id === definition.id);
    return {
      id: definition.id,
      label: definition.label,
      amount: Math.max(0, Math.round(existing?.amount || 0)),
      spent: existing?.spent,
    };
  });
  const existingTotal = cleanCategories.reduce((sum, category) => sum + category.amount, 0);

  if (total === 0) {
    return cleanCategories.map((category) => ({ ...category, amount: 0 }));
  }

  if (existingTotal <= 0) {
    return defaultBudgetCategories(total);
  }

  let assigned = 0;
  return cleanCategories.map((category, index) => {
    const amount = index === cleanCategories.length - 1
      ? total - assigned
      : Math.round((category.amount / existingTotal) * total);
    assigned += amount;
    return { ...category, amount };
  });
}

export function budgetCategoriesFromPercentages(totalBudget: number, percentages: number[]): TripBudgetCategory[] {
  const total = Math.max(0, Math.round(totalBudget || 0));
  let assigned = 0;

  return budgetCategoryDefinitions.map((definition, index) => {
    const amount = index === budgetCategoryDefinitions.length - 1
      ? total - assigned
      : Math.round(total * ((percentages[index] || 0) / 100));
    assigned += amount;
    return {
      id: definition.id,
      label: definition.label,
      amount,
    };
  });
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

export function itineraryBudgetSpend(days: ItineraryDay[]): { flights: number; hotels: number; activities: number; other: number } {
  return days.reduce((totals, day) => {
    for (const item of day.items) {
      const cost = Math.max(0, Number(item.estimatedCost) || 0);

      if (isFlightBudgetItem(item)) {
        totals.flights += cost;
      } else if (isHotelBudgetItem(item)) {
        totals.hotels += cost;
      } else if (isOtherBudgetItem(item)) {
        totals.other += cost;
      } else {
        totals.activities += cost;
      }
    }

    return totals;
  }, { flights: 0, hotels: 0, activities: 0, other: 0 });
}

function isFlightBudgetItem(item: ItineraryItem): boolean {
  return /\b(flight|flights|airfare|airline|airport|plane)\b/i.test(itemBudgetText(item));
}

function isHotelBudgetItem(item: ItineraryItem): boolean {
  return /\b(hotel|hotels|stay|stays|lodging|accommodation|accommodations)\b/i.test(itemBudgetText(item));
}

function isOtherBudgetItem(item: ItineraryItem): boolean {
  return /\b(food|meal|meals|restaurant|restaurants|transport|transfer|transit|metro|train|bus|taxi|other)\b/i.test(itemBudgetText(item));
}

function itemBudgetText(item: ItineraryItem): string {
  return [
    item.category,
    item.title,
    item.attractionName,
    item.location?.name,
    item.notes,
    ...(item.tags || []),
  ].filter(Boolean).join(" ");
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
        tags: uniqueTags(item.tags),
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

function uniqueTags(tags: string[] | undefined): string[] | undefined {
  const cleanTags = Array.from(new Set((tags || []).map((tag) => tag.trim().toLowerCase()).filter(Boolean)));
  return cleanTags.length > 0 ? cleanTags : undefined;
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

import axios from "axios";
import { config } from "../../../config.js";
import type {
  Attraction,
  GenerateItineraryRequest,
  GeneratedItinerary,
  ItineraryDay,
  ItineraryItem,
} from "../../../shared/types.js";

type OllamaChatResponse = {
  message?: {
    content?: string;
  };
};

type RawItinerary = {
  days?: RawDay[];
};

type RawDay = {
  dayNumber?: number;
  title?: string;
  summary?: string;
  estimatedCost?: number;
  items?: RawItem[];
};

type RawItem = {
  order?: number;
  timeOfDay?: string;
  title?: string;
  description?: string;
  attractionName?: string;
  category?: string;
  location?: {
    name?: string;
    address?: string;
    city?: string;
    lat?: number;
    lon?: number;
  };
  notes?: string;
  tags?: string[];
  estimatedCost?: number;
};

type PlanningProfile = {
  itemsPerDay: number;
  paidActivitiesPerDay: number;
  premiumActivitiesPerDay: number;
  dailyCostTarget: string;
  styleRule: string;
};

export async function generateItineraryWithOllama(
  request: GenerateItineraryRequest,
  attractions: Attraction[],
): Promise<GeneratedItinerary> {
  const prompt = buildItineraryPrompt(request, attractions);

  const response = await axios.post<OllamaChatResponse>(
    `${config.ollama.baseUrl.replace(/\/$/, "")}/api/chat`,
    {
      model: config.ollama.model,
      stream: false,
      format: "json",
      messages: [
        {
          role: "system",
          content: [
            "You are SkyNode's itinerary planner.",
            "Return only valid JSON.",
            "Do not include markdown, comments, explanations, or extra text.",
          ].join(" "),
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      options: {
        temperature: 0.4,
        num_predict: 1800,
      },
    },
    {
      timeout: config.ollama.timeoutMs,
    },
  );

  const content = response.data.message?.content;

  if (!content) {
    throw new Error("Ollama returned an empty itinerary response.");
  }

  return normalizeItinerary(parseItineraryJson(content), request, attractions, "ollama");
}

export function buildItineraryPrompt(request: GenerateItineraryRequest, attractions: Attraction[]): string {
  const profile = planningProfile(request);
  const context = attractions.slice(0, 10).map((attraction) => ({
    name: attraction.name,
    category: attraction.category,
    address: attraction.address,
  }));

  return JSON.stringify({
    task: "Create a practical short-trip itinerary. Return compact valid JSON only.",
    destinationName: request.destinationName,
    startDate: request.startDate,
    days: request.days,
    budget: request.budget,
    budgetAmount: request.budgetAmount ?? null,
    pace: request.pace,
    cities: request.cities || [],
    hotels: request.hotels || [],
    routeSegments: request.routeSegments || [],
    budgetCategories: request.budgetCategories || [],
    tripNotes: request.notes || null,
    planningProfile: profile,
    interests: request.interests,
    selectedFlight: request.selectedFlight
      ? {
          carrier: request.selectedFlight.carrier,
          departureTime: request.selectedFlight.departureTime,
          arrivalTime: request.selectedFlight.arrivalTime,
        }
      : null,
    attractions: context.slice(0, 6),
    requiredJsonShape: {
      days: [
        {
          dayNumber: 1,
          title: "Day 1: short title",
          summary: "One sentence day summary.",
          estimatedCost: 45,
          items: [
            {
              timeOfDay: "09:00",
              order: 1,
              title: "Activity title",
              description: "One practical sentence.",
              attractionName: "Attraction name from provided list when possible",
              category: "sight",
              location: {
                name: "Specific venue/place name",
                address: "Street or area if known",
                city: "Relevant trip city",
              },
              notes: "Optional user-facing planning note.",
              tags: ["culture"],
              estimatedCost: 0,
            },
          ],
        },
      ],
    },
    rules: [
      `Return exactly ${request.days} days.`,
      `Each day must contain exactly ${profile.itemsPerDay} items.`,
      `Each day should include at least ${profile.paidActivitiesPerDay} paid activities.`,
      `Each day should include at least ${profile.premiumActivitiesPerDay} premium activities.`,
      `Daily activity cost target: ${profile.dailyCostTarget}.`,
      request.budgetAmount ? `Total user budget target: about $${request.budgetAmount}.` : "No exact total budget target was provided.",
      profile.styleRule,
      "Use timeOfDay as a 24-hour local start time like 09:00, 14:30, or 19:00.",
      "Use order as the visit order within the day, starting at 1.",
      "Use provided attractions when possible.",
      "Every item must include a specific attractionName or location name that can be geocoded for the itinerary map.",
      "Every item must include category and location.name. Use categories like flight, hotel, food, sight, museum, nature, nightlife, transport, shopping, experience, rest.",
      "Use location.city to support multi-city trips. If cities are provided, assign each day to the most logical city and keep that day's places in that city unless it is a transfer day.",
      "If routeSegments are provided, account for arrival/departure timing and avoid impossible plans immediately after long transport.",
      "Respect hotels when provided; add check-in/check-out style items when timing matters, but do not overfill days with admin tasks.",
      "Return only trip itinerary items, not budget summaries or explanations.",
      "For restaurants, cafes, bars, hotels, and transit stops, use a concrete venue or station name in attractionName.",
      "Prefer specific local stops over generic activity titles.",
      "Do not make every item free unless the profile is relaxed low budget.",
      "Premium activities can be guided tours, museum tickets, boat rides, tastings, workshops, performances, rooftop/viewpoint tickets, spa visits, or curated experiences.",
      "Keep estimatedCost numeric.",
      "Estimate user-paid activity costs, not total travel costs.",
      "Free public squares, streets, casual walks, monuments and parks can be 0, but high budget itineraries should balance them with paid experiences.",
      "Museums are usually 8-25. Food activities are usually 12-55. Nightlife is usually 15-60. Premium guided experiences are usually 35-120.",
      "Do not assign the same estimatedCost to every item.",
      "Each day estimatedCost must equal the sum of that day's item estimatedCost values.",
      "If interests include food, include one concrete meal, cafe, tasting, restaurant, or market food stop per day.",
      "If interests include nightlife, include one evening bar, music, or nightlife stop on at least one day.",
      "Balance free public sights with paid experiences when the selected interests imply paid activities.",
      "Keep descriptions under 18 words.",
    ],
  });
}

export function parseItineraryJson(content: string): RawItinerary {
  try {
    return JSON.parse(content) as RawItinerary;
  } catch {
    const match = content.match(/\{[\s\S]*\}/);

    if (!match) {
      throw new Error("Ollama did not return parseable JSON.");
    }

    return JSON.parse(match[0]) as RawItinerary;
  }
}

export function normalizeItinerary(
  raw: RawItinerary,
  request: GenerateItineraryRequest,
  attractions: Attraction[],
  generationMode: GeneratedItinerary["generationMode"],
): GeneratedItinerary {
  const days = Array.from({ length: request.days }, (_, index) => {
    const rawDay = raw.days?.[index];
    return normalizeDay(rawDay, index + 1, request, attractions);
  });

  return {
    destinationName: request.destinationName,
    startDate: request.startDate,
    days,
    attractions: attractions.slice(0, 8),
    estimatedTotalCost: days.reduce((sum, day) => sum + day.estimatedCost, 0),
    generationMode,
  };
}

function normalizeDay(
  rawDay: RawDay | undefined,
  dayNumber: number,
  request: GenerateItineraryRequest,
  attractions: Attraction[],
): ItineraryDay {
  const profile = planningProfile(request);
  const rawItems = Array.isArray(rawDay?.items) ? rawDay.items : [];
  const itemCount = profile.itemsPerDay;
  const items = applyBudgetLogic(Array.from({ length: itemCount }, (_, index) =>
    normalizeItem(rawItems[index], itemTimeOfDay(index, itemCount), request, attractions, index, dayNumber),
  ), request, attractions);
  const estimatedCost = items.reduce((sum, item) => sum + item.estimatedCost, 0);

  return {
    dayNumber,
    title: rawDay?.title || `Day ${dayNumber}: ${cityForDay(request, dayNumber)} highlights`,
    summary: rawDay?.summary || profile.styleRule,
    estimatedCost,
    items,
  };
}

function normalizeItem(
  rawItem: RawItem | undefined,
  timeOfDay: ItineraryItem["timeOfDay"],
  request: GenerateItineraryRequest,
  attractions: Attraction[],
  index: number,
  dayNumber: number,
): ItineraryItem {
  const fallback = fallbackItem(index, timeOfDay, request, attractions);
  const title = rawItem?.title || fallback.title;
  const description = rawItem?.description || fallback.description;
  const attractionName = rawItem?.attractionName || fallback.attractionName;
  const matchedAttraction = findAttraction(attractions, attractionName || title);
  const normalizedTimeOfDay = isTimeOfDay(rawItem?.timeOfDay) ? rawItem.timeOfDay : timeOfDay;
  const locationName = rawItem?.location?.name || attractionName || matchedAttraction?.name;

  return {
    timeOfDay: normalizedTimeOfDay,
    order: typeof rawItem?.order === "number" ? rawItem.order : index + 1,
    title,
    description,
    attractionName,
    category: rawItem?.category || matchedAttraction?.category || categoryFromText(`${title} ${description}`),
    location: locationName ? {
      name: locationName,
      address: rawItem?.location?.address || matchedAttraction?.address,
      city: rawItem?.location?.city || cityForDay(request, dayNumber),
      lat: typeof rawItem?.location?.lat === "number" ? rawItem.location.lat : matchedAttraction?.lat,
      lon: typeof rawItem?.location?.lon === "number" ? rawItem.location.lon : matchedAttraction?.lon,
    } : undefined,
    notes: rawItem?.notes,
    tags: Array.isArray(rawItem?.tags) ? rawItem.tags.slice(0, 4) : undefined,
    estimatedCost: normalizeCost({
      rawCost: rawItem?.estimatedCost,
      title,
      description,
      attractionName,
      timeOfDay: normalizedTimeOfDay,
      budget: request.budget,
      attraction: matchedAttraction,
    }),
  };
}

function cityForDay(request: GenerateItineraryRequest, dayNumber: number): string {
  const cities = request.cities?.map((city) => city.name.trim()).filter(Boolean) || [];

  if (cities.length === 0) {
    return request.destinationName;
  }

  const dayIndex = Math.min(dayNumber - 1, request.days - 1);
  const cityIndex = Math.min(cities.length - 1, Math.floor(dayIndex * cities.length / Math.max(request.days, 1)));
  return cities[cityIndex] || request.destinationName;
}

function categoryFromText(text: string): string {
  const normalized = text.toLowerCase();
  if (/\b(flight|airport|plane)\b/.test(normalized)) return "flight";
  if (/\b(hotel|check.?in|check.?out|luggage)\b/.test(normalized)) return "hotel";
  if (/\b(train|bus|metro|tram|ferry|transfer|station)\b/.test(normalized)) return "transport";
  if (/\b(food|restaurant|dinner|lunch|breakfast|cafe|market|tasting)\b/.test(normalized)) return "food";
  if (/\b(museum|gallery)\b/.test(normalized)) return "museum";
  if (/\b(bar|club|nightlife|music)\b/.test(normalized)) return "nightlife";
  if (/\b(park|beach|hike|nature|garden)\b/.test(normalized)) return "nature";
  if (/\b(shop|shopping|boutique)\b/.test(normalized)) return "shopping";
  return "sight";
}

function planningProfile(request: GenerateItineraryRequest): PlanningProfile {
  const matrix: Record<GenerateItineraryRequest["pace"], Record<GenerateItineraryRequest["budget"], PlanningProfile>> = {
    relaxed: {
      low: {
        itemsPerDay: 2,
        paidActivitiesPerDay: 0,
        premiumActivitiesPerDay: 0,
        dailyCostTarget: "$0-35",
        styleRule: "Relaxed low budget: fewer stops, mostly free sights, one optional cheap paid stop.",
      },
      medium: {
        itemsPerDay: 3,
        paidActivitiesPerDay: 1,
        premiumActivitiesPerDay: 0,
        dailyCostTarget: "$25-80",
        styleRule: "Relaxed medium budget: easy pacing, one paid anchor activity, comfortable meal or cafe.",
      },
      high: {
        itemsPerDay: 3,
        paidActivitiesPerDay: 2,
        premiumActivitiesPerDay: 1,
        dailyCostTarget: "$80-180",
        styleRule: "Relaxed high budget: fewer stops, but upgraded experiences and premium moments.",
      },
    },
    balanced: {
      low: {
        itemsPerDay: 3,
        paidActivitiesPerDay: 0,
        premiumActivitiesPerDay: 0,
        dailyCostTarget: "$0-45",
        styleRule: "Balanced low budget: three practical stops, mostly free sights with cheap food or transit.",
      },
      medium: {
        itemsPerDay: 3,
        paidActivitiesPerDay: 1,
        premiumActivitiesPerDay: 0,
        dailyCostTarget: "$40-110",
        styleRule: "Balanced medium budget: classic morning/afternoon/evening plan with one or two paid activities.",
      },
      high: {
        itemsPerDay: 4,
        paidActivitiesPerDay: 2,
        premiumActivitiesPerDay: 1,
        dailyCostTarget: "$110-240",
        styleRule: "Balanced high budget: four polished stops with at least one premium curated experience.",
      },
    },
    packed: {
      low: {
        itemsPerDay: 4,
        paidActivitiesPerDay: 1,
        premiumActivitiesPerDay: 0,
        dailyCostTarget: "$15-70",
        styleRule: "Packed low budget: more stops, mostly free walking-friendly sights, one cheap paid anchor.",
      },
      medium: {
        itemsPerDay: 4,
        paidActivitiesPerDay: 2,
        premiumActivitiesPerDay: 0,
        dailyCostTarget: "$70-160",
        styleRule: "Packed medium budget: four concrete stops with multiple paid activities and efficient routing.",
      },
      high: {
        itemsPerDay: 5,
        paidActivitiesPerDay: 3,
        premiumActivitiesPerDay: 1,
        dailyCostTarget: "$160-320",
        styleRule: "Packed high budget: five concrete stops, multiple paid activities, and one premium experience.",
      },
    },
  };

  return matrix[request.pace][request.budget];
}

function itemTimeOfDay(index: number, itemCount: number): ItineraryItem["timeOfDay"] {
  if (itemCount <= 3) {
    return ["09:00", "14:00", "19:00"][index] as ItineraryItem["timeOfDay"];
  }

  if (itemCount === 4) {
    return ["09:00", "12:30", "16:30", "20:00"][index] as ItineraryItem["timeOfDay"];
  }

  return ["08:30", "11:00", "14:00", "17:00", "20:00"][index] as ItineraryItem["timeOfDay"];
}

function isTimeOfDay(value: string | undefined): value is ItineraryItem["timeOfDay"] {
  return typeof value === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function applyBudgetLogic(
  items: ItineraryItem[],
  request: GenerateItineraryRequest,
  attractions: Attraction[],
): ItineraryItem[] {
  const profile = planningProfile(request);
  let paidCount = items.filter((item) => item.estimatedCost > 0).length;
  let premiumCount = items.filter((item) => item.estimatedCost >= 35 || isPremiumActivity(itemText(item))).length;

  return items.map((item, index) => {
    if (paidCount >= profile.paidActivitiesPerDay && premiumCount >= profile.premiumActivitiesPerDay) {
      return item;
    }

    if (request.budget === "low" && profile.paidActivitiesPerDay === 0 && item.estimatedCost === 0) {
      return item;
    }

    if (isFoodActivity(itemText(item))) {
      return item;
    }

    const attraction = attractions[index % Math.max(attractions.length, 1)];
    const needsPremium = premiumCount < profile.premiumActivitiesPerDay;
    const upgradedItem: ItineraryItem = {
      ...item,
      title: needsPremium ? `Premium ${item.title}` : item.title,
      description: needsPremium
        ? "Upgrade this stop into a curated paid experience matching the selected budget."
        : item.description,
      attractionName: item.attractionName || attraction?.name,
      estimatedCost: needsPremium
        ? budgetAmount(request.budget, 20, 45, 90)
        : Math.max(item.estimatedCost, budgetAmount(request.budget, 8, 18, 35)),
    };

    if (item.estimatedCost === 0 && upgradedItem.estimatedCost > 0) {
      paidCount += 1;
    }

    if (needsPremium) {
      premiumCount += 1;
    }

    return upgradedItem;
  });
}

function itemText(item: ItineraryItem): string {
  return [item.title, item.description, item.attractionName].filter(Boolean).join(" ").toLowerCase();
}

function fallbackItem(
  index: number,
  timeOfDay: ItineraryItem["timeOfDay"],
  request: GenerateItineraryRequest,
  attractions: Attraction[],
): Pick<ItineraryItem, "title" | "description" | "attractionName"> {
  const attraction = attractions[index % Math.max(attractions.length, 1)];

  if (request.budget === "high" && (index === 1 || index === 3)) {
    return {
      title: `Premium ${request.destinationName} experience`,
      description: "Add a curated paid experience that fits the high-budget trip style.",
      attractionName: attraction?.name,
    };
  }

  return {
    title: attraction?.name || `${capitalize(timeOfDay)} ${request.destinationName} highlight`,
    description: "Explore a concrete local stop matched to the selected trip style.",
    attractionName: attraction?.name,
  };
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

type CostContext = {
  rawCost: number | undefined;
  title: string;
  description: string;
  attractionName: string | undefined;
  timeOfDay: ItineraryItem["timeOfDay"];
  budget: GenerateItineraryRequest["budget"];
  attraction: Attraction | undefined;
};

function normalizeCost(context: CostContext): number {
  const text = [
    context.title,
    context.description,
    context.attractionName,
    context.attraction?.name,
    context.attraction?.category,
    context.attraction?.address,
  ].filter(Boolean).join(" ").toLowerCase();

  const estimatedCost = estimateCostFromContext(text, context);

  if (estimatedCost !== null) {
    return estimatedCost;
  }

  if (typeof context.rawCost === "number" && Number.isFinite(context.rawCost) && context.rawCost >= 0) {
    return Math.round(context.rawCost);
  }

  return isEveningTime(context.timeOfDay) ? budgetAmount(context.budget, 0, 8, 18) : 0;
}

function estimateCostFromContext(text: string, context: CostContext): number | null {
  if (isFoodActivity(text)) {
    return isEveningTime(context.timeOfDay)
      ? budgetAmount(context.budget, 14, 28, 45)
      : budgetAmount(context.budget, 8, 18, 32);
  }

  if (isNightlifeActivity(text)) {
    return budgetAmount(context.budget, 12, 25, 45);
  }

  if (isMuseumActivity(text)) {
    return budgetAmount(context.budget, 6, 12, 22);
  }

  if (isTourActivity(text)) {
    return budgetAmount(context.budget, 12, 28, 55);
  }

  if (isPremiumActivity(text)) {
    return budgetAmount(context.budget, 25, 55, 95);
  }

  if (isShoppingActivity(text)) {
    return budgetAmount(context.budget, 10, 30, 70);
  }

  if (isTransportActivity(text)) {
    return budgetAmount(context.budget, 3, 7, 14);
  }

  if (isLikelyFree(text) || isLikelyFreeAttraction(context.attraction)) {
    return 0;
  }

  return null;
}

function isEveningTime(timeOfDay: string): boolean {
  if (timeOfDay === "evening") {
    return true;
  }

  const hour = Number(timeOfDay.slice(0, 2));
  return Number.isFinite(hour) && hour >= 18;
}

function isLikelyFree(text: string): boolean {
  return [
    "walk",
    "walking",
    "square",
    "street",
    "monument",
    "viewpoint",
    "park",
    "bridge",
    "old town",
    "riverside",
    "market stroll",
    "explore",
    "wander",
    "promenade",
    "plaza",
    "cathedral exterior",
    "church exterior",
  ].some((word) => text.includes(word));
}

function isFoodActivity(text: string): boolean {
  return ["food", "lunch", "dinner", "breakfast", "cafe", "restaurant", "market tasting", "tasting"].some((word) =>
    text.includes(word),
  );
}

function isNightlifeActivity(text: string): boolean {
  return ["nightlife", "bar", "cocktail", "club", "music", "jazz"].some((word) => text.includes(word));
}

function isMuseumActivity(text: string): boolean {
  return ["museum", "gallery", "exhibition", "ticketed castle", "inside the castle"].some((word) => text.includes(word));
}

function isTourActivity(text: string): boolean {
  return [
    /\bguided tour\b/,
    /\bwalking tour\b/,
    /\bfood tour\b/,
    /\btour\b/,
    /\bboat\b/,
    /\bcruise\b/,
    /\bworkshop\b/,
    /\bclass\b/,
  ].some((pattern) => pattern.test(text));
}

function isPremiumActivity(text: string): boolean {
  return ["premium", "curated", "skip the line", "private", "spa", "rooftop", "performance", "ticketed", "experience"].some((word) =>
    text.includes(word),
  );
}

function isShoppingActivity(text: string): boolean {
  return ["shopping", "boutique", "souvenir", "design shop"].some((word) => text.includes(word));
}

function isTransportActivity(text: string): boolean {
  return ["tram", "metro", "bus", "funicular", "ferry", "taxi", "train"].some((word) => text.includes(word));
}

function isLikelyFreeAttraction(attraction: Attraction | undefined): boolean {
  const category = attraction?.category.toLowerCase() || "";

  return [
    "tourism",
    "sights",
    "attraction",
    "monument",
    "memorial",
    "viewpoint",
    "park",
    "garden",
    "beach",
    "natural",
    "highway",
    "square",
    "amenity",
  ].some((word) => category.includes(word));
}

function budgetAmount(
  budget: GenerateItineraryRequest["budget"],
  low: number,
  medium: number,
  high: number,
): number {
  if (budget === "low") {
    return low;
  }

  if (budget === "high") {
    return high;
  }

  return medium;
}

function findAttraction(attractions: Attraction[], value: string): Attraction | undefined {
  const normalizedValue = normalizeText(value);

  if (!normalizedValue) {
    return undefined;
  }

  return attractions.find((attraction) => {
    const normalizedName = normalizeText(attraction.name);
    return normalizedName && (normalizedValue.includes(normalizedName) || normalizedName.includes(normalizedValue));
  });
}

function normalizeText(value: string | undefined): string {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

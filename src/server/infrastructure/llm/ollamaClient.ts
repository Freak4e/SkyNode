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
  timeOfDay?: string;
  title?: string;
  description?: string;
  attractionName?: string;
  estimatedCost?: number;
};

export async function generateItineraryWithOllama(
  request: GenerateItineraryRequest,
  attractions: Attraction[],
): Promise<GeneratedItinerary> {
  const prompt = buildPrompt(request, attractions);

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
        num_predict: 1200,
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

  return normalizeItinerary(parseJson(content), request, attractions);
}

function buildPrompt(request: GenerateItineraryRequest, attractions: Attraction[]): string {
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
    pace: request.pace,
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
              timeOfDay: "morning",
              title: "Activity title",
              description: "One practical sentence.",
              attractionName: "Attraction name from provided list when possible",
              estimatedCost: 0,
            },
          ],
        },
      ],
    },
    rules: [
      `Return exactly ${request.days} days.`,
      "Each day must contain exactly three items: morning, afternoon, evening.",
      "Use provided attractions when possible.",
      "Keep estimatedCost numeric.",
      "Estimate user-paid activity costs, not total travel costs.",
      "Free public squares, streets, viewpoints, walks, monuments and parks should usually be 0.",
      "Museums are usually 8-20. Food activities are usually 12-35. Nightlife is usually 15-45.",
      "Do not assign the same estimatedCost to every item.",
      "Each day estimatedCost must equal the sum of that day's item estimatedCost values.",
      "If interests include food, include one concrete meal, cafe, tasting, restaurant, or market food stop per day.",
      "If interests include nightlife, include one evening bar, music, or nightlife stop on at least one day.",
      "Balance free public sights with paid experiences when the selected interests imply paid activities.",
      "Keep descriptions under 18 words.",
    ],
  });
}

function parseJson(content: string): RawItinerary {
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

function normalizeItinerary(
  raw: RawItinerary,
  request: GenerateItineraryRequest,
  attractions: Attraction[],
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
    generationMode: "ollama",
  };
}

function normalizeDay(
  rawDay: RawDay | undefined,
  dayNumber: number,
  request: GenerateItineraryRequest,
  attractions: Attraction[],
): ItineraryDay {
  const items = ["morning", "afternoon", "evening"].map((timeOfDay, index) =>
    normalizeItem(rawDay?.items?.[index], timeOfDay as ItineraryItem["timeOfDay"], request, attractions),
  );
  const estimatedCost = items.reduce((sum, item) => sum + item.estimatedCost, 0);

  return {
    dayNumber,
    title: rawDay?.title || `Day ${dayNumber}: City highlights`,
    summary: rawDay?.summary || "A balanced day built around destination highlights.",
    estimatedCost,
    items,
  };
}

function normalizeItem(
  rawItem: RawItem | undefined,
  timeOfDay: ItineraryItem["timeOfDay"],
  request: GenerateItineraryRequest,
  attractions: Attraction[],
): ItineraryItem {
  const title = rawItem?.title || `${capitalize(timeOfDay)} activity`;
  const description = rawItem?.description || "Explore a local highlight at a comfortable pace.";
  const attractionName = rawItem?.attractionName;
  const matchedAttraction = findAttraction(attractions, attractionName || title);

  return {
    timeOfDay,
    title,
    description,
    attractionName,
    estimatedCost: normalizeCost({
      rawCost: rawItem?.estimatedCost,
      title,
      description,
      attractionName,
      timeOfDay,
      budget: request.budget,
      attraction: matchedAttraction,
    }),
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

  return context.timeOfDay === "evening" ? budgetAmount(context.budget, 0, 8, 18) : 0;
}

function estimateCostFromContext(text: string, context: CostContext): number | null {
  if (isFoodActivity(text)) {
    return context.timeOfDay === "evening"
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

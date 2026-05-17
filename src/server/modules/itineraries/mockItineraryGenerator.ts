import type {
  Attraction,
  GenerateItineraryRequest,
  GeneratedItinerary,
  ItineraryDay,
  ItineraryItem,
} from "../../../shared/types.js";

const interestTemplates: Record<string, string[]> = {
  culture: ["historic quarter", "local architecture", "city museum"],
  food: ["market tasting", "local lunch", "dessert stop"],
  nature: ["riverside walk", "viewpoint", "park break"],
  nightlife: ["cocktail bar", "live music", "evening district"],
  museums: ["museum visit", "gallery stop", "cultural collection"],
  shopping: ["boutique street", "local design shop", "souvenir market"],
  relaxing: ["slow cafe", "spa break", "scenic pause"],
  "hidden gems": ["quiet lane", "local favorite", "lesser-known viewpoint"],
};

export function generateMockItinerary(
  request: GenerateItineraryRequest,
  attractions: Attraction[],
): GeneratedItinerary {
  const usableAttractions = attractions.length > 0 ? attractions : buildFallbackAttractions(request.destinationName);
  const days = Array.from({ length: request.days }, (_, index) =>
    buildDay(index + 1, request, usableAttractions),
  );

  return {
    destinationName: request.destinationName,
    startDate: request.startDate,
    days,
    attractions: usableAttractions.slice(0, 8),
    estimatedTotalCost: days.reduce((sum, day) => sum + day.estimatedCost, 0),
    generationMode: "mock",
  };
}

function buildDay(
  dayNumber: number,
  request: GenerateItineraryRequest,
  attractions: Attraction[],
): ItineraryDay {
  const dayAttractions = [
    attractions[(dayNumber - 1) % attractions.length],
    attractions[dayNumber % attractions.length],
    attractions[(dayNumber + 1) % attractions.length],
  ];
  const items: ItineraryItem[] = [
    buildItem("morning", dayAttractions[0], request, dayNumber),
    buildItem("afternoon", dayAttractions[1], request, dayNumber),
    buildItem("evening", dayAttractions[2], request, dayNumber),
  ];

  return {
    dayNumber,
    title: `Day ${dayNumber}: ${dayTitle(dayNumber, request)}`,
    summary: `A ${request.pace} day focused on ${formatInterestList(request.interests)} in ${request.destinationName}.`,
    estimatedCost: items.reduce((sum, item) => sum + item.estimatedCost, 0),
    items,
  };
}

function buildItem(
  timeOfDay: ItineraryItem["timeOfDay"],
  attraction: Attraction,
  request: GenerateItineraryRequest,
  dayNumber: number,
): ItineraryItem {
  const interest = request.interests[(dayNumber + timeOfDay.length) % Math.max(request.interests.length, 1)] || "culture";
  const ideas = interestTemplates[interest.toLowerCase()] || interestTemplates.culture;
  const activity = ideas[dayNumber % ideas.length];

  return {
    timeOfDay,
    title: `${capitalize(timeOfDay)} at ${attraction.name}`,
    description: `Use this slot for a ${activity} experience near ${attraction.address || request.destinationName}.`,
    attractionName: attraction.name,
    estimatedCost: estimateCost(request.budget, timeOfDay),
  };
}

function dayTitle(dayNumber: number, request: GenerateItineraryRequest): string {
  const titles = [
    "Arrival, orientation and local flavor",
    "Culture, food and city rhythm",
    "Views, neighborhoods and relaxed discoveries",
    "Signature sights and slower moments",
  ];

  return titles[(dayNumber - 1) % titles.length] || `${request.destinationName} highlights`;
}

function estimateCost(budget: GenerateItineraryRequest["budget"], timeOfDay: ItineraryItem["timeOfDay"]): number {
  const base = budget === "low" ? 12 : budget === "high" ? 42 : 24;
  return timeOfDay === "evening" ? base + 12 : base;
}

function formatInterestList(interests: string[]): string {
  if (interests.length === 0) {
    return "local highlights";
  }

  return interests.slice(0, 3).join(", ");
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function buildFallbackAttractions(destinationName: string): Attraction[] {
  return ["Old Town", "Central Market", "Main Viewpoint"].map((name, index) => ({
    id: `fallback-${index}`,
    name: `${destinationName} ${name}`,
    category: "highlight",
    address: destinationName,
    source: "mock",
  }));
}

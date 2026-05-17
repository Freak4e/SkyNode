import type {
  Attraction,
  GenerateItineraryRequest,
  GeneratedItinerary,
  SaveTripRequest,
  SaveTripResponse,
} from "../../shared/types.js";

export async function fetchAttractions(destination: string): Promise<Attraction[]> {
  const response = await fetch(`/api/attractions?destination=${encodeURIComponent(destination)}`);
  const body = await response.json() as { attractions: Attraction[]; warnings?: string[] };

  if (!response.ok) {
    throw new Error(body.warnings?.[0] || "Failed to fetch attractions.");
  }

  return body.attractions;
}

export async function generateItinerary(input: GenerateItineraryRequest): Promise<GeneratedItinerary> {
  const response = await fetch("/api/itineraries/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = await response.json() as { itinerary: GeneratedItinerary | null; warnings?: string[] };

  if (!response.ok || !body.itinerary) {
    throw new Error(body.warnings?.[0] || "Failed to generate itinerary.");
  }

  return body.itinerary;
}

export async function saveTrip(input: SaveTripRequest): Promise<SaveTripResponse> {
  const response = await fetch("/api/trips", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = await response.json() as SaveTripResponse & { warnings?: string[] };

  if (!response.ok) {
    throw new Error(body.warnings?.[0] || "Failed to save trip.");
  }

  return body;
}

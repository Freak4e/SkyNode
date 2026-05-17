import { getDestinationAttractions } from "../attractions/attractionsService.js";
import { generateMockItinerary } from "./mockItineraryGenerator.js";
import type { GenerateItineraryRequest } from "../../../shared/types.js";

export async function generateItinerary(request: GenerateItineraryRequest) {
  validateRequest(request);

  const attractions = await getDestinationAttractions(request.destinationName);
  return generateMockItinerary(request, attractions);
}

function validateRequest(request: GenerateItineraryRequest): void {
  if (!request.destinationName.trim()) {
    throw new Error("Destination is required.");
  }

  if (!request.startDate.trim()) {
    throw new Error("Start date is required.");
  }

  if (!Number.isInteger(request.days) || request.days < 1 || request.days > 10) {
    throw new Error("Trip length must be between 1 and 10 days.");
  }
}

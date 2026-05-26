import { getDestinationAttractions } from "../attractions/attractionsService.js";
import { config } from "../../../config.js";
import { generateItineraryWithGemini } from "../../infrastructure/llm/geminiClient.js";
import { generateItineraryWithOllama } from "../../infrastructure/llm/ollamaClient.js";
import type { GenerateItineraryRequest } from "../../../shared/types.js";

export async function generateItinerary(request: GenerateItineraryRequest) {
  validateRequest(request);

  const attractions = await getDestinationAttractions(request.destinationName);

  if (config.llmProvider === "gemini") {
    return generateItineraryWithGemini(request, attractions);
  }

  return generateItineraryWithOllama(request, attractions);
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

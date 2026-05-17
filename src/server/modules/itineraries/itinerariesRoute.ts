import { Router } from "express";
import { generateItinerary } from "./itineraryService.js";
import type { GenerateItineraryRequest } from "../../../shared/types.js";

export const itinerariesRoute = Router();

itinerariesRoute.post("/generate", async (req, res) => {
  try {
    const request = req.body as GenerateItineraryRequest;
    const itinerary = await generateItinerary(request);

    return res.json({ itinerary, warnings: [] });
  } catch (error) {
    return res.status(400).json({
      itinerary: null,
      warnings: [error instanceof Error ? error.message : "Failed to generate itinerary."],
    });
  }
});

import { Router } from "express";
import { saveTripDraft } from "./tripRepository.js";
import type { SaveTripRequest } from "../../../shared/types.js";

export const tripsRoute = Router();

tripsRoute.post("/", async (req, res) => {
  try {
    const request = req.body as SaveTripRequest;

    if (!request.title || !request.itinerary) {
      return res.status(400).json({ warnings: ["Missing title or itinerary."] });
    }

    return res.status(201).json(await saveTripDraft(request));
  } catch (error) {
    console.error("[route:trips] save failed", error);

    return res.status(502).json({
      warnings: [error instanceof Error ? error.message : "Failed to save trip."],
    });
  }
});

import { Router } from "express";
import { applyTripChangeProposal, getTripById, listTrips, saveTripDraft } from "./tripRepository.js";
import type { ApplyTripChangeRequest, SaveTripRequest } from "../../../shared/types.js";

export const tripsRoute = Router();

tripsRoute.get("/", async (_req, res) => {
  try {
    return res.json({ trips: await listTrips() });
  } catch (error) {
    console.error("[route:trips] list failed", error);

    return res.status(502).json({
      trips: [],
      warnings: [error instanceof Error ? error.message : "Failed to load trips."],
    });
  }
});

tripsRoute.get("/:tripId", async (req, res) => {
  try {
    const trip = await getTripById(req.params.tripId);

    if (!trip) {
      return res.status(404).json({ trip: null, warnings: ["Trip not found."] });
    }

    return res.json({ trip });
  } catch (error) {
    console.error("[route:trips] load failed", error);

    return res.status(502).json({
      trip: null,
      warnings: [error instanceof Error ? error.message : "Failed to load trip."],
    });
  }
});

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

tripsRoute.patch("/:tripId/itinerary", async (req, res) => {
  try {
    const request = req.body as ApplyTripChangeRequest;

    if (!request.proposal?.itinerary?.days?.length) {
      return res.status(400).json({ warnings: ["Missing trip change proposal."] });
    }

    const trip = await applyTripChangeProposal(req.params.tripId, request.proposal);

    if (!trip) {
      return res.status(404).json({ trip: null, warnings: ["Trip not found."] });
    }

    return res.json({ trip });
  } catch (error) {
    console.error("[route:trips] apply proposal failed", error);

    return res.status(502).json({
      trip: null,
      warnings: [error instanceof Error ? error.message : "Failed to apply trip changes."],
    });
  }
});

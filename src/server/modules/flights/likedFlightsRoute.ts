import { Router } from "express";
import { getAuthenticatedUserId, requireAuth } from "../../middleware/authMiddleware.js";
import { deleteLikedFlight, listLikedFlights, saveLikedFlight } from "./likedFlightsRepository.js";
import type { SaveLikedFlightRequest } from "../../../shared/types.js";

export const likedFlightsRoute = Router();

likedFlightsRoute.use(requireAuth);

likedFlightsRoute.get("/", async (_req, res) => {
  try {
    return res.json({ likedFlights: await listLikedFlights(getAuthenticatedUserId(res)) });
  } catch (error) {
    console.error("[route:liked-flights] list failed", error);
    return res.status(502).json({
      likedFlights: [],
      warnings: [error instanceof Error ? error.message : "Failed to load liked flights."],
    });
  }
});

likedFlightsRoute.post("/", async (req, res) => {
  try {
    const request = req.body as SaveLikedFlightRequest;

    if (!request?.outbound || !request.departureDate || !request.tripType) {
      return res.status(400).json({ warnings: ["Missing flight details."] });
    }

    const likedFlight = await saveLikedFlight(getAuthenticatedUserId(res), request);
    return res.status(201).json({ likedFlight });
  } catch (error) {
    console.error("[route:liked-flights] save failed", error);
    return res.status(502).json({
      warnings: [error instanceof Error ? error.message : "Failed to save liked flight."],
    });
  }
});

likedFlightsRoute.delete("/:likedFlightId", async (req, res) => {
  try {
    const deleted = await deleteLikedFlight(getAuthenticatedUserId(res), req.params.likedFlightId);

    if (!deleted) {
      return res.status(404).json({ warnings: ["Liked flight not found."] });
    }

    return res.status(204).send();
  } catch (error) {
    console.error("[route:liked-flights] delete failed", error);
    return res.status(502).json({
      warnings: [error instanceof Error ? error.message : "Failed to remove liked flight."],
    });
  }
});

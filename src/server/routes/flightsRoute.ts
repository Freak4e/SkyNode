import { Router } from "express";
import { searchFlights } from "../services/flightSearchService.js";
import type { FlightSearchResponse, ProviderId } from "../../shared/types.js";

export const flightsRoute = Router();

flightsRoute.get("/", async (req, res) => {
  const from = String(req.query.from || "").trim();
  const to = String(req.query.to || "").trim();
  const date = String(req.query.date || "").trim();
  const provider = String(req.query.provider || "scrapingbee").trim() as ProviderId;

  if (!from || !to || !date) {
    return res.status(400).json({
      offers: [],
      warnings: ["Missing required query params: from, to, date."],
      source: "none",
    } satisfies FlightSearchResponse);
  }

  try {
    return res.json(await searchFlights({ from, to, date, provider }));
  } catch (error) {
    console.error("[route:flights] search failed", error);

    return res.status(502).json({
      offers: [],
      warnings: [error instanceof Error ? error.message : "Flight search failed."],
      source: "none",
    } satisfies FlightSearchResponse);
  }
});

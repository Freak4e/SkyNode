import { Router } from "express";
import type { CurrencyCode, ExploreResponse, Place } from "../../shared/types.js";
import { searchPlaces } from "../../places.js";
import { fetchTravelpayoutsExploreDeals } from "../../travelpayouts.js";

export const exploreRoute = Router();

exploreRoute.get("/", async (req, res) => {
  const origin = String(req.query.origin || "").trim().toUpperCase();
  const destination = String(req.query.destination || "").trim().toUpperCase();
  const currency = String(req.query.currency || "USD").trim().toUpperCase() as CurrencyCode;
  const limit = Number(req.query.limit || 100);

  if (!origin) {
    return res.status(400).json({
      deals: [],
      warnings: ["Missing required query param: origin."],
    } satisfies ExploreResponse);
  }

  try {
    const deals = await fetchTravelpayoutsExploreDeals({
      origin,
      destination: destination || undefined,
      currency,
      limit: Number.isFinite(limit) ? limit : 30,
      oneWay: true,
    });

    const uniqueDestinations = Array.from(new Set(deals.map((deal) => deal.destination))).slice(0, 60);
    const placesByCode = new Map<string, Place>();

    await Promise.all(uniqueDestinations.map(async (code) => {
      const results = await searchPlaces(code);
      const best = results.find((place) => place.code === code) || results[0];
      if (best) placesByCode.set(code, best);
    }));

    const enriched = deals.map((deal) => ({
      ...deal,
      destinationPlace: placesByCode.get(deal.destination) || null,
    }));

    return res.json({
      deals: enriched,
      warnings: [],
    } satisfies ExploreResponse);
  } catch (error) {
    return res.status(502).json({
      deals: [],
      warnings: [error instanceof Error ? error.message : "Explore request failed."],
    } satisfies ExploreResponse);
  }
});


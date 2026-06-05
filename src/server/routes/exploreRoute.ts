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
    const cityPlaceLookups = new Map<string, Promise<Place[]>>();

    await Promise.all(uniqueDestinations.map(async (code) => {
      const results = await searchPlaces(code);
      const best = results.find((place) => place.code === code) || results[0];
      if (!best) return;

      placesByCode.set(code, await withCityCoordinates(best, results, cityPlaceLookups));
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

async function withCityCoordinates(place: Place, knownPlaces: Place[], cityPlaceLookups: Map<string, Promise<Place[]>>): Promise<Place> {
  if (place.type === "city" || !place.cityName) {
    return place;
  }

  const citySearchKey = place.cityName.trim().toLowerCase();
  if (!cityPlaceLookups.has(citySearchKey)) {
    cityPlaceLookups.set(citySearchKey, searchPlaces(place.cityName));
  }

  const city = findMatchingCityPlace(place, knownPlaces) || findMatchingCityPlace(place, await cityPlaceLookups.get(citySearchKey)!);
  if (!city?.coordinates) {
    return place;
  }

  return {
    ...place,
    coordinates: city.coordinates,
  };
}

function findMatchingCityPlace(place: Place, candidates: Place[]): Place | undefined {
  const cityName = place.cityName.trim().toLowerCase();
  const cityCode = place.cityCode?.trim().toUpperCase();

  return candidates.find((candidate) => {
    if (candidate.type !== "city" || !candidate.coordinates) return false;
    if (cityCode && candidate.code.toUpperCase() === cityCode) return true;
    return candidate.cityName.trim().toLowerCase() === cityName || candidate.name.trim().toLowerCase() === cityName;
  });
}

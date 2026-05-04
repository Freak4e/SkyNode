import { searchKayakWithScrapingBee } from "../providers/scrapingBeeProvider.js";
import { searchTravelpayoutsCachedData } from "../providers/travelpayoutsDataProvider.js";
import type { FlightSearchInput, FlightSearchResponse, ProviderId } from "../../shared/types.js";

export async function searchFlights(input: FlightSearchInput): Promise<FlightSearchResponse> {
  const normalizedInput = normalizeInput(input);
  const warnings: string[] = [];

  if (normalizedInput.provider === "scrapingbee") {
    return searchKayakWithScrapingBee(normalizedInput);
  }

  if (normalizedInput.provider === "travelpayouts") {
    return searchTravelpayoutsCachedData(normalizedInput);
  }

  const liveResult = await searchKayakWithScrapingBee(normalizedInput);

  if (liveResult.offers.length > 0) {
    return liveResult;
  }

  warnings.push(...liveResult.warnings);
  warnings.push("Live provider returned no extracted offers; checking optional Travelpayouts cached data.");

  try {
    const cachedResult = await searchTravelpayoutsCachedData(normalizedInput);

    return {
      offers: cachedResult.offers,
      warnings: [...warnings, ...cachedResult.warnings],
      source: cachedResult.source,
    };
  } catch (error) {
    return {
      offers: [],
      warnings: [
        ...warnings,
        error instanceof Error ? error.message : "Travelpayouts cached-data fallback failed.",
      ],
      source: "none",
    };
  }
}

function normalizeInput(input: FlightSearchInput): Required<FlightSearchInput> {
  return {
    from: input.from.trim().toUpperCase(),
    to: input.to.trim().toUpperCase(),
    date: input.date.trim(),
    provider: normalizeProvider(input.provider),
  };
}

function normalizeProvider(provider: ProviderId | undefined): ProviderId {
  if (provider === "auto" || provider === "travelpayouts" || provider === "scrapingbee") {
    return provider;
  }

  return "scrapingbee";
}

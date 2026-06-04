import { searchKayakWithScrapingBee } from "../providers/scrapingBeeProvider.js";
import { searchTravelpayoutsCachedData } from "../providers/travelpayoutsDataProvider.js";
import type { CurrencyCode, FlightSearchInput, FlightSearchResponse, NormalizedFlightSearchInput, ProviderId } from "../../shared/types.js";

export async function searchFlights(input: FlightSearchInput): Promise<FlightSearchResponse> {
  const fromCodes = normalizeCodes(input.from);
  const toCodes = normalizeCodes(input.to);

  if (fromCodes.length > 1 || toCodes.length > 1) {
    return searchFlightCombinations({ ...input, from: fromCodes, to: toCodes });
  }

  const normalizedInput = normalizeInput(input);
  const warnings: string[] = [];

  if (normalizedInput.provider === "scrapingbee") {
    return tagSearchRoute(await searchKayakWithScrapingBee(normalizedInput), normalizedInput.from, normalizedInput.to);
  }

  if (normalizedInput.provider === "travelpayouts") {
    return tagSearchRoute(await searchTravelpayoutsCachedData(normalizedInput), normalizedInput.from, normalizedInput.to);
  }

  const liveResult = await searchKayakWithScrapingBee(normalizedInput);

  if (liveResult.offers.length > 0) {
    return tagSearchRoute(liveResult, normalizedInput.from, normalizedInput.to);
  }

  warnings.push(...liveResult.warnings);
  warnings.push("Live provider returned no extracted offers; checking optional Travelpayouts cached data.");

  try {
    const cachedResult = await searchTravelpayoutsCachedData(normalizedInput);

    return {
      offers: cachedResult.offers.map((offer) => ({
        ...offer,
        searchFrom: offer.searchFrom || normalizedInput.from,
        searchTo: offer.searchTo || normalizedInput.to,
      })),
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

function tagSearchRoute(result: FlightSearchResponse, from: string, to: string): FlightSearchResponse {
  return {
    ...result,
    offers: result.offers.map((offer) => ({
      ...offer,
      searchFrom: offer.searchFrom || from,
      searchTo: offer.searchTo || to,
    })),
  };
}

async function searchFlightCombinations(input: FlightSearchInput & { from: string[]; to: string[] }): Promise<FlightSearchResponse> {
  const warnings: string[] = [];
  const searchedRoutes: Array<{ from: string; to: string }> = [];
  const routePairs = input.from.flatMap((from) => input.to.map((to) => ({ from, to })))
    .filter((route) => route.from !== route.to)
    .slice(0, 12);
  const results = await Promise.all(routePairs.map(async (route) => {
    searchedRoutes.push(route);

    try {
      const result = await searchFlights({
        ...input,
        from: route.from,
        to: route.to,
      });

      return {
        ...result,
        offers: result.offers.map((offer) => ({
          ...offer,
          searchFrom: route.from,
          searchTo: route.to,
        })),
      };
    } catch (error) {
      return {
        offers: [],
        warnings: [error instanceof Error ? `${route.from}-${route.to}: ${error.message}` : `${route.from}-${route.to}: search failed.`],
        source: "none" as const,
      };
    }
  }));
  const offers = dedupeOffers(results.flatMap((result) => result.offers)).sort((first, second) => priceNumber(first.priceText) - priceNumber(second.priceText));

  results.forEach((result) => warnings.push(...result.warnings));

  return {
    offers,
    warnings,
    source: results.some((result) => result.source === "scrapingbee")
      ? "scrapingbee"
      : results.some((result) => result.source === "travelpayouts")
      ? "travelpayouts"
      : "none",
    searchedRoutes,
  };
}

function normalizeInput(input: FlightSearchInput): NormalizedFlightSearchInput {
  return {
    from: normalizeCodes(input.from)[0] || "",
    to: normalizeCodes(input.to)[0] || "",
    date: input.date.trim(),
    provider: normalizeProvider(input.provider),
    currency: normalizeCurrency(input.currency),
  };
}

function normalizeCodes(value: string | string[]): string[] {
  const raw = Array.isArray(value) ? value : value.split(",");

  return raw
    .map((code) => code.trim().toUpperCase())
    .filter(Boolean)
    .filter((code, index, all) => all.indexOf(code) === index);
}

function dedupeOffers(offers: FlightSearchResponse["offers"]): FlightSearchResponse["offers"] {
  const seen = new Set<string>();
  const deduped: FlightSearchResponse["offers"] = [];

  offers.forEach((offer) => {
    const key = [
      offer.searchFrom,
      offer.searchTo,
      offer.carrier,
      offer.departureTime,
      offer.arrivalTime,
      offer.priceText,
      offer.bookingLink,
    ].join("|");

    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(offer);
    }
  });

  return deduped;
}

function priceNumber(value: string): number {
  const match = value.replace(/,/g, "").match(/\d+/);
  return match ? Number(match[0]) : Number.MAX_SAFE_INTEGER;
}

function normalizeProvider(provider: ProviderId | undefined): ProviderId {
  if (provider === "auto" || provider === "travelpayouts" || provider === "scrapingbee") {
    return provider;
  }

  return "scrapingbee";
}

function normalizeCurrency(currency: CurrencyCode | undefined): CurrencyCode {
  if (
    currency === "USD" ||
    currency === "EUR" ||
    currency === "GBP" ||
    currency === "JPY" ||
    currency === "CHF" ||
    currency === "CAD" ||
    currency === "AUD" ||
    currency === "CNY"
  ) {
    return currency;
  }

  return "USD";
}

export const __test = {
  dedupeOffers,
  normalizeCodes,
  normalizeCurrency,
  normalizeInput,
  normalizeProvider,
  priceNumber,
  tagSearchRoute,
};

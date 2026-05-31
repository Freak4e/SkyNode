import type { CurrencyCode, ExploreResponse } from "../../shared/types.js";

export async function fetchExploreDeals(input: {
  origin: string;
  destination?: string;
  currency?: CurrencyCode;
  limit?: number;
}): Promise<ExploreResponse> {
  const params = new URLSearchParams({
    origin: input.origin.trim().toUpperCase(),
  });

  if (input.destination) params.set("destination", input.destination.trim().toUpperCase());
  if (input.currency) params.set("currency", input.currency);
  if (typeof input.limit === "number") params.set("limit", String(input.limit));

  const response = await fetch(`/api/explore?${params.toString()}`);
  const body = await response.json() as ExploreResponse;

  if (!response.ok) {
    throw new Error(body.warnings?.[0] || "Explore request failed.");
  }

  return body;
}


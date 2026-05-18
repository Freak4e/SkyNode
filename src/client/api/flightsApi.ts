import type { FlightSearchInput, FlightSearchResponse, Place } from "../../shared/types.js";

export async function searchFlights(input: FlightSearchInput & Required<Pick<FlightSearchInput, "from" | "to" | "date" | "provider">>): Promise<FlightSearchResponse> {
  const params = new URLSearchParams({
    from: input.from,
    to: input.to,
    date: input.date,
    provider: input.provider,
  });

  if (input.currency) {
    params.set("currency", input.currency);
  }

  const response = await fetch(`/api/flights?${params.toString()}`);
  const body = await response.json() as FlightSearchResponse;

  if (!response.ok) {
    throw new Error(body.warnings?.[0] || "Flight search failed.");
  }

  return body;
}

export async function searchPlaces(term: string, signal?: AbortSignal): Promise<Place[]> {
  const response = await fetch(`/api/places?term=${encodeURIComponent(term)}`, { signal });
  const body = await response.json() as { places: Place[] };

  return body.places;
}

import { readApiJson } from "./http.js";

export type CitySearchResult = {
  name: string;
  countryName: string;
  address: string;
  lat: number;
  lon: number;
};

export async function searchCities(term: string, signal?: AbortSignal): Promise<CitySearchResult[]> {
  const response = await fetch(`/api/geocode/cities?term=${encodeURIComponent(term)}`, { signal });
  const body = await readApiJson<{ cities?: CitySearchResult[]; warnings?: string[] }>(response, "City search failed before the server returned JSON.");

  if (!response.ok) {
    throw new Error(body.warnings?.[0] || "City search failed.");
  }

  return body.cities || [];
}

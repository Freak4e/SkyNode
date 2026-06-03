export type CitySearchResult = {
  name: string;
  countryName: string;
  address: string;
  lat: number;
  lon: number;
};

export async function searchCities(term: string, signal?: AbortSignal): Promise<CitySearchResult[]> {
  const response = await fetch(`/api/geocode/cities?term=${encodeURIComponent(term)}`, { signal });
  const body = await response.json() as { cities?: CitySearchResult[]; warnings?: string[] };

  if (!response.ok) {
    throw new Error(body.warnings?.[0] || "City search failed.");
  }

  return body.cities || [];
}

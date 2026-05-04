import axios from "axios";
import type { Place } from "./shared/types.js";

type TravelpayoutsPlace = {
  code?: string;
  name?: string;
  city_name?: string;
  country_name?: string;
  type?: string;
};

const fallbackPlaces: Place[] = [
  { code: "SKP", name: "Skopje", cityName: "Skopje", countryName: "North Macedonia", type: "city" },
  { code: "IST", name: "Istanbul", cityName: "Istanbul", countryName: "Turkey", type: "city" },
  { code: "SAW", name: "Sabiha Gokcen", cityName: "Istanbul", countryName: "Turkey", type: "airport" },
  { code: "JFK", name: "John F. Kennedy", cityName: "New York", countryName: "United States", type: "airport" },
  { code: "NYC", name: "New York", cityName: "New York", countryName: "United States", type: "city" },
  { code: "LAX", name: "Los Angeles", cityName: "Los Angeles", countryName: "United States", type: "airport" },
  { code: "LON", name: "London", cityName: "London", countryName: "United Kingdom", type: "city" },
  { code: "PAR", name: "Paris", cityName: "Paris", countryName: "France", type: "city" },
  { code: "BER", name: "Berlin", cityName: "Berlin", countryName: "Germany", type: "city" },
  { code: "ROM", name: "Rome", cityName: "Rome", countryName: "Italy", type: "city" },
  { code: "ATH", name: "Athens", cityName: "Athens", countryName: "Greece", type: "city" },
  { code: "VIE", name: "Vienna", cityName: "Vienna", countryName: "Austria", type: "city" },
  { code: "ZAG", name: "Zagreb", cityName: "Zagreb", countryName: "Croatia", type: "city" },
  { code: "BEG", name: "Belgrade", cityName: "Belgrade", countryName: "Serbia", type: "city" },
];

export async function searchPlaces(term: string): Promise<Place[]> {
  const normalizedTerm = term.trim();

  if (normalizedTerm.length < 2) {
    return fallbackPlaces.slice(0, 8);
  }

  try {
    const response = await axios.get<TravelpayoutsPlace[]>(
      "https://autocomplete.travelpayouts.com/places2",
      {
        timeout: 8000,
        params: {
          locale: "en",
          term: normalizedTerm,
          "types[]": ["city", "airport"],
        },
      },
    );

    const places = response.data
      .map(normalizePlace)
      .filter((place): place is Place => Boolean(place))
      .slice(0, 10);

    return places.length > 0 ? places : searchFallbackPlaces(normalizedTerm);
  } catch {
    return searchFallbackPlaces(normalizedTerm);
  }
}

function normalizePlace(place: TravelpayoutsPlace): Place | null {
  if (!place.code || !place.name) {
    return null;
  }

  return {
    code: place.code.toUpperCase(),
    name: place.name,
    cityName: place.city_name || place.name,
    countryName: place.country_name || "",
    type: place.type || "place",
  };
}

function searchFallbackPlaces(term: string): Place[] {
  const query = term.toLowerCase();

  return fallbackPlaces
    .filter((place) =>
      [place.code, place.name, place.cityName, place.countryName]
        .join(" ")
        .toLowerCase()
        .includes(query),
    )
    .slice(0, 10);
}

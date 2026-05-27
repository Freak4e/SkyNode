import axios from "axios";
import { config } from "../../../config.js";
import type { Attraction } from "../../../shared/types.js";

type GeoapifyFeature = {
  properties?: {
    place_id?: string;
    name?: string;
    formatted?: string;
    categories?: string[];
    lat?: number;
    lon?: number;
  };
};

type GeoapifyResponse = {
  features?: GeoapifyFeature[];
};

type GeoapifyGeocodeResponse = {
  features?: Array<{
    properties?: {
      name?: string;
      formatted?: string;
      lat?: number;
      lon?: number;
    };
  }>;
};

export type GeoapifyGeocodePoint = {
  title: string;
  address: string;
  lat: number;
  lon: number;
};

type GeocodeTextOptions = {
  center?: {
    lat: number;
    lon: number;
  };
  radiusMeters?: number;
};

export async function fetchAttractions(destination: string): Promise<Attraction[]> {
  const apiKey = config.geoapify.apiKey;

  if (!apiKey) {
    return fallbackAttractions(destination);
  }

  const coordinates = await geocodeDestination(destination, apiKey);

  if (!coordinates) {
    return fallbackAttractions(destination);
  }

  const response = await axios.get<GeoapifyResponse>(config.geoapify.apiUrl, {
    timeout: config.geoapify.timeoutMs,
    params: {
      apiKey,
      categories: "tourism",
      filter: `circle:${coordinates.lon},${coordinates.lat},7000`,
      bias: `proximity:${coordinates.lon},${coordinates.lat}`,
      limit: 12,
    },
  });

  const attractions = (response.data.features || [])
    .map((feature, index) => normalizeAttraction(feature, index))
    .filter((attraction): attraction is Attraction => Boolean(attraction));

  return attractions.length > 0 ? attractions : fallbackAttractions(destination);
}

async function geocodeDestination(destination: string, apiKey: string) {
  return geocodeText(destination, apiKey);
}

export async function geocodeText(
  text: string,
  apiKey = config.geoapify.apiKey,
  options: GeocodeTextOptions = {},
): Promise<GeoapifyGeocodePoint | null> {
  if (!apiKey) {
    return null;
  }

  const response = await axios.get<GeoapifyGeocodeResponse>(
    "https://api.geoapify.com/v1/geocode/search",
    {
      timeout: config.geoapify.timeoutMs,
      params: {
        apiKey,
        text,
        limit: 1,
        ...(options.center ? {
          bias: `proximity:${options.center.lon},${options.center.lat}`,
          filter: `circle:${options.center.lon},${options.center.lat},${options.radiusMeters || 25000}`,
        } : {}),
      },
    },
  );
  const properties = response.data.features?.[0]?.properties;

  if (typeof properties?.lat !== "number" || typeof properties?.lon !== "number") {
    return null;
  }

  return {
    title: properties.name || text,
    address: properties.formatted || text,
    lat: properties.lat,
    lon: properties.lon,
  };
}

function normalizeAttraction(feature: GeoapifyFeature, index: number): Attraction | null {
  const properties = feature.properties;
  const name = properties?.name;

  if (!name) {
    return null;
  }

  return {
    id: properties?.place_id || `geoapify-${index}`,
    name,
    category: cleanCategory(properties?.categories),
    address: properties?.formatted || "",
    lat: properties?.lat,
    lon: properties?.lon,
    source: "geoapify",
  };
}

function cleanCategory(categories: string[] | undefined): string {
  if (!categories || categories.length === 0) {
    return "Attraction";
  }

  const priorityCategory =
    categories.find((category) => /museum|gallery|castle|zoo|aquarium/i.test(category)) ||
    categories.find((category) => /catering|restaurant|cafe|bar|food/i.test(category)) ||
    categories.find((category) => /park|garden|viewpoint|natural|beach/i.test(category)) ||
    categories.find((category) => /monument|memorial|sights|tourism|attraction/i.test(category)) ||
    categories[0];
  const parts = priorityCategory.split(".");

  return parts[parts.length - 1]?.replaceAll("_", " ") || "Attraction";
}

function fallbackAttractions(destination: string): Attraction[] {
  return [
    {
      id: "mock-old-town",
      name: `${destination} Old Town`,
      category: "historic",
      address: destination,
      source: "mock",
    },
    {
      id: "mock-market",
      name: `${destination} Central Market`,
      category: "food",
      address: destination,
      source: "mock",
    },
    {
      id: "mock-viewpoint",
      name: `${destination} Viewpoint`,
      category: "nature",
      address: destination,
      source: "mock",
    },
  ];
}

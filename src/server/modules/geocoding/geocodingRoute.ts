import { Router } from "express";
import { geocodeText, searchCityText } from "../attractions/geoapifyProvider.js";
import type { GeocodeRequest, GeocodeResponse } from "../../../shared/types.js";

export const geocodingRoute = Router();

type BoundaryCenter = {
  city: string;
  point: { lat: number; lon: number };
};

geocodingRoute.get("/cities", async (req, res) => {
  const term = String(req.query.term || "").trim();

  if (term.length < 2) {
    return res.json({ cities: [] });
  }

  try {
    const seen = new Set<string>();
    const cities = (await searchCityText(term))
      .filter((city) => {
        const key = `${city.title}-${city.country || ""}`.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((city) => ({
        name: city.title,
        countryName: city.country || "",
        address: city.address,
        lat: city.lat,
        lon: city.lon,
      }));

    return res.json({ cities });
  } catch (error) {
    return res.status(502).json({
      cities: [],
      warnings: [error instanceof Error ? error.message : "Failed to search cities."],
    });
  }
});

geocodingRoute.post("/", async (req, res) => {
  const request = req.body as GeocodeRequest;

  if (!request.destinationName?.trim() || !Array.isArray(request.items)) {
    return res.status(400).json({
      points: [],
      warnings: ["Missing destinationName or items."],
    } satisfies GeocodeResponse);
  }

  try {
    const points: GeocodeResponse["points"] = [];
    const warnings: string[] = [];
    const allowOutsideDestination = request.allowOutsideDestination === true;
    const destinationCenter = await geocodeText(request.destinationName);
    const boundaryCenters = await geocodeBoundaryCities(request.boundaryCities || [request.destinationName]);
    const radiusMeters = 80000;

    for (const item of request.items.slice(0, 24)) {
      const point = await resolveItemGeocodePoint(item, request, allowOutsideDestination, destinationCenter, radiusMeters);
      if (!point) {
        continue;
      }

      const boundary = nearestBoundary(point, boundaryCenters);
      const outsideBoundary = Boolean(boundary && boundary.distanceMeters > radiusMeters);

      if (!isPointAllowedForDestination(point, destinationCenter, allowOutsideDestination, radiusMeters)) {
        continue;
      }

      if (outsideBoundary) {
        warnings.push(`${point.title} appears to be outside your trip cities.`);
      }

      points.push(toGeocodeResponsePoint(item, point, boundary, outsideBoundary));
    }

    return res.json({ points, warnings } satisfies GeocodeResponse);
  } catch (error) {
    return res.status(502).json({
      points: [],
      warnings: [error instanceof Error ? error.message : "Failed to geocode itinerary items."],
    } satisfies GeocodeResponse);
  }
});

async function resolveItemGeocodePoint(
  item: GeocodeRequest["items"][number],
  request: GeocodeRequest,
  allowOutsideDestination: boolean,
  destinationCenter: { lat: number; lon: number } | null,
  radiusMeters: number,
) {
  const queries = buildGeocodeQueries(item, request.destinationName, request.boundaryCities, allowOutsideDestination);

  for (const query of queries) {
    const point = await geocodeText(
      query,
      undefined,
      allowOutsideDestination ? {} : {
        center: destinationCenter || undefined,
        radiusMeters,
      },
    );

    if (point) {
      return point;
    }
  }

  return null;
}

function isPointAllowedForDestination(
  point: { lat: number; lon: number },
  destinationCenter: { lat: number; lon: number } | null,
  allowOutsideDestination: boolean,
  radiusMeters: number,
): boolean {
  return allowOutsideDestination || !destinationCenter || distanceMeters(destinationCenter, point) <= radiusMeters;
}

function toGeocodeResponsePoint(
  item: GeocodeRequest["items"][number],
  point: Awaited<ReturnType<typeof geocodeText>> & { lat: number; lon: number },
  boundary: ReturnType<typeof nearestBoundary>,
  outsideBoundary: boolean,
): GeocodeResponse["points"][number] {
  return {
    id: item.id,
    title: point.title || item.attractionName || item.title,
    address: point.address,
    lat: point.lat,
    lon: point.lon,
    source: "geoapify",
    outsideBoundary,
    nearestBoundaryCity: boundary?.city,
    distanceKm: boundary ? Math.round(boundary.distanceMeters / 1000) : undefined,
  };
}

function buildGeocodeQueries(item: GeocodeRequest["items"][number], destinationName: string, boundaryCities: string[] | undefined, allowOutsideDestination: boolean): string[] {
  const mainText = item.attractionName?.trim() || item.title.trim();
  if (!allowOutsideDestination) return [`${mainText}, ${destinationName}`];

  const localCities = [...(boundaryCities || []), destinationName]
    .map((city) => city.trim())
    .filter(Boolean)
    .filter((city, index, all) => all.findIndex((item) => item.toLowerCase() === city.toLowerCase()) === index)
    .slice(0, 4);

  return [...localCities.map((city) => `${mainText}, ${city}`), mainText];
}

async function geocodeBoundaryCities(cities: string[]): Promise<BoundaryCenter[]> {
  const uniqueCities = cities
    .map((city) => city.trim())
    .filter(Boolean)
    .filter((city, index, all) => all.findIndex((item) => item.toLowerCase() === city.toLowerCase()) === index)
    .slice(0, 8);
  const centers = await Promise.all(uniqueCities.map(async (city) => {
    const point = await geocodeText(city);
    return point ? { city, point: { lat: point.lat, lon: point.lon } } : null;
  }));

  return centers.filter((center): center is BoundaryCenter => Boolean(center));
}

function nearestBoundary(point: { lat: number; lon: number }, boundaries: BoundaryCenter[]) {
  if (boundaries.length === 0) {
    return null;
  }

  return boundaries
    .map((boundary) => ({
      city: boundary.city,
      distanceMeters: distanceMeters(boundary.point, point),
    }))
    .sort((first, second) => first.distanceMeters - second.distanceMeters)[0];
}

function distanceMeters(
  first: { lat: number; lon: number },
  second: { lat: number; lon: number },
): number {
  const earthRadiusMeters = 6371000;
  const lat1 = toRadians(first.lat);
  const lat2 = toRadians(second.lat);
  const deltaLat = toRadians(second.lat - first.lat);
  const deltaLon = toRadians(second.lon - first.lon);
  const haversine =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) *
    Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  const angularDistance = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));

  return earthRadiusMeters * angularDistance;
}

function toRadians(value: number): number {
  return value * Math.PI / 180;
}

export const __test = {
  buildGeocodeQueries,
  distanceMeters,
  geocodeBoundaryCities,
  isPointAllowedForDestination,
  nearestBoundary,
  resolveItemGeocodePoint,
  toGeocodeResponsePoint,
  toRadians,
};

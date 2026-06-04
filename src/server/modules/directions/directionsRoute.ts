import axios from "axios";
import { Router } from "express";
import { config, requireOpenRouteServiceApiKey } from "../../../config.js";

type DirectionsPoint = {
  lat: number;
  lon: number;
};

type DirectionsDay = {
  dayNumber: number;
  points: DirectionsPoint[];
};

type RouteResult = {
  points: DirectionsPoint[];
  source: "openrouteservice" | "fallback" | "none";
};

type OpenRouteServiceResponse = {
  features?: Array<{
    geometry?: {
      coordinates?: Array<[number, number]>;
    };
  }>;
};

type CacheEntry = {
  expiresAt: number;
  result: RouteResult;
};

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const FALLBACK_CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_CACHE_ENTRIES = 500;

const routeCache = new Map<string, CacheEntry>();

export const directionsRoute = Router();

directionsRoute.post("/", async (req, res) => {
  const days = Array.isArray(req.body?.days) ? req.body.days as DirectionsDay[] : [];

  const routes = await Promise.all(days.map(async (day) => {
    const points = day.points.filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lon));

    if (points.length < 2) {
      return { dayNumber: day.dayNumber, points, source: "none" as const };
    }

    const cached = readCache(points);
    if (cached) {
      return { dayNumber: day.dayNumber, ...cached };
    }

    const resolved = await fetchDayRoute(points);
    writeCache(points, resolved, resolved.source === "fallback" ? FALLBACK_CACHE_TTL_MS : CACHE_TTL_MS);

    return { dayNumber: day.dayNumber, ...resolved };
  }));

  return res.json({ routes });
});

function cacheKey(points: DirectionsPoint[]): string {
  const coords = points
    .map((point) => `${point.lat.toFixed(5)},${point.lon.toFixed(5)}`)
    .join("|");

  return `${config.openRouteService.profile}:${coords}`;
}

function readCache(points: DirectionsPoint[]): RouteResult | null {
  const key = cacheKey(points);
  const entry = routeCache.get(key);

  if (!entry) {
    return null;
  }

  if (entry.expiresAt <= Date.now()) {
    routeCache.delete(key);
    return null;
  }

  return entry.result;
}

function writeCache(points: DirectionsPoint[], result: RouteResult, ttlMs: number): void {
  if (routeCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = routeCache.keys().next().value;
    if (oldestKey) {
      routeCache.delete(oldestKey);
    }
  }

  routeCache.set(cacheKey(points), {
    expiresAt: Date.now() + ttlMs,
    result,
  });
}

async function fetchDayRoute(points: DirectionsPoint[]): Promise<RouteResult> {
  try {
    const apiKey = requireOpenRouteServiceApiKey();
    const response = await axios.post<OpenRouteServiceResponse>(
      `${config.openRouteService.apiUrl.replace(/\/$/, "")}/v2/directions/${config.openRouteService.profile}/geojson`,
      {
        coordinates: points.map((point) => [point.lon, point.lat]),
      },
      {
        headers: {
          Authorization: apiKey,
          "Content-Type": "application/json",
        },
        timeout: config.openRouteService.timeoutMs,
      },
    );
    const routeCoordinates = response.data.features?.[0]?.geometry?.coordinates || [];

    if (routeCoordinates.length > 0) {
      return {
        points: routeCoordinates.map(([lon, lat]) => ({ lat, lon })),
        source: "openrouteservice",
      };
    }

    return { points, source: "fallback" };
  } catch (error) {
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;
    const message = axios.isAxiosError(error)
      ? error.response?.data?.error || error.message
      : error instanceof Error
      ? error.message
      : "Unknown directions error";

    console.warn(`[directions] OpenRouteService route failed${status ? ` (${status})` : ""}: ${message}`);

    return { points, source: "fallback" };
  }
}

export const __test = {
  cacheKey,
  readCache,
  routeCache,
  writeCache,
};

import { Router } from "express";
import { config, requireOpenSkyCredentials } from "../../config.js";
import {
  airlineFromCallsign,
  diversifyFlightsByRegion,
  flightStatusFromTelemetry,
} from "../../shared/liveFlightUtils.js";
import type { LiveFlight, LiveFlightsResponse } from "../../shared/types.js";

type OpenSkyState = [
  string,
  string | null,
  string,
  number | null,
  number,
  number | null,
  number | null,
  number | null,
  boolean,
  number | null,
  number | null,
  number | null,
  unknown,
  number | null,
  string | null,
  boolean,
  number,
  number | null,
];

type OpenSkyResponse = {
  time: number;
  states?: OpenSkyState[] | null;
};

type OpenSkyTokenResponse = {
  access_token: string;
  expires_in?: number;
};

let cachedAccessToken: string | null = null;
let cachedAccessTokenExpiresAt = 0;

export const liveFlightsRoute = Router();

liveFlightsRoute.get("/", async (req, res) => {
  const bbox = parseBbox(req.query);
  const explicitLimit = parseExplicitLimit(req.query.limit);
  const sampleRatio = parseSampleRatio(req.query.samplePercent, Boolean(bbox));

  const url = new URL(`${config.openSky.apiUrl.replace(/\/$/, "")}/states/all`);
  if (bbox) {
    url.searchParams.set("lamin", String(bbox.lamin));
    url.searchParams.set("lomin", String(bbox.lomin));
    url.searchParams.set("lamax", String(bbox.lamax));
    url.searchParams.set("lomax", String(bbox.lomax));
  }

  const controller = new AbortController();
  const timeout = windowlessTimeout(() => controller.abort(), config.openSky.timeoutMs);

  try {
    const accessToken = await getOpenSkyAccessToken();
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return res.status(response.status).json({
        flights: [],
        warnings: [`OpenSky request failed with ${response.status}${detail ? `: ${detail.slice(0, 160)}` : ""}`],
        source: "opensky",
      } satisfies LiveFlightsResponse);
    }

    const data = await response.json() as OpenSkyResponse;
    const mapped = (data.states || [])
      .map(mapOpenSkyState)
      .filter((flight): flight is LiveFlight => Boolean(flight));

    const totalAvailable = mapped.length;
    const targetCount = explicitLimit ?? computeSampleSize(mapped.length, sampleRatio, Boolean(bbox));
    const flights = bbox
      ? mapped.slice(0, targetCount)
      : diversifyFlightsByRegion(mapped, targetCount);

    return res.json({
      flights,
      totalAvailable,
      samplePercent: totalAvailable > 0 ? Math.round((flights.length / totalAvailable) * 1000) / 10 : 0,
      updatedAt: new Date((data.time || Math.floor(Date.now() / 1000)) * 1000).toISOString(),
      warnings: flights.length ? [] : ["OpenSky returned no aircraft positions for this map area."],
      source: "opensky",
    } satisfies LiveFlightsResponse);
  } catch (error) {
    const message = error instanceof Error && error.name === "AbortError"
      ? "OpenSky request timed out."
      : error instanceof Error
        ? error.message
        : "OpenSky request failed.";

    return res.status(502).json({
      flights: [],
      warnings: [message],
      source: "opensky",
    } satisfies LiveFlightsResponse);
  } finally {
    clearTimeout(timeout);
  }
});

async function getOpenSkyAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedAccessToken && cachedAccessTokenExpiresAt > now) {
    return cachedAccessToken;
  }

  const { clientId, clientSecret } = requireOpenSkyCredentials();
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  });

  const controller = new AbortController();
  const timeout = windowlessTimeout(() => controller.abort(), config.openSky.timeoutMs);

  try {
    const response = await fetch(config.openSky.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body,
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`OpenSky authentication failed with ${response.status}${detail ? `: ${detail.slice(0, 160)}` : ""}`);
    }

    const data = await response.json() as OpenSkyTokenResponse;
    if (!data.access_token) {
      throw new Error("OpenSky authentication response did not include an access token.");
    }

    const expiresInSeconds = data.expires_in ?? 1800;
    cachedAccessToken = data.access_token;
    cachedAccessTokenExpiresAt = Date.now() + Math.max(60, expiresInSeconds - 30) * 1000;

    return cachedAccessToken;
  } finally {
    clearTimeout(timeout);
  }
}

function mapOpenSkyState(state: OpenSkyState): LiveFlight | null {
  const [icao24, callsign, originCountry, , lastContact, lon, lat, baroAltitude, onGround, velocity, trueTrack, verticalRate, , geoAltitude] = state;

  if (typeof lat !== "number" || typeof lon !== "number") {
    return null;
  }

  const normalizedCallsign = callsign?.trim() || icao24.toUpperCase();
  const country = originCountry?.trim() || "Unknown";
  const speedKmh = typeof velocity === "number" ? Math.round(velocity * 3.6) : undefined;
  const altitudeMeters = typeof geoAltitude === "number"
    ? Math.round(geoAltitude)
    : typeof baroAltitude === "number"
      ? Math.round(baroAltitude)
      : undefined;

  return {
    id: icao24,
    callsign: normalizedCallsign,
    airline: airlineFromCallsign(normalizedCallsign, country),
    originCountry: country,
    status: flightStatusFromTelemetry(Boolean(onGround), verticalRate),
    lat,
    lon,
    heading: typeof trueTrack === "number" ? Math.round(trueTrack) : 0,
    altitudeMeters,
    speedKmh,
    onGround: Boolean(onGround),
    lastContact: new Date(lastContact * 1000).toISOString(),
  };
}

function parseBbox(query: Record<string, unknown>): { lamin: number; lomin: number; lamax: number; lomax: number } | null {
  if (query.lamin === undefined || query.lomin === undefined || query.lamax === undefined || query.lomax === undefined) {
    return null;
  }

  const lamin = Number(query.lamin);
  const lomin = Number(query.lomin);
  const lamax = Number(query.lamax);
  const lomax = Number(query.lomax);

  if (![lamin, lomin, lamax, lomax].every(Number.isFinite)) {
    return null;
  }

  return {
    lamin: clampNumber(lamin, -90, 90),
    lomin: clampNumber(lomin, -180, 180),
    lamax: clampNumber(lamax, -90, 90),
    lomax: clampNumber(lomax, -180, 180),
  };
}

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function parseExplicitLimit(raw: unknown): number | null {
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  return clampNumber(value, 1, 2000);
}

function parseSampleRatio(raw: unknown, hasBbox: boolean): number {
  const value = Number(raw);
  if (Number.isFinite(value) && value > 0 && value <= 100) {
    return value / 100;
  }

  return hasBbox ? 0.1 : 0.05;
}

function computeSampleSize(totalAvailable: number, sampleRatio: number, hasBbox: boolean): number {
  if (totalAvailable <= 0) {
    return 0;
  }

  const minimum = hasBbox ? 50 : 100;
  return Math.min(totalAvailable, Math.max(minimum, Math.ceil(totalAvailable * sampleRatio)));
}

function windowlessTimeout(callback: () => void, timeoutMs: number): ReturnType<typeof setTimeout> {
  return setTimeout(callback, timeoutMs);
}

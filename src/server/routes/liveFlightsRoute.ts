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

const SERVERLESS_AUTH_TIMEOUT_MS = 2500;
const SERVERLESS_DATA_TIMEOUT_MS = 8500;
const WORLD_SAMPLE_BBOXES = [
  { lamin: 35, lomin: -12, lamax: 62, lomax: 35 },
  { lamin: 24, lomin: -130, lamax: 55, lomax: -60 },
  { lamin: -10, lomin: 70, lamax: 55, lomax: 145 },
] as const;

liveFlightsRoute.get("/", async (req, res) => {
  const bbox = parseBbox(req.query);
  const explicitLimit = parseExplicitLimit(req.query.limit);
  const sampleRatio = parseSampleRatio(req.query.samplePercent, Boolean(bbox));

  const urls = bbox
    ? [buildOpenSkyStatesUrl(bbox)]
    : WORLD_SAMPLE_BBOXES.map((sampleBbox) => buildOpenSkyStatesUrl(sampleBbox));

  try {
    const authWarnings: string[] = [];
    const accessToken = config.openSky.useAuth
      ? await getOpenSkyAccessToken().catch((error) => {
        authWarnings.push(openSkyAuthWarning(error));
        return null;
      })
      : null;
    const headers: Record<string, string> = {
      Accept: "application/json",
    };

    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    const { data, warnings: requestWarnings } = await fetchOpenSkyStateGroups(urls, openSkyUpstreamHeaders(headers));
    const allStates = data.flatMap((response) => response.states || []);
    const latestTime = data.reduce((latest, response) => Math.max(latest, response.time || 0), 0);
    const mapped = dedupeOpenSkyStates(allStates)
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
      updatedAt: new Date((latestTime || Math.floor(Date.now() / 1000)) * 1000).toISOString(),
      warnings: flights.length
        ? [...authWarnings, ...requestWarnings]
        : [...authWarnings, ...requestWarnings, "OpenSky returned no aircraft positions for this map area."],
      source: "opensky",
    } satisfies LiveFlightsResponse);
  } catch (error) {
    const message = error instanceof Error && error.name === "AbortError"
      ? "OpenSky request timed out."
      : error instanceof Error
        ? error.message
        : "OpenSky request failed.";

    return res.json({
      flights: [],
      totalAvailable: 0,
      samplePercent: 0,
      updatedAt: new Date().toISOString(),
      warnings: [message],
      source: "opensky",
    } satisfies LiveFlightsResponse);
  }
});

function openSkyApiBaseUrl(): string {
  const base = config.openSky.apiUrl.replace(/\/$/, "");
  return base.endsWith("/api") ? base : `${base}/api`;
}

function buildOpenSkyStatesUrl(bbox: { lamin: number; lomin: number; lamax: number; lomax: number }): URL {
  const url = new URL(`${openSkyApiBaseUrl()}/states/all`);
  url.searchParams.set("lamin", String(bbox.lamin));
  url.searchParams.set("lomin", String(bbox.lomin));
  url.searchParams.set("lamax", String(bbox.lamax));
  url.searchParams.set("lomax", String(bbox.lomax));

  return url;
}

async function fetchOpenSkyStateGroups(
  urls: URL[],
  headers: Record<string, string>,
): Promise<{ data: OpenSkyResponse[]; warnings: string[] }> {
  const settled = await Promise.allSettled(urls.map((url) => fetchOpenSkyStates(url, headers)));
  const data: OpenSkyResponse[] = [];
  const warnings: string[] = [];

  for (const result of settled) {
    if (result.status === "fulfilled") {
      data.push(result.value);
    } else {
      warnings.push(result.reason instanceof Error ? result.reason.message : "One OpenSky region request failed.");
    }
  }

  if (!data.length) {
    throw new Error(warnings[0] || "OpenSky request timed out.");
  }

  return { data, warnings };
}

async function fetchOpenSkyStates(url: URL, headers: Record<string, string>): Promise<OpenSkyResponse> {
  const controller = new AbortController();
  const timeout = windowlessTimeout(() => controller.abort(), openSkyDataTimeoutMs());

  try {
    const response = await fetch(url, {
      headers,
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`OpenSky request failed with ${response.status}${detail ? `: ${detail.slice(0, 160)}` : ""}`);
    }

    return await response.json() as OpenSkyResponse;
  } finally {
    clearTimeout(timeout);
  }
}

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
  const timeout = windowlessTimeout(() => controller.abort(), openSkyAuthTimeoutMs());

  try {
    const response = await fetch(config.openSky.tokenUrl, {
      method: "POST",
      headers: openSkyUpstreamHeaders({
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      }),
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

function openSkyUpstreamHeaders(headers: Record<string, string>): Record<string, string> {
  if (!config.openSky.proxySecret) {
    return headers;
  }

  return {
    ...headers,
    "x-proxy-secret": config.openSky.proxySecret,
  };
}

function openSkyAuthWarning(error: unknown): string {
  if (error instanceof Error && error.name === "AbortError") {
    return "OpenSky authentication timed out, so live flights were loaded anonymously.";
  }

  if (error instanceof Error) {
    return `OpenSky authentication failed, so live flights were loaded anonymously: ${error.message}`;
  }

  return "OpenSky authentication failed, so live flights were loaded anonymously.";
}

function openSkyAuthTimeoutMs(): number {
  return Math.min(config.openSky.authTimeoutMs, SERVERLESS_AUTH_TIMEOUT_MS);
}

function openSkyDataTimeoutMs(): number {
  return Math.min(config.openSky.timeoutMs, SERVERLESS_DATA_TIMEOUT_MS);
}

function dedupeOpenSkyStates(states: OpenSkyState[]): OpenSkyState[] {
  const seen = new Set<string>();
  return states.filter((state) => {
    const id = state[0];
    if (seen.has(id)) {
      return false;
    }

    seen.add(id);
    return true;
  });
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

export const __test = {
  openSkyApiBaseUrl,
  buildOpenSkyStatesUrl,
  computeSampleSize,
  dedupeOpenSkyStates,
  mapOpenSkyState,
  openSkyAuthWarning,
  openSkyUpstreamHeaders,
  parseBbox,
  parseExplicitLimit,
  parseSampleRatio,
};

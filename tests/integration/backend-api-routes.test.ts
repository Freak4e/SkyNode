import test from "node:test";
import assert from "node:assert/strict";
import axios from "axios";
import { createApp } from "../../src/server/app.js";
import { config } from "../../src/config.js";
import { __test as directionsTest } from "../../src/server/modules/directions/directionsRoute.js";
import { readJsonFixture } from "./fixtures.js";
import { request } from "./testHttp.js";

const originalAxiosGet = axios.get;
const originalAxiosPost = axios.post;
const originalFetch = globalThis.fetch;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

test.afterEach(() => {
  axios.get = originalAxiosGet;
  axios.post = originalAxiosPost;
  globalThis.fetch = originalFetch;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
  directionsTest.routeCache.clear();
});

// Verifies place search remains usable when the autocomplete provider is unavailable.
test("GET /api/places returns deterministic fallback places when provider fails", async () => {
  axios.get = async () => {
    throw new Error("network unavailable");
  };

  const response = await request(createApp(), "/api/places?term=skopje");

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    places: [
      { code: "SKP", name: "Skopje", cityName: "Skopje", countryName: "North Macedonia", type: "city" },
    ],
  });
});

// Verifies attractions route validates input and can operate without a Geoapify key.
test("GET /api/attractions validates required destination and returns fallback attractions without API key", async () => {
  const previousKey = config.geoapify.apiKey;
  config.geoapify.apiKey = undefined;

  try {
    const missing = await request(createApp(), "/api/attractions");
    assert.equal(missing.status, 400);
    assert.deepEqual(missing.body, { attractions: [], warnings: ["Missing destination query parameter."] });

    const response = await request(createApp(), "/api/attractions?destination=Skopje");
    assert.equal(response.status, 200);
    assert.deepEqual(response.body, {
      attractions: [
        { id: "mock-old-town", name: "Skopje Old Town", category: "historic", address: "Skopje", source: "mock" },
        { id: "mock-market", name: "Skopje Central Market", category: "food", address: "Skopje", source: "mock" },
        { id: "mock-viewpoint", name: "Skopje Viewpoint", category: "nature", address: "Skopje", source: "mock" },
      ],
      warnings: [],
    });
  } finally {
    config.geoapify.apiKey = previousKey;
  }
});

// Verifies city search maps provider payloads and removes duplicate city/country results.
test("GET /api/geocode/cities maps Geoapify city results and deduplicates names", async () => {
  const previousKey = config.geoapify.apiKey;
  config.geoapify.apiKey = "test-key";
  axios.get = (async () => ({ data: readJsonFixture("maps/geoapify-geocode.json") })) as typeof axios.get;

  try {
    const short = await request(createApp(), "/api/geocode/cities?term=p");
    assert.deepEqual(short.body, { cities: [] });

    const response = await request(createApp(), "/api/geocode/cities?term=par");
    assert.equal(response.status, 200);
    assert.deepEqual(response.body, {
      cities: [
        { name: "Paris", countryName: "France", address: "Paris, France", lat: 48.8566, lon: 2.3522 },
        { name: "Paris", countryName: "United States", address: "Paris, TX", lat: 33.66, lon: -95.55 },
      ],
    });
  } finally {
    config.geoapify.apiKey = previousKey;
  }
});

// Verifies directions route handles short days, provider geometry, and provider failures.
test("POST /api/directions returns none, provider routes, and fallback routes", async () => {
  const previousKey = config.openRouteService.apiKey;
  config.openRouteService.apiKey = "ors-key";
  console.warn = () => undefined;

  axios.post = (async () => ({ data: readJsonFixture("maps/openrouteservice-route.json") })) as typeof axios.post;

  try {
    const providerResponse = await request(createApp(), "/api/directions", {
      method: "POST",
      body: {
        days: [
          { dayNumber: 1, points: [{ lat: 41.99, lon: 21.43 }] },
          { dayNumber: 2, points: [{ lat: 41.99, lon: 21.43 }, { lat: 42, lon: 21.44 }] },
        ],
      },
    });

    assert.equal(providerResponse.status, 200);
    assert.deepEqual(providerResponse.body, {
      routes: [
        { dayNumber: 1, points: [{ lat: 41.99, lon: 21.43 }], source: "none" },
        { dayNumber: 2, points: [{ lat: 41.99, lon: 21.43 }, { lat: 42, lon: 21.44 }], source: "openrouteservice" },
      ],
    });

    directionsTest.routeCache.clear();
    axios.post = async () => {
      throw new Error("provider down");
    };

    const fallbackResponse = await request(createApp(), "/api/directions", {
      method: "POST",
      body: {
        days: [{ dayNumber: 3, points: [{ lat: 1, lon: 2 }, { lat: 3, lon: 4 }] }],
      },
    });

    assert.deepEqual(fallbackResponse.body, {
      routes: [{ dayNumber: 3, points: [{ lat: 1, lon: 2 }, { lat: 3, lon: 4 }], source: "fallback" }],
    });
  } finally {
    config.openRouteService.apiKey = previousKey;
  }
});

// Verifies live-flight API maps mocked OpenSky telemetry into the public response contract.
test("GET /api/live-flights maps OpenSky states with mocked fetch", async () => {
  globalThis.fetch = async (input) => {
    const url = String(input);
    assert.match(url, /states\/all/);

    return new Response(JSON.stringify(readJsonFixture("live-flights/opensky-states.json")), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  const response = await request(createApp(), "/api/live-flights?lamin=40&lomin=10&lamax=55&lomax=20&limit=1");

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    flights: [{
      id: "abc123",
      callsign: "DLH123",
      airline: "Lufthansa",
      originCountry: "Germany",
      status: "Climbing",
      lat: 52.5,
      lon: 13.4,
      heading: 270,
      altitudeMeters: 10200,
      speedKmh: 900,
      onGround: false,
      lastContact: "2027-01-15T08:00:00.000Z",
    }],
    totalAvailable: 1,
    samplePercent: 100,
    updatedAt: "2027-01-15T08:00:00.000Z",
    warnings: [],
    source: "opensky",
  });
});

// Verifies itinerary generation rejects invalid body data before external calls are attempted.
test("POST /api/itineraries/generate validates request body before provider calls", async () => {
  const response = await request(createApp(), "/api/itineraries/generate", {
    method: "POST",
    body: {
      destinationCode: "SKP",
      destinationName: "",
      startDate: "2026-07-01",
      days: 2,
      budget: "medium",
      pace: "balanced",
      interests: [],
    },
  });

  assert.equal(response.status, 400);
  assert.deepEqual(response.body, {
    itinerary: null,
    warnings: ["Destination is required."],
  });
});

// Verifies chat route exposes a stable error response for invalid user input.
test("POST /api/chat rejects empty messages through the route contract", async () => {
  console.error = () => undefined;

  const response = await request(createApp(), "/api/chat", {
    method: "POST",
    body: { message: " " },
  });

  assert.equal(response.status, 502);
  assert.deepEqual(response.body, {
    message: "",
    mode: "general",
    warnings: ["Message is required."],
  });
});

// Verifies protected API modules share the same missing-auth response contract.
test("authenticated API routes reject missing bearer tokens consistently", async () => {
  const cases = [
    ["/api/liked-flights", "GET"],
    ["/api/travel-missions/unlocks", "GET"],
    ["/api/notifications/unread", "GET"],
    ["/api/account", "DELETE"],
    ["/api/trips", "GET"],
    ["/api/trips/joined", "GET"],
  ] as const;

  for (const [path, method] of cases) {
    const response = await request(createApp(), path, { method });
    assert.equal(response.status, 401, `${method} ${path}`);
    assert.deepEqual(response.body, { warnings: ["Sign in to continue."] });
  }
});

// Verifies the legacy flight-search helper path preserves query parameters during redirect.
test("legacy /test-flight-search redirects to /api/flights with original query params", async () => {
  const response = await request(createApp(), "/test-flight-search?from=SKP&to=JFK&date=2026-07-01");

  assert.equal(response.status, 307);
  assert.equal(response.headers.location, "/api/flights?from=SKP&to=JFK&date=2026-07-01");
});

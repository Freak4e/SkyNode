import http from "node:http";
import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { createApp } from "../../src/server/app.js";
import { config, requireDatabaseUrl, requireGeoapifyApiKey, requireOpenRouteServiceApiKey } from "../../src/config.js";
import { __test as liveRoute } from "../../src/server/routes/liveFlightsRoute.js";
import { __test as missionValidation } from "../../src/server/modules/travel-missions/huggingFaceMissionValidator.js";
import { flightsRoute } from "../../src/server/routes/flightsRoute.js";

// Verifies API responses are not cached and unknown API paths return a consistent JSON error.
test("app applies no-store API headers and returns API 404 JSON", async () => {
  const response = await request(createApp(), "/api/not-found");

  assert.equal(response.status, 404);
  assert.equal(response.headers["cache-control"], "no-store, no-cache, must-revalidate, proxy-revalidate");
  assert.deepEqual(response.body, { error: "Not found" });
});

// Verifies flight searches reject incomplete requests before calling paid or remote providers.
test("flights route rejects missing required query parameters before provider calls", async () => {
  const app = express();
  app.use("/api/flights", flightsRoute);

  const response = await request(app, "/api/flights?from=SKP");

  assert.equal(response.status, 400);
  assert.deepEqual(response.body, {
    offers: [],
    warnings: ["Missing required query params: from, to, date."],
    source: "none",
  });
});

// Verifies live-flight query parsing and OpenSky state mapping stay safe for route use.
test("live flights route helpers clamp query input and map OpenSky states", () => {
  assert.deepEqual(liveRoute.parseBbox({ lamin: "-95", lomin: "-200", lamax: "95", lomax: "200" }), {
    lamin: -90,
    lomin: -180,
    lamax: 90,
    lomax: 180,
  });
  assert.equal(liveRoute.parseExplicitLimit("3000"), 2000);
  assert.equal(liveRoute.parseExplicitLimit("bad"), null);
  assert.equal(liveRoute.parseSampleRatio("25", false), 0.25);
  assert.equal(liveRoute.parseSampleRatio("bad", true), 0.1);
  assert.equal(liveRoute.computeSampleSize(1000, 0.05, false), 100);
  assert.match(String(liveRoute.buildOpenSkyStatesUrl({ lamin: 1, lomin: 2, lamax: 3, lomax: 4 })), /states\/all/);

  const state = [
    "abc123",
    "DLH123 ",
    "Germany",
    null,
    1_800_000_000,
    13.4,
    52.5,
    10000,
    false,
    250,
    270,
    2,
    null,
    10200,
    null,
    false,
    0,
    null,
  ] as Parameters<typeof liveRoute.mapOpenSkyState>[0];

  const mapped = liveRoute.mapOpenSkyState(state);
  assert.equal(mapped?.id, "abc123");
  assert.equal(mapped?.airline, "Lufthansa");
  assert.equal(mapped?.status, "Climbing");
  assert.equal(liveRoute.dedupeOpenSkyStates([state, state]).length, 1);
  assert.match(liveRoute.openSkyAuthWarning(new Error("bad credentials")), /failed/);
});

// Verifies mission validation cannot accept incomplete or low-confidence model responses.
test("mission validation clamps confidence and enforces strict acceptance rules", () => {
  assert.deepEqual(missionValidation.parseValidationJson("prefix {\"accepted\":true,\"confidence\":0.9} suffix"), {
    accepted: true,
    confidence: 0.9,
  });
  assert.equal(missionValidation.clamp(2, 0, 1), 1);
  assert.equal(missionValidation.clamp(Number.NaN, 0, 1), 0);

  const accepted = missionValidation.normalizeValidation({
    accepted: true,
    confidence: 0.9,
    countryMatched: true,
    faceDetected: true,
    landmarkDetected: true,
    gestureDetected: true,
    issues: ["ignored"],
  });
  assert.equal(accepted.accepted, true);
  assert.deepEqual(accepted.issues, []);
  assert.equal(accepted.summary, "Mission verified.");

  const rejected = missionValidation.normalizeValidation({
    accepted: true,
    confidence: 0.6,
    countryMatched: true,
    faceDetected: true,
    landmarkDetected: true,
    gestureDetected: true,
  });
  assert.equal(rejected.accepted, false);
  assert.ok(rejected.issues.length > 0);
});

// Verifies missing server configuration produces actionable errors instead of silent failures.
test("required config helpers throw useful errors when required values are absent", () => {
  const oldDatabaseUrl = config.database.url;
  const oldGeoapifyKey = config.geoapify.apiKey;
  const oldOpenRouteServiceKey = config.openRouteService.apiKey;

  try {
    config.database.url = undefined;
    config.geoapify.apiKey = undefined;
    config.openRouteService.apiKey = undefined;

    assert.throws(() => requireDatabaseUrl(), /DATABASE_URL/);
    assert.throws(() => requireGeoapifyApiKey(), /GEOAPIFY_API_KEY/);
    assert.throws(() => requireOpenRouteServiceApiKey(), /OPENROUTESERVICE_API_KEY/);
  } finally {
    config.database.url = oldDatabaseUrl;
    config.geoapify.apiKey = oldGeoapifyKey;
    config.openRouteService.apiKey = oldOpenRouteServiceKey;
  }
});

function request(app: express.Express, path: string): Promise<{
  status: number;
  headers: http.IncomingHttpHeaders;
  body: unknown;
}> {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("Unable to bind test server."));
        return;
      }

      http.get({ host: "127.0.0.1", port: address.port, path }, (response) => {
        let raw = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          raw += chunk;
        });
        response.on("end", () => {
          server.close();
          resolve({
            status: response.statusCode || 0,
            headers: response.headers,
            body: raw ? JSON.parse(raw) : null,
          });
        });
      }).on("error", (error) => {
        server.close();
        reject(error);
      });
    });
  });
}

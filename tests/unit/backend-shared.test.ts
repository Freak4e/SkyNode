import test from "node:test";
import assert from "node:assert/strict";
import {
  estimateDurationMinutes,
  parseClockMinutes,
  parseDurationMinutes,
  parseRouteFromKayakUrl,
  parseStopsCount,
  resolveStopsCount,
} from "../../src/shared/flightParsing.js";
import {
  airlineFromCallsign,
  diversifyFlightsByRegion,
  flightStatusFromTelemetry,
  formatAltitude,
  formatHeading,
  formatSpeed,
} from "../../src/shared/liveFlightUtils.js";
import type { LiveFlight } from "../../src/shared/types.js";

// Verifies shared flight parsers handle common provider formats and malformed inputs.
test("flight parsing normalizes clock times, durations, stops, and Kayak routes", () => {
  assert.equal(parseClockMinutes("3:45 PM"), 15 * 60 + 45);
  assert.equal(parseClockMinutes("12:10 AM +1"), 24 * 60 + 10);
  assert.equal(parseClockMinutes("bad"), null);

  assert.equal(parseDurationMinutes("8h15m"), 495);
  assert.equal(parseDurationMinutes("45 minutes"), 45);
  assert.equal(parseDurationMinutes("0h 0m"), null);

  assert.equal(parseStopsCount("non-stop"), 0);
  assert.equal(parseStopsCount("2 stops via FRA"), 2);
  assert.equal(parseStopsCount("through Vienna"), 1);

  assert.deepEqual(parseRouteFromKayakUrl("https://www.kayak.com/flights/skp-jfk/2026-07-01"), {
    from: "SKP",
    to: "JFK",
  });
});

// Verifies duration estimation chooses explicit data first and falls back predictably.
test("flight parsing estimates durations from best available signal", () => {
  assert.equal(estimateDurationMinutes({ durationMinutes: 160 }), 160);
  assert.equal(estimateDurationMinutes({ durationText: "2h 30m" }), 150);
  assert.equal(estimateDurationMinutes({ departureTime: "23:30", arrivalTime: "01:00" }), 90);
  assert.equal(estimateDurationMinutes({ stopsCount: 2 }), 330);
  assert.equal(resolveStopsCount({ segments: [{}, {}, {}], stopsText: "direct" }), 2);
  assert.equal(resolveStopsCount({ layovers: [{}], stopsText: "2 stops" }), 2);
});

// Verifies live-flight display helpers produce readable labels and geographically mixed samples.
test("live flight helpers map telemetry and diversify regional samples", () => {
  assert.equal(airlineFromCallsign("DLH123", "Germany"), "Lufthansa");
  assert.equal(airlineFromCallsign("XYZ123", "Testland"), "XYZ");
  assert.equal(airlineFromCallsign("12", "Testland"), "Testland operator");

  assert.equal(flightStatusFromTelemetry(true, 10), "On ground");
  assert.equal(flightStatusFromTelemetry(false, 3), "Climbing");
  assert.equal(flightStatusFromTelemetry(false, -3), "Descending");
  assert.equal(flightStatusFromTelemetry(false, 0), "Cruising");

  assert.match(formatAltitude(1000), /1[,.]000 m/);
  assert.equal(formatSpeed(890), "890 km/h");
  assert.match(formatHeading(270), /^270.?$/);

  const flights = [
    makeLiveFlight("a", 0, 0),
    makeLiveFlight("b", 1, 1),
    makeLiveFlight("c", 30, 30),
    makeLiveFlight("d", 31, 31),
  ];

  assert.deepEqual(diversifyFlightsByRegion(flights, 3).map((flight) => flight.id), ["a", "c", "b"]);
});

function makeLiveFlight(id: string, lat: number, lon: number): LiveFlight {
  return {
    id,
    callsign: id,
    airline: "Test Air",
    originCountry: "Testland",
    status: "Cruising",
    lat,
    lon,
    heading: 0,
  };
}

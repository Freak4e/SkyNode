import test from "node:test";
import assert from "node:assert/strict";
import { __test as geoapify } from "../../src/server/modules/attractions/geoapifyProvider.js";
import { __test as geocoding } from "../../src/server/modules/geocoding/geocodingRoute.js";
import { __test as directions } from "../../src/server/modules/directions/directionsRoute.js";
import { __test as places } from "../../src/places.js";
import { __test as travelpayouts } from "../../src/travelpayouts.js";

// Verifies Geoapify provider data is converted into stable attraction objects and fallbacks.
test("geoapify helpers normalize attractions, categories, and fallback attractions", () => {
  assert.equal(geoapify.cleanCategory(["tourism.sights.memorial"]), "memorial");
  assert.equal(geoapify.cleanCategory(["catering.restaurant"]), "restaurant");

  assert.deepEqual(geoapify.normalizeAttraction({
    properties: {
      place_id: "p1",
      name: "Museum",
      formatted: "Main Street",
      categories: ["entertainment.museum"],
      lat: 41,
      lon: 21,
    },
  }, 0), {
    id: "p1",
    name: "Museum",
    category: "museum",
    address: "Main Street",
    lat: 41,
    lon: 21,
    source: "geoapify",
  });

  assert.equal(geoapify.normalizeAttraction({ properties: { formatted: "No name" } }, 0), null);
  assert.deepEqual(geoapify.fallbackAttractions("Skopje").map((item) => item.source), ["mock", "mock", "mock"]);
});

// Verifies geocoding query construction and distance math used for itinerary map validation.
test("geocoding helpers build bounded queries and calculate nearest boundaries", () => {
  const item = { id: "i1", title: "Museum", attractionName: "Archaeological Museum" };

  assert.deepEqual(geocoding.buildGeocodeQueries(item, "Skopje", ["Ohrid"], false), [
    "Archaeological Museum, Skopje",
  ]);
  assert.deepEqual(geocoding.buildGeocodeQueries(item, "Skopje", ["Ohrid", "Ohrid", " "], true), [
    "Archaeological Museum, Ohrid",
    "Archaeological Museum, Skopje",
    "Archaeological Museum",
  ]);
  assert.equal(Math.round(geocoding.distanceMeters({ lat: 0, lon: 0 }, { lat: 0, lon: 1 }) / 1000), 111);
  assert.equal(geocoding.nearestBoundary({ lat: 0, lon: 0.1 }, [
    { city: "Far", point: { lat: 5, lon: 5 } },
    { city: "Near", point: { lat: 0, lon: 0 } },
  ])?.city, "Near");
});

// Verifies route cache keys are stable for close coordinates and expired entries are ignored.
test("directions cache rounds coordinates and expires entries", () => {
  directions.routeCache.clear();

  const points = [{ lat: 41.123456, lon: 21.654321 }, { lat: 42.987654, lon: 22.111111 }];
  const roundedSame = [{ lat: 41.123459, lon: 21.654324 }, { lat: 42.987651, lon: 22.111114 }];
  const result = { points, source: "fallback" as const };

  assert.equal(directions.cacheKey(points), directions.cacheKey(roundedSame));
  directions.writeCache(points, result, 1000);
  assert.deepEqual(directions.readCache(roundedSame), result);

  directions.writeCache(points, result, -1);
  assert.equal(directions.readCache(points), null);
});

// Verifies external place and fare payloads are normalized into app-facing data contracts.
test("places and travelpayouts helpers normalize provider payloads", () => {
  assert.deepEqual(places.normalizePlace({
    code: "jfk",
    name: "John F. Kennedy",
    city_name: "New York",
    country_name: "United States",
    type: "airport",
    coordinates: { lat: 40.64, lon: -73.78 },
  }), {
    code: "JFK",
    name: "John F. Kennedy",
    cityName: "New York",
    countryName: "United States",
    type: "airport",
    cityCode: undefined,
    countryCode: undefined,
    mainAirportName: undefined,
    coordinates: { lat: 40.64, lon: -73.78 },
  });
  assert.equal(places.normalizePlace({ code: "BAD" }), null);
  assert.equal(places.searchFallbackPlaces("new york")[0].code, "JFK");

  assert.match(travelpayouts.formatPrice(125, "USD"), /\$125/);
  assert.equal(travelpayouts.formatCarrier({ airline: "W6", flight_number: 123 }), "W6 123");
  assert.match(travelpayouts.buildSearchLink("SKP", "JFK", "2026-07-01T00:00:00Z"), /depart_date=2026-07-01/);
  assert.equal(travelpayouts.normalizeCheapPrices({
    JFK: {
      "0": {
        price: 450,
        airline: "AA",
        flight_number: "100",
        departure_at: "2026-07-01T10:00:00Z",
      },
    },
  }, "SKP", "JFK", "USD")[0].carrier, "AA 100");
});

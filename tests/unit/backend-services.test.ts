import test from "node:test";
import assert from "node:assert/strict";
import { __test as flightSearch } from "../../src/server/services/flightSearchService.js";
import { __test as flightCache } from "../../src/server/infrastructure/cache/flightSearchCache.js";
import { __test as scrapingBee } from "../../src/server/providers/scrapingBeeProvider.js";
import type { FlightOffer, FlightSearchResponse } from "../../src/shared/types.js";

// Verifies flight-search input cleanup provides safe defaults for provider and currency options.
test("flight search service normalizes inputs and supported options", () => {
  assert.deepEqual(flightSearch.normalizeCodes(" skp, jfk,SKP "), ["SKP", "JFK"]);
  assert.deepEqual(flightSearch.normalizeCodes(["skp", " jfk ", "skp"]), ["SKP", "JFK"]);
  assert.equal(flightSearch.normalizeProvider("auto"), "auto");
  assert.equal(flightSearch.normalizeProvider("unknown" as never), "scrapingbee");
  assert.equal(flightSearch.normalizeCurrency("EUR"), "EUR");
  assert.equal(flightSearch.normalizeCurrency("BAD" as never), "USD");

  assert.deepEqual(flightSearch.normalizeInput({
    from: " skp ",
    to: " jfk ",
    date: " 2026-07-01 ",
    provider: "bad" as never,
    currency: "bad" as never,
  }), {
    from: "SKP",
    to: "JFK",
    date: "2026-07-01",
    provider: "scrapingbee",
    currency: "USD",
  });
});

// Verifies flight offers keep searched route metadata and duplicate offers collapse predictably.
test("flight search service tags, deduplicates, and sorts price text deterministically", () => {
  const offer = makeOffer({ carrier: "AA", priceText: "$1,250" });
  const duplicate = { ...offer };
  const cheaper = makeOffer({ carrier: "LH", priceText: "$800", bookingLink: "https://example.test/lh" });

  assert.equal(flightSearch.priceNumber("$1,250"), 1250);
  assert.equal(flightSearch.priceNumber("Price unavailable"), Number.MAX_SAFE_INTEGER);
  assert.deepEqual(flightSearch.dedupeOffers([offer, duplicate, cheaper]), [offer, cheaper]);

  const tagged = flightSearch.tagSearchRoute(
    { offers: [offer], warnings: [], source: "scrapingbee" } satisfies FlightSearchResponse,
    "SKP",
    "JFK",
  );

  assert.equal(tagged.offers[0].searchFrom, "SKP");
  assert.equal(tagged.offers[0].searchTo, "JFK");
});

// Verifies cache keys are route/date stable and cache timestamps serialize consistently.
test("flight cache creates stable normalized keys and serializes dates", () => {
  const first = flightCache.cacheKey({ provider: "scrapingbee", from: " skp ", to: "jfk", date: "2026-07-01" });
  const second = flightCache.cacheKey({ provider: "scrapingbee", from: "SKP", to: " JFK ", date: "2026-07-01" });

  assert.equal(first, second);
  assert.equal(first.length, 64);
  assert.equal(flightCache.toIsoString(new Date("2026-01-02T03:04:05.000Z")), "2026-01-02T03:04:05.000Z");
  assert.equal(flightCache.toIsoString("2026-01-02T03:04:05.000Z"), "2026-01-02T03:04:05.000Z");
});

// Verifies ScrapingBee normalization avoids fragile session links and gives useful empty-result warnings.
test("scrapingbee provider rewrites session booking links and explains empty extraction", () => {
  const normalized = scrapingBee.normalizeOffer(makeOffer({ bookingLink: "https://kayak.test/book/session" }), "https://kayak.test/search");

  assert.equal(normalized.bookingLink, "https://kayak.test/search");
  assert.equal(normalized.source, "scrapingbee");
  assert.match(scrapingBee.buildNoOffersWarning("<html>Loading results</html>"), /Increase SCRAPINGBEE_WAIT_MS/);
  assert.match(scrapingBee.buildNoOffersWarning("<html>No cards</html>"), /No flight offers extracted/);
});

function makeOffer(overrides: Partial<FlightOffer> = {}): FlightOffer {
  return {
    departureTime: "09:00",
    arrivalTime: "11:00",
    priceText: "$500",
    carrier: "Test Air",
    stopsText: "Direct",
    bookingLink: "https://example.test/book",
    ...overrides,
  };
}

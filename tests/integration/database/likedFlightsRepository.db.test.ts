import test from "node:test";
import assert from "node:assert/strict";
import {
  deleteLikedFlight,
  listLikedFlights,
  saveLikedFlight,
} from "../../../src/server/modules/flights/likedFlightsRepository.js";
import { cleanTestDatabase, hasTestDatabase, testDatabaseSkipReason } from "./setupTestDatabase.js";
import { makeFlightOffer, testUserId } from "./fixtures.js";

test.beforeEach(cleanTestDatabase);

// Verifies liked-flight repository behavior against real tables, uniqueness, and deletes.
test("liked flights persist, dedupe by fingerprint, list by user, and delete", {
  skip: hasTestDatabase ? false : testDatabaseSkipReason,
}, async () => {
  const request = {
    outbound: makeFlightOffer(),
    tripType: "one-way" as const,
    departureDate: "2026-07-01",
    totalPriceText: "$240",
  };

  const saved = await saveLikedFlight(testUserId, request);
  const duplicate = await saveLikedFlight(testUserId, request);
  const listed = await listLikedFlights(testUserId);

  assert.equal(saved.id, duplicate.id);
  assert.equal(listed.length, 1);
  assert.equal(listed[0].outbound.carrier, "Fixture Air");
  assert.equal(listed[0].tripType, "one-way");

  assert.equal(await deleteLikedFlight(testUserId, saved.id), true);
  assert.equal(await deleteLikedFlight(testUserId, saved.id), false);
  assert.deepEqual(await listLikedFlights(testUserId), []);
});

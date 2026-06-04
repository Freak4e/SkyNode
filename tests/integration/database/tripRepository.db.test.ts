import test from "node:test";
import assert from "node:assert/strict";
import {
  applyTripChangeProposal,
  deleteTripById,
  getTripById,
  listDiscoverableTrips,
  listTrips,
  saveTripDraft,
} from "../../../src/server/modules/trips/tripRepository.js";
import { cleanTestDatabase, hasTestDatabase, testDatabaseSkipReason } from "./setupTestDatabase.js";
import { makeSaveTripRequest, otherUserId, testUserId } from "./fixtures.js";

test.beforeEach(cleanTestDatabase);

// Verifies trip persistence stores itinerary content and supports discovery, updates, and deletion.
test("trips persist full itinerary content, public discovery metadata, proposal updates, and deletion", {
  skip: hasTestDatabase ? false : testDatabaseSkipReason,
}, async () => {
  const saved = await saveTripDraft(makeSaveTripRequest(), testUserId);
  const listed = await listTrips(testUserId);

  assert.equal(listed.length, 1);
  assert.equal(listed[0].id, saved.tripId);
  assert.equal(listed[0].title, "Skopje Test Trip");
  assert.equal(listed[0].memberCount, 1);
  assert.equal(listed[0].ownerName, "Test Traveler");
  assert.ok(listed[0].inviteToken);

  const detail = await getTripById(saved.tripId, testUserId);
  assert.equal(detail?.itinerary.days.length, 1);
  assert.equal(detail?.itinerary.days[0].items.length, 2);
  assert.equal(detail?.itinerary.attractions[0].name, "Old Bazaar");
  assert.equal(detail?.access?.isOwner, true);

  const publicTrips = await listDiscoverableTrips({ destination: "Skopje", includePast: true }, otherUserId);
  assert.equal(publicTrips.length, 1);
  assert.equal(publicTrips[0].access?.canViewItinerary, false);

  const updated = await applyTripChangeProposal(saved.tripId, {
    summary: "Make the day cheaper.",
    itinerary: {
      destinationName: "Skopje",
      startDate: "2026-07-01",
      attractions: [],
      estimatedTotalCost: 10,
      generationMode: "gemini",
      days: [
        {
          dayNumber: 1,
          title: "Budget walk",
          summary: "Mostly free activities.",
          estimatedCost: 10,
          items: [
            {
              timeOfDay: "09:00",
              title: "Free walk",
              description: "Self-guided walk.",
              attractionName: "Old Bazaar",
              estimatedCost: 0,
            },
          ],
        },
      ],
    },
  }, testUserId);

  assert.equal(updated?.estimatedTotalCost, 10);
  assert.equal(updated?.itinerary.days[0].title, "Budget walk");
  assert.equal(updated?.itinerary.days[0].items.length, 1);

  assert.equal(await deleteTripById(saved.tripId, otherUserId), false);
  assert.equal(await deleteTripById(saved.tripId, testUserId), true);
  assert.equal(await getTripById(saved.tripId, testUserId), null);
});

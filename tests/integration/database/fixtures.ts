import type { FlightOffer, SaveTripRequest } from "../../../src/shared/types.js";

export const testUserId = "00000000-0000-4000-8000-000000000001";
export const otherUserId = "00000000-0000-4000-8000-000000000002";
export const referenceId = "00000000-0000-4000-8000-000000000010";

export function makeFlightOffer(overrides: Partial<FlightOffer> = {}): FlightOffer {
  return {
    departureTime: "09:00",
    arrivalTime: "11:35",
    priceText: "$240",
    carrier: "Fixture Air",
    stopsText: "Direct",
    durationText: "2h 35m",
    bookingLink: "https://example.test/flights/skp-jfk",
    source: "travelpayouts",
    ...overrides,
  };
}

export function makeSaveTripRequest(overrides: Partial<SaveTripRequest> = {}): SaveTripRequest {
  return {
    title: "Skopje Test Trip",
    originCode: "JFK",
    destinationCode: "SKP",
    destinationName: "Skopje",
    startDate: "2026-07-01",
    days: 1,
    budget: "medium",
    pace: "balanced",
    interests: ["history", "food"],
    visibility: "public",
    description: "Integration test trip",
    maxMembers: 6,
    ownerProfile: {
      displayName: "Test Traveler",
      avatarUrl: "https://example.test/avatar.png",
    },
    itinerary: {
      destinationName: "Skopje",
      startDate: "2026-07-01",
      estimatedTotalCost: 35,
      generationMode: "gemini",
      attractions: [
        {
          id: "old-bazaar",
          name: "Old Bazaar",
          category: "historic",
          address: "Skopje",
          lat: 42.001,
          lon: 21.436,
          source: "mock",
        },
      ],
      days: [
        {
          dayNumber: 1,
          title: "Old Bazaar and Center",
          summary: "Walkable city highlights.",
          estimatedCost: 35,
          items: [
            {
              timeOfDay: "09:00",
              title: "Old Bazaar walk",
              description: "Explore market streets.",
              attractionName: "Old Bazaar",
              category: "historic",
              estimatedCost: 0,
              order: 0,
            },
            {
              timeOfDay: "13:00",
              title: "Local lunch",
              description: "Casual local lunch.",
              attractionName: "Old Bazaar",
              category: "food",
              estimatedCost: 15,
              order: 1,
            },
          ],
        },
      ],
    },
    ...overrides,
  };
}

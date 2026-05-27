import type {
  ChatMessage,
  TripChangeProposal,
  SavedTripDetail,
  SavedTripSummary,
  TravelChatRequest,
  TravelChatResponse,
} from "../../shared/types.js";
import { authHeaders } from "./authHeaders.js";

export async function listSavedTrips(): Promise<SavedTripSummary[]> {
  const response = await fetch("/api/trips", {
    headers: await authHeaders(),
  });
  const body = await response.json() as { trips: SavedTripSummary[]; warnings?: string[] };

  if (!response.ok) {
    throw new Error(body.warnings?.[0] || "Failed to load trips.");
  }

  return body.trips;
}

export async function loadSavedTrip(tripId: string): Promise<SavedTripDetail> {
  const response = await fetch(`/api/trips/${encodeURIComponent(tripId)}`, {
    headers: await authHeaders(),
  });
  const body = await response.json() as { trip: SavedTripDetail | null; warnings?: string[] };

  if (!response.ok || !body.trip) {
    throw new Error(body.warnings?.[0] || "Failed to load trip.");
  }

  return body.trip;
}

export async function sendTravelChatMessage(input: {
  message: string;
  history: ChatMessage[];
  trip?: SavedTripDetail;
}): Promise<TravelChatResponse> {
  const request: TravelChatRequest = input;
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  const body = await response.json() as TravelChatResponse & { warnings?: string[] };

  if (!response.ok) {
    throw new Error(body.warnings?.[0] || "Assistant failed.");
  }

  return body;
}

export async function applyTripChange(tripId: string, proposal: TripChangeProposal): Promise<SavedTripDetail> {
  const response = await fetch(`/api/trips/${encodeURIComponent(tripId)}/itinerary`, {
    method: "PATCH",
    headers: await authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ proposal }),
  });
  const body = await response.json() as { trip: SavedTripDetail | null; warnings?: string[] };

  if (!response.ok || !body.trip) {
    throw new Error(body.warnings?.[0] || "Failed to apply trip changes.");
  }

  return body.trip;
}

import type {
  ChatMessage,
  TripChangeProposal,
  SavedTripDetail,
  SavedTripSummary,
  TravelChatRequest,
  TravelChatResponse,
} from "../../shared/types.js";
import { authHeaders } from "./authHeaders.js";
import { readApiJson } from "./http.js";

export async function listSavedTrips(): Promise<SavedTripSummary[]> {
  const response = await fetch("/api/trips", {
    headers: await authHeaders(),
    cache: "no-store",
  });
  const body = await readApiJson<{ trips: SavedTripSummary[]; warnings?: string[] }>(response, "Failed to load trips.", { trips: [] });

  if (!response.ok) {
    throw new Error(body.warnings?.[0] || "Failed to load trips.");
  }

  return body.trips;
}

export async function loadSavedTrip(tripId: string): Promise<SavedTripDetail> {
  const response = await fetch(`/api/trips/${encodeURIComponent(tripId)}`, {
    headers: await authHeaders(),
    cache: "no-store",
  });
  const body = await readApiJson<{ trip: SavedTripDetail | null; warnings?: string[] }>(response, "Failed to load trip.", { trip: null });

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
  const body = await readApiJson<TravelChatResponse & { warnings?: string[] }>(response, "Assistant failed before the server returned JSON.");

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
  const body = await readApiJson<{ trip: SavedTripDetail | null; warnings?: string[] }>(response, "Failed to apply trip changes.", { trip: null });

  if (!response.ok || !body.trip) {
    throw new Error(body.warnings?.[0] || "Failed to apply trip changes.");
  }

  return body.trip;
}

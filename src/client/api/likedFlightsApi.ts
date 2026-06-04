import type { LikedFlight, SaveLikedFlightRequest } from "../../shared/types.js";
import { authHeaders } from "./authHeaders.js";
import { readApiJson } from "./http.js";

export async function listLikedFlights(): Promise<LikedFlight[]> {
  const response = await fetch("/api/liked-flights", {
    headers: await authHeaders(),
  });
  const body = await readApiJson<{ likedFlights?: LikedFlight[]; warnings?: string[] }>(response, "Failed to load liked flights.", { likedFlights: [] });

  if (!response.ok) {
    throw new Error(body.warnings?.[0] || "Failed to load liked flights.");
  }

  return body.likedFlights || [];
}

export async function saveLikedFlight(request: SaveLikedFlightRequest): Promise<LikedFlight> {
  const response = await fetch("/api/liked-flights", {
    method: "POST",
    headers: await authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(request),
  });
  const body = await readApiJson<{ likedFlight?: LikedFlight; warnings?: string[] }>(response, "Failed to save liked flight.");

  if (!response.ok || !body.likedFlight) {
    throw new Error(body.warnings?.[0] || "Failed to save liked flight.");
  }

  return body.likedFlight;
}

export async function deleteLikedFlight(likedFlightId: string): Promise<void> {
  const response = await fetch(`/api/liked-flights/${encodeURIComponent(likedFlightId)}`, {
    method: "DELETE",
    headers: await authHeaders(),
  });

  if (!response.ok) {
    let warning = "Failed to remove liked flight.";
    try {
      const body = await readApiJson<{ warnings?: string[] }>(response, warning);
      warning = body.warnings?.[0] || warning;
    } catch {
      // Keep fallback.
    }
    throw new Error(warning);
  }
}

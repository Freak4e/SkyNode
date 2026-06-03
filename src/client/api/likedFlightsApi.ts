import type { LikedFlight, SaveLikedFlightRequest } from "../../shared/types.js";
import { authHeaders } from "./authHeaders.js";

export async function listLikedFlights(): Promise<LikedFlight[]> {
  const response = await fetch("/api/liked-flights", {
    headers: await authHeaders(),
  });
  const body = await response.json() as { likedFlights?: LikedFlight[]; warnings?: string[] };

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
  const body = await response.json() as { likedFlight?: LikedFlight; warnings?: string[] };

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
      const body = await response.json() as { warnings?: string[] };
      warning = body.warnings?.[0] || warning;
    } catch {
      // Keep fallback.
    }
    throw new Error(warning);
  }
}

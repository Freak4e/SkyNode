import type { TravelMissionStats, TravelMissionSubmitRequest, TravelMissionSubmitResponse, TravelMissionUnlock } from "../../shared/types.js";
import { authHeaders } from "./authHeaders.js";

export async function listTravelMissionUnlocks(): Promise<{ totalCountries: number; unlocks: TravelMissionUnlock[] }> {
  const response = await fetch("/api/travel-missions/unlocks", {
    headers: await authHeaders(),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { warnings?: string[] };
    throw new Error(body.warnings?.[0] || "Failed to load travel missions.");
  }

  return response.json() as Promise<{ totalCountries: number; unlocks: TravelMissionUnlock[] }>;
}

export async function submitTravelMission(input: TravelMissionSubmitRequest): Promise<TravelMissionSubmitResponse> {
  const response = await fetch("/api/travel-missions/submit", {
    method: "POST",
    headers: await authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { warnings?: string[] };
    throw new Error(body.warnings?.[0] || "Failed to validate travel proof.");
  }

  return response.json() as Promise<TravelMissionSubmitResponse>;
}

export async function getTravelMissionStats(userId: string): Promise<TravelMissionStats> {
  const response = await fetch(`/api/travel-missions/users/${encodeURIComponent(userId)}/stats`, {
    headers: await authHeaders(),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { warnings?: string[] };
    throw new Error(body.warnings?.[0] || "Failed to load travel mission stats.");
  }

  return response.json() as Promise<TravelMissionStats>;
}

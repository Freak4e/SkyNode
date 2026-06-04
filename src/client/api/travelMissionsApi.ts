import type { TravelMissionStats, TravelMissionSubmitRequest, TravelMissionSubmitResponse, TravelMissionUnlock } from "../../shared/types.js";
import { authHeaders } from "./authHeaders.js";
import { readApiJson } from "./http.js";

export async function listTravelMissionUnlocks(): Promise<{ totalCountries: number; unlocks: TravelMissionUnlock[] }> {
  const response = await fetch("/api/travel-missions/unlocks", {
    headers: await authHeaders(),
  });

  if (!response.ok) {
    const body = await readApiJson<{ warnings?: string[] }>(response, "Failed to load travel missions.");
    throw new Error(body.warnings?.[0] || "Failed to load travel missions.");
  }

  return readApiJson<{ totalCountries: number; unlocks: TravelMissionUnlock[] }>(response, "Failed to load travel missions.");
}

export async function submitTravelMission(input: TravelMissionSubmitRequest): Promise<TravelMissionSubmitResponse> {
  const response = await fetch("/api/travel-missions/submit", {
    method: "POST",
    headers: await authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const body = await readApiJson<{ warnings?: string[] }>(response, "Failed to validate travel proof.");
    throw new Error(body.warnings?.[0] || "Failed to validate travel proof.");
  }

  return readApiJson<TravelMissionSubmitResponse>(response, "Failed to validate travel proof.");
}

export async function getTravelMissionStats(userId: string): Promise<TravelMissionStats> {
  const response = await fetch(`/api/travel-missions/users/${encodeURIComponent(userId)}/stats`, {
    headers: await authHeaders(),
  });

  if (!response.ok) {
    const body = await readApiJson<{ warnings?: string[] }>(response, "Failed to load travel mission stats.");
    throw new Error(body.warnings?.[0] || "Failed to load travel mission stats.");
  }

  return readApiJson<TravelMissionStats>(response, "Failed to load travel mission stats.");
}

import type {
  SavedTripDetail,
  SavedTripSummary,
  SendTripMessageRequest,
  TripJoinRequest,
  TripMember,
  TripMessage,
  TripVisibility,
  UpdateTripMemberRequest,
  UpdateTripSettingsRequest,
  UserProfileSnapshot,
} from "../../shared/types.js";
import type { User } from "@supabase/supabase-js";
import { authHeaders } from "./authHeaders.js";

async function optionalAuthHeaders(): Promise<HeadersInit> {
  try {
    return await authHeaders();
  } catch {
    return {};
  }
}

export function profileFromUser(user: User | null | undefined): UserProfileSnapshot {
  const metadata = user?.user_metadata || {};
  const identityData = user?.identities?.find((identity) => identity.identity_data)?.identity_data || {};
  const displayName = typeof metadata.full_name === "string" && metadata.full_name
    ? metadata.full_name
    : [metadata.first_name, metadata.last_name].filter(Boolean).join(" ")
    || typeof identityData.full_name === "string" && identityData.full_name
    || user?.email?.split("@")[0]
    || "Traveler";
  const avatarUrl = typeof metadata.avatar_url === "string" && metadata.avatar_url
    ? metadata.avatar_url
    : typeof identityData.avatar_url === "string" && identityData.avatar_url
    ? identityData.avatar_url
    : undefined;
  const interests = Array.isArray(metadata.interests)
    ? metadata.interests.filter((item): item is string => typeof item === "string")
    : undefined;
  const birthDate = typeof metadata.birth_date === "string" ? metadata.birth_date : undefined;
  const homeCity = typeof metadata.home_city === "string" ? metadata.home_city : undefined;
  const bio = typeof metadata.bio === "string" ? metadata.bio : undefined;

  return { displayName, avatarUrl, birthDate, homeCity, bio, interests };
}

export async function listPublicTrips(filters: {
  destination?: string;
  budget?: string;
  pace?: string;
}): Promise<SavedTripSummary[]> {
  const params = new URLSearchParams();

  if (filters.destination) params.set("destination", filters.destination);
  if (filters.budget) params.set("budget", filters.budget);
  if (filters.pace) params.set("pace", filters.pace);

  const response = await fetch(`/api/trips/public?${params.toString()}`, {
    headers: await optionalAuthHeaders(),
  });
  const body = await response.json() as { trips: SavedTripSummary[]; warnings?: string[] };

  if (!response.ok) {
    throw new Error(body.warnings?.[0] || "Failed to load community trips.");
  }

  return body.trips;
}

export async function listJoinedTrips(): Promise<SavedTripSummary[]> {
  const response = await fetch("/api/trips/joined", {
    headers: await authHeaders(),
  });
  const body = await response.json() as { trips: SavedTripSummary[]; warnings?: string[] };

  if (!response.ok) {
    throw new Error(body.warnings?.[0] || "Failed to load joined trips.");
  }

  return body.trips;
}

export async function loadTripInvite(token: string): Promise<SavedTripDetail> {
  const response = await fetch(`/api/trips/join/${encodeURIComponent(token)}`, {
    headers: await optionalAuthHeaders(),
  });
  const body = await response.json() as { trip: SavedTripDetail | null; warnings?: string[] };

  if (!response.ok || !body.trip) {
    throw new Error(body.warnings?.[0] || "Invite link is invalid.");
  }

  return body.trip;
}

export async function requestJoinTrip(tripId: string, profile: TripJoinRequest): Promise<TripMember> {
  const response = await fetch(`/api/trips/${encodeURIComponent(tripId)}/join`, {
    method: "POST",
    headers: await authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(profile),
  });
  const body = await response.json() as { member: TripMember; warnings?: string[] };

  if (!response.ok || !body.member) {
    throw new Error(body.warnings?.[0] || "Failed to request join.");
  }

  return body.member;
}

export async function updateTripMember(
  tripId: string,
  memberId: string,
  request: UpdateTripMemberRequest,
): Promise<TripMember> {
  const response = await fetch(`/api/trips/${encodeURIComponent(tripId)}/members/${encodeURIComponent(memberId)}`, {
    method: "PATCH",
    headers: await authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(request),
  });
  const body = await response.json() as { member: TripMember; warnings?: string[] };

  if (!response.ok || !body.member) {
    throw new Error(body.warnings?.[0] || "Failed to update member.");
  }

  return body.member;
}

export async function deleteTrip(tripId: string): Promise<void> {
  const response = await fetch(`/api/trips/${encodeURIComponent(tripId)}`, {
    method: "DELETE",
    headers: await authHeaders(),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { warnings?: string[] };
    throw new Error(body.warnings?.[0] || "Failed to delete trip.");
  }
}

export async function updateTripSettings(
  tripId: string,
  request: UpdateTripSettingsRequest,
): Promise<SavedTripDetail> {
  const response = await fetch(`/api/trips/${encodeURIComponent(tripId)}/settings`, {
    method: "PATCH",
    headers: await authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(request),
  });
  const body = await response.json() as { trip: SavedTripDetail | null; warnings?: string[] };

  if (!response.ok || !body.trip) {
    throw new Error(body.warnings?.[0] || "Failed to update trip settings.");
  }

  return body.trip;
}

export async function listTripMembers(tripId: string): Promise<TripMember[]> {
  const response = await fetch(`/api/trips/${encodeURIComponent(tripId)}/members`, {
    headers: await authHeaders(),
  });
  const body = await response.json() as { members: TripMember[]; warnings?: string[] };

  if (!response.ok) {
    throw new Error(body.warnings?.[0] || "Failed to load members.");
  }

  return body.members;
}

export async function listTripMessages(tripId: string): Promise<TripMessage[]> {
  const response = await fetch(`/api/trips/${encodeURIComponent(tripId)}/messages`, {
    headers: await authHeaders(),
  });
  const body = await response.json() as { messages: TripMessage[]; warnings?: string[] };

  if (!response.ok) {
    throw new Error(body.warnings?.[0] || "Failed to load messages.");
  }

  return body.messages;
}

export async function sendTripMessage(tripId: string, request: SendTripMessageRequest): Promise<TripMessage> {
  const response = await fetch(`/api/trips/${encodeURIComponent(tripId)}/messages`, {
    method: "POST",
    headers: await authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(request),
  });
  const body = await response.json() as { message: TripMessage; warnings?: string[] };

  if (!response.ok || !body.message) {
    throw new Error(body.warnings?.[0] || "Failed to send message.");
  }

  return body.message;
}

export function tripInviteUrl(token: string): string {
  if (typeof window === "undefined") {
    return `/trips/join/${token}`;
  }

  return `${window.location.origin}/trips/join/${token}`;
}

export const visibilityLabels: Record<TripVisibility, string> = {
  private: "Private",
  invite: "Invite only",
  public: "Public",
};

export const visibilityDescriptions: Record<TripVisibility, string> = {
  private: "Only you can see this trip.",
  invite: "Hidden from search. Share a link and approve join requests.",
  public: "Listed in Community. Anyone can request to join.",
};

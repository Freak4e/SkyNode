import { Router } from "express";
import {
  applyTripChangeProposal,
  deleteTripById,
  getTripById,
  getTripByInviteToken,
  listDiscoverableTrips,
  listJoinedTrips,
  listTrips,
  saveTripDraft,
} from "./tripRepository.js";
import {
  listTripMembers,
  listTripMessages,
  rateTrip,
  requestTripJoin,
  sendTripMessage,
  updateTripMemberStatus,
  updateTripSettings,
  updateUserTripProfileSnapshots,
} from "./tripSocialRepository.js";
import { getAuthenticatedUserId, getOptionalUserId, optionalAuth, requireAuth } from "../../middleware/authMiddleware.js";
import type {
  ApplyTripChangeRequest,
  SaveTripRequest,
  SendTripMessageRequest,
  TripJoinRequest,
  UpdateTripMemberRequest,
  UpdateTripSettingsRequest,
  UserProfileSnapshot,
} from "../../../shared/types.js";

export const tripsRoute = Router();

tripsRoute.get("/public", optionalAuth, async (req, res) => {
  try {
    const trips = await listDiscoverableTrips(
      {
        destination: typeof req.query.destination === "string" ? req.query.destination : undefined,
        budget: typeof req.query.budget === "string" ? req.query.budget : undefined,
        includePast: req.query.includePast === "true",
        ownerId: typeof req.query.ownerId === "string" ? req.query.ownerId : undefined,
        pace: typeof req.query.pace === "string" ? req.query.pace : undefined,
      },
      getOptionalUserId(res),
    );

    return res.json({ trips });
  } catch (error) {
    console.error("[route:trips] public list failed", error);

    return res.status(502).json({
      trips: [],
      warnings: [error instanceof Error ? error.message : "Failed to load public trips."],
    });
  }
});

tripsRoute.get("/join/:token", optionalAuth, async (req, res) => {
  try {
    const trip = await getTripByInviteToken(String(req.params.token), getOptionalUserId(res));

    if (!trip) {
      return res.status(404).json({ trip: null, warnings: ["Invite link is invalid or expired."] });
    }

    return res.json({ trip });
  } catch (error) {
    console.error("[route:trips] invite preview failed", error);

    return res.status(502).json({
      trip: null,
      warnings: [error instanceof Error ? error.message : "Failed to load invite."],
    });
  }
});

tripsRoute.get("/public/:tripId/preview", optionalAuth, async (req, res) => {
  try {
    const trip = await getTripById(String(req.params.tripId), getOptionalUserId(res));

    if (!trip || trip.visibility !== "public") {
      return res.status(404).json({ trip: null, warnings: ["Public trip not found."] });
    }

    return res.json({ trip });
  } catch (error) {
    console.error("[route:trips] public preview failed", error);

    return res.status(502).json({
      trip: null,
      warnings: [error instanceof Error ? error.message : "Failed to load trip preview."],
    });
  }
});

tripsRoute.use(requireAuth);

tripsRoute.get("/joined", async (_req, res) => {
  try {
    return res.json({ trips: await listJoinedTrips(getAuthenticatedUserId(res)) });
  } catch (error) {
    console.error("[route:trips] joined list failed", error);

    return res.status(502).json({
      trips: [],
      warnings: [error instanceof Error ? error.message : "Failed to load joined trips."],
    });
  }
});

tripsRoute.get("/", async (_req, res) => {
  try {
    return res.json({ trips: await listTrips(getAuthenticatedUserId(res)) });
  } catch (error) {
    console.error("[route:trips] list failed", error);

    return res.status(502).json({
      trips: [],
      warnings: [error instanceof Error ? error.message : "Failed to load trips."],
    });
  }
});

tripsRoute.patch("/profile", async (req, res) => {
  try {
    const profile = req.body as UserProfileSnapshot;

    if (!profile.displayName?.trim()) {
      return res.status(400).json({ warnings: ["Missing profile details."] });
    }

    await updateUserTripProfileSnapshots(getAuthenticatedUserId(res), {
      displayName: profile.displayName.trim(),
      avatarUrl: profile.avatarUrl || undefined,
      birthDate: profile.birthDate || undefined,
      homeCity: profile.homeCity?.trim() || undefined,
      bio: profile.bio?.trim() || undefined,
      interests: Array.isArray(profile.interests)
        ? profile.interests.filter((item): item is string => typeof item === "string")
        : undefined,
    });

    return res.json({ ok: true });
  } catch (error) {
    console.error("[route:trips] profile sync failed", error);

    return res.status(502).json({
      warnings: [error instanceof Error ? error.message : "Failed to sync profile."],
    });
  }
});

tripsRoute.get("/:tripId/members", async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(res);
    const trip = await getTripById(req.params.tripId, userId);

    if (!trip) {
      return res.status(404).json({ members: [], warnings: ["Trip not found."] });
    }

    const members = await listTripMembers(req.params.tripId);

    if (!trip.access?.isOwner && trip.access?.membershipStatus !== "accepted") {
      return res.status(403).json({ members: [], warnings: ["Join this trip to see members."] });
    }

    return res.json({ members });
  } catch (error) {
    console.error("[route:trips] members failed", error);

    return res.status(502).json({
      members: [],
      warnings: [error instanceof Error ? error.message : "Failed to load members."],
    });
  }
});

tripsRoute.get("/:tripId/messages", async (req, res) => {
  try {
    const messages = await listTripMessages(req.params.tripId, getAuthenticatedUserId(res));
    return res.json({ messages });
  } catch (error) {
    console.error("[route:trips] messages failed", error);

    return res.status(403).json({
      messages: [],
      warnings: [error instanceof Error ? error.message : "Failed to load messages."],
    });
  }
});

tripsRoute.post("/:tripId/messages", async (req, res) => {
  try {
    const request = req.body as SendTripMessageRequest;

    if (!request.content?.trim() || !request.profile?.displayName) {
      return res.status(400).json({ warnings: ["Missing message content."] });
    }

    const message = await sendTripMessage(
      req.params.tripId,
      getAuthenticatedUserId(res),
      request.profile,
      request.content,
    );

    return res.status(201).json({ message });
  } catch (error) {
    console.error("[route:trips] send message failed", error);

    return res.status(403).json({
      warnings: [error instanceof Error ? error.message : "Failed to send message."],
    });
  }
});

tripsRoute.post("/:tripId/join", async (req, res) => {
  try {
    const request = req.body as TripJoinRequest;

    if (!request.displayName) {
      return res.status(400).json({ warnings: ["Missing profile details."] });
    }

    const member = await requestTripJoin(req.params.tripId, getAuthenticatedUserId(res), request);
    return res.status(201).json({ member });
  } catch (error) {
    console.error("[route:trips] join failed", error);

    return res.status(400).json({
      warnings: [error instanceof Error ? error.message : "Failed to request join."],
    });
  }
});

tripsRoute.put("/:tripId/rating", async (req, res) => {
  try {
    const rating = Number(req.body?.rating);

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ warnings: ["Choose a rating from 1 to 5."] });
    }

    const result = await rateTrip(req.params.tripId, getAuthenticatedUserId(res), rating);
    return res.json(result);
  } catch (error) {
    console.error("[route:trips] rating failed", error);

    return res.status(400).json({
      warnings: [error instanceof Error ? error.message : "Failed to rate trip."],
    });
  }
});

tripsRoute.patch("/:tripId/members/:memberId", async (req, res) => {
  try {
    const request = req.body as UpdateTripMemberRequest;

    if (request.status !== "accepted" && request.status !== "declined") {
      return res.status(400).json({ warnings: ["Invalid member status."] });
    }

    const member = await updateTripMemberStatus(
      req.params.tripId,
      req.params.memberId,
      getAuthenticatedUserId(res),
      request.status,
    );

    if (!member) {
      return res.status(404).json({ member: null, warnings: ["Member request not found."] });
    }

    return res.json({ member });
  } catch (error) {
    console.error("[route:trips] member update failed", error);

    return res.status(400).json({
      warnings: [error instanceof Error ? error.message : "Failed to update member."],
    });
  }
});

tripsRoute.patch("/:tripId/settings", async (req, res) => {
  try {
    const request = req.body as UpdateTripSettingsRequest;
    const updated = await updateTripSettings(req.params.tripId, getAuthenticatedUserId(res), request);

    if (!updated) {
      return res.status(404).json({ warnings: ["Trip not found or no changes provided."] });
    }

    const trip = await getTripById(req.params.tripId, getAuthenticatedUserId(res));
    return res.json({ trip });
  } catch (error) {
    console.error("[route:trips] settings update failed", error);

    return res.status(502).json({
      warnings: [error instanceof Error ? error.message : "Failed to update trip settings."],
    });
  }
});

tripsRoute.get("/:tripId", async (req, res) => {
  try {
    const trip = await getTripById(req.params.tripId, getAuthenticatedUserId(res));

    if (!trip) {
      return res.status(404).json({ trip: null, warnings: ["Trip not found."] });
    }

    return res.json({ trip });
  } catch (error) {
    console.error("[route:trips] load failed", error);

    return res.status(502).json({
      trip: null,
      warnings: [error instanceof Error ? error.message : "Failed to load trip."],
    });
  }
});

tripsRoute.delete("/:tripId", async (req, res) => {
  try {
    const deleted = await deleteTripById(req.params.tripId, getAuthenticatedUserId(res));

    if (!deleted) {
      return res.status(404).json({ warnings: ["Trip not found or you are not the owner."] });
    }

    return res.status(204).send();
  } catch (error) {
    console.error("[route:trips] delete failed", error);

    return res.status(502).json({
      warnings: [error instanceof Error ? error.message : "Failed to delete trip."],
    });
  }
});

tripsRoute.post("/", async (req, res) => {
  try {
    const request = req.body as SaveTripRequest;

    if (!request.title || !request.itinerary) {
      return res.status(400).json({ warnings: ["Missing title or itinerary."] });
    }

    return res.status(201).json(await saveTripDraft(request, getAuthenticatedUserId(res)));
  } catch (error) {
    console.error("[route:trips] save failed", error);

    return res.status(502).json({
      warnings: [error instanceof Error ? error.message : "Failed to save trip."],
    });
  }
});

tripsRoute.patch("/:tripId/itinerary", async (req, res) => {
  try {
    const request = req.body as ApplyTripChangeRequest;

    if (!request.proposal?.itinerary?.days?.length) {
      return res.status(400).json({ warnings: ["Missing trip change proposal."] });
    }

    const trip = await applyTripChangeProposal(req.params.tripId, request.proposal, getAuthenticatedUserId(res));

    if (!trip) {
      return res.status(404).json({ trip: null, warnings: ["Trip not found."] });
    }

    return res.json({ trip });
  } catch (error) {
    console.error("[route:trips] apply proposal failed", error);

    return res.status(502).json({
      trip: null,
      warnings: [error instanceof Error ? error.message : "Failed to apply trip changes."],
    });
  }
});

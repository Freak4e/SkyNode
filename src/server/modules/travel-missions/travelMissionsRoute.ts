import { Router } from "express";
import { getAuthenticatedUserId, requireAuth } from "../../middleware/authMiddleware.js";
import { missionCountries } from "../../../shared/countries.js";
import type { TravelMissionSubmitRequest } from "../../../shared/types.js";
import { validateTravelMissionWithHuggingFace } from "./huggingFaceMissionValidator.js";
import { countTravelMissionUnlocks, listTravelMissionUnlocks, saveTravelMissionUnlock } from "./travelMissionRepository.js";

export const travelMissionsRoute = Router();

travelMissionsRoute.use(requireAuth);

travelMissionsRoute.get("/unlocks", async (_req, res) => {
  try {
    return res.json({
      totalCountries: missionCountries.length,
      unlocks: await listTravelMissionUnlocks(getAuthenticatedUserId(res)),
    });
  } catch (error) {
    console.error("[route:travel-missions] unlocks failed", error);
    return res.status(500).json({ warnings: [error instanceof Error ? error.message : "Failed to load travel missions."] });
  }
});

travelMissionsRoute.get("/users/:userId/stats", async (req, res) => {
  try {
    const userId = req.params.userId;
    if (!/^[0-9a-f-]{20,}$/i.test(userId)) {
      return res.status(400).json({ warnings: ["Invalid traveler id."] });
    }

    return res.json({
      userId,
      unlockedCountries: await countTravelMissionUnlocks(userId),
      totalCountries: missionCountries.length,
    });
  } catch (error) {
    console.error("[route:travel-missions] user stats failed", error);
    return res.status(500).json({ warnings: [error instanceof Error ? error.message : "Failed to load travel mission stats."] });
  }
});

travelMissionsRoute.post("/submit", async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(res);
    const body = req.body as Partial<TravelMissionSubmitRequest>;
    const country = missionCountries.find((item) => item.code === body.countryCode);

    if (!country || country.name !== body.countryName) {
      return res.status(400).json({ warnings: ["Choose a valid country mission."] });
    }

    if (!body.imageDataUrl || !/^data:image\/(png|jpe?g|webp);base64,/i.test(body.imageDataUrl)) {
      return res.status(400).json({ warnings: ["Upload a JPG, PNG, or WebP photo."] });
    }

    if (body.imageDataUrl.length > 5_500_000) {
      return res.status(413).json({ warnings: ["Choose an image under about 4 MB."] });
    }

    const validation = await validateTravelMissionWithHuggingFace({
      countryName: country.name,
      imageDataUrl: body.imageDataUrl,
      requiredGesture: body.requiredGesture || "show an open hand",
    });

    const unlock = validation.accepted
      ? await saveTravelMissionUnlock({
          countryCode: country.code,
          countryName: country.name,
          userId,
          validation,
        })
      : undefined;

    return res.json({ validation, unlock });
  } catch (error) {
    console.error("[route:travel-missions] submit failed", error);
    return res.status(502).json({ warnings: [error instanceof Error ? error.message : "Failed to validate travel proof."] });
  }
});

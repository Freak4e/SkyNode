import { Router } from "express";
import type { AppNotificationType } from "../../../shared/types.js";
import { getAuthenticatedUserId, requireAuth } from "../../middleware/authMiddleware.js";
import {
  listUnreadNotifications,
  markNotificationRead,
  markNotificationReferenceRead,
} from "./notificationRepository.js";

export const notificationsRoute = Router();

notificationsRoute.use(requireAuth);

notificationsRoute.get("/unread", async (_req, res) => {
  try {
    return res.json({ notifications: await listUnreadNotifications(getAuthenticatedUserId(res)) });
  } catch (error) {
    console.error("[route:notifications] unread failed", error);
    return res.status(502).json({
      notifications: [],
      warnings: [error instanceof Error ? error.message : "Failed to load notifications."],
    });
  }
});

notificationsRoute.patch("/:notificationId/read", async (req, res) => {
  try {
    const ok = await markNotificationRead(getAuthenticatedUserId(res), req.params.notificationId);
    return res.status(ok ? 204 : 404).send();
  } catch (error) {
    console.error("[route:notifications] mark read failed", error);
    return res.status(502).json({
      warnings: [error instanceof Error ? error.message : "Failed to update notification."],
    });
  }
});

notificationsRoute.patch("/references/:type/:referenceId/read", async (req, res) => {
  try {
    await markNotificationReferenceRead(
      getAuthenticatedUserId(res),
      req.params.type as AppNotificationType,
      req.params.referenceId,
    );
    return res.status(204).send();
  } catch (error) {
    console.error("[route:notifications] mark reference read failed", error);
    return res.status(502).json({
      warnings: [error instanceof Error ? error.message : "Failed to update notification."],
    });
  }
});

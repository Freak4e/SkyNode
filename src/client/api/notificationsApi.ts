import type { AppNotification, AppNotificationType } from "../../shared/types.js";
import { authHeaders } from "./authHeaders.js";

export async function listUnreadNotifications(): Promise<AppNotification[]> {
  const response = await fetch("/api/notifications/unread", {
    headers: await authHeaders(),
  });
  const body = await response.json() as { notifications: AppNotification[]; warnings?: string[] };

  if (!response.ok) {
    throw new Error(body.warnings?.[0] || "Failed to load notifications.");
  }

  return body.notifications;
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const response = await fetch(`/api/notifications/${encodeURIComponent(notificationId)}/read`, {
    method: "PATCH",
    headers: await authHeaders(),
  });

  if (!response.ok && response.status !== 404) {
    throw new Error("Failed to update notification.");
  }
}

export async function markNotificationReferenceRead(type: AppNotificationType, referenceId: string): Promise<void> {
  const response = await fetch(
    `/api/notifications/references/${encodeURIComponent(type)}/${encodeURIComponent(referenceId)}/read`,
    {
      method: "PATCH",
      headers: await authHeaders(),
    },
  );

  if (!response.ok) {
    throw new Error("Failed to update notification.");
  }
}

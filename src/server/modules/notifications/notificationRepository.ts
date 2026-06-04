import type { AppNotification, AppNotificationType } from "../../../shared/types.js";
import { query } from "../../infrastructure/database/client.js";
import { ensureSchema } from "../../infrastructure/database/schema.js";

type NotificationRow = {
  id: string;
  user_id: string;
  trip_id: string | null;
  type: AppNotificationType;
  reference_id: string | null;
  title: string;
  body: string;
  target_path: string;
  read_at: string | null;
  created_at: string;
};

export async function createNotification(input: {
  userId: string;
  tripId?: string;
  type: AppNotificationType;
  referenceId?: string;
  title: string;
  body: string;
  targetPath: string;
}): Promise<void> {
  try {
    await ensureNotificationsSchema();

    await query(
      `
        insert into app_notifications (user_id, trip_id, type, reference_id, title, body, target_path)
        values ($1, $2, $3, $4, $5, $6, $7)
        on conflict (user_id, type, reference_id)
        where reference_id is not null
        do nothing
      `,
      [
        input.userId,
        input.tripId || null,
        input.type,
        input.referenceId || null,
        input.title,
        input.body,
        input.targetPath,
      ],
    );
  } catch (error) {
    console.error("[notifications] create failed", error);
  }
}

export async function listUnreadNotifications(userId: string): Promise<AppNotification[]> {
  await ensureNotificationsSchema();

  const result = await query<NotificationRow>(
    `
      select id, user_id, trip_id, type, reference_id, title, body, target_path, read_at::text, created_at::text
      from app_notifications
      where user_id = $1 and read_at is null
      order by created_at desc
      limit 30
    `,
    [userId],
  );

  return result.rows.map(mapNotification);
}

export async function markNotificationRead(userId: string, notificationId: string): Promise<boolean> {
  await ensureNotificationsSchema();

  const result = await query(
    `
      update app_notifications
      set read_at = coalesce(read_at, now())
      where id = $1 and user_id = $2
    `,
    [notificationId, userId],
  );

  return (result.rowCount || 0) > 0;
}

export async function markNotificationReferenceRead(
  userId: string,
  type: AppNotificationType,
  referenceId: string,
): Promise<void> {
  await ensureNotificationsSchema();

  await query(
    `
      update app_notifications
      set read_at = coalesce(read_at, now())
      where user_id = $1 and type = $2 and reference_id = $3
    `,
    [userId, type, referenceId],
  );
}

async function ensureNotificationsSchema(): Promise<void> {
  await ensureSchema();

  await query(`
    create table if not exists app_notifications (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null,
      trip_id uuid references trips(id) on delete cascade,
      type text not null check (type in ('trip_message', 'join_request', 'join_accepted', 'join_declined')),
      reference_id uuid,
      title text not null,
      body text not null,
      target_path text not null,
      read_at timestamptz,
      created_at timestamptz not null default now()
    );
  `);

  await query(`
    create index if not exists app_notifications_user_unread_created_idx
      on app_notifications (user_id, created_at desc)
      where read_at is null;
  `);

  await query(`
    create unique index if not exists app_notifications_user_type_reference_idx
      on app_notifications (user_id, type, reference_id)
      where reference_id is not null;
  `);
}

function mapNotification(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    userId: row.user_id,
    tripId: row.trip_id || undefined,
    type: row.type,
    referenceId: row.reference_id || undefined,
    title: row.title,
    body: row.body,
    targetPath: row.target_path,
    readAt: row.read_at || undefined,
    createdAt: row.created_at,
  };
}

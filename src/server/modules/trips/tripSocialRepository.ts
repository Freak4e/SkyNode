import { randomBytes } from "node:crypto";
import { query } from "../../infrastructure/database/client.js";
import { ensureSchema } from "../../infrastructure/database/schema.js";
import { createNotification } from "../notifications/notificationRepository.js";
import type {
  TripAccess,
  TripMember,
  TripMemberStatus,
  TripMessage,
  TripVisibility,
  UpdateTripSettingsRequest,
  UserProfileSnapshot,
} from "../../../shared/types.js";

type MemberRow = {
  id: string;
  trip_id: string;
  user_id: string;
  role: "owner" | "member";
  status: TripMemberStatus;
  display_name: string;
  avatar_url: string | null;
  profile: UserProfileSnapshot | null;
  created_at: string;
};

type MessageRow = {
  id: string;
  trip_id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  profile: UserProfileSnapshot | null;
  content: string;
  created_at: string;
};

type TripSocialRow = {
  id: string;
  user_id: string;
  visibility: TripVisibility;
  invite_token: string;
  description: string | null;
  max_members: number;
};

type TripNotificationMetaRow = {
  title: string;
  user_id: string;
};

export function createInviteToken(): string {
  return randomBytes(16).toString("hex");
}

export async function createOwnerMembership(
  tripId: string,
  userId: string,
  profile: UserProfileSnapshot,
): Promise<void> {
  await ensureSchema();

  await query(
    `
      insert into trip_members (trip_id, user_id, role, status, display_name, avatar_url, profile)
      values ($1, $2, 'owner', 'accepted', $3, $4, $5)
      on conflict (trip_id, user_id) do update
      set role = excluded.role,
          status = excluded.status,
          display_name = excluded.display_name,
          avatar_url = excluded.avatar_url,
          profile = excluded.profile,
          updated_at = now()
    `,
    [tripId, userId, profile.displayName, profile.avatarUrl || null, profile],
  );
}

export async function getTripSocialMeta(tripId: string): Promise<TripSocialRow | null> {
  await ensureSchema();

  const result = await query<TripSocialRow>(
    `
      select id, user_id, visibility, invite_token, description, max_members
      from trips
      where id = $1
      limit 1
    `,
    [tripId],
  );

  return result.rows[0] || null;
}

export async function getTripSocialMetaByToken(token: string): Promise<TripSocialRow | null> {
  await ensureSchema();

  const result = await query<TripSocialRow>(
    `
      select id, user_id, visibility, invite_token, description, max_members
      from trips
      where invite_token = $1
      limit 1
    `,
    [token],
  );

  return result.rows[0] || null;
}

export async function countAcceptedMembers(tripId: string): Promise<number> {
  const result = await query<{ count: string }>(
    `
      select count(*)::text as count
      from trip_members
      where trip_id = $1 and status = 'accepted'
    `,
    [tripId],
  );

  return Number(result.rows[0]?.count || 0);
}

export async function getMemberForUser(tripId: string, userId: string): Promise<TripMember | null> {
  await ensureSchema();

  const result = await query<MemberRow>(
    `
      select id, trip_id, user_id, role, status, display_name, avatar_url, profile, created_at::text
      from trip_members
      where trip_id = $1 and user_id = $2
      limit 1
    `,
    [tripId, userId],
  );

  return result.rows[0] ? mapMember(result.rows[0]) : null;
}

export async function listTripMembers(tripId: string): Promise<TripMember[]> {
  await ensureSchema();

  const result = await query<MemberRow>(
    `
      select id, trip_id, user_id, role, status, display_name, avatar_url, profile, created_at::text
      from trip_members
      where trip_id = $1
      order by
        case role when 'owner' then 0 else 1 end,
        case status when 'accepted' then 0 when 'pending' then 1 else 2 end,
        created_at asc
    `,
    [tripId],
  );

  return result.rows.map(mapMember);
}

export async function resolveTripAccess(tripId: string, userId?: string): Promise<TripAccess> {
  const meta = await getTripSocialMeta(tripId);

  if (!meta) {
    return {
      canViewItinerary: false,
      canChat: false,
      canManage: false,
      membershipStatus: "none",
      isOwner: false,
    };
  }

  if (!userId) {
    return {
      canViewItinerary: meta.visibility === "public",
      canChat: false,
      canManage: false,
      membershipStatus: "none",
      isOwner: false,
    };
  }

  if (meta.user_id === userId) {
    return {
      canViewItinerary: true,
      canChat: true,
      canManage: true,
      membershipStatus: "accepted",
      role: "owner",
      isOwner: true,
    };
  }

  const member = await getMemberForUser(tripId, userId);

  if (member?.status === "accepted") {
    return {
      canViewItinerary: true,
      canChat: true,
      canManage: false,
      membershipStatus: "accepted",
      role: member.role,
      isOwner: false,
    };
  }

  if (member?.status === "pending") {
    return {
      canViewItinerary: meta.visibility === "public",
      canChat: false,
      canManage: false,
      membershipStatus: "pending",
      role: member.role,
      isOwner: false,
    };
  }

  return {
    canViewItinerary: meta.visibility === "public",
    canChat: false,
    canManage: false,
    membershipStatus: member?.status || "none",
    role: member?.role,
    isOwner: false,
  };
}

export async function listJoinedTripIds(userId: string): Promise<string[]> {
  await ensureSchema();

  const result = await query<{ trip_id: string }>(
    `
      select tm.trip_id
      from trip_members tm
      inner join trips t on t.id = tm.trip_id
      where tm.user_id = $1
        and tm.status = 'accepted'
        and tm.role = 'member'
        and t.user_id <> $1
      order by tm.updated_at desc
      limit 30
    `,
    [userId],
  );

  return result.rows.map((row) => row.trip_id);
}

export async function listPublicTrips(filters: {
  destination?: string;
  budget?: string;
  includePast?: boolean;
  ownerId?: string;
  pace?: string;
  userId?: string;
}): Promise<Array<{ tripId: string; memberCount: number; ownerName: string; ownerAvatar?: string; membershipStatus: TripMemberStatus | "none" }>> {
  await ensureSchema();

  const values: unknown[] = ["public"];
  const clauses = ["t.visibility = $1"];
  let index = 2;

  if (!filters.includePast) {
    clauses.push("t.start_date >= current_date");
  }

  if (filters.destination) {
    clauses.push(`(
      t.destination_name ilike $${index}
      or exists (
        select 1
        from jsonb_array_elements(coalesce(t.cities, '[]'::jsonb)) city_elem
        where city_elem->>'name' ilike $${index}
      )
    )`);
    values.push(`%${filters.destination}%`);
    index += 1;
  }

  if (filters.budget) {
    clauses.push(`t.budget = $${index}`);
    values.push(filters.budget);
    index += 1;
  }

  if (filters.pace) {
    clauses.push(`t.pace = $${index}`);
    values.push(filters.pace);
    index += 1;
  }

  if (filters.ownerId) {
    clauses.push(`t.user_id = $${index}`);
    values.push(filters.ownerId);
    index += 1;
  }

  const result = await query<{
    trip_id: string;
    member_count: string;
    owner_name: string;
    owner_avatar: string | null;
    membership_status: TripMemberStatus | null;
  }>(
    `
      select
        t.id as trip_id,
        (
          select count(*)::text
          from trip_members tm_count
          where tm_count.trip_id = t.id and tm_count.status = 'accepted'
        ) as member_count,
        coalesce(owner.display_name, 'Traveler') as owner_name,
        owner.avatar_url as owner_avatar,
        viewer.status as membership_status
      from trips t
      left join trip_members owner
        on owner.trip_id = t.id and owner.role = 'owner'
      left join trip_members viewer
        on viewer.trip_id = t.id and viewer.user_id = $${index}
      where ${clauses.join(" and ")}
      order by t.created_at desc
      limit 40
    `,
    [...values, filters.userId || null],
  );

  return result.rows.map((row) => ({
    tripId: row.trip_id,
    memberCount: Number(row.member_count || 0),
    ownerName: row.owner_name,
    ownerAvatar: row.owner_avatar || undefined,
    membershipStatus: row.membership_status || "none",
  }));
}

export async function requestTripJoin(
  tripId: string,
  userId: string,
  profile: UserProfileSnapshot,
): Promise<TripMember> {
  await ensureSchema();

  const meta = await getTripSocialMeta(tripId);

  if (!meta) {
    throw new Error("Trip not found.");
  }

  if (meta.user_id === userId) {
    throw new Error("You already own this trip.");
  }

  if (meta.visibility === "private") {
    throw new Error("This trip is private.");
  }

  const existing = await getMemberForUser(tripId, userId);

  if (existing?.status === "accepted") {
    throw new Error("You are already a member of this trip.");
  }

  if (existing?.status === "pending") {
    return existing;
  }

  const memberCount = await countAcceptedMembers(tripId);

  if (memberCount >= meta.max_members) {
    throw new Error("This trip is full.");
  }

  const result = await query<MemberRow>(
    `
      insert into trip_members (trip_id, user_id, role, status, display_name, avatar_url, profile)
      values ($1, $2, 'member', 'pending', $3, $4, $5)
      on conflict (trip_id, user_id) do update
      set status = 'pending',
          display_name = excluded.display_name,
          avatar_url = excluded.avatar_url,
          profile = excluded.profile,
          updated_at = now()
      returning id, trip_id, user_id, role, status, display_name, avatar_url, profile, created_at::text
    `,
    [tripId, userId, profile.displayName, profile.avatarUrl || null, profile],
  );

  const member = mapMember(result.rows[0]);
  const tripMeta = await getTripNotificationMeta(tripId);

  if (tripMeta) {
    await createNotification({
      userId: tripMeta.user_id,
      tripId,
      type: "join_request",
      referenceId: member.id,
      title: "New join request",
      body: `${member.displayName} wants to join ${tripMeta.title}.`,
      targetPath: `/trips/${tripId}?tab=members`,
    });
  }

  return member;
}

export async function updateTripMemberStatus(
  tripId: string,
  memberId: string,
  ownerId: string,
  status: "accepted" | "declined",
): Promise<TripMember | null> {
  await ensureSchema();

  const meta = await getTripSocialMeta(tripId);

  if (!meta || meta.user_id !== ownerId) {
    return null;
  }

  if (status === "accepted") {
    const memberCount = await countAcceptedMembers(tripId);

    if (memberCount >= meta.max_members) {
      throw new Error("This trip is full.");
    }
  }

  const result = await query<MemberRow>(
    `
      update trip_members
      set status = $3,
          updated_at = now()
      where id = $1
        and trip_id = $2
        and role = 'member'
      returning id, trip_id, user_id, role, status, display_name, avatar_url, profile, created_at::text
    `,
    [memberId, tripId, status],
  );

  const member = result.rows[0] ? mapMember(result.rows[0]) : null;

  if (member) {
    const tripMeta = await getTripNotificationMeta(tripId);

    if (tripMeta) {
      await createNotification({
        userId: member.userId,
        tripId,
        type: status === "accepted" ? "join_accepted" : "join_declined",
        referenceId: member.id,
        title: status === "accepted" ? "Join request accepted" : "Join request declined",
        body: status === "accepted"
          ? `You were accepted into ${tripMeta.title}.`
          : `Your request to join ${tripMeta.title} was declined.`,
        targetPath: status === "accepted" ? `/trips/${tripId}?tab=chat` : "/explore-trips",
      });
    }
  }

  return member;
}

export async function updateTripSettings(
  tripId: string,
  ownerId: string,
  settings: UpdateTripSettingsRequest,
): Promise<boolean> {
  await ensureSchema();

  const fields: string[] = [];
  const values: unknown[] = [tripId, ownerId];
  let index = 3;

  if (settings.visibility) {
    fields.push(`visibility = $${index}`);
    values.push(settings.visibility);
    index += 1;
  }

  if (settings.description !== undefined) {
    fields.push(`description = $${index}`);
    values.push(settings.description || null);
    index += 1;
  }

  if (settings.maxMembers !== undefined) {
    fields.push(`max_members = $${index}`);
    values.push(Math.max(2, Math.min(20, settings.maxMembers)));
    index += 1;
  }

  if (!fields.length) {
    return false;
  }

  fields.push("updated_at = now()");

  const result = await query(
    `
      update trips
      set ${fields.join(", ")}
      where id = $1 and user_id = $2
    `,
    values,
  );

  return (result.rowCount || 0) > 0;
}

export async function updateUserTripProfileSnapshots(userId: string, profile: UserProfileSnapshot): Promise<void> {
  await ensureSchema();

  await query(
    `
      update trip_members
      set display_name = $2,
          avatar_url = $3,
          profile = $4,
          updated_at = now()
      where user_id = $1
    `,
    [userId, profile.displayName, profile.avatarUrl || null, profile],
  );

  await query(
    `
      update trip_messages
      set display_name = $2,
          avatar_url = $3,
          profile = $4
      where user_id = $1
    `,
    [userId, profile.displayName, profile.avatarUrl || null, profile],
  );
}

export async function listTripMessages(tripId: string, userId: string): Promise<TripMessage[]> {
  await ensureSchema();

  const access = await resolveTripAccess(tripId, userId);

  if (!access.canChat) {
    throw new Error("Join this trip to view the group chat.");
  }

  const result = await query<MessageRow>(
    `
      select id, trip_id, user_id, display_name, avatar_url, profile, content, created_at::text
      from trip_messages
      where trip_id = $1
      order by created_at asc
      limit 200
    `,
    [tripId],
  );

  return result.rows.map((row) => ({
    id: row.id,
    tripId: row.trip_id,
    userId: row.user_id,
    displayName: row.display_name,
    avatarUrl: row.avatar_url || undefined,
    profile: normalizeProfile(row.profile, row.display_name, row.avatar_url),
    content: row.content,
    createdAt: row.created_at,
    own: row.user_id === userId,
  }));
}

export async function sendTripMessage(
  tripId: string,
  userId: string,
  profile: UserProfileSnapshot,
  content: string,
): Promise<TripMessage> {
  await ensureSchema();

  const access = await resolveTripAccess(tripId, userId);

  if (!access.canChat) {
    throw new Error("Join this trip to send messages.");
  }

  const trimmed = content.trim();

  if (!trimmed) {
    throw new Error("Message cannot be empty.");
  }

  const result = await query<MessageRow>(
    `
      insert into trip_messages (trip_id, user_id, display_name, avatar_url, profile, content)
      values ($1, $2, $3, $4, $5, $6)
      returning id, trip_id, user_id, display_name, avatar_url, profile, content, created_at::text
    `,
    [tripId, userId, profile.displayName, profile.avatarUrl || null, profile, trimmed.slice(0, 2000)],
  );

  const row = result.rows[0];
  const message = {
    id: row.id,
    tripId: row.trip_id,
    userId: row.user_id,
    displayName: row.display_name,
    avatarUrl: row.avatar_url || undefined,
    profile: normalizeProfile(row.profile, row.display_name, row.avatar_url),
    content: row.content,
    createdAt: row.created_at,
    own: true,
  };

  const [tripMeta, recipients] = await Promise.all([
    getTripNotificationMeta(tripId),
    listAcceptedTripMemberUserIds(tripId, userId),
  ]);

  if (tripMeta && recipients.length > 0) {
    await Promise.all(recipients.map((recipientId) => createNotification({
      userId: recipientId,
      tripId,
      type: "trip_message",
      referenceId: message.id,
      title: row.display_name,
      body: row.content,
      targetPath: `/trips/${tripId}?tab=chat`,
    })));
  }

  return message;
}

async function getTripNotificationMeta(tripId: string): Promise<TripNotificationMetaRow | null> {
  const result = await query<TripNotificationMetaRow>(
    `
      select title, user_id
      from trips
      where id = $1
      limit 1
    `,
    [tripId],
  );

  return result.rows[0] || null;
}

async function listAcceptedTripMemberUserIds(tripId: string, excludeUserId: string): Promise<string[]> {
  const result = await query<{ user_id: string }>(
    `
      select user_id
      from trip_members
      where trip_id = $1
        and status = 'accepted'
        and user_id <> $2
    `,
    [tripId, excludeUserId],
  );

  return result.rows.map((row) => row.user_id);
}

function mapMember(row: MemberRow): TripMember {
  return {
    id: row.id,
    userId: row.user_id,
    role: row.role,
    status: row.status,
    displayName: row.display_name,
    avatarUrl: row.avatar_url || undefined,
    profile: normalizeProfile(row.profile, row.display_name, row.avatar_url),
    createdAt: row.created_at,
  };
}

function normalizeProfile(profile: UserProfileSnapshot | null, displayName: string, avatarUrl: string | null): UserProfileSnapshot {
  return {
    ...(profile || {}),
    displayName: profile?.displayName || displayName || "Traveler",
    avatarUrl: profile?.avatarUrl || avatarUrl || undefined,
    interests: Array.isArray(profile?.interests) ? profile.interests.filter((item): item is string => typeof item === "string") : undefined,
  };
}

export async function getOwnerProfile(tripId: string): Promise<UserProfileSnapshot> {
  await ensureSchema();

  const result = await query<{ display_name: string; avatar_url: string | null }>(
    `
      select display_name, avatar_url
      from trip_members
      where trip_id = $1 and role = 'owner'
      limit 1
    `,
    [tripId],
  );

  const row = result.rows[0];

  return {
    displayName: row?.display_name || "Traveler",
    avatarUrl: row?.avatar_url || undefined,
  };
}

import test from "node:test";
import assert from "node:assert/strict";
import {
  createNotification,
  listUnreadNotifications,
  markNotificationRead,
  markNotificationReferenceRead,
} from "../../../src/server/modules/notifications/notificationRepository.js";
import { cleanTestDatabase, hasTestDatabase, testDatabaseSkipReason } from "./setupTestDatabase.js";
import { referenceId, testUserId } from "./fixtures.js";

test.beforeEach(cleanTestDatabase);

// Verifies notification persistence, reference deduplication, and read-state updates.
test("notifications persist, dedupe reference notifications, and mark read", {
  skip: hasTestDatabase ? false : testDatabaseSkipReason,
}, async () => {
  await createNotification({
    userId: testUserId,
    type: "join_request",
    referenceId,
    title: "Join request",
    body: "A traveler wants to join.",
    targetPath: "/trips/test",
  });
  await createNotification({
    userId: testUserId,
    type: "join_request",
    referenceId,
    title: "Duplicate join request",
    body: "Should be deduped.",
    targetPath: "/trips/test",
  });

  const unread = await listUnreadNotifications(testUserId);
  assert.equal(unread.length, 1);
  assert.equal(unread[0].title, "Join request");

  assert.equal(await markNotificationRead(testUserId, unread[0].id), true);
  assert.equal(await markNotificationRead(testUserId, unread[0].id), true);
  assert.deepEqual(await listUnreadNotifications(testUserId), []);

  await createNotification({
    userId: testUserId,
    type: "trip_message",
    referenceId,
    title: "Message",
    body: "New trip message.",
    targetPath: "/trips/test/chat",
  });
  await markNotificationReferenceRead(testUserId, "trip_message", referenceId);
  assert.deepEqual(await listUnreadNotifications(testUserId), []);
});

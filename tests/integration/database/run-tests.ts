import test from "node:test";
import { setupTestDatabase, teardownTestDatabase } from "./setupTestDatabase.js";

await setupTestDatabase();

test.after(async () => {
  await teardownTestDatabase();
});

await import("./likedFlightsRepository.db.test.js");
await import("./notificationRepository.db.test.js");
await import("./tripRepository.db.test.js");

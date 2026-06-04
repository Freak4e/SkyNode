# Database Integration Tests

This suite verifies persistence behavior against a real PostgreSQL database.

Unlike route integration tests, these tests do not mock repositories or SQL. They run production migrations, call real repository functions, and clean the database between tests.

## Command

```bash
TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/skynode_test npm run test:db
```

If `TEST_DATABASE_URL` is not set, the DB tests are skipped. This keeps local `npm test` usable even when PostgreSQL is not running.

## CI Behavior

GitHub Actions starts a disposable PostgreSQL 16 service and sets:

```bash
TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/skynode_test
```

That means DB tests run for real on every push and pull request.

## Active Coverage

- `likedFlightsRepository`: save, dedupe, list, and delete liked flights.
- `notificationRepository`: create, dedupe by reference, list unread, mark notification read, and mark reference read.
- `tripRepository`: save trip draft, list owner trips, load detailed itinerary content, discover public trips, apply itinerary proposal updates, and delete trips.

## Safety Rules

- Never point `TEST_DATABASE_URL` at production.
- Do not use `.env` production secrets for this suite.
- Keep database tests deterministic.
- Truncate app tables between tests.
- Use UUID-shaped fixture user IDs because production tables use UUID columns.

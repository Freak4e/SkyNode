# Integration Tests

Integration tests are reserved for backend flows that need multiple modules working together, mocked provider boundaries, or a disposable test database.

The active integration suite starts the Express app in-process and sends real HTTP requests to API endpoints. External providers are mocked at the boundary with deterministic responses.

Provider-like payloads are loaded from `tests/fixtures` when the response shape is larger than a small inline object.

Database integration tests are kept in `tests/integration/database` so route tests and persistence tests can be run independently.

## Command

```bash
npm run test:integration
```

Database integration tests:

```bash
TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/skynode_test npm run test:db
```

## Active Coverage

- `GET /api/places`: deterministic fallback when provider autocomplete fails.
- `GET /api/attractions`: missing-destination validation and fallback attractions without a Geoapify key.
- `GET /api/geocode/cities`: mocked Geoapify city mapping and duplicate filtering.
- `POST /api/directions`: one-point `none` routes, mocked OpenRouteService routes, and provider fallback.
- `GET /api/live-flights`: mocked OpenSky state mapping through the route.
- `POST /api/itineraries/generate`: invalid request validation before LLM/provider calls.
- `POST /api/chat`: route error contract for invalid chat input.
- Authenticated route guard checks for liked flights, travel missions, notifications, account, and trips.
- `/test-flight-search`: legacy redirect contract.

## Rules

Integration tests should:

- Never call paid or unstable external APIs in CI.
- Never require production secrets.
- Use deterministic fixtures from `tests/fixtures`.
- Use explicit mock boundaries for HTTP providers and database clients.
- Clean up all test data when a real test database is used.

Database integration tests should:

- Use only `TEST_DATABASE_URL`, never production `DATABASE_URL`.
- Run real migrations through `ensureSchema`.
- Truncate app tables between tests.
- Close database pools after the run.

## Fixture Usage

The helper in `tests/integration/fixtures.ts` loads JSON fixtures relative to the repository root:

```ts
const payload = readJsonFixture("maps/openrouteservice-route.json");
```

This keeps route tests close to production provider shapes without making CI depend on live services.

## Future Coverage

- `/api/flights` successful search with mocked ScrapingBee and Travelpayouts modules.
- `/api/explore` with mocked Travelpayouts deals and mocked place enrichment.
- `/api/itineraries/generate` successful generation with mocked Geoapify and LLM clients.
- Travel-mission unlock persistence against a disposable test database.
- Account deletion flow with mocked Supabase admin API and disposable database records.

Unit, route integration, and database integration commands stay separate so failures are easy to diagnose. `npm test` runs all active layers for CI.

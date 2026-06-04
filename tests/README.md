# Testing

SkyNode uses automated tests to protect backend business logic, provider normalization, route validation, and shared parsing utilities from regressions.

## Test Layers

### Unit Tests

Unit tests live in `tests/unit`.

They run offline and do not call real external services such as ScrapingBee, Travelpayouts, Geoapify, OpenSky, Hugging Face, Gemini, Ollama, Supabase, or PostgreSQL.

Current coverage includes:

- Flight parsing, duration estimation, stop detection, and Kayak route parsing.
- Live-flight telemetry formatting, airline resolution, status mapping, and sample diversification.
- Flight-search input normalization, provider/currency fallback behavior, route tagging, deduplication, and cache-key generation.
- ScrapingBee offer normalization and empty-result warnings.
- Geoapify attraction normalization, category cleanup, fallback attractions, geocoding query building, boundary distance math, and nearest-boundary selection.
- Directions route cache keying, reads, writes, rounding behavior, and expiry.
- Travelpayouts formatting, search-link creation, cheap-price normalization, and place fallback normalization.
- Itinerary request validation.
- Chat proposal parsing, cost normalization, change-intent detection, trip context generation, and fallback proposal generation.
- API route basics such as no-cache API headers, `/api` 404 JSON responses, and required flight-search query validation.
- Mission validation JSON parsing, confidence clamping, and strict acceptance rules.
- Required configuration guards for missing server environment values.

Run them with:

```bash
npm run test:unit
```

The unit command compiles TypeScript with `tsconfig.test.json`, then runs Node's built-in test runner through `tests/unit/run-tests.ts`.

### Integration Tests

Integration tests live in `tests/integration`.

They exercise Express routes and multi-module backend flows through real HTTP requests against an in-process server. Provider boundaries are mocked, so the tests remain deterministic and CI-safe.

Current integration coverage includes:

- `/api/places` fallback behavior when Travelpayouts autocomplete is unavailable.
- `/api/attractions` request validation and fallback attraction responses.
- `/api/geocode/cities` Geoapify mapping and duplicate filtering with mocked responses.
- `/api/directions` route generation for one-point days, mocked OpenRouteService routes, and provider fallback behavior.
- `/api/live-flights` OpenSky response mapping with mocked `fetch`.
- `/api/itineraries/generate` request validation before provider calls.
- `/api/chat` route error contract for invalid input.
- Auth guard behavior for liked flights, travel missions, notifications, account, and trips endpoints.
- Legacy `/test-flight-search` redirect behavior.

Run them with:

```bash
npm run test:integration
```

### Database Integration Tests

Database integration tests live in `tests/integration/database`.

They run production migrations against a disposable PostgreSQL database, execute real repository code, and truncate app tables between tests. Locally they skip unless `TEST_DATABASE_URL` is set. In GitHub Actions, PostgreSQL is started as a service and the DB tests run as part of `npm test`.

Current database coverage includes:

- Liked-flight save/list/dedupe/delete persistence.
- Notification create/list/dedupe/mark-read persistence.
- Trip save/list/detail/public discovery/proposal update/delete persistence.

Run them locally with:

```bash
TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/skynode_test npm run test:db
```

Run the complete suite with:

```bash
npm test
```

### Fixtures

Fixtures live in `tests/fixtures`.

They contain deterministic provider responses used by unit and integration tests:

- Kayak HTML snapshots.
- Travelpayouts JSON responses.
- Geoapify POI and geocoding responses.
- OpenSky state responses.
- LLM itinerary/chat JSON responses.
- Hugging Face mission validation JSON responses.

Representative fixtures are already present for flights, maps, live flights, LLM responses, and mission validation.

## Continuous Integration

The GitHub Actions workflow in `.github/workflows/ci.yml` runs on every push and pull request:

1. Install dependencies with `npm ci`.
2. Start a disposable PostgreSQL service for database integration tests.
3. Run `npm test`, which includes unit, route integration, and database integration tests.
4. Run `npm run build`.

This is the recommended quality gate before deployment. Deployment should depend on this workflow passing.

## Local Verification Checklist

Before pushing backend changes:

```bash
npm test
npm run build
```

If a change touches an external provider adapter, add or update deterministic fixtures instead of depending on live API responses.

## Secret Safety

Tests must not require real secrets. Keep `.env` local only and never commit API tokens. If a token is exposed in logs, screenshots, prompts, or commits, rotate it immediately.

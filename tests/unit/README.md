# Unit Tests

The unit test suite focuses on deterministic backend behavior that can run locally and in CI without network access or server secrets.

## Command

```bash
npm run test:unit
```

This command:

1. Compiles app and test TypeScript with `tsconfig.test.json`.
2. Emits JavaScript into `dist/test`.
3. Runs `dist/test/tests/unit/run-tests.js` with Node's built-in `node:test` APIs.

## Files

- `backend-shared.test.ts`: shared flight parsing and live-flight utility behavior.
- `backend-services.test.ts`: flight-search service helpers, cache keys, and ScrapingBee normalization.
- `backend-integrations.test.ts`: provider-normalization helpers for Geoapify, geocoding, directions, places, and Travelpayouts.
- `backend-chat-itinerary.test.ts`: itinerary validation and chat proposal helper behavior.
- `backend-routes-config.test.ts`: route guardrails, API headers, live-flight route helpers, mission validation, and required config guards.
- `run-tests.ts`: imports all unit test files so the suite can run in one Node process.

## Coverage Principles

Unit tests should:

- Be deterministic.
- Avoid real HTTP requests.
- Avoid real database connections.
- Avoid requiring `.env` secrets.
- Use inline data or files from `tests/fixtures`.
- Assert observable behavior, not implementation details that change frequently.

Unit tests may use exported `__test` objects for private backend helpers when the helper contains important logic that would otherwise require a real provider, database, or server call to exercise.

## Adding Tests

When adding backend functionality:

1. Put pure helper tests in the nearest existing unit test file.
2. Create a new `*.test.ts` file if the module has a separate domain.
3. Import the file from `run-tests.ts`.
4. Use `node:test` and `node:assert/strict`.
5. Run `npm run test:unit` for a fast unit-only check, or `npm test` before pushing.

Example:

```ts
import test from "node:test";
import assert from "node:assert/strict";

test("normalizes invalid input to a safe default", () => {
  assert.equal(normalizeValue("bad"), "default");
});
```

## CI Expectations

These tests are designed to run on every push and pull request in GitHub Actions. `npm test` runs both unit and integration tests, and a failing test should block deployment until fixed.

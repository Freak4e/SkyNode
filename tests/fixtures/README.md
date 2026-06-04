# Test Fixtures

Fixtures are deterministic input and response samples used by automated tests.

The suite uses a mix of inline data for tiny cases and fixture files for provider-like payloads. Fixture files make route and provider tests easier to review because the mocked external response shape is separated from the assertion logic.

## Structure

```text
tests/fixtures/
  flights/
    kayak-results.html
    travelpayouts-cheap-prices.json
    travelpayouts-latest-prices.json
  maps/
    geoapify-attractions.json
    geoapify-geocode.json
    openrouteservice-route.json
  live-flights/
    opensky-states.json
  llm/
    itinerary-response.json
    chat-proposal-response.json
  missions/
    huggingface-validation-accepted.json
    huggingface-validation-rejected.json
```

## Current Fixtures

- `flights/kayak-results.html`: compact Kayak-style HTML result snapshot for extraction tests.
- `flights/travelpayouts-cheap-prices.json`: cached fare response from the Travelpayouts cheap-prices shape.
- `flights/travelpayouts-latest-prices.json`: latest-price response shape used by explore/search flows.
- `maps/geoapify-attractions.json`: attraction/POI response shape.
- `maps/geoapify-geocode.json`: city geocoding response with duplicate and same-name city scenarios.
- `maps/openrouteservice-route.json`: route geometry response from OpenRouteService.
- `live-flights/opensky-states.json`: OpenSky aircraft state response.
- `llm/itinerary-response.json`: valid generated itinerary response.
- `llm/chat-proposal-response.json`: valid trip-change proposal response.
- `missions/huggingface-validation-accepted.json`: accepted mission validation response.
- `missions/huggingface-validation-rejected.json`: rejected mission validation response.

## Fixture Rules

- Keep fixtures small enough to understand in code review.
- Remove real user data, tokens, emails, and precise private locations.
- Prefer realistic provider shapes over manually simplified objects.
- Name fixtures by provider and scenario.
- Do not store `.env` values or API keys here.

## Usage

Use fixtures when:

- A provider payload is too large for an inline test object.
- The same payload is needed by multiple tests.
- A regression depends on a specific external response shape.

Inline test data is still acceptable for small objects that are easier to read directly in the test.

Integration tests can load fixtures with:

```ts
import { readJsonFixture } from "../integration/fixtures.js";

const response = readJsonFixture("maps/geoapify-geocode.json");
```

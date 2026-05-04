# Testing Strategy

Testing is planned in layers so external API instability does not block development.

## Unit Tests

- Flight result normalization.
- Kayak HTML extraction using saved fixture HTML.
- Provider selection logic.
- IATA/place validation.
- Prompt building for itinerary generation.
- LLM JSON response parsing.
- Cost calculation.

## Integration Tests

- `/api/flights` with mocked providers.
- `/api/places` with mocked autocomplete response.
- Itinerary generation with mocked Geoapify and LLM responses.
- Save/load trip flow once PostgreSQL is added.

## Manual Test Scenarios

- Valid flight search with results.
- Valid flight search with empty result.
- Invalid origin/destination/date.
- Slow provider response.
- Provider failure.
- Cached Travelpayouts data clearly labeled as cached.
- Mobile search form layout.

## Fixtures

Store deterministic examples in `tests/fixtures`:

- Provider JSON responses.
- Kayak HTML snapshots.
- LLM itinerary JSON examples.
- Geoapify attractions examples.

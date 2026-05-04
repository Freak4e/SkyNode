# API Contract Draft

Current and planned REST endpoints for the internal SkyNode API.

## Current

### GET /api/places

Query:

- `term`: city or airport search text.

Response:

```json
{
  "places": []
}
```

### GET /api/flights

Query:

- `from`: origin IATA code.
- `to`: destination IATA code.
- `date`: departure date.
- `provider`: `scrapingbee`, `travelpayouts`, or `auto`.

Response:

```json
{
  "offers": [],
  "warnings": [],
  "source": "scrapingbee"
}
```

## Planned

### POST /api/itineraries/generate

Generates a structured itinerary from destination, dates, budget, interests, flight context, and attractions.

### PATCH /api/itineraries/:tripId/days/:dayId

Manually edits one itinerary day.

### POST /api/itineraries/:tripId/days/:dayId/regenerate

Regenerates one day while preserving the rest of the itinerary.

### GET /api/attractions

Fetches destination attractions and POIs.

### POST /api/trips

Saves a trip draft.

### GET /api/trips/:tripId

Loads a saved trip.

### POST /api/chat

Applies conversational itinerary changes.

### POST /api/share-links

Creates a public read-only itinerary link.

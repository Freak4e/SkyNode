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

### GET /api/attractions

Fetches destination attractions and POIs from Geoapify.

Query:

- `destination`: destination name.

Response:

```json
{
  "attractions": [],
  "warnings": []
}
```

### POST /api/itineraries/generate

Generates a structured itinerary from destination, dates, budget, interests, flight context, and attractions.

Body:

```json
{
  "destinationCode": "LJU",
  "destinationName": "Ljubljana",
  "startDate": "2026-05-29",
  "days": 3,
  "budget": "medium",
  "pace": "balanced",
  "interests": ["culture", "food", "nature"],
  "originCode": "SKP"
}
```

Response:

```json
{
  "itinerary": {
    "destinationName": "Ljubljana",
    "days": [],
    "attractions": [],
    "estimatedTotalCost": 252,
    "generationMode": "mock"
  },
  "warnings": []
}
```

### POST /api/trips

Saves a generated trip draft to Supabase PostgreSQL.

Body:

```json
{
  "title": "Ljubljana 3-day trip",
  "destinationCode": "LJU",
  "destinationName": "Ljubljana",
  "startDate": "2026-05-29",
  "days": 3,
  "budget": "medium",
  "pace": "balanced",
  "interests": ["culture", "food"],
  "itinerary": {}
}
```

Response:

```json
{
  "tripId": "uuid",
  "savedAt": "2026-05-16T22:35:15.900Z"
}
```

## Planned

### PATCH /api/itineraries/:tripId/days/:dayId

Manually edits one itinerary day.

### POST /api/itineraries/:tripId/days/:dayId/regenerate

Regenerates one day while preserving the rest of the itinerary.

### GET /api/trips/:tripId

Loads a saved trip.

### POST /api/chat

Applies conversational itinerary changes.

### POST /api/share-links

Creates a public read-only itinerary link.

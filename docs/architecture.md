# Architecture

SkyNode is structured as a modular web application. The current implementation is a Node/Express backend with a React/Vite frontend. The folder layout intentionally separates domain modules from infrastructure so the backend can later be migrated to FastAPI if the project requirements require Python.

## Layers

```text
client UI
  -> client API wrappers
  -> server routes
  -> server services/use-cases
  -> domain modules
  -> infrastructure/providers
```

## Backend Responsibilities

- Keep API keys server-side.
- Validate user inputs.
- Select the correct provider for each use-case.
- Normalize external API responses into shared domain types.
- Cache expensive or slow provider responses when Redis is added.
- Persist users, trips, itineraries, and search history when PostgreSQL is added.

## Frontend Responsibilities

- Collect trip-planning inputs.
- Display loading, warning, empty, and success states.
- Show flight results, itinerary days, attractions, maps, and chat interactions.
- Avoid direct calls to protected third-party APIs.

## Current Modules

- `flights`: live/cached flight search and result normalization.
- `places`: city/airport autocomplete.
- `attractions`: Geoapify attraction lookup for itinerary context.
- `itineraries`: stable mock itinerary generation from trip inputs and attractions.
- `trips`: Supabase PostgreSQL persistence for saved trip drafts.

## Planned Modules

- `chat`: conversational itinerary adjustments.
- `maps`: Leaflet/Geoapify map visualization and optional OpenSky layer.
- `users`: basic profiles/auth boundary if added.

## Provider Strategy

- Travelpayouts Data API is cached fare data. It must be labeled as cached and not presented as guaranteed live availability.
- ScrapingBee/Kayak is the current live-fetch fallback/prototype source.
- Geoapify provides attractions/POIs for Sprint 2 itinerary context.
- The current itinerary generator is a mock LLM-style generator for deterministic demos.
- Future real-time Travelpayouts Search API requires marker, signature, host, and server-side request handling.
- Future LLM provider can replace the mock generator through the existing itinerary service boundary.

## Deployment Target

- Frontend: Vercel.
- Backend: Render or Railway.
- Database: PostgreSQL.
- Cache: Redis.

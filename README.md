# SkyNode

SkyNode is a bachelor-project web platform for planning short flight-based trips in Europe. The goal is to combine flight search, AI-supported itinerary generation, attractions, saved trips, and route visualization in one workflow.

## Current Sprint

Sprint 1 focuses on the foundation:

- React + TypeScript search UI.
- Express REST API.
- Airport/city autocomplete.
- Provider-based flight search architecture.
- ScrapingBee/Kayak live-fetch provider.
- Travelpayouts cached-data provider as an optional fallback.
- Shared domain/API types.
- Initial documentation and module structure for future sprints.

This is a prototype foundation, not a production booking system. The app does not sell tickets or guarantee live prices.

## Run Locally

```powershell
npm install
npm run build
npm start
```

Open `http://localhost:3000`.

For development with Vite hot reload:

```powershell
npm run dev
npm run dev:web
```

Open `http://localhost:5173`.

## Repository Structure

```text
src/
  client/                  React frontend
    api/                   Browser API clients
    components/            Current reusable UI components
    features/              Planned feature-first frontend modules
    shared/                Planned frontend utilities/design primitives
  server/                  Backend application
    routes/                HTTP route adapters
    services/              Application use-cases
    providers/             Current external flight providers
    modules/               Planned domain modules by feature
    infrastructure/        Planned database/cache/LLM/external API clients
  shared/                  Shared TypeScript domain/API types
docs/                      Architecture, sprint plan, API and data model notes
tests/                     Planned unit/integration test structure
```

## Main Request Flow

```text
React SearchForm
 -> src/client/api/flightsApi.ts
 -> GET /api/flights
 -> src/server/routes/flightsRoute.ts
 -> src/server/services/flightSearchService.ts
 -> provider integration
 -> normalized FlightSearchResponse
 -> ResultsList
```

## Planned Sprints

- Sprint 1: Flight search + architecture.
- Sprint 2: AI itinerary generation + Geoapify attractions + saved trips.
- Sprint 3: Chat adjustments, itinerary editing, cost overview, public sharing.
- Sprint 4: Map visualization, optional OpenSky traffic layer, integration tests.
- Sprint 5: UI polish, deployment, demo flow, presentation readiness.

See [docs/sprint-plan.md](docs/sprint-plan.md) and [docs/architecture.md](docs/architecture.md).

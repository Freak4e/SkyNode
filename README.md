# SkyNode

SkyNode is a bachelor-project web platform for planning short flight-based trips in Europe. It combines flight search, attraction discovery, AI-style itinerary generation, and saved trip drafts in one workflow.

## Current Sprint Status

The project is currently at the **Sprint 2 MVP** stage.

Sprint 1 established:

- React + TypeScript frontend.
- Express REST API.
- Airport/city autocomplete.
- Provider-based flight search architecture.
- ScrapingBee/Kayak live-fetch provider.
- Travelpayouts cached-data provider as optional fallback.
- Flight results page with sorting/filtering.

Sprint 2 adds:

- `/planner` page with the current SkyNode visual style.
- Route from landing page and flight results into the planner.
- Geoapify attractions integration.
- Mock itinerary generator that produces structured day-by-day plans.
- Supabase PostgreSQL persistence for saved trip drafts.
- Auto-created database tables for trips, attractions, itinerary days, and itinerary items.

This is still a planning prototype. SkyNode does not sell tickets, guarantee live prices, or make real bookings.

## Main Product Flow

```text
Landing search
 -> Search results
 -> Select and plan trip
 -> Planner page
 -> Generate itinerary
 -> Save trip draft to Supabase
```

The planner can also be opened directly from:

```text
/planner
```

## Run Locally

Create `.env` locally with:

```env
API_KEY=your_scrapingbee_key
TRAVELPAYOUTS_ACCESS_TOKEN=your_travelpayouts_token
TRAVELPAYOUTS_CURRENCY=USD
GEOAPIFY_API_KEY=your_geoapify_key
DATABASE_URL=your_supabase_postgres_pooler_url
```

Then run:

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
    components/            Reusable UI components
    pages/                 Home, search results, planner pages
    features/              Planned feature-first frontend modules
    shared/                Planned frontend utilities/design primitives
  server/                  Backend application
    routes/                Flight and place HTTP route adapters
    services/              Application use-cases
    providers/             Flight provider integrations
    modules/               Domain modules
      attractions/         Geoapify attraction discovery
      itineraries/         Mock itinerary generation
      trips/               Supabase trip persistence
    infrastructure/        Database/cache/LLM/external API clients
  shared/                  Shared TypeScript domain/API types
docs/                      Architecture, sprint plan, API and data model notes
tests/                     Planned unit/integration test structure
```

## Current API Surface

- `GET /api/places`
- `GET /api/flights`
- `GET /api/attractions`
- `POST /api/itineraries/generate`
- `POST /api/trips`

## Planned Sprints

- Sprint 1: Flight search + architecture.
- Sprint 2: Itinerary generation + Geoapify attractions + saved trip drafts.
- Sprint 3: Chat adjustments, itinerary editing, cost overview, public sharing.
- Sprint 4: Map visualization, optional OpenSky traffic layer, integration tests.
- Sprint 5: UI polish, deployment, demo flow, presentation readiness.

See [docs/sprint-plan.md](docs/sprint-plan.md), [docs/architecture.md](docs/architecture.md), and [docs/api-contract.md](docs/api-contract.md).

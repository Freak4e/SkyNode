<p align="center">
  <img src="assets/logo_skynode.png" alt="SkyNode logo" width="220" />
</p>

# SkyNode

> AI-assisted flight discovery and trip planning for fast, affordable getaways.

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=111)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=fff)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=fff)](https://vite.dev/)
[![Express](https://img.shields.io/badge/Express-API-111?logo=express&logoColor=fff)](https://expressjs.com/)
[![Supabase](https://img.shields.io/badge/Supabase-auth%20%2B%20data-3ECF8E?logo=supabase&logoColor=fff)](https://supabase.com/)

SkyNode is a full-stack travel web application for discovering flights, exploring affordable destinations, planning itineraries with AI assistance, and saving trips with collaborative context. It combines flight search, destination boards, maps, saved trips, account profiles, and an assistant-first planning flow into one travel companion.

Live app: [https://sky-node-three.vercel.app/](https://sky-node-three.vercel.app/)

---

## Table of Contents

- [Quick Start](#quick-start)
- [Prerequisites](#prerequisites)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Application Flow](#application-flow)
- [Project Documentation](#project-documentation)
- [Architecture](#architecture)
- [Project Organization](#project-organization)
- [API Surface](#api-surface)
- [Environment Variables](#environment-variables)
- [Usage](#usage)
- [Testing](#testing)
- [Quality Assurance](#quality-assurance)
- [Deployment](#deployment)
- [Known Limitations](#known-limitations)
- [Repository Structure](#repository-structure)
- [Authors](#authors)

## Quick Start

Install dependencies, create a local environment file, and start the development server:

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

Open the Vite frontend:

```text
http://localhost:5173
```

For a production-style local run:

```powershell
npm run build
npm start
```

Open the built application:

```text
http://localhost:3000
```

## Prerequisites

- Node.js 22 LTS is recommended. Node.js 21 can require additional WebSocket handling for Supabase realtime internals.
- npm for dependency installation and project scripts.
- Supabase project for authentication, PostgreSQL data, and avatar storage.
- Vercel project for production deployment.
- Optional local PostgreSQL database for database integration tests.
- Optional provider accounts and API keys for flight search, maps, routing, AI generation, travel mission validation, and live flight data.

The application can run with partial provider configuration during development, but production features depend on the required environment variables described below.

## Features

- Flight search with city and airport autocomplete.
- Passenger-aware flight pricing, where displayed fare totals reflect the selected passenger count.
- Destination discovery boards for low-fare route ideas.
- Interactive destination map with city markers, destination images, fare cards, and carousel filtering.
- AI travel assistant for itinerary questions, budget adjustments, honeymoon planning, relaxed routes, food ideas, and saved-trip context.
- Trip planner with attractions, day-by-day itinerary generation, editable plans, and trip saving.
- Saved trips, joined trips, invite links, trip visibility settings, member/chat support, and persistent access to the user's trip library.
- Community trip discovery with public trip previews, ratings, join requests, back-to-community navigation, and shared trip rooms.
- Account page with profile management, travel mission progress, trip statistics, avatar storage, and account actions.
- Live flights radar powered by OpenSky, with production traffic routed through a Cloudflare Tunnel proxy when Vercel cannot reach OpenSky reliably.
- Supabase authentication with email signup, OAuth sign-in, password recovery, and server-side account deletion.

## Tech Stack

### Frontend

- React 19
- TypeScript
- Vite
- React Router
- Tailwind CSS
- Leaflet and marker clustering
- D3, TopoJSON, and world-atlas for map/profile visualization
- Lucide React icons

### Backend

- Node.js
- Express
- TypeScript
- PostgreSQL via `pg`
- Supabase Auth and Supabase-backed trip/account workflows

### External Services

- Travelpayouts for cached flight deal data
- ScrapingBee/Kayak provider path for live flight search experiments
- Geoapify for attractions
- OpenRouteService for route directions
- OpenSky Network for aircraft telemetry, optionally reached through a Cloudflare Tunnel proxy in production
- Gemini or Ollama for AI itinerary/chat generation
- Wikipedia/Wikimedia for destination imagery

## Application Flow

### 1. Discover Flights

![SkyNode landing page flight search](docs/screenshots/01-landing.png)

Users start from the landing page by choosing where they want to fly, comparing trip ideas, and moving into flight search or planning.

### 2. Explore Affordable Destinations

![SkyNode destination discovery map and fare cards](docs/screenshots/02-destinations.png)

The Destinations page helps users pick a departure city, browse cheap route ideas, shift between cheapest and priciest offers, and inspect destination cards on the map.

### 3. Plan the Trip

![SkyNode trip planner with generated itinerary](docs/screenshots/03-planner.png)

After selecting a route, users can generate a day-by-day itinerary, review attractions, adjust plans, and save the trip.

### 4. Refine With the AI Assistant

![SkyNode AI travel assistant](docs/screenshots/04-assistant.png)

The assistant supports destination questions, budget changes, honeymoon planning, food recommendations, relaxed itineraries, and saved-trip context.

### 5. Save and Share Trips

![SkyNode saved and community trips](docs/screenshots/05-trips.png)

Registered users can save private or public trips, browse community trips, invite members, request to join shared trips, and continue planning collaboratively.

## Project Documentation

The repository includes supporting project documents and diagrams for presentation, review, and thesis-style documentation.

### Word Documents

The Word documents contain professional completion updates that cover the final project functionality, architecture decisions, data architecture, risk register, future roadmap, Scrum organization, and SonarQube quality evidence.

- [SkyNode User Manual](docs/SkyNode_User_Manual.docx)
- [SkyNode Technical Documentation](docs/SkyNode_Technical_Documentation.docx)
- [SkyNode System Limitations](docs/SkyNode_System_Limitations.docx)
- [SkyNode Future Improvements](docs/SkyNode_Future_Improvements.docx)
- [SkyNode SonarQube Report](docs/SkyNode_SonarQube_Report.docx)

### Diagrams

#### Use Case Diagram

![SkyNode use case diagram](docs/diagrams/01-UseCase.png)

#### System Structure Diagram

![SkyNode system structure diagram](docs/diagrams/02-SystemStructure.png)

#### Database Schema Diagram

![SkyNode database schema diagram](docs/diagrams/03-DbSchema.png)

#### Sequence Diagram

![SkyNode sequence diagram](docs/diagrams/04-SequenceDiagram.png)

#### Activity Diagram

![SkyNode activity diagram](docs/diagrams/05-ActivityDiagram.png)

#### Deployment Diagram

![SkyNode deployment diagram](docs/diagrams/06-DeploymentDiagram.png)

## Architecture

SkyNode is organized as a single TypeScript repository with a Vite frontend and an Express backend. The frontend talks to backend routes under `/api/*`. On Vercel, the static client is served from `dist/public`, while API requests are handled by the serverless entry in `api/[...path].ts`.

The backend keeps route adapters thin and delegates feature logic into modules, providers, and infrastructure clients. Shared request and response types live in `src/shared` so the frontend and backend stay aligned.

### Project Architecture

The application is split into four main parts:

- **Client application:** React pages, reusable UI components, API clients, authentication state, maps, forms, and trip planning screens. The client is responsible for user interaction, route navigation, rendering search results, showing destination boards, and displaying AI/trip workflows.
- **Server API:** Express routes exposed through Vercel serverless functions. This layer validates requests, protects authenticated endpoints, coordinates provider calls, and returns JSON responses to the browser.
- **Domain modules:** Feature-specific backend logic for trips, chat, account workflows, notifications, missions, geocoding, live flights, and itinerary generation. This keeps business logic separate from HTTP route wiring.
- **External services:** Supabase, Gemini/Ollama, Travelpayouts, ScrapingBee/Kayak experiments, Geoapify, OpenRouteService, Wikimedia, and OpenSky. The app treats these services as replaceable providers behind internal API routes.

This structure was chosen so the frontend never calls sensitive providers directly. Public browser code uses only safe keys such as the Supabase anon key, while server-only credentials stay inside Vercel environment variables.

### Data Architecture

SkyNode uses Supabase/PostgreSQL as the main persistent data layer. Authentication identity comes from Supabase Auth, while application data is stored through backend repositories and shared with the client through typed API responses.

The main data areas are:

- **Users and profiles:** Supabase Auth stores identity and sessions; profile/account workflows connect authenticated users to application features.
- **Trips:** Saved trips contain trip metadata, generated itinerary content, visibility settings, owner information, members, join requests, invite links, and chat context.
- **Traveler counts:** Flight passengers are used for search and total fare display. Trip travelers describe the actual planned group size. Community capacity controls how many external users can join a public trip.
- **Liked flights and planning state:** Users can save flight options and reuse them in planning flows.
- **Community data:** Public trips, joined trips, membership state, and trip messages are accessed through authenticated API routes.
- **Provider data:** Flight offers, destination imagery, map data, attractions, directions, weather, and live aircraft positions are fetched from external providers and treated as transient data unless the user saves a trip or flight.

Sensitive data is kept server-side. The client receives only the data needed for the current UI screen, and authenticated operations pass through backend middleware before reading or writing Supabase data.

### Architectural Decisions

- **React + Vite frontend:** Chosen for fast development, reusable component structure, and efficient production builds.
- **TypeScript across frontend and backend:** Chosen to reduce mismatches between API responses, shared domain types, and UI state.
- **Single repository:** Chosen because the project is a bachelor-project prototype with one deployable product. Keeping frontend, backend, shared types, docs, and scripts together makes development and review simpler.
- **Express API wrapped by Vercel serverless routes:** Chosen so the same backend app can run locally with Node and in production through Vercel. This avoids maintaining separate local and deployed API implementations.
- **Supabase for authentication and data:** Chosen to provide email/OAuth authentication, managed PostgreSQL storage, and a practical production-ready backend service without building a custom auth system.
- **Server-side provider calls:** Chosen because API keys and scraping/provider credentials must not be exposed in browser JavaScript.
- **Cloudflare Tunnel proxy for OpenSky:** Chosen because OpenSky requests from Vercel can time out or be blocked. The deployed app still exposes `/api/live-flights` on Vercel, but upstream OpenSky traffic can be routed through a controlled proxy tunnel.
- **External AI provider abstraction:** Chosen so Gemini can be used in production while Ollama remains available for local experimentation.

## Project Organization

SkyNode was organized with a lightweight Scrum workflow from **01.05.2026 to 06.06.2026**. The team worked in sprint cycles, maintained a backlog of planned work, and reviewed progress through regular communication and task tracking.

### Communication

Team communication was handled through a shared Discord workspace for daily collaboration, remote work, screen sharing, implementation discussions, and quick technical support. Communication with the professor and formal project review meetings were handled through Microsoft Teams.

This split kept development communication fast while keeping academic supervision and milestone review in the official communication channel.

### Management and Division of Work

The project used Scrum-inspired planning with a Jira board for backlog management, sprint planning, task assignment, and progress tracking. Work items were organized into statuses such as **To Do**, **In Progress**, **In Review**, and **Done** so the team could clearly see what was planned, what was actively being implemented, and what had already been completed.

![SkyNode Jira Scrum board](docs/screenshots/23-jira.png)

The Jira board helped the team coordinate frontend, backend, provider integration, testing, deployment, and documentation tasks during the sprint cycle.

| Sprint | Dates | Main focus |
|--------|-------|------------|
| Sprint 1 | 01.05.2026 - 10.05.2026 | Requirements, feature scope, first UI structure, initial architecture, database planning |
| Sprint 2 | 11.05.2026 - 17.05.2026 | Flight search, provider layer, place autocomplete, early search-result and destination-discovery work |
| Sprint 3 | 18.05.2026 - 24.05.2026 | Authentication, Supabase persistence, trip planner, itinerary generation, account workflows |
| Sprint 4 | 25.05.2026 - 31.05.2026 | AI assistant, saved trips, community trips, join requests, trip room, notifications, missions |
| Sprint 5 | 01.06.2026 - 06.06.2026 | Vercel deployment, OpenSky proxy tunnel, production fixes, testing, documentation, diagrams, final polish |

The work process followed this rhythm:

- Define and prioritize backlog items before each sprint.
- Assign implementation tasks through Jira and keep progress visible on the board.
- Implement features in small commits and verify them locally.
- Use Discord for daily collaboration and screen-sharing support.
- Review progress and blockers through Microsoft Teams when formal coordination was needed.
- Adjust the scope when external services caused deployment or timeout issues.
- Document architecture, diagrams, limitations, and future improvements before final delivery.

## API Surface

- `GET /api/places`
- `GET /api/flights`
- `GET /api/liked-flights`
- `POST /api/liked-flights`
- `DELETE /api/liked-flights/:id`
- `GET /api/explore`
- `GET /api/live-flights`
- `GET /api/attractions`
- `POST /api/geocode`
- `GET /api/geocode/cities`
- `POST /api/directions`
- `POST /api/itineraries/generate`
- `GET /api/trips`
- `POST /api/trips`
- `GET /api/trips/public`
- `GET /api/trips/public/:tripId/preview`
- `GET /api/trips/join/:token`
- `GET /api/trips/joined`
- `PATCH /api/trips/profile`
- `GET /api/trips/:tripId`
- `DELETE /api/trips/:tripId`
- `POST /api/trips/:tripId/join`
- `PUT /api/trips/:tripId/rating`
- `PATCH /api/trips/:tripId/settings`
- `GET /api/trips/:tripId/members`
- `PATCH /api/trips/:tripId/members/:memberId`
- `GET /api/trips/:tripId/messages`
- `POST /api/trips/:tripId/messages`
- `PATCH /api/trips/:tripId/itinerary`
- `POST /api/chat`
- `POST /api/auth/password-reset`
- `DELETE /api/account`
- `GET /api/notifications/unread`
- `PATCH /api/notifications/:notificationId/read`
- `PATCH /api/notifications/references/:type/:referenceId/read`
- `GET /api/travel-missions/unlocks`
- `POST /api/travel-missions/submit`
- `GET /api/travel-missions/users/:userId/stats`

## Environment Variables

Create a local `.env` file from `.env.example`. Do not commit real secrets.

```powershell
Copy-Item .env.example .env
```

Important environment rules:

| Rule | Explanation |
|------|-------------|
| `VITE_*` variables are public | They are embedded into browser JavaScript during the Vite build. |
| Server secrets must not use `VITE_` | Keys such as `SUPABASE_SECRET_KEY`, provider tokens, and database URLs must stay server-only. |
| Vercel needs production variables | Variables used by the deployed app must exist in Vercel Project Settings or GitHub Actions secrets, depending on the deployment flow. |
| Test database is separate | `TEST_DATABASE_URL` should point to a disposable local/test database, never production. |

Core variables used by the application:

```env
# Flight providers
API_KEY=your_scrapingbee_or_primary_flight_provider_key
TRAVELPAYOUTS_ACCESS_TOKEN=your_travelpayouts_access_token
TRAVELPAYOUTS_CURRENCY=USD

# Maps, places, and routing
GEOAPIFY_API_KEY=your_geoapify_key
OPENROUTESERVICE_API_KEY=your_openrouteservice_key
OPENROUTESERVICE_PROFILE=foot-walking
OPENROUTESERVICE_TIMEOUT_MS=15000

# Database and Supabase
DataBase_PW=your_supabase_database_password
DATABASE_URL=postgresql://postgres.your-project-ref:your-password@your-supabase-pooler-host:5432/postgres
VITE_SUPABASE_URL=https://your-project-ref.supabase.co/
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SECRET_KEY=your_server_only_supabase_service_role_key
VITE_SUPABASE_AVATAR_BUCKET=profile-avatars

# OpenSky live flights
OPENSKY_CLIENT_ID=your_opensky_client_id
OPENSKY_CLIENT_SECRET=your_opensky_client_secret
OPENSKY_TIMEOUT_MS=12000

# Optional OpenSky proxy/tunnel for Vercel production
OPENSKY_API_URL=https://your-cloudflare-tunnel.trycloudflare.com/api
OPENSKY_TOKEN_URL=https://your-cloudflare-tunnel.trycloudflare.com/auth/realms/opensky-network/protocol/openid-connect/token
OPENSKY_USE_AUTH=false
OPENSKY_PROXY_SECRET=your_long_random_proxy_secret
OPENSKY_AUTH_TIMEOUT_MS=2500

# AI provider
LLM_PROVIDER=gemini
GEMINI_API_KEY=your_google_ai_studio_key
GEMINI_MODEL=gemini-2.5-flash
GEMINI_API_URL=https://generativelanguage.googleapis.com/v1beta
GEMINI_THINKING_BUDGET=0
GEMINI_TIMEOUT_MS=120000

# Optional local AI provider
OLLAMA_BASE_URL=http://localhost:11434/
OLLAMA_MODEL=llama3:latest
OLLAMA_TIMEOUT_MS=300000

# Travel proof / mission validation
HUGGINGFACE_API_TOKEN=your_huggingface_api_token
HUGGINGFACE_VISION_MODEL=Qwen/Qwen3-VL-8B-Instruct

# Public app URL
VITE_PUBLIC_SITE_URL=https://sky-node-three.vercel.app

# Test database
TEST_DATABASE_URL=postgres://postgres:your_test_password@localhost:5432/skynode_test
```

`VITE_SUPABASE_ANON_KEY` is safe for the browser. `SUPABASE_SECRET_KEY` is not safe for the browser and must never be exposed with a `VITE_` prefix.

Profile pictures are stored in Supabase Storage. Create a public bucket named `profile-avatars` or set `VITE_SUPABASE_AVATAR_BUCKET` to your bucket name. Authenticated users need permission to upload and update files under their own user-id folder.

Recommended Storage policies for `storage.objects`:

```sql
create policy "Public avatar read"
on storage.objects for select
using (bucket_id = 'profile-avatars');

create policy "Users upload own avatar"
on storage.objects for insert
to authenticated
with check (bucket_id = 'profile-avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users update own avatar"
on storage.objects for update
to authenticated
using (bucket_id = 'profile-avatars' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'profile-avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users delete own avatar"
on storage.objects for delete
to authenticated
using (bucket_id = 'profile-avatars' and (storage.foldername(name))[1] = auth.uid()::text);
```

For Supabase email confirmation in production, configure:

- Site URL: `https://sky-node-three.vercel.app`
- Redirect URLs: `https://sky-node-three.vercel.app/*`

## Usage

Run the development server with Vite hot reload:

```powershell
npm run dev
```

Open:

```text
http://localhost:5173
```

Run the web-only development server when the backend is already running separately:

```powershell
npm run dev:web
```

Build and run the production server locally:

```powershell
npm run build
npm start
```

Open:

```text
http://localhost:3000
```

If using Ollama locally, pull the configured model first:

```powershell
ollama pull llama3:latest
```

## Testing

The repository includes unit, integration, and optional database integration tests. The test suite is designed so CI can run deterministic checks without requiring real third-party provider calls.

### Unit Tests

Unit tests cover backend service logic, itinerary/chat behavior, provider normalization, validation helpers, and shared parsing utilities.

```powershell
npm run test:unit
```

### Integration Tests

Integration tests exercise backend API route behavior with controlled helpers and fixtures.

```powershell
npm run test:integration
```

### Database Integration Tests

Database tests verify repository behavior against a real PostgreSQL database. These tests are skipped automatically when `TEST_DATABASE_URL` is not set.

```powershell
$env:TEST_DATABASE_URL="postgres://postgres:your_test_password@localhost:5432/skynode_test"
npm run test:db
```

Database test guidance:

- Use a dedicated database such as `skynode_test`.
- Never point `TEST_DATABASE_URL` to production.
- The tests clean and seed the data they need.
- Run them before changing repository contracts, trip persistence, notifications, or liked-flight storage.

### Production Build Check

The production build validates TypeScript and Vite bundling:

```powershell
npm run build
```

## Quality Assurance

SkyNode uses several quality checks before deployment:

- TypeScript compilation through the production build.
- Unit tests for backend functionality and shared utilities.
- Integration tests for backend API route behavior.
- Optional PostgreSQL integration tests for repositories.
- SonarQube local code-quality review documented in [SkyNode SonarQube Report](docs/SkyNode_SonarQube_Report.docx).
- Manual user-flow verification documented through the user manual and screenshots.

Security and configuration notes:

- Supabase anon key is public by design and may use the `VITE_` prefix.
- Supabase service-role key, database URL, provider tokens, and AI keys are server-only secrets.
- Authenticated API routes use backend middleware before reading or writing protected user data.
- Avatar uploads are restricted with Supabase Storage policies under the signed-in user's folder.

## Deployment

SkyNode is configured for Vercel:

- Build command: `npm run build`
- Output directory: `dist/public`
- API function: `api/[...path].ts`
- SPA fallback rewrite to `index.html`

Production deployments can be handled through GitHub Actions and the Vercel CLI. Vercel Git auto-deployment can be disabled in `vercel.json` to avoid duplicate deployments when a CI/CD workflow already deploys on push.

Required production environment variables should be added in Vercel Project Settings or provided by GitHub Actions secrets before `vercel build`. Never upload `.env` to Git.

Typical deployment flow:

1. Push changes to GitHub.
2. GitHub Actions installs dependencies.
3. CI checks required public build variables.
4. The project is built with `vercel build --prod`.
5. The generated Vercel output is deployed with `vercel deploy --prebuilt --prod`.

### OpenSky proxy tunnel for production

Live flight requests always enter the app through Vercel at `/api/live-flights`. In production, the backend can then forward the upstream OpenSky request through a small local proxy exposed with Cloudflare Tunnel. This avoids the Vercel-to-OpenSky timeout/blocking issue while keeping the public app URL unchanged.

**Local development (`npm run dev`):** do not use the tunnel. Your machine talks to OpenSky directly through the default `OPENSKY_API_URL`. Set the tunnel URL only in **Vercel** for the deployed site, unless you are testing the proxy itself.

1. Install [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/). If `cloudflared` is not on your PATH (common on Windows), add to `.env`:

```env
CLOUDFLARED_PATH=C:\Cloudflared\cloudflared.exe
```

2. In `.env` on the laptop, set `OPENSKY_PROXY_SECRET` to a long random string.
3. Terminal A:

```powershell
npm run opensky:proxy
```

4. Terminal B:

```powershell
npm run opensky:tunnel
```

Copy the `https://....trycloudflare.com` URL from the tunnel output.

5. In Vercel -> Environment Variables (Production):

| Variable | Example |
|----------|---------|
| `OPENSKY_API_URL` | `https://YOUR-TUNNEL.trycloudflare.com/api` (must end with `/api`, not the tunnel root alone) |
| `OPENSKY_TOKEN_URL` | `https://YOUR-TUNNEL.trycloudflare.com/auth/realms/opensky-network/protocol/openid-connect/token` (only if `OPENSKY_USE_AUTH=true`) |
| `OPENSKY_PROXY_SECRET` | Same value as on the laptop |
| `OPENSKY_CLIENT_ID` / `OPENSKY_CLIENT_SECRET` | If using authenticated OpenSky |

Redeploy after changing env vars. Keep the proxy machine awake while live radar is needed. Quick Cloudflare tunnels get a new URL each run, so update `OPENSKY_API_URL` in Vercel whenever the tunnel URL changes.

## Known Limitations

- SkyNode does not sell tickets or complete bookings. It helps users discover, compare, and plan.
- Flight prices and route availability depend on third-party providers and may change.
- OpenSky live aircraft data can be unreliable from serverless environments. Use the laptop proxy + Cloudflare Tunnel above, or accept an empty live radar when OpenSky does not respond from Vercel.
- AI-generated itineraries should be reviewed by the user before travel.

## Repository Structure

```text
api/
  [...path].ts              Vercel serverless API entry
src/
  client/                   React frontend
    api/                    Browser API clients
    auth/                   Supabase auth context/session helpers
    components/             Shared UI and layout components
    features/               Feature-specific frontend modules
    pages/                  Main application pages
    utils/                  Browser utilities
  server/                   Express backend
    infrastructure/         Database, LLM, and external API clients
    middleware/             Auth and request middleware
    modules/                Domain modules such as trips, chat, account
    providers/              Flight provider integrations
    routes/                 HTTP route adapters
    services/               Application services
  shared/                   Shared TypeScript types and utilities
docs/                       Architecture and sprint notes
dist/                       Generated build output
```

## Presentation

The final project presentation is available in the documentation folder:

- [SkyNode Presentation](docs/SkyNode_Presentation.pptx)

Open the PowerPoint file locally or download it from the repository to review the project overview, implementation summary, diagrams, and final delivery material.

## Authors

SkyNode was developed as a final bachelor’s project by a team:

- [Konstantin Mihajlov](https://github.com/kmihajlov)
- [Anja Todorov](https://github.com/AnjaTodorov)
- [Matej Filipov](https://github.com/Freak4e)

---

Built for fast travel planning, affordable discovery, and AI-assisted trip decisions.

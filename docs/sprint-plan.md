# Sprint Plan

SkyNode was organized as five Scrum-style iterations from 01.05.2026 to 06.06.2026. The first sprint covered 01.05-10.05, and the remaining work followed weekly sprint cycles until final delivery. Planning, review, and blocker discussions were handled through repository updates, backlog notes, and Microsoft Teams calls.

## Sprint 1: 01.05.2026 - 10.05.2026

Expected result: define the scope, establish the base architecture, and prepare the first user-facing structure.

- Requirements and feature scope.
- Initial React/Vite frontend structure.
- Initial Express/API architecture.
- Database planning and data-model notes.
- First flight search and place-autocomplete direction.
- Initial documentation and repository organization.

## Sprint 2: 11.05.2026 - 17.05.2026

Expected result: the user can search for flights and start exploring destinations.

- Flight search UI and API integration.
- City and airport autocomplete.
- Provider layer for Travelpayouts and ScrapingBee/Kayak experiments.
- Normalized flight result cards.
- Destination discovery concepts and map-based route ideas.
- Early filtering, sorting, loading, and empty states.

## Sprint 3: 18.05.2026 - 24.05.2026

Expected result: authentication, persistence, and itinerary planning become usable.

- Supabase authentication and session handling.
- Supabase PostgreSQL persistence for saved trips.
- Trip planner flow with destination, dates, travelers, budget, pace, and interests.
- Geoapify attractions and geocoding support.
- AI itinerary generation with Gemini/Ollama provider boundary.
- Account/profile workflows.

## Sprint 4: 25.05.2026 - 31.05.2026

Expected result: saved trips become collaborative and AI assistance becomes more complete.

- General and trip-context AI assistant.
- Saved trip library and joined trip access.
- Community trips, public previews, ratings, and join requests.
- Trip room with itinerary, calendar, members, settings, and chat.
- Persistent notifications for trip/member events.
- Travel proof missions and profile statistics.

## Sprint 5: 01.06.2026 - 06.06.2026

Expected result: deployed demo version, production fixes, testing, and final documentation.

- Vercel deployment and serverless routing fixes.
- OpenSky live-flight radar hardening and Cloudflare Tunnel proxy workaround.
- Passenger-aware flight total pricing and traveler/capacity wording cleanup.
- Community and trip-library UX polish.
- README, Word reports, diagrams, screenshots, and presentation documentation.
- SonarQube review, tests, and production build verification.

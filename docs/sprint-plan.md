# Sprint Plan

The project is planned as five short Scrum-style iterations.

## Sprint 1: Flight Search + Architecture

Expected result: the user searches for flights and sees normalized results.

- Flight search UI.
- Airport/city autocomplete.
- REST endpoint for flight search.
- Provider layer for Travelpayouts and ScrapingBee.
- Initial filtering/sorting structure.
- Initial data model notes.
- Unit/integration test structure.

## Sprint 2: Itinerary + Attractions

Expected result: the user generates a daily itinerary from a selected destination/flight context.

- Geoapify Places integration.
- LLM prompt builder.
- Structured JSON itinerary response.
- Itinerary display UI.
- Save trip draft to PostgreSQL.

## Sprint 3: Editing + Chat + Sharing

Expected result: the generated itinerary can be adjusted and shared.

- Chat interface for itinerary modifications.
- Manual day editing.
- Regenerate one itinerary day.
- Approximate cost overview.
- Public share link.

## Sprint 4: Visualization + Reliability

Expected result: improved reliability and route/location visualization.

- Leaflet route and POI map.
- Optional OpenSky general flight traffic layer.
- Redis caching.
- Integration tests with mocked provider responses.
- Better error and empty states.

## Sprint 5: Polish + Deployment + Presentation

Expected result: stable demo version ready for presentation.

- Vercel frontend deployment.
- Render/Railway backend deployment.
- UI/UX polish and mobile responsiveness.
- Demo scenario.
- Final README and presentation support.

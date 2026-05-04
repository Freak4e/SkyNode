# Flights Module

Owns flight-search use-cases.

Current implementation still lives in:

- `src/server/services/flightSearchService.ts`
- `src/server/providers`
- `src/scrapingbee.ts`
- `src/travelpayouts.ts`
- `src/extract.ts`

Future cleanup can move those files here when the module is expanded.

Planned responsibilities:

- Search input validation.
- Flight provider selection.
- Result normalization.
- Sorting and filtering.
- Search history persistence.
- Redis caching for slow provider responses.

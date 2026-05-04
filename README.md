# SkyNode Flight Prototype

First iteration goal: provide a small browser UI for searching flights without manually typing provider URLs.

## Current Search Flow

1. React form collects origin, destination, date, and provider.
2. `/api/places` resolves city/airport names to IATA codes.
3. `/api/flights` validates the search request.
4. `flightSearchService` chooses a provider.
5. The provider returns normalized `FlightOffer` objects for the UI.

## Providers

- `scrapingbee`: live fetch through ScrapingBee against Kayak search results. This is the default path.
- `travelpayouts`: Travelpayouts Data API cached fare data. This is not live flight search.
- `auto`: tries live ScrapingBee first, then checks cached Travelpayouts data only if no live offers are extracted.

## Structure

- `src/server/app.ts`: Express app composition.
- `src/server/routes`: HTTP routes only.
- `src/server/services`: application/business flow.
- `src/server/providers`: external provider integrations.
- `src/shared/types.ts`: shared API response and domain types.
- `src/client/api`: frontend API calls.
- `src/client/components`: reusable React components.

## Run

```powershell
npm install
npm run build
npm start
```

Open `http://localhost:3000`.

For UI development with hot reload:

```powershell
npm run dev
npm run dev:web
```

Open `http://localhost:5173`.

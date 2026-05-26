import { getDatabasePool, query } from "../../infrastructure/database/client.js";
import { ensureSchema } from "../../infrastructure/database/schema.js";
import type {
  Attraction,
  BudgetLevel,
  FlightOffer,
  GeneratedItinerary,
  ItineraryDay,
  ItineraryItem,
  SaveTripRequest,
  SaveTripResponse,
  SavedTripDetail,
  SavedTripSummary,
  TravelPace,
  TripChangeProposal,
} from "../../../shared/types.js";

type TripRow = {
  id: string;
  created_at: string;
};

type DayRow = {
  id: string;
};

type TripSummaryRow = {
  id: string;
  title: string;
  origin_code: string | null;
  destination_code: string;
  destination_name: string;
  start_date: string;
  days: number;
  budget: BudgetLevel;
  pace: TravelPace;
  interests: string[];
  selected_flight?: FlightOffer | null;
  estimated_total_cost: number;
  created_at: string;
};

type AttractionRow = {
  external_id: string | null;
  name: string;
  category: string | null;
  address: string | null;
  lat: number | null;
  lon: number | null;
  source: "geoapify" | "mock";
};

type ItineraryDayRow = {
  id: string;
  day_number: number;
  title: string;
  summary: string;
  estimated_cost: number;
};

type ItineraryItemRow = {
  itinerary_day_id: string;
  time_of_day: ItineraryItem["timeOfDay"];
  title: string;
  description: string;
  attraction_name: string | null;
  estimated_cost: number;
  sort_order: number;
};

export async function saveTripDraft(request: SaveTripRequest): Promise<SaveTripResponse> {
  await ensureSchema();

  const tripResult = await query<TripRow>(
    `
      insert into trips (
        title,
        origin_code,
        destination_code,
        destination_name,
        start_date,
        days,
        budget,
        pace,
        interests,
        selected_flight,
        estimated_total_cost
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      returning id, created_at
    `,
    [
      request.title,
      request.originCode || null,
      request.destinationCode,
      request.destinationName,
      request.startDate,
      request.days,
      request.budget,
      request.pace,
      request.interests,
      request.selectedFlight ? JSON.stringify(request.selectedFlight) : null,
      request.itinerary.estimatedTotalCost,
    ],
  );
  const trip = tripResult.rows[0];

  for (const attraction of request.itinerary.attractions) {
    await query(
      `
        insert into trip_attractions (trip_id, external_id, name, category, address, lat, lon, source)
        values ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
      [
        trip.id,
        attraction.id,
        attraction.name,
        attraction.category,
        attraction.address,
        attraction.lat ?? null,
        attraction.lon ?? null,
        attraction.source,
      ],
    );
  }

  for (const day of request.itinerary.days) {
    const dayResult = await query<DayRow>(
      `
        insert into itinerary_days (trip_id, day_number, title, summary, estimated_cost)
        values ($1, $2, $3, $4, $5)
        returning id
      `,
      [trip.id, day.dayNumber, day.title, day.summary, day.estimatedCost],
    );
    const savedDay = dayResult.rows[0];

    for (const [index, item] of day.items.entries()) {
      await query(
        `
          insert into itinerary_items (
            itinerary_day_id,
            time_of_day,
            title,
            description,
            attraction_name,
            estimated_cost,
            sort_order
          )
          values ($1, $2, $3, $4, $5, $6, $7)
        `,
        [
          savedDay.id,
          item.timeOfDay,
          item.title,
          item.description,
          item.attractionName || null,
          item.estimatedCost,
          index,
        ],
      );
    }
  }

  return {
    tripId: trip.id,
    savedAt: trip.created_at,
  };
}

export async function listTrips(): Promise<SavedTripSummary[]> {
  await ensureSchema();

  const result = await query<TripSummaryRow>(
    `
      select
        id,
        title,
        origin_code,
        destination_code,
        destination_name,
        start_date::text,
        days,
        budget,
        pace,
        interests,
        estimated_total_cost,
        created_at::text
      from trips
      order by created_at desc
      limit 30
    `,
  );

  return result.rows.map(mapTripSummary);
}

export async function getTripById(tripId: string): Promise<SavedTripDetail | null> {
  await ensureSchema();

  const tripResult = await query<TripSummaryRow>(
    `
      select
        id,
        title,
        origin_code,
        destination_code,
        destination_name,
        start_date::text,
        days,
        budget,
        pace,
        interests,
        selected_flight,
        estimated_total_cost,
        created_at::text
      from trips
      where id = $1
      limit 1
    `,
    [tripId],
  );
  const trip = tripResult.rows[0];

  if (!trip) {
    return null;
  }

  const [attractionsResult, daysResult, itemsResult] = await Promise.all([
    query<AttractionRow>(
      `
        select external_id, name, category, address, lat, lon, source
        from trip_attractions
        where trip_id = $1
        order by created_at asc
      `,
      [tripId],
    ),
    query<ItineraryDayRow>(
      `
        select id, day_number, title, summary, estimated_cost
        from itinerary_days
        where trip_id = $1
        order by day_number asc
      `,
      [tripId],
    ),
    query<ItineraryItemRow>(
      `
        select
          itinerary_day_id,
          time_of_day,
          title,
          description,
          attraction_name,
          estimated_cost,
          sort_order
        from itinerary_items
        where itinerary_day_id in (
          select id from itinerary_days where trip_id = $1
        )
        order by sort_order asc
      `,
      [tripId],
    ),
  ]);

  const attractions = attractionsResult.rows.map(mapAttraction);
  const itemsByDay = new Map<string, ItineraryItem[]>();

  for (const item of itemsResult.rows) {
    const items = itemsByDay.get(item.itinerary_day_id) || [];
    items.push({
      timeOfDay: item.time_of_day,
      title: item.title,
      description: item.description,
      attractionName: item.attraction_name || undefined,
      estimatedCost: item.estimated_cost,
    });
    itemsByDay.set(item.itinerary_day_id, items);
  }

  const itineraryDays: ItineraryDay[] = daysResult.rows.map((day) => ({
    dayNumber: day.day_number,
    title: day.title,
    summary: day.summary,
    estimatedCost: day.estimated_cost,
    items: itemsByDay.get(day.id) || [],
  }));
  const itinerary: GeneratedItinerary = {
    destinationName: trip.destination_name,
    startDate: trip.start_date,
    days: itineraryDays,
    attractions,
    estimatedTotalCost: trip.estimated_total_cost,
    generationMode: "ollama",
  };

  return {
    ...mapTripSummary(trip),
    selectedFlight: trip.selected_flight || undefined,
    itinerary,
  };
}

export async function applyTripChangeProposal(
  tripId: string,
  proposal: TripChangeProposal,
): Promise<SavedTripDetail | null> {
  await ensureSchema();

  const pool = getDatabasePool();
  const client = await pool.connect();

  try {
    await client.query("begin");

    const tripResult = await client.query<TripRow>(
      `
        update trips
        set estimated_total_cost = $2,
            updated_at = now()
        where id = $1
        returning id, created_at
      `,
      [tripId, proposal.itinerary.estimatedTotalCost],
    );

    if (!tripResult.rows[0]) {
      await client.query("rollback");
      return null;
    }

    await client.query(
      `
        delete from itinerary_days
        where trip_id = $1
      `,
      [tripId],
    );

    for (const day of proposal.itinerary.days) {
      const dayResult = await client.query<DayRow>(
        `
          insert into itinerary_days (trip_id, day_number, title, summary, estimated_cost)
          values ($1, $2, $3, $4, $5)
          returning id
        `,
        [tripId, day.dayNumber, day.title, day.summary, day.estimatedCost],
      );
      const savedDay = dayResult.rows[0];

      for (const [index, item] of day.items.entries()) {
        await client.query(
          `
            insert into itinerary_items (
              itinerary_day_id,
              time_of_day,
              title,
              description,
              attraction_name,
              estimated_cost,
              sort_order
            )
            values ($1, $2, $3, $4, $5, $6, $7)
          `,
          [
            savedDay.id,
            item.timeOfDay,
            item.title,
            item.description,
            item.attractionName || null,
            item.estimatedCost,
            index,
          ],
        );
      }
    }

    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }

  return getTripById(tripId);
}

function mapTripSummary(row: TripSummaryRow): SavedTripSummary {
  return {
    id: row.id,
    title: row.title,
    originCode: row.origin_code || undefined,
    destinationCode: row.destination_code,
    destinationName: row.destination_name,
    startDate: row.start_date,
    days: row.days,
    budget: row.budget,
    pace: row.pace,
    interests: row.interests || [],
    estimatedTotalCost: row.estimated_total_cost,
    createdAt: row.created_at,
  };
}

function mapAttraction(row: AttractionRow): Attraction {
  return {
    id: row.external_id || row.name,
    name: row.name,
    category: row.category || "Attraction",
    address: row.address || "",
    lat: row.lat || undefined,
    lon: row.lon || undefined,
    source: row.source,
  };
}

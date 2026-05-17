import { query } from "../../infrastructure/database/client.js";
import { ensureSchema } from "../../infrastructure/database/schema.js";
import type { SaveTripRequest, SaveTripResponse } from "../../../shared/types.js";

type TripRow = {
  id: string;
  created_at: string;
};

type DayRow = {
  id: string;
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

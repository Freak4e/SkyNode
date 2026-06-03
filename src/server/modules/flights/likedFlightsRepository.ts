import { likedFlightFingerprint } from "../../../shared/likedFlights.js";
import type { FlightOffer, LikedFlight, SaveLikedFlightRequest } from "../../../shared/types.js";
import { ensureSchema } from "../../infrastructure/database/schema.js";
import { query } from "../../infrastructure/database/client.js";

type LikedFlightRow = {
  id: string;
  outbound: FlightOffer;
  inbound: FlightOffer | null;
  trip_type: "one-way" | "return";
  departure_date: string;
  return_date: string | null;
  total_price_text: string | null;
  fingerprint: string;
  created_at: string;
};

function toLikedFlight(row: LikedFlightRow): LikedFlight {
  return {
    id: row.id,
    outbound: row.outbound,
    inbound: row.inbound || undefined,
    tripType: row.trip_type,
    departureDate: row.departure_date,
    returnDate: row.return_date || undefined,
    totalPriceText: row.total_price_text || undefined,
    fingerprint: row.fingerprint,
    createdAt: row.created_at,
  };
}

export async function listLikedFlights(userId: string): Promise<LikedFlight[]> {
  await ensureSchema();

  const result = await query<LikedFlightRow>(
    `
      select id, outbound, inbound, trip_type, departure_date, return_date, total_price_text, fingerprint, created_at
      from liked_flights
      where user_id = $1
      order by created_at desc
    `,
    [userId],
  );

  return result.rows.map(toLikedFlight);
}

export async function saveLikedFlight(userId: string, request: SaveLikedFlightRequest): Promise<LikedFlight> {
  await ensureSchema();

  const fingerprint = likedFlightFingerprint(request);
  const result = await query<LikedFlightRow>(
    `
      insert into liked_flights (
        user_id,
        fingerprint,
        outbound,
        inbound,
        trip_type,
        departure_date,
        return_date,
        total_price_text
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8)
      on conflict (user_id, fingerprint)
      do update set updated_at = now()
      returning id, outbound, inbound, trip_type, departure_date, return_date, total_price_text, fingerprint, created_at
    `,
    [
      userId,
      fingerprint,
      JSON.stringify(request.outbound),
      request.inbound ? JSON.stringify(request.inbound) : null,
      request.tripType,
      request.departureDate,
      request.returnDate || null,
      request.totalPriceText || null,
    ],
  );

  return toLikedFlight(result.rows[0]);
}

export async function deleteLikedFlight(userId: string, likedFlightId: string): Promise<boolean> {
  await ensureSchema();

  const result = await query(
    "delete from liked_flights where id = $1 and user_id = $2",
    [likedFlightId, userId],
  );

  return (result.rowCount || 0) > 0;
}

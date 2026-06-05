import {
  countAcceptedMembers,
  createInviteToken,
  createOwnerMembership,
  getOwnerProfile,
  getTripSocialMeta,
  getTripSocialMetaByToken,
  listPublicTrips,
  resolveTripAccess,
} from "./tripSocialRepository.js";
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
  TripVisibility,
  UserProfileSnapshot,
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
  selected_flights?: FlightOffer[] | null;
  budget_amount?: number | null;
  travelers?: number | null;
  route_segments?: SavedTripSummary["routeSegments"] | null;
  expense_breakdown?: SavedTripSummary["expenseBreakdown"] | null;
  cities?: SavedTripSummary["cities"] | null;
  hotels?: SavedTripSummary["hotels"] | null;
  budget_categories?: SavedTripSummary["budgetCategories"] | null;
  notes?: string | null;
  tags?: string[] | null;
  estimated_total_cost: number;
  generation_mode?: GeneratedItinerary["generationMode"] | null;
  visibility?: TripVisibility | null;
  invite_token?: string | null;
  description?: string | null;
  max_members?: number | null;
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
  category: string | null;
  location_name: string | null;
  location_address: string | null;
  location_city: string | null;
  location_lat: number | null;
  location_lon: number | null;
  notes: string | null;
  tags: string[] | null;
  estimated_cost: number;
  item_order: number | null;
  sort_order: number;
};

export async function saveTripDraft(request: SaveTripRequest, userId: string): Promise<SaveTripResponse> {
  await ensureSchema();

  const visibility: TripVisibility = request.visibility || "private";
  const inviteToken = createInviteToken();
  const maxMembers = Math.max(2, Math.min(20, request.maxMembers || 8));
  const ownerProfile: UserProfileSnapshot = request.ownerProfile || { displayName: "Traveler" };

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
        selected_flights,
        budget_amount,
        travelers,
        route_segments,
        expense_breakdown,
        cities,
        hotels,
        budget_categories,
        notes,
        tags,
        estimated_total_cost,
        generation_mode,
        user_id,
        visibility,
        invite_token,
        description,
        max_members
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27)
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
      request.selectedFlights ? JSON.stringify(request.selectedFlights) : null,
      request.budgetAmount ?? null,
      request.travelers ?? 1,
      request.routeSegments ? JSON.stringify(request.routeSegments) : null,
      request.expenseBreakdown ? JSON.stringify(request.expenseBreakdown) : null,
      request.cities ? JSON.stringify(request.cities) : null,
      request.hotels ? JSON.stringify(request.hotels) : null,
      request.budgetCategories ? JSON.stringify(request.budgetCategories) : null,
      request.notes || null,
      request.tags || [],
      request.itinerary.estimatedTotalCost,
      request.itinerary.generationMode,
      userId,
      visibility,
      inviteToken,
      request.description || null,
      maxMembers,
    ],
  );
  const trip = tripResult.rows[0];

  await createOwnerMembership(trip.id, userId, ownerProfile);

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
            category,
            location_name,
            location_address,
            location_city,
            location_lat,
            location_lon,
            notes,
            tags,
            estimated_cost,
            item_order,
            sort_order
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        `,
        [
          savedDay.id,
          item.timeOfDay,
          item.title,
          item.description,
          item.attractionName || null,
          item.category || null,
          item.location?.name || item.attractionName || null,
          item.location?.address || null,
          item.location?.city || null,
          item.location?.lat ?? null,
          item.location?.lon ?? null,
          item.notes || null,
          item.tags || [],
          item.estimatedCost,
          item.order ?? index,
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

export async function listTrips(userId: string): Promise<SavedTripSummary[]> {
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
        budget_amount,
        travelers,
        route_segments,
        expense_breakdown,
        cities,
        hotels,
        budget_categories,
        notes,
        tags,
        estimated_total_cost,
        visibility,
        invite_token,
        description,
        max_members,
        created_at::text
      from trips
      where user_id = $1
      order by created_at desc
      limit 30
    `,
    [userId],
  );

  return Promise.all(result.rows.map(async (row) => enrichTripSummary(mapTripSummary(row), userId, true)));
}

export async function listJoinedTrips(userId: string): Promise<SavedTripSummary[]> {
  await ensureSchema();

  const { listJoinedTripIds } = await import("./tripSocialRepository.js");
  const tripIds = await listJoinedTripIds(userId);

  if (!tripIds.length) {
    return [];
  }

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
        budget_amount,
        travelers,
        route_segments,
        expense_breakdown,
        cities,
        hotels,
        budget_categories,
        notes,
        tags,
        estimated_total_cost,
        visibility,
        invite_token,
        description,
        max_members,
        created_at::text
      from trips
      where id = any($1::uuid[])
      order by created_at desc
    `,
    [tripIds],
  );

  return Promise.all(result.rows.map(async (row) => enrichTripSummary(mapTripSummary(row), userId, false)));
}

export async function listDiscoverableTrips(
  filters: { destination?: string; budget?: string; includePast?: boolean; ownerId?: string; pace?: string },
  userId?: string,
): Promise<SavedTripSummary[]> {
  await ensureSchema();

  const publicRows = await listPublicTrips({ ...filters, userId });
  const tripIds = publicRows.map((row) => row.tripId);

  if (!tripIds.length) {
    return [];
  }

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
        budget_amount,
        travelers,
        route_segments,
        expense_breakdown,
        cities,
        hotels,
        budget_categories,
        notes,
        tags,
        estimated_total_cost,
        visibility,
        invite_token,
        description,
        max_members,
        created_at::text
      from trips
      where id = any($1::uuid[])
    `,
    [tripIds],
  );

  const byId = new Map(result.rows.map((row) => [row.id, row]));

  return publicRows
    .map((publicRow) => {
      const row = byId.get(publicRow.tripId);

      if (!row) {
        return null;
      }

      const summary = mapTripSummary(row);
      summary.memberCount = publicRow.memberCount;
      summary.ownerName = publicRow.ownerName;
      summary.ownerAvatar = publicRow.ownerAvatar;
      summary.ratingAverage = publicRow.ratingAverage;
      summary.ratingCount = publicRow.ratingCount;
      summary.ownRating = publicRow.ownRating;
      summary.access = {
        canViewItinerary: false,
        canChat: publicRow.membershipStatus === "accepted",
        canManage: false,
        membershipStatus: publicRow.membershipStatus,
        isOwner: false,
      };

      return summary;
    })
    .filter((trip): trip is SavedTripSummary => Boolean(trip));
}

export async function getTripById(tripId: string, userId?: string): Promise<SavedTripDetail | null> {
  await ensureSchema();

  const access = await resolveTripAccess(tripId, userId);
  const meta = await getTripSocialMeta(tripId);

  if (!meta) {
    return null;
  }

  const canSeeTrip = access.isOwner
    || access.membershipStatus === "accepted"
    || access.membershipStatus === "pending"
    || meta.visibility === "public";

  if (!canSeeTrip) {
    return null;
  }

  if (meta.visibility === "private" && !access.isOwner && access.membershipStatus !== "accepted") {
    return null;
  }

  if (meta.visibility === "invite" && !access.isOwner && access.membershipStatus !== "accepted" && access.membershipStatus !== "pending") {
    return null;
  }

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
        selected_flights,
        budget_amount,
        travelers,
        route_segments,
        expense_breakdown,
        cities,
        hotels,
        budget_categories,
        notes,
        tags,
        estimated_total_cost,
        generation_mode,
        visibility,
        invite_token,
        description,
        max_members,
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

  const summary = await enrichTripSummary(mapTripSummary(trip), userId, access.isOwner);
  summary.access = access;

  if (!access.canViewItinerary) {
    return {
      ...summary,
      selectedFlight: trip.selected_flight || undefined,
      selectedFlights: trip.selected_flights || undefined,
      itinerary: {
        destinationName: trip.destination_name,
        startDate: trip.start_date,
        days: [],
        attractions: [],
        estimatedTotalCost: trip.estimated_total_cost,
        generationMode: trip.generation_mode || "ollama",
      },
    };
  }

  return loadTripDetailContent(trip, summary);
}

export async function getTripByInviteToken(token: string, userId?: string): Promise<SavedTripDetail | null> {
  const meta = await getTripSocialMetaByToken(token);

  if (!meta) {
    return null;
  }

  if (meta.visibility === "private") {
    return null;
  }

  const access = await resolveTripAccess(meta.id, userId);
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
        selected_flights,
        budget_amount,
        travelers,
        route_segments,
        expense_breakdown,
        cities,
        hotels,
        budget_categories,
        notes,
        tags,
        estimated_total_cost,
        generation_mode,
        visibility,
        invite_token,
        description,
        max_members,
        created_at::text
      from trips
      where id = $1
      limit 1
    `,
    [meta.id],
  );
  const trip = tripResult.rows[0];

  if (!trip) {
    return null;
  }

  const summary = await enrichTripSummary(mapTripSummary(trip), userId, false);
  summary.access = access;

  return {
    ...summary,
    selectedFlight: trip.selected_flight || undefined,
    selectedFlights: trip.selected_flights || undefined,
    itinerary: {
      destinationName: trip.destination_name,
      startDate: trip.start_date,
      days: [],
      attractions: [],
      estimatedTotalCost: trip.estimated_total_cost,
      generationMode: trip.generation_mode || "ollama",
    },
  };
}

async function loadTripDetailContent(trip: TripSummaryRow, summary: SavedTripSummary): Promise<SavedTripDetail> {
  const tripId = trip.id;

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
          category,
          location_name,
          location_address,
          location_city,
          location_lat,
          location_lon,
          notes,
          tags,
          estimated_cost,
          item_order,
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
      category: item.category || undefined,
      location: item.location_name ? {
        name: item.location_name,
        address: item.location_address || undefined,
        city: item.location_city || undefined,
        lat: item.location_lat ?? undefined,
        lon: item.location_lon ?? undefined,
      } : undefined,
      notes: item.notes || undefined,
      tags: item.tags || undefined,
      order: item.item_order ?? item.sort_order,
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
    generationMode: trip.generation_mode || "ollama",
  };

  return {
    ...summary,
    selectedFlight: trip.selected_flight || undefined,
    selectedFlights: trip.selected_flights || undefined,
    itinerary,
  };
}

export async function applyTripChangeProposal(
  tripId: string,
  proposal: TripChangeProposal,
  userId: string,
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
            generation_mode = $3,
            updated_at = now()
        where id = $1 and user_id = $4
        returning id, created_at
      `,
      [tripId, proposal.itinerary.estimatedTotalCost, proposal.itinerary.generationMode, userId],
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
              category,
              location_name,
              location_address,
              location_city,
              location_lat,
              location_lon,
              notes,
             tags,
             estimated_cost,
              item_order,
             sort_order
            )
            values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
          `,
          [
            savedDay.id,
            item.timeOfDay,
            item.title,
            item.description,
            item.attractionName || null,
            item.category || null,
            item.location?.name || item.attractionName || null,
            item.location?.address || null,
            item.location?.city || null,
            item.location?.lat ?? null,
            item.location?.lon ?? null,
            item.notes || null,
            item.tags || [],
            item.estimatedCost,
            item.order ?? index,
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

  return getTripById(tripId, userId);
}

export async function deleteTripById(tripId: string, userId: string): Promise<boolean> {
  await ensureSchema();

  const result = await query(
    `
      delete from trips
      where id = $1 and user_id = $2
    `,
    [tripId, userId],
  );

  return (result.rowCount || 0) > 0;
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
    budgetAmount: row.budget_amount || undefined,
    travelers: row.travelers || undefined,
    routeSegments: row.route_segments || undefined,
    expenseBreakdown: row.expense_breakdown || undefined,
    cities: row.cities || undefined,
    hotels: row.hotels || undefined,
    budgetCategories: row.budget_categories || undefined,
    notes: row.notes || undefined,
    tags: row.tags || undefined,
    estimatedTotalCost: row.estimated_total_cost,
    createdAt: row.created_at,
    visibility: row.visibility || "private",
    description: row.description || undefined,
    maxMembers: row.max_members || undefined,
  };
}

async function enrichTripSummary(
  summary: SavedTripSummary,
  userId?: string,
  includeInviteToken = false,
): Promise<SavedTripSummary> {
  summary.memberCount = await countAcceptedMembers(summary.id);

  if (includeInviteToken && userId) {
    const meta = await getTripSocialMeta(summary.id);

    if (meta?.user_id === userId) {
      summary.inviteToken = meta.invite_token;
    }
  }

  const owner = await getOwnerProfile(summary.id);
  summary.ownerName = owner.displayName;
  summary.ownerAvatar = owner.avatarUrl;

  if (userId) {
    summary.access = await resolveTripAccess(summary.id, userId);
  }

  return summary;
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

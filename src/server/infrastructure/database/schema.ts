import { query } from "./client.js";

let schemaReady = false;

export async function ensureSchema(): Promise<void> {
  if (schemaReady) {
    return;
  }

  await query(`
    create extension if not exists "pgcrypto";

    create table if not exists trips (
      id uuid primary key default gen_random_uuid(),
      title text not null,
      origin_code text,
      destination_code text not null,
      destination_name text not null,
      start_date date not null,
      days integer not null,
      budget text not null,
      pace text not null,
      interests text[] not null default '{}',
      selected_flight jsonb,
      estimated_total_cost integer not null default 0,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table if not exists trip_attractions (
      id uuid primary key default gen_random_uuid(),
      trip_id uuid not null references trips(id) on delete cascade,
      external_id text,
      name text not null,
      category text,
      address text,
      lat double precision,
      lon double precision,
      source text not null,
      created_at timestamptz not null default now()
    );

    create table if not exists itinerary_days (
      id uuid primary key default gen_random_uuid(),
      trip_id uuid not null references trips(id) on delete cascade,
      day_number integer not null,
      title text not null,
      summary text not null,
      estimated_cost integer not null default 0,
      created_at timestamptz not null default now()
    );

    create table if not exists itinerary_items (
      id uuid primary key default gen_random_uuid(),
      itinerary_day_id uuid not null references itinerary_days(id) on delete cascade,
      time_of_day text not null,
      title text not null,
      description text not null,
      attraction_name text,
      estimated_cost integer not null default 0,
      sort_order integer not null,
      created_at timestamptz not null default now()
    );
  `);

  schemaReady = true;
}

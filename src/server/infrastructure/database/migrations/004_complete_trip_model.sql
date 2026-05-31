alter table trips
  add column if not exists cities jsonb;

alter table trips
  add column if not exists hotels jsonb;

alter table trips
  add column if not exists budget_categories jsonb;

alter table trips
  add column if not exists notes text;

alter table trips
  add column if not exists tags text[] not null default '{}';

alter table itinerary_items
  add column if not exists category text;

alter table itinerary_items
  add column if not exists location_name text;

alter table itinerary_items
  add column if not exists location_address text;

alter table itinerary_items
  add column if not exists location_city text;

alter table itinerary_items
  add column if not exists location_lat double precision;

alter table itinerary_items
  add column if not exists location_lon double precision;

alter table itinerary_items
  add column if not exists notes text;

alter table itinerary_items
  add column if not exists tags text[] not null default '{}';

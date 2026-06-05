create table if not exists trip_ratings (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  user_id uuid not null,
  rating integer not null check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (trip_id, user_id)
);

create index if not exists trip_ratings_trip_idx
  on trip_ratings (trip_id);

create index if not exists trip_ratings_user_idx
  on trip_ratings (user_id);

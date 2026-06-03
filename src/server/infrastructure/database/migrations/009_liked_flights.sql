create table if not exists liked_flights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  fingerprint text not null,
  outbound jsonb not null,
  inbound jsonb,
  trip_type text not null,
  departure_date date not null,
  return_date date,
  total_price_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, fingerprint)
);

create index if not exists liked_flights_user_created_idx
  on liked_flights(user_id, created_at desc);

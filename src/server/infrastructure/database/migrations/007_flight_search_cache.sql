create table if not exists flight_search_cache (
  cache_key text primary key,
  provider text not null,
  from_code text not null,
  to_code text not null,
  depart_date text not null,
  response jsonb not null,
  cached_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists flight_search_cache_lookup_idx
  on flight_search_cache(provider, from_code, to_code, depart_date);

create index if not exists flight_search_cache_expires_idx
  on flight_search_cache(expires_at);

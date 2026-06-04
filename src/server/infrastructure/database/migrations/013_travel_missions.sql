create table if not exists travel_mission_unlocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  country_code text not null,
  country_name text not null,
  confidence numeric not null default 0,
  face_detected boolean not null default false,
  landmark_detected boolean not null default false,
  gesture_detected boolean not null default false,
  summary text,
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, country_code)
);

create index if not exists idx_travel_mission_unlocks_user_id
  on travel_mission_unlocks (user_id, created_at desc);

alter table trips
  add column if not exists visibility text not null default 'private'
    check (visibility in ('private', 'invite', 'public')),
  add column if not exists invite_token text unique,
  add column if not exists description text,
  add column if not exists max_members integer not null default 8;

update trips
set invite_token = replace(gen_random_uuid()::text, '-', '')
where invite_token is null;

alter table trips
  alter column invite_token set not null;

create index if not exists trips_public_created_idx
  on trips (created_at desc)
  where visibility = 'public';

create table if not exists trip_members (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  user_id uuid not null,
  role text not null check (role in ('owner', 'member')),
  status text not null check (status in ('pending', 'accepted', 'declined')),
  display_name text not null default 'Traveler',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (trip_id, user_id)
);

create index if not exists trip_members_user_status_idx
  on trip_members (user_id, status);

create index if not exists trip_members_trip_status_idx
  on trip_members (trip_id, status);

create table if not exists trip_messages (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  user_id uuid not null,
  display_name text not null default 'Traveler',
  avatar_url text,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists trip_messages_trip_created_idx
  on trip_messages (trip_id, created_at asc);

insert into trip_members (trip_id, user_id, role, status, display_name)
select id, user_id, 'owner', 'accepted', 'Traveler'
from trips
where user_id is not null
on conflict (trip_id, user_id) do nothing;

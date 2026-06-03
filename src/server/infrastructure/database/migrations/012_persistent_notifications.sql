create table if not exists app_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  trip_id uuid references trips(id) on delete cascade,
  type text not null check (type in ('trip_message', 'join_request', 'join_accepted', 'join_declined')),
  reference_id uuid,
  title text not null,
  body text not null,
  target_path text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists app_notifications_user_unread_created_idx
  on app_notifications (user_id, created_at desc)
  where read_at is null;

create unique index if not exists app_notifications_user_type_reference_idx
  on app_notifications (user_id, type, reference_id)
  where reference_id is not null;

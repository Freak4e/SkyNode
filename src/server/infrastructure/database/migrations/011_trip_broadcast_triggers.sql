create or replace function public.broadcast_trip_message_insert()
returns trigger
security definer
set search_path = public, realtime
language plpgsql
as $$
begin
  perform realtime.send(
    jsonb_build_object(
      'message',
      jsonb_build_object(
        'id', new.id::text,
        'tripId', new.trip_id::text,
        'userId', new.user_id::text,
        'displayName', new.display_name,
        'avatarUrl', new.avatar_url,
        'profile', coalesce(new.profile, jsonb_build_object(
          'displayName', new.display_name,
          'avatarUrl', new.avatar_url
        )),
        'content', new.content,
        'createdAt', new.created_at::text
      )
    ),
    'message',
    'trip-room-' || new.trip_id::text,
    false
  );

  return null;
end;
$$;

drop trigger if exists trip_messages_broadcast_insert on public.trip_messages;
create trigger trip_messages_broadcast_insert
  after insert on public.trip_messages
  for each row execute function public.broadcast_trip_message_insert();

create or replace function public.broadcast_trip_member_pending_insert()
returns trigger
security definer
set search_path = public, realtime
language plpgsql
as $$
begin
  if new.status <> 'pending' then
    return null;
  end if;

  perform realtime.send(
    jsonb_build_object(
      'member',
      jsonb_build_object(
        'id', new.id::text,
        'userId', new.user_id::text,
        'role', new.role,
        'status', new.status,
        'displayName', new.display_name,
        'avatarUrl', new.avatar_url,
        'profile', coalesce(new.profile, jsonb_build_object(
          'displayName', new.display_name,
          'avatarUrl', new.avatar_url
        )),
        'createdAt', new.created_at::text
      )
    ),
    'join_request',
    'trip-room-' || new.trip_id::text,
    false
  );

  return null;
end;
$$;

drop trigger if exists trip_members_broadcast_pending_insert on public.trip_members;
create trigger trip_members_broadcast_pending_insert
  after insert on public.trip_members
  for each row execute function public.broadcast_trip_member_pending_insert();

alter table trip_members
  add column if not exists profile jsonb;

alter table trip_messages
  add column if not exists profile jsonb;

update trip_members
set profile = jsonb_build_object(
  'displayName', display_name,
  'avatarUrl', avatar_url
)
where profile is null;

update trip_messages
set profile = jsonb_build_object(
  'displayName', display_name,
  'avatarUrl', avatar_url
)
where profile is null;

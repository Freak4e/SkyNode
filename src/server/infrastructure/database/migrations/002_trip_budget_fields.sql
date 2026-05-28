alter table trips
  add column if not exists budget_amount integer;

alter table trips
  add column if not exists travelers integer not null default 1;

alter table trips
  add column if not exists selected_flights jsonb;

alter table trips
  add column if not exists route_segments jsonb;

alter table trips
  add column if not exists expense_breakdown jsonb;

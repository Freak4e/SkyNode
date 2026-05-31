alter table itinerary_items
  add column if not exists item_order integer;

update itinerary_items
set item_order = sort_order
where item_order is null;

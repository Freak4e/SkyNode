# Data Model Draft

This is the planned PostgreSQL model. It is documentation for now; migrations will be added when persistence is implemented.

## users

- `id`
- `email`
- `display_name`
- `created_at`

## trips

- `id`
- `user_id`
- `title`
- `origin_code`
- `destination_code`
- `start_date`
- `end_date`
- `budget`
- `interests`
- `created_at`
- `updated_at`

## flight_searches

- `id`
- `trip_id`
- `origin_code`
- `destination_code`
- `departure_date`
- `provider`
- `raw_status`
- `created_at`

## flight_offers

- `id`
- `flight_search_id`
- `carrier`
- `departure_time`
- `arrival_time`
- `duration`
- `stops`
- `price`
- `currency`
- `booking_url`
- `source`
- `expires_at`

## itinerary_days

- `id`
- `trip_id`
- `day_number`
- `date`
- `title`
- `summary`
- `estimated_cost`

## itinerary_items

- `id`
- `itinerary_day_id`
- `title`
- `description`
- `place_id`
- `start_time`
- `end_time`
- `estimated_cost`
- `sort_order`

## attractions

- `id`
- `external_id`
- `name`
- `category`
- `lat`
- `lng`
- `address`
- `estimated_cost`
- `source`

## chat_messages

- `id`
- `trip_id`
- `role`
- `content`
- `created_at`

## share_links

- `id`
- `trip_id`
- `slug`
- `expires_at`
- `created_at`

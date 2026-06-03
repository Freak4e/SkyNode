export type PlannerTab = "itinerary" | "calendar" | "map" | "members" | "chat";

export type ForecastDay = {
  date: string;
  max: number;
  min: number;
  weatherCode?: number;
};

export type WeatherState =
  | { status: "idle" | "loading" }
  | { status: "ready"; forecast: ForecastDay[]; placeName: string }
  | { status: "error"; message: string };

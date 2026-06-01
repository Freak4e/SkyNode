import { Sparkles } from "lucide-react";
import { Card } from "../../components/ui";
import { ItineraryMap } from "../../components/ItineraryMap";
import type { FlightOffer, GeneratedItinerary, TripHotel, TripRouteSegment } from "../../../shared/types.js";
import { BudgetPanel } from "./BudgetPanel";
import { WeatherPanel } from "./WeatherPanel";

type PlannerRailProps = {
  itinerary: GeneratedItinerary;
  plannedBudget: number;
  selectedFlights?: FlightOffer[];
  travelers: number;
  hotels?: TripHotel[];
  routeSegments?: TripRouteSegment[];
};

export function PlannerRail({ itinerary, plannedBudget, selectedFlights = [], travelers, hotels = [], routeSegments = [] }: PlannerRailProps) {
  return (
    <aside className="space-y-4 lg:sticky lg:top-28 lg:self-start">
      <BudgetPanel itinerary={itinerary} plannedBudget={plannedBudget} selectedFlights={selectedFlights} travelers={travelers} />
      <WeatherPanel itinerary={itinerary} />
      <Card className="bg-linear-to-br from-blue-600 via-sky-500 to-cyan-400 text-white">
        <p className="mb-3 flex items-center gap-2 text-xs font-black"><Sparkles className="h-4 w-4" />SkyNode suggests</p>
        <p className="text-base font-black leading-relaxed">Use Edit trip to lock in your must-do activities before regenerating ideas.</p>
      </Card>
      <ItineraryMap itinerary={itinerary} hotels={hotels} routeSegments={routeSegments} />
    </aside>
  );
}

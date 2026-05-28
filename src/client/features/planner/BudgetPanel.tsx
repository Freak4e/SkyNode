import { CircleDollarSign } from "lucide-react";
import { Card } from "../../components/ui";
import type { FlightOffer, GeneratedItinerary } from "../../../shared/types.js";
import { parseMoney } from "./plannerUtils";

type BudgetPanelProps = {
  itinerary: GeneratedItinerary;
  plannedBudget: number;
  selectedFlight?: FlightOffer;
  travelers: number;
};

export function BudgetPanel({ itinerary, plannedBudget, selectedFlight, travelers }: BudgetPanelProps) {
  const perTraveler = Math.round(plannedBudget / Math.max(travelers, 1));
  const flightCost = parseMoney(selectedFlight?.priceText);
  const activityCost = itinerary.estimatedTotalCost;
  const hotelCost = Math.max(0, Math.round((plannedBudget - flightCost - activityCost) * 0.6));
  const foodCost = Math.max(0, plannedBudget - flightCost - activityCost - hotelCost);
  const rows = [
    ["Flights", flightCost, "bg-blue-500"],
    ["Hotels", hotelCost, "bg-cyan-500"],
    ["Activities", activityCost, "bg-violet-500"],
    ["Food", foodCost, "bg-emerald-500"],
  ] as const;

  return (
    <Card>
      <p className="flex items-center gap-2 text-sm font-bold text-slate-500"><CircleDollarSign className="h-4 w-4 text-blue-500" />Total budget</p>
      <p className="mt-1 text-4xl font-black leading-none text-blue-600">${plannedBudget.toLocaleString()}</p>
      <p className="mt-1 text-xs font-bold text-slate-500">${perTraveler.toLocaleString()} per traveler</p>
      <div className="mt-4 space-y-3">
        {rows.map(([label, amount, color]) => (
          <div key={label}>
            <div className="mb-1 flex justify-between text-xs font-black text-slate-700">
              <span>{label}</span>
              <span>${amount.toLocaleString()}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div className={`h-full rounded-full ${color}`} style={{ width: `${plannedBudget > 0 ? Math.min(100, Math.round((amount / plannedBudget) * 100)) : 0}%` }} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

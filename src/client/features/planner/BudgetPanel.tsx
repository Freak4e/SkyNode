import { CircleDollarSign } from "lucide-react";
import { Card } from "../../components/ui";
import type { FlightOffer, GeneratedItinerary, TripBudgetCategory } from "../../../shared/types.js";
import { budgetCategoryDefinitions, itineraryBudgetSpend, normalizeBudgetCategories, parseMoney } from "./plannerUtils";

type BudgetPanelProps = {
  itinerary: GeneratedItinerary;
  plannedBudget: number;
  budgetCategories: TripBudgetCategory[];
  selectedFlights?: FlightOffer[];
  travelers: number;
};

export function BudgetPanel({ itinerary, plannedBudget, budgetCategories, selectedFlights = [], travelers }: BudgetPanelProps) {
  const perTraveler = Math.round(plannedBudget / Math.max(travelers, 1));
  const allocations = normalizeBudgetCategories(budgetCategories, plannedBudget);
  const selectedFlightCost = selectedFlights.reduce((sum, flight) => sum + parseMoney(flight.priceText), 0);
  const itinerarySpend = itineraryBudgetSpend(itinerary.days);
  const rows = allocations.map((category, index) => {
    const definition = budgetCategoryDefinitions[index];
    const spent = category.id === "flights"
      ? selectedFlightCost + itinerarySpend.flights
      : category.id === "hotels"
      ? itinerarySpend.hotels
      : category.id === "activities"
      ? itinerarySpend.activities
      : itinerarySpend.other;
    const unusedPercent = category.amount > 0
      ? Math.max(0, Math.min(100, Math.round(((category.amount - spent) / category.amount) * 100)))
      : 0;

    return {
      label: definition.label,
      allocated: category.amount,
      allocationPercent: plannedBudget > 0 ? Math.min(100, Math.round((category.amount / plannedBudget) * 100)) : 0,
      remaining: category.amount - spent,
      unusedPercent,
      color: definition.color,
      softColor: definition.softColor,
    };
  });

  return (
    <Card>
      <p className="flex items-center gap-2 text-sm font-bold text-slate-500"><CircleDollarSign className="h-4 w-4 text-blue-500" />Total budget</p>
      <p className="mt-1 text-4xl font-black leading-none text-blue-600">${plannedBudget.toLocaleString()}</p>
      <p className="mt-1 text-xs font-bold text-slate-500">${perTraveler.toLocaleString()} per traveler</p>
      <div className="mt-4 space-y-3">
        {rows.map((row) => (
          <div key={row.label}>
            <div className="mb-1 flex justify-between text-xs font-black text-slate-700">
              <span>{row.label}</span>
              <span>${row.allocated.toLocaleString()}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
              <div className={`relative h-full overflow-hidden rounded-full ${row.softColor}`} style={{ width: `${row.allocationPercent}%` }}>
                <div
                  className={`absolute inset-y-0 left-0 rounded-full ${row.color}`}
                  style={{ width: `${row.unusedPercent}%` }}
                />
              </div>
            </div>
            <p className={`mt-1 text-[11px] font-bold ${row.remaining >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {row.remaining >= 0 ? `$${row.remaining.toLocaleString()} remaining` : `$${Math.abs(row.remaining).toLocaleString()} over`}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}

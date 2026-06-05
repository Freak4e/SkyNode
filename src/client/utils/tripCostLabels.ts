import type { SavedTripSummary } from "../../shared/types.js";

export const ITINERARY_COST_LABEL = "Est. activity costs";
export const PLANNED_BUDGET_LABEL = "Planned budget";
export const BUDGET_STYLE_LABEL = "Budget style";

export function formatTripUsd(amount: number): string {
  return `$${amount.toLocaleString()}`;
}

export function formatItineraryCostText(amount: number): string {
  return `${formatTripUsd(amount)} est. activity costs`;
}

export function hasPlannedTripBudget(trip: Pick<SavedTripSummary, "budgetAmount">): boolean {
  return (trip.budgetAmount ?? 0) > 0;
}

export function tripBudgetPlanCopy(trip: Pick<SavedTripSummary, "budgetAmount" | "estimatedTotalCost">): {
  title: string;
  description: string;
  totalLabel: string;
} {
  if (hasPlannedTripBudget(trip)) {
    return {
      title: "Budget plan",
      description: "How your total trip budget is split by category. Known flight, stay, and activity costs reduce the remaining room in each category.",
      totalLabel: formatTripUsd(trip.budgetAmount!),
    };
  }

  return {
    title: "Estimated costs",
    description: "Rough costs from itinerary activities and selected bookings. This is not a full trip budget — flights and hotels may not be included.",
    totalLabel: formatTripUsd(trip.estimatedTotalCost),
  };
}

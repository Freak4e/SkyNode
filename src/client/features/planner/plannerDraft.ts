import type { ItineraryDay, TravelPace, TripBudgetCategory } from "../../../shared/types.js";

export type PlannerDraft = {
  tripTitle: string;
  destinationName: string;
  destinationCode: string;
  originCode: string;
  startDate: string;
  days: number;
  travelers: number;
  budgetAmount: number;
  budgetCategories?: TripBudgetCategory[];
  tripCities: string;
  hotelName: string;
  tripNotes: string;
  tripTags: string;
  pace: TravelPace;
  selectedInterests: string[];
  manual: boolean;
  draftDays: ItineraryDay[];
  selectedTripId: string;
};

const DRAFT_KEY = "skynode:plannerDraft";
const DEFAULT_INTERESTS = ["culture", "food", "nature"];

export function writePlannerDraft(draft: PlannerDraft): void {
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

export function readPlannerDraft(): PlannerDraft | null {
  const raw = sessionStorage.getItem(DRAFT_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as PlannerDraft;
  } catch {
    return null;
  }
}

export function patchPlannerDraft(partial: Partial<PlannerDraft>): PlannerDraft | null {
  const current = readPlannerDraft();
  if (!current) {
    return null;
  }

  const next = { ...current, ...partial };
  writePlannerDraft(next);
  return next;
}

export function sanitizeDestinationCode(code: string, destinationName: string): string {
  const normalized = code.trim().toUpperCase();
  if (normalized && normalized.length === 3) {
    return normalized;
  }

  const fromName = destinationName.trim().slice(0, 3).toUpperCase();
  return fromName || normalized || "LJU";
}

export function tripReturnDate(startDate: string, days: number): string {
  const start = new Date(`${startDate}T00:00:00`);
  if (Number.isNaN(start.getTime())) {
    return startDate;
  }

  start.setDate(start.getDate() + Math.max(days - 1, 0));
  return start.toISOString().slice(0, 10);
}

export function createEmptyPlannerDraft(overrides: Partial<PlannerDraft> = {}): PlannerDraft {
  return {
    tripTitle: "",
    destinationName: "",
    destinationCode: "",
    originCode: "",
    startDate: new Date().toISOString().slice(0, 10),
    days: 3,
    travelers: 2,
    budgetAmount: 1800,
    tripCities: "",
    hotelName: "",
    tripNotes: "",
    tripTags: "",
    pace: "balanced",
    selectedInterests: DEFAULT_INTERESTS,
    manual: false,
    draftDays: [],
    selectedTripId: "",
    ...overrides,
  };
}

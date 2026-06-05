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
  const start = parseDateOnly(startDate);
  if (Number.isNaN(start.getTime())) {
    return startDate;
  }

  start.setDate(start.getDate() + Math.max(days - 1, 0));
  return formatDateOnly(start);
}

function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    return new Date(Number.NaN);
  }

  return new Date(year, month - 1, day);
}

function formatDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

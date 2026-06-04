import axios from "axios";
import { config } from "../../../config.js";
import {
  answerTravelChatWithGemini,
  proposeTripChangeWithGemini,
} from "../../infrastructure/llm/geminiClient.js";
import type {
  GeneratedItinerary,
  ItineraryDay,
  ItineraryItem,
  SavedTripDetail,
  TravelChatRequest,
  TravelChatResponse,
  TripChangeProposal,
} from "../../../shared/types.js";

type OllamaChatResponse = {
  message?: {
    content?: string;
  };
};

export async function answerTravelChat(request: TravelChatRequest): Promise<TravelChatResponse> {
  const message = request.message.trim();

  if (!message) {
    throw new Error("Message is required.");
  }

  const mode = request.trip ? "trip-aware" : "general";
  const content = config.llmProvider === "gemini"
    ? await answerTravelChatWithGemini(request, buildSystemPrompt(request.trip))
    : await answerTravelChatWithOllama(request);

  if (!content) {
    throw new Error(`${config.llmProvider} returned an empty chat response.`);
  }

  const proposal = request.trip && shouldProposeTripChange(message)
    ? await proposeTripChange(request.trip, message)
    : undefined;

  return {
    message: content,
    mode,
    proposal,
  };
}

async function answerTravelChatWithOllama(request: TravelChatRequest): Promise<string> {
  const response = await axios.post<OllamaChatResponse>(
    `${config.ollama.baseUrl.replace(/\/$/, "")}/api/chat`,
    {
      model: config.ollama.model,
      stream: false,
      messages: [
        {
          role: "system",
          content: buildSystemPrompt(request.trip),
        },
        ...(request.history || []).slice(-8).map((entry) => ({
          role: entry.role,
          content: entry.content,
        })),
        {
          role: "user",
          content: request.message.trim(),
        },
      ],
      options: {
        temperature: 0.55,
        num_predict: 700,
      },
    },
    {
      timeout: config.ollama.timeoutMs,
    },
  );

  return response.data.message?.content?.trim() || "";
}

function buildSystemPrompt(trip: SavedTripDetail | undefined): string {
  const base = [
    "You are SkyNode Assistant, a concise travel planning expert.",
    "Answer in clear, practical language.",
    "Use short paragraphs and bullet points when useful.",
    "Do not claim to book flights, hotels, or tickets.",
    "If asked about prices, say they are estimates unless exact data is provided.",
  ];

  if (!trip) {
    return [
      ...base,
      "You are in general travel chat mode.",
      "For destination questions, suggest concrete places with short descriptions.",
      "If the user asks for top things to see, give ranked recommendations.",
      "Do not rewrite or invent a saved itinerary unless the user provides one.",
    ].join(" ");
  }

  return [
    ...base,
    "You are in trip-aware mode.",
    "Treat the provided saved trip context as the source of truth.",
    "Suggest itinerary tweaks that fit the trip budget, pace, dates, interests, and existing day structure.",
    "When the user asks for a change, explain the likely day/activity impact briefly instead of rewriting the whole itinerary in chat.",
    "Preserve existing itinerary choices unless the user clearly asks to change them.",
    `Trip context: ${JSON.stringify(buildTripContext(trip))}`,
  ].join(" ");
}

async function proposeTripChange(trip: SavedTripDetail, message: string): Promise<TripChangeProposal | undefined> {
  try {
    if (config.llmProvider === "gemini") {
      const content = await proposeTripChangeWithGemini(trip, message, buildTripContext(trip));
      return normalizeProposal(parseJson(content), trip);
    }

    const response = await axios.post<OllamaChatResponse>(
      `${config.ollama.baseUrl.replace(/\/$/, "")}/api/chat`,
      {
        model: config.ollama.model,
        stream: false,
        messages: [
          {
            role: "system",
            content: [
              "You create safe itinerary update proposals for SkyNode.",
              "Return compact valid JSON only. No markdown. No commentary.",
              "Keep the same destination, dates, day count, and timeOfDay values.",
              "Change only itinerary day titles, summaries, items, descriptions, attractionName, and estimatedCost.",
              "Use realistic costs. Free activities must be 0. The total must equal the sum of day costs.",
            ].join(" "),
          },
          {
            role: "user",
            content: JSON.stringify({
              task: "Update this saved trip according to the user request.",
              userRequest: message,
              currentTrip: buildTripContext(trip),
              requiredJsonShape: {
                summary: "One sentence explaining what changed.",
                itinerary: {
                  destinationName: trip.itinerary.destinationName,
                  startDate: trip.itinerary.startDate,
                  days: trip.itinerary.days,
                  attractions: trip.itinerary.attractions,
                  estimatedTotalCost: 0,
                  generationMode: config.llmProvider === "gemini" ? "gemini" : "ollama",
                },
              },
            }),
          },
        ],
        options: {
          temperature: 0.35,
          num_predict: 1600,
        },
      },
      {
        timeout: config.ollama.timeoutMs,
      },
    );

    const content = response.data.message?.content?.trim();

    if (!content) {
      return buildFallbackProposal(trip, message);
    }

    return normalizeProposal(parseJson(content), trip);
  } catch (error) {
    console.warn("[chat] using fallback trip change proposal", error);
    return buildFallbackProposal(trip, message);
  }
}

function shouldProposeTripChange(message: string): boolean {
  return /\b(change|update|replace|remove|add|make|cheaper|expensive|budget|relaxed|packed|slower|faster|food|restaurant|free|tweak|adjust|swap)\b/i.test(message);
}

function parseJson(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);

    if (!match) {
      throw new Error("No JSON object found.");
    }

    return JSON.parse(match[0]);
  }
}

function normalizeProposal(raw: unknown, trip: SavedTripDetail): TripChangeProposal {
  const proposal = raw as Partial<TripChangeProposal>;
  const itinerary = proposal.itinerary as Partial<GeneratedItinerary> | undefined;
  const days = Array.isArray(itinerary?.days) ? itinerary.days : trip.itinerary.days;
  const normalizedDays = days.slice(0, trip.days).map((day, index) => normalizeDay(day, trip.itinerary.days[index], index + 1));
  const estimatedTotalCost = normalizedDays.reduce((total, day) => total + day.estimatedCost, 0);

  return {
    summary: typeof proposal.summary === "string" && proposal.summary.trim()
      ? proposal.summary.trim()
      : "Updated the itinerary based on your request.",
    itinerary: {
      destinationName: trip.itinerary.destinationName,
      startDate: trip.itinerary.startDate,
      days: normalizedDays,
      attractions: trip.itinerary.attractions,
      estimatedTotalCost,
      generationMode: config.llmProvider === "gemini" ? "gemini" : "ollama",
    },
  };
}

function normalizeDay(rawDay: unknown, fallbackDay: ItineraryDay | undefined, dayNumber: number): ItineraryDay {
  const day = rawDay as Partial<ItineraryDay>;
  const items = Array.isArray(day.items) ? day.items : fallbackDay?.items || [];
  const normalizedItems = items.slice(0, 4).map((item, index) => normalizeItem(item, fallbackDay?.items[index]));
  const estimatedCost = normalizedItems.reduce((total, item) => total + item.estimatedCost, 0);

  return {
    dayNumber,
    title: cleanText(day.title, fallbackDay?.title || `Day ${dayNumber}`),
    summary: cleanText(day.summary, fallbackDay?.summary || "Updated itinerary day."),
    estimatedCost,
    items: normalizedItems,
  };
}

function normalizeItem(rawItem: unknown, fallbackItem: ItineraryItem | undefined): ItineraryItem {
  const item = rawItem as Partial<ItineraryItem>;
  const fallbackTime = fallbackItem?.timeOfDay || "09:00";
  const timeOfDay = typeof item.timeOfDay === "string" && item.timeOfDay.trim()
    ? item.timeOfDay.trim()
    : fallbackTime;

  return {
    timeOfDay,
    title: cleanText(item.title, fallbackItem?.title || "Explore local highlight"),
    description: cleanText(item.description, fallbackItem?.description || "A practical stop matched to the trip request."),
    attractionName: cleanText(item.attractionName, fallbackItem?.attractionName || ""),
    estimatedCost: normalizeCost(item.estimatedCost),
  };
}

function cleanText(value: unknown, fallback: string): string {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed || fallback;
}

function normalizeCost(value: unknown): number {
  const cost = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(cost) || cost < 0) {
    return 0;
  }

  return Math.round(cost);
}

function buildFallbackProposal(trip: SavedTripDetail, message: string): TripChangeProposal {
  const lowerMessage = message.toLowerCase();
  const wantsHigherBudget = /\b(more expensive|higher cost|higher budget|bigger budget|better budget|increased budget|increase budget|premium|splurge|upgrade)\b/.test(lowerMessage);
  const wantsCheaper = !wantsHigherBudget && /\b(cheap|cheaper|low cost|lower cost|budget-friendly|free|save money|less expensive|reduce cost)\b/.test(lowerMessage);
  const wantsFood = /\b(food|restaurant|eat|lunch|dinner|breakfast|cafe)\b/.test(lowerMessage);
  const wantsRelaxed = /\b(relaxed|slower|calm|less packed|easy)\b/.test(lowerMessage);
  const wantsPacked = /\b(packed|more things|more activities|faster|add an activity|add something|add more)\b/.test(lowerMessage);

  const days = trip.itinerary.days.map((day, dayIndex) => {
    let items = day.items.map((item, index) => {
      if (wantsHigherBudget) {
        return {
          ...item,
          description: `${item.description} Keep this as part of the base plan while adding one upgraded experience.`,
        };
      }

      if (wantsCheaper && item.estimatedCost > 0) {
        const freeOutdoor = index === 0 || item.estimatedCost <= 20;

        return {
          ...item,
          title: freeOutdoor ? `Free alternative: ${item.title}` : item.title,
          description: freeOutdoor
            ? `Keep this part of the day low-cost by choosing a free public-space version of ${item.title.toLowerCase()}.`
            : `${item.description} Choose the lower-cost option and avoid prepaid extras.`,
          estimatedCost: freeOutdoor ? 0 : Math.max(5, Math.round(item.estimatedCost * 0.45)),
        };
      }

      if (wantsFood && isEveningTime(item.timeOfDay)) {
        return {
          ...item,
          title: `Local food stop: ${item.title}`,
          description: "Add a casual local food stop nearby instead of a formal restaurant, keeping the plan flexible and budget-aware.",
          estimatedCost: wantsCheaper ? Math.min(item.estimatedCost, 12) : Math.max(item.estimatedCost, 18),
        };
      }

      return item;
    });

    if (wantsHigherBudget && dayIndex === pickUpgradeDayIndex(trip.itinerary.days)) {
      items = [
        ...items,
        {
          timeOfDay: pickExtraTimeOfDay(items),
          title: `Premium ${trip.destinationName} experience`,
          description: "Add a higher-budget guided experience, special museum access, tasting, rooftop view, or skip-the-line cultural activity that makes the day feel more memorable.",
          attractionName: trip.destinationName,
          estimatedCost: pickPremiumActivityCost(trip.budget),
        },
      ];
    }

    if (wantsRelaxed) {
      items = items.slice(0, 2).map((item) => ({
        ...item,
        description: `${item.description} Keep extra buffer time around this stop.`,
      }));
    }

    if (wantsPacked && items.length < 4) {
      items = [
        ...items,
        {
          timeOfDay: "20:00",
          title: `Extra ${trip.destinationName} walk`,
          description: "Add one flexible self-guided walk so the day feels fuller without needing a booking.",
          attractionName: trip.destinationName,
          estimatedCost: 0,
        },
      ];
    }

    const estimatedCost = items.reduce((total, item) => total + item.estimatedCost, 0);

    return {
      ...day,
      title: wantsCheaper ? `${day.title} on a budget` : wantsHigherBudget && dayIndex === pickUpgradeDayIndex(trip.itinerary.days) ? `${day.title} + premium experience` : day.title,
      summary: buildFallbackDaySummary(day.summary, { wantsCheaper, wantsFood, wantsRelaxed, wantsPacked, wantsHigherBudget }),
      estimatedCost,
      items,
    };
  });
  const estimatedTotalCost = days.reduce((total, day) => total + day.estimatedCost, 0);

  return {
    summary: buildFallbackSummary({ wantsCheaper, wantsFood, wantsRelaxed, wantsPacked, wantsHigherBudget }),
    itinerary: {
      ...trip.itinerary,
      days,
      estimatedTotalCost,
      generationMode: config.llmProvider === "gemini" ? "gemini" : "ollama",
    },
  };
}

function buildFallbackSummary(flags: {
  wantsCheaper: boolean;
  wantsFood: boolean;
  wantsRelaxed: boolean;
  wantsPacked: boolean;
  wantsHigherBudget: boolean;
}): string {
  if (flags.wantsHigherBudget) {
    return "Prepared a higher-budget version with an added premium activity.";
  }

  if (flags.wantsCheaper) {
    return "Prepared a lower-cost version with more free or cheaper activities.";
  }

  if (flags.wantsFood) {
    return "Prepared a food-focused version of the itinerary.";
  }

  if (flags.wantsRelaxed) {
    return "Prepared a more relaxed version with fewer stops and more buffer time.";
  }

  if (flags.wantsPacked) {
    return "Prepared a fuller version with extra flexible activities.";
  }

  return "Prepared an updated itinerary based on your request.";
}

function buildFallbackDaySummary(
  currentSummary: string,
  flags: {
    wantsCheaper: boolean;
    wantsFood: boolean;
    wantsRelaxed: boolean;
    wantsPacked: boolean;
    wantsHigherBudget: boolean;
  },
): string {
  if (flags.wantsHigherBudget) {
    return `${currentSummary} Adjusted with one added higher-budget experience.`;
  }

  if (flags.wantsCheaper) {
    return `${currentSummary} Adjusted with cheaper and free alternatives.`;
  }

  if (flags.wantsFood) {
    return `${currentSummary} Adjusted with a stronger local food focus.`;
  }

  if (flags.wantsRelaxed) {
    return `${currentSummary} Adjusted to keep the pace easier.`;
  }

  if (flags.wantsPacked) {
    return `${currentSummary} Adjusted with an extra flexible stop.`;
  }

  return currentSummary;
}

function pickUpgradeDayIndex(days: ItineraryDay[]): number {
  if (days.length <= 1) {
    return 0;
  }

  return Math.min(1, days.length - 1);
}

function pickExtraTimeOfDay(items: ItineraryItem[]): ItineraryItem["timeOfDay"] {
  const usedTimes = new Set(items.map((item) => item.timeOfDay));

  if (!usedTimes.has("20:00")) {
    return "20:00";
  }

  if (!usedTimes.has("16:00")) {
    return "16:00";
  }

  return "10:00";
}

function isEveningTime(timeOfDay: string): boolean {
  if (timeOfDay === "evening") {
    return true;
  }

  const hour = Number(timeOfDay.slice(0, 2));
  return Number.isFinite(hour) && hour >= 18;
}

function pickPremiumActivityCost(budget: SavedTripDetail["budget"]): number {
  if (budget === "high") {
    return 90;
  }

  if (budget === "medium") {
    return 60;
  }

  return 40;
}

function buildTripContext(trip: SavedTripDetail) {
  return {
    title: trip.title,
    destination: trip.destinationName,
    originCode: trip.originCode,
    destinationCode: trip.destinationCode,
    startDate: trip.startDate,
    days: trip.days,
    budget: trip.budget,
    pace: trip.pace,
    interests: trip.interests,
    estimatedTotalCost: trip.estimatedTotalCost,
    itinerary: trip.itinerary.days.map((day) => ({
      dayNumber: day.dayNumber,
      title: day.title,
      estimatedCost: day.estimatedCost,
      items: day.items.map((item) => ({
        timeOfDay: item.timeOfDay,
        title: item.title,
        attractionName: item.attractionName,
        estimatedCost: item.estimatedCost,
      })),
    })),
  };
}

export const __test = {
  buildFallbackProposal,
  buildSystemPrompt,
  buildTripContext,
  cleanText,
  isEveningTime,
  normalizeCost,
  normalizeProposal,
  parseJson,
  shouldProposeTripChange,
};

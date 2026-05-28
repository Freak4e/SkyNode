import axios from "axios";
import { config, requireGeminiApiKey } from "../../../config.js";
import type {
  Attraction,
  GenerateItineraryRequest,
  GeneratedItinerary,
  SavedTripDetail,
  TravelChatRequest,
} from "../../../shared/types.js";
import {
  buildItineraryPrompt,
  normalizeItinerary,
  parseItineraryJson,
} from "./ollamaClient.js";

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
};

type GeminiContent = {
  role?: "user" | "model";
  parts: Array<{ text: string }>;
};

type GeminiRequestOptions = {
  systemPrompt: string;
  contents: GeminiContent[];
  temperature: number;
  maxOutputTokens: number;
  responseMimeType?: "application/json" | "text/plain";
};

export async function generateItineraryWithGemini(
  request: GenerateItineraryRequest,
  attractions: Attraction[],
): Promise<GeneratedItinerary> {
  const content = await generateGeminiContent({
    systemPrompt: [
      "You are SkyNode's itinerary planner.",
      "Return only valid JSON matching the requested shape.",
      "Do not include markdown, comments, explanations, or extra text.",
      "Use concrete local recommendations and keep the plan realistic for a short city trip.",
    ].join(" "),
    contents: [
      {
        role: "user",
        parts: [{ text: buildItineraryPrompt(request, attractions) }],
      },
    ],
    temperature: 0.35,
    maxOutputTokens: 2600,
    responseMimeType: "application/json",
  });

  return normalizeItinerary(parseItineraryJson(content), request, attractions, "gemini");
}

export async function answerTravelChatWithGemini(request: TravelChatRequest, systemPrompt: string): Promise<string> {
  const contents: GeminiContent[] = [
    ...(request.history || []).slice(-8).map((entry) => ({
      role: entry.role === "assistant" ? "model" as const : "user" as const,
      parts: [{ text: entry.content }],
    })),
    {
      role: "user",
      parts: [{ text: request.message.trim() }],
    },
  ];

  return generateGeminiContent({
    systemPrompt,
    contents,
    temperature: 0.5,
    maxOutputTokens: 900,
    responseMimeType: "text/plain",
  });
}

export async function proposeTripChangeWithGemini(
  trip: SavedTripDetail,
  message: string,
  tripContext: unknown,
): Promise<string> {
  return generateGeminiContent({
    systemPrompt: [
      "You create safe itinerary update proposals for SkyNode.",
      "Return compact valid JSON only. No markdown. No commentary.",
      "Keep the same destination, dates, day count, and activity timeOfDay values unless the user asks to retime activities.",
      "Preserve unchanged days and activities unless the user request requires changing them.",
      "Change only itinerary day titles, summaries, items, descriptions, attractionName, and estimatedCost.",
      "Use realistic costs. Free activities must be 0. The total must equal the sum of day costs.",
    ].join(" "),
    contents: [
      {
        role: "user",
        parts: [
          {
            text: JSON.stringify({
              task: "Update this saved trip according to the user request.",
              userRequest: message,
              currentTrip: tripContext,
              requiredJsonShape: {
                summary: "One sentence explaining what changed.",
                itinerary: {
                  destinationName: trip.itinerary.destinationName,
                  startDate: trip.itinerary.startDate,
                  days: trip.itinerary.days,
                  attractions: trip.itinerary.attractions,
                  estimatedTotalCost: 0,
                  generationMode: "gemini",
                },
              },
            }),
          },
        ],
      },
    ],
    temperature: 0.3,
    maxOutputTokens: 2200,
    responseMimeType: "application/json",
  });
}

async function generateGeminiContent(options: GeminiRequestOptions): Promise<string> {
  const apiKey = requireGeminiApiKey();
  const endpoint = `${config.gemini.apiUrl.replace(/\/$/, "")}/models/${config.gemini.model}:generateContent`;

  const response = await axios.post<GeminiGenerateContentResponse>(
    endpoint,
    {
      systemInstruction: {
        parts: [{ text: options.systemPrompt }],
      },
      contents: options.contents,
      generationConfig: {
        temperature: options.temperature,
        maxOutputTokens: options.maxOutputTokens,
        responseMimeType: options.responseMimeType,
        thinkingConfig: {
          thinkingBudget: config.gemini.thinkingBudget,
        },
      },
    },
    {
      headers: {
        "Content-Type": "application/json",
        "X-goog-api-key": apiKey,
      },
      timeout: config.gemini.timeoutMs,
    },
  );

  const content = response.data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || "")
    .join("")
    .trim();

  if (!content) {
    throw new Error("Gemini returned an empty response.");
  }

  return content;
}

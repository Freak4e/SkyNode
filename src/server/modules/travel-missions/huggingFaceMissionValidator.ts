import axios from "axios";
import { config, requireHuggingFaceApiToken } from "../../../config.js";
import type { TravelMissionValidation } from "../../../shared/types.js";

type HuggingFaceChatResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

export async function validateTravelMissionWithHuggingFace(input: {
  countryName: string;
  imageDataUrl: string;
  requiredGesture: string;
}): Promise<TravelMissionValidation> {
  const token = requireHuggingFaceApiToken();
  const response = await axios.post<HuggingFaceChatResponse>(
    config.huggingFace.apiUrl,
    {
      model: config.huggingFace.model,
      messages: [
        {
          role: "system",
          content: [
            "You validate travel proof missions for a travel app.",
            "Analyze the image for: a real visible human face, the requested hand gesture, and visual evidence of a landmark or tourist attraction from the requested country.",
            "Be strict. Reject screenshots, posters, obvious web images, or images without a real person.",
            "Return compact JSON only.",
          ].join(" "),
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: JSON.stringify({
                task: "Validate this travel proof mission.",
                countryName: input.countryName,
                requiredGesture: input.requiredGesture,
                requiredJson: {
                  accepted: true,
                  confidence: 0.91,
                  countryMatched: true,
                  faceDetected: true,
                  landmarkDetected: true,
                  gestureDetected: true,
                  summary: "Short user-facing reason.",
                  issues: ["Short issue when rejected"],
                },
                acceptanceRules: [
                  "accepted requires faceDetected, landmarkDetected, countryMatched, gestureDetected, and confidence >= 0.72",
                  "If unsure about country or landmark, reject with clear issues.",
                ],
              }),
            },
            {
              type: "image_url",
              image_url: {
                url: input.imageDataUrl,
              },
            },
          ],
        },
      ],
      temperature: 0.1,
      max_tokens: 700,
      response_format: {
        type: "json_object",
      },
    },
    {
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      timeout: config.huggingFace.timeoutMs,
    },
  );

  const content = response.data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("Hugging Face returned an empty validation response.");
  }

  return normalizeValidation(parseValidationJson(content));
}

function parseValidationJson(content: string): Partial<TravelMissionValidation> {
  const match = content.match(/({[\s\S]*})/);
  if (!match) {
    throw new Error("Hugging Face did not return validation JSON.");
  }

  return JSON.parse(match[1]) as Partial<TravelMissionValidation>;
}

function normalizeValidation(raw: Partial<TravelMissionValidation>): TravelMissionValidation {
  const confidence = clamp(Number(raw.confidence || 0), 0, 1);
  const countryMatched = raw.countryMatched === true;
  const faceDetected = raw.faceDetected === true;
  const landmarkDetected = raw.landmarkDetected === true;
  const gestureDetected = raw.gestureDetected === true;
  const accepted = raw.accepted === true && confidence >= 0.72 && countryMatched && faceDetected && landmarkDetected && gestureDetected;
  const issues = Array.isArray(raw.issues) ? raw.issues.filter((item): item is string => typeof item === "string") : [];

  return {
    accepted,
    confidence,
    countryMatched,
    faceDetected,
    landmarkDetected,
    gestureDetected,
    summary: typeof raw.summary === "string" && raw.summary.trim()
      ? raw.summary.trim()
      : accepted
      ? "Mission verified."
      : "Mission could not be verified.",
    issues: accepted ? [] : issues.length > 0 ? issues : ["Upload a clear photo with the requested gesture and a recognizable landmark."],
  };
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export const __test = {
  clamp,
  normalizeValidation,
  parseValidationJson,
};

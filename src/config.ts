import dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.SCRAPINGBEE_API_KEY || process.env.API_KEY;

export const config = {
  port: Number(process.env.PORT || 3000),
  llmProvider: (process.env.LLM_PROVIDER || "ollama").toLowerCase(),
  database: {
    url: process.env.DATABASE_URL,
  },
  geoapify: {
    apiUrl: "https://api.geoapify.com/v2/places",
    apiKey: process.env.GEOAPIFY_API_KEY,
    timeoutMs: Number(process.env.GEOAPIFY_TIMEOUT_MS || 12000),
  },
  ollama: {
    baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
    model: process.env.OLLAMA_MODEL || "llama3:latest",
    timeoutMs: Number(process.env.OLLAMA_TIMEOUT_MS || 300000),
  },
  gemini: {
    apiUrl: process.env.GEMINI_API_URL || "https://generativelanguage.googleapis.com/v1beta",
    apiKey: process.env.GEMINI_API_KEY,
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    thinkingBudget: Number(process.env.GEMINI_THINKING_BUDGET || 0),
    timeoutMs: Number(process.env.GEMINI_TIMEOUT_MS || 120000),
  },
  travelpayouts: {
    apiUrl: "https://api.travelpayouts.com",
    accessToken: process.env.TRAVELPAYOUTS_ACCESS_TOKEN,
    currency: process.env.TRAVELPAYOUTS_CURRENCY || "USD",
    timeoutMs: Number(process.env.TRAVELPAYOUTS_TIMEOUT_MS || 15000),
  },
  scrapingBee: {
    apiUrl: "https://app.scrapingbee.com/api/v1/",
    apiKey,
    renderJs: process.env.SCRAPINGBEE_RENDER_JS !== "false",
    waitMs: Number(process.env.SCRAPINGBEE_WAIT_MS || 10000),
    timeoutMs: Number(process.env.SCRAPINGBEE_TIMEOUT_MS || 30000),
  },
};

export function requireDatabaseUrl(): string {
  if (!config.database.url) {
    throw new Error("Missing DATABASE_URL. Add your Supabase PostgreSQL connection string to .env.");
  }

  return config.database.url;
}

export function requireGeoapifyApiKey(): string {
  if (!config.geoapify.apiKey) {
    throw new Error("Missing GEOAPIFY_API_KEY. Add it to .env.");
  }

  return config.geoapify.apiKey;
}

export function requireGeminiApiKey(): string {
  if (!config.gemini.apiKey) {
    throw new Error("Missing GEMINI_API_KEY. Add your Google AI Studio API key to .env.");
  }

  return config.gemini.apiKey;
}

export function requireTravelpayoutsAccessToken(): string {
  if (!config.travelpayouts.accessToken) {
    throw new Error("Missing TRAVELPAYOUTS_ACCESS_TOKEN. Add it to .env.");
  }

  return config.travelpayouts.accessToken;
}

export function requireScrapingBeeApiKey(): string {
  if (!config.scrapingBee.apiKey) {
    throw new Error(
      "Missing SCRAPINGBEE_API_KEY. Add it to .env, or set API_KEY for this prototype.",
    );
  }

  return config.scrapingBee.apiKey;
}

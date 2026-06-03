import dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.SCRAPINGBEE_API_KEY || process.env.API_KEY;

export const config = {
  port: Number(process.env.PORT || 3000),
  llmProvider: (process.env.LLM_PROVIDER || "gemini").toLowerCase(),
  database: {
    url: process.env.DATABASE_URL,
  },
  supabase: {
    url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY,
    secretKey: process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
  geoapify: {
    apiUrl: "https://api.geoapify.com/v2/places",
    apiKey: process.env.GEOAPIFY_API_KEY,
    timeoutMs: Number(process.env.GEOAPIFY_TIMEOUT_MS || 12000),
  },
  openRouteService: {
    apiUrl: process.env.OPENROUTESERVICE_API_URL || "https://api.openrouteservice.org",
    apiKey: process.env.OPENROUTESERVICE_API_KEY,
    timeoutMs: Number(process.env.OPENROUTESERVICE_TIMEOUT_MS || 15000),
    profile: process.env.OPENROUTESERVICE_PROFILE || "foot-walking",
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
  openSky: {
    apiUrl: process.env.OPENSKY_API_URL || "https://opensky-network.org/api",
    tokenUrl: process.env.OPENSKY_TOKEN_URL || "https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token",
    clientId: process.env.OPENSKY_CLIENT_ID,
    clientSecret: process.env.OPENSKY_CLIENT_SECRET,
    useAuth: process.env.OPENSKY_USE_AUTH === "true",
    authTimeoutMs: Number(process.env.OPENSKY_AUTH_TIMEOUT_MS || 2500),
    timeoutMs: Number(process.env.OPENSKY_TIMEOUT_MS || 7500),
  },
  huggingFace: {
    apiUrl: process.env.HUGGINGFACE_API_URL || "https://router.huggingface.co/v1/chat/completions",
    apiToken: process.env.HUGGINGFACE_API_TOKEN || process.env.HF_TOKEN,
    model: process.env.HUGGINGFACE_VISION_MODEL || "Qwen/Qwen3-VL-8B-Instruct",
    timeoutMs: Number(process.env.HUGGINGFACE_TIMEOUT_MS || 90000),
  },
  scrapingBee: {
    apiUrl: "https://app.scrapingbee.com/api/v1/",
    apiKey,
    renderJs: process.env.SCRAPINGBEE_RENDER_JS !== "false",
    waitMs: Number(process.env.SCRAPINGBEE_WAIT_MS || 10000),
    timeoutMs: Number(process.env.SCRAPINGBEE_TIMEOUT_MS || 30000),
    cacheTtlMs: Number(process.env.SCRAPINGBEE_CACHE_TTL_MS || 6 * 60 * 60 * 1000),
  },
};

export function requireDatabaseUrl(): string {
  if (!config.database.url) {
    throw new Error("Missing DATABASE_URL. Add your Supabase PostgreSQL connection string to .env.");
  }

  return config.database.url;
}

export function requireSupabaseUrl(): string {
  if (!config.supabase.url) {
    throw new Error("Missing SUPABASE_URL. Add your Supabase project URL to .env.");
  }

  return config.supabase.url;
}

export function requireSupabaseAnonKey(): string {
  if (!config.supabase.anonKey) {
    throw new Error("Missing SUPABASE_ANON_KEY. Add your Supabase anon key to .env.");
  }

  return config.supabase.anonKey;
}

export function requireSupabaseSecretKey(): string {
  if (!config.supabase.secretKey) {
    throw new Error("Missing SUPABASE_SECRET_KEY. Add your Supabase secret/service-role key to server .env only.");
  }

  return config.supabase.secretKey;
}

export function requireGeoapifyApiKey(): string {
  if (!config.geoapify.apiKey) {
    throw new Error("Missing GEOAPIFY_API_KEY. Add it to .env.");
  }

  return config.geoapify.apiKey;
}

export function requireOpenRouteServiceApiKey(): string {
  if (!config.openRouteService.apiKey) {
    throw new Error("Missing OPENROUTESERVICE_API_KEY. Add your OpenRouteService API key to server .env.");
  }

  return config.openRouteService.apiKey;
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

export function requireOpenSkyCredentials(): { clientId: string; clientSecret: string } {
  if (!config.openSky.clientId || !config.openSky.clientSecret) {
    throw new Error("Missing OPENSKY_CLIENT_ID or OPENSKY_CLIENT_SECRET. Add your OpenSky API client credentials to .env.");
  }

  return {
    clientId: config.openSky.clientId,
    clientSecret: config.openSky.clientSecret,
  };
}

export function requireHuggingFaceApiToken(): string {
  if (!config.huggingFace.apiToken) {
    throw new Error("Missing HUGGINGFACE_API_TOKEN. Add your Hugging Face token to server .env only.");
  }

  return config.huggingFace.apiToken;
}

export function requireScrapingBeeApiKey(): string {
  if (!config.scrapingBee.apiKey) {
    throw new Error(
      "Missing SCRAPINGBEE_API_KEY. Add it to .env, or set API_KEY for this prototype.",
    );
  }

  return config.scrapingBee.apiKey;
}

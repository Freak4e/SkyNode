import dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.SCRAPINGBEE_API_KEY || process.env.API_KEY;

export const config = {
  port: Number(process.env.PORT || 3000),
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

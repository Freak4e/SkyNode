import express from "express";
import path from "path";
import { attractionsRoute } from "./modules/attractions/attractionsRoute.js";
import { itinerariesRoute } from "./modules/itineraries/itinerariesRoute.js";
import { tripsRoute } from "./modules/trips/tripsRoute.js";
import { flightsRoute } from "./routes/flightsRoute.js";
import { placesRoute } from "./routes/placesRoute.js";

export function createApp() {
  const app = express();
  const publicDir = path.resolve(process.cwd(), "dist/public");

  app.use(express.json({ limit: "1mb" }));
  app.use(express.static(publicDir));
  app.use("/api/flights", flightsRoute);
  app.use("/api/places", placesRoute);
  app.use("/api/attractions", attractionsRoute);
  app.use("/api/itineraries", itinerariesRoute);
  app.use("/api/trips", tripsRoute);

  app.get("/test-flight-search", (req, res) => {
    const params = new URLSearchParams(req.query as Record<string, string>);
    res.redirect(307, `/api/flights?${params.toString()}`);
  });

  app.get("*", (req, res) => {
    if (req.path.startsWith("/api/")) {
      return res.status(404).json({ error: "Not found" });
    }

    return res.sendFile(path.join(publicDir, "index.html"));
  });

  return app;
}

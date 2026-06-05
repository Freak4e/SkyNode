import express from "express";
import path from "path";
import { accountRoute } from "./modules/account/accountRoute.js";
import { authRoute } from "./modules/auth/authRoute.js";
import { attractionsRoute } from "./modules/attractions/attractionsRoute.js";
import { chatRoute } from "./modules/chat/chatRoute.js";
import { geocodingRoute } from "./modules/geocoding/geocodingRoute.js";
import { directionsRoute } from "./modules/directions/directionsRoute.js";
import { itinerariesRoute } from "./modules/itineraries/itinerariesRoute.js";
import { tripsRoute } from "./modules/trips/tripsRoute.js";
import { flightsRoute } from "./routes/flightsRoute.js";
import { exploreRoute } from "./routes/exploreRoute.js";
import { liveFlightsRoute } from "./routes/liveFlightsRoute.js";
import { placesRoute } from "./routes/placesRoute.js";
import { likedFlightsRoute } from "./modules/flights/likedFlightsRoute.js";
import { notificationsRoute } from "./modules/notifications/notificationsRoute.js";
import { travelMissionsRoute } from "./modules/travel-missions/travelMissionsRoute.js";

export function createApp() {
  const app = express();
  const publicDir = path.resolve(process.cwd(), "dist/public");

  app.set("etag", false);
  app.use(express.json({ limit: "6mb" }));
  app.use("/api", (_req, res, next) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    next();
  });

  app.use("/api/flights", flightsRoute);
  app.use("/api/liked-flights", likedFlightsRoute);
  app.use("/api/live-flights", liveFlightsRoute);
  app.use("/api/explore", exploreRoute);
  app.use("/api/places", placesRoute);
  app.use("/api/attractions", attractionsRoute);
  app.use("/api/geocode", geocodingRoute);
  app.use("/api/directions", directionsRoute);
  app.use("/api/itineraries", itinerariesRoute);
  app.use("/api/trips", tripsRoute);
  app.use("/api/chat", chatRoute);
  app.use("/api/account", accountRoute);
  app.use("/api/auth", authRoute);
  app.use("/api/notifications", notificationsRoute);
  app.use("/api/travel-missions", travelMissionsRoute);
  app.use(express.static(publicDir));

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

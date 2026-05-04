import express from "express";
import path from "path";
import { flightsRoute } from "./routes/flightsRoute.js";
import { placesRoute } from "./routes/placesRoute.js";

export function createApp() {
  const app = express();
  const publicDir = path.resolve(process.cwd(), "dist/public");

  app.use(express.static(publicDir));
  app.use("/api/flights", flightsRoute);
  app.use("/api/places", placesRoute);

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

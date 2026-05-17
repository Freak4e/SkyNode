import { Router } from "express";
import { getDestinationAttractions } from "./attractionsService.js";

export const attractionsRoute = Router();

attractionsRoute.get("/", async (req, res) => {
  const destination = String(req.query.destination || req.query.place || "").trim();

  if (!destination) {
    return res.status(400).json({ attractions: [], warnings: ["Missing destination query parameter."] });
  }

  try {
    return res.json({ attractions: await getDestinationAttractions(destination), warnings: [] });
  } catch (error) {
    return res.status(502).json({
      attractions: [],
      warnings: [error instanceof Error ? error.message : "Failed to fetch attractions."],
    });
  }
});

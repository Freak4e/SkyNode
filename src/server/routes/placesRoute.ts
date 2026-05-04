import { Router } from "express";
import { searchPlaces } from "../../places.js";

export const placesRoute = Router();

placesRoute.get("/", async (req, res) => {
  const term = String(req.query.term || "").trim();
  const places = await searchPlaces(term);

  return res.json({ places });
});

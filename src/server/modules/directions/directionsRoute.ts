import axios from "axios";
import { Router } from "express";
import { config, requireOpenRouteServiceApiKey } from "../../../config.js";

type DirectionsPoint = {
  lat: number;
  lon: number;
};

type DirectionsDay = {
  dayNumber: number;
  points: DirectionsPoint[];
};

type OpenRouteServiceResponse = {
  features?: Array<{
    geometry?: {
      coordinates?: Array<[number, number]>;
    };
  }>;
};

export const directionsRoute = Router();

directionsRoute.post("/", async (req, res) => {
  const days = Array.isArray(req.body?.days) ? req.body.days as DirectionsDay[] : [];

  const routes = await Promise.all(days.map(async (day) => {
    const points = day.points.filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lon));

    if (points.length < 2) {
      return { dayNumber: day.dayNumber, points, source: "none" };
    }

    try {
      const apiKey = requireOpenRouteServiceApiKey();
      const response = await axios.post<OpenRouteServiceResponse>(
        `${config.openRouteService.apiUrl.replace(/\/$/, "")}/v2/directions/${config.openRouteService.profile}/geojson`,
        {
          coordinates: points.map((point) => [point.lon, point.lat]),
        },
        {
          headers: {
            Authorization: apiKey,
            "Content-Type": "application/json",
          },
          timeout: config.openRouteService.timeoutMs,
        },
      );
      const routeCoordinates = response.data.features?.[0]?.geometry?.coordinates || [];

      return {
        dayNumber: day.dayNumber,
        points: routeCoordinates.map(([lon, lat]) => ({ lat, lon })),
        source: routeCoordinates.length > 0 ? "openrouteservice" : "fallback",
      };
    } catch (error) {
      console.warn("[directions] OpenRouteService route failed", error);
      return { dayNumber: day.dayNumber, points, source: "fallback" };
    }
  }));

  return res.json({ routes });
});

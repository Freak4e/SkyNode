import { Router } from "express";
import { answerTravelChat } from "./chatService.js";
import type { TravelChatRequest } from "../../../shared/types.js";

export const chatRoute = Router();

chatRoute.post("/", async (req, res) => {
  try {
    const request = req.body as TravelChatRequest;
    return res.json(await answerTravelChat(request));
  } catch (error) {
    console.error("[route:chat] failed", error);

    return res.status(502).json({
      message: "",
      mode: "general",
      warnings: [error instanceof Error ? error.message : "Assistant failed."],
    });
  }
});

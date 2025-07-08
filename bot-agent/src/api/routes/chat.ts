import express from "express";
import type { Bot } from "../../bot";
import { logger } from "../../utils";

export function createChatRouter(bot: Bot): express.Router {
  const router = express.Router();

  // Chat endpoint
  router.post("/", async (req, res) => {
    try {
      const { message } = req.body;

      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      const botInstance = bot.getBot();
      if (!botInstance) {
        return res.status(503).json({ error: "Bot is not connected" });
      }

      botInstance.chat(message);
      logger.info(`SERVER CHAT HIT: ${message}`);
      res.json({ success: true, message });
    } catch (error) {
      logger.error("API chat failed:", error);
      res.status(500).json({
        error: "Chat failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  return router;
}
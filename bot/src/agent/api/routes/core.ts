import express from "express";
import type { Bot } from "../../bot";
import { logger } from "../../utils";

export function createCoreRouter(bot: Bot): express.Router {
  const router = express.Router();

  // Health check endpoint
  router.get("/check", (_, res) => {
    res.json({
      status: "ok",
      connected: bot.isReady(),
      timestamp: new Date().toISOString(),
    });
  });

  //! TEMP Memory status endpoint
  router.get("/memory/test", (_, res) => {
    res.json(bot.memory.goalsMemory);
  });

  // Connect endpoint
  router.post("/connect", async (_, res) => {
    try {
      await bot.connect();
      res.json({ success: true });
    } catch (error) {
      logger.error("API connect failed:", error);
      res.status(500).json({
        error: "Connect failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Disconnect endpoint
  router.post("/disconnect", async (_, res) => {
    try {
      await bot.disconnect();
      res.json({ success: true });
    } catch (error) {
      logger.error("API disconnect failed:", error);
      res.status(500).json({
        error: "Disconnect failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Exit endpoint
  router.post("/exit", async (_, res) => {
    try {
      await bot.disconnect();
      res.json({ success: true });
      process.exit(0);
    } catch (error) {
      logger.error("API exit failed:", error);
      res.status(500).json({
        error: "Exit failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  return router;
}
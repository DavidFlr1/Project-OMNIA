import express from "express";
import type { Bot } from "../../bot";
import { logger } from "../../utils";

export function createBotRouter(bot: Bot): express.Router {
  const router = express.Router();

  // Bot status endpoint
  router.get("/status", (_, res) => {
    res.json(bot.agent.getStatus());
  });

  // Execute command endpoint
  router.post("/command", async (req, res) => {
    try {
      const { command } = req.body;

      if (!command) {
        return res.status(400).json({ error: "Command is required" });
      }

      if (!bot.isReady()) {
        return res.status(503).json({ error: "Bot is not connected" });
      }

      await bot.executeCommand(command);
      res.json({ success: true, command });
    } catch (error) {
      logger.error("API command execution failed:", error);
      res.status(500).json({
        error: "Command execution failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Get bot inventory
  router.get("/inventory", (_, res) => {
    const botInstance = bot.getBot();
    if (!botInstance) {
      return res.status(503).json({ error: "Bot is not connected" });
    }

    const items = botInstance.inventory.items();
    const inventory = items.reduce((acc, item) => {
      acc[item.name] = (acc[item.name] || 0) + item.count;
      return acc;
    }, {} as Record<string, number>);

    res.json({ inventory, totalItems: items.length, raw: items });
  });

  // Get nearby entities
  router.get("/entities", (req, res) => {
    const botInstance = bot.getBot();
    if (!botInstance) {
      return res.status(503).json({ error: "Bot is not connected" });
    }

    const entities = Object.values(botInstance.entities)
      .filter((entity) => entity !== botInstance.entity)
      .map((entity) => ({
        id: entity.id,
        uuid: entity.uuid,
        type: entity.type || entity.mobType || entity.displayName || "unknown",
        name: entity.name || entity.displayName || "unknown",
        username: entity.username || "unknown",
        position: entity.position,
        distance: entity.position.distanceTo(botInstance.entity.position),
        equipment: entity.equipment,
        metadata: entity.metadata,
        kind: entity.kind,
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 20); // Limit to 20 nearest entities

    res.json({ entities, count: entities.length });
  });

  return router;
}
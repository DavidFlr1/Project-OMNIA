import express from "express"
import type { Bot } from "../bot"
import { logger } from "../utils"

export async function startApiServer(bot: Bot, port: number): Promise<void> {
  const app = express()

  app.use(express.json())

  // Health check endpoint
  app.get("/health", (req, res) => {
    res.json({
      status: "ok",
      connected: bot.isReady(),
      timestamp: new Date().toISOString(),
    })
  })

  // Bot status endpoint
  app.get("/status", (req, res) => {
    res.json(bot.getStatus())
  })

  // Execute command endpoint
  app.post("/command", async (req, res) => {
    try {
      const { command } = req.body

      if (!command) {
        return res.status(400).json({ error: "Command is required" })
      }

      if (!bot.isReady()) {
        return res.status(503).json({ error: "Bot is not connected" })
      }

      await bot.executeCommand(command)
      res.json({ success: true, command })
    } catch (error) {
      logger.error("API command execution failed:", error)
      res.status(500).json({
        error: "Command execution failed",
        message: error instanceof Error ? error.message : "Unknown error",
      })
    }
  })

  // Get bot inventory
  app.get("/inventory", (req, res) => {
    const botInstance = bot.getBot()
    if (!botInstance) {
      return res.status(503).json({ error: "Bot is not connected" })
    }

    const items = botInstance.inventory.items()
    const inventory = items.reduce(
      (acc, item) => {
        acc[item.name] = (acc[item.name] || 0) + item.count
        return acc
      },
      {} as Record<string, number>,
    )

    res.json({ inventory, totalItems: items.length })
  })

  // Get nearby entities
  app.get("/entities", (req, res) => {
    const botInstance = bot.getBot()
    if (!botInstance) {
      return res.status(503).json({ error: "Bot is not connected" })
    }

    const entities = Object.values(botInstance.entities)
      .filter((entity) => entity !== botInstance.entity)
      .map((entity) => ({
        id: entity.id,
        type: entity.mobType || entity.displayName || "unknown",
        position: entity.position,
        distance: entity.position.distanceTo(botInstance.entity.position),
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 20) // Limit to 20 nearest entities

    res.json({ entities, count: entities.length })
  })

  // Chat endpoint
  app.post("/chat", async (req, res) => {
    try {
      const { message } = req.body

      if (!message) {
        return res.status(400).json({ error: "Message is required" })
      }

      const botInstance = bot.getBot()
      if (!botInstance) {
        return res.status(503).json({ error: "Bot is not connected" })
      }

      botInstance.chat(message)
      res.json({ success: true, message })
    } catch (error) {
      logger.error("API chat failed:", error)
      res.status(500).json({
        error: "Chat failed",
        message: error instanceof Error ? error.message : "Unknown error",
      })
    }
  })

  // Error handling middleware
  app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error("API error:", error)
    res.status(500).json({ error: "Internal server error" })
  })

  // Start server
  app.listen(port, () => {
    logger.info(`Bot API server started on port ${port}`)
  })
}

import dotenv from "dotenv"
import { Bot } from "./bot"
import { logger } from "./utils"
import { startApiServer } from "./api/server"

// Load environment variables
dotenv.config()

async function main() {
  try {
    logger.info("Starting Minecraft Bot Agent...")

    // Show configuration
    logger.info(
      `Configuration: Host=${process.env.MINECRAFT_HOST || "localhost"}, Port=${process.env.MINECRAFT_PORT || "25565"}, Username=${process.env.MINECRAFT_USERNAME || "MinecraftBot"}`,
    )

    // Initialize bot
    const bot = new Bot({
      host: process.env.MINECRAFT_HOST || "localhost",
      port: Number.parseInt(process.env.MINECRAFT_PORT || "25565"),
      username: process.env.MINECRAFT_USERNAME || "MinecraftBot",
      password: process.env.MINECRAFT_PASSWORD,
    })

    // Connect to Minecraft server
    await bot.connect()
    logger.info(`Bot successfully spawned as: ${bot.getBot()?.username}`)

    // Start API server if enabled
    if (process.env.API_PORT) {
      await startApiServer(bot, Number.parseInt(process.env.API_PORT))
      logger.info(`API server started on port ${process.env.API_PORT}`)
    }

    // Handle graceful shutdown
    process.on("SIGINT", async () => {
      logger.info("Received SIGINT, shutting down gracefully...")
      await bot.disconnect()
      process.exit(0)
    })

    process.on("SIGTERM", async () => {
      logger.info("Received SIGTERM, shutting down gracefully...")
      await bot.disconnect()
      process.exit(0)
    })

    logger.info("Bot agent is running and ready for commands!")
  } catch (error) {
    logger.error("Failed to start bot agent:", error)
    process.exit(1)
  }
}

// Start the application
main().catch((error) => {
  logger.error("Unhandled error in main:", error)
  process.exit(1)
})

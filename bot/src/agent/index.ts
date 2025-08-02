import dotenv from "dotenv";
import { Bot } from "./bot";
import { logger } from "./utils";
import { startApiServer } from "./api/server";

// Load environment variables
dotenv.config({ path: "../.env" });

async function main() {
  try {
    const params = parseArgs();

    const MIN_HOST = process.env.MINECRAFT_HOST || "localhost";
    const MIN_PORT = Number.parseInt(process.env.MINECRAFT_PORT || "25565");
    const botName = params.botName || process.env.MINECRAFT_USERNAME || "MinecraftBot";
    const botPass = params.botPass || process.env.MINECRAFT_PASSWORD || "";
    const subPort = params.subPort ? parseInt(params.subPort) : 1;
    const apiPort = 3000 + subPort;
    const logicPort = 4000 + subPort;

    logger.info("Starting Minecraft Bot Agent...");

    // Show configuration
    logger.info(`Bot configuration: Host=${MIN_HOST}, Port=${MIN_PORT}, Username=${botName}, SubPort=${subPort}`);

    // Initialize bot
    const bot = new Bot({
      host: MIN_HOST,
      port: MIN_PORT,
      subPort: subPort,
      username: botName,
      password: botPass,
    });

    // Connect to Minecraft server
    await bot.connect();
    logger.info(`Bot successfully spawned as: ${bot.getBot()?.username}`);

    // Start API server if enabled
    if (apiPort) {
      await startApiServer(bot, apiPort);
      logger.info(`API server started on port ${apiPort}`);
    }

    // Handle graceful shutdown
    process.on("SIGINT", async () => {
      logger.info("Received SIGINT, shutting down gracefully...");
      await bot.disconnect();
      process.exit(0);
    });

    process.on("SIGTERM", async () => {
      logger.info("Received SIGTERM, shutting down gracefully...");
      await bot.disconnect();
      process.exit(0);
    });

    logger.info("Bot agent is running and ready for commands!");
  } catch (error) {
    logger.error("Failed to start bot agent:", error);
    process.exit(1);
  }
}

// Start the application
main().catch((error) => {
  logger.error("Unhandled error in main:", error);
  process.exit(1);
});

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const params: Record<string, string> = {}; 

  args.forEach(arg => {
    const [key, value] = arg.split('=');
    if (key && value) {
      params[key] = value;
    }
  });

  return params;
}
import mineflayer, { type Bot as MineflayerBot } from "mineflayer";
import { pathfinder, Movements } from "mineflayer-pathfinder";
import { plugin as collectBlock } from "mineflayer-collectblock";
import { plugin as pvp } from "mineflayer-pvp";
import { CommandHandler } from "./commands";
import { Agent } from "./logic/agent";
import { Memory } from "./logic/memory";
import { InteractionManager } from "./logic/interaction";
import { logger } from "./utils";

export interface BotConfig {
  host: string;
  port: number;
  username: string;
  password?: string;
  version?: string;
  enableInteractions?: boolean;
}

export class Bot {
  private bot: MineflayerBot | null = null;
  private commandHandler: CommandHandler;
  private agent: Agent;
  private memory: Memory;
  private interactionManager: InteractionManager | null = null;
  private config: BotConfig;
  private isConnected = false;

  constructor(config: BotConfig) {
    this.config = config;
    this.memory = new Memory();
    this.agent = new Agent(this.memory);
    this.commandHandler = new CommandHandler();
  }

  async connect(): Promise<void> {
    try {
      logger.info(`Connecting to Minecraft server at ${this.config.host}:${this.config.port}`);

      this.bot = mineflayer.createBot({
        host: this.config.host,
        port: this.config.port,
        username: this.config.username,
        password: this.config.password,
        version: this.config.version || "1.21",
      });

      // Load plugins
      this.bot.loadPlugin(pathfinder);
      this.bot.loadPlugin(collectBlock);
      this.bot.loadPlugin(pvp);

      // Set up event handlers
      this.setupEventHandlers();

      // Wait for spawn
      await new Promise<void>((resolve, reject) => {
        this.bot!.once("spawn", () => {
          logger.info("Bot spawned successfully");
          this.isConnected = true;
          resolve();
        });

        this.bot!.once("error", (error) => {
          logger.error("Bot connection error:", error);
          reject(error);
        });

        // Timeout after 30 seconds
        setTimeout(() => {
          reject(new Error("Connection timeout"));
        }, 30000);
      });

      // Initialize pathfinding
      if (this.bot.pathfinder) {
        const movements = new Movements(this.bot);
        this.bot.pathfinder.setMovements(movements);
      }

      // Initialize interaction manager if enabled
      if (this.config.enableInteractions !== false) {
        this.interactionManager = new InteractionManager(this.bot, this.memory);
        logger.info("Interaction manager initialized");
      }

      logger.info("Bot connected and ready");
    } catch (error) {
      logger.error("Failed to connect bot:", error);
      throw error;
    }
  }

  private setupEventHandlers(): void {
    if (!this.bot) return;

    this.bot.on("chat", (username, message) => {
      if (username === this.bot!.username) return;

      logger.info(`Chat: <${username}> ${message}`);
      this.memory.addChatMessage(username, message);

      // Process commands from chat (only if they start with ! and are targeted at this bot)
      if (message.startsWith("!")) {
        // Check if this command is targeted at this specific bot
        if (this.interactionManager && this.interactionManager.shouldProcessCommand(message, username)) {
          logger.info(`Processing targeted command from ${username}: ${message}`);
          const command = this.extractCommand(message);
          if (command) {
            this.executeCommand(command);
          }
        } else {
          logger.debug(`Command not targeted at this bot (${this.bot!.username})`);
        }
      }
      // Note: Interaction manager handles regular chat for conversations
    });

    this.bot.on("playerJoined", (player) => {
      logger.info(`Player joined: ${player.username}`);
      this.memory.addEvent("player_joined", { username: player.username });
    });

    this.bot.on("playerLeft", (player) => {
      logger.info(`Player left: ${player.username}`);
      this.memory.addEvent("player_left", { username: player.username });

      // Stop looking at player if they left
      if (this.interactionManager) {
        this.interactionManager.forceStopLooking();
      }
    });

    this.bot.on("health", () => {
      const health = this.bot!.health;
      const food = this.bot!.food;
      logger.debug(`Health: ${health}, Food: ${food}`);

      if (health < 10) {
        logger.warn("Low health detected");
        this.agent.handleLowHealth();
      }
    });

    this.bot.on("death", () => {
      logger.warn("Bot died");
      this.memory.addEvent("death", { timestamp: Date.now() });
    });

    this.bot.on("kicked", (reason) => {
      logger.error(`Bot was kicked: ${JSON.stringify(reason, null, 2)}`);
      this.isConnected = false;
    });

    this.bot.on("end", () => {
      logger.info("Bot disconnected");
      this.isConnected = false;
    });

    this.bot.on("error", (error) => {
      logger.error("Bot error:", JSON.stringify(error, null, 2));
    });
  }

  private extractCommand(message: string): string | null {
    const botName = this.bot!.username.toLowerCase();

    // Handle different command formats:
    // "@BotName !command args" -> "command args"
    // "!BotName command args" -> "command args"
    // "!command args" (when targeted via proximity/eye contact) -> "command args"

    let command = message.slice(1); // Remove initial !

    // Remove bot name if it's at the start
    if (command.toLowerCase().startsWith(botName)) {
      command = command.slice(botName.length).trim();
    }

    // Remove @ symbol if present
    command = command.replace(/^@\w+\s*/, "").trim();

    return command || null;
  }

  async executeCommand(command: string): Promise<void> {
    if (!this.bot || !this.isConnected) {
      logger.warn("Bot not connected, cannot execute command");
      return;
    }

    try {
      await this.commandHandler.execute(command, this.bot, this.memory);
    } catch (error) {
      logger.error(`Failed to execute command "${command}":`, error);
    }
  }

  async disconnect(): Promise<void> {
    if (this.interactionManager) {
      this.interactionManager.cleanup();
    }

    if (this.bot && this.isConnected) {
      logger.info("Disconnecting bot...");
      this.bot.quit();
      this.isConnected = false;
    }
  }

  getBot(): MineflayerBot | null {
    return this.bot;
  }

  isReady(): boolean {
    return this.isConnected && this.bot !== null;
  }

  getStatus() {
    if (!this.bot || !this.isConnected) {
      return { connected: false };
    }

    const status = {
      connected: true,
      username: this.bot.username,
      health: this.bot.health,
      food: this.bot.food,
      position: this.bot.entity.position,
      dimension: this.bot.game.dimension,
      gameMode: this.bot.game.gameMode,
    };

    // Add interaction stats if available
    if (this.interactionManager) {
      return {
        ...status,
        interactions: this.interactionManager.getInteractionStats(),
      };
    }

    return status;
  }

  // Interaction management methods
  getInteractionManager(): InteractionManager | null {
    return this.interactionManager;
  }
}

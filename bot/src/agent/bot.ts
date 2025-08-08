import mineflayer, { type Bot as MineflayerBot } from "mineflayer";
import { pathfinder, Movements } from "mineflayer-pathfinder";
import { plugin as collectBlock } from "mineflayer-collectblock";
import { plugin as pvp } from "mineflayer-pvp";
import { CommandHandler } from "./features";
import { Agent } from "./core/agent";
import { GoalManager } from "./core/goals";
import { Memory } from "./core/memory";
import { InteractionManager } from "./features/chatInteraction";
import { logger } from "./utils";
import { Feature } from "../types";

export interface BotConfig {
  host: string;
  port: number;
  subPort: number;
  username: string;
  password?: string;
  version?: string;
  enableInteractions?: boolean;
}

export class Bot {
  public bot: MineflayerBot | null = null;
  public agent: Agent | null = null;
  private config: BotConfig;
  public memory: Memory;
  private goalManager: GoalManager | null = null;
  private commandHandler: CommandHandler;
  public interactionManager: InteractionManager | null = null;
  public featureManager: Set<Feature>; // Features list status
  public isConnected = false;

  constructor(config: BotConfig) {
    this.config = config;
    this.memory = new Memory();
    this.goalManager;
    this.featureManager = new Set();
    this.commandHandler = new CommandHandler();
    this.agent;
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
        this.interactionManager = new InteractionManager(this.bot, this.memory, this.config.subPort);
        logger.info("Interaction manager initialized");
      }

      // Initialize goal manager
      this.goalManager = new GoalManager(this.memory);
      
      // Initialize the agent after bot is connected
      this.agent = new Agent(this.bot, this.memory, this.goalManager, this.interactionManager, this.featureManager);
      this.agent.updateStatus({});

      logger.info("Bot connected and ready");
    } catch (error) {
      logger.error("Failed to connect bot:", error);
      throw error;
    }
  }

  private setupEventHandlers(): void {
    if (!this.bot) return;

    this.bot.on('whisper', (username, message) => {
      if (username === this.bot!.username) return;
      logger.info(`Whisper: <${username}> ${message}`);
      
      this.chatHandler(username, message, "whisper");
    })

    this.bot.on("chat", (username, message) => {
      if (username === this.bot!.username) return;
      logger.info(`Chat: <${username}> ${message}`);

      this.chatHandler(username, message, "chat");
      // Note: Interaction manager handles regular chat for conversations
    });
    
    // System events per thick
    // this.bot.on("physicsTick", () => {
    //   // Update status every 3 seconds
    //   if (Date.now() - this.agent?.getStatus()?.timestamp > 3000) {
    //     this.agent?.updateStatus({}, false);
    //   }
    // });

    this.bot.on("playerJoined", (player) => {
      logger.info(`Player joined: ${player.username}`);
      this.memory.createEvent("system_event", { event: 'player_joined', metadata: { username: this.bot?.username, subPort: this.config.subPort } });
    });

    this.bot.on("playerLeft", (player) => {
      logger.info(`Player left: ${player.username}`);
      this.memory.createEvent("system_event", { event: 'player_left', metadata: { username: this.bot?.username, subPort: this.config.subPort } });

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
      }
    });

    this.bot.on("death", () => {
      logger.warn("Bot died");
      this.memory.createEvent("system_event", { event: 'death', metadata: { username: this.bot?.username, subPort: this.config.subPort } });
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

  private chatHandler(username: string, message: string, type: "chat" | "whisper"): void {
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
    } else {
      // Store chat message in memory
      // this.memory.createEvent("chat_message", {
      //   username,
      //   message,
      // });
    }
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
      await this.commandHandler.execute(command, this.bot, this.memory, this.featureManager);
    } catch (error) {
      logger.error(`Failed to execute command "${command}":`, error);
    }
  }

  async disconnect(): Promise<void> {
    if (this.bot && this.isConnected) {
      logger.info("Disconnecting bot...");
      this.bot.quit();
      this.isConnected = false;
    }
  }

  isReady(): boolean {
    return this.isConnected && this.bot !== null;
  }

  getBot(): MineflayerBot | null {
    return this.bot;
  }

  getAgent(): Agent | null {
    return this.agent;
  }
}












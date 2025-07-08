import type { Bot as MineflayerBot } from "mineflayer";
import {
  isLookingAtBot,
  isPlayerNearby,
  logger,
  getNearbyPlayers,
  getInventoryItems,
  getNearbyBots,
  getCurrentActivity,
} from "../utils";
import type { Memory } from "../core/memory";

export interface InteractionState {
  isLookingAtPlayer: boolean;
  currentTarget: string | null;
  lastInteraction: number;
  lookTimeout: NodeJS.Timeout | null;
}

export class InteractionManager {
  private bot: MineflayerBot;
  private memory: Memory;
  private state: InteractionState;
  private lookDuration = 10000; // 10 seconds
  private interactionCooldown = 5000; // 5 seconds between responses

  constructor(bot: MineflayerBot, memory: Memory) {
    this.bot = bot;
    this.memory = memory;
    this.state = {
      isLookingAtPlayer: false,
      currentTarget: null,
      lastInteraction: 0,
      lookTimeout: null,
    };

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // Handle chat interactions
    this.bot.on("chat", (username, message) => {
      if (username === this.bot.username) return;
      this.handleChatInteraction(username, message);
    });

    // Look at nearest player periodically
    this.bot.on("physicsTick", () => {
      this.handleLookAtPlayer();
    });
  }

  private async handleChatInteraction(username: string, message: string): Promise<void> {
    const player = this.bot.players[username];
    if (!player || !player.entity) return;

    const distance = this.bot.entity.position.distanceTo(player.entity.position);
    const isNearby = isPlayerNearby(player.entity, this.bot.entity, 4);
    const isLooking = isLookingAtBot(player.entity, this.bot.entity, 0.9);

    logger.debug(
      `Chat interaction: ${username} - Distance: ${distance.toFixed(2)}, Nearby: ${isNearby}, Looking: ${isLooking}`
    );

    // Check if this is a targeted command
    if (message.startsWith("!")) {
      // Command handling is delegated to the Bot class via shouldProcessCommand
      return;
    } else {
      // For regular chat, check if player is nearby and looking at the bot
      if (isNearby && isLooking) {
        await this.respondToPlayer(username, message);
        this.startLookingAtPlayer(username);
      }
    }

    // Store interaction in memory
    this.memory.addEvent("player_interaction", {
      username,
      message,
      distance,
      isNearby,
      isLooking,
      timestamp: Date.now(),
    });
  }

  // Public method to check if command should be processed
  public shouldProcessCommand(message: string, username: string): boolean {
    if (!message.startsWith("!")) return false;

    const player = this.bot.players[username];
    if (!player || !player.entity) return false;

    const isNearby = isPlayerNearby(player.entity, this.bot.entity, 8); // Slightly larger range for commands
    const isLooking = isLookingAtBot(player.entity, this.bot.entity, 0.7); // More lenient for commands

    return this.isCommandTargetedAtThisBot(message, username, isNearby, isLooking);
  }

  private isCommandTargetedAtThisBot(
    message: string,
    username: string,
    isNearby: boolean,
    isLooking: boolean
  ): boolean {
    const botName = this.bot.username.toLowerCase();
    const messageLower = message.toLowerCase();

    // Method 1: Direct name targeting - "@BotName !command" or "!BotName command"
    if (messageLower.includes(`@${botName}`) || messageLower.startsWith(`!${botName}`)) {
      logger.debug(`Command directly targeted at ${botName}`);
      return true;
    }

    // Method 2: Proximity + eye contact targeting (most intuitive)
    if (isNearby && isLooking) {
      logger.debug(`Command targeted via proximity and eye contact to ${botName}`);
      return true;
    }

    // Method 3: Check if message contains bot name anywhere
    if (messageLower.includes(botName)) {
      logger.debug(`Command contains bot name ${botName}`);
      return true;
    }

    // Method 4: If no other bots are nearby, assume it's for this bot
    const nearbyBots = getNearbyBots(this.bot, username);
    if (nearbyBots.length === 1 && nearbyBots[0] === botName) {
      logger.debug(`Only bot nearby, assuming command is for ${botName}`);
      return true;
    }

    return false;
  }

  // Conversation
  private async respondToPlayer(username: string, message: string): Promise<void> {
    const now = Date.now();

    // Check cooldown
    if (now - this.state.lastInteraction < this.interactionCooldown) {
      logger.debug(`Interaction cooldown active for ${username}`);
      return;
    }

    // Generate response
    const response = await this.generateResponse(username, message);

    if (response) {
      this.bot.chat(response);
      this.state.lastInteraction = now;

      logger.info(`Responded to ${username}: "${response}"`);

      // Store response in memory
      this.memory.addEvent("bot_response", {
        username,
        originalMessage: message,
        response,
        timestamp: now,
      });
    }
  }

  private async getAIResponse(username: string, message: string): Promise<string | null> {
    try {
      const botLogicUrl = process.env.BOT_LOGIC_URL || "http://localhost:8000";

      // Get bot context for the AI
      const context = {
        health: this.bot.health,
        food: this.bot.food,
        position: {
          x: this.bot.entity.position.x,
          y: this.bot.entity.position.y,
          z: this.bot.entity.position.z,
        },
        inventory: getInventoryItems(this.bot),
        nearbyPlayers: getNearbyPlayers(this.bot),
        currentActivity: getCurrentActivity(this.bot, this.state),
        memory: this.memory.getRecentChat(5),
      };

      const response = await fetch(`${botLogicUrl}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: message,
          context: context,
          player_username: username,
          bot_username: this.bot.username,
        }),
      });

      if (response.ok) {
        const data = (await response.json()) as { response: string };
        return data.response;
      } else {
        logger.warn(`Bot logic service returned ${response.status}`);
        return null;
      }
    } catch (error) {
      logger.warn("Failed to get AI response:", error);
      return null;
    }
  }

  private async generateResponse(username: string, message: string): Promise<string | null> {
    // Try to get AI response first
    const aiResponse = await this.getAIResponse(username, message);
    if (aiResponse) {
      return aiResponse;
    }

    // Fallback to hardcoded responses
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes("hello") || lowerMessage.includes("hi")) {
      return `Hello ${username}!`;
    }

    if (lowerMessage.includes("help")) {
      return "I can help with basic tasks. Try asking me to follow you or explore an area using commands!";
    }

    if (lowerMessage.includes("bye") || lowerMessage.includes("goodbye")) {
      return `See you later, ${username}!`;
    }

    return "I am sorry, I couldn't generate a response to that.";
  }

  // Player looking handling
  private handleLookAtPlayer(): void {
    if (!this.state.isLookingAtPlayer || !this.state.currentTarget) {
      return;
    }

    const targetPlayer = this.bot.players[this.state.currentTarget];
    if (!targetPlayer || !targetPlayer.entity) {
      this.stopLookingAtPlayer();
      return;
    }

    // Check if player is still nearby
    const distance = this.bot.entity.position.distanceTo(targetPlayer.entity.position);
    if (distance > 8) {
      // Stop looking if player moves too far
      this.stopLookingAtPlayer();
      return;
    }

    // Look at the player
    const playerPos = targetPlayer.entity.position.offset(0, targetPlayer.entity.height * 0.9, 0);
    this.bot.lookAt(playerPos);
  }

  private startLookingAtPlayer(username: string): void {
    // Clear existing timeout
    if (this.state.lookTimeout) {
      clearTimeout(this.state.lookTimeout);
    }

    this.state.currentTarget = username;
    this.state.isLookingAtPlayer = true;

    logger.debug(`Started looking at player: ${username}`);

    // Set timeout to stop looking
    this.state.lookTimeout = setTimeout(() => {
      this.stopLookingAtPlayer();
    }, this.lookDuration);
  }

  private stopLookingAtPlayer(): void {
    this.state.isLookingAtPlayer = false;
    this.state.currentTarget = null;

    if (this.state.lookTimeout) {
      clearTimeout(this.state.lookTimeout);
      this.state.lookTimeout = null;
    }

    logger.debug("Stopped looking at player");
  }

  public forceStopLooking(): void {
    this.stopLookingAtPlayer();
  }

  // Stats
  public getInteractionStats(): any {
    const recentInteractions = this.memory.searchEventHistory("player_interaction");
    const recentResponses = this.memory.searchEventHistory("bot_response");

    return {
      totalInteractions: recentInteractions.length,
      totalResponses: recentResponses.length,
      currentTarget: this.state.currentTarget,
      isLookingAtPlayer: this.state.isLookingAtPlayer,
      lastInteraction: this.state.lastInteraction,
    };
  }

  public cleanup(): void {
    this.forceStopLooking();
    // Any other cleanup needed
  }
}

import { createClient } from "redis";
import { logger } from "../utils";

export interface ChatMessage {
  username: string;
  message: string;
  timestamp: number;
}

export interface GameEvent {
  type: string;
  data: any;
  timestamp: number;
}

export interface Command {
  command: string;
  timestamp: number;
  success: boolean;
}

export class Memory {
  private redisClient: any = null;
  private chatHistory: ChatMessage[] = [];
  private eventHistory: GameEvent[] = [];
  private commandHistory: Command[] = [];
  private agentState: any = {};
  private maxHistorySize = 1000;

  constructor() {
    this.initializeRedis();
  }

  private async initializeRedis(): Promise<void> {
    try {
      if (process.env.REDIS_URL) {
        this.redisClient = createClient({
          url: process.env.REDIS_URL,
          password: process.env.REDIS_PASSWORD,
        });

        this.redisClient.on("error", (err: any) => {
          // Only log once, then disable Redis
          if (this.redisClient) {
            logger.info("Redis unavailable, using in-memory storage only");
            this.redisClient = null;
          }
        });

        // Set a connection timeout
        const connectPromise = this.redisClient.connect();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Redis connection timeout")), 2000)
        );

        await Promise.race([connectPromise, timeoutPromise]);
        logger.info("Connected to Redis for persistent memory");
      } else {
        logger.info("No Redis URL provided, using in-memory storage");
      }
    } catch (error) {
      logger.info("Redis not available, using in-memory storage only");
      this.redisClient = null;
    }
  }

  addChatMessage(username: string, message: string): void {
    const chatMessage: ChatMessage = {
      username,
      message,
      timestamp: Date.now(),
    };

    this.chatHistory.push(chatMessage);
    this.trimHistory(this.chatHistory);

    // Store in Redis if available
    if (this.redisClient) {
      this.redisClient
        .lpush("chat_history", JSON.stringify(chatMessage))
        .catch((err: any) => logger.warn("Failed to store chat in Redis:", err));
    }

    logger.debug("Chat message stored:", chatMessage);
  }

  addEvent(type: string, data: any): void {
    const event: GameEvent = {
      type,
      data,
      timestamp: Date.now(),
    };

    this.eventHistory.push(event);
    this.trimHistory(this.eventHistory);

    // Store in Redis if available
    if (this.redisClient) {
      this.redisClient
        .lpush("event_history", JSON.stringify(event))
        .catch((err: any) => logger.warn("Failed to store event in Redis:", err));
    }

    logger.debug("Event stored:", event);
  }

  addCommand(command: string, success = true): void {
    const commandRecord: Command = {
      command,
      timestamp: Date.now(),
      success,
    };

    this.commandHistory.push(commandRecord);
    this.trimHistory(this.commandHistory);

    // Store in Redis if available
    if (this.redisClient) {
      this.redisClient
        .lpush("command_history", JSON.stringify(commandRecord))
        .catch((err: any) => logger.warn("Failed to store command in Redis:", err));
    }

    logger.debug("Command stored:", commandRecord);
  }

  updateAgentState(state: any): void {
    this.agentState = { ...state, timestamp: Date.now() };

    // Store in Redis if available
    if (this.redisClient) {
      this.redisClient
        .set("agent_state", JSON.stringify(this.agentState))
        .catch((err: any) => logger.warn("Failed to store agent state in Redis:", err));
    }

    logger.debug("Agent state updated:", this.agentState);
  }

  getRecentChat(count = 10): ChatMessage[] {
    return this.chatHistory.slice(-count);
  }

  getRecentEvents(count = 10): GameEvent[] {
    return this.eventHistory.slice(-count);
  }

  getRecentCommands(count = 10): Command[] {
    return this.commandHistory.slice(-count);
  }

  getAgentState(): any {
    return { ...this.agentState };
  }

  searchChatHistory(query: string): ChatMessage[] {
    return this.chatHistory.filter(
      (msg) =>
        msg.message.toLowerCase().includes(query.toLowerCase()) ||
        msg.username.toLowerCase().includes(query.toLowerCase())
    );
  }

  searchEventHistory(eventType: string): GameEvent[] {
    return this.eventHistory.filter((event) => event.type === eventType);
  }

  getMemorySummary(): any {
    return {
      chatMessages: this.chatHistory.length,
      events: this.eventHistory.length,
      commands: this.commandHistory.length,
      agentStateLastUpdated: this.agentState.timestamp,
      redisConnected: this.redisClient !== null,
    };
  }

  async loadFromRedis(): Promise<void> {
    if (!this.redisClient) return;

    try {
      // Load chat history
      const chatData = await this.redisClient.lrange("chat_history", 0, this.maxHistorySize - 1);
      this.chatHistory = chatData.map((data: string) => JSON.parse(data)).reverse();

      // Load event history
      const eventData = await this.redisClient.lrange("event_history", 0, this.maxHistorySize - 1);
      this.eventHistory = eventData.map((data: string) => JSON.parse(data)).reverse();

      // Load command history
      const commandData = await this.redisClient.lrange("command_history", 0, this.maxHistorySize - 1);
      this.commandHistory = commandData.map((data: string) => JSON.parse(data)).reverse();

      // Load agent state
      const stateData = await this.redisClient.get("agent_state");
      if (stateData) {
        this.agentState = JSON.parse(stateData);
      }

      logger.info("Memory loaded from Redis");
    } catch (error) {
      logger.warn("Failed to load memory from Redis:", error);
    }
  }

  private trimHistory(history: any[]): void {
    if (history.length > this.maxHistorySize) {
      history.splice(0, history.length - this.maxHistorySize);
    }
  }

  async cleanup(): Promise<void> {
    if (this.redisClient) {
      await this.redisClient.quit();
    }
  }
}

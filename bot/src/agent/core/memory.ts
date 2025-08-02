import { createClient, RedisClientType } from "redis";
import { logger } from "../utils";
import { v4 as uuidv4 } from 'uuid';

export type Tables = 'event' | 'discovery' | 'chat' | 'command' | 'goals' | 'agent' | 'memory' | 'world';
export interface MemoryEntry {
  id?: string;
  type: string;
  data: any;
  timestamp: number;
}



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
  private redisClient: RedisClientType | null = null;
  private maxHistorySize = 1000;
  private tables: Tables[];

  public eventMemory: MemoryEntry[] = [];
  public discoveryMemory: MemoryEntry[] = [];
  public chatMemory: MemoryEntry[] = [];
  public commandMemory: MemoryEntry[] = [];
  public goalsMemory: MemoryEntry[] = [];
  public agentMemory: MemoryEntry = { id: 'agent', type: 'agent', data: {}, timestamp: Date.now() };
  public memoryMemory: MemoryEntry[] = [];
  public worldMemory: MemoryEntry[] = [];

  private chatHistory: ChatMessage[] = [];
  private eventHistory: GameEvent[] = [];
  private commandHistory: Command[] = [];
  private agentState: any = {};
  
  // Lists for time-series data
  private listTables: Tables[] = ['event', 'discovery', 'chat', 'command', 'world'];
  
  // Key-value for objects with IDs
  private objectTables: Tables[] = ['goals', 'memory'];
  
  // Singleton objects
  private singletonTables: Tables[] = ['agent'];

  constructor() {
    this.initializeRedis();
    this.tables = [
      'event',
      'discovery',
      'chat',
      'command',
      'goals',
      'agent',
      'memory',
      'world',
    ]
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
        
        // Debug log to see available methods
        logger.debug("Redis client methods:", Object.keys(this.redisClient));

        await this.loadFromRedis();
        
      } else {
        logger.info("No Redis URL provided, using in-memory storage");
      }
    } catch (error) {
      logger.info("Redis not available, using in-memory storage only");
      this.redisClient = null;
    }
  }

  // Add memory with appropriate storage strategy
  addMemory(table: Tables, type: string, data: any, options?: { timestamp?: number, subType?: string, id?: string }): string | void {
    const timestamp = options?.timestamp || Date.now();
    const subType = options?.subType;
    let id = options?.id || data.id || uuidv4();
    
    const memory: MemoryEntry = {
      id,
      type,
      data,
      timestamp,
    };

    // Store in Redis if available
    if (this.redisClient) {
      try {
        if (this.listTables.includes(table)) {
          // List storage for time-series data
          this.redisClient.lPush(table, JSON.stringify(memory))
            .catch(err => logger.warn(`Failed to store ${table} in Redis:`, err));
        } 
        if (this.objectTables.includes(table)) {
          // Key-value storage for objects with IDs
          this.redisClient.set(`${table}:${id}`, JSON.stringify(memory))
            .catch(err => logger.warn(`Failed to store ${table}:${id} in Redis:`, err));
          
          // Also maintain a list of IDs for this table
          this.redisClient.sAdd(`${table}:ids`, id!)
            .catch(err => logger.warn(`Failed to add ${id} to ${table}:ids set:`, err));
        }
        if (this.singletonTables.includes(table)) {
          // Single key for singleton objects
          this.redisClient.set(table, JSON.stringify(memory))
            .catch(err => logger.warn(`Failed to store ${table} in Redis:`, err));
        }
      } catch (err) {
        logger.warn(`Redis operation failed:`, err);
      }
    }

    // Add to in-memory storage
    const memoryArray = this[`${table}Memory`] as MemoryEntry[];
    if (memoryArray && table !== 'agent') {
      memoryArray.push(memory);
      this.trimHistory(memoryArray);
    }

    // Log the event
    if (subType) {
      this.addEvent(subType, { table, type, id, data: typeof data === 'object' ? { ...data } : data });
    }
    
    return id;
  }

  // Get memory with appropriate retrieval strategy
  async getMemory(table: Tables, idOrCount: string | number = 10): Promise<any> {
    if (!this.redisClient) {
      // Fall back to in-memory storage
      const memoryArray = this[`${table}Memory`] as MemoryEntry[];
      if (typeof idOrCount === 'string') {
        return memoryArray.find(item => item.id === idOrCount) || null;
      } else {
        return memoryArray.slice(-idOrCount);
      }
    }

    try {
      if (this.listTables.includes(table)) {
        // List retrieval for time-series data
        const count = typeof idOrCount === 'number' ? idOrCount : 10;
        const data = await this.redisClient.lRange(table, 0, count - 1);
        return data.map(item => JSON.parse(item)).reverse();
      } 
      else if (this.objectTables.includes(table)) {
        // Key-value retrieval for objects with IDs
        if (typeof idOrCount === 'string') {
          // Get specific object by ID
          const data = await this.redisClient.get(`${table}:${idOrCount}`);
          return data ? JSON.parse(data) : null;
        } else {
          // Get multiple objects (most recent n)
          const ids = await this.redisClient.sMembers(`${table}:ids`);
          const results = [];
          
          // Only get the most recent n items
          const idsToFetch = ids.slice(0, idOrCount);
          
          for (const id of idsToFetch) {
            const data = await this.redisClient.get(`${table}:${id}`);
            if (data) {
              results.push(JSON.parse(data));
            }
          }
          
          return results.sort((a, b) => b.timestamp - a.timestamp);
        }
      }
      else if (this.singletonTables.includes(table)) {
        // Single key retrieval for singleton objects
        const data = await this.redisClient.get(table);
        return data ? JSON.parse(data) : null;
      }
    } catch (err) {
      logger.warn(`Failed to retrieve ${table} from Redis:`, err);
      return null;
    }
  }

  // Update memory with appropriate update strategy
  async updateMemory(table: Tables, id: string, updates: any, options?: { timestamp?: number, subType?: string }): Promise<boolean> {
    const subType = options?.subType;
    if (!this.redisClient) {
      // Fall back to in-memory storage
      const memoryArray = this[`${table}Memory`] as MemoryEntry[];
      const index = memoryArray.findIndex(item => item.id === id);
      if (index === -1) return false;
      
      memoryArray[index].data = { ...memoryArray[index].data, ...updates };
      memoryArray[index].timestamp = Date.now();
      return true;
    }

    try {
      if (this.objectTables.includes(table)) {
        // Key-value update for objects with IDs
        const key = `${table}:${id}`;
        const data = await this.redisClient.get(key);
        if (!data) return false;
        
        const memory = JSON.parse(data);
        
        // Special handling for arrays like milestones
        if (updates.milestones) {
          memory.data.milestones = updates.milestones;
        } else {
          memory.data = { ...memory.data, ...updates };
        }
        
        memory.timestamp = Date.now();
        
        await this.redisClient.set(key, JSON.stringify(memory));

        // Log the event
        if (subType) this.addEvent(subType, { table, id });

        // Update in-memory storage
        const memoryArray = this[`${table}Memory`] as MemoryEntry[];
        const index = memoryArray.findIndex(item => item.id === id);
        if (index !== -1) {
          memoryArray[index] = memory;
        }

        return true;
      }
      else if (this.singletonTables.includes(table)) {
        // Single key update for singleton objects
        const data = await this.redisClient.get(table);
        if (!data) return false;
        
        const memory = JSON.parse(data);
        memory.data = { ...memory.data, ...updates };
        memory.timestamp = Date.now();
        
        await this.redisClient.set(table, JSON.stringify(memory));

        // Log the event
        if (subType) this.addEvent(subType, { table, id });

        // Update in-memory storage
        this[`${table}Memory`] = memory;
        this.trimHistory(this[`${table}Memory`] as MemoryEntry[]);

        return true;
      }
      else {``
        // List tables don't support direct updates
        logger.warn(`Cannot update list-based table ${table} directly`);
        return false;
      }
    } catch (err) {
      logger.warn(`Failed to update ${table}:${id} in Redis:`, err);
      return false;
    }
  }

  // Delete Memory
  async deleteMemory(table: Tables, id: string, options?: { subType?: string }): Promise<void> {
    if (!this.redisClient) return;
    const subType = options?.subType;

    try {
      const data = await this.redisClient.lRange(table, 0, -1);
      const index = data.findIndex((item: string) => JSON.parse(item).id === id);
      if (index === -1) {
        logger.warn(`Memory entry not found: ${id}`);
        return;
      }

      this.redisClient.lRem(table, 1, data[index]);

      // Log the event
      if (subType) this.addEvent(subType, { table, id });
    } catch (error) {
      logger.warn("Failed to delete memory in Redis:", error);
    }
  }

  addEvent(type: string, data: any): void {
    const event: GameEvent = {
      type,
      data,
      timestamp: Date.now(),
    };

    this.eventMemory.push(event);
    this.trimHistory(this.eventMemory);

    // Store in Redis if available
    if (this.redisClient) {
      this.redisClient
        .lPush("event", JSON.stringify(event))
        .catch((err: any) => logger.warn("Failed to store event in Redis:", err));
    }

    logger.debug("Event stored:", event);
  }




//! Probably deprecate Start
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
        .lPush("chat_history", JSON.stringify(chatMessage))
        .catch((err: any) => logger.warn("Failed to store chat in Redis:", err));
    }

    logger.debug("Chat message stored:", chatMessage);
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
        .lPush("command_history", JSON.stringify(commandRecord))
        .catch((err: any) => logger.warn("Failed to store command in Redis:", err));
    }

    logger.debug("Command stored:", commandRecord);
  }

  updateAgentState(state: any): void {
    this.agentState =  { ...state, timestamp: Date.now() };

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
//! End of deprecation



  async loadFromRedis(): Promise<void> {
    if (!this.redisClient) return;

    try {
      // Load memory tables
      for (const table of this.tables) {
        if(this.listTables.includes(table) && table !== 'agent') {
          const data = await this.redisClient.lRange(table, 0, this.maxHistorySize - 1);
          this[`${table}Memory`] = data.map((item: string) => JSON.parse(item)).reverse();
        };
        if(this.objectTables.includes(table) && table !== 'agent') {
          const ids = await this.redisClient.sMembers(`${table}:ids`);
          const results = [];
          
          for (const id of ids) {
            const data = await this.redisClient.get(`${table}:${id}`);
            if (data) {
              results.push(JSON.parse(data));
            }
          }
          
          this[`${table}Memory`] = results.sort((a, b) => b.timestamp - a.timestamp);
        };
        if(this.singletonTables.includes(table)) {
          const data = await this.redisClient.get(table);
          if (data) {
            this[`${table}Memory`] = JSON.parse(data);
          }
        };
      }

      // Load chat history
      const chatData = await this.redisClient.lRange("chat_history", 0, this.maxHistorySize - 1);
      this.chatHistory = chatData.map((data: string) => JSON.parse(data)).reverse();

      // Load event history
      const eventData = await this.redisClient.lRange("event_history", 0, this.maxHistorySize - 1);
      this.eventHistory = eventData.map((data: string) => JSON.parse(data)).reverse();

      // Load command history
      const commandData = await this.redisClient.lRange("command_history", 0, this.maxHistorySize - 1);
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
























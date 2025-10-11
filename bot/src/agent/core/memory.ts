import { Discovery, ExplorationData, GoalData } from "../features/explore";
import { logger } from "../utils";
import { AgentState } from "./agent";

// 'events' | 'discovery' | 'chat' | 'command' | 'goals' | 'agent' | 'world';
//  Lists | Key-value | Singleton object
export type Tables = "events" | "goals" | "agent";
export type EventType =
  | "chat_message"
  | "command_executed"
  | "discovery_made"
  | "world_update"
  | "goal_progress"
  | "player_interaction"
  | "bot_log"
  | "system_event";

export type Data<T extends EventType = EventType> = T extends "chat_message"
  ? {
      username: string;
      message: string;
      response?: string;
      distance?: number;
      isNearby?: boolean;
      isLooking?: boolean;
    }
  : T extends "command_executed"
  ? {
      command: string;
      status?: "in_progress" | "info" | "completed" | "interrupted" | "invalid" | "failed";
      message?: string;
      metadata?: any;
    }
  : T extends "discovery_made"
  ? {
      event: string;
      blocks?: Discovery[];
      entities?: Discovery[];
      structures?: Discovery[];
      goals?: Discovery[];
      data?: any;
      metadata?: any;
    }
  : T extends "world_update"
  ? {
      data: any;
      metadata?: any;
    }
  : T extends "goal_progress"
  ? {
      goal: string;
      milestone?: string;
      data?: any;
      metadata?: any;
    }
  : T extends "player_interaction"
  ? {
      interaction: string;
      data?: any;
      metadata?: any;
    }
  : T extends "bot_log"
  ? {
      event: string;
      log: string;
      data: any;
      metadata?: any;
    }
  : T extends "system_event"
  ? {
      event: string;
      metadata?: any;
    }
  : never;

export interface MemoryEntry {
  id?: string;
  botId?: string;
  type: string;
  data?: any;
  severity?: number;
  retrieval?: Date;
  timestamp: number;
}

export interface AgentEntry {
  id: string;
  type: string;
  data: AgentState;
  timestamp: number;
}

export class Memory {
  private tables: Tables[] = [];
  public eventsMemory: MemoryEntry[] = [];
  public goalsMemory: MemoryEntry[] = [];
  public agentMemory: AgentEntry = { id: "agent", type: "agent", data: { connected: false }, timestamp: Date.now() };

  constructor() {
    this.tables = ["events", "goals", "agent"];
  }

  // Event memory management
  async createEvent(eventType: EventType, data: Data<typeof eventType>, severity: number = 0): Promise<string | null> {
    try {
      const botId =
        this.agentMemory.data.username ||
        (data as Data<"system_event">)?.metadata?.username ||
        this.agentMemory.data.subPort ||
        (data as Data<"system_event">)?.metadata?.subPort ||
        "unknown";

      const response = await fetch(`${process.env.STORAGE_SERVICE_URL}/events/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event_type: eventType,
          data: data,
          botId: botId,
          severity: severity,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: any = await response.json();
      logger.info(`Event created via storage service: ${eventType} (${result.event_id})`);
      return result.event_id;
    } catch (error) {
      logger.error(`Failed to create event via storage service: ${error}`);
      return null;
    }
  }

  // Chat-specific memory management
  async createChatEvent(chatData: Data<"chat_message">, severity: number = 1): Promise<string | null> {
    try {
      const botId = this.agentMemory.data.username || this.agentMemory.data.subPort || "unknown";

      const response = await fetch(`${process.env.STORAGE_SERVICE_URL}/chat/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: chatData.username,
          message: chatData.message,
          response: chatData.response,
          distance: chatData.distance,
          isNearby: chatData.isNearby,
          isLooking: chatData.isLooking,
          botId: botId,
          severity: severity,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: any = await response.json();
      logger.info(
        `Chat message created via storage service: ${chatData.username} -> "${chatData.message}" (${result.chat_id})`
      );
      return result.chat_id;
    } catch (error) {
      logger.error(`Failed to create chat message via storage service: ${error}`);
      return null;
    }
  }

  async getEvents(
    count: number = 10,
    filters?: {
      eventId?: string;
      botId?: string;
      eventType?: string;
      minSeverity?: number;
    }
  ): Promise<any[]> {
    try {
      const params = new URLSearchParams({
        count: count.toString(),
        ...(filters?.eventId && { event_id: filters.eventId }),
        ...(filters?.botId && { botId: filters.botId }),
        ...(filters?.eventType && { event_type: filters.eventType }),
        ...(filters?.minSeverity !== undefined && { min_severity: filters.minSeverity.toString() }),
      });

      const response = await fetch(`${process.env.STORAGE_SERVICE_URL}/events/?${params}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: any = await response.json();

      // Update local eventMemory for quick access
      this.eventsMemory = result.events.map((event: any) => ({
        id: event.id,
        type: event.type,
        data: event.data,
        timestamp: event.timestamp,
      }));

      return result.events;
    } catch (error) {
      logger.error(`Failed to get events via storage service: ${error}`);
      // Fallback to local storage
      return this.eventsMemory.slice(-count);
    }
  }

  // Goals memory management

  // Agent memory management
  updateAgentState(state: AgentState): void {
    // Store in memory and redis
    this.agentMemory = { id: "agent", type: "agent", data: state, timestamp: Date.now() };
    this.createEvent("bot_log", { event: "bot_status", data: state });
  }
}

import type { Memory } from "./memory";
import { GoalManager, type AgentStatus } from "./goals";
import { Feature } from "../../types";
import { type InteractionManager } from "../features/chatInteraction";
import { logger } from "../utils";
import { Bot } from "../bot";
import { Item } from "prismarine-item";
import mineflayer, { type Bot as MineflayerBot } from "mineflayer";


export interface AgentState {
  connected: boolean;
  status?: AgentStatus;
  username?: string;
  subPort?: number;
  password?: string;
  health?: number;
  food?: number;
  position?: { x: number; y: number; z: number };
  dimension?: string;
  gameMode?: string;

  goalListId?: string;
  currentGoal?: string | null;
  featureList?: Array<Feature>;

  memories?: any; // interactions, important events, things of interest, evolution
  inventory?: Item[];
  stats?: any; // Interactions stats

  timestamp?: number;

  deployment?: {
    project: string;
    instanceId: string;
    behavior: 'overwrite' | 'append' | 'bot' | 'destroy';
  }
  meta?: {
    version: string;
    lastUpdated: string;
  }
}

export class Agent {
  private bot: MineflayerBot | null = null;
  private memory: Memory;
  private goalManager: GoalManager;
  private interactionManager: InteractionManager | null = null;
  private featureManager: Set<Feature>;

  constructor(bot: MineflayerBot | null, memory: Memory, goalManager: GoalManager, interactionManager: InteractionManager | null, featureManager: Set<Feature>) {
    this.bot = bot;
    this.memory = memory;
    this.goalManager = goalManager;
    this.interactionManager = interactionManager;
    this.featureManager = featureManager;
  }

  getStatus(): AgentState {
    if (!this.bot) {
      return this.memory.agentMemory.data;
      // return { connected: false };
    }

    return this.memory?.agentMemory?.data;
  }

  getFeatures(): Set<{ name: string; status: boolean }> {
    return this.featureManager;
  }

  getInteractionManager(): InteractionManager | null {
    return this.interactionManager;
  }

  getGoalManager(): GoalManager {
    return this.goalManager;
  }

  updateStatus(newState: Partial<AgentState>, log: boolean = true): void {
    if (!this.bot) {
      logger.info("Bot not connected, skipping status update");
      return;
    };

    try {
      const status: AgentState = {
        connected: true,
        username: this.bot?.username,
        health: this.bot?.health,
        food: this.bot?.food,
        position: this.bot?.entity?.position,
        dimension: this.bot?.game?.dimension,
        gameMode: this.bot?.game?.gameMode,
        currentGoal: null,
        featureList: Array.from(this.getFeatures()),
        inventory: this.bot?.inventory?.items(),
        stats: this.interactionManager && this.interactionManager?.getInteractionStats(),
        timestamp: Date.now(),
      };
  
      const state = { ...this.memory?.agentMemory?.data, ...status, ...newState };
      this.memory.updateAgentState(state);
      log && logger.info("Agent state updated:", state);
    } catch (error) {
      logger.error("Failed to update agent state:", error);
    }
  }

  //handleLowHealth
  //handleLowFood
  //handleHurt
  //analyzeEnvironment
  //identifyThreats
}






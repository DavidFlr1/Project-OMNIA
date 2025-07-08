import type { Memory } from "./memory";
import { GoalManager, type AgentStatus } from "./goals";
import { logger } from "../utils";

export interface AgentState {
  currentGoal: string | null;
  status: AgentStatus;
  health: number;
  food: number;
  position: { x: number; y: number; z: number };
  inventory: Record<string, number>;
}

export class Agent {
  private memory: Memory;
  private state: AgentState;
  private goalManager: GoalManager;

  constructor(memory: Memory, goalManager: GoalManager) {
    this.memory = memory;
    this.goalManager = goalManager;
    this.state = {
      currentGoal: null,
      status: "idle",
      health: 20,
      food: 20,
      position: { x: 0, y: 0, z: 0 },
      inventory: {},
    };
  }

  updateState(newState: Partial<AgentState>): void {
    this.state = { ...this.state, ...newState };
    this.memory.updateAgentState(this.state);
    logger.debug("Agent state updated:", this.state);
  }

  // Update agent state based on current goal
  updateGoalState(): void {
    const activeGoal = this.goalManager.getActiveGoal();
    const status = this.goalManager.determineAgentStatus();
    
    this.updateState({
      currentGoal: activeGoal ? activeGoal.name : null,
      status
    });
  }

  handleLowHealth(): void {
    logger.warn("Low health detected, prioritizing safety");
    
    this.goalManager.createEmergencyHealthGoal();
    this.updateGoalState();
  }

  getState(): AgentState {
    return { ...this.state };
  }
}


  // handleLowFood(): void {
  //   logger.warn("Low food detected, prioritizing food gathering");

  //   this.goals.unshift("find_food");

  //   if (this.state.currentGoal !== "find_food") {
  //     this.setCurrentGoal("find_food");
  //   }
  // }

  // analyzeEnvironment(): any {
  //   // Get recent observations from memory
  //   const recentEvents = this.memory.getRecentEvents(10);
  //   const recentCommands = this.memory.getRecentCommands(5);

  //   return {
  //     threats: this.identifyThreats(recentEvents),
  //     opportunities: this.identifyOpportunities(recentEvents),
  //     resources: this.assessResources(),
  //     recommendations: this.generateRecommendations(recentEvents, recentCommands),
  //   };
  // }

  // private identifyThreats(events: any[]): string[] {
  //   const threats = [];

  //   events.forEach((event) => {
  //     if (event.type === "entity_hurt" && event.data.target === "self") {
  //       threats.push("Combat damage");
  //     }
  //     if (event.type === "low_health") {
  //       threats.push("Low health");
  //     }
  //     if (event.type === "hostile_mob_nearby") {
  //       threats.push("Hostile mobs");
  //     }
  //   });

  //   return threats;
  // }

  // private identifyOpportunities(events: any[]): string[] {
  //   const opportunities = [];

  //   events.forEach((event) => {
  //     if (event.type === "valuable_block_found") {
  //       opportunities.push(`Mining: ${event.data.blockType}`);
  //     }
  //     if (event.type === "structure_found") {
  //       opportunities.push(`Exploration: ${event.data.structureType}`);
  //     }
  //     if (event.type === "player_joined") {
  //       opportunities.push("Social interaction");
  //     }
  //   });

  //   return opportunities;
  // }

  // private assessResources(): any {
  //   return {
  //     health: this.state.health,
  //     food: this.state.food,
  //     inventory: this.state.inventory,
  //     tools: this.getAvailableTools(),
  //     weapons: this.getAvailableWeapons(),
  //   };
  // }

  // private getAvailableTools(): string[] {
  //   const tools = [];
  //   Object.keys(this.state.inventory).forEach((item) => {
  //     if (item.includes("pickaxe") || item.includes("shovel") || item.includes("axe")) {
  //       tools.push(item);
  //     }
  //   });
  //   return tools;
  // }

  // private getAvailableWeapons(): string[] {
  //   const weapons = [];
  //   Object.keys(this.state.inventory).forEach((item) => {
  //     if (item.includes("sword") || item.includes("bow")) {
  //       weapons.push(item);
  //     }
  //   });
  //   return weapons;
  // }

  // private generateRecommendations(events: any[], commands: any[]): string[] {
  //   const recommendations = [];

  //   // Health-based recommendations
  //   if (this.state.health < 10) {
  //     recommendations.push("Seek healing or food");
  //   }

  //   // Food-based recommendations
  //   if (this.state.food < 6) {
  //     recommendations.push("Find food sources");
  //   }

  //   // Tool-based recommendations
  //   const tools = this.getAvailableTools();
  //   if (tools.length === 0) {
  //     recommendations.push("Craft basic tools");
  //   }

  //   // Activity-based recommendations
  //   const recentActivity = commands.slice(-3);
  //   if (recentActivity.every((cmd) => cmd.includes("mine"))) {
  //     recommendations.push("Consider exploring or gathering different resources");
  //   }

  //   return recommendations;
  // }




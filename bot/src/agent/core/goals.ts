import { v4 as uuidv4 } from "uuid";
import { logger } from "../utils";
import type { Memory } from "./memory";

export type GoalType = "discovery" | "goal" | "command";
export type GoalPriority = "critical" | "high" | "medium" | "low";
export type AgentStatus = "idle" | "working" | "exploring" | "combat" | "gathering";
export type GoalStatus = "active" | "completed" | "archived" | "pending";

export interface Milestone {
  id: string;
  name: string;
  type: GoalType;
  priority: GoalPriority;
  status: GoalStatus;
  createdAt: number;
  completedAt?: number;
  parentGoalId: string;
  execute?: string | string[];
}

export interface Goal {
  id: string;
  name: string;
  type: GoalType;
  priority: GoalPriority;
  status: GoalStatus;
  milestones: Milestone[];
  createdAt: number;
  completedAt?: number;
  progress: number; // 0-100
  execute?: string | string[];
}

export class GoalManager {
  private goals: Goal[] = [];
  private memory: Memory;

  constructor(memory: Memory) {
    this.memory = memory;
  }

}

import { v4 as uuidv4 } from 'uuid';
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

  syncedGoals(): Goal[] {
    return this.memory.goalsMemory.map(m => m.data);
  }
  
  /**
   * Creates a goal and adds it to the goal list
   */
  createGoal(
    name: string, 
    type: GoalType = "goal", 
    priority: GoalPriority = "medium",
    milestones: Array<{name: string, type?: GoalType, priority?: GoalPriority, execute?: string | string[]}> = [],
    activate: boolean = false,
    execute?: string | string[]
  ): Goal {
    const goals = this.syncedGoals();
    const goalId = uuidv4();
    const now = Date.now();
    
    const goal: Goal = {
      id: goalId,
      name,
      type,
      priority,
      status: activate ? "active" : "pending",
      milestones: milestones.map(milestone => ({
        id: uuidv4(),
        name: milestone.name,
        type: milestone.type || "command",
        priority: milestone.priority || priority,
        status: "pending",
        createdAt: now,
        parentGoalId: goalId,
        execute: milestone.execute
      })),
      createdAt: now,
      progress: 0,
      execute
    };
    
    // Add the goal to the list
    goals.push(goal);
    
    // If activating, deactivate other goals
    if (activate) {
      goals.forEach(g => {
        if (g.id !== goalId && g.status === "active") {
          g.status = "pending";
        }
      });
      
      // Activate the first milestone if any
      if (goal.milestones.length > 0) {
        goal.milestones[0].status = "active";
      }
    }
    
    logger.info(`Goal created: ${name} (${goalId}), status: ${goal.status}`);
    this.memory.addMemory("goals", "goal", goal, { subType: "goal_created" });
    
    return goal;
  }
  
  /**
   * Creates a milestone and adds it to a goal
   */
  createMilestone(
    goalId: string,
    name: string, 
    type: GoalType = "command", 
    priority: GoalPriority = "medium",
    execute?: string | string[]
  ): Milestone | null {
    const goal = this.getGoal(goalId);
    if (!goal) {
      logger.warn(`Cannot add milestone: Goal with ID ${goalId} not found`);
      return null;
    }
    
    const milestone: Milestone = {
      id: uuidv4(),
      name,
      type,
      priority,
      status: "pending",
      createdAt: Date.now(),
      parentGoalId: goalId,
      execute
    };
    
    goal.milestones.push(milestone);
    logger.info(`Milestone added to goal ${goal.name}: ${name}`);
    this.memory.updateMemory("goals", goalId, { milestones: goal.milestones }, { subType: "milestone_created" });
    
    return milestone;
  }
  
  /**
   * Updates a goal's properties
   */
  updateGoal(goalId: string, updates: Partial<Omit<Goal, 'id' | 'createdAt' >>): boolean {
    const goal = this.getGoal(goalId);
    if (!goal) {
      logger.warn(`Cannot update goal: Goal with ID ${goalId} not found`);
      return false;
    }
    
    // Create a copy of updates that we may modify
    const updatesToApply = { ...updates };
    
    // Handle active status change
    if (updates.status === "active") {
      // Deactivate currently active goal
      const activeGoal = this.getActiveGoal();
      if (activeGoal && activeGoal.id !== goalId) {
        this.memory.updateMemory("goals", activeGoal.id, { status: "pending" }, { subType: "goal_update" });
      }
    }
    
    // Handle completed status change
    if (updates.status === "completed" && !goal.completedAt) {
      updatesToApply.completedAt = Date.now();
      updatesToApply.progress = 100;
      
      // Complete all milestones
      const completedMilestones: Milestone[] = goal.milestones.map(m => ({
        ...m,
        status: "completed",
        completedAt: m.completedAt || Date.now()
      }));
      updatesToApply.milestones = completedMilestones;
      
      // Activate next goal if this was active
      if (goal.status === "active") {
        setTimeout(() => this.activateNextGoal(), 0);
      }
    }
    
    // Apply all updates to memory in a single call
    this.memory.updateMemory("goals", goalId, updatesToApply, { subType: "goal_update" });
    
    logger.info(`Goal updated: ${goal.name} (${goal.id})`);
    return true;
  }
  
  /**
   * Updates a milestone's properties
   */
  updateMilestone(milestoneId: string, updates: Partial<Omit<Milestone, 'id' | 'createdAt' | 'parentGoalId'>>): boolean {
    for (const goal of this.syncedGoals()) {
      const milestone = goal.milestones.find(m => m.id === milestoneId);
      if (!milestone) continue;
      
      // Create a copy of updates that we may modify
      const updatesToApply = { ...updates };
      let updatedMilestones = [...goal.milestones];
      
      // Handle active status change
      if (updates.status === "active") {
        // Set other milestones to pending
        updatedMilestones = updatedMilestones.map(m => 
          m.id !== milestoneId && m.status === "active" ? { ...m, status: "pending" } : m
        );
      }
      
      // Handle completed status change
      if (updates.status === "completed" && !milestone.completedAt) {
        updatesToApply.completedAt = Date.now();
        
        this.memory.addEvent("milestone_completed", { 
          milestoneId, 
          milestoneName: milestone.name,
          goalId: goal.id,
          goalName: goal.name
        });
        
        // Update goal progress
        setTimeout(() => this.updateGoalProgress(goal.id), 0);
        
        // Activate next milestone if this was active
        if (milestone.status === "active") {
          const nextPending = goal.milestones.find(m => m.status === "pending");
          if (nextPending) {
            updatedMilestones = updatedMilestones.map(m => 
              m.id === nextPending.id ? { ...m, status: "active" } : m
            );
          } else {
            // All milestones completed, complete the goal
            setTimeout(() => this.updateGoal(goal.id, { status: "completed" }), 0);
          }
        }
      }
      
      // Apply updates to the milestone
      updatedMilestones = updatedMilestones.map(m => 
        m.id === milestoneId ? { ...m, ...updatesToApply } : m
      );
      
      // Update milestones in memory
      this.memory.updateMemory("goals", goal.id, { milestones: updatedMilestones }, { subType: "milestone_update" });
      
      logger.info(`Milestone updated: ${milestone.name} (${milestone.id})`);
      return true;
    }
    
    logger.warn(`Cannot update milestone: Milestone with ID ${milestoneId} not found`);
    return false;
  }
  
  /**
   * Deletes a goal
   */
  deleteGoal(goalId: string): boolean {
    const goals = this.syncedGoals();
    const index = goals.findIndex(g => g.id === goalId);
    if (index === -1) {
      logger.warn(`Cannot delete goal: Goal with ID ${goalId} not found`);
      return false;
    }
    
    const goal = goals[index];
    const wasActive = goal.status === "active";
    
    // Remove the goal
    goals.splice(index, 1);
    this.memory.deleteMemory("goals", goalId, { subType: "goal_deleted" });
    
    logger.info(`Goal deleted: ${goal.name} (${goal.id})`);
    this.memory.addEvent("goal_deleted", { goalId, goalName: goal.name });
    
    // If this was active, activate the next goal
    if (wasActive) {
      this.activateNextGoal();
    }
    
    return true;
  }
  
  /**
   * Deletes a milestone
   */
  deleteMilestone(milestoneId: string): boolean {
    for (const goal of this.goals) {
      const milestoneIndex = goal.milestones.findIndex(m => m.id === milestoneId);
      if (milestoneIndex !== -1) {
        const milestone = goal.milestones[milestoneIndex];
        const wasActive = milestone.status === "active";
        
        // Remove the milestone
        goal.milestones.splice(milestoneIndex, 1);
        
        logger.info(`Milestone deleted: ${milestone.name} (${milestone.id})`);
        this.memory.addEvent("milestone_deleted", { 
          milestoneId, 
          milestoneName: milestone.name,
          goalId: goal.id,
          goalName: goal.name
        });
        
        // Update goal progress
        this.updateGoalProgress(goal.id);
        
        // If this was active, activate the next milestone
        if (wasActive) {
          const nextMilestone = goal.milestones.find(m => m.status === "pending");
          if (nextMilestone) {
            nextMilestone.status = "active";
          }
        }
        
        return true;
      }
    }
    
    logger.warn(`Cannot delete milestone: Milestone with ID ${milestoneId} not found`);
    return false;
  }
  
  /**
   * Gets a goal by ID
   */
  getGoal(goalId: string): Goal | null {
    return this.syncedGoals().find(g => g.id === goalId) || null;
  }
  
  /**
   * Gets a milestone by ID
   */
  getMilestone(milestoneId: string): Milestone | null {
    for (const goal of this.syncedGoals()) {
      const milestone = goal.milestones.find(m => m.id === milestoneId);
      if (milestone) return milestone;
    }
    return null;
  }
  
  /**
   * Gets all goals with optional filters
   */
  getGoals(filters?: { status?: GoalStatus, type?: GoalType }): Goal[] {
    let result = [...this.syncedGoals()];
    
    if (filters) {
      if (filters.status) {
        result = result.filter(g => g.status === filters.status);
      }
      if (filters.type) {
        result = result.filter(g => g.type === filters.type);
      }
    }
    
    return result;
  }
  
  /**
   * Gets the active goal
   */
  getActiveGoal(): Goal | null {
    return this.syncedGoals().find(g => g.status === "active") || null;
  }
  
  /**
   * Gets the active milestone of the given goal
   */
  getActiveMilestone(goalId?: string): Milestone | null {
    if (!goalId) return null;

    const goal = this.getGoal(goalId);
    if (!goal) return null;
    return goal.milestones.find(m => m.status === "active") || null;
  }
  
  /**
   * Activates a goal by ID
   */
  activateGoal(goalId: string): boolean {
    return this.updateGoal(goalId, { status: "active" });
  }
  
  /**
   * Completes a goal by ID
   */
  completeGoal(goalId: string): boolean {
    return this.updateGoal(goalId, { status: "completed" });
  }
  
  /**
   * Activates a milestone by ID
   */
  activateMilestone(milestoneId: string): boolean {
    return this.updateMilestone(milestoneId, { status: "active" });
  }
  
  /**
   * Completes a milestone by ID
   */
  completeMilestone(milestoneId: string): boolean {
    return this.updateMilestone(milestoneId, { status: "completed" });
  }
  
  /**
   * Activates the next highest priority goal
   */
  private activateNextGoal(): void {
    // Filter out completed and archived goals
    const availableGoals = this.goals.filter(g => 
      g.status !== "completed" && g.status !== "archived"
    );
    
    if (availableGoals.length === 0) {
      logger.info("No more goals available, agent is now idle");
      return;
    }
    
    // Sort by priority
    const priorityValues: Record<GoalPriority, number> = {
      "critical": 4,
      "high": 3,
      "medium": 2,
      "low": 1
    };
    
    availableGoals.sort((a, b) => 
      priorityValues[b.priority] - priorityValues[a.priority]
    );
    
    // Activate the highest priority goal
    this.activateGoal(availableGoals[0].id);
  }
  
  /**
   * Updates a goal's progress based on completed milestones
   */
  private updateGoalProgress(goalId: string): void {
    const goal = this.getGoal(goalId);
    if (!goal) return;
    
    const totalMilestones = goal.milestones.length;
    const completedMilestones = goal.milestones.filter(m => m.status === "completed").length;
    
    goal.progress = totalMilestones > 0 
      ? Math.round((completedMilestones / totalMilestones) * 100)
      : (goal.status === "completed" ? 100 : 0);
  }
  
  /**
   * Determines the appropriate agent status based on the active goal and milestone
   */
  determineAgentStatus(): AgentStatus {
    const activeGoal = this.getActiveGoal();
    if (!activeGoal) return "idle";
    
    // Simple mapping based on goal type
    if (activeGoal.type === "discovery") return "exploring";
    
    // Check active milestone for more specific status
    const activeMilestone = this.getActiveMilestone();
    if (activeMilestone) {
      const name = activeMilestone.name.toLowerCase();
      
      if (name.includes("mine") || name.includes("collect") || name.includes("harvest")) {
        return "gathering";
      }
      
      if (name.includes("attack") || name.includes("defend") || name.includes("flee")) {
        return "combat";
      }
      
      if (name.includes("explore") || name.includes("scout")) {
        return "exploring";
      }
    }
    
    return "working";
  }
  
  /**
   * Creates an emergency goal for handling low health
   */
  createEmergencyHealthGoal(): Goal {
    return this.createGoal(
      "find_shelter", 
      "goal", 
      "critical", 
      [
        { name: "move to safe location", type: "command", priority: "critical" },
        { name: "find cover", type: "command", priority: "critical" },
        { name: "locate food source", type: "discovery", priority: "high" },
        { name: "collect food", type: "command", priority: "high" }
      ],
      true // Activate immediately
    );
  }
}











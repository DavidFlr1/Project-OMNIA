import express from "express";
import type { Bot } from "../../bot";
import { logger } from "../../utils";
import { GoalStatus, GoalType, GoalPriority } from "../../core/goals";

export function createGoalsRouter(bot: Bot): express.Router {
  const router = express.Router();

  // Get all goals
  router.get("/", (req, res) => {
    try {
      const botInstance = bot.getBot();
      if (!botInstance) {
        return res.status(503).json({ error: "Bot is not connected" });
      }
      
      const goalManager = bot.getGoalManager();
      
      // Get optional filters from query params
      const status = req.query.status as GoalStatus | undefined;
      const type = req.query.type as GoalType | undefined;
      
      const goals = goalManager.getGoals({ status, type });
      res.json({ goals, count: goals.length });
    } catch (error) {
      logger.error("API goals retrieval failed:", error);
      res.status(500).json({
        error: "Goals retrieval failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Get a specific goal
  router.get("/:goalId", (req, res) => { 
    try {
      const { goalId } = req.params;
      
      const botInstance = bot.getBot();
      if (!botInstance) {
        return res.status(503).json({ error: "Bot is not connected" });
      }
      
      const goalManager = bot.getGoalManager();
      const goal = goalManager.getGoal(goalId);
      
      if (!goal) {
        return res.status(404).json({ error: "Goal not found" });
      }
      
      res.json(goal);
    } catch (error) {
      logger.error("API goal retrieval failed:", error);
      res.status(500).json({
        error: "Goal retrieval failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });
  
  // Create a new goal
  router.post("/", (req, res) => {
    try {
      const { name, type, priority, milestones, activate, execute } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: "Goal name is required" });
      }
      
      const botInstance = bot.getBot();
      if (!botInstance) {
        return res.status(503).json({ error: "Bot is not connected" });
      }
      
      const goalManager = bot.getGoalManager();
      const goal = goalManager.createGoal(
        name, 
        type as GoalType || "goal", 
        priority as GoalPriority || "medium", 
        milestones || [],
        activate || false,
        execute
      );
      
      // Update agent state
      bot.getAgent().updateGoalState();
      
      res.status(201).json({ success: true, goal });
    } catch (error) {
      logger.error("API goal creation failed:", error);
      res.status(500).json({
        error: "Goal creation failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });
  
  // Create milestone for a goal
  router.post("/:goalId/milestones", (req, res) => {
    try {
      const { goalId } = req.params;
      const { name, type, priority, execute } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: "Milestone name is required" });
      }
      
      const botInstance = bot.getBot();
      if (!botInstance) {
        return res.status(503).json({ error: "Bot is not connected" });
      }
      
      const goalManager = bot.getGoalManager();
      const milestone = goalManager.createMilestone(
        goalId,
        name,
        type as GoalType || "command",
        priority as GoalPriority || "medium",
        execute
      );
      
      if (!milestone) {
        return res.status(404).json({ error: "Goal not found" });
      }
      
      res.status(201).json({ success: true, milestone });
    } catch (error) {
      logger.error("API milestone creation failed:", error);
      res.status(500).json({
        error: "Milestone creation failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });
  
  // Update a goal
  router.put("/:goalId", (req, res) => {
    try {
      const { goalId } = req.params;
      const updates = req.body;
      
      const botInstance = bot.getBot();
      if (!botInstance) {
        return res.status(503).json({ error: "Bot is not connected" });
      }
      
      const goalManager = bot.getGoalManager();
      const success = goalManager.updateGoal(goalId, updates);
      
      if (!success) {
        return res.status(404).json({ error: "Goal not found" });
      }
      
      // Update agent state
      bot.getAgent().updateGoalState();
      
      const updatedGoal = goalManager.getGoal(goalId);
      res.json({ success: true, goal: updatedGoal });
    } catch (error) {
      logger.error("API goal update failed:", error);
      res.status(500).json({
        error: "Goal update failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });
  
  // Update a milestone
  router.put("/milestones/:milestoneId", (req, res) => {
    try {
      const { milestoneId } = req.params;
      const updates = req.body;
      
      const botInstance = bot.getBot();
      if (!botInstance) {
        return res.status(503).json({ error: "Bot is not connected" });
      }
      
      const goalManager = bot.getGoalManager();
      const success = goalManager.updateMilestone(milestoneId, updates);
      
      if (!success) {
        return res.status(404).json({ error: "Milestone not found" });
      }
      
      // Update agent state
      bot.getAgent().updateGoalState();
      
      const updatedMilestone = goalManager.getMilestone(milestoneId);
      res.json({ success: true, milestone: updatedMilestone });
    } catch (error) {
      logger.error("API milestone update failed:", error);
      res.status(500).json({
        error: "Milestone update failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });
  
  // Complete a goal
  router.put("/:goalId/complete", (req, res) => {
    try {
      const { goalId } = req.params;
      
      const botInstance = bot.getBot();
      if (!botInstance) {
        return res.status(503).json({ error: "Bot is not connected" });
      }
      
      const goalManager = bot.getGoalManager();
      const success = goalManager.completeGoal(goalId);
      
      if (!success) {
        return res.status(404).json({ error: "Goal not found or already completed" });
      }
      
      // Update agent state
      bot.getAgent().updateGoalState();
      
      res.json({ success: true });
    } catch (error) {
      logger.error("API goal completion failed:", error);
      res.status(500).json({
        error: "Goal completion failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });
  
  // Complete a milestone
  router.put("/milestones/:milestoneId/complete", (req, res) => {
    try {
      const { milestoneId } = req.params;
      
      const botInstance = bot.getBot();
      if (!botInstance) {
        return res.status(503).json({ error: "Bot is not connected" });
      }
      
      const goalManager = bot.getGoalManager();
      const success = goalManager.completeMilestone(milestoneId);
      
      if (!success) {
        return res.status(404).json({ error: "Milestone not found or already completed" });
      }
      
      // Update agent state
      bot.getAgent().updateGoalState();
      
      res.json({ success: true });
    } catch (error) {
      logger.error("API milestone completion failed:", error);
      res.status(500).json({
        error: "Milestone completion failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });
  
  // Delete a goal
  router.delete("/:goalId", (req, res) => {
    try {
      const { goalId } = req.params;
      
      const botInstance = bot.getBot();
      if (!botInstance) {
        return res.status(503).json({ error: "Bot is not connected" });
      }
      
      const goalManager = bot.getGoalManager();
      const success = goalManager.deleteGoal(goalId);
      
      if (!success) {
        return res.status(404).json({ error: "Goal not found" });
      }
      
      // Update agent state
      bot.getAgent().updateGoalState();
      
      res.json({ success: true });
    } catch (error) {
      logger.error("API goal deletion failed:", error);
      res.status(500).json({
        error: "Goal deletion failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });
  
  // Delete a milestone
  router.delete("/milestones/:milestoneId", (req, res) => {
    try {
      const { milestoneId } = req.params;
      
      const botInstance = bot.getBot();
      if (!botInstance) {
        return res.status(503).json({ error: "Bot is not connected" });
      }
      
      const goalManager = bot.getGoalManager();
      const success = goalManager.deleteMilestone(milestoneId);
      
      if (!success) {
        return res.status(404).json({ error: "Milestone not found" });
      }
      
      // Update agent state
      bot.getAgent().updateGoalState();
      
      res.json({ success: true });
    } catch (error) {
      logger.error("API milestone deletion failed:", error);
      res.status(500).json({
        error: "Milestone deletion failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });
  
  // Activate a goal
  router.put("/:goalId/activate", (req, res) => {
    try {
      const { goalId } = req.params;
      const { milestoneId } = req.body;
      
      const botInstance = bot.getBot();
      if (!botInstance) {
        return res.status(503).json({ error: "Bot is not connected" });
      }
      
      const goalManager = bot.getGoalManager();
      
      // First activate the goal
      const goalSuccess = goalManager.activateGoal(goalId);
      if (!goalSuccess) {
        return res.status(404).json({ error: "Goal not found" });
      }
      
      // If a milestone ID was provided, activate that milestone
      let milestoneSuccess = true;
      if (milestoneId) {
        milestoneSuccess = goalManager.activateMilestone(milestoneId);
        if (!milestoneSuccess) {
          return res.status(404).json({ error: "Milestone not found" });
        }
      }
      
      // Update agent state
      bot.getAgent().updateGoalState();
      
      res.json({ 
        success: true,
        goal: goalManager.getGoal(goalId),
        activeMilestone: milestoneId ? goalManager.getMilestone(milestoneId) : goalManager.getActiveMilestone()
      });
    } catch (error) {
      logger.error("API goal activation failed:", error);
      res.status(500).json({
        error: "Goal activation failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  return router;
}


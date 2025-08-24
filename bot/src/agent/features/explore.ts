import { goals } from "mineflayer-pathfinder";
import type { Bot as MineflayerBot } from "mineflayer";
import type { Memory } from "../core/memory";
import { logger } from "../utils";

export interface Discovery { name: string; position: { x: number; y: number; z: number }; }
export interface ExplorationData {
  blocks: Array<Discovery>;
  entities: Array<Discovery>;
  structures: Array<Discovery>;
}

export interface GoalData {
  goals: Array<Discovery>;
}

export class ExploreCommands {
  private isExploring = false;
  private exploredAreas: Set<string> = new Set();

  async explore(bot: MineflayerBot, args: string[], memory: Memory): Promise<void> {
    if (args.length < 2) {
      bot.chat("Usage: explore <radius|scout> <radius_number|distance> [direction] [report_at] [goals...]");
      memory.createEvent("command_executed", { 
        command: `explore ${args.join(" ")}`, 
        status: "invalid", 
        message: "Invalid args. `Usage: explore <radius|scout> <radius_number|distance> [direction] [report_at] [goals...]" 
      });
      return;
    }

    const mode = args[0].toLowerCase();
    const distance = Number.parseInt(args[1]);
    const direction = args[2]?.toLowerCase() || "north";
    const reportAt = args[3] ? Number.parseInt(args[3]) : 30;
    const goalsList = args.slice(4);

    if (mode !== "radius" && mode !== "scout") {
      bot.chat("Mode must be 'radius' or 'scout'");
      return;
    }

    if (isNaN(distance) || distance <= 0) {
      bot.chat("Invalid distance/radius");
      return;
    }

    this.isExploring = true;
    logger.info(`Starting ${mode} exploration with distance ${distance}, report every ${reportAt} blocks`);
    memory.createEvent("command_executed", { 
      command: `explore ${args.join(" ")}`, 
      status: "in_progress" 
    });

    try {
      const startPos = bot.entity.position.clone();
      const points = mode === "radius" 
        ? this.generateRadiusPoints(startPos, distance, reportAt)
        : this.generateScoutPoints(startPos, distance, direction, reportAt);

      for (let i = 0; i < points.length && this.isExploring; i++) {
        const point = points[i];
        
        try {
          logger.info(`Moving to exploration point ${i + 1}/${points.length}: (${point.x}, ${point.z})`);
          const goal = new goals.GoalXZ(point.x, point.z);
          await bot.pathfinder.goto(goal);

          // Scan area with half of report_at radius
          const scanRadius = Math.floor(reportAt / 2);
          const areaKey = `${Math.floor(point.x / scanRadius)},${Math.floor(point.z / scanRadius)}`;
          
          if (!this.exploredAreas.has(areaKey)) {
            this.exploredAreas.add(areaKey);
            
            if (goalsList.length > 0) {
              const goalData = await this.scanForGoals(bot, scanRadius, goalsList);
              // store goalData in memory and variable,
              memory.createEvent("discovery_made", { 
                event: 'found',
                goals: goalData.goals, 
              });
              logger.info(`Goals found at point ${i + 1}:`, goalData);
            } else {
              const explorationData = await this.scanArea(bot, scanRadius);
              // store explorationData in memory and variable
              memory.createEvent("discovery_made", { 
                event: 'discovery',
                blocks: explorationData.blocks, 
                entities: explorationData.entities,
                structures: explorationData.structures
              });
              logger.info(`Area data at point ${i + 1}:`, explorationData);
            }
          }

          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          logger.warn(`Failed to reach point (${point.x}, ${point.z}):`, error);
        }
      }

      bot.chat("Exploration completed");
      logger.info("Exploration completed");
      memory.createEvent("command_executed", { 
        command: `explore ${args.join(" ")}`, 
        status: "completed" 
      });
    } catch (error) {
      logger.error("Exploration failed:", error);
      bot.chat("Exploration failed");
      memory.createEvent("command_executed", { 
        command: `explore ${args.join(" ")}`, 
        status: "failed", 
        message: "Exploration failed"
      });
    } finally {
      this.isExploring = false;
    }
  }

  private generateRadiusPoints(center: any, radius: number, reportAt: number): Array<{ x: number; z: number }> {
    const points = [];
    const numRings = Math.ceil(radius / reportAt);
    
    for (let ring = 1; ring <= numRings; ring++) {
      const ringRadius = ring * reportAt;
      const circumference = 2 * Math.PI * ringRadius;
      const pointsInRing = Math.max(8, Math.floor(circumference / reportAt));
      
      for (let i = 0; i < pointsInRing; i++) {
        const angle = (2 * Math.PI * i) / pointsInRing;
        points.push({
          x: Math.floor(center.x + Math.cos(angle) * ringRadius),
          z: Math.floor(center.z + Math.sin(angle) * ringRadius)
        });
      }
    }
    
    return points;
  }

  private generateScoutPoints(center: any, distance: number, direction: string, reportAt: number): Array<{ x: number; z: number }> {
    const directions: Record<string, { x: number; z: number }> = {
      north: { x: 0, z: -1 },
      south: { x: 0, z: 1 },
      east: { x: 1, z: 0 },
      west: { x: -1, z: 0 },
      northeast: { x: 1, z: -1 },
      northwest: { x: -1, z: -1 },
      southeast: { x: 1, z: 1 },
      southwest: { x: -1, z: 1 }
    };

    const dir = directions[direction];
    if (!dir) {
      throw new Error(`Invalid direction: ${direction}`);
    }

    const points = [];
    const numPoints = Math.ceil(distance / reportAt);
    
    for (let i = 1; i <= numPoints; i++) {
      const currentDistance = i * reportAt + (i > 1 ? 1 : 0); // Add +1 after first point
      points.push({
        x: Math.floor(center.x + dir.x * currentDistance),
        z: Math.floor(center.z + dir.z * currentDistance)
      });
    }
    
    return points;
  }

  private async scanArea(bot: MineflayerBot, radius: number): Promise<ExplorationData> {
    const data: ExplorationData = {
      blocks: [],
      entities: [],
      structures: []
    };

    const currentPos = bot.entity.position;
    const valuableBlocks = [
      "diamond_ore", "gold_ore", "iron_ore", "coal_ore", "lapis_ore", "redstone_ore",
      "emerald_ore", "chest", "spawner", "beacon", "end_portal", "nether_portal"
    ];

    // Scan for valuable blocks
    const foundBlocks = bot.findBlocks({
      matching: (block) => valuableBlocks.includes(block.name),
      maxDistance: radius,
      count: 50
    });

    for (const blockPos of foundBlocks) {
      const block = bot.blockAt(blockPos);
      if (block) {
        data.blocks.push({
          name: block.name,
          position: { x: blockPos.x, y: blockPos.y, z: blockPos.z }
        });
      }
    }

    // Scan for entities (animals, mobs, items)
    Object.values(bot.entities).forEach(entity => {
      if (entity.position.distanceTo(currentPos) <= radius && entity !== bot.entity) {
        const entityType = entity.mobType || entity.objectType || "unknown";
        data.entities.push({
          name: entityType,
          position: { x: entity.position.x, y: entity.position.y, z: entity.position.z }
        });
      }
    });

    // Identify structures based on block patterns
    data.structures = this.identifyStructuresFromBlocks(data.blocks);

    return data;
  }

  private async scanForGoals(bot: MineflayerBot, radius: number, goals: string[]): Promise<GoalData> {
    const data: GoalData = { goals: [] };
    
    // Scan for goal blocks
    const foundBlocks = bot.findBlocks({
      matching: (block) => goals.includes(block.name),
      maxDistance: radius,
      count: 20
    });

    for (const blockPos of foundBlocks) {
      const block = bot.blockAt(blockPos);
      if (block) {
        data.goals.push({
          name: block.name,
          position: { x: blockPos.x, y: blockPos.y, z: blockPos.z }
        });
      }
    }

    // Scan for goal entities
    Object.values(bot.entities).forEach(entity => {
      if (entity.position.distanceTo(bot.entity.position) <= radius) {
        const entityType = entity.mobType || entity.objectType || "unknown";
        if (goals.includes(entityType)) {
          data.goals.push({
            name: entityType,
            position: { x: entity.position.x, y: entity.position.y, z: entity.position.z }
          });
        }
      }
    });

    return data;
  }

  private identifyStructuresFromBlocks(blocks: Array<{ name: string; position: any }>): Array<{ name: string; position: any }> {
    const structures = [];
    const blockNames = blocks.map(b => b.name);

    if (blockNames.includes("cobblestone") && blockNames.includes("mossy_cobblestone")) {
      const dungeonBlock = blocks.find(b => b.name === "cobblestone");
      if (dungeonBlock) {
        structures.push({ name: "Dungeon", position: dungeonBlock.position });
      }
    }

    if (blockNames.includes("nether_bricks")) {
      const fortressBlock = blocks.find(b => b.name === "nether_bricks");
      if (fortressBlock) {
        structures.push({ name: "Nether Fortress", position: fortressBlock.position });
      }
    }

    return structures;
  }

  stopExploring(): void {
    this.isExploring = false;
  }

  async resetExplore(bot: MineflayerBot, memory: Memory): Promise<void> {
    this.exploredAreas.clear();
    bot.chat("Exploration areas reset");
    logger.info("Exploration areas reset");
    memory.createEvent("command_executed", { 
      command: "reset_explore", 
      status: "completed",
      message: "Exploration areas cleared"
    });
  }
}

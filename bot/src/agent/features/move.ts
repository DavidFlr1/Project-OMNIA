import { goals } from "mineflayer-pathfinder";
import type { Bot as MineflayerBot } from "mineflayer";
import type { Memory } from "../core/memory";
import { logger } from "../utils";

export class MoveCommands {
  private isPatrolling = false;
  private patrolPoints: Array<{ x: number; z: number }> = [];
  private currentPatrolIndex = 0;
  private _followInterval: NodeJS.Timeout | null = null;

  async goto(bot: MineflayerBot, args: string[], memory: Memory): Promise<void> {
    if (args.length < 3) {
      bot.chat("Usage: goto <x> <y> <z>");
      memory.createEvent("command_executed", {
        command: `goto ${args.join(" ")}`,
        status: "invalid",
        message: "Invalid args. `Usage: goto <x> <y> <z>`",
      });
      return;
    }

    const x = Number.parseFloat(args[0]);
    const y = Number.parseFloat(args[1]);
    const z = Number.parseFloat(args[2]);

    if (isNaN(x) || isNaN(y) || isNaN(z)) {
      bot.chat("Invalid coordinates. Please provide numbers.");
      return;
    }

    try {
      logger.info(`Moving to position: (${x}, ${y}, ${z})`);
      memory.createEvent("command_executed", { command: `goto ${x} ${y} ${z}`, status: "in_progress" });

      const goal = new goals.GoalBlock(x, y, z);
      await bot.pathfinder.goto(goal);

      memory.createEvent("command_executed", {
        command: `goto ${x} ${y} ${z}`,
        status: "completed",
        message: "Arrived at destination",
      });
      logger.info("Successfully reached destination");
    } catch (error) {
      logger.error("Having trouble reaching destination:", error);
      memory.createEvent("command_executed", {
        command: `goto ${x} ${y} ${z}`,
        status: "failed",
        message: `Having trouble reaching destination, error: ${error}`,
      });
    }
  }

  async follow(bot: MineflayerBot, args: string[], memory: Memory): Promise<void> {
    if (args.length < 1) {
      bot.chat("Usage: follow <player>");
      memory.createEvent("command_executed", {
        command: `follow ${args.join(" ")}`,
        status: "invalid",
        message: "Invalid args. `Usage: follow <player>`",
      });
      return;
    }

    const playerName = args[0];
    const target = bot.players[playerName];

    if (!target || !target.entity) {
      memory.createEvent("command_executed", {
        command: `follow ${playerName}`,
        status: "failed",
        message: `Player ${playerName} not found`,
      });
      return;
    }

    try {
      logger.info(`Following player: ${playerName}`);
      memory.createEvent("command_executed", { command: `follow ${playerName}`, status: "in_progress" });
      bot.chat(`Following ${playerName}`);

      // Set up continuous following
      const followInterval = setInterval(async () => {
        // Check if player still exists
        const player = bot.players[playerName];
        if (!player || !player.entity) {
          clearInterval(followInterval);
          logger.info(`Player ${playerName} no longer found, stopping follow`);
          memory.createEvent("command_executed", {
            command: `follow ${playerName}`,
            status: "interrupted",
            message: `Player ${playerName} lost, stopping follow`,
          });
          return;
        }

        // Update goal to follow player's current position
        const goal = new goals.GoalFollow(player.entity, 2);
        bot.pathfinder.setGoal(goal);
      }, 1000); // Update path every second

      // Store the interval so it can be cleared by the stay command
      this._followInterval = followInterval;
    } catch (error) {
      logger.error("Failed to follow player:", error);
      memory.createEvent("command_executed", {
        command: `follow ${playerName}`,
        status: "failed",
        message: `Failed to follow player, error: ${error}`,
      });
    }
  }

  async reach(bot: MineflayerBot, args: string[], memory: Memory): Promise<void> {
    if (args.length < 1) {
      bot.chat("Usage: reach <player>");
      memory.createEvent("command_executed", {
        command: `reach ${args.join(" ")}`,
        status: "invalid",
        message: "Invalid args. `Usage: reach <player>`",
      });
      return;
    }

    const playerName = args[0];
    const target = bot.players[playerName];

    if (!target || !target.entity) {
      memory.createEvent("command_executed", {
        command: `reach ${playerName}`,
        status: "failed",
        message: `Player ${playerName} not found`,
      });
      return;
    }

    try {
      logger.info(`Reaching player: ${playerName}`);
      memory.createEvent("command_executed", { command: `reach ${playerName}`, status: "in_progress" });

      const goal = new goals.GoalFollow(target.entity, 2);
      await bot.pathfinder.goto(goal);
    } catch (error) {
      logger.error("Failed to reach player:", error);
      memory.createEvent("command_executed", {
        command: `reach ${playerName}`,
        status: "failed",
        message: `Failed to reach player, error: ${error}`,
      });
    }
  }

  async patrol(bot: MineflayerBot, args: string[], memory: Memory): Promise<void> {
    if (args.length < 4) {
      bot.chat("Usage: patrol <x1> <z1> <x2> <z2>");
      memory.createEvent("command_executed", {
        command: `patrol ${args.join(" ")}`,
        status: "invalid",
        message: "Invalid args. `Usage: patrol <x1> <z1> <x2> <z2>`",
      });
      return;
    }

    const x1 = Number.parseFloat(args[0]);
    const z1 = Number.parseFloat(args[1]);
    const x2 = Number.parseFloat(args[2]);
    const z2 = Number.parseFloat(args[3]);

    if (isNaN(x1) || isNaN(z1) || isNaN(x2) || isNaN(z2)) {
      memory.createEvent("command_executed", {
        command: `patrol ${args.join(" ")}`,
        status: "failed",
        message: "Invalid coordinates. Please provide numbers.",
      });
      return;
    }

    this.patrolPoints = [
      { x: x1, z: z1 },
      { x: x2, z: z2 },
    ];
    this.currentPatrolIndex = 0;
    this.isPatrolling = true;

    logger.info(`Starting patrol between (${x1}, ${z1}) and (${x2}, ${z2})`);
    memory.createEvent("command_executed", { command: `patrol ${args.join(" ")}`, status: "in_progress" });

    while (this.isPatrolling && this.patrolPoints.length > 0) {
      const point = this.patrolPoints[this.currentPatrolIndex];

      try {
        const goal = new goals.GoalXZ(point.x, point.z);
        await bot.pathfinder.goto(goal);

        // Wait a bit at each patrol point
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Move to next patrol point
        this.currentPatrolIndex = (this.currentPatrolIndex + 1) % this.patrolPoints.length;
      } catch (error) {
        logger.error("Patrol error:", error);
        memory.createEvent("command_executed", {
          command: `patrol ${args.join(" ")}`,
          status: "failed",
          message: `Patrol error: ${error}`,
        });
        break;
      }
    }
  }

  async stay(bot: MineflayerBot, memory: Memory): Promise<void> {
    // Clear any active follow interval
    if (this._followInterval) {
      clearInterval(this._followInterval);
      this._followInterval = null;
    }

    this.isPatrolling = false;
    bot.pathfinder.stop();
    memory.createEvent("command_executed", { command: `stay`, status: "completed", message: "Movement stopped" });
    logger.info("Movement stopped");
  }
}

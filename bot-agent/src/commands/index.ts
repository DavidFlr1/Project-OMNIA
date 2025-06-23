import type { Bot as MineflayerBot } from "mineflayer";
import type { Memory } from "../logic/memory";
import { MoveCommands } from "./move";
import { GatherCommands } from "./gather";
import { CombatCommands } from "./combat";
import { ExploreCommands } from "./explore";
import { UtilityCommands } from "./utility";
import { logger } from "../utils";
import { getHelp } from "../utils";

export class CommandHandler {
  private moveCommands: MoveCommands;
  private gatherCommands: GatherCommands;
  private combatCommands: CombatCommands;
  private exploreCommands: ExploreCommands;
  private utilityCommands: UtilityCommands;

  constructor() {
    this.moveCommands = new MoveCommands();
    this.gatherCommands = new GatherCommands();
    this.combatCommands = new CombatCommands();
    this.exploreCommands = new ExploreCommands();
    this.utilityCommands = new UtilityCommands();
  }

  async execute(command: string, bot: MineflayerBot, memory: Memory): Promise<void> {
    const [action, ...args] = command.trim().split(" ");

    logger.info(`Executing command: ${action} with args: ${args.join(" ")}`);

    try {
      switch (action.toLowerCase()) {
        // Movement commands
        case "goto":
        case "move":
          await this.moveCommands.goto(bot, args);
          break;
        case "follow":
          await this.moveCommands.follow(bot, args);
          break;
        case "reach":
          await this.moveCommands.reach(bot, args);
          break;
        case "patrol":
          await this.moveCommands.patrol(bot, args);
          break;
        case "stay":
          await this.moveCommands.stay(bot);
          break;

        // Gathering commands
        case "mine":
          await this.gatherCommands.mine(bot, args);
          break;
        case "collect":
          await this.gatherCommands.collect(bot, args);
          break;
        case "harvest":
          await this.gatherCommands.harvest(bot, args);
          break;

        // Combat commands
        case "attack":
          await this.combatCommands.attack(bot, args);
          break;
        case "defend":
          await this.combatCommands.defend(bot, args);
          break;
        case "flee":
          await this.combatCommands.flee(bot, args);
          break;

        // Exploration commands
        case "explore":
          await this.exploreCommands.explore(bot, args);
          break;
        case "scout":
          await this.exploreCommands.scout(bot, args);
          break;
        case "map":
          await this.exploreCommands.mapArea(bot, args);
          break;

        // Utility commands
        case "status":
          await this.utilityCommands.showStatus(bot);
          break;
        case "inventory":
          await this.utilityCommands.showInventory(bot);
          break;
        case "disable":
          await this.utilityCommands.disable(bot, args);
          break;

        // Help commands
        case "help":
          this.handleHelp(bot, args);
          break;

        default:
          logger.warn(`Unknown command: ${action}`);
          bot.chat(`Unknown command: ${action}. Type 'help' for available commands.`);
      }

      // Store command in memory
      memory.addCommand(command);
    } catch (error) {
      logger.error(`Error executing command ${action}:`, error);
      bot.chat(`Error executing command: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  private handleHelp(bot: MineflayerBot, args: string[]): void {
    const query = args.length > 0 ? args[0] : undefined;
    const helpLines = getHelp(query);

    // Send help lines with delays to prevent spam kick
    helpLines.forEach((line, index) => {
      setTimeout(() => {
        bot.chat(line);
      }, index * 500);
    });
  }
}

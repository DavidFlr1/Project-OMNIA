import type { Bot as MineflayerBot } from "mineflayer";
import type { Memory } from "../core/memory";
import { MoveCommands } from "./move";
import { GatherCommands } from "./gather";
import { BuildCommands } from "./build";
import { CombatCommands } from "./combat";
import { ExploreCommands } from "./explore";
import { UtilityCommands } from "./utility";
import { logger } from "../utils";
import { getHelp } from "../utils";
import { Feature } from "../../types";

export class CommandHandler {
  private moveCommands: MoveCommands;
  private gatherCommands: GatherCommands;
  private build: BuildCommands;
  private combatCommands: CombatCommands;
  private exploreCommands: ExploreCommands;
  private utilityCommands: UtilityCommands;

  constructor() {
    this.moveCommands = new MoveCommands();
    this.gatherCommands = new GatherCommands();
    this.build = new BuildCommands();
    this.combatCommands = new CombatCommands();
    this.exploreCommands = new ExploreCommands();
    this.utilityCommands = new UtilityCommands();
  }

  async execute(command: string, bot: MineflayerBot, memory: Memory, featureManager: Set<Feature>): Promise<void> {
    const [action, ...args] = command.trim().split(" ");
    logger.info(`Executing command: ${action} with args: ${args.join(" ")}`);

    try {
      switch (action.toLowerCase()) {
        // Movement commands
        case "goto":
          await this.moveCommands.goto(bot, args, memory);
          break;
        case "follow":
          await this.moveCommands.follow(bot, args, memory);
          break;
        case "reach":
          await this.moveCommands.reach(bot, args, memory);
          break;
        case "patrol":
          await this.moveCommands.patrol(bot, args, memory);
          break;
        case "stay":
          await this.moveCommands.stay(bot, memory);
          break;

        // Exploration commands
        case "explore":
          await this.exploreCommands.explore(bot, args, memory);
          break;
        case "reset_explore":
          await this.exploreCommands.resetExplore(bot, memory);
          break;

        // Gathering commands
        case "mine":
          await this.gatherCommands.mine(bot, args, memory);
          break;
        case "collect":
          await this.gatherCommands.collect(bot, args, memory);
          break;
        case "harvest":
          await this.gatherCommands.harvest(bot, args, memory);
          break;

        // Building commands
        case "place":
          await this.build.place(bot, args, memory);
          break;

        //? Combat commands
        case "attack":
          await this.combatCommands.attack(bot, args, memory);
          break;
        case "defend":
          await this.combatCommands.defend(bot, args, memory);
          break;
        case "flee":
          await this.combatCommands.flee(bot, args, memory);
          break;

        // Utility commands
        case "status":
          await this.utilityCommands.showStatus(bot, memory);
          break;
        case "chat":
          await this.utilityCommands.chat(bot, args, memory);
          break;
        case "inventory":
          await this.utilityCommands.showInventory(bot, memory);
          break;
        case "equip":
          await this.utilityCommands.equip(bot, args, memory);
          break;
        case "look_at":
          await this.utilityCommands.lookAt(bot, args, memory);
          break;
        case "drop":
          await this.utilityCommands.drop(bot, args, memory);
          break;
        case "interact":
          await this.utilityCommands.interact(bot, args, memory);
          break;
        case "store":
          await this.utilityCommands.store(bot, args, memory);
          break;
        case "feature":
          await this.utilityCommands.feature(bot, args, featureManager, memory);
          break;
        case "use":
          await this.utilityCommands.use(bot, args, memory);
          break;
        case "stop":
        await this.utilityCommands.stop(bot, args, memory);
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
      // memory.addCommand(command);
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

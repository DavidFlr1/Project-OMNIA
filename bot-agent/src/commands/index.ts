import type { Bot as MineflayerBot } from "mineflayer"
import type { Memory } from "../logic/memory"
import { MoveCommands } from "./move"
import { GatherCommands } from "./gather"
import { CombatCommands } from "./combat"
import { ExploreCommands } from "./explore"
import { logger } from "../utils"

export class CommandHandler {
  private moveCommands: MoveCommands
  private gatherCommands: GatherCommands
  private combatCommands: CombatCommands
  private exploreCommands: ExploreCommands

  constructor() {
    this.moveCommands = new MoveCommands()
    this.gatherCommands = new GatherCommands()
    this.combatCommands = new CombatCommands()
    this.exploreCommands = new ExploreCommands()
  }

  async execute(command: string, bot: MineflayerBot, memory: Memory): Promise<void> {
    const [action, ...args] = command.trim().split(" ")

    logger.info(`Executing command: ${action} with args: ${args.join(" ")}`)

    try {
      switch (action.toLowerCase()) {
        // Movement commands
        case "goto":
        case "move":
          await this.moveCommands.goto(bot, args)
          break
        case "follow":
          await this.moveCommands.follow(bot, args)
          break
        case "patrol":
          await this.moveCommands.patrol(bot, args)
          break
        case "stop":
          await this.moveCommands.stop(bot)
          break

        // Gathering commands
        case "mine":
          await this.gatherCommands.mine(bot, args)
          break
        case "collect":
          await this.gatherCommands.collect(bot, args)
          break
        case "harvest":
          await this.gatherCommands.harvest(bot, args)
          break

        // Combat commands
        case "attack":
          await this.combatCommands.attack(bot, args)
          break
        case "defend":
          await this.combatCommands.defend(bot, args)
          break
        case "flee":
          await this.combatCommands.flee(bot, args)
          break

        // Exploration commands
        case "explore":
          await this.exploreCommands.explore(bot, args)
          break
        case "scout":
          await this.exploreCommands.scout(bot, args)
          break
        case "map":
          await this.exploreCommands.mapArea(bot, args)
          break

        // Interaction commands
        case "interact":
          this.handleInteractionCommand(bot, args)
          break
        case "responses":
          this.showResponses(bot)
          break

        // Utility commands
        case "status":
          this.showStatus(bot)
          break
        case "inventory":
          this.showInventory(bot)
          break
        case "help":
          this.showHelp(bot)
          break

        default:
          logger.warn(`Unknown command: ${action}`)
          bot.chat(`Unknown command: ${action}. Type 'help' for available commands.`)
      }

      // Store command in memory
      memory.addCommand(command)
    } catch (error) {
      logger.error(`Error executing command ${action}:`, error)
      bot.chat(`Error executing command: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  private handleInteractionCommand(bot: MineflayerBot, args: string[]): void {
    if (args.length === 0) {
      bot.chat("Interaction commands: on, off, stats")
      return
    }

    const subCommand = args[0].toLowerCase()

    switch (subCommand) {
      case "stats":
        // This would need access to the interaction manager
        // For now, just show basic info
        bot.chat("Interaction system is active. I respond when players look at me and talk!")
        break
      case "on":
        bot.chat("Interactions are already enabled")
        break
      case "off":
        bot.chat("Cannot disable interactions via command (for now)")
        break
      default:
        bot.chat("Unknown interaction command. Use: stats, on, off")
    }
  }

  private showResponses(bot: MineflayerBot): void {
    bot.chat("I have various responses ready for conversations!")
    bot.chat("Try talking to me while looking at me from nearby.")
  }

  private showStatus(bot: MineflayerBot): void {
    const pos = bot.entity.position
    const status = `Status: Health: ${bot.health}/20, Food: ${bot.food}/20, Position: (${Math.floor(pos.x)}, ${Math.floor(pos.y)}, ${Math.floor(pos.z)})`
    bot.chat(status)
  }

  private showInventory(bot: MineflayerBot): void {
    const items = bot.inventory.items()
    if (items.length === 0) {
      bot.chat("Inventory is empty")
      return
    }

    const itemCounts = items.reduce(
      (acc, item) => {
        acc[item.name] = (acc[item.name] || 0) + item.count
        return acc
      },
      {} as Record<string, number>,
    )

    const itemList = Object.entries(itemCounts)
      .map(([name, count]) => `${name}: ${count}`)
      .join(", ")

    bot.chat(`Inventory: ${itemList}`)
  }

  private showHelp(bot: MineflayerBot): void {
    const commands = [
      "Movement: goto <x> <y> <z>, follow <player>, patrol <x1> <z1> <x2> <z2>, stop",
      "Gathering: mine <block>, collect <item>, harvest <crop>",
      "Combat: attack <target>, defend, flee",
      "Exploration: explore <radius>, scout <direction>, map <radius>",
      "Interaction: interact <stats|on|off>, responses",
      "Utility: status, inventory, help",
      "Note: I also respond to normal chat when you're nearby and looking at me!",
    ]

    commands.forEach((cmd) => bot.chat(cmd))
  }
}

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
          await this.showStatus(bot)
          break
        case "inventory":
          await this.showInventory(bot)
          break
        case "targeting":
          this.showTargetingHelp(bot)
          break

        // Info commands
        case "help":
          this.showHelp(bot)
          break
        case "mining":
          this.showMiningHelp(bot)
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

  private showMiningHelp(bot: MineflayerBot): void {
    bot.chat("=== Mining Command Help ===")
    bot.chat("Usage: mine <block_type> <quantity> [range] [scout] [scout_tries]")
    bot.chat("Examples:")
    bot.chat("  mine stone 10          - Mine 10 stone (range: 32)")
    bot.chat("  mine iron_ore 5 64     - Mine 5 iron ore (range: 64)")
    bot.chat("  mine diamond_ore 3 32 true 5  - Mine 3 diamonds with scouting")
    bot.chat("Parameters:")
    bot.chat("  block_type: Block to mine (e.g., stone, iron_ore)")
    bot.chat("  quantity: Number of blocks to mine")
    bot.chat("  range: Search radius (default: 32)")
    bot.chat("  scout: Move to find blocks (true/false, default: false)")
    bot.chat("  scout_tries: Max scouting attempts (default: 3)")
  }

  private showTargetingHelp(bot: MineflayerBot): void {
    const botName = bot.username
    bot.chat("=== Bot Targeting Help ===")
    bot.chat(`I'm ${botName}. Here's how to target me specifically:`)
    bot.chat(`1. Look at me + be nearby: "!goto 100 64 200"`)
    bot.chat(`2. Use my name: "!${botName} goto 100 64 200"`)
    bot.chat(`3. Mention me: "@${botName} !goto 100 64 200"`)
    bot.chat(`4. Include my name: "!goto 100 64 200 ${botName}"`)
    bot.chat("This prevents other bots from following the same command!")
  }

  private async showStatus(bot: MineflayerBot): Promise<void> {
    try {
    const pos = bot.entity.position
      const health = Math.round(bot.health * 10) / 10
      const food = Math.round(bot.food * 10) / 10

      // Send status in separate messages with delays to prevent spam kick
      bot.chat("=== 📊 Bot Status ===")

      await new Promise((resolve) => setTimeout(resolve, 300))
      bot.chat(`Health: ${health}/20, Food: ${food}/20`)

      await new Promise((resolve) => setTimeout(resolve, 300))
      bot.chat(`Position: (${Math.round(pos.x)}, ${Math.round(pos.y)}, ${Math.round(pos.z)})`)

      await new Promise((resolve) => setTimeout(resolve, 300))
      const dimension = bot.game.dimension || "unknown"
      bot.chat(`Dimension: ${dimension}`)
      const gameMode = bot.game.gameMode || "unknown"
      bot.chat(`Mode: ${gameMode}`)

      // Show activity status safely
      await new Promise((resolve) => setTimeout(resolve, 300))
      try {
        const activities = []

        if (this.moveCommands.isActive()) {
          const moveStatus = this.moveCommands.getStatus()
          if (moveStatus.following && moveStatus.followTarget) {
            activities.push(`Following ${moveStatus.followTarget}`)
          }
          if (moveStatus.patrolling) {
            activities.push("Patrolling")
          }
        }

        if (this.gatherCommands.isActive()) {
          const gatherStatus = this.gatherCommands.getStatus()
          if (gatherStatus.mining) activities.push("Mining")
          if (gatherStatus.collecting) activities.push("Collecting")
        }

        if (this.exploreCommands.isActive()) {
          activities.push("Exploring")
        }

        const activityText = activities.length > 0 ? activities.join(", ") : "Idle"
        bot.chat(`Activities: ${activityText}`)
      } catch (activityError) {
        logger.warn("Error getting activity status:", activityError)
        bot.chat("Activities: Unknown")
      }
    } catch (error) {
      logger.error("Error showing status:", error)
      bot.chat("❌ Error retrieving status")
    }
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
      "=== Commands ===",
      "Movement: goto <x> <y> <z>, follow <player>, patrol <x1> <z1> <x2> <z2>, stop",
      "Gathering: mine <block> <qty> [range] [scout] [tries], collect <item>, harvest <crop>",
      "Combat: attack <target>, defend, flee",
      "Exploration: explore <radius>, scout <direction>, map <radius>",
      "Interaction: interact <stats|on|off>, responses",
      "Utility: status, inventory, help, targeting, mining",
      "=== Special Help ===",
      "Type 'mining' for detailed mining command help",
      "Type 'targeting' to learn how to control me individually!",
      "I also respond to normal chat when you're nearby and looking at me!",
    ]

    commands.forEach((cmd) => bot.chat(cmd))
  }
}

import type { Bot as MineflayerBot } from "mineflayer"
import { goals } from "mineflayer-pathfinder"
import { logger } from "../utils"

export class GatherCommands {
  async mine(bot: MineflayerBot, args: string[]): Promise<void> {
    if (args.length < 1) {
      bot.chat("Usage: mine <block_type>")
      return
    }

    const blockType = args[0]
    const range = args[1] ? Number.parseInt(args[1]) : 32

    try {
      logger.info(`Mining ${blockType} within range ${range}`)
      bot.chat(`Looking for ${blockType} to mine...`)

      const block = bot.findBlock({
        matching: (block) => block.name === blockType,
        maxDistance: range,
      })

      if (!block) {
        bot.chat(`No ${blockType} found within range`)
        return
      }

      // Move to the block
      const goal = new goals.GoalBlock(block.position.x, block.position.y, block.position.z)
      await bot.pathfinder.goto(goal)

      // Mine the block
      await bot.dig(block)
      bot.chat(`Successfully mined ${blockType}`)
      logger.info(`Successfully mined ${blockType} at ${block.position}`)
    } catch (error) {
      logger.error("Mining failed:", error)
      bot.chat("Mining failed")
    }
  }

  async collect(bot: MineflayerBot, args: string[]): Promise<void> {
    if (args.length < 1) {
      bot.chat("Usage: collect <item_type> [amount]")
      return
    }

    const itemType = args[0]
    const amount = args[1] ? Number.parseInt(args[1]) : 1

    try {
      logger.info(`Collecting ${amount} ${itemType}`)
      bot.chat(`Collecting ${amount} ${itemType}...`)

      // Find blocks to collect
      const blocks = bot.findBlocks({
        matching: (block) => block.name === itemType,
        maxDistance: 32,
        count: amount,
      })

      if (blocks.length === 0) {
        bot.chat(`No ${itemType} found nearby`)
        return
      }

      let collected = 0
      for (const blockPos of blocks.slice(0, amount)) {
        try {
          const block = bot.blockAt(blockPos)
          if (block && block.name === itemType) {
            await bot.collectBlock.collect(block)
            collected++
          }
        } catch (error) {
          logger.warn(`Failed to collect block at ${blockPos}:`, error)
        }
      }

      bot.chat(`Successfully collected ${collected} ${itemType}`)
      logger.info(`Successfully collected ${collected} ${itemType}`)
    } catch (error) {
      logger.error("Collection failed:", error)
      bot.chat("Collection failed")
    }
  }

  async harvest(bot: MineflayerBot, args: string[]): Promise<void> {
    if (args.length < 1) {
      bot.chat("Usage: harvest <crop_type>")
      return
    }

    const cropType = args[0]
    const range = 16

    try {
      logger.info(`Harvesting ${cropType} within range ${range}`)
      bot.chat(`Harvesting ${cropType}...`)

      const crops = bot.findBlocks({
        matching: (block) => {
          // Check if it's a mature crop
          return block.name === cropType && this.isMatureCrop(block)
        },
        maxDistance: range,
        count: 10, // Harvest up to 10 crops
      })

      if (crops.length === 0) {
        bot.chat(`No mature ${cropType} found within range`)
        return
      }

      let harvested = 0
      for (const cropPos of crops) {
        try {
          const block = bot.blockAt(cropPos)
          if (block) {
            const goal = new goals.GoalBlock(cropPos.x, cropPos.y, cropPos.z)
            await bot.pathfinder.goto(goal)
            await bot.dig(block)
            harvested++
          }
        } catch (error) {
          logger.warn(`Failed to harvest crop at ${cropPos}:`, error)
        }
      }

      bot.chat(`Harvested ${harvested} ${cropType}`)
      logger.info(`Successfully harvested ${harvested} ${cropType}`)
    } catch (error) {
      logger.error("Harvesting failed:", error)
      bot.chat("Harvesting failed")
    }
  }

  private isMatureCrop(block: any): boolean {
    // Check if crop is mature based on metadata/state
    // This is a simplified check - in practice, you'd check the block state
    const matureCrops = ["wheat", "carrots", "potatoes", "beetroots"]
    return matureCrops.includes(block.name) && block.metadata === 7
  }
}

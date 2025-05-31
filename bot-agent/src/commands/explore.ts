import type { Bot as MineflayerBot } from "mineflayer"
import { goals } from "mineflayer-pathfinder"
import { logger } from "../utils"

export class ExploreCommands {
  private isExploring = false
  private exploredAreas: Set<string> = new Set()

  async explore(bot: MineflayerBot, args: string[]): Promise<void> {
    const radius = args[0] ? Number.parseInt(args[0]) : 50

    this.isExploring = true
    logger.info(`Starting exploration with radius ${radius}`)
    bot.chat(`Starting exploration within ${radius} blocks`)

    try {
      const startPos = bot.entity.position.clone()
      const explorationPoints = this.generateExplorationPoints(startPos, radius, 8)

      for (const point of explorationPoints) {
        if (!this.isExploring) break

        const areaKey = `${Math.floor(point.x / 16)},${Math.floor(point.z / 16)}`
        if (this.exploredAreas.has(areaKey)) continue

        try {
          logger.info(`Exploring point: (${point.x}, ${point.z})`)
          const goal = new goals.GoalXZ(point.x, point.z)
          await bot.pathfinder.goto(goal)

          // Mark area as explored
          this.exploredAreas.add(areaKey)

          // Look around and gather information
          await this.observeArea(bot)

          // Wait a bit before moving to next point
          await new Promise((resolve) => setTimeout(resolve, 1000))
        } catch (error) {
          logger.warn(`Failed to reach exploration point (${point.x}, ${point.z}):`, error)
        }
      }

      bot.chat("Exploration completed")
      logger.info("Exploration completed")
    } catch (error) {
      logger.error("Exploration failed:", error)
      bot.chat("Exploration failed")
    } finally {
      this.isExploring = false
    }
  }

  async scout(bot: MineflayerBot, args: string[]): Promise<void> {
    if (args.length < 1) {
      bot.chat("Usage: scout <direction> [distance]")
      return
    }

    const direction = args[0].toLowerCase()
    const distance = args[1] ? Number.parseInt(args[1]) : 30

    const directions: Record<string, { x: number; z: number }> = {
      north: { x: 0, z: -1 },
      south: { x: 0, z: 1 },
      east: { x: 1, z: 0 },
      west: { x: -1, z: 0 },
      northeast: { x: 1, z: -1 },
      northwest: { x: -1, z: -1 },
      southeast: { x: 1, z: 1 },
      southwest: { x: -1, z: 1 },
    }

    if (!directions[direction]) {
      bot.chat("Invalid direction. Use: north, south, east, west, northeast, northwest, southeast, southwest")
      return
    }

    try {
      const currentPos = bot.entity.position
      const targetPos = {
        x: currentPos.x + directions[direction].x * distance,
        z: currentPos.z + directions[direction].z * distance,
      }

      logger.info(`Scouting ${direction} for ${distance} blocks`)
      bot.chat(`Scouting ${direction}...`)

      const goal = new goals.GoalXZ(targetPos.x, targetPos.z)
      await bot.pathfinder.goto(goal)

      // Observe the scouted area
      const observations = await this.observeArea(bot)
      bot.chat(`Scouting complete. Found: ${observations.join(", ")}`)
    } catch (error) {
      logger.error("Scouting failed:", error)
      bot.chat("Scouting failed")
    }
  }

  async mapArea(bot: MineflayerBot, args: string[]): Promise<void> {
    const radius = args[0] ? Number.parseInt(args[0]) : 20

    logger.info(`Mapping area with radius ${radius}`)
    bot.chat(`Mapping area within ${radius} blocks...`)

    try {
      const centerPos = bot.entity.position
      const areaData = {
        center: { x: centerPos.x, y: centerPos.y, z: centerPos.z },
        radius: radius,
        blocks: new Map<string, string>(),
        entities: new Map<string, string>(),
        structures: [] as string[],
      }

      // Scan blocks in the area
      for (let x = -radius; x <= radius; x += 4) {
        for (let z = -radius; z <= radius; z += 4) {
          const blockPos = centerPos.offset(x, 0, z)
          const block = bot.blockAt(blockPos)

          if (block && block.name !== "air") {
            const key = `${blockPos.x},${blockPos.y},${blockPos.z}`
            areaData.blocks.set(key, block.name)
          }
        }
      }

      // Scan for entities
      Object.values(bot.entities).forEach((entity) => {
        if (entity.position.distanceTo(centerPos) <= radius) {
          const key = `${entity.position.x},${entity.position.y},${entity.position.z}`
          areaData.entities.set(key, entity.mobType || entity.objectType || "unknown")
        }
      })

      // Look for structures
      const structures = this.identifyStructures(areaData.blocks)
      areaData.structures = structures

      // Report findings
      const report = this.generateMapReport(areaData)
      bot.chat(report)
      logger.info("Area mapping completed", areaData)
    } catch (error) {
      logger.error("Area mapping failed:", error)
      bot.chat("Area mapping failed")
    }
  }

  private generateExplorationPoints(center: any, radius: number, count: number): Array<{ x: number; z: number }> {
    const points = []
    const angleStep = (2 * Math.PI) / count

    for (let i = 0; i < count; i++) {
      const angle = i * angleStep
      const distance = radius * (0.5 + Math.random() * 0.5) // Random distance within radius

      points.push({
        x: Math.floor(center.x + Math.cos(angle) * distance),
        z: Math.floor(center.z + Math.sin(angle) * distance),
      })
    }

    return points
  }

  private async observeArea(bot: MineflayerBot): Promise<string[]> {
    const observations = []
    const currentPos = bot.entity.position

    // Look for interesting blocks
    const interestingBlocks = bot.findBlocks({
      matching: (block) => {
        const valuable = ["diamond_ore", "gold_ore", "iron_ore", "coal_ore", "lapis_ore"]
        const structures = ["chest", "spawner", "beacon", "end_portal"]
        return valuable.includes(block.name) || structures.includes(block.name)
      },
      maxDistance: 16,
      count: 10,
    })

    if (interestingBlocks.length > 0) {
      observations.push(`${interestingBlocks.length} valuable blocks/structures`)
    }

    // Look for entities
    const nearbyEntities = Object.values(bot.entities).filter(
      (entity) => entity.position.distanceTo(currentPos) < 16 && entity !== bot.entity,
    )

    if (nearbyEntities.length > 0) {
      const entityTypes = [...new Set(nearbyEntities.map((e) => e.mobType || e.objectType || "unknown"))]
      observations.push(`Entities: ${entityTypes.join(", ")}`)
    }

    // Check biome (if available)
    const block = bot.blockAt(currentPos)
    if (block) {
      observations.push(`Terrain: ${block.name}`)
    }

    return observations
  }

  private identifyStructures(blocks: Map<string, string>): string[] {
    const structures = []
    const blockTypes = Array.from(blocks.values())

    // Simple structure detection based on block patterns
    if (blockTypes.includes("cobblestone") && blockTypes.includes("mossy_cobblestone")) {
      structures.push("Dungeon")
    }
    if (blockTypes.includes("nether_bricks")) {
      structures.push("Nether Fortress")
    }
    if (blockTypes.includes("end_stone")) {
      structures.push("End Structure")
    }
    if (blockTypes.includes("sandstone") && blockTypes.includes("chiseled_sandstone")) {
      structures.push("Desert Temple")
    }

    return structures
  }

  private generateMapReport(areaData: any): string {
    const blockCount = areaData.blocks.size
    const entityCount = areaData.entities.size
    const structureCount = areaData.structures.length

    return `Map complete: ${blockCount} blocks, ${entityCount} entities, ${structureCount} structures found`
  }

  stopExploring(): void {
    this.isExploring = false
  }
}

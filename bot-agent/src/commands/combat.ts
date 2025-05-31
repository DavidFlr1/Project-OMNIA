import type { Bot as MineflayerBot } from "mineflayer"
import { goals } from "mineflayer-pathfinder"
import { logger } from "../utils"

export class CombatCommands {
  private isDefending = false
  private attackTarget: string | null = null

  async attack(bot: MineflayerBot, args: string[]): Promise<void> {
    if (args.length < 1) {
      bot.chat("Usage: attack <target_name>")
      return
    }

    const targetName = args[0]

    try {
      // Find target entity
      const target = Object.values(bot.entities).find(
        (entity) => entity.username === targetName || (entity.mobType && entity.mobType.includes(targetName)),
      )

      if (!target) {
        bot.chat(`Target ${targetName} not found`)
        return
      }

      logger.info(`Attacking target: ${targetName}`)
      bot.chat(`Attacking ${targetName}`)

      this.attackTarget = targetName

      // Use mineflayer-pvp plugin for combat
      if (bot.pvp) {
        bot.pvp.attack(target)
      } else {
        // Fallback manual attack
        await this.manualAttack(bot, target)
      }
    } catch (error) {
      logger.error("Attack failed:", error)
      bot.chat("Attack failed")
    }
  }

  async defend(bot: MineflayerBot, args: string[]): Promise<void> {
    this.isDefending = true
    bot.chat("Entering defensive mode")
    logger.info("Entering defensive mode")

    // Set up defensive behavior
    bot.on("entityHurt", (entity) => {
      if (entity === bot.entity && this.isDefending) {
        this.handleAttack(bot)
      }
    })

    bot.on("playerCollect", (collector, collected) => {
      if (collected === bot.entity && this.isDefending) {
        this.handleAttack(bot)
      }
    })
  }

  async flee(bot: MineflayerBot, args: string[]): Promise<void> {
    const distance = args[0] ? Number.parseInt(args[0]) : 20

    try {
      logger.info(`Fleeing ${distance} blocks away`)
      bot.chat("Fleeing from danger")

      // Find hostile entities nearby
      const hostiles = Object.values(bot.entities).filter(
        (entity) =>
          entity.mobType && this.isHostileMob(entity.mobType) && entity.position.distanceTo(bot.entity.position) < 10,
      )

      if (hostiles.length > 0) {
        // Calculate flee direction (opposite of hostiles)
        const fleeDirection = this.calculateFleeDirection(bot, hostiles)
        const fleePos = bot.entity.position.offset(fleeDirection.x * distance, 0, fleeDirection.z * distance)

        const goal = new goals.GoalXZ(fleePos.x, fleePos.z)
        await bot.pathfinder.goto(goal)

        bot.chat("Reached safe distance")
      } else {
        bot.chat("No immediate threats detected")
      }
    } catch (error) {
      logger.error("Flee failed:", error)
      bot.chat("Failed to flee")
    }
  }

  private async manualAttack(bot: MineflayerBot, target: any): Promise<void> {
    const weapon = bot.inventory.items().find((item) => item.name.includes("sword") || item.name.includes("axe"))

    if (weapon) {
      await bot.equip(weapon, "hand")
    }

    // Move closer to target
    const goal = new goals.GoalFollow(target, 1)
    bot.pathfinder.setGoal(goal)

    // Attack repeatedly
    const attackInterval = setInterval(() => {
      if (target.isValid && bot.entity.position.distanceTo(target.position) < 4) {
        bot.attack(target)
      } else {
        clearInterval(attackInterval)
      }
    }, 500)

    // Stop attacking after 10 seconds
    setTimeout(() => {
      clearInterval(attackInterval)
      bot.pathfinder.stop()
    }, 10000)
  }

  private handleAttack(bot: MineflayerBot): void {
    // Find the attacker
    const nearbyHostiles = Object.values(bot.entities).filter(
      (entity) =>
        entity.mobType && this.isHostileMob(entity.mobType) && entity.position.distanceTo(bot.entity.position) < 8,
    )

    if (nearbyHostiles.length > 0) {
      const attacker = nearbyHostiles[0]
      logger.info(`Defending against ${attacker.mobType}`)

      if (bot.pvp) {
        bot.pvp.attack(attacker)
      }
    }
  }

  private isHostileMob(mobType: string): boolean {
    const hostileMobs = [
      "zombie",
      "skeleton",
      "creeper",
      "spider",
      "enderman",
      "witch",
      "pillager",
      "vindicator",
      "evoker",
    ]
    return hostileMobs.some((hostile) => mobType.includes(hostile))
  }

  private calculateFleeDirection(bot: MineflayerBot, hostiles: any[]): { x: number; z: number } {
    let totalX = 0
    let totalZ = 0

    // Calculate average position of hostiles
    hostiles.forEach((hostile) => {
      totalX += hostile.position.x
      totalZ += hostile.position.z
    })

    const avgX = totalX / hostiles.length
    const avgZ = totalZ / hostiles.length

    // Calculate direction away from hostiles
    const dirX = bot.entity.position.x - avgX
    const dirZ = bot.entity.position.z - avgZ

    // Normalize direction
    const length = Math.sqrt(dirX * dirX + dirZ * dirZ)
    return {
      x: length > 0 ? dirX / length : 1,
      z: length > 0 ? dirZ / length : 0,
    }
  }

  stopDefending(): void {
    this.isDefending = false
    this.attackTarget = null
  }
}

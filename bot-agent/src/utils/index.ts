import winston from "winston"
import { Vec3 } from "vec3"
import * as fs from "fs"
import * as path from "path"

// Configure logger
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  defaultMeta: { service: "minecraft-bot-agent" },
  transports: [
    new winston.transports.File({
      filename: process.env.LOG_FILE || "bot-agent.log",
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
    }),
  ],
})

// Load commands configuration
let commandsConfig: any = null

function loadCommandsConfig(): any {
  if (commandsConfig) return commandsConfig

  try {
    const configPath = path.join(__dirname, "../../shared/commands.json")
    const configData = fs.readFileSync(configPath, "utf8")
    commandsConfig = JSON.parse(configData)
    return commandsConfig
  } catch (error) {
    logger.error("Failed to load commands configuration:", error)
    return { commands: {}, categories: {}, meta: {} }
  }
}

// Centralized help system
export function getHelp(query?: string): string[] {
  const config = loadCommandsConfig()
  const helpLines: string[] = []

  if (!query) {
    // Show general help
    helpLines.push("=== Minecraft Bot Commands ===")
    helpLines.push("")

    // Show categories
    Object.entries(config.categories || {}).forEach(([category, description]) => {
      const categoryCommands = config.commands[category] || {}
      const commandCount = Object.keys(categoryCommands).length
      const workingCount = Object.values(categoryCommands).filter((cmd: any) => cmd.status).length

      helpLines.push(`${category.toUpperCase()}: ${description}`)
      helpLines.push(`  Commands: ${commandCount} (${workingCount} working)`)
      helpLines.push("")
    })

    helpLines.push("Usage:")
    helpLines.push("  help <category>  - Show commands in a category")
    helpLines.push("  help <command>   - Show detailed help for a command")
    helpLines.push("")
    helpLines.push("Examples:")
    helpLines.push("  help movement    - Show all movement commands")
    helpLines.push("  help goto        - Show detailed help for goto command")
  } else {
    const queryLower = query.toLowerCase()

    // Check if it's a category
    if (config.categories[queryLower]) {
      helpLines.push(`=== ${queryLower.toUpperCase()} COMMANDS ===`)
      helpLines.push(config.categories[queryLower])
      helpLines.push("")

      const categoryCommands = config.commands[queryLower] || {}
      Object.entries(categoryCommands).forEach(([cmdName, cmdInfo]: [string, any]) => {
        const status = cmdInfo.status ? "✅" : "❌"
        helpLines.push(`${status} ${cmdInfo.syntax}`)
        helpLines.push(`   ${cmdInfo.description}`)
        helpLines.push(`   Example: ${cmdInfo.example}`)
        helpLines.push("")
      })
    } else {
      // Search for specific command
      let found = false
      Object.entries(config.commands).forEach(([category, commands]: [string, any]) => {
        if (commands[queryLower]) {
          const cmd = commands[queryLower]
          const status = cmd.status ? "✅ Working" : "❌ Not Working"

          helpLines.push(`=== ${queryLower.toUpperCase()} COMMAND ===`)
          helpLines.push(`Status: ${status}`)
          helpLines.push(`Category: ${category}`)
          helpLines.push("")
          helpLines.push(`Syntax: ${cmd.syntax}`)
          helpLines.push(`Description: ${cmd.description}`)
          helpLines.push(`Example: ${cmd.example}`)
          helpLines.push("")
          helpLines.push("Intent Keywords:")
          helpLines.push(`  ${cmd.intent_keywords.join(", ")}`)
          found = true
        }
      })

      if (!found) {
        helpLines.push(`Command or category '${query}' not found.`)
        helpLines.push("Use 'help' to see all available categories and commands.")
      }
    }
  }

  return helpLines
}

// Utility function to wait/sleep
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Utility function to retry operations
export async function retry<T>(operation: () => Promise<T>, maxAttempts = 3, delay = 1000): Promise<T> {
  let lastError: Error

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      logger.warn(`Attempt ${attempt}/${maxAttempts} failed:`, lastError.message)

      if (attempt < maxAttempts) {
        await wait(delay * attempt) // Exponential backoff
      }
    }
  }

  throw lastError!
}

// Utility function to validate coordinates
export function validateCoordinates(x: any, y: any, z: any): boolean {
  return !isNaN(Number.parseFloat(x)) && !isNaN(Number.parseFloat(y)) && !isNaN(Number.parseFloat(z))
}

// Utility function to calculate distance between two points
export function calculateDistance(
  pos1: { x: number; y: number; z: number },
  pos2: { x: number; y: number; z: number },
): number {
  const dx = pos1.x - pos2.x
  const dy = pos1.y - pos2.y
  const dz = pos1.z - pos2.z
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

// Utility function to format position for display
export function formatPosition(pos: { x: number; y: number; z: number }): string {
  return `(${Math.floor(pos.x)}, ${Math.floor(pos.y)}, ${Math.floor(pos.z)})`
}

// Utility function to generate random position within radius
export function randomPositionInRadius(center: { x: number; z: number }, radius: number): { x: number; z: number } {
  const angle = Math.random() * 2 * Math.PI
  const distance = Math.random() * radius

  return {
    x: center.x + Math.cos(angle) * distance,
    z: center.z + Math.sin(angle) * distance,
  }
}

// Bot interaction utilities
export function getDirectionFromYawPitch(yaw: number, pitch: number): Vec3 {
  const x = -Math.sin(yaw) * Math.cos(pitch)
  const y = Math.sin(pitch)
  const z = -Math.cos(yaw) * Math.cos(pitch)
  return new Vec3(x, y, z).normalize()
}

export function isLookingAtBot(playerEntity: any, botEntity: any, threshold = 0.9): boolean {
  const botPos = botEntity.position
  const playerPos = playerEntity.position

  const yaw = playerEntity.yaw
  const pitch = playerEntity.pitch

  const viewDir = getDirectionFromYawPitch(yaw, pitch)
  const toBot = botPos.minus(playerPos).normalize()
  const dot = viewDir.dot(toBot)

  return dot > threshold
}

export function isPlayerNearby(playerEntity: any, botEntity: any, maxDistance = 4): boolean {
  return botEntity.position.distanceTo(playerEntity.position) <= maxDistance
}


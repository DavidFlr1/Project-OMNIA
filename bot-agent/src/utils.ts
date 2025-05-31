import winston from "winston"
import { Vec3 } from "vec3"

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

// Utility function to parse command arguments
export function parseArgs(args: string[]): Record<string, any> {
  const parsed: Record<string, any> = {}

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    if (arg.startsWith("--")) {
      const key = arg.slice(2)
      const nextArg = args[i + 1]

      if (nextArg && !nextArg.startsWith("--")) {
        parsed[key] = nextArg
        i++ // Skip next argument as it's a value
      } else {
        parsed[key] = true // Flag without value
      }
    }
  }

  return parsed
}

// Utility function to clamp values
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
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

import type { Bot as MineflayerBot } from "mineflayer"
import { isLookingAtBot, isPlayerNearby, logger } from "../utils"
import type { Memory } from "./memory"

export interface InteractionState {
  isLookingAtPlayer: boolean
  currentTarget: string | null
  lastInteraction: number
  lookTimeout: NodeJS.Timeout | null
}

export class InteractionManager {
  private bot: MineflayerBot
  private memory: Memory
  private state: InteractionState
  private responses: string[]
  private lookDuration = 10000 // 10 seconds
  private interactionCooldown = 5000 // 5 seconds between responses

  constructor(bot: MineflayerBot, memory: Memory) {
    this.bot = bot
    this.memory = memory
    this.state = {
      isLookingAtPlayer: false,
      currentTarget: null,
      lastInteraction: 0,
      lookTimeout: null,
    }

    this.responses = [
      "Hey there!",
      "What's up?",
      "Leave me alone, I'm busy.",
      "Nice weather, huh?",
      "Just bot things.",
      "Hello!",
      "How can I help you?",
      "I'm working on something important.",
      "Beautiful day for mining!",
      "What brings you here?",
    ]

    this.setupEventHandlers()
  }

  private setupEventHandlers(): void {
    // Handle chat interactions
    this.bot.on("chat", (username, message) => {
      if (username === this.bot.username) return
      this.handleChatInteraction(username, message)
    })

    // Look at nearest player periodically
    this.bot.on("physicTick", () => {
      this.handleLookAtPlayer()
    })
  }

  private handleChatInteraction(username: string, message: string): void {
    const player = this.bot.players[username]
    if (!player || !player.entity) return

    const distance = this.bot.entity.position.distanceTo(player.entity.position)
    const isNearby = isPlayerNearby(player.entity, this.bot.entity, 4)
    const isLooking = isLookingAtBot(player.entity, this.bot.entity, 0.9)

    logger.debug(
      `Chat interaction: ${username} - Distance: ${distance.toFixed(2)}, Nearby: ${isNearby}, Looking: ${isLooking}`,
    )

    // Check if player is nearby and looking at the bot
    if (isNearby && isLooking) {
      this.respondToPlayer(username, message)
      this.startLookingAtPlayer(username)
    }

    // Store interaction in memory
    this.memory.addEvent("player_interaction", {
      username,
      message,
      distance,
      isNearby,
      isLooking,
      timestamp: Date.now(),
    })
  }

  private respondToPlayer(username: string, message: string): void {
    const now = Date.now()

    // Check cooldown
    if (now - this.state.lastInteraction < this.interactionCooldown) {
      logger.debug(`Interaction cooldown active for ${username}`)
      return
    }

    // Generate response
    const response = this.generateResponse(username, message)

    if (response) {
      this.bot.chat(response)
      this.state.lastInteraction = now

      logger.info(`Responded to ${username}: "${response}"`)

      // Store response in memory
      this.memory.addEvent("bot_response", {
        username,
        originalMessage: message,
        response,
        timestamp: now,
      })
    }
  }

  private generateResponse(username: string, message: string): string | null {
    // For now, use random responses
    // Later this will be replaced with AI-generated responses

    // Check for specific keywords or patterns
    const lowerMessage = message.toLowerCase()

    if (lowerMessage.includes("hello") || lowerMessage.includes("hi")) {
      return `Hello ${username}!`
    }

    if (lowerMessage.includes("how are you")) {
      return "I'm doing great, thanks for asking!"
    }

    if (lowerMessage.includes("what are you doing")) {
      return "Just exploring and learning about this world."
    }

    if (lowerMessage.includes("help")) {
      return "I can help with basic tasks. Try asking me to follow you or explore an area!"
    }

    if (lowerMessage.includes("bye") || lowerMessage.includes("goodbye")) {
      return `See you later, ${username}!`
    }

    // Default random response
    return this.responses[Math.floor(Math.random() * this.responses.length)]
  }

  private startLookingAtPlayer(username: string): void {
    // Clear existing timeout
    if (this.state.lookTimeout) {
      clearTimeout(this.state.lookTimeout)
    }

    this.state.currentTarget = username
    this.state.isLookingAtPlayer = true

    logger.debug(`Started looking at player: ${username}`)

    // Set timeout to stop looking
    this.state.lookTimeout = setTimeout(() => {
      this.stopLookingAtPlayer()
    }, this.lookDuration)
  }

  private stopLookingAtPlayer(): void {
    this.state.isLookingAtPlayer = false
    this.state.currentTarget = null

    if (this.state.lookTimeout) {
      clearTimeout(this.state.lookTimeout)
      this.state.lookTimeout = null
    }

    logger.debug("Stopped looking at player")
  }

  private handleLookAtPlayer(): void {
    if (!this.state.isLookingAtPlayer || !this.state.currentTarget) {
      return
    }

    const targetPlayer = this.bot.players[this.state.currentTarget]
    if (!targetPlayer || !targetPlayer.entity) {
      this.stopLookingAtPlayer()
      return
    }

    // Check if player is still nearby
    const distance = this.bot.entity.position.distanceTo(targetPlayer.entity.position)
    if (distance > 8) {
      // Stop looking if player moves too far
      this.stopLookingAtPlayer()
      return
    }

    // Look at the player
    const playerPos = targetPlayer.entity.position.offset(0, targetPlayer.entity.height * 0.9, 0)
    this.bot.lookAt(playerPos)
  }

  // Public methods for external control
  public setResponses(newResponses: string[]): void {
    this.responses = newResponses
    logger.info(`Updated responses: ${newResponses.length} responses loaded`)
  }

  public addResponse(response: string): void {
    this.responses.push(response)
    logger.info(`Added new response: "${response}"`)
  }

  public setLookDuration(duration: number): void {
    this.lookDuration = duration
    logger.info(`Updated look duration to ${duration}ms`)
  }

  public setInteractionCooldown(cooldown: number): void {
    this.interactionCooldown = cooldown
    logger.info(`Updated interaction cooldown to ${cooldown}ms`)
  }

  public getInteractionStats(): any {
    const recentInteractions = this.memory.searchEventHistory("player_interaction")
    const recentResponses = this.memory.searchEventHistory("bot_response")

    return {
      totalInteractions: recentInteractions.length,
      totalResponses: recentResponses.length,
      currentTarget: this.state.currentTarget,
      isLookingAtPlayer: this.state.isLookingAtPlayer,
      lastInteraction: this.state.lastInteraction,
      responseCount: this.responses.length,
    }
  }

  public forceStopLooking(): void {
    this.stopLookingAtPlayer()
  }

  public cleanup(): void {
    if (this.state.lookTimeout) {
      clearTimeout(this.state.lookTimeout)
    }
  }
}

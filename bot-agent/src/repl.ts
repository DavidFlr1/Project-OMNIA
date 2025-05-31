import * as readline from "readline"
import { Bot } from "./bot"
import { logger } from "./utils"
import dotenv from "dotenv"

// Load environment variables
dotenv.config()

async function startRepl() {
  console.log("🤖 Minecraft Bot Agent REPL")
  console.log('Type "help" for available commands, "quit" to exit\n')

  const bot = new Bot({
    host: process.env.MINECRAFT_HOST || "localhost",
    port: Number.parseInt(process.env.MINECRAFT_PORT || "25565"),
    username: 'bobElConstructor', //`repl_Bot-${Math.floor(Math.random() * 99)}`,
    password: process.env.MINECRAFT_PASSWORD,
  })

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "bot> ",
  })

  let connected = false

  rl.prompt()

  rl.on("line", async (input) => {
    const command = input.trim()

    if (command === "quit" || command === "exit") {
      console.log("Goodbye!")
      if (connected) {
        await bot.disconnect()
      }
      rl.close()
      process.exit(0)
    }

    if (command === "help") {
      showHelp()
      rl.prompt()
      return
    }

    if (command === "connect") {
      if (connected) {
        console.log("Bot is already connected")
      } else {
        try {
          console.log("Connecting to Minecraft server...")
          await bot.connect()
          connected = true
          console.log("✅ Connected successfully!")
        } catch (error) {
          console.error("❌ Connection failed:", error instanceof Error ? error.message : error)
        }
      }
      rl.prompt()
      return
    }

    if (command === "disconnect") {
      if (!connected) {
        console.log("Bot is not connected")
      } else {
        await bot.disconnect()
        connected = false
        console.log("✅ Disconnected")
      }
      rl.prompt()
      return
    }

    if (command === "status") {
      if (!connected) {
        console.log("Bot is not connected")
      } else {
        const status = bot.getStatus()
        console.log("Bot Status:", JSON.stringify(status, null, 2))
      }
      rl.prompt()
      return
    }

    if (command.startsWith("chat ")) {
      if (!connected) {
        console.log("Bot is not connected")
      } else {
        const message = command.slice(5)
        const botInstance = bot.getBot()
        if (botInstance) {
          botInstance.chat(message)
          console.log(`💬 Sent: ${message}`)
        }
      }
      rl.prompt()
      return
    }

    if (command === "") {
      rl.prompt()
      return
    }

    // Execute bot command
    if (!connected) {
      console.log('❌ Bot is not connected. Use "connect" first.')
    } else {
      try {
        console.log(`🔄 Executing: ${command}`)
        await bot.executeCommand(command)
        console.log("✅ Command executed")
      } catch (error) {
        console.error("❌ Command failed:", error instanceof Error ? error.message : error)
      }
    }

    rl.prompt()
  })

  rl.on("close", async () => {
    if (connected) {
      await bot.disconnect()
    }
    process.exit(0)
  })

  // Handle Ctrl+C
  process.on("SIGINT", async () => {
    console.log("\nReceived SIGINT, shutting down...")
    if (connected) {
      await bot.disconnect()
    }
    process.exit(0)
  })
}

function showHelp() {
  console.log(`
Available REPL Commands:
  connect              - Connect to Minecraft server
  disconnect           - Disconnect from server
  status               - Show bot status
  chat <message>       - Send chat message
  help                 - Show this help
  quit/exit            - Exit REPL

Bot Commands (when connected):
  Movement:
    goto <x> <y> <z>   - Move to coordinates
    follow <player>    - Follow a player
    patrol <x1> <z1> <x2> <z2> - Patrol between points
    stop               - Stop movement

  Gathering:
    mine <block>       - Mine specific block type
    collect <item>     - Collect items
    harvest <crop>     - Harvest crops

  Combat:
    attack <target>    - Attack entity
    defend             - Enter defensive mode
    flee [distance]    - Flee from danger

  Exploration:
    explore [radius]   - Explore area
    scout <direction>  - Scout in direction
    map [radius]       - Map surrounding area

  Utility:
    inventory          - Show inventory
    status             - Show detailed status
`)
}

// Start REPL if this file is run directly
if (require.main === module) {
  startRepl().catch((error) => {
    logger.error("REPL startup failed:", error)
    process.exit(1)
  })
}

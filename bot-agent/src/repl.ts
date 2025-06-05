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
    username: process.env.MINECRAFT_USERNAME || "TestBot",
    password: process.env.MINECRAFT_PASSWORD,
  })

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "bot> ",
  })

  let connected = false

  // Auto-connect on startup
  console.log("🔄 Auto-connecting to Minecraft server...")
  try {
    await bot.connect()
    connected = true
    console.log("✅ Connected successfully!")
    console.log(`📍 Bot spawned as: ${bot.getBot()?.username}`)
    console.log("💬 You can now use commands or type 'help' for options\n")
  } catch (error) {
    console.error("❌ Auto-connection failed:", error instanceof Error ? error.message : error)
    console.log("💡 You can try 'connect' command manually\n")
  }

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
          console.log(`📍 Bot spawned as: ${bot.getBot()?.username}`)
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

    if (command === "reconnect") {
      if (connected) {
        console.log("🔄 Disconnecting...")
        await bot.disconnect()
        connected = false
      }
      try {
        console.log("🔄 Reconnecting to Minecraft server...")
        await bot.connect()
        connected = true
        console.log("✅ Reconnected successfully!")
        console.log(`📍 Bot spawned as: ${bot.getBot()?.username}`)
      } catch (error) {
        console.error("❌ Reconnection failed:", error instanceof Error ? error.message : error)
      }
      rl.prompt()
      return
    }

    if (command === "status") {
      if (!connected) {
        console.log("❌ Bot is not connected")
      } else {
        const status = bot.getStatus()
        console.log("📊 Bot Status:")
        console.log(`   Connected: ${status.connected}`)
        console.log(`   Username: ${status.username}`)
        console.log(`   Health: ${status.health}/20`)
        console.log(`   Food: ${status.food}/20`)
        console.log(
          `   Position: (${Math.floor(status.position.x)}, ${Math.floor(status.position.y)}, ${Math.floor(status.position.z)})`,
        )
        console.log(`   Dimension: ${status.dimension}`)
        console.log(`   Game Mode: ${status.gameMode}`)

        if (status.interactions) {
          console.log("🤝 Interactions:")
          console.log(`   Total Interactions: ${status.interactions.totalInteractions}`)
          console.log(`   Total Responses: ${status.interactions.totalResponses}`)
          console.log(`   Currently Looking At: ${status.interactions.currentTarget || "none"}`)
        }
      }
      rl.prompt()
      return
    }

    if (command.startsWith("chat ")) {
      if (!connected) {
        console.log("❌ Bot is not connected")
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

    if (command.startsWith("say ")) {
      if (!connected) {
        console.log("❌ Bot is not connected")
      } else {
        const message = command.slice(4)
        const botInstance = bot.getBot()
        if (botInstance) {
          botInstance.chat(message)
          console.log(`💬 Said: ${message}`)
        }
      }
      rl.prompt()
      return
    }

    if (command === "players") {
      if (!connected) {
        console.log("❌ Bot is not connected")
      } else {
        const botInstance = bot.getBot()
        if (botInstance) {
          const players = Object.keys(botInstance.players).filter((name) => name !== botInstance.username)
          if (players.length === 0) {
            console.log("👥 No other players online")
          } else {
            console.log(`👥 Players online: ${players.join(", ")}`)
          }
        }
      }
      rl.prompt()
      return
    }

    if (command === "entities") {
      if (!connected) {
        console.log("❌ Bot is not connected")
      } else {
        const botInstance = bot.getBot()
        if (botInstance) {
          const entities = Object.values(botInstance.entities)
            .filter((entity) => entity !== botInstance.entity && entity.type === "player")
            .map(
              (entity) => `${entity.username} (${entity.position.distanceTo(botInstance.entity.position).toFixed(1)}m)`,
            )

          if (entities.length === 0) {
            console.log("🎭 No other entities nearby")
          } else {
            console.log(`🎭 Nearby entities: ${entities.join(", ")}`)
          }
        }
      }
      rl.prompt()
      return
    }

    if (command === "config") {
      console.log("⚙️  Current Configuration:")
      console.log(`   Host: ${process.env.MINECRAFT_HOST || "localhost"}`)
      console.log(`   Port: ${process.env.MINECRAFT_PORT || "25565"}`)
      console.log(`   Username: ${process.env.MINECRAFT_USERNAME || "TestBot"}`)
      console.log(`   Password: ${process.env.MINECRAFT_PASSWORD ? "***" : "none"}`)
      rl.prompt()
      return
    }

    if (command === "") {
      rl.prompt()
      return
    }

    // Execute bot command
    if (!connected) {
      console.log('❌ Bot is not connected. Use "connect" or wait for auto-connection.')
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
    console.log("\n🛑 Received SIGINT, shutting down...")
    if (connected) {
      await bot.disconnect()
    }
    process.exit(0)
  })
}

function showHelp() {
  console.log(`
Available REPL Commands:
  
- Connection:
  > status               - Show detailed bot status
  *> connect              - Connect to Minecraft server
  *> disconnect           - Disconnect from server  
  *> reconnect            - Disconnect and reconnect
  *> config               - Show current configuration

- Communication:
  *> chat <message>       - Send chat message
  *> say <message>        - Send chat message (alias)
  
 Information:
  *> players              - List online players
  *> entities             - List nearby entities
  
Bot Commands (when connected):
-  Movement:
    > goto <x> <y> <z>   - Move to coordinates
    > follow <player>    - Follow a player
    > patrol <x1> <z1> <x2> <z2> - Patrol between points
    > stop               - Stop movement

-  Gathering:
    > mine <block> <qty> [range] [scout] [tries] - Enhanced mining
      Examples:
        mine stone 10                    - Mine 10 stone blocks
        mine iron_ore 5 64              - Mine 5 iron ore (range 64)
        mine diamond_ore 3 32 true 5    - Mine 3 diamonds with scouting
    *> collect <item> [amount]             - Collect items
    > harvest <crop>                      - Harvest crops

-  Combat:
    attack <target>    - Attack entity
    defend             - Enter defensive mode
    flee [distance]    - Flee from danger

-  Exploration:
    explore [radius]   - Explore area
    scout <direction>  - Scout in direction
    map [radius]       - Map surrounding area

-  Interaction:
    targeting          - Show bot targeting help
    mining             - Show detailed mining help
    interact stats     - Show interaction statistics
    responses          - Show available responses

-  Utility:
    inventory          - Show inventory
    help               - Show bot command help

🚪 Exit:
  quit/exit            - Exit REPL

💡 Tips:
  - The bot auto-connects on startup
  - Use 'status' to see detailed information
  - Commands are executed directly (no ! needed in REPL)
  - In-game, use targeting methods to control specific bots
  - Try 'mining' command for detailed mining examples
`)
}

// Start REPL if this file is run directly
if (require.main === module) {
  startRepl().catch((error) => {
    logger.error("REPL startup failed:", error)
    process.exit(1)
  })
}

# Quick Start

### Prerequisites

- Node.js 18+
- Python 3.9+
- Redis (optional, for persistent memory)
- Minecraft server (Paper/Spigot recommended)

### Installation

1. **Clone and setup the monorepo:**
   ```bash
   git clone <repository-url>
   cd OMNIA
   npm run setup
   ```

2. **Configure environment:**
   ```bash
   cd bot-agent
   cp .env.example .env
   ```

## Edit .env with your Minecraft server details

3. **Start the bot agent:**
```
  # Development mode with hot reload
  npm run dev:bot-agent

  # Or use the REPL for testing
  cd bot-agent
  npm run repl
```

## Bot Agent Usage

### REPL Commands

```bash

# Connection

connect # Connect to Minecraft server
disconnect # Disconnect from server
status # Show bot status

# Chat

chat <message> # Send chat message

# Bot Commands (when connected)

_On the REPL, you can execute bot commands directly. For in-game use, prefix commands with '!' and target the bot._
goto <x> <y> <z> # Move to coordinates
follow <player> # Follow a player
mine <block> # Mine specific blocks
explore [radius] # Explore area
attack <target> # Combat actions
```

### API Endpoints

```bash
# Health check
GET /health

# Bot status
GET /status

# Execute commands
POST /command
{
  "command": "goto 100 64 200"
}

# Send chat
POST /chat
{
  "message": "Hello world!"
}

# Get inventory
GET /inventory

# Get nearby entities
GET /entities
```

### Example Usage

**Basic Movement:**
```bash
bot> connect
bot> goto 100 64 200
bot> follow Steve
bot> patrol 0 0 100 100
```

**Resource Gathering:**
```bash
bot> mine diamond_ore
bot> collect wood 64
bot> harvest wheat
```

**Exploration:**
```bash
bot> explore 50
bot> scout north 30
bot> map 25
```

## Development

### Project Structure

```
minecraft-bot-monorepo/
├── bot-agent/ # Node.js bot agent
│ ├── src/
│ │ ├── index.ts # Entry point
│ │ ├── bot.ts # Main bot class
│ │ ├── commands/ # Command implementations
│ │ ├── logic/ # Agent logic and memory
│ │ ├── api/ # REST API server
│ │ └── utils.ts # Utilities
│ ├── tests/ # Test files
│ └── Dockerfile
├── bot-logic/ # Python AI logic (coming next)
├── fastapi-bridge/ # Python FastAPI bridge (coming next)
└── package.json # Monorepo root
```

### Available Scripts

```bash
# Bot Agent
npm run dev:bot-agent # Development mode
npm run build:bot-agent # Build TypeScript
npm run start:bot-agent # Start production
npm run test:bot-agent # Run tests

# REPL
cd bot-agent && npm run repl # Interactive testing
```

### Environment Variables

```bash
# Minecraft Server

MINECRAFT_HOST=localhost
MINECRAFT_PORT=25565
MINECRAFT_USERNAME=MinecraftBot
MINECRAFT_PASSWORD=

# Redis (optional)
REDIS_URL=redis://localhost:6379

# API
API_PORT=3001

# Services
BOT_LOGIC_URL=http://localhost:8000
FASTAPI_BRIDGE_URL=http://localhost:8001
```

## Features

### ✅ Implemented (bot-agent)

- [x] Mineflayer bot connection
- [x] Command system (move, gather, combat, explore)
- [x] Memory management with Redis support
- [x] REPL interface for testing
- [x] REST API for external control
- [x] Agent state management
- [x] Event logging and history
- [x] Docker support

### 🚧 Coming Next

- [ ] bot-logic Python service
- [ ] fastapi-bridge LLM integration
- [ ] Multi-agent coordination
- [ ] AI decision making
- [ ] Kubernetes deployment
- [ ] Web dashboard

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Next Steps

This completes the **bot-agent** component. The next phases will implement:

1. **bot-logic** - Python service for AI decision making
2. **fastapi-bridge** - LLM integration and RAG capabilities
3. **Integration** - Connect all components together
4. **Deployment** - Kubernetes manifests and CI/CD

The bot-agent is now ready for testing and can connect to Minecraft servers, execute commands, and provide a foundation for the AI-powered decision making system.

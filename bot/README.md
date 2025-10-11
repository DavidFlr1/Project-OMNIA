# Bot Agent

A TypeScript/Node.js Minecraft bot agent built with Mineflayer, featuring AI decision making, goal management, and comprehensive API control with integrated Python logic layer.

## Overview

The bot agent combines both the Minecraft connection layer and AI logic in a single service, providing:

- Mineflayer bot connection and control
- Goal-based task management
- Memory and state persistence
- REST API for external control
- AI decision making and chat processing
- LLM integration for intelligent responses

## Prerequisites

- Node.js 18+
- Python 3.8+
- Minecraft server (Paper/Spigot recommended)
- OpenAI API key (for LLM features)

## Installation

1. **Install Node.js dependencies:**

   ```bash
   npm install
   ```

2. **Install Python dependencies:**

   ```bash
   cd src/logic
   pip install -r requirements.txt
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your Minecraft server details and OpenAI API key
   ```

## Running the Bot

### Development Mode

```bash
# Run the bot
npm run dev:combined botName=Bob subPort=1 env=local network=localhost

# OR run the agent and logic service individually
# Start the TypeScript agent
npm run dev:agent botName=<name> subPort=<port_number_1_to_999>

# Start the Python logic service
cd src/logic
npm run dev:logic subPort=<port_number_1_to_999>
```

### Containerized bots based on config file

```bash
cd bot
chmod +x deploy-bots.py

# Start all bots from config
python ./deploy-bots.py

# Stop all bots
python ./deploy-bots.py stop
```

### Production Mode

```bash
npm run build
npm run start:agent
```

## Project Structure

```
bot/
├── src/
│   ├── agent/
│   │   ├── index.ts         # Entry point
│   │   ├── bot.ts           # Main bot class
│   │   ├── core/            # Core agent functionality
│   │   │   ├── agent.ts     # Agent state and management
│   │   │   ├── goals.ts     # Goal management system
│   │   │   └── memory.ts    # Memory and persistence
│   │   ├── features/        # Bot feature implementations
│   │   │   ├── index.ts     # Command handler
│   │   │   ├── move.ts      # Movement commands
│   │   │   ├── gather.ts    # Resource gathering
│   │   │   ├── build.ts     # Building commands
│   │   │   ├── combat.ts    # Combat features
│   │   │   ├── explore.ts   # Exploration
│   │   │   ├── utility.ts   # Utility commands
│   │   │   └── chatInteraction.ts # Chat processing
│   │   ├── api/             # REST API server
│   │   │   ├── server.ts    # Express server setup
│   │   │   ├── routes/      # API route handlers
│   │   │   └── openapi.ts   # API documentation
│   │   └── utils/           # Helper functions and logging
│   └── logic/               # AI decision making (Python)
│       ├── main.py          # FastAPI logic service entry point
│       ├── subordinates/    # Logic modules
│       │   └── chat_manager.py # Chat message processing
│       ├── memory/          # Memory management
│       └── requirements.txt # Python dependencies
├── Dockerfile               # Container definition
└── package.json            # Dependencies and scripts
```

## Bot Commands

### Movement

- `goto <x> <y> <z>` - Move to coordinates
- `follow <player>` - Follow a player
- `patrol <x1> <z1> <x2> <z2>` - Patrol between points
- `explore [radius]` - Explore area

### Resource Gathering

- `mine <block>` - Mine specific blocks
- `collect <item> [amount]` - Collect items
- `harvest <crop>` - Harvest crops

### Combat & Defense

- `attack <target>` - Attack entity
- `defend` - Enter defensive mode
- `flee` - Flee from danger

### Inventory & Crafting

- `craft <item> [amount]` - Craft items
- `equip <item>` - Equip item
- `drop <item> [amount]` - Drop items

### Utility

- `status` - Show bot status
- `help [command]` - Show help
- `chat <message>` - Send chat message

## AI Logic Layer

The Python logic service provides intelligent decision making:

### Chat Processing

- Processes player messages through LLM
- Determines message intent (information, action, conversation, unclear)
- Generates contextual responses
- Integrates with bot memory and state

### Features

- **Chat Manager**: Handles all chat interactions with specialized Minecraft bot prompts
- **Memory Integration**: Accesses bot memory for context-aware responses
- **LLM Integration**: Uses OpenAI GPT models for natural language processing
- **Intent Detection**: Categorizes messages for appropriate responses

### API Endpoints (Logic Service - Port 8000)

- `GET /health` - Health check
- `GET /` - Service status
- `POST /chat` - Process chat messages with AI

## API Endpoints (Agent Service - Port 3001)

### Core Endpoints

- `GET /health` - Health check
- `GET /status` - Bot status
- `POST /connect` - Connect to server
- `POST /disconnect` - Disconnect from server
- `POST /command` - Execute bot command

### Chat Endpoints

- `POST /chat` - Send chat message (integrates with logic service)
- `GET /chat/history` - Get chat history

### Goals Endpoints

- `GET /goals` - List all goals
- `POST /goals` - Create new goal
- `GET /goals/:id` - Get goal details
- `PUT /goals/:id` - Update goal
- `DELETE /goals/:id` - Delete goal
- `POST /goals/:id/activate` - Activate goal

### Documentation

- Interactive API docs: `http://localhost:3001/api-docs`
- OpenAPI spec: `http://localhost:3001/api-spec`

## Goal Management

The bot uses a hierarchical goal system:

```javascript
// Create a goal via API
POST /goals
{
  "name": "Build House",
  "description": "Build a simple house",
  "priority": 5,
  "milestones": [
    { "name": "Gather wood", "description": "Collect 64 wood blocks" },
    { "name": "Find location", "description": "Find suitable building spot" },
    { "name": "Build foundation", "description": "Place foundation blocks" }
  ]
}
```

## Environment Variables

```bash
# Minecraft Server Settings
MINECRAFT_HOST=localhost #185.83.155.26 #localhost
MINECRAFT_PORT=25565 #25596 #25565
MINECRAFT_ID=1

# Bot Configuration (API & Logic)
MINECRAFT_USERNAME=MinecraftBot
MINECRAFT_PASSWORD=
BOT_HOST=http://0.0.0.0 # or http://127.0.0.1
AGENT_PORT=3001
LOGIC_PORT=4001
API_HOST=0.0.0.0

CONFIG_URL=''
CONFIG_WATCH=false

# OpenAI API Key for LLM responses
AUTH_SECRET=your_auth_secret_here
OPENAI_API_KEY=your_openai_api_key_here

```

## Chat Interaction System

The bot features intelligent chat processing:

### Player Interaction

- Players can chat with the bot naturally
- Bot processes messages through AI logic service
- Responses are contextual and Minecraft-appropriate
- Supports commands and casual conversation

### Example Interactions

```
Player: "What are you doing?"
Bot: "I'm currently exploring the area looking for resources."

Player: "Can you build me a house?"
Bot: "I'd be happy to help build a house! Where would you like it?"

Player: "Hello there!"
Bot: "Hello! How can I help you today?"
```

## Features

### ✅ Implemented

- [x] Mineflayer bot connection
- [x] Command system (movement, gathering, combat, exploration)
- [x] Goal management with milestones
- [x] REST API with OpenAPI documentation
- [x] Agent state management
- [x] Player interaction system
- [x] Event logging and history
- [x] AI chat processing with LLM integration
- [x] Intent detection for messages
- [x] Context-aware responses
- [x] Docker support

### 🚧 In Development

- [ ] Advanced AI decision making
- [ ] Multi-agent coordination
- [ ] Learning from experience
- [ ] Dynamic goal generation

## Usage Examples

### API Usage

```bash
# Connect to server
curl -X POST http://localhost:3001/connect

# Execute command
curl -X POST http://localhost:3001/command \
  -H "Content-Type: application/json" \
  -d '{"command":"goto 100 64 200"}'

# Process chat message
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"What are you doing?","player_username":"Steve","bot_username":"Bot"}'
```

## Development

### Available Scripts

```bash
npm run dev:agent      # Development mode with hot reload
npm run start:agent    # Start production
npm run clean          # Clean build files
```

### Python Logic Development

```bash
cd src/logic
python main.py  # Start logic service

# or
npm run dev:logic
```

## Docker

Build and run with Docker:

```bash
docker build -t minecraft-bot .
docker run -p 3001:3001 -p 8000:8000 minecraft-bot
```

## Integration with OMNIA

This bot agent is part of the larger OMNIA (Organized Minecraft Neural Intelligent Agents) project, designed to work with:

- Minecraft server in offline mode
- Integrated AI logic for intelligent responses
- Multi-agent coordination systems
- Governor service for LLM processing

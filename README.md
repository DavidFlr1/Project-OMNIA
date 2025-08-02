# Project OMNIA - Minecraft Bot Civilization

Project OMNIA (Organized Minecraft Neural Intelligent Agents) is a Minecraft Bot Civilization project that creates autonomous players capable of performing in-game mechanics (farming, mining, fighting, trading, building, eating, chatting) and interacting with each other to form significant and persistent connections, with the common objective of organizing and building an ecosystem.

## 🏗️ Project Structure

```
omnia/
├── bot-agent/               # Node.js/TypeScript Mineflayer bot implementation
│   ├── src/                 # Bot agent source code
│   │   ├── api/             # REST API server and routes
│   │   ├── commands/        # Bot command implementations
│   │   ├── core/            # Core bot functionality and state
│   │   ├── test/            # Testing utilities including REPL
│   │   └── utils/           # Helper functions and logging
│   ├── Dockerfile           # Container definition
│   └── package.json         # Dependencies and scripts
├── bot-logic/               # Python AI decision engine
│   ├── main.py              # FastAPI application
│   ├── Dockerfile           # Container definition
│   └── requirements.txt     # Python dependencies
├── fastapi-bridge/          # Python LLM and RAG bridge
│   ├── app/                 # FastAPI application
│   ├── Dockerfile           # Container definition
│   └── requirements.txt     # Python dependencies
├── minecraft-server/        # Containerized Minecraft server
│   ├── Dockerfile           # PaperMC server container
│   ├── plugins/             # Server plugins
│   └── scripts/             # Server utilities
├── docker-compose.yml       # Multi-service orchestration
├── .env                     # Environment configuration
└── start-services.sh        # Service startup script
```

## 🛠️ Technologies

- **Bot**:
   - **Agent**: Node.js, TypeScript, Mineflayer
   - **Logic**: Python, FastAPI, AI planning algorithms
- **Governor**: Python, FastAPI, LLM integration
- **Minecraft Server**: PaperMC 1.21, Docker
- **Storage Service**: Python, FastAPI, Redis, Firestore, Cloud Storage

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Python 3.9+
- Docker and Docker Compose
- OpenAI API key (for LLM integration)

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd omnia
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your OpenAI API key and other settings

3. **Install dependencies**
   ```bash
   npm run setup
   ```
   Or manually:
   ```bash
   npm install
   cd bot-agent && npm install
   cd ../bot-logic && pip install -r requirements.txt
   cd ../fastapi-bridge && pip install -r requirements.txt
   ```

## 🎮 Running the Project

### Option 1: Using Docker Compose (All Services)

```bash
# Start all services
docker compose up

# Run in background
docker compose up -d

# Stop all services
docker compose down
```

### Option 2: Start Services Individually

1. **Start Minecraft Server**
   ```bash
   cd minecraft-server
   docker compose up -d
   ```

2. **Start FastAPI Bridge**
   ```bash
   cd fastapi-bridge
   python -m uvicorn app.main:app --host 0.0.0.0 --port 8001
   ```

3. **Start Bot Logic**
   ```bash
   cd bot-logic
   python -m uvicorn main:app --host 0.0.0.0 --port 8000
   ```

4. **Start Bot Agent**
   ```bash
   cd bot-agent
   npm run dev
   ```

### Option 3: Using the Convenience Script

```bash
# Start all services
./start-services.sh
```

## 🤖 Bot Interaction

### REPL Interface

For direct bot testing and interaction:
```bash
cd bot-agent
npm run repl
```

Common commands:
```
bot> connect
bot> goto 100 64 200
bot> mine diamond_ore
bot> explore 50
```

### API Endpoints

The bot agent exposes a comprehensive REST API for controlling and monitoring the bot:

- **Base URL**: `http://localhost:3001`
- **Documentation**: `http://localhost:3001/api-docs` (Swagger UI)
- **OpenAPI Spec**: `http://localhost:3001/api-spec` (for Postman import)

#### Core Endpoints

- `GET /health` - Health check
- `GET /status` - Bot status
- `POST /connect` - Connect to Minecraft server
- `POST /disconnect` - Disconnect from server
- `POST /command` - Execute bot command

#### Chat Endpoints

- `POST /chat` - Send chat message
- `GET /chat/history` - Get chat history

#### Goals Endpoints

- `GET /goals` - List all goals
- `POST /goals` - Create new goal
- `GET /goals/:id` - Get goal details
- `PUT /goals/:id` - Update goal
- `DELETE /goals/:id` - Delete goal
- `POST /goals/:id/activate` - Activate goal
- `POST /goals/:id/complete` - Complete goal
- `POST /goals/:id/milestones` - Add milestone to goal

Example API request:
```bash
curl -X POST http://localhost:3001/command \
  -H "Content-Type: application/json" \
  -d '{"command":"goto 100 64 200"}'
```

## 🧠 Core Features

### Bot Agent

The bot agent is built on Mineflayer and provides:

1. **Command System**
   - Movement: `goto`, `follow`, `patrol`, `explore`
   - Resource gathering: `mine`, `collect`, `harvest`
   - Combat: `attack`, `defend`, `flee`
   - Building: `place`, `build`
   - Inventory: `craft`, `equip`, `drop`

2. **Goal Management**
   - Hierarchical goal system with milestones
   - Priority-based execution
   - Automatic command execution
   - Progress tracking

3. **Memory & State**
   - Persistent memory with Redis
   - Environment awareness
   - Inventory tracking
   - Entity recognition

4. **API Integration**
   - REST API for external control
   - Event system for real-time updates
   - OpenAPI documentation

### Bot Logic

The bot logic service provides:

1. **Decision Making**
   - Goal selection and planning
   - Task prioritization
   - Resource allocation

2. **World Understanding**
   - Environment mapping
   - Resource tracking
   - Risk assessment

### FastAPI Bridge

The FastAPI bridge provides:

1. **LLM Integration**
   - Natural language understanding
   - Context-aware responses
   - Decision support

2. **RAG Capabilities**
   - Knowledge retrieval
   - Memory augmentation
   - Learning from experience

## 🧪 Testing

Test the LLM integration:
```bash
curl -X POST http://localhost:8001/chat \
  -H "Content-Type: application/json" \
  -d @test-request.json
```

Test the bot agent API:
```bash
# Import the OpenAPI spec into Postman
curl -X GET http://localhost:3001/api-spec > bot-api-spec.json
```

## 📝 Development

For VSCode users, install the recommended Terminals extension for easy service management:
- [Terminals](https://marketplace.visualstudio.com/items?itemName=fabiospampinato.vscode-terminals)

### API Development

The bot agent API uses Express with Swagger documentation:

1. **Adding new endpoints**:
   - Add route handlers in `bot-agent/src/api/routes/`
   - Update OpenAPI spec in `bot-agent/src/api/openapi.ts`

2. **Testing API**:
   - Use Swagger UI at `http://localhost:3001/api-docs`
   - Import OpenAPI spec to Postman from `http://localhost:3001/api-spec`

### Bot Command Development

To add new bot commands:

1. Create command handler in `bot-agent/src/commands/`
2. Register command in `bot-agent/src/commands/index.ts`
3. Test using REPL: `npm run repl`

## 📚 Documentation

For more detailed information:
- [Bot Agent README](bot-agent/README.md)
  - Communication bridge between bots and AI models
- [Minecraft Server README](minecraft-server/README.md)
  - Server configuration and administration
- [API Documentation](http://localhost:3001/api-docs)
  - Interactive API documentation (when server is running)

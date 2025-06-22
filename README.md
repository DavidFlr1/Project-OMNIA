# Project OMNIA - Minecraft Bot Civilization

Project OMNIA (Organized Minecraft Neural Intelligent Agents) is a Minecraft Bot Civilization project that creates autonomous players capable of performing in-game mechanics (farming, mining, fighting, trading, building, eating, chatting) and interacting with each other to form significant and persistent connections, with the common objective of organizing and building an ecosystem.

## 🏗️ Project Structure

```
omnia/
├── bot-agent/               # Node.js/TypeScript Mineflayer bot implementation
│   ├── src/                 # Bot agent source code
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

- **Bot Agent**: Node.js, TypeScript, Mineflayer
- **Bot Logic**: Python, FastAPI, AI planning algorithms
- **FastAPI Bridge**: Python, FastAPI, LLM integration
- **Minecraft Server**: PaperMC 1.21, Docker
- **Infrastructure**: Docker, Redis, Kubernetes (optional)
- **AI**: LLM integration, RAG (Retrieval Augmented Generation)

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

- Bot Agent: `http://localhost:3001`
- Bot Logic: `http://localhost:8000`
- FastAPI Bridge: `http://localhost:8001`

Example API request:
```bash
curl -X POST http://localhost:3001/command -H "Content-Type: application/json" -d '{"command":"goto 100 64 200"}'
```

## 🧪 Testing

Test the LLM integration:
```bash
curl -X POST http://localhost:8001/chat -H "Content-Type: application/json" -d @test-request.json
```

## 📝 Development

For VSCode users, install the recommended Terminals extension for easy service management:
- [Terminals](https://marketplace.visualstudio.com/items?itemName=fabiospampinato.vscode-terminals)

## 📚 Documentation

For more detailed information:
- [Bot Agent README](bot-agent/README.md)
  - Communication bridge between bots and AI models

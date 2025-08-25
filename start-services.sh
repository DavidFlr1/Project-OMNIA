#!/bin/bash

# Start all services for testing
echo "🚀 Starting OMNIA Services..."

# Set environment variables
export OPENAI_API_KEY=${OPENAI_API_KEY:-"your_openai_api_key_here"}
export AUTH_SECRET=${AUTH_SECRET:-"your_auth_secret_here"}
export GOVERNOR_URL="http://localhost:5000"
export STORAGE_SERVICE_URL="http://localhost:8000/api/v1"

# Start Redis
echo "🔴 Starting Redis on port 6379..."
redis-server --daemonize yes --port 6379

# Wait for Redis
sleep 2

# Start Storage Service
echo "💾 Starting Storage Service on port 8000..."
cd storage-service
python -m uvicorn src.main:app --host 0.0.0.0 --port 8000 &
STORAGE_PID=$!

# Wait for storage service
sleep 3

# Start Governor
echo "🏛️ Starting Governor on port 5000..."
cd ../governor
python -m uvicorn app.main:app --host 0.0.0.0 --port 5000 &
GOVERNOR_PID=$!

# Wait for governor
sleep 3

# Start Bot Agent & Logic
echo "🤖 Starting Bot Agent on port 3001 and Logic on port 4001..."
cd ../bot
npm run dev:agent botName=MinecraftBot subPort=1 &
AGENT_PID=$!

# Start Bot Logic in separate process
npm run dev:logic subPort=1 &
LOGIC_PID=$!

echo "✅ All services started!"
echo "🏛️ Governor: http://localhost:5000"
echo "💾 Storage Service: http://localhost:8000"
echo "🤖 Bot Agent API: http://localhost:3001"
echo "🧠 Bot Logic API: http://localhost:4001"
echo "🔴 Redis: localhost:6379"
echo "🎮 Minecraft Server: localhost:25565 (if running separately)"
echo ""
echo "To stop all services, press Ctrl+C"

# Wait for interrupt
trap "echo '🛑 Stopping all services...'; kill $STORAGE_PID $GOVERNOR_PID $AGENT_PID $LOGIC_PID 2>/dev/null; redis-cli shutdown; exit" INT
wait


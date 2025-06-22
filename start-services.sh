#!/bin/bash

# Start all services for testing
echo "🚀 Starting Minecraft Bot Services..."

# Set environment variables
export OPENAI_API_KEY=${OPENAI_API_KEY:-"your_openai_api_key_here"}
export FASTAPI_BRIDGE_URL="http://localhost:8001"
export BOT_LOGIC_URL="http://localhost:8000"

# Start FastAPI Bridge
echo "📡 Starting FastAPI Bridge on port 8001..."
cd fastapi-bridge
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 &
BRIDGE_PID=$!

# Wait a moment for bridge to start
sleep 3

# Start Bot Logic
echo "🧠 Starting Bot Logic on port 8000..."
cd ../bot-logic
FASTAPI_BRIDGE_URL=$FASTAPI_BRIDGE_URL python -m uvicorn main:app --host 0.0.0.0 --port 8000 &
LOGIC_PID=$!

# Wait a moment for logic to start
sleep 3

# Start Bot Agent
echo "🤖 Starting Bot Agent..."
cd ../bot-agent
BOT_LOGIC_URL=$BOT_LOGIC_URL npm run dev &
AGENT_PID=$!

echo "✅ All services started!"
echo "📡 FastAPI Bridge: http://localhost:8001"
echo "🧠 Bot Logic: http://localhost:8000"
echo "🤖 Bot Agent: Running with Minecraft connection"
echo ""
echo "To stop all services, press Ctrl+C"

# Wait for interrupt
trap "echo '🛑 Stopping all services...'; kill $BRIDGE_PID $LOGIC_PID $AGENT_PID; exit" INT
wait

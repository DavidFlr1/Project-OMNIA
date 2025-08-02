"""
Bot Logic Service - Main Entry Point
Handles AI decision making and multi-agent coordination
"""

import asyncio
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from subordinates.chat_manager import chat_manager

# Load environment variables from .env file
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Bot Logic Service", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "bot-logic"}

@app.get("/")
async def root():
    return {"message": "Bot Logic Service is running"}

@app.post("/chat")
async def handle_chat(request: Request):
    """
    Handle chat requests from bot-agent and forward to fastapi-bridge
    """
    try:
        data = await request.json()
        message = data.get("message", "")
        context = data.get("context", {})
        # NEW: Extract username information
        player_username = data.get("player_username", "Player")
        bot_username = data.get("bot_username", "Bot")
        
        logger.info(f"Received chat request from {player_username} to {bot_username}: {message}")
        
        # Forward to specialized chat manager
        response = await chat_manager.handle_chat_message(
            message, context, player_username, bot_username
        )
        
        return {"response": response}
        
    except Exception as e:
        logger.error(f"Error handling chat: {e}")
        return {"response": "Sorry, I'm having trouble thinking right now."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

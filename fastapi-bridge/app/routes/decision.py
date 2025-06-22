"""
Decision Routes - Handles LLM decision making requests
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
import logging

from app.services.llm_client import ask_llm

logger = logging.getLogger(__name__)

router = APIRouter()

class ChatRequest(BaseModel):
    message: str
    context: Optional[Dict[str, Any]] = None

class ChatResponse(BaseModel):
    response: str
    confidence: Optional[float] = None

@router.post("/chat", response_model=ChatResponse)
async def handle_chat(request: ChatRequest):
    """
    Process a chat message using LLM and return response
    """
    try:
        logger.info(f"Received chat request: {request.message}")
        
        # Build the prompt with context
        prompt = build_chat_prompt(request.message, request.context)
        
        # Get LLM response
        llm_response = await ask_llm(prompt)
        
        logger.info(f"Generated response: {llm_response}")
        
        return ChatResponse(
            response=llm_response,
            confidence=0.8  # Placeholder confidence score
        )
        
    except Exception as e:
        logger.error(f"Error processing chat request: {e}")
        raise HTTPException(status_code=500, detail="Failed to process chat message")

def build_chat_prompt(message: str, context: Optional[Dict[str, Any]] = None) -> str:
    """
    Build a prompt for the LLM based on the message and context
    """
    base_prompt = """You are a helpful Minecraft bot assistant. You should respond as if you are a bot in the game.
Keep responses concise and helpful. Focus on Minecraft-related advice and conversation.

"""
    
    # Add context if available
    if context:
        if context.get("health"):
            base_prompt += f"Current health: {context['health']}/20\n"
        if context.get("position"):
            pos = context["position"]
            base_prompt += f"Current position: ({pos.get('x', 0)}, {pos.get('y', 0)}, {pos.get('z', 0)})\n"
        if context.get("inventory"):
            base_prompt += f"Inventory items: {', '.join(context['inventory'].keys())}\n"
    
    base_prompt += f"\nPlayer message: {message}\n\nBot response:"
    
    return base_prompt

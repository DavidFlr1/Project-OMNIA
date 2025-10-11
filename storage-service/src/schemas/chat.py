"""
Chat schema definitions using Pydantic for OpenAPI generation
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime

class CreateChatRequest(BaseModel):
    """Request model for creating a new chat message"""
    username: str = Field(..., description="Username of the message sender", example="Steve")
    message: str = Field(..., description="Chat message content", example="Hello, how are you?")
    response: Optional[str] = Field(None, description="Bot response to the message", example="I'm doing well, thanks!")
    distance: Optional[float] = Field(None, description="Distance between player and bot", example=5.2)
    isNearby: Optional[bool] = Field(None, description="Whether the player is nearby", example=True)
    isLooking: Optional[bool] = Field(None, description="Whether the player is looking at the bot", example=True)
    botId: Optional[str] = Field(None, description="Bot identifier", example="bot_001")
    severity: int = Field(1, ge=0, le=10, description="Message importance level (0-10)", example=1)

class ChatResponse(BaseModel):
    """Response model for chat creation"""
    chat_id: str = Field(..., description="Unique chat message identifier", example="550e8400-e29b-41d4-a716-446655440000")
    status: str = Field(..., description="Creation status", example="created")

class ChatModel(BaseModel):
    """Complete chat message model"""
    id: str = Field(..., description="Unique chat message identifier", example="550e8400-e29b-41d4-a716-446655440000")
    botId: Optional[str] = Field(None, description="Bot identifier", example="bot_001")
    type: str = Field(..., description="Message type (always 'chat_message')", example="chat_message")
    data: Dict[str, Any] = Field(..., description="Chat message data payload")
    severity: int = Field(..., description="Message severity level", example=1)
    timestamp: int = Field(..., description="Message timestamp in milliseconds", example=1703097600000)
    retrieval: Optional[int] = Field(None, description="Retrieval timestamp for archived messages", example=1703097600000)

class GetChatsResponse(BaseModel):
    """Response model for getting chat messages"""
    chats: List[ChatModel] = Field(..., description="List of chat messages")
    count: int = Field(..., description="Number of chat messages returned", example=10)

class ErrorResponse(BaseModel):
    """Standard error response model"""
    error: str = Field(..., description="Error message", example="Chat message not found")
    detail: Optional[str] = Field(None, description="Additional error details")

# Chat-specific filtering and validation
class ChatFilters:
    """Chat message filtering options"""
    USERNAME_FILTER = "username"
    BOT_ID_FILTER = "botId"
    NEARBY_FILTER = "isNearby"
    LOOKING_FILTER = "isLooking"
    HAS_RESPONSE_FILTER = "hasResponse"

class ChatSeverityLevel:
    """Chat message severity levels"""
    DEBUG = 0
    INFO = 1
    NORMAL = 2
    IMPORTANT = 5
    URGENT = 7
    CRITICAL = 9
    EMERGENCY = 10

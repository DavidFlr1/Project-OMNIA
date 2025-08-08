"""
Event schema definitions using Pydantic for OpenAPI generation
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime

class CreateEventRequest(BaseModel):
    """Request model for creating a new event"""
    event_type: str = Field(..., description="Type of event (e.g., 'player_joined', 'goal_completed')", example="player_joined")
    data: Dict[str, Any] = Field(..., description="Event data payload", example={"username": "Steve", "position": {"x": 100, "y": 64, "z": 200}})
    botId: Optional[str] = Field(None, description="Bot identifier", example="bot_001")
    severity: int = Field(0, ge=0, le=10, description="Event severity/importance level (0-10)", example=5)

class EventResponse(BaseModel):
    """Response model for event creation"""
    event_id: str = Field(..., description="Unique identifier for the created event", example="550e8400-e29b-41d4-a716-446655440000")
    status: str = Field(..., description="Creation status", example="created")

class EventModel(BaseModel):
    """Complete event model"""
    id: str = Field(..., description="Unique event identifier", example="550e8400-e29b-41d4-a716-446655440000")
    botId: Optional[str] = Field(None, description="Bot identifier", example="bot_001")
    type: str = Field(..., description="Event type", example="player_joined")
    data: Dict[str, Any] = Field(..., description="Event data payload")
    severity: int = Field(..., description="Event severity level", example=5)
    timestamp: int = Field(..., description="Event timestamp in milliseconds", example=1703097600000)
    retrieval: Optional[int] = Field(None, description="Retrieval timestamp for archived events", example=1703097600000)

class EventFilters(BaseModel):
    """Query filters for event retrieval"""
    count: int = Field(10, ge=1, le=1000, description="Number of events to retrieve")
    event_id: Optional[str] = Field(None, description="Filter by specific event ID")
    botId: Optional[str] = Field(None, description="Filter by bot ID")
    event_type: Optional[str] = Field(None, description="Filter by event type")
    min_severity: Optional[int] = Field(None, ge=0, le=10, description="Filter by minimum severity level")
    order_by: str = Field("timestamp", pattern="^(timestamp|severity)$", description="Field to order by")
    order_desc: bool = Field(True, description="Order descending (newest first)")

class GetEventsResponse(BaseModel):
    """Response model for event retrieval"""
    events: List[EventModel] = Field(..., description="List of events")
    count: int = Field(..., description="Number of events returned", example=10)

class FeedTableRequest(BaseModel):
    """Request model for feeding events from archive"""
    events: List[Dict[str, Any]] = Field(..., description="List of events to add to Redis")

class FeedTableResponse(BaseModel):
    """Response model for feed table operation"""
    status: str = Field(..., description="Operation status", example="success")
    added_count: int = Field(..., description="Number of events successfully added", example=25)

class UpdateEventRequest(BaseModel):
    """Request model for updating an event"""
    data: Optional[Dict[str, Any]] = Field(None, description="Updated event data")
    severity: Optional[int] = Field(None, ge=0, le=10, description="Updated severity level")
    type: Optional[str] = Field(None, description="Updated event type")

class DeleteEventResponse(BaseModel):
    """Response model for event deletion"""
    status: str = Field(..., description="Deletion status", example="deleted")
    event_id: str = Field(..., description="ID of deleted event")

class UpdateEventResponse(BaseModel):
    """Response model for event update"""
    status: str = Field(..., description="Update status", example="updated")
    event_id: str = Field(..., description="ID of updated event")

class ErrorResponse(BaseModel):
    """Standard error response model"""
    error: str = Field(..., description="Error message", example="Event not found")
    detail: Optional[str] = Field(None, description="Additional error details")

# Event type enums for better validation
class EventType:
    """Common event types"""
    PLAYER_JOINED = "player_joined"
    PLAYER_LEFT = "player_left"
    GOAL_COMPLETED = "goal_completed"
    GOAL_FAILED = "goal_failed"
    COMMAND_EXECUTED = "command_executed"
    CHAT_MESSAGE = "chat_message"
    DISCOVERY_MADE = "discovery_made"
    ERROR_OCCURRED = "error_occurred"
    BOT_CONNECTED = "bot_connected"
    BOT_DISCONNECTED = "bot_disconnected"

class SeverityLevel:
    """Event severity levels"""
    DEBUG = 0
    INFO = 1
    LOW = 2
    MEDIUM = 5
    HIGH = 7
    CRITICAL = 9
    EMERGENCY = 10
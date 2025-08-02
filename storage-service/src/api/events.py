"""
Events API - REST endpoints for event management
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from src import db_connections
from src.services.events import EventService

router = APIRouter()

# Initialize service
event_service = EventService(db_connections)

class CreateEventRequest(BaseModel):
    event_type: str
    data: Dict[str, Any]
    bot_id: Optional[str] = None

class EventResponse(BaseModel):
    event_id: str
    status: str

@router.post("/", response_model=EventResponse)
async def create_event(request: CreateEventRequest):
    """Create a new event"""
    try:
        event_id = await event_service.create_event(
            request.event_type, 
            request.data, 
            request.bot_id
        )
        return EventResponse(event_id=event_id, status="created")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/recent")
async def get_recent_events(count: int = 10, bot_id: Optional[str] = None):
    """Get recent events"""
    try:
        events = await event_service.get_recent_events(count, bot_id)
        return {"events": events, "count": len(events)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
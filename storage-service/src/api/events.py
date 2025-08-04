"""
Events API - REST endpoints for event management
"""

from fastapi import APIRouter, HTTPException, Query
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
    severity: int = 0

class EventResponse(BaseModel):
    event_id: str
    status: str

class FeedTableRequest(BaseModel):
    events: List[Dict[str, Any]]

@router.post("/", response_model=EventResponse)
async def create_event(request: CreateEventRequest):
    """Create a new event"""
    try:
        event_id = await event_service.createEvent(
            request.event_type, 
            request.data, 
            request.bot_id,
            request.severity
        )
        return EventResponse(event_id=event_id, status="created")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/")
async def get_events(
    count: int = Query(10, ge=1, le=1000),
    event_id: Optional[str] = None,
    bot_id: Optional[str] = None,
    event_type: Optional[str] = None,
    min_severity: Optional[int] = None,
    order_by: str = Query("timestamp", regex="^(timestamp|severity)$"),
    order_desc: bool = True
):
    """Get events with filtering and ordering"""
    try:
        events = await event_service.getEvents(
            count=count,
            event_id=event_id,
            bot_id=bot_id,
            event_type=event_type,
            min_severity=min_severity,
            order_by=order_by,
            order_desc=order_desc
        )
        return {"events": events, "count": len(events)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/feed")
async def feed_table(request: FeedTableRequest):
    """Feed events from archive into Redis table"""
    try:
        added_count = await event_service.feedTable(request.events)
        return {"status": "success", "added_count": added_count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{event_id}")
async def delete_event(event_id: str):
    """Delete an event by ID"""
    try:
        success = await event_service.deleteEvent(event_id)
        if not success:
            raise HTTPException(status_code=404, detail="Event not found")
        return {"status": "deleted", "event_id": event_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{event_id}")
async def update_event(event_id: str, updates: Dict[str, Any]):
    """Update an event by ID"""
    try:
        success = await event_service.updateEvent(event_id, updates)
        if not success:
            raise HTTPException(status_code=404, detail="Event not found")
        return {"status": "updated", "event_id": event_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

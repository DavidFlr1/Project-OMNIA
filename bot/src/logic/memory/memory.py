"""
Memory Management - Handles API calls and business logic
"""

import os
import logging
import aiohttp
from typing import List, Dict, Any, Optional
from logic.context import eventContext
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

logger = logging.getLogger(__name__)

STORAGE_SERVICE_URL = os.getenv("STORAGE_SERVICE_URL", "http://localhost:8000/api/v1/events") #

async def create_event(event_type: str, data: Dict[str, Any], 
                      botId: Optional[str] = None, severity: int = 0) -> Optional[str]:
    """
    Create an event via storage service
    
    Args:
        event_type: Type of event
        data: Event data
        botId: Bot identifier
        severity: Event severity (0-10)
        
    Returns:
        Event ID if successful, None if failed
    """
    try:
        payload = {
            "event_type": event_type,
            "data": data,
            "botId": botId,
            "severity": severity
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(STORAGE_SERVICE_URL, json=payload) as response:
                if response.status == 200:
                    result = await response.json()
                    logger.info(f"Event created: {event_type} ({result['event_id']})")
                    return result['event_id']
                else:
                    logger.error(f"Failed to create event: HTTP {response.status}")
                    return None
                    
    except Exception as e:
        logger.error(f"Failed to create event: {e}")
        return None

async def get_events(count: int = 10, **filters) -> List[Dict[str, Any]]:
    """
    Get events from storage service and update context
    
    Args:
        count: Number of events to retrieve
        **filters: Additional filters (event_id, botId, event_type, min_severity)
        
    Returns:
        List of events
    """
    try:
        params = {"count": count}
        params.update(filters)
        
        async with aiohttp.ClientSession() as session:
            async with session.get(STORAGE_SERVICE_URL, params=params) as response:
                if response.status == 200:
                    result = await response.json()
                    events = result['events']
                    
                    # Update context memory
                    eventContext.update_event_memory(events)
                    
                    logger.info(f"Retrieved {len(events)} events")
                    return events
                else:
                    logger.error(f"Failed to get events: HTTP {response.status}")
                    return eventContext.get_local_events(count)
                    
    except Exception as e:
        logger.error(f"Failed to get events: {e}")
        return eventContext.get_local_events(count)
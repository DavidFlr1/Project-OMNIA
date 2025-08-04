"""
Event Context - Shared event state for logic components
"""

import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

class EventContext:
    """Centralized event state management"""
    
    def __init__(self):
        self.eventMemory: List[Dict[str, Any]] = []
        
    def updateEventMemory(self, events: List[Dict[str, Any]]) -> None:
        """Update the event memory with new events"""
        self.eventMemory = events
        logger.debug(f"Event memory updated with {len(events)} events")
        
    def getLocalEvents(self, count: int = 10) -> List[Dict[str, Any]]:
        """Get events from local memory (no API call)"""
        return self.eventMemory[-count:] if self.eventMemory else []
        
    def addEventToMemory(self, event: Dict[str, Any]) -> None:
        """Add a single event to local memory"""
        self.eventMemory.append(event)
        logger.debug(f"Added event to memory: {event.get('type', 'unknown')}")
        
    def clearEventMemory(self) -> None:
        """Clear all events from memory"""
        self.eventMemory.clear()
        logger.debug("Event memory cleared")
        
    def getMemorySize(self) -> int:
        """Get current memory size"""
        return len(self.eventMemory)
"""
Event Service - Manages event storage across different storage layers
"""

import json
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
from uuid import uuid4

logger = logging.getLogger(__name__)

class EventService:
    """Handles event storage and retrieval"""
    
    def __init__(self, db_connections):
        self.db = db_connections
        
    async def create_event(self, event_type: str, data: Dict[str, Any], 
                          bot_id: Optional[str] = None) -> str:
        """
        Create a new event and store it in appropriate storage
        
        Args:
            event_type: Type of event (e.g., 'player_joined', 'goal_completed')
            data: Event data payload
            bot_id: Optional bot identifier
            
        Returns:
            event_id: Unique identifier for the created event
        """
        event_id = str(uuid4())
        timestamp = datetime.utcnow().isoformat()
        
        event = {
            'id': event_id,
            'type': event_type,
            'data': data,
            'bot_id': bot_id,
            'timestamp': timestamp
        }
        
        try:
            # Store in Redis for hot access (recent events)
            if self.db.redis:
                redis_key = f"events:recent"
                await self.db.redis.lpush(redis_key, json.dumps(event))
                # Keep only last 1000 events in hot storage
                await self.db.redis.ltrim(redis_key, 0, 999)
                
                # Also store by bot_id if provided
                if bot_id:
                    bot_key = f"events:bot:{bot_id}"
                    await self.db.redis.lpush(bot_key, json.dumps(event))
                    await self.db.redis.ltrim(bot_key, 0, 499)  # 500 per bot
                    
            # TODO: Store in Firestore for medium-term storage
            # TODO: Archive old events to Cloud Storage
            
            logger.info(f"Event created: {event_type} ({event_id})")
            return event_id
            
        except Exception as e:
            logger.error(f"Failed to create event: {e}")
            raise
            
    async def get_recent_events(self, count: int = 10, 
                               bot_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Get recent events from hot storage
        
        Args:
            count: Number of events to retrieve
            bot_id: Optional bot filter
            
        Returns:
            List of event dictionaries
        """
        try:
            if not self.db.redis:
                return []
                
            redis_key = f"events:bot:{bot_id}" if bot_id else "events:recent"
            events_data = await self.db.redis.lrange(redis_key, 0, count - 1)
            
            events = []
            for event_data in events_data:
                try:
                    event = json.loads(event_data)
                    events.append(event)
                except json.JSONDecodeError:
                    logger.warning(f"Failed to parse event data: {event_data}")
                    
            return events
            
        except Exception as e:
            logger.error(f"Failed to get recent events: {e}")
            return []
"""
Event Service - Manages event storage across different storage layers
"""

import json
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from uuid import uuid4

logger = logging.getLogger(__name__)

class EventService:
    """Handles event storage and retrieval"""
    
    # Redis storage limits
    MAX_EVENTS = 2500
    MAX_RETRIEVALS = 500
    
    def __init__(self, db_connections):
        self.db = db_connections
        
    async def createEvent(self, event_type: str, data: Dict[str, Any], 
                         bot_id: Optional[str] = None, severity: int = 0) -> str:
        """
        Create a new event and store it in Redis
        
        Args:
            event_type: Type of event (e.g., 'player_joined', 'goal_completed')
            data: Event data payload
            bot_id: Optional bot identifier
            severity: Event severity/importance (default 0)
            
        Returns:
            event_id: Unique identifier for the created event
        """
        event_id = str(uuid4())
        timestamp = int(datetime.utcnow().timestamp() * 1000)  # milliseconds
        
        event = {
            'id': event_id,
            'bot_id': bot_id,
            'type': event_type,
            'data': data,
            'severity': severity,
            'timestamp': timestamp
        }
        
        try:
            if not self.db.redis:
                logger.error("Redis not available")
                raise Exception("Redis connection not available")
                
            # Store in Redis list (matches bot memory format)
            await self.db.redis.lpush("event", json.dumps(event))
            
            # Trim to maintain max events limit
            await self.db.redis.ltrim("event", 0, self.MAX_EVENTS - 1)
            
            # Remove old retrieval events (older than 12 hours)
            await self._cleanupOldRetrievals()
            
            # TODO: Use AI to determine event severity automatically
            # TODO: Store in Firestore for long-term storage
            
            logger.info(f"Event created: {event_type} ({event_id}) severity={severity}")
            return event_id
            
        except Exception as e:
            logger.error(f"Failed to create event: {e}")
            raise
            
    async def getEvents(self, count: int = 10, event_id: Optional[str] = None,
                       bot_id: Optional[str] = None, event_type: Optional[str] = None,
                       min_severity: Optional[int] = None, order_by: str = "timestamp",
                       order_desc: bool = True) -> List[Dict[str, Any]]:
        """
        Get events with filtering and ordering
        
        Args:
            count: Number of events to retrieve
            event_id: Filter by specific event ID (returns single event)
            bot_id: Filter by bot ID
            event_type: Filter by event type
            min_severity: Filter by minimum severity level
            order_by: Field to order by ('timestamp', 'severity')
            order_desc: Order descending (newest first)
            
        Returns:
            List of event dictionaries
        """
        try:
            if not self.db.redis:
                logger.error("Redis not available")
                return []
                
            # Get all events from Redis (we'll filter in memory for now)
            # TODO: Optimize with Redis queries for large datasets
            events_data = await self.db.redis.lrange("event", 0, -1)
            
            events = []
            for event_data in events_data:
                try:
                    event = json.loads(event_data)
                    
                    # Apply filters
                    if event_id and event.get('id') != event_id:
                        continue
                    if bot_id and event.get('bot_id') != bot_id:
                        continue
                    if event_type and event.get('type') != event_type:
                        continue
                    if min_severity is not None and event.get('severity', 0) < min_severity:
                        continue
                        
                    events.append(event)
                    
                    # If searching by ID, return immediately
                    if event_id:
                        return [event]
                        
                except json.JSONDecodeError:
                    logger.warning(f"Failed to parse event data: {event_data}")
                    
            # Sort events
            if order_by == "severity":
                events.sort(key=lambda x: x.get('severity', 0), reverse=order_desc)
            else:  # default to timestamp
                events.sort(key=lambda x: x.get('timestamp', 0), reverse=order_desc)
                
            # Limit results
            return events[:count]
            
        except Exception as e:
            logger.error(f"Failed to get events: {e}")
            return []
            
    async def feedTable(self, events: List[Dict[str, Any]]) -> int:
        """
        Feed events from Firestore/archive into Redis for quick access
        
        Args:
            events: List of events to add to Redis
            
        Returns:
            Number of events successfully added
        """
        try:
            if not self.db.redis:
                logger.error("Redis not available")
                return 0
                
            current_timestamp = int(datetime.utcnow().timestamp() * 1000)
            added_count = 0
            
            # Add retrieval timestamp to each event
            retrieval_events = []
            for event in events:
                retrieval_event = event.copy()
                retrieval_event['retrieval'] = current_timestamp
                retrieval_events.append(retrieval_event)
                
            # Get current retrieval count
            current_events = await self.db.redis.lrange("event", 0, -1)
            current_retrievals = sum(1 for event_data in current_events 
                                   if 'retrieval' in json.loads(event_data))
            
            # If adding new retrievals would exceed limit, remove oldest retrievals
            if current_retrievals + len(retrieval_events) > self.MAX_RETRIEVALS:
                excess = (current_retrievals + len(retrieval_events)) - self.MAX_RETRIEVALS
                await self._removeOldestRetrievals(excess)
                
            # Add new retrieval events
            for event in retrieval_events:
                await self.db.redis.lpush("event", json.dumps(event))
                added_count += 1
                
            # Maintain overall event limit
            await self.db.redis.ltrim("event", 0, self.MAX_EVENTS + self.MAX_RETRIEVALS - 1)
            
            logger.info(f"Fed {added_count} events into Redis table")
            return added_count
            
        except Exception as e:
            logger.error(f"Failed to feed events: {e}")
            return 0
            
    async def deleteEvent(self, event_id: str) -> bool:
        """
        Delete an event by ID (for reference/study)
        
        Args:
            event_id: ID of event to delete
            
        Returns:
            True if deleted, False if not found
        """
        try:
            if not self.db.redis:
                return False
                
            events_data = await self.db.redis.lrange("event", 0, -1)
            
            for i, event_data in enumerate(events_data):
                try:
                    event = json.loads(event_data)
                    if event.get('id') == event_id:
                        # Remove from list by value
                        await self.db.redis.lrem("event", 1, event_data)
                        logger.info(f"Event deleted: {event_id}")
                        return True
                except json.JSONDecodeError:
                    continue
                    
            logger.warning(f"Event not found for deletion: {event_id}")
            return False
            
        except Exception as e:
            logger.error(f"Failed to delete event: {e}")
            return False
            
    async def updateEvent(self, event_id: str, updates: Dict[str, Any]) -> bool:
        """
        Update an event by ID (for reference/study)
        
        Args:
            event_id: ID of event to update
            updates: Dictionary of fields to update
            
        Returns:
            True if updated, False if not found
        """
        try:
            if not self.db.redis:
                return False
                
            events_data = await self.db.redis.lrange("event", 0, -1)
            
            for i, event_data in enumerate(events_data):
                try:
                    event = json.loads(event_data)
                    if event.get('id') == event_id:
                        # Update event
                        event.update(updates)
                        
                        # Replace in Redis list
                        await self.db.redis.lset("event", i, json.dumps(event))
                        logger.info(f"Event updated: {event_id}")
                        return True
                except json.JSONDecodeError:
                    continue
                    
            logger.warning(f"Event not found for update: {event_id}")
            return False
            
        except Exception as e:
            logger.error(f"Failed to update event: {e}")
            return False
            
    async def _cleanupOldRetrievals(self):
        """Remove retrieval events older than 12 hours"""
        try:
            cutoff_time = int((datetime.utcnow() - timedelta(hours=12)).timestamp() * 1000)
            events_data = await self.db.redis.lrange("event", 0, -1)
            
            for event_data in events_data:
                try:
                    event = json.loads(event_data)
                    if (event.get('retrieval') and 
                        event.get('retrieval') < cutoff_time):
                        await self.db.redis.lrem("event", 1, event_data)
                except json.JSONDecodeError:
                    continue
                    
        except Exception as e:
            logger.warning(f"Failed to cleanup old retrievals: {e}")
            
    async def _removeOldestRetrievals(self, count: int):
        """Remove oldest retrieval events"""
        try:
            events_data = await self.db.redis.lrange("event", 0, -1)
            retrieval_events = []
            
            for event_data in events_data:
                try:
                    event = json.loads(event_data)
                    if event.get('retrieval'):
                        retrieval_events.append((event_data, event.get('retrieval')))
                except json.JSONDecodeError:
                    continue
                    
            # Sort by retrieval timestamp (oldest first)
            retrieval_events.sort(key=lambda x: x[1])
            
            # Remove oldest
            for i in range(min(count, len(retrieval_events))):
                await self.db.redis.lrem("event", 1, retrieval_events[i][0])
                
        except Exception as e:
            logger.warning(f"Failed to remove oldest retrievals: {e}")



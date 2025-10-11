"""
Chat Service - Handles chat message storage and retrieval
"""

import json
import logging
from uuid import uuid4
from datetime import datetime
from typing import Dict, Any, List, Optional
from src import db_connections

logger = logging.getLogger(__name__)

class ChatService:
    """Service for managing chat messages"""
    
    def __init__(self, db_connections):
        self.db = db_connections
        self.MAX_CHATS = 1000  # Maximum chat messages to keep in Redis
        self.MAX_RETRIEVALS = 200  # Maximum retrieval chat messages
        
    async def createChat(self, username: str, message: str, response: Optional[str] = None,
                        distance: Optional[float] = None, isNearby: Optional[bool] = None,
                        isLooking: Optional[bool] = None, botId: Optional[str] = None, 
                        severity: int = 1) -> str:
        """
        Create a new chat message and store it in Redis
        
        Args:
            username: Username of the message sender
            message: Chat message content
            response: Optional bot response to the message
            distance: Optional distance between player and bot
            isNearby: Optional whether the player is nearby
            isLooking: Optional whether the player is looking at the bot
            botId: Optional bot identifier
            severity: Message importance level (default 1)
            
        Returns:
            chat_id: Unique identifier for the created chat message
        """
        chat_id = str(uuid4())
        timestamp = int(datetime.utcnow().timestamp() * 1000)  # milliseconds
        
        # Build chat data payload
        chat_data = {
            'username': username,
            'message': message
        }
        
        # Add optional fields if provided
        if response is not None:
            chat_data['response'] = response
        if distance is not None:
            chat_data['distance'] = distance
        if isNearby is not None:
            chat_data['isNearby'] = isNearby
        if isLooking is not None:
            chat_data['isLooking'] = isLooking
        
        chat_entry = {
            'id': chat_id,
            'botId': botId,
            'type': 'chat_message',
            'data': chat_data,
            'severity': severity,
            'timestamp': timestamp
        }
        
        try:
            if not self.db.redis:
                logger.error("Redis not available")
                raise Exception("Redis connection not available")
                
            # Store in Redis list (matches bot memory format)
            await self.db.redis.lpush("events", json.dumps(chat_entry))
            
            # Trim to maintain max events limit
            await self.db.redis.ltrim("events", 0, self.MAX_CHATS - 1)
            
            # Remove old retrieval chats (older than 12 hours)
            await self._cleanupOldRetrievals()
            
            # TODO: Store in Firestore for long-term storage
            # await self._storeInFirestore(chat_entry)

            # TODO: Use AI to analyze chat sentiment and adjust severity
            # severity = await self._analyzeChatSentiment(message, response)
            
            logger.info(f"Chat message created: {username} -> '{message}' ({chat_id}) severity={severity}")
            return chat_id
            
        except Exception as e:
            logger.error(f"Failed to create chat message: {e}")
            raise
            
    async def getChats(self, count: int = 10, chat_id: Optional[str] = None,
                      botId: Optional[str] = None, username: Optional[str] = None,
                      has_response: Optional[bool] = None, is_nearby: Optional[bool] = None,
                      is_looking: Optional[bool] = None, min_severity: Optional[int] = None,
                      order_by: str = "timestamp", order_desc: bool = True) -> List[Dict[str, Any]]:
        """
        Get chat messages with filtering and ordering
        
        Args:
            count: Number of chat messages to retrieve
            chat_id: Filter by specific chat ID (returns single message)
            botId: Filter by bot ID
            username: Filter by username
            has_response: Filter by whether message has a bot response
            is_nearby: Filter by whether player was nearby
            is_looking: Filter by whether player was looking at bot
            min_severity: Filter by minimum severity level
            order_by: Field to order by ('timestamp', 'severity')
            order_desc: Order descending (newest first)
            
        Returns:
            List of chat message dictionaries
        """
        try:
            if not self.db.redis:
                logger.error("Redis not available")
                return []
                
            # Get all events from Redis and filter for chat messages
            events_data = await self.db.redis.lrange("events", 0, -1)
            
            chats = []
            for event_data in events_data:
                try:
                    event = json.loads(event_data)
                    
                    # Only process chat_message events
                    if event.get('type') != 'chat_message':
                        continue
                    
                    # Apply filters
                    if chat_id and event.get('id') != chat_id:
                        continue
                    if botId and event.get('botId') != botId:
                        continue
                    if username and event.get('data', {}).get('username') != username:
                        continue
                    if has_response is not None:
                        has_resp = 'response' in event.get('data', {})
                        if has_response != has_resp:
                            continue
                    if is_nearby is not None and event.get('data', {}).get('isNearby') != is_nearby:
                        continue
                    if is_looking is not None and event.get('data', {}).get('isLooking') != is_looking:
                        continue
                    if min_severity is not None and event.get('severity', 0) < min_severity:
                        continue
                        
                    chats.append(event)
                    
                    # If searching by ID, return immediately
                    if chat_id:
                        return [event]
                        
                except json.JSONDecodeError:
                    logger.warning(f"Failed to parse event data: {event_data}")
                    continue
                    
            # Sort chats
            if order_by == "timestamp":
                chats.sort(key=lambda x: x.get('timestamp', 0), reverse=order_desc)
            elif order_by == "severity":
                chats.sort(key=lambda x: x.get('severity', 0), reverse=order_desc)
                
            # Limit results
            chats = chats[:count]
            
            logger.info(f"Retrieved {len(chats)} chat messages")
            return chats
            
        except Exception as e:
            logger.error(f"Failed to get chat messages: {e}")
            return []
            
    async def _cleanupOldRetrievals(self):
        """Remove old retrieval chat messages (older than 12 hours)"""
        try:
            if not self.db.redis:
                return
                
            cutoff_time = int((datetime.utcnow().timestamp() - 12 * 3600) * 1000)
            events_data = await self.db.redis.lrange("events", 0, -1)
            
            for i, event_data in enumerate(events_data):
                try:
                    event = json.loads(event_data)
                    if (event.get('type') == 'chat_message' and 
                        event.get('retrieval') and 
                        event.get('retrieval') < cutoff_time):
                        await self.db.redis.lrem("events", 1, event_data)
                except json.JSONDecodeError:
                    continue
                    
        except Exception as e:
            logger.error(f"Failed to cleanup old retrievals: {e}")

    # Firebase integration placeholders
    async def _storeInFirestore(self, chat_entry: Dict[str, Any]):
        """
        Store chat message in Firestore for long-term persistence

        TODO: Implement Firebase Firestore integration
        - Initialize Firestore client
        - Store chat message with proper indexing
        - Handle authentication and permissions
        - Implement retry logic for failed writes

        Args:
            chat_entry: Complete chat message entry to store
        """
        # TODO: Implement Firestore storage
        # firestore_client = firestore.Client()
        # collection_ref = firestore_client.collection('chat_messages')
        # doc_ref = collection_ref.document(chat_entry['id'])
        # await doc_ref.set(chat_entry)
        pass

    async def _analyzeChatSentiment(self, message: str, response: Optional[str] = None) -> int:
        """
        Analyze chat message sentiment and determine appropriate severity level

        TODO: Implement AI-powered sentiment analysis
        - Use OpenAI/Claude API for sentiment analysis
        - Analyze both user message and bot response
        - Return appropriate severity level (0-10)
        - Consider context and conversation history

        Args:
            message: User's chat message
            response: Bot's response (if any)

        Returns:
            Calculated severity level based on sentiment
        """
        # TODO: Implement AI sentiment analysis
        # sentiment_result = await ai_client.analyze_sentiment(message, response)
        # return sentiment_result.severity_level
        return 1  # Default severity for now

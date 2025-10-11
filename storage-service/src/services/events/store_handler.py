"""
Store Handler - Processes events and performs custom actions based on event type
"""

import json
import logging
from typing import Dict, Any, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

class StoreHandler:
    """Handles custom event processing and storage logic"""

    def __init__(self, db_connections):
        self.db = db_connections

    async def process_event(self, event: Dict[str, Any]) -> None:
        """
        Process an event and perform custom actions based on event type and data

        Args:
            event: The event dictionary containing id, type, data, etc.
        """
        event_type = event.get('type')
        event_data = event.get('data', {})

        logger.debug(f"Processing event: {event_type} with data: {event_data}")

        try:
            # Route to specific handlers based on event type
            if event_type == 'bot_log':
                await self._handle_bot_log_event(event)
            elif event_type == 'system_event':
                await self._handle_system_event(event)
            elif event_type == 'command_executed':
                await self._handle_command_event(event)
            elif event_type == 'chat_message':
                await self._handle_chat_event(event)
            elif event_type == 'discovery_made':
                await self._handle_discovery_event(event)
            elif event_type == 'goal_progress':
                await self._handle_goal_event(event)
            else:
                # For unknown event types, just log them
                logger.info(f"No specific handler for event type: {event_type}")

        except Exception as e:
            logger.error(f"Error processing event {event.get('id', 'unknown')}: {e}")

    async def _handle_bot_log_event(self, event: Dict[str, Any]) -> None:
        """Handle bot_log events - special processing for bot status updates"""
        event_data = event.get('data', {})

        # Check if this is a bot_status event
        if event_data.get('event') == 'bot_status':
            logger.info(f"Processing bot_status update for bot: {event.get('botId')}")

            # TODO: Store in Firestore for long-term bot status tracking
            # This is where you would implement Firestore storage
            await self._store_bot_status_to_firestore(event)

            # TODO: Perform other custom logic for bot status
            # Examples:
            # - Update bot health metrics
            # - Trigger alerts if bot is offline
            # - Update dashboard status

        else:
            logger.debug(f"Bot log event with type: {event_data.get('event')}")

    async def _handle_system_event(self, event: Dict[str, Any]) -> None:
        """Handle system events like player_joined, player_left"""
        event_data = event.get('data', {})
        system_event_type = event_data.get('event')

        if system_event_type == 'player_joined':
            logger.info(f"Player joined: {event_data.get('metadata', {}).get('username')}")
            # TODO: Custom logic for player joins

        elif system_event_type == 'player_left':
            logger.info(f"Player left: {event_data.get('metadata', {}).get('username')}")
            # TODO: Custom logic for player leaves

    async def _handle_command_event(self, event: Dict[str, Any]) -> None:
        """Handle command execution events"""
        event_data = event.get('data', {})
        command = event_data.get('command', '')
        status = event_data.get('status', '')

        # Log important command events
        if status in ['failed', 'invalid']:
            logger.warning(f"Command failed: {command} - {event_data.get('message', '')}")
            # TODO: Store failed commands for analysis

        elif status == 'completed':
            logger.info(f"Command completed: {command}")
            # TODO: Track successful command metrics

    async def _handle_chat_event(self, event: Dict[str, Any]) -> None:
        """Handle chat message events"""
        event_data = event.get('data', {})
        username = event_data.get('username', '')
        message = event_data.get('message', '')

        logger.debug(f"Chat from {username}: {message}")
        # TODO: Implement chat analysis, sentiment tracking, etc.

    async def _handle_discovery_event(self, event: Dict[str, Any]) -> None:
        """Handle discovery events"""
        event_data = event.get('data', {})
        discovery_type = event_data.get('event', '')

        logger.info(f"Discovery made: {discovery_type}")
        # TODO: Store discoveries in specialized storage for world mapping

    async def _handle_goal_event(self, event: Dict[str, Any]) -> None:
        """Handle goal progress events"""
        event_data = event.get('data', {})
        goal = event_data.get('goal', '')
        milestone = event_data.get('milestone', '')

        logger.info(f"Goal progress: {goal} - {milestone}")
        # TODO: Update goal tracking system

    async def _store_bot_status_to_firestore(self, event: Dict[str, Any]) -> None:
        """Store bot status to Firestore for long-term tracking"""
        # TODO: Implement Firestore storage
        # This is a placeholder for the actual Firestore implementation

        bot_id = event.get('botId', 'unknown')
        status_data = event.get('data', {}).get('data', {})
        timestamp = event.get('timestamp')

        logger.info(f"Would store bot status to Firestore: {bot_id} at {timestamp}")
        logger.debug(f"Status data: {json.dumps(status_data, indent=2)}")

        # Example of what the Firestore storage would look like:
        # firestore_doc = {
        #     'botId': bot_id,
        #     'status': status_data,
        #     'timestamp': timestamp,
        #     'event_id': event.get('id')
        # }
        # await self.db.firestore.collection('bot_status').add(firestore_doc)

    def should_ignore_event(self, event_type: str, event_data: Dict[str, Any]) -> bool:
        """
        Determine if an event should be ignored (not processed)

        Args:
            event_type: The type of event
            event_data: The event data

        Returns:
            True if event should be ignored, False otherwise
        """
        # Define events to ignore
        ignored_events = {
            # Example: ignore low-priority debug events
            'debug_trace',
            'heartbeat',
        }

        # Ignore events based on type
        if event_type in ignored_events:
            return True

        # Ignore events based on data content
        if event_type == 'bot_log' and event_data.get('event') == 'debug_info':
            return True

        return False

"""
Decision Manager - Routes intentions to appropriate handlers
"""

import logging
from typing import Dict, Any, Optional
from .chat_manager import chat_manager
from .intention_manager import intention_manager
from .command_manager import command_manager

logger = logging.getLogger(__name__)

class DecisionManager:
    """Central decision router that handles intention-based routing"""
    
    def __init__(self):
        self.chat_manager = chat_manager
        self.intention_manager = intention_manager
        logger.info("DecisionManager initialized")
    
    async def process_message(self, message: str, context: Dict[str, Any], 
                            player_username: str, bot_username: str) -> Dict[str, Any]:
        """
        Main entry point - processes message and routes to appropriate handler
        
        Returns:
            {
                "response": "text response to player",
                "action_type": "chat|command|goal",
                "action_data": {...},
                "success": bool
            }
        """
        try:
            # Step 1: Detect intention
            intention_result = await self.intention_manager.detect_intention(message, context)
            
            logger.info(f"Processing: {intention_result['intention']} -> {intention_result['action']}")
            
            # Step 2: Route based on action
            if intention_result["action"] == "execute_command":
                return await self._handle_command_routing(
                    message, context, player_username, bot_username, intention_result
                )
            
            else:
                # Default: route to chat manager (answer, request_context, escalate_governor)
                return await self._handle_chat_routing(
                    message, context, player_username, bot_username, intention_result
                )
                
        except Exception as e:
            logger.error(f"Error in decision processing: {e}")
            return {
                "response": "Sorry, I'm having trouble processing that request.",
                "action_type": "chat",
                "action_data": {"error": str(e)},
                "success": False
            }
    
    async def _handle_chat_routing(self, message: str, context: Dict, 
                                 player_username: str, bot_username: str, 
                                 intention_result: Dict) -> Dict[str, Any]:
        """Route to chat manager with intention context for better prompting"""
        try:
            response = await self.chat_manager.handle_chat_message(
                message, context, player_username, bot_username, intention_result
            )
            
            return {
                "response": response,
                "action_type": "chat",
                "action_data": {
                    "intention": intention_result["intention"],
                    "confidence": intention_result["confidence"],
                    "reasoning": intention_result["reasoning"]
                },
                "success": True
            }
            
        except Exception as e:
            logger.error(f"Error in chat routing: {e}")
            return {
                "response": "I'm having trouble with my chat processing right now.",
                "action_type": "chat",
                "action_data": {"error": str(e)},
                "success": False
            }
    
    async def _handle_command_routing(self, message: str, context: Dict, 
                                    player_username: str, bot_username: str, 
                                    intention_result: Dict) -> Dict[str, Any]:
        """Route to command manager for command extraction and execution"""
        try:
            
            # Extract and parse command
            command_result = await command_manager.extract_command(
                message, context, intention_result
            )
            
            if command_result["success"]:
                # Execute command via bot API
                execution_result = await command_manager.execute_command(
                    command_result["command"], context
                )
                
                if execution_result["success"]:
                    return {
                        "response": f"Executing: {command_result['command']}",
                        "action_type": "command",
                        "action_data": {
                            "command": command_result["command"],
                            "parsed_params": command_result.get("parsed_params", {}),
                            "confidence": intention_result["confidence"],
                            "execution_status": "initiated"
                        },
                        "success": True
                    }
                else:
                    return {
                        "response": f"I understand you want me to {command_result['command']}, but I'm having trouble executing it right now.",
                        "action_type": "chat",
                        "action_data": {
                            "command_failed": command_result["command"],
                            "error": execution_result.get("error")
                        },
                        "success": False
                    }
            else:
                # Command extraction failed - fallback to chat
                return {
                    "response": "I understand you want me to do something, but I'm not sure exactly what. Could you be more specific?",
                    "action_type": "chat",
                    "action_data": {
                        "command_extraction_failed": True,
                        "original_message": message,
                        "reason": command_result.get("reason", "unclear command")
                    },
                    "success": False
                }
                
        except Exception as e:
            logger.error(f"Error in command routing: {e}")
            return {
                "response": "I think you want me to do something, but I'm having trouble understanding the command.",
                "action_type": "chat",
                "action_data": {"error": str(e)},
                "success": False
            }

# Global instance
decision_manager = DecisionManager()


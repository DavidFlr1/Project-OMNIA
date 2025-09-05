"""
Intention Manager - Handles message intention detection with LLM
"""

import openai
import os
import logging
import json
from typing import Optional, Dict, Tuple
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)

class IntentionManager:
    """Intention Manager - Detects message intention and recommended action"""
    
    def __init__(self):
        self.client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        logger.info("IntentionManager initialized with LLM integration")
    
    async def detect_intention(self, message: str, context: dict) -> Dict[str, str]:
        """
        Detect message intention and recommended action
        
        Returns:
            {
                "intention": "conversation|information|request|command|help|unclear",
                "action": "answer|execute_command|request_context|escalate_governor",
                "confidence": "high|medium|low",
                "reasoning": "brief explanation"
            }
        """
        try:
            prompt = self._build_intention_prompt(message, context)
            response = await self._generate_intention_response(prompt)
            result = self._parse_intention_response(response)
            
            logger.info(f"LOG Intention detected: {result['intention']} -> {result['action']} ({result['confidence']}), {result['reasoning']}")
            logger.debug(f"LOG Intention orginal: {message}")
            return result
            
        except Exception as e:
            logger.error(f"Error detecting intention: {e}")
            return {
                "intention": "conversation",
                "action": "answer",
                "confidence": "low",
                "reasoning": "fallback due to error"
            }
    
    def _build_intention_prompt(self, message: str, context: dict) -> str:
        """Build specialized prompt for intention detection"""
        
        bot_status = ""
        if context:
            if context.get("health"):
                bot_status += f"Health: {context['health']}/20, "
            if context.get("currentActivity"):
                bot_status += f"Activity: {context['currentActivity']}, "
            if context.get("nearbyPlayers"):
                bot_status += f"Players nearby: {len(context.get('nearbyPlayers', []))}"
        
        return f"""You are an intention detection system for a Minecraft bot. Consider the following:
- The message is always directed to you (the bot)
        
Your goal is to Analyze the player's message and determine:

1. INTENTION (what the player wants):
   - conversation: casual chat, greetings, social interaction
   - information: asking about bot status, world info, explanations
   - request: asking for something specific (resource, action, etc.)
   - command: wants bot to do something (move, build, follow, etc.)
   - help: needs assistance or doesn't know what to do
   - unclear: ambiguous or confusing message

2. ACTION (what the bot should do):
   - answer: respond with chat (for conversation, information, help)
   - execute_command: perform an action (for clear commands)
   - request_context: ask for clarification (for unclear messages)
   - escalate_governor: complex requests needing advanced reasoning

3. CONFIDENCE: high, medium, low

Bot Status: {bot_status or "unknown"}
Player Message: "{message}"

Respond ONLY with valid JSON:
{{"intention": "...", "action": "...", "confidence": "...", "reasoning": "..."}}"""

    async def _generate_intention_response(self, prompt: str) -> str:
        """Generate intention analysis using OpenAI"""
        try:
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=100,
                temperature=0.1,  # Low temperature for consistent classification
                response_format={"type": "json_object"}
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            logger.error(f"LLM intention detection error: {e}")
            raise
    
    def _parse_intention_response(self, response: str) -> Dict[str, str]:
        """Parse and validate the LLM response"""
        try:
            result = json.loads(response)
            
            # Validate required fields
            valid_intentions = ["conversation", "information", "command", "help", "unclear"]
            valid_actions = ["answer", "execute_command", "request_context", "escalate_governor"]
            valid_confidence = ["high", "medium", "low"]
            
            intention = result.get("intention", "conversation")
            action = result.get("action", "answer")
            confidence = result.get("confidence", "medium")
            reasoning = result.get("reasoning", "no reasoning provided")
            
            # Validate and fallback if needed
            if intention not in valid_intentions:
                intention = "conversation"
            if action not in valid_actions:
                action = "answer"
            if confidence not in valid_confidence:
                confidence = "medium"
            
            return {
                "intention": intention,
                "action": action,
                "confidence": confidence,
                "reasoning": reasoning
            }
            
        except json.JSONDecodeError:
            logger.error(f"Failed to parse intention response: {response}")
            return {
                "intention": "conversation",
                "action": "answer",
                "confidence": "low",
                "reasoning": "failed to parse response"
            }

# Global instance for easy access
intention_manager = IntentionManager()

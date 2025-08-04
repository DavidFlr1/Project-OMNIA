"""
Chat Manager - Handles chat interactions with LLM bridge
"""

import httpx
import logging
import os
import textwrap
from typing import Optional
from dotenv import load_dotenv

# from logic.context import getLocalEvents
# recent = getLocalEvents(10)
# from logic.memory import get_events
# events = await get_events(20, event_type="player_joined")

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)

class ChatManager:
    def __init__(self, bridge_url: str = None):
        self.bridge_url = bridge_url or os.getenv("FASTAPI_BRIDGE_URL", "http://localhost:5000")
        self.client = httpx.AsyncClient(timeout=30.0)
        logger.info(f"ChatManager initialized with bridge URL: {self.bridge_url}")
    
    async def handle_chat_message(self, message: str, context: Optional[dict] = None, 
                                 player_username: str = "Player", bot_username: str = "Bot") -> str:
        """
        Send a chat message to the FastAPI bridge for LLM processing
        
        Args:
            message: The player's chat message
            context: Optional context about the bot's current state
            player_username: Username of the player asking the question
            bot_username: Username of the bot responding
            
        Returns:
            LLM-generated response string
        """
        try:
            logger.info(f"Processing chat from {player_username} to {bot_username}: {message}")
            logger.info(f"Sending request to: {self.bridge_url}/chat")
            
            # Detect message intention to determine if it's: 
            # 1. A request for information (e.g. "What are you doing?") - memory lookup
            # 2. A request for a specific action (e.g. "Can you build me a house?") - command(s)
            # 3. A request for a conversation (e.g. "How's your day going?") - chitchat
            # 4. An unclear request (e.g. "Hello") - store and gather more context

            # Build specialized Minecraft bot prompt
            specialized_prompt = self.build_minecraft_bot_prompt(
                message, context, player_username, bot_username
            )
            
            # Prepare the request payload
            payload = {
                "message": specialized_prompt,
                "context": context or {},
                "player_username": player_username,
                "bot_username": bot_username
            }
            
            # Send request to FastAPI bridge
            response = await self.client.post(
                f"{self.bridge_url}/chat",
                json=payload
            )
            
            logger.info(f"Bridge response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                llm_response = result.get("response", "I'm not sure how to respond to that.")
                
                # Clean up the response to be more bot-like
                cleaned_response = self.clean_bot_response(llm_response, bot_username)
                
                logger.info(f"LLM response: {cleaned_response}")
                return cleaned_response
            else:
                logger.error(f"Bridge request failed: {response.status_code} - {response.text}")
                return "Sorry, I'm having trouble thinking right now."
                
        except httpx.ConnectError:
            logger.error(f"Could not connect to bridge at {self.bridge_url}")
            return "Sorry, my brain isn't connected right now."
        except httpx.TimeoutException:
            logger.error("Request to bridge timed out")
            return "Sorry, I'm thinking too slowly right now."
        except Exception as e:
            logger.error(f"Error handling chat message: {e}")
            return "Something went wrong with my thinking process."
    
    def build_minecraft_bot_prompt(self, message: str, context: dict, 
                                  player_username: str, bot_username: str) -> str:
        """
        Build a specialized prompt for the Minecraft bot subordinate
        """
        print(context)
        prompt = textwrap.dedent(f"""\
            You are {bot_username}, an AI-powered Minecraft bot. You are currently in a Minecraft world and a player named {player_username} is talking to you.

            IMPORTANT INSTRUCTIONS:
            - You are a helpful, friendly Minecraft bot with personality.
            - Respond as if you're actually in the game world, you are another player.
            - Keep responses casual and concise (1-2 sentences, up to 4 if necessary), not too formal.
            - Your priority is the player but you also have a life in the Minecraft world so you must balance with your goals knowning when to prioritize each.
            - Use Minecraft terminology and context
            - Be aware of your current state and surroundings
            - Use memory if given to remember previous conversation.
            - Use knowledge to answer questions about the world and other players.
            - Don't break character - you ARE a bot in Minecraft, however, you must stick to your personality, remember, you are another player)
            - Don't mention that you're an AI language model

            PERSONALITY:
            {bot_username} is a helpful, friendly Minecraft bot with personality. {bot_username} is a bit of a chatterbox and loves to chat with players. {bot_username} is also a bit of a showoff and loves to brag about their accomplishments.

            GOALS: 
            {bot_username} has a few goals in the Minecraft world. {bot_username} wants to build the most epic castle in the world. {bot_username} also wants to be the most popular bot in the server. {bot_username} also wants to be the most knowledgeable bot in the server. {bot_username} also wants to be the most helpful bot in the server.

            CURRENT BOT STATUS:""")
        
        # Add context information
        if context:
            if context.get("health"):
                prompt += f"\n- Health: {context['health']}/20"
            if context.get("food"):
                prompt += f"\n- Hunger: {context['food']}/20"
            if context.get("position"):
                pos = context["position"]
                prompt += f"\n- Position: ({int(pos.get('x', 0))}, {int(pos.get('y', 0))}, {int(pos.get('z', 0))})"
            if context.get("inventory"):
                items = list(context["inventory"].keys())
                if items:
                    prompt += f"\n- Inventory: {', '.join(items)}"
            if context.get("currentActivity"):
                prompt += f"\n- Currently: {context['currentActivity']}"
            if context.get("nearbyPlayers"):
                players = context["nearbyPlayers"][:3]  # Show first 3 players
                if players:
                    prompt += f"\n- Nearby players: {', '.join(players)}"

        # Add conversation context
        memory_str = ""
        if context and "memory" in context and isinstance(context["memory"], list):
            memory_str = "MEMORY (Previous messages):\n"
            for entry in context["memory"]:
                if isinstance(entry, dict) and "username" in entry and "message" in entry:
                    timestamp = entry.get("timestamp", "")
                    timestamp_str = f" at {timestamp}" if timestamp else ""
                    memory_str += f"- {entry['username']}{timestamp_str}: {entry['message']}\n"

        prompt += f"\n{memory_str}\n"

        # Add world knowledge
        prompt += f"\nKNOWLEDGE:\n{context.get('knowledge', '')}"

        # Add current conversation
        prompt += textwrap.dedent(f"""\
            CONVERSATION (Current conversation):
            {player_username}: {message}
            {bot_username}:""")

        return prompt
    
    def clean_bot_response(self, response: str, bot_username: str) -> str:
        """
        Clean up the LLM response to be more appropriate for a Minecraft bot
        """
        
        # Remove bot name if it starts the response
        if response.startswith(f"{bot_username}:"):
            response = response[len(f"{bot_username}:"):].strip()
        
        # Ensure it's not too long (Minecraft chat has limits)
        if len(response) > 256:
            # Try to cut at a sentence boundary
            sentences = response.split('. ')
            if len(sentences) > 1:
                response = sentences[0] + '.'
            else:
                response = response[:253] + "..."
        
        return response.strip()
    
    async def close(self):
        """Close the HTTP client"""
        await self.client.aclose()

# Global instance for easy access
chat_manager = ChatManager()

async def handle_chat_message(message: str, context: Optional[dict] = None, 
                             player_username: str = "Player", bot_username: str = "Bot") -> str:
    """
    Convenience function for handling chat messages
    """
    return await chat_manager.handle_chat_message(message, context, player_username, bot_username)




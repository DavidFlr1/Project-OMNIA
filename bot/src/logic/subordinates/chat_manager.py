"""
Chat Manager - Handles chat interactions with direct LLM integration
"""

import openai
import os
import logging
import textwrap
from typing import Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)

class ChatManager:
    def __init__(self):
        self.client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        logger.info("ChatManager initialized with direct LLM integration")
    
    async def handle_chat_message(self, message: str, context: Optional[dict] = None, 
                                 player_username: str = "Player", bot_username: str = "Bot", 
                                 intention_result: Optional[dict] = None) -> str:
        """
        Process chat message with intention context for better prompting
        """
        try:
            logger.info(f"Processing chat from {player_username} to {bot_username}: {message}")
            
            # Use intention result for better prompt engineering
            if not intention_result:
                intention_result = {"intention": "conversation", "confidence": "medium", "reasoning": "no intention data"}
            
            # Build specialized prompt with intention context
            prompt = self.build_minecraft_bot_prompt(
                message, context, player_username, bot_username, intention_result
            )
            
            response = await self.generate_llm_response(prompt)
            cleaned_response = self.clean_bot_response(response, bot_username)
            
            logger.info(f"Generated response: {cleaned_response}")
            return cleaned_response
                
        except Exception as e:
            logger.error(f"Error handling chat message: {e}")
            return "Something went wrong with my thinking process."
    
    async def generate_llm_response(self, prompt: str) -> str:
        """
        Generate response using OpenAI API directly
        """
        try:
            api_key = os.getenv("OPENAI_API_KEY")
            if not api_key:
                logger.error("OpenAI API key not configured")
                return "I need an API key to think properly."
            
            logger.debug(f"Sending prompt to LLM: {prompt[:100]}...")
            
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=150,
                temperature=0.7
            )
            
            return response.choices[0].message.content.strip()
            
        except openai.AuthenticationError:
            logger.error("OpenAI authentication failed")
            return "I'm having trouble with my API credentials."
        except openai.RateLimitError:
            logger.error("OpenAI rate limit exceeded")
            return "I'm thinking too much right now. Please try again in a moment."
        except Exception as e:
            logger.error(f"LLM generation error: {e}")
            return "I'm having trouble thinking right now."
    
    def build_minecraft_bot_prompt(self, message: str, context: dict, 
                                  player_username: str, bot_username: str, 
                                  intention_result: dict) -> str:
        """
        Build a specialized prompt for the Minecraft bot with intention context
        """
        intention = intention_result.get("intention", "conversation")
        confidence = intention_result.get("confidence", "medium")
        reasoning = intention_result.get("reasoning", "casual interaction")
        
        # Customize response style based on intention
        response_style = ""
        if intention == "information":
            response_style = "Be informative and helpful. Provide clear, factual responses."
        elif intention == "help":
            response_style = "Be supportive and guide the player. Offer specific help."
        elif intention == "unclear":
            response_style = "Ask clarifying questions to better understand what they need."
        else:  # conversation
            response_style = "Be friendly and conversational. Keep it casual and engaging."
        
        prompt = textwrap.dedent(f"""\
            You are {bot_username}, an AI-powered Minecraft bot. A player named {player_username} is talking to you.

            MESSAGE ANALYSIS:
            - Intention: {intention}
            - Confidence: {confidence}
            - Context: {reasoning}

            RESPONSE STYLE: {response_style}

            GUIDELINES:
            - Keep responses casual and concise (1-2 sentences)
            - Use Minecraft terminology and context
            - Be helpful and friendly
            - Don't break character - you ARE a bot in Minecraft

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
                    prompt += f"\n- Inventory: {', '.join(items[:5])}"
            if context.get("currentActivity"):
                prompt += f"\n- Currently: {context['currentActivity']}"
            if context.get("nearbyPlayers"):
                players = context["nearbyPlayers"][:3]
                if players:
                    prompt += f"\n- Nearby players: {', '.join(players)}"

        prompt += textwrap.dedent(f"""\

            CONVERSATION:
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
            sentences = response.split('. ')
            if len(sentences) > 1:
                response = sentences[0] + '.'
            else:
                response = response[:253] + "..."
        
        return response.strip()

# Global instance for easy access
chat_manager = ChatManager()










"""
Command Manager - Extracts and executes bot commands using LLM
"""

import openai
import os
import json
import logging
import httpx
from typing import Dict, Any, Optional
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

class CommandManager:
    """Command Manager - Extracts commands from messages and executes them via bot API"""
    
    def __init__(self):
        self.client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.bot_api_port = os.getenv("API_PORT", "3001")
        self.commands_data = self._load_commands()
        logger.info("CommandManager initialized with LLM integration")
    
    def _load_commands(self) -> Dict:
        """Load available commands from commands.json"""
        try:
            import json
            # Load from the shared commands.json file
            with open("../shared/commands.json", "r") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Failed to load commands.json: {e}")
            return {"commands": {}}
    
    async def extract_command(self, message: str, context: Dict, intention_result: Dict) -> Dict[str, Any]:
        """
        Extract and parse command from message using LLM
        
        Returns:
            {
                "success": bool,
                "command": "parsed command string",
                "parsed_params": {...},
                "confidence": "high|medium|low",
                "reason": "explanation"
            }
        """
        try:
            prompt = self._build_command_extraction_prompt(message, context, intention_result)
            response = await self._generate_command_response(prompt)
            result = self._parse_command_response(response)
            logger.info(f"Command extraction response: {response}...")
            logger.info(f"Command extraction: {result.get('command', 'none')} (success: {result['success']})")
            return result
            
        except Exception as e:
            logger.error(f"Error extracting command: {e}")
            return {
                "success": False,
                "command": "",
                "parsed_params": {},
                "confidence": "low",
                "reason": f"extraction error: {str(e)}"
            }
    
    def _build_command_extraction_prompt(self, message: str, context: Dict, intention_result: Dict) -> str:
        """Build prompt for command extraction"""
        
        # Get available commands for context
        available_commands = []
        for category, commands in self.commands_data.get("commands", {}).items():
            for cmd_name, cmd_info in commands.items():
                if cmd_info.get("status", False):  # Only enabled commands
                    available_commands.append({
                        "name": cmd_name,
                        "syntax": cmd_info["syntax"],
                        "description": cmd_info["description"],
                        "example": cmd_info["example"],
                        "keywords": cmd_info.get("intent_keywords", [])
                    })
        
        commands_text = "\n".join([
            f"- {cmd['name']}: {cmd['syntax']} - {cmd['description']} / example: {cmd['example']} - (keywords: {', '.join(cmd['keywords'])})"
            for cmd in available_commands[:30]
        ])

        bot_status = ""
        if context:
            if context.get("position"):
                pos = context["position"]
                bot_status += f"Bot position: ({int(pos.get('x', 0))}, {int(pos.get('y', 0))}, {int(pos.get('z', 0))})\n"
            if context.get("nearbyPlayers"):
                players = context["nearbyPlayers"][:3]
                if players:
                    bot_status += f"Nearby players: {', '.join(players)}\n"
        
        return f"""You are a command extraction system for a Minecraft bot. Your job is to:

1. Analyze the player's message and determine if it contains a valid bot command
2. If it does, extract the command and parse the parameters correctly
3. Match it to one of the available commands below

AVAILABLE COMMANDS:
{commands_text}

CONTEXT:
{bot_status}
Player message: "{message}"
Detected intention: {intention_result.get('intention', 'unknown')}
Confidence: {intention_result.get('confidence', 'unknown')}

INSTRUCTIONS:
- Only extract commands that clearly match the available command list
- Parse parameters correctly according to the command syntax
- Use proper item and block names (e.g., diamond_ore, oak_planks, iron_ingot)
- Be flexible with natural language - map similar meanings to commands
- Examples of natural language mappings:
  * "stop following me" → "stay"
  * "come here" → "follow <player>"
  * "go to 100 64 200" → "goto 100 64 200"
  * "mine some diamonds" → "mine diamond_ore 10"
- If the message is ambiguous or doesn't match any command, set success to false
- Be confident about obvious command intentions

Respond ONLY with valid JSON:
{{
  "success": true/false,
  "command": "exact command string to execute (e.g., 'goto 100 64 200')",
  "parsed_params": {{"param1": "value1", "param2": "value2"}},
  "confidence": "high|medium|low",
  "reason": "brief explanation of decision"
}}

SUCCESSFUL EXAMPLES:
"get me some wood" → "mine oak_log 10"
"stop following me" → "stay"
"build a 3 by 3 house" → "place 171 67 135 171 68 135 171 67 136 171 68 136 171 67 137 171 68 137 172 67 135 172 68 135 172 67 137 172 68 137 173 67 135 173 68 135 173 67 136 173 68 136 173 67 137 173 68 137 stone non-invasive"

"""

    async def _generate_command_response(self, prompt: str) -> str:
        """Generate command extraction using OpenAI"""
        try:
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=200,
                temperature=0.1,  # Low temperature for consistent extraction
                response_format={"type": "json_object"}
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            logger.error(f"LLM command extraction error: {e}")
            raise
    
    def _parse_command_response(self, response: str) -> Dict[str, Any]:
        """Parse and validate the LLM command response"""
        try:
            result = json.loads(response)
            
            return {
                "success": result.get("success", False),
                "command": result.get("command", ""),
                "parsed_params": result.get("parsed_params", {}),
                "confidence": result.get("confidence", "low"),
                "reason": result.get("reason", "no reason provided")
            }
            
        except json.JSONDecodeError:
            logger.error(f"Failed to parse command response: {response}")
            return {
                "success": False,
                "command": "",
                "parsed_params": {},
                "confidence": "low",
                "reason": "failed to parse response"
            }
    
    async def execute_command(self, command: str, context: Dict) -> Dict[str, Any]:
        """
        Execute command via bot API
        
        Returns:
            {
                "success": bool,
                "response": "API response", 
                "error": "error message if failed"
            }
        """
        try:
            bot_api_url = f"http://localhost:{self.bot_api_port}/bot/command"
            payload = {"command": command}
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    bot_api_url,
                    json=payload,
                    headers={"Content-Type": "application/json"}
                )
                
                if response.status_code == 200:
                    result = response.json()
                    logger.info(f"Command executed successfully: {command}")
                    return {
                        "success": True,
                        "response": result,
                        "error": None
                    }
                else:
                    error_text = response.text
                    logger.error(f"Command execution failed: {response.status_code} - {error_text}")
                    return {
                        "success": False,
                        "response": None,
                        "error": f"API error: {response.status_code}"
                    }
                    
        except Exception as e:
            logger.error(f"Error executing command via API: {e}")
            return {
                "success": False,
                "response": None,
                "error": str(e)
            }

# Global instance
command_manager = CommandManager()


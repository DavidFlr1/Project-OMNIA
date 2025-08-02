"""
LLM Client - Handles communication with language models
"""

import openai
import os
import logging
from typing import Optional
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

logger = logging.getLogger(__name__)

# Configure OpenAI client
client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

async def ask_llm(prompt: str, model: str = "gpt-3.5-turbo", max_tokens: int = 150) -> str:
    """
    Send a prompt to the LLM and return the response
    
    Args:
        prompt: The prompt to send to the LLM
        model: The model to use (default: gpt-3.5-turbo)
        max_tokens: Maximum tokens in the response
        
    Returns:
        The LLM's response as a string
    """
    try:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            logger.error("OpenAI API key not configured")
            return "I need an API key to think properly. Please configure OPENAI_API_KEY."
        
        logger.info(f"Sending prompt to {model}: {prompt[:100]}...")
        
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "user", "content": prompt}
            ],
            max_tokens=max_tokens,
            temperature=0.7
        )
        
        llm_response = response.choices[0].message.content.strip()
        logger.info(f"LLM response received: {llm_response}")
        
        return llm_response
        
    except openai.AuthenticationError:
        logger.error("OpenAI authentication failed")
        return "I'm having trouble with my API credentials."
    except openai.RateLimitError:
        logger.error("OpenAI rate limit exceeded")
        return "I'm thinking too much right now. Please try again in a moment."
    except openai.APIError as e:
        logger.error(f"OpenAI API error: {e}")
        return "I'm having trouble connecting to my brain right now."
    except Exception as e:
        logger.error(f"Unexpected error in LLM client: {e}")
        return "Something unexpected happened while I was thinking."

def set_api_key(api_key: str):
    """Set the OpenAI API key"""
    global client
    client = openai.OpenAI(api_key=api_key)
    os.environ["OPENAI_API_KEY"] = api_key

import json
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from uuid import uuid4

logger = logging.getLogger(__name__)

class AgentService:
  def __init__(self, db_connections):
    self.db = db_connections
    self.MAX_AGENTS = 1000  # Maximum number of agents to store
        
  async def createAgent(self, agent_data: Dict[str, Any]) -> str:
    """
    Create a new agent and store it in Redis
    
    Args:
      agent_data: Agent data payload
        
    Returns:
      agent_id: Unique identifier for the created agent
    """

    agent_id = str(uuid4())
    timestamp = int(datetime.utcnow().timestamp() * 1000) 

    agent = {
      'id': agent_id,
      'type': 'agent',
      'data': agent_data,
      'timestamp': timestamp
    }
    
    try:
      if not self.db.redis:
        logger.error("Redis not available")
        raise Exception("Redis connection not available")
          
      # Check if agent already exists
      existing_agents = await self.db.redis.lrange("agents", 0, -1)
      for existing_agent_data in existing_agents:
        existing_agent = json.loads(existing_agent_data)
        if existing_agent['data']['username'] == agent_data['username']:
          logger.info(f"Agent already exists: {agent_data['username']} ({existing_agent['id']})")
          return existing_agent['id']
        
      # Store in Redis list (matches bot memory format)
      await self.db.redis.lpush("agents", json.dumps(agent))
      
      # TODO: Use AI to determine event severity automatically
      # TODO: Store in Firestore for long-term storage
      
      logger.info(f"Agent created: {agent_data['username']} ({agent_id})")
      return agent_id
    
    except Exception as e:
      logger.error(f"Failed to create agent: {e}")
      raise

  
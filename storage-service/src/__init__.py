"""
Storage Service - Central storage management for the bot ecosystem
"""

import os
import logging
from typing import Optional
from dotenv import load_dotenv

from redis import Redis

# Load environment variables from .env file
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DatabaseConnections:
    """Centralized database connection management"""
    
    def __init__(self):
        self.redis: Optional[Redis] = None
        self.firestore = None  # TODO: Add Firestore client
        self.cloud_storage = None  # TODO: Add Cloud Storage client
        
    async def initialize_connections(self):
        """Initialize all database connections"""
        await self._init_redis()
        # await self._init_firestore()
        # await self._init_cloud_storage()
        
    async def _init_redis(self):
        """Initialize Redis connection for hot storage"""
        try:
            redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379')
            redis_password = os.getenv('REDIS_PASSWORD')
            
            self.redis = Redis.from_url(
                redis_url,
                password=redis_password,
                decode_responses=True
            )
            
            # Test connection
            await self.redis.ping()
            logger.info("✅ Redis connection established")
            
        except Exception as e:
            logger.error(f"❌ Redis connection failed: {e}")
            self.redis = None
            
    async def close_connections(self):
        """Close all database connections"""
        if self.redis:
            await self.redis.close()
            logger.info("Redis connection closed")

# Global database connections instance
db_connections = DatabaseConnections()
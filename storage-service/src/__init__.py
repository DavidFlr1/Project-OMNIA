"""
Storage Service - Central storage management for the bot ecosystem
"""

import os
import logging
import asyncio
from typing import Optional
from dotenv import load_dotenv

import redis.asyncio as aioredis

# Load environment variables from .env file
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DatabaseConnections:
    """Centralized database connection management"""
    
    def __init__(self):
        self.redis: Optional[aioredis.Redis] = None
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
            
            logger.info(f"🔄 Attempting Redis connection to: {redis_url}")
            
            self.redis = aioredis.from_url(
                redis_url,
                password=redis_password,
                decode_responses=True
            )
            
            # Test connection
            await self.redis.ping()
            logger.info(f"✅ Redis connection established: {redis_url}")
            
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




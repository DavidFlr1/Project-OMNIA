"""
Memory Service - Main FastAPI application
"""

from fastapi import FastAPI
from contextlib import asynccontextmanager
from src import db_connections
from src.api.events import router as events_router
from src.api.chat import router as chat_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await db_connections.initialize_connections()
    yield
    # Shutdown
    await db_connections.close_connections()

app = FastAPI(
    title="Storage Service",
    description="Centralized storage management for bot ecosystem",
    version="1.0.0",
    lifespan=lifespan
)

# Include API routers
app.include_router(events_router, prefix="/api/v1/events", tags=["events"])
app.include_router(chat_router, prefix="/api/v1/chat", tags=["chat"])

@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": "storage-service",
        "redis_connected": db_connections.redis is not None
    }


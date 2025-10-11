"""
Chat API - REST endpoints for chat message management
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from src import db_connections
from src.services.chat import ChatService
from src.schemas.chat import (
    CreateChatRequest, ChatResponse, GetChatsResponse,
    ChatModel, ErrorResponse
)

router = APIRouter()

# Initialize service
chat_service = ChatService(db_connections)

@router.post("/", response_model=ChatResponse, responses={500: {"model": ErrorResponse}})
async def create_chat(request: CreateChatRequest):
    """Create a new chat message"""
    try:
        chat_id = await chat_service.createChat(
            username=request.username,
            message=request.message,
            response=request.response,
            distance=request.distance,
            isNearby=request.isNearby,
            isLooking=request.isLooking,
            botId=request.botId,
            severity=request.severity
        )
        return ChatResponse(chat_id=chat_id, status="created")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/", response_model=GetChatsResponse, responses={500: {"model": ErrorResponse}})
async def get_chats(
    count: int = Query(10, ge=1, le=1000),
    chat_id: Optional[str] = None,
    botId: Optional[str] = None,
    username: Optional[str] = None,
    has_response: Optional[bool] = None,
    is_nearby: Optional[bool] = None,
    is_looking: Optional[bool] = None,
    min_severity: Optional[int] = None,
    order_by: str = Query("timestamp", regex="^(timestamp|severity)$"),
    order_desc: bool = True
):
    """Get chat messages with filtering and ordering"""
    try:
        chats = await chat_service.getChats(
            count=count,
            chat_id=chat_id,
            botId=botId,
            username=username,
            has_response=has_response,
            is_nearby=is_nearby,
            is_looking=is_looking,
            min_severity=min_severity,
            order_by=order_by,
            order_desc=order_desc
        )
        return {"chats": chats, "count": len(chats)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
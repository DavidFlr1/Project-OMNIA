"""
Memory Routes - Placeholder for memory-related endpoints
"""

from fastapi import APIRouter

router = APIRouter()

@router.get("/memory/status")
async def memory_status():
    """Placeholder for memory status endpoint"""
    return {"status": "memory system not implemented yet"}

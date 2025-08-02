"""
Status Routes - System status and health endpoints
"""

from fastapi import APIRouter

router = APIRouter()

@router.get("/status")
async def get_status():
    """Get system status"""
    return {
        "status": "running",
        "services": {
            "llm_client": "active",
            "memory": "placeholder",
            "rag": "placeholder"
        }
    }

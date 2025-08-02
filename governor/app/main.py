"""
FastAPI Bridge - Main Application
Handles LLM integration and RAG capabilities
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import decision, memory, status

app = FastAPI(title="FastAPI Bridge", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(decision.router, prefix="/api/v1")
app.include_router(memory.router, prefix="/api/v1")
app.include_router(status.router, prefix="/api/v1")

@app.get("/")
async def root():
    return {"message": "FastAPI Bridge is running"}

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "fastapi-bridge"}

# Simplified chat endpoint at root level for easy access
app.include_router(decision.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)

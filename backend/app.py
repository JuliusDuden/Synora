"""
Synora Backend - FastAPI Application
Think Beyond.
Main entry point for the API server
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from routes import notes, search, graph, tags, auth, projects, tasks, ideas, habits
from routes import snippets
from services.index_service import IndexService

# Configuration
VAULT_PATH = Path(os.getenv("VAULT_PATH", "./vault"))
DATABASE_PATH = Path(os.getenv("DATABASE_PATH", "./data/notes.db"))
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")

# Ensure directories exist
VAULT_PATH.mkdir(parents=True, exist_ok=True)
DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize services on startup"""
    # Initialize index service
    index_service = IndexService(VAULT_PATH, DATABASE_PATH)
    await index_service.initialize()
    
    # Store in app state
    app.state.index_service = index_service
    app.state.vault_path = VAULT_PATH
    
    print(f"✅ Synora Backend started")
    print(f"📁 Vault Path: {VAULT_PATH.absolute()}")
    print(f"🗄️  Database: {DATABASE_PATH.absolute()}")
    print(f"🌐 CORS Origins: {CORS_ORIGINS}")
    
    yield
    
    # Cleanup
    await index_service.close()


# Create FastAPI app
app = FastAPI(
    title="Synora API",
    description="Think Beyond. - Web-based knowledge management system",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)  # No prefix, already defined in router
app.include_router(notes.router, prefix="/api/notes", tags=["notes"])
app.include_router(search.router, prefix="/api/search", tags=["search"])
app.include_router(graph.router, prefix="/api/graph", tags=["graph"])
app.include_router(tags.router, prefix="/api/tags", tags=["tags"])
app.include_router(projects.router, prefix="/api/projects", tags=["projects"])
app.include_router(tasks.router, prefix="/api/tasks", tags=["tasks"])
app.include_router(ideas.router, prefix="/api/ideas", tags=["ideas"])
app.include_router(habits.router, prefix="/api/habits", tags=["habits"])
app.include_router(snippets.router, prefix="/api/snippets", tags=["snippets"])


@app.get("/")
async def root():
    """API health check"""
    return {
        "status": "running",
        "name": "Synora API",
        "version": "1.0.0",
        "motto": "Think Beyond."
    }


@app.get("/api/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy"}


if __name__ == "__main__":
    uvicorn.run(
        "app:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", 8000)),
        reload=os.getenv("DEBUG", "True").lower() == "true"
    )

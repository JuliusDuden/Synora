"""
Search API routes - User-specific
"""
from fastapi import APIRouter, Query, Request, Depends
from typing import List
import sqlite3
import os

from models.note import SearchResult
from models.user import User
from routes.auth import get_current_user

router = APIRouter()

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "notes.db")

def get_db():
    """Get database connection"""
    conn = sqlite3.connect(DB_PATH, timeout=30, check_same_thread=False)
    try:
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA busy_timeout=30000;")
    except Exception:
        pass
    conn.row_factory = sqlite3.Row
    return conn


@router.get("", response_model=List[SearchResult])
async def search_notes(
    q: str = Query(..., description="Search query"),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user)
):
    """Full-text search across user's notes"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Simple LIKE search for now (can be upgraded to FTS later)
    search_pattern = f"%{q}%"
    cursor.execute("""
        SELECT name, path, title, content, created_at, modified_at
        FROM notes 
        WHERE user_id = ? 
        AND (name LIKE ? OR title LIKE ? OR content LIKE ?)
        ORDER BY modified_at DESC
        LIMIT ?
    """, (current_user.id, search_pattern, search_pattern, search_pattern, limit))
    
    rows = cursor.fetchall()
    conn.close()
    
    results = []
    for row in rows:
        # Extract snippet around match
        content = row["content"]
        idx = content.lower().find(q.lower())
        if idx >= 0:
            start = max(0, idx - 50)
            end = min(len(content), idx + len(q) + 50)
            snippet = "..." + content[start:end] + "..."
        else:
            snippet = content[:100] + "..." if len(content) > 100 else content
        
        results.append(SearchResult(
            name=row["name"],
            path=row["path"],
            title=row["title"] or row["name"],
            snippet=snippet,
            score=1.0
        ))
    
    return results


@router.post("/rebuild", response_model=dict)
async def rebuild_index(current_user: User = Depends(get_current_user)):
    """Rebuild search index for user (placeholder)"""
    # TODO: Implement FTS rebuild
    return {"success": True, "message": "Index rebuilt successfully"}

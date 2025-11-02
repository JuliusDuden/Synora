"""
Graph API routes - User-specific
"""
from fastapi import APIRouter, Request, Depends
import sqlite3
import os
import json

from models.graph import GraphData
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


@router.get("", response_model=GraphData)
async def get_graph(current_user: User = Depends(get_current_user)):
    """Get graph data for current user's notes"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Get all notes for this user
    cursor.execute("""
        SELECT id, name, title, tags 
        FROM notes 
        WHERE user_id = ?
    """, (current_user.id,))
    
    rows = cursor.fetchall()
    conn.close()
    
    # Build nodes
    nodes = []
    for row in rows:
        tags = json.loads(row["tags"]) if row["tags"] else []
        nodes.append({
            "id": row["name"],
            "label": row["title"] or row["name"],
            "tags": tags
        })
    
    # TODO: Build edges from note links
    edges = []
    
    return GraphData(nodes=nodes, edges=edges)

"""
Tags API routes - User-specific
"""
from fastapi import APIRouter, Request, Depends
from typing import Dict, List
import sqlite3
import os
import json
from collections import Counter

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


@router.get("", response_model=Dict[str, int])
async def get_all_tags(current_user: User = Depends(get_current_user)):
    """Get all tags with their counts for current user"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT tags FROM notes 
        WHERE user_id = ? AND tags IS NOT NULL
    """, (current_user.id,))
    
    rows = cursor.fetchall()
    conn.close()
    
    # Count tags
    tag_counter = Counter()
    for row in rows:
        if row["tags"]:
            tags = json.loads(row["tags"])
            tag_counter.update(tags)
    
    return dict(tag_counter)


@router.get("/{tag}/notes", response_model=List[str])
async def get_notes_by_tag(tag: str, current_user: User = Depends(get_current_user)):
    """Get all notes with a specific tag for current user"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT name, tags FROM notes 
        WHERE user_id = ? AND tags IS NOT NULL
    """, (current_user.id,))
    
    rows = cursor.fetchall()
    conn.close()
    
    # Filter notes with this tag
    notes = []
    for row in rows:
        if row["tags"]:
            tags = json.loads(row["tags"])
            if tag in tags:
                notes.append(row["name"])
    
    return notes

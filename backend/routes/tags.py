"""
Tags API routes - User-specific
"""
from fastapi import APIRouter, Depends
from typing import Dict, List, Optional
import sqlite3
import os
import json
from collections import Counter

from models.user import User
from routes.auth import get_current_user

router = APIRouter()

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "notes.db")


def _is_folder_placeholder(name: str) -> bool:
    cleaned = (name or "").strip()
    return cleaned == ".gitkeep" or cleaned.endswith("/.gitkeep")


def _safe_tags(raw: Optional[str]) -> List[str]:
    if not raw:
        return []
    try:
        data = json.loads(raw)
        if isinstance(data, list):
            return [str(tag).strip() for tag in data if str(tag).strip()]
    except Exception:
        pass
    return []

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

    # Fast path using SQLite JSON1 extension.
    try:
        cursor.execute(
            """
            SELECT lower(trim(j.value)) AS tag, COUNT(*) AS cnt
            FROM notes n
            JOIN json_each(n.tags) j
            WHERE n.user_id = ?
              AND n.tags IS NOT NULL
              AND n.name NOT LIKE '%.gitkeep'
              AND trim(j.value) <> ''
            GROUP BY lower(trim(j.value))
            ORDER BY cnt DESC
            """,
            (current_user.id,),
        )
        rows = cursor.fetchall()
        conn.close()
        return {row["tag"]: int(row["cnt"]) for row in rows}
    except sqlite3.Error:
        # Fallback for environments where JSON1 is unavailable.
        cursor.execute(
            """
            SELECT name, tags FROM notes
            WHERE user_id = ? AND tags IS NOT NULL
            """,
            (current_user.id,),
        )
        rows = cursor.fetchall()
        conn.close()

        tag_counter = Counter()
        for row in rows:
            if _is_folder_placeholder(row["name"]):
                continue
            tags = [tag.casefold() for tag in _safe_tags(row["tags"])]
            tag_counter.update(tags)

        return dict(tag_counter)


@router.get("/{tag}/notes", response_model=List[str])
async def get_notes_by_tag(tag: str, current_user: User = Depends(get_current_user)):
    """Get all notes with a specific tag for current user"""
    wanted = tag.strip().casefold()
    if not wanted:
        return []

    conn = get_db()
    cursor = conn.cursor()

    # Fast path using SQLite JSON1 extension.
    try:
        cursor.execute(
            """
            SELECT DISTINCT n.name
            FROM notes n
            JOIN json_each(n.tags) j
            WHERE n.user_id = ?
              AND n.tags IS NOT NULL
              AND n.name NOT LIKE '%.gitkeep'
              AND lower(trim(j.value)) = ?
            ORDER BY n.modified_at DESC
            """,
            (current_user.id, wanted),
        )
        rows = cursor.fetchall()
        conn.close()
        return [row["name"] for row in rows]
    except sqlite3.Error:
        cursor.execute(
            """
            SELECT name, tags
            FROM notes
            WHERE user_id = ? AND tags IS NOT NULL
            ORDER BY modified_at DESC
            """,
            (current_user.id,),
        )
        rows = cursor.fetchall()
        conn.close()

        notes: List[str] = []
        for row in rows:
            if _is_folder_placeholder(row["name"]):
                continue
            tags = [t.casefold() for t in _safe_tags(row["tags"])]
            if wanted in tags:
                notes.append(row["name"])

        return notes

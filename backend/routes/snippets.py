"""
Snippets API routes - per-user snippet storage
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime
import sqlite3
import os
import uuid
import json

from models.user import User
from routes.auth import get_current_user

router = APIRouter()

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "notes.db")


def get_db():
    # Use a longer timeout and allow connections from other threads.
    # Enable WAL journal mode for better concurrency with the async indexer.
    conn = sqlite3.connect(DB_PATH, timeout=30, check_same_thread=False)
    try:
        conn.execute("PRAGMA journal_mode=WAL;")
    except Exception:
        # Ignore if pragma fails for some reason
        pass
    conn.row_factory = sqlite3.Row
    return conn


class SnippetCreate(BaseModel):
    id: Optional[str]
    title: Optional[str] = None
    content: Optional[str] = ""
    color: Optional[str] = None
    pinned: Optional[bool] = False
    items: Optional[Any] = None
    code: Optional[Any] = None
    images: Optional[Any] = None
    links: Optional[Any] = None
    voiceNote: Optional[Any] = None
    connections: Optional[Any] = None
    pinnedToDashboard: Optional[bool] = False
    reminder: Optional[Any] = None


class SnippetUpdate(BaseModel):
    title: Optional[str]
    content: Optional[str]
    color: Optional[str]
    pinned: Optional[bool]
    items: Optional[Any]
    code: Optional[Any]
    images: Optional[Any]
    links: Optional[Any]
    voiceNote: Optional[Any]
    connections: Optional[Any]
    pinnedToDashboard: Optional[bool]
    reminder: Optional[Any]


@router.get("")
async def list_snippets(current_user: User = Depends(get_current_user)):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        SELECT * FROM snippets
        WHERE user_id = ?
        ORDER BY modified_at DESC
    """, (current_user.id,))
    rows = cur.fetchall()
    conn.close()

    results = []
    for r in rows:
        row = dict(r)
        # parse JSON fields
        for key in ['items', 'code', 'images', 'links', 'voiceNote', 'connections', 'reminder']:
            if row.get(key) is not None:
                try:
                    row[key] = json.loads(row[key])
                except Exception:
                    row[key] = row[key]
        # booleans from int
        row['pinned'] = bool(row.get('pinned'))
        row['pinnedToDashboard'] = bool(row.get('pinned_to_dashboard')) if 'pinned_to_dashboard' in row else False
        results.append(row)
    return results


@router.post("")
async def create_snippet(snippet: SnippetCreate, current_user: User = Depends(get_current_user)):
    conn = get_db()
    cur = conn.cursor()

    snippet_id = snippet.id or str(uuid.uuid4())
    now = datetime.utcnow().isoformat()

    try:
        cur.execute("""
            INSERT INTO snippets (
                id, user_id, title, content, color, pinned, items, code, images, links,
                voice_note, connections, pinned_to_dashboard, reminder, created_at, modified_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            snippet_id,
            current_user.id,
            snippet.title,
            snippet.content,
            snippet.color,
            1 if snippet.pinned else 0,
            json.dumps(snippet.items) if snippet.items is not None else None,
            json.dumps(snippet.code) if snippet.code is not None else None,
            json.dumps(snippet.images) if snippet.images is not None else None,
            json.dumps(snippet.links) if snippet.links is not None else None,
            json.dumps(snippet.voiceNote) if snippet.voiceNote is not None else None,
            json.dumps(snippet.connections) if snippet.connections is not None else None,
            1 if snippet.pinnedToDashboard else 0,
            json.dumps(snippet.reminder) if snippet.reminder is not None else None,
            now,
            now
        ))

        conn.commit()
    except sqlite3.IntegrityError as ie:
        # ID already exists — try to update the existing row if it belongs to the current user
        conn.rollback()
        cur.execute("SELECT user_id FROM snippets WHERE id = ?", (snippet_id,))
        existing = cur.fetchone()
        if existing and existing['user_id'] == current_user.id:
            # Build update clause for provided fields
            updates = []
            values = []
            if snippet.title is not None:
                updates.append("title = ?"); values.append(snippet.title)
            if snippet.content is not None:
                updates.append("content = ?"); values.append(snippet.content)
            if snippet.color is not None:
                updates.append("color = ?"); values.append(snippet.color)
            if snippet.pinned is not None:
                updates.append("pinned = ?"); values.append(1 if snippet.pinned else 0)
            if snippet.items is not None:
                updates.append("items = ?"); values.append(json.dumps(snippet.items))
            if snippet.code is not None:
                updates.append("code = ?"); values.append(json.dumps(snippet.code))
            if snippet.images is not None:
                updates.append("images = ?"); values.append(json.dumps(snippet.images))
            if snippet.links is not None:
                updates.append("links = ?"); values.append(json.dumps(snippet.links))
            if snippet.voiceNote is not None:
                updates.append("voice_note = ?"); values.append(json.dumps(snippet.voiceNote))
            if snippet.connections is not None:
                updates.append("connections = ?"); values.append(json.dumps(snippet.connections))
            if snippet.pinnedToDashboard is not None:
                updates.append("pinned_to_dashboard = ?"); values.append(1 if snippet.pinnedToDashboard else 0)
            if snippet.reminder is not None:
                updates.append("reminder = ?"); values.append(json.dumps(snippet.reminder))

            # Always update modified_at
            updates.append("modified_at = ?"); values.append(now)
            values.append(snippet_id)
            values.append(current_user.id)

            if updates:
                try:
                    cur.execute(f"UPDATE snippets SET {', '.join(updates)} WHERE id = ? AND user_id = ?", values)
                    conn.commit()
                except sqlite3.OperationalError as e:
                    conn.rollback()
                    conn.close()
                    raise HTTPException(status_code=503, detail=f"Database is busy: {e}")

            # Return the updated row
            cur.execute("SELECT * FROM snippets WHERE id = ?", (snippet_id,))
            row = cur.fetchone()
            conn.close()
            if not row:
                raise HTTPException(status_code=500, detail="Failed to retrieve snippet after resolving ID conflict")

            res = dict(row)
            for key in ['items', 'code', 'images', 'links', 'voice_note', 'connections', 'reminder']:
                if res.get(key) is not None:
                    try:
                        res[key] = json.loads(res[key])
                    except Exception:
                        res[key] = res[key]
            res['pinned'] = bool(res.get('pinned'))
            res['pinnedToDashboard'] = bool(res.get('pinned_to_dashboard')) if 'pinned_to_dashboard' in res else False
            return res
        else:
            conn.close()
            raise HTTPException(status_code=400, detail=f"Snippet id conflict: {ie}")
    except sqlite3.OperationalError as e:
        # Common cause: database is locked due to concurrent access. Return 503 so the client can retry.
        conn.rollback()
        conn.close()
        raise HTTPException(status_code=503, detail=f"Database is busy: {e}")
    finally:
        try:
            conn.close()
        except Exception:
            pass

    return {"id": snippet_id, "created_at": now, "modified_at": now}


@router.put("/{snippet_id}")
async def update_snippet(snippet_id: str, snippet: SnippetUpdate, current_user: User = Depends(get_current_user)):
    conn = get_db()
    cur = conn.cursor()

    # verify ownership
    cur.execute("SELECT id FROM snippets WHERE id = ? AND user_id = ?", (snippet_id, current_user.id))
    if not cur.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Snippet not found")

    updates = []
    values = []
    if snippet.title is not None:
        updates.append("title = ?"); values.append(snippet.title)
    if snippet.content is not None:
        updates.append("content = ?"); values.append(snippet.content)
    if snippet.color is not None:
        updates.append("color = ?"); values.append(snippet.color)
    if snippet.pinned is not None:
        updates.append("pinned = ?"); values.append(1 if snippet.pinned else 0)
    if snippet.items is not None:
        updates.append("items = ?"); values.append(json.dumps(snippet.items))
    if snippet.code is not None:
        updates.append("code = ?"); values.append(json.dumps(snippet.code))
    if snippet.images is not None:
        updates.append("images = ?"); values.append(json.dumps(snippet.images))
    if snippet.links is not None:
        updates.append("links = ?"); values.append(json.dumps(snippet.links))
    if snippet.voiceNote is not None:
        updates.append("voice_note = ?"); values.append(json.dumps(snippet.voiceNote))
    if snippet.connections is not None:
        updates.append("connections = ?"); values.append(json.dumps(snippet.connections))
    if snippet.pinnedToDashboard is not None:
        updates.append("pinned_to_dashboard = ?"); values.append(1 if snippet.pinnedToDashboard else 0)
    if snippet.reminder is not None:
        updates.append("reminder = ?"); values.append(json.dumps(snippet.reminder))

    now = datetime.utcnow().isoformat()
    updates.append("modified_at = ?"); values.append(now)

    values.append(snippet_id)
    values.append(current_user.id)

    if updates:
        try:
            cur.execute(f"UPDATE snippets SET {', '.join(updates)} WHERE id = ? AND user_id = ?", values)
            conn.commit()
        except sqlite3.OperationalError as e:
            conn.rollback()
            conn.close()
            raise HTTPException(status_code=503, detail=f"Database is busy: {e}")

    # return updated row
    cur.execute("SELECT * FROM snippets WHERE id = ?", (snippet_id,))
    row = cur.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Snippet not found after update")
    res = dict(row)
    for key in ['items', 'code', 'images', 'links', 'voice_note', 'connections', 'reminder']:
        if res.get(key) is not None:
            try:
                res[key] = json.loads(res[key])
            except Exception:
                res[key] = res[key]
    res['pinned'] = bool(res.get('pinned'))
    res['pinnedToDashboard'] = bool(res.get('pinned_to_dashboard')) if 'pinned_to_dashboard' in res else False
    return res


@router.delete("/{snippet_id}")
async def delete_snippet(snippet_id: str, current_user: User = Depends(get_current_user)):
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute("DELETE FROM snippets WHERE id = ? AND user_id = ?", (snippet_id, current_user.id))
        if cur.rowcount == 0:
            conn.close()
            raise HTTPException(status_code=404, detail="Snippet not found")
        conn.commit()
    except sqlite3.OperationalError as e:
        conn.rollback()
        conn.close()
        raise HTTPException(status_code=503, detail=f"Database is busy: {e}")
    finally:
        try:
            conn.close()
        except Exception:
            pass

    return {"success": True}

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from models.user import User
from routes.auth import get_current_user
import sqlite3

router = APIRouter()
DATABASE = 'data/notes.db'

class IdeaCreate(BaseModel):
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[str] = None

class IdeaUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[str] = None

def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

@router.get("")
async def get_ideas(current_user: User = Depends(get_current_user)):
    """Get all ideas for the current user"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute(
        """
        SELECT id, user_id, title, description, category, tags, created_at, modified_at
        FROM ideas
        WHERE user_id = ?
        ORDER BY created_at DESC
        """,
        (current_user.id,)
    )
    
    rows = cursor.fetchall()
    conn.close()
    
    ideas = []
    for row in rows:
        ideas.append({
            'id': row[0],
            'user_id': row[1],
            'title': row[2],
            'description': row[3],
            'category': row[4],
            'tags': row[5],
            'created_at': row[6],
            'modified_at': row[7]
        })
    
    return ideas

@router.post("")
async def create_idea(
    idea: IdeaCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new idea"""
    conn = get_db()
    cursor = conn.cursor()
    
    now = datetime.now().isoformat()
    
    cursor.execute(
        """
        INSERT INTO ideas (user_id, title, description, category, tags, created_at, modified_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            current_user.id,
            idea.title,
            idea.description,
            idea.category,
            idea.tags,
            now,
            now
        )
    )
    
    idea_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return {
        'id': idea_id,
        'user_id': current_user.id,
        'title': idea.title,
        'description': idea.description,
        'category': idea.category,
        'tags': idea.tags,
        'created_at': now,
        'modified_at': now
    }

@router.put("/{idea_id}")
async def update_idea(
    idea_id: int,
    idea_update: IdeaUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update an idea"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Check if idea exists and belongs to user
    cursor.execute("SELECT user_id FROM ideas WHERE id = ?", (idea_id,))
    row = cursor.fetchone()
    
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Idea not found")
    
    if row[0] != current_user.id:
        conn.close()
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Update only provided fields
    update_fields = []
    update_values = []
    
    if idea_update.title is not None:
        update_fields.append("title = ?")
        update_values.append(idea_update.title)
    
    if idea_update.description is not None:
        update_fields.append("description = ?")
        update_values.append(idea_update.description)
    
    if idea_update.category is not None:
        update_fields.append("category = ?")
        update_values.append(idea_update.category)
    
    if idea_update.tags is not None:
        update_fields.append("tags = ?")
        update_values.append(idea_update.tags)
    
    if not update_fields:
        conn.close()
        raise HTTPException(status_code=400, detail="No fields to update")
    
    now = datetime.now().isoformat()
    update_fields.append("modified_at = ?")
    update_values.append(now)
    update_values.append(idea_id)
    
    cursor.execute(
        f"UPDATE ideas SET {', '.join(update_fields)} WHERE id = ?",
        update_values
    )
    
    conn.commit()
    
    # Return updated idea
    cursor.execute(
        """
        SELECT id, user_id, title, description, category, tags, created_at, modified_at
        FROM ideas WHERE id = ?
        """,
        (idea_id,)
    )
    
    row = cursor.fetchone()
    conn.close()
    
    return {
        'id': row[0],
        'user_id': row[1],
        'title': row[2],
        'description': row[3],
        'category': row[4],
        'tags': row[5],
        'created_at': row[6],
        'modified_at': row[7]
    }

@router.delete("/{idea_id}")
async def delete_idea(
    idea_id: int,
    current_user: User = Depends(get_current_user)
):
    """Delete an idea"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Check if idea exists and belongs to user
    cursor.execute("SELECT user_id FROM ideas WHERE id = ?", (idea_id,))
    row = cursor.fetchone()
    
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Idea not found")
    
    if row[0] != current_user.id:
        conn.close()
        raise HTTPException(status_code=403, detail="Not authorized")
    
    cursor.execute("DELETE FROM ideas WHERE id = ?", (idea_id,))
    conn.commit()
    conn.close()
    
    return {"message": "Idea deleted successfully"}

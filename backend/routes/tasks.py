"""
Tasks API routes - User-specific
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional, Any
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
    """Get database connection"""
    conn = sqlite3.connect(DB_PATH, timeout=30, check_same_thread=False)
    try:
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA busy_timeout=30000;")
    except Exception:
        pass
    conn.row_factory = sqlite3.Row
    return conn


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    priority: str = "medium"
    due_date: Optional[str] = None
    project_id: Optional[str] = None
    tags: Optional[List[str]] = None
    reminder: Optional[str] = None
    favorite: Optional[bool] = False


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    completed: Optional[bool] = None
    priority: Optional[str] = None
    due_date: Optional[str] = None
    project_id: Optional[str] = None
    tags: Optional[List[str]] = None
    subtasks: Optional[List[Any]] = None
    reminder: Optional[str] = None
    favorite: Optional[bool] = None
    linked_notes: Optional[List[str]] = None


class Task(BaseModel):
    id: str
    title: str
    description: Optional[str]
    completed: bool
    priority: str
    due_date: Optional[str]
    project_id: Optional[str]
    created_at: str
    modified_at: str
    tags: Optional[List[str]] = None
    subtasks: Optional[List[Any]] = None
    reminder: Optional[str] = None
    favorite: Optional[bool] = False
    linked_notes: Optional[List[str]] = None


@router.get("", response_model=List[Task])
async def list_tasks(
    completed: Optional[bool] = None,
    current_user: User = Depends(get_current_user)
):
    """List all tasks for current user"""
    conn = get_db()
    cursor = conn.cursor()
    
    if completed is None:
        cursor.execute("""
            SELECT * FROM tasks 
            WHERE user_id = ?
            ORDER BY completed ASC, due_date ASC, priority DESC
        """, (current_user.id,))
    else:
        cursor.execute("""
            SELECT * FROM tasks 
            WHERE user_id = ? AND completed = ?
            ORDER BY due_date ASC, priority DESC
        """, (current_user.id, 1 if completed else 0))
    
    rows = cursor.fetchall()
    conn.close()
    
    tasks = []
    for row in rows:
        # Convert Row to dict to safely check for columns
        row_dict = dict(row)
        
        task_dict = {
            "id": row_dict["id"],
            "title": row_dict["title"],
            "description": row_dict["description"],
            "completed": bool(row_dict["completed"]),
            "priority": row_dict["priority"],
            "due_date": row_dict["due_date"],
            "project_id": row_dict["project_id"],
            "created_at": row_dict["created_at"],
            "modified_at": row_dict["modified_at"],
            "tags": json.loads(row_dict["tags"]) if row_dict.get("tags") else None,
            "subtasks": json.loads(row_dict["subtasks"]) if row_dict.get("subtasks") else None,
            "reminder": row_dict.get("reminder"),
            "favorite": bool(row_dict.get("favorite", 0)),
            "linked_notes": json.loads(row_dict["linked_notes"]) if row_dict.get("linked_notes") else None
        }
        tasks.append(Task(**task_dict))
    
    return tasks


@router.post("", response_model=Task)
async def create_task(
    task: TaskCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new task"""
    conn = get_db()
    cursor = conn.cursor()
    
    task_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    
    cursor.execute("""
        INSERT INTO tasks (
            id, user_id, title, description, completed,
            priority, due_date, project_id, created_at, modified_at,
            tags, reminder, favorite
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        task_id, current_user.id, task.title, task.description, 0,
        task.priority, task.due_date, task.project_id, now, now,
        json.dumps(task.tags) if task.tags else None,
        task.reminder,
        1 if task.favorite else 0
    ))
    
    conn.commit()
    conn.close()
    
    return Task(
        id=task_id,
        title=task.title,
        description=task.description,
        completed=False,
        priority=task.priority,
        due_date=task.due_date,
        project_id=task.project_id,
        created_at=now,
        modified_at=now,
        tags=task.tags,
        subtasks=None,
        reminder=task.reminder,
        favorite=task.favorite,
        linked_notes=None
    )


@router.put("/{task_id}", response_model=Task)
async def update_task(
    task_id: str,
    task: TaskUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update a task"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Check if task exists
    cursor.execute("""
        SELECT * FROM tasks 
        WHERE id = ? AND user_id = ?
    """, (task_id, current_user.id))
    
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Build update
    updates = []
    values = []
    
    if task.title is not None:
        updates.append("title = ?")
        values.append(task.title)
    if task.description is not None:
        updates.append("description = ?")
        values.append(task.description)
    if task.completed is not None:
        updates.append("completed = ?")
        values.append(1 if task.completed else 0)
    if task.priority is not None:
        updates.append("priority = ?")
        values.append(task.priority)
    if task.due_date is not None:
        updates.append("due_date = ?")
        values.append(task.due_date)
    if task.project_id is not None:
        updates.append("project_id = ?")
        values.append(task.project_id)
    if task.tags is not None:
        updates.append("tags = ?")
        values.append(json.dumps(task.tags))
    if task.subtasks is not None:
        updates.append("subtasks = ?")
        values.append(json.dumps(task.subtasks))
    if task.reminder is not None:
        updates.append("reminder = ?")
        values.append(task.reminder)
    if task.favorite is not None:
        updates.append("favorite = ?")
        values.append(1 if task.favorite else 0)
    if task.linked_notes is not None:
        updates.append("linked_notes = ?")
        values.append(json.dumps(task.linked_notes))
    
    now = datetime.utcnow().isoformat()
    updates.append("modified_at = ?")
    values.append(now)
    values.append(task_id)
    values.append(current_user.id)
    
    cursor.execute(f"""
        UPDATE tasks 
        SET {', '.join(updates)}
        WHERE id = ? AND user_id = ?
    """, values)
    
    conn.commit()
    
    # Get updated task
    cursor.execute("""
        SELECT * FROM tasks WHERE id = ?
    """, (task_id,))
    
    row = cursor.fetchone()
    conn.close()
    
    # Convert Row to dict
    row_dict = dict(row)
    
    return Task(
        id=row_dict["id"],
        title=row_dict["title"],
        description=row_dict["description"],
        completed=bool(row_dict["completed"]),
        priority=row_dict["priority"],
        due_date=row_dict["due_date"],
        project_id=row_dict["project_id"],
        created_at=row_dict["created_at"],
        modified_at=row_dict["modified_at"],
        tags=json.loads(row_dict["tags"]) if row_dict.get("tags") else None,
        subtasks=json.loads(row_dict["subtasks"]) if row_dict.get("subtasks") else None,
        reminder=row_dict.get("reminder"),
        favorite=bool(row_dict.get("favorite", 0)),
        linked_notes=json.loads(row_dict["linked_notes"]) if row_dict.get("linked_notes") else None
    )


@router.delete("/{task_id}")
async def delete_task(
    task_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a task"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        DELETE FROM tasks 
        WHERE id = ? AND user_id = ?
    """, (task_id, current_user.id))
    
    if cursor.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Also delete any shares of this task
    cursor.execute("""
        DELETE FROM shared_items 
        WHERE item_type = 'task' AND item_id = ? AND owner_id = ?
    """, (task_id, current_user.id))
    
    conn.commit()
    conn.close()
    
    return {"success": True}


@router.get("/shared", response_model=List[Task])
async def list_shared_tasks(current_user: User = Depends(get_current_user)):
    """List all tasks shared with the current user"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT t.*, u.username as owner_username, si.permission
        FROM tasks t
        JOIN shared_items si ON t.id = si.item_id AND si.item_type = 'task'
        JOIN users u ON t.user_id = u.id
        WHERE si.shared_with_id = ?
        ORDER BY t.due_date ASC, t.priority DESC
    """, (current_user.id,))
    
    rows = cursor.fetchall()
    conn.close()
    
    tasks = []
    for row in rows:
        row_dict = dict(row)
        tasks.append(Task(
            id=row_dict["id"],
            title=row_dict["title"],
            description=row_dict["description"],
            completed=bool(row_dict["completed"]),
            priority=row_dict["priority"],
            due_date=row_dict["due_date"],
            project_id=row_dict["project_id"],
            created_at=row_dict["created_at"],
            modified_at=row_dict["modified_at"],
            tags=json.loads(row_dict["tags"]) if row_dict.get("tags") else None,
            subtasks=json.loads(row_dict["subtasks"]) if row_dict.get("subtasks") else None,
            reminder=row_dict.get("reminder"),
            favorite=bool(row_dict.get("favorite", 0)),
            linked_notes=json.loads(row_dict["linked_notes"]) if row_dict.get("linked_notes") else None
        ))
    
    return tasks

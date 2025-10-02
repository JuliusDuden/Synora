"""
Tasks API routes - User-specific
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import sqlite3
import os
import uuid

from models.user import User
from routes.auth import get_current_user

router = APIRouter()

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "notes.db")

def get_db():
    """Get database connection"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    priority: str = "medium"
    due_date: Optional[str] = None
    project_id: Optional[str] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    completed: Optional[bool] = None
    priority: Optional[str] = None
    due_date: Optional[str] = None
    project_id: Optional[str] = None


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
    
    return [
        Task(
            id=row["id"],
            title=row["title"],
            description=row["description"],
            completed=bool(row["completed"]),
            priority=row["priority"],
            due_date=row["due_date"],
            project_id=row["project_id"],
            created_at=row["created_at"],
            modified_at=row["modified_at"]
        )
        for row in rows
    ]


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
            priority, due_date, project_id, created_at, modified_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        task_id, current_user.id, task.title, task.description, 0,
        task.priority, task.due_date, task.project_id, now, now
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
        modified_at=now
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
    
    return Task(
        id=row["id"],
        title=row["title"],
        description=row["description"],
        completed=bool(row["completed"]),
        priority=row["priority"],
        due_date=row["due_date"],
        project_id=row["project_id"],
        created_at=row["created_at"],
        modified_at=row["modified_at"]
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
    
    conn.commit()
    conn.close()
    
    return {"success": True}

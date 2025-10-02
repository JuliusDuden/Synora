"""
Projects API routes - User-specific
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


class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    status: str = "active"
    color: Optional[str] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    color: Optional[str] = None


class Project(BaseModel):
    id: str
    name: str
    description: Optional[str]
    status: str
    color: Optional[str]
    created_at: str
    modified_at: str


@router.get("", response_model=List[Project])
async def list_projects(current_user: User = Depends(get_current_user)):
    """List all projects for current user"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT * FROM projects 
        WHERE user_id = ?
        ORDER BY modified_at DESC
    """, (current_user.id,))
    
    rows = cursor.fetchall()
    conn.close()
    
    return [dict(row) for row in rows]


@router.post("", response_model=Project)
async def create_project(
    project: ProjectCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new project"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Check if project exists
    cursor.execute("""
        SELECT id FROM projects 
        WHERE user_id = ? AND name = ?
    """, (current_user.id, project.name))
    
    if cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=409, detail="Project already exists")
    
    project_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    
    cursor.execute("""
        INSERT INTO projects (
            id, user_id, name, description, status, color,
            created_at, modified_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        project_id, current_user.id, project.name,
        project.description, project.status, project.color,
        now, now
    ))
    
    conn.commit()
    conn.close()
    
    return Project(
        id=project_id,
        name=project.name,
        description=project.description,
        status=project.status,
        color=project.color,
        created_at=now,
        modified_at=now
    )


@router.put("/{project_id}", response_model=Project)
async def update_project(
    project_id: str,
    project: ProjectUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update a project"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Get existing project
    cursor.execute("""
        SELECT * FROM projects 
        WHERE id = ? AND user_id = ?
    """, (project_id, current_user.id))
    
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Build update
    updates = []
    values = []
    
    if project.name is not None:
        updates.append("name = ?")
        values.append(project.name)
    if project.description is not None:
        updates.append("description = ?")
        values.append(project.description)
    if project.status is not None:
        updates.append("status = ?")
        values.append(project.status)
    if project.color is not None:
        updates.append("color = ?")
        values.append(project.color)
    
    now = datetime.utcnow().isoformat()
    updates.append("modified_at = ?")
    values.append(now)
    values.append(project_id)
    values.append(current_user.id)
    
    cursor.execute(f"""
        UPDATE projects 
        SET {', '.join(updates)}
        WHERE id = ? AND user_id = ?
    """, values)
    
    conn.commit()
    
    # Get updated project
    cursor.execute("""
        SELECT * FROM projects WHERE id = ?
    """, (project_id,))
    
    row = cursor.fetchone()
    conn.close()
    
    return dict(row)


@router.delete("/{project_id}")
async def delete_project(
    project_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a project"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        DELETE FROM projects 
        WHERE id = ? AND user_id = ?
    """, (project_id, current_user.id))
    
    if cursor.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Project not found")
    
    conn.commit()
    conn.close()
    
    return {"success": True}

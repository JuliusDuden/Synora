"""
Attachments route - handles image uploads and retrieval in database
"""
from fastapi import APIRouter, UploadFile, File, HTTPException, Request
from fastapi.responses import Response
import sqlite3
import uuid
from pathlib import Path
from typing import List
import base64

router = APIRouter()

ALLOWED_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

def get_db_connection(db_path: Path):
    """Get database connection"""
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

def init_attachments_table(db_path: Path):
    """Initialize attachments table if it doesn't exist"""
    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS attachments (
            id TEXT PRIMARY KEY,
            filename TEXT NOT NULL,
            content_type TEXT NOT NULL,
            data BLOB NOT NULL,
            size INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()


@router.post("/upload")
async def upload_attachment(request: Request, file: UploadFile = File(...)):
    """Upload an image attachment to database"""
    db_path = request.app.state.vault_path.parent / "data" / "notes.db"
    init_attachments_table(db_path)
    
    # Check file extension
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # Read file content
    content = await file.read()
    
    # Check file size
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size: {MAX_FILE_SIZE / 1024 / 1024}MB"
        )
    
    # Generate unique ID
    attachment_id = uuid.uuid4().hex
    
    # Save to database
    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO attachments (id, filename, content_type, data, size)
        VALUES (?, ?, ?, ?, ?)
    """, (attachment_id, file.filename, file.content_type, content, len(content)))
    conn.commit()
    conn.close()
    
    return {
        "id": attachment_id,
        "filename": file.filename,
        "size": len(content),
        "url": f"/api/attachments/{attachment_id}"
    }


@router.get("/{attachment_id}")
async def get_attachment(request: Request, attachment_id: str):
    """Get an attachment by ID from database"""
    db_path = request.app.state.vault_path.parent / "data" / "notes.db"
    
    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    cursor.execute("""
        SELECT filename, content_type, data
        FROM attachments
        WHERE id = ?
    """, (attachment_id,))
    
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        raise HTTPException(status_code=404, detail="Attachment not found")
    
    return Response(
        content=row['data'],
        media_type=row['content_type'] or 'application/octet-stream',
        headers={
            'Content-Disposition': f'inline; filename="{row["filename"]}"'
        }
    )


@router.get("/")
async def list_attachments(request: Request):
    """List all attachments from database"""
    db_path = request.app.state.vault_path.parent / "data" / "notes.db"
    init_attachments_table(db_path)
    
    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, filename, size, created_at
        FROM attachments
        ORDER BY created_at DESC
    """)
    
    rows = cursor.fetchall()
    conn.close()
    
    attachments = []
    for row in rows:
        attachments.append({
            "id": row['id'],
            "filename": row['filename'],
            "size": row['size'],
            "created": row['created_at'],
            "url": f"/api/attachments/{row['id']}"
        })
    
    return {"attachments": attachments}


@router.delete("/{attachment_id}")
async def delete_attachment(request: Request, attachment_id: str):
    """Delete an attachment from database"""
    db_path = request.app.state.vault_path.parent / "data" / "notes.db"
    
    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    
    # Check if attachment exists
    cursor.execute("SELECT id FROM attachments WHERE id = ?", (attachment_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Attachment not found")
    
    # Delete attachment
    cursor.execute("DELETE FROM attachments WHERE id = ?", (attachment_id,))
    conn.commit()
    conn.close()
    
    return {"message": "Attachment deleted successfully"}


@router.post("/cleanup")
async def cleanup_orphaned_attachments(request: Request):
    """Remove attachments that are not referenced in any note"""
    db_path = request.app.state.vault_path.parent / "data" / "notes.db"
    
    conn = get_db_connection(db_path)
    cursor = conn.cursor()
    
    # Get all attachment IDs
    cursor.execute("SELECT id FROM attachments")
    all_attachments = [row['id'] for row in cursor.fetchall()]
    
    if not all_attachments:
        conn.close()
        return {"message": "No attachments found", "deleted": 0}
    
    # Get all notes content
    cursor.execute("SELECT content FROM notes")
    all_content = ' '.join([row['content'] for row in cursor.fetchall()])
    
    # Find orphaned attachments (not referenced in any note)
    import re
    referenced_ids = set(re.findall(r'/api/attachments/([a-f0-9]+)', all_content))
    orphaned_ids = [aid for aid in all_attachments if aid not in referenced_ids]
    
    if orphaned_ids:
        placeholders = ','.join('?' * len(orphaned_ids))
        cursor.execute(f"DELETE FROM attachments WHERE id IN ({placeholders})", orphaned_ids)
        conn.commit()
    
    conn.close()
    
    return {
        "message": f"Cleaned up {len(orphaned_ids)} orphaned attachments",
        "deleted": len(orphaned_ids)
    }

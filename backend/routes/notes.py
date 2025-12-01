"""
Notes API routes - User-specific with E2E encryption support
"""
from fastapi import APIRouter, HTTPException, Request, Depends
from typing import List
from datetime import datetime
import sqlite3
import uuid
import os
import re
import json

from models.note import Note, NoteCreate, NoteUpdate, NoteList
from models.user import User
from routes.auth import get_current_user

router = APIRouter()

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "notes.db")

def parse_frontmatter(content: str):
    """Extract frontmatter metadata from markdown content"""
    metadata = {
        'title': None,
        'tags': [],
        'project': None
    }
    
    if not content.startswith('---'):
        return metadata
    
    # Find the end of frontmatter
    lines = content.split('\n')
    end_index = -1
    for i in range(1, len(lines)):
        if lines[i].strip() == '---':
            end_index = i
            break
    
    if end_index == -1:
        return metadata
    
    # Parse frontmatter lines
    for line in lines[1:end_index]:
        if ':' in line:
            key, value = line.split(':', 1)
            key = key.strip().lower()
            value = value.strip()
            
            if key == 'title':
                metadata['title'] = value
            elif key == 'project':
                metadata['project'] = value
            elif key == 'tags':
                # Handle both [tag1, tag2] and plain tag1, tag2 formats
                value = value.strip('[]')
                if value:
                    metadata['tags'] = [tag.strip() for tag in value.split(',')]
    
    return metadata

def get_db():
    """Get database connection with optimized settings"""
    conn = sqlite3.connect(DB_PATH, timeout=60, check_same_thread=False, isolation_level=None)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=60000")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.execute("PRAGMA cache_size=10000")
    conn.execute("PRAGMA temp_store=MEMORY")
    conn.row_factory = sqlite3.Row
    return conn


@router.get("", response_model=List[NoteList])
async def list_notes(current_user: User = Depends(get_current_user)):
    """List all notes for current user"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT id, name, path, title, project, tags, created_at, modified_at 
        FROM notes 
        WHERE user_id = ?
        ORDER BY modified_at DESC
    """, (current_user.id,))
    
    rows = cursor.fetchall()
    conn.close()
    
    # Parse tags from JSON string
    notes_list = []
    for row in rows:
        tags = json.loads(row["tags"]) if row["tags"] else []
        notes_list.append(NoteList(
            id=row["id"],
            name=row["name"],
            path=row["path"],
            title=row["title"],
            project=row["project"],
            tags=tags
        ))
    
    return notes_list


@router.get("/{name:path}", response_model=Note)
async def get_note(name: str, current_user: User = Depends(get_current_user)):
    """Get a specific note for current user or shared with user"""
    conn = get_db()
    cursor = conn.cursor()
    
    # First try to get own note
    cursor.execute("""
        SELECT * FROM notes 
        WHERE user_id = ? AND name = ?
    """, (current_user.id, name))
    
    row = cursor.fetchone()
    
    # If not found, try to get shared note
    if not row:
        cursor.execute("""
            SELECT n.*, si.permission FROM notes n
            JOIN shared_items si ON n.id = si.item_id AND si.item_type = 'note'
            WHERE n.name = ? AND si.shared_with_id = ?
        """, (name, current_user.id))
        row = cursor.fetchone()
    
    conn.close()
    
    if not row:
        raise HTTPException(status_code=404, detail="Note not found")
    
    # Parse tags from JSON string
    import json
    tags = json.loads(row["tags"]) if row["tags"] else []
    
    return Note(
        name=row["name"],
        path=row["path"],
        content=row["content"],
        metadata={
            "title": row["title"],
            "tags": tags,
            "project": row["project"],
            "created": row["created_at"],
            "modified": row["modified_at"]
        },
        tags=tags,
        links=[],
        backlinks=[],
        created=datetime.fromisoformat(row["created_at"]) if row["created_at"] else None,
        modified=datetime.fromisoformat(row["modified_at"]) if row["modified_at"] else None,
        user_id=row["user_id"],
        is_encrypted=bool(row["is_encrypted"])
    )


@router.post("", response_model=dict)
async def create_note(note_data: NoteCreate, current_user: User = Depends(get_current_user)):
    """Create a new note for current user"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        # Check if note already exists for this user
        cursor.execute("""
            SELECT id FROM notes 
            WHERE user_id = ? AND name = ?
        """, (current_user.id, note_data.name))
        
        if cursor.fetchone():
            conn.close()
            raise HTTPException(status_code=409, detail="Note already exists")
        
        # Extract metadata from frontmatter
        metadata = parse_frontmatter(note_data.content)
        
        # Create note
        note_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()
        path = note_data.folder + "/" + note_data.name if note_data.folder else note_data.name
        
        cursor.execute("""
            INSERT INTO notes (
                id, user_id, name, path, content, 
                title, project, tags,
                is_encrypted, created_at, modified_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            note_id, current_user.id, note_data.name, path, 
            note_data.content,
            metadata['title'], metadata['project'], json.dumps(metadata['tags']),
            0, now, now
        ))
        
        conn.commit()
        conn.close()
        
        return {"success": True, "name": note_data.name, "id": note_id}
    except HTTPException:
        raise
    except sqlite3.IntegrityError as e:
        print(f"Database integrity error: {e}")
        raise HTTPException(status_code=409, detail=f"Database constraint error: {str(e)}")
    except Exception as e:
        print(f"Error creating note: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to create note: {str(e)}")


@router.put("/{name:path}", response_model=dict)
async def update_note(
    name: str, 
    note_data: NoteUpdate, 
    current_user: User = Depends(get_current_user)
):
    """Update an existing note for current user or shared note with edit permission"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Check if note exists (own note)
    cursor.execute("""
        SELECT id, user_id FROM notes 
        WHERE user_id = ? AND name = ?
    """, (current_user.id, name))
    
    row = cursor.fetchone()
    is_shared_note = False
    owner_id = None
    
    if not row:
        # Check if it's a shared note with edit permission
        cursor.execute("""
            SELECT n.id, n.user_id, si.permission 
            FROM notes n
            JOIN shared_items si ON si.item_type = 'note' AND si.item_id = n.id
            WHERE n.name = ? AND si.shared_with_id = ? AND si.permission = 'edit'
        """, (name, current_user.id))
        
        shared_row = cursor.fetchone()
        if not shared_row:
            conn.close()
            raise HTTPException(status_code=404, detail="Note not found or no edit permission")
        
        is_shared_note = True
        owner_id = shared_row[1]
    else:
        owner_id = row[1]
    
    now = datetime.utcnow().isoformat()
    
    # Extract metadata from frontmatter
    metadata = parse_frontmatter(note_data.content)
    
    # If renaming
    if note_data.name and note_data.name != name:
        # Shared notes cannot be renamed
        if is_shared_note:
            conn.close()
            raise HTTPException(status_code=403, detail="Cannot rename shared notes")
        
        # Check if new name already exists
        cursor.execute("""
            SELECT id FROM notes 
            WHERE user_id = ? AND name = ?
        """, (current_user.id, note_data.name))
        
        if cursor.fetchone():
            conn.close()
            raise HTTPException(status_code=409, detail="Note with new name already exists")
        
        # Update with new name and metadata
        cursor.execute("""
            UPDATE notes 
            SET name = ?, content = ?, title = ?, project = ?, tags = ?, modified_at = ?
            WHERE user_id = ? AND name = ?
        """, (note_data.name, note_data.content, metadata['title'], metadata['project'], 
              json.dumps(metadata['tags']), now, current_user.id, name))
        
        final_name = note_data.name
    else:
        # Just update content and metadata
        # Use owner_id for shared notes, current_user.id for own notes
        update_user_id = owner_id if is_shared_note else current_user.id
        cursor.execute("""
            UPDATE notes 
            SET content = ?, title = ?, project = ?, tags = ?, modified_at = ?
            WHERE user_id = ? AND name = ?
        """, (note_data.content, metadata['title'], metadata['project'], 
              json.dumps(metadata['tags']), now, update_user_id, name))
        
        final_name = name
    
    conn.commit()
    conn.close()
    
    return {"success": True, "name": final_name}


@router.delete("/{name:path}", response_model=dict)
async def delete_note(name: str, current_user: User = Depends(get_current_user)):
    """Delete a note for current user and all its attachments"""
    conn = get_db()
    cursor = conn.cursor()
    
    # First, get the note content to extract attachment IDs
    cursor.execute("""
        SELECT content FROM notes 
        WHERE user_id = ? AND name = ?
    """, (current_user.id, name))
    
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Note not found")
    
    content = row[0]
    
    # Extract attachment IDs from markdown content
    # Pattern: ![...](/api/attachments/{id})
    import re
    attachment_pattern = r'!\[.*?\]\(/api/attachments/([a-f0-9]+)\)'
    attachment_ids = re.findall(attachment_pattern, content)
    
    # Delete all attachments referenced in the note
    if attachment_ids:
        placeholders = ','.join('?' * len(attachment_ids))
        cursor.execute(f"""
            DELETE FROM attachments 
            WHERE id IN ({placeholders})
        """, attachment_ids)
    
    # Delete the note
    cursor.execute("""
        DELETE FROM notes 
        WHERE user_id = ? AND name = ?
    """, (current_user.id, name))
    
    conn.commit()
    conn.close()
    
    return {"success": True, "deleted_attachments": len(attachment_ids)}


@router.post("/daily", response_model=dict)
async def create_daily_note(
    date: str = None, 
    current_user: User = Depends(get_current_user)
):
    """Create or get today's daily note for current user"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Use provided date or today
    if date:
        note_date = datetime.fromisoformat(date)
    else:
        note_date = datetime.utcnow()
    
    name = note_date.strftime("%Y-%m-%d")
    path = f"daily/{name}"
    
    # Check if already exists
    cursor.execute("""
        SELECT id FROM notes 
        WHERE user_id = ? AND name = ?
    """, (current_user.id, name))
    
    if cursor.fetchone():
        conn.close()
        return {"success": True, "name": name, "created": False}
    
    # Create daily note
    note_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    content = f"# Daily Note - {name}\n\n"
    
    cursor.execute("""
        INSERT INTO notes (
            id, user_id, name, path, content, 
            is_encrypted, created_at, modified_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (note_id, current_user.id, name, path, content, 0, now, now))
    
    conn.commit()
    conn.close()
    
    return {"success": True, "name": name, "created": True}


@router.get("/{name:path}/backlinks", response_model=List[str])
async def get_backlinks(name: str, current_user: User = Depends(get_current_user)):
    """Get backlinks for a note (simplified - returns empty for now)"""
    # TODO: Implement backlinks tracking in database
    return []


@router.get("/shared/all")
async def list_shared_notes(current_user: User = Depends(get_current_user)):
    """List all notes shared with the current user"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT n.id, n.name, n.path, n.title, n.project, n.tags, 
               n.created_at, n.modified_at, u.username as owner_username, si.permission
        FROM notes n
        JOIN shared_items si ON n.id = si.item_id AND si.item_type = 'note'
        JOIN users u ON n.user_id = u.id
        WHERE si.shared_with_id = ?
        ORDER BY n.modified_at DESC
    """, (current_user.id,))
    
    rows = cursor.fetchall()
    conn.close()
    
    notes_list = []
    for row in rows:
        tags = json.loads(row["tags"]) if row["tags"] else []
        notes_list.append({
            "id": row["id"],
            "name": row["name"],
            "path": row["path"],
            "title": row["title"],
            "project": row["project"],
            "tags": tags,
            "owner_username": row["owner_username"],
            "permission": row["permission"],
            "is_shared": True
        })
    
    return notes_list

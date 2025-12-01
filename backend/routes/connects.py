"""
Connects API routes - Managing user connections (friends)
"""
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import sqlite3
import os
import uuid

from models.user import User
from models.connect import (
    ConnectCreate, ConnectRequest, Connect, 
    ShareItem, SharedItem, UserSearchResult
)
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


def init_connects_db():
    """Initialize connects tables"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Connect requests table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS connect_requests (
            id TEXT PRIMARY KEY,
            requester_id TEXT NOT NULL,
            target_id TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            created_at TEXT NOT NULL,
            FOREIGN KEY (requester_id) REFERENCES users (id),
            FOREIGN KEY (target_id) REFERENCES users (id),
            UNIQUE(requester_id, target_id)
        )
    """)
    
    # Connections table (established connections)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS connects (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            connected_user_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id),
            FOREIGN KEY (connected_user_id) REFERENCES users (id),
            UNIQUE(user_id, connected_user_id)
        )
    """)
    
    # Shared items table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS shared_items (
            id TEXT PRIMARY KEY,
            item_type TEXT NOT NULL,
            item_id TEXT NOT NULL,
            owner_id TEXT NOT NULL,
            shared_with_id TEXT NOT NULL,
            permission TEXT DEFAULT 'view',
            created_at TEXT NOT NULL,
            FOREIGN KEY (owner_id) REFERENCES users (id),
            FOREIGN KEY (shared_with_id) REFERENCES users (id),
            UNIQUE(item_type, item_id, shared_with_id)
        )
    """)
    
    conn.commit()
    conn.close()


# Initialize DB on import
init_connects_db()


# ============= User Search =============

@router.get("/users/search", response_model=List[UserSearchResult])
async def search_users(
    q: str,
    current_user: User = Depends(get_current_user)
):
    """Search for users by email or username to connect with"""
    if len(q) < 2:
        return []
    
    conn = get_db()
    cursor = conn.cursor()
    
    # Search by email or username, excluding current user
    cursor.execute("""
        SELECT id, username, email FROM users 
        WHERE (email LIKE ? OR username LIKE ?) 
        AND id != ?
        LIMIT 10
    """, (f"%{q}%", f"%{q}%", current_user.id))
    
    rows = cursor.fetchall()
    conn.close()
    
    return [UserSearchResult(
        id=row["id"],
        username=row["username"],
        email=row["email"]
    ) for row in rows]


# ============= Connect Requests =============

@router.post("/request", response_model=ConnectRequest)
async def send_connect_request(
    connect_data: ConnectCreate,
    current_user: User = Depends(get_current_user)
):
    """Send a connect request to another user"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Find target user by email or username
    if connect_data.email:
        cursor.execute("SELECT id, username, email FROM users WHERE email = ?", (connect_data.email,))
    elif connect_data.username:
        cursor.execute("SELECT id, username, email FROM users WHERE username = ?", (connect_data.username,))
    else:
        conn.close()
        raise HTTPException(status_code=400, detail="Email or username required")
    
    target = cursor.fetchone()
    if not target:
        conn.close()
        raise HTTPException(status_code=404, detail="User not found")
    
    target_id = target["id"]
    
    # Can't connect to yourself
    if target_id == current_user.id:
        conn.close()
        raise HTTPException(status_code=400, detail="Cannot connect to yourself")
    
    # Check if already connected
    cursor.execute("""
        SELECT id FROM connects 
        WHERE (user_id = ? AND connected_user_id = ?)
        OR (user_id = ? AND connected_user_id = ?)
    """, (current_user.id, target_id, target_id, current_user.id))
    
    if cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail="Already connected")
    
    # Check if request already exists
    cursor.execute("""
        SELECT id, status FROM connect_requests 
        WHERE (requester_id = ? AND target_id = ?)
        OR (requester_id = ? AND target_id = ?)
    """, (current_user.id, target_id, target_id, current_user.id))
    
    existing = cursor.fetchone()
    if existing:
        if existing["status"] == "pending":
            conn.close()
            raise HTTPException(status_code=400, detail="Connect request already pending")
        elif existing["status"] == "rejected":
            # Delete old rejected request and create new one
            cursor.execute("DELETE FROM connect_requests WHERE id = ?", (existing["id"],))
    
    # Create connect request
    request_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    
    cursor.execute("""
        INSERT INTO connect_requests (id, requester_id, target_id, status, created_at)
        VALUES (?, ?, ?, 'pending', ?)
    """, (request_id, current_user.id, target_id, now))
    
    conn.commit()
    conn.close()
    
    return ConnectRequest(
        id=request_id,
        requester_id=current_user.id,
        requester_username=current_user.username,
        requester_email=current_user.email,
        target_id=target_id,
        target_username=target["username"],
        target_email=target["email"],
        status="pending",
        created_at=now
    )


@router.get("/requests/incoming", response_model=List[ConnectRequest])
async def get_incoming_requests(current_user: User = Depends(get_current_user)):
    """Get all incoming connect requests"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT cr.*, 
               u1.username as requester_username, u1.email as requester_email,
               u2.username as target_username, u2.email as target_email
        FROM connect_requests cr
        JOIN users u1 ON cr.requester_id = u1.id
        JOIN users u2 ON cr.target_id = u2.id
        WHERE cr.target_id = ? AND cr.status = 'pending'
        ORDER BY cr.created_at DESC
    """, (current_user.id,))
    
    rows = cursor.fetchall()
    conn.close()
    
    return [ConnectRequest(
        id=row["id"],
        requester_id=row["requester_id"],
        requester_username=row["requester_username"],
        requester_email=row["requester_email"],
        target_id=row["target_id"],
        target_username=row["target_username"],
        target_email=row["target_email"],
        status=row["status"],
        created_at=row["created_at"]
    ) for row in rows]


@router.get("/requests/outgoing", response_model=List[ConnectRequest])
async def get_outgoing_requests(current_user: User = Depends(get_current_user)):
    """Get all outgoing connect requests"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT cr.*, 
               u1.username as requester_username, u1.email as requester_email,
               u2.username as target_username, u2.email as target_email
        FROM connect_requests cr
        JOIN users u1 ON cr.requester_id = u1.id
        JOIN users u2 ON cr.target_id = u2.id
        WHERE cr.requester_id = ? AND cr.status = 'pending'
        ORDER BY cr.created_at DESC
    """, (current_user.id,))
    
    rows = cursor.fetchall()
    conn.close()
    
    return [ConnectRequest(
        id=row["id"],
        requester_id=row["requester_id"],
        requester_username=row["requester_username"],
        requester_email=row["requester_email"],
        target_id=row["target_id"],
        target_username=row["target_username"],
        target_email=row["target_email"],
        status=row["status"],
        created_at=row["created_at"]
    ) for row in rows]


@router.post("/requests/{request_id}/accept", response_model=Connect)
async def accept_connect_request(
    request_id: str,
    current_user: User = Depends(get_current_user)
):
    """Accept an incoming connect request"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Get the request
    cursor.execute("""
        SELECT * FROM connect_requests 
        WHERE id = ? AND target_id = ? AND status = 'pending'
    """, (request_id, current_user.id))
    
    request = cursor.fetchone()
    if not request:
        conn.close()
        raise HTTPException(status_code=404, detail="Connect request not found")
    
    requester_id = request["requester_id"]
    
    # Get requester info
    cursor.execute("SELECT username, email FROM users WHERE id = ?", (requester_id,))
    requester = cursor.fetchone()
    
    # Update request status
    cursor.execute("""
        UPDATE connect_requests SET status = 'accepted' WHERE id = ?
    """, (request_id,))
    
    # Create bidirectional connection
    now = datetime.utcnow().isoformat()
    connect_id_1 = str(uuid.uuid4())
    connect_id_2 = str(uuid.uuid4())
    
    cursor.execute("""
        INSERT INTO connects (id, user_id, connected_user_id, created_at)
        VALUES (?, ?, ?, ?)
    """, (connect_id_1, current_user.id, requester_id, now))
    
    cursor.execute("""
        INSERT INTO connects (id, user_id, connected_user_id, created_at)
        VALUES (?, ?, ?, ?)
    """, (connect_id_2, requester_id, current_user.id, now))
    
    conn.commit()
    conn.close()
    
    return Connect(
        id=connect_id_1,
        user_id=current_user.id,
        connected_user_id=requester_id,
        connected_username=requester["username"],
        connected_email=requester["email"],
        created_at=now
    )


@router.post("/requests/{request_id}/reject")
async def reject_connect_request(
    request_id: str,
    current_user: User = Depends(get_current_user)
):
    """Reject an incoming connect request"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        UPDATE connect_requests 
        SET status = 'rejected' 
        WHERE id = ? AND target_id = ? AND status = 'pending'
    """, (request_id, current_user.id))
    
    if cursor.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Connect request not found")
    
    conn.commit()
    conn.close()
    
    return {"message": "Connect request rejected"}


@router.delete("/requests/{request_id}")
async def cancel_connect_request(
    request_id: str,
    current_user: User = Depends(get_current_user)
):
    """Cancel an outgoing connect request"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        DELETE FROM connect_requests 
        WHERE id = ? AND requester_id = ? AND status = 'pending'
    """, (request_id, current_user.id))
    
    if cursor.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Connect request not found")
    
    conn.commit()
    conn.close()
    
    return {"message": "Connect request cancelled"}


# ============= Connections =============

@router.get("", response_model=List[Connect])
async def list_connects(current_user: User = Depends(get_current_user)):
    """List all connections for current user"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT c.*, u.username as connected_username, u.email as connected_email
        FROM connects c
        JOIN users u ON c.connected_user_id = u.id
        WHERE c.user_id = ?
        ORDER BY c.created_at DESC
    """, (current_user.id,))
    
    rows = cursor.fetchall()
    conn.close()
    
    return [Connect(
        id=row["id"],
        user_id=row["user_id"],
        connected_user_id=row["connected_user_id"],
        connected_username=row["connected_username"],
        connected_email=row["connected_email"],
        created_at=row["created_at"]
    ) for row in rows]


@router.delete("/{connect_id}")
async def remove_connect(
    connect_id: str,
    current_user: User = Depends(get_current_user)
):
    """Remove a connection"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Get the connection to find the other user
    cursor.execute("""
        SELECT connected_user_id FROM connects 
        WHERE id = ? AND user_id = ?
    """, (connect_id, current_user.id))
    
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Connection not found")
    
    other_user_id = row["connected_user_id"]
    
    # Remove both directions of the connection
    cursor.execute("""
        DELETE FROM connects 
        WHERE (user_id = ? AND connected_user_id = ?)
        OR (user_id = ? AND connected_user_id = ?)
    """, (current_user.id, other_user_id, other_user_id, current_user.id))
    
    # Also remove any shared items between these users
    cursor.execute("""
        DELETE FROM shared_items 
        WHERE (owner_id = ? AND shared_with_id = ?)
        OR (owner_id = ? AND shared_with_id = ?)
    """, (current_user.id, other_user_id, other_user_id, current_user.id))
    
    conn.commit()
    conn.close()
    
    return {"message": "Connection removed"}


# ============= Sharing =============

@router.post("/share/{item_type}/{item_id}")
async def share_item(
    item_type: str,
    item_id: str,
    share_data: ShareItem,
    current_user: User = Depends(get_current_user)
):
    """Share an item (project, note, task) with connects"""
    if item_type not in ["project", "note", "task"]:
        raise HTTPException(status_code=400, detail="Invalid item type")
    
    conn = get_db()
    cursor = conn.cursor()
    
    # Verify the item belongs to the current user
    if item_type == "project":
        cursor.execute("SELECT id FROM projects WHERE id = ? AND user_id = ?", (item_id, current_user.id))
    elif item_type == "note":
        cursor.execute("SELECT id FROM notes WHERE id = ? AND user_id = ?", (item_id, current_user.id))
    elif item_type == "task":
        cursor.execute("SELECT id FROM tasks WHERE id = ? AND user_id = ?", (item_id, current_user.id))
    
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail=f"{item_type.capitalize()} not found")
    
    now = datetime.utcnow().isoformat()
    shared_with = []
    
    for connect_id in share_data.connect_ids:
        # Verify connection exists
        cursor.execute("""
            SELECT connected_user_id FROM connects 
            WHERE id = ? AND user_id = ?
        """, (connect_id, current_user.id))
        
        connect = cursor.fetchone()
        if not connect:
            continue
        
        shared_with_id = connect["connected_user_id"]
        
        # Insert or update share
        share_id = str(uuid.uuid4())
        try:
            cursor.execute("""
                INSERT INTO shared_items (id, item_type, item_id, owner_id, shared_with_id, permission, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (share_id, item_type, item_id, current_user.id, shared_with_id, share_data.permission, now))
            shared_with.append(shared_with_id)
        except sqlite3.IntegrityError:
            # Already shared, update permission
            cursor.execute("""
                UPDATE shared_items SET permission = ?
                WHERE item_type = ? AND item_id = ? AND shared_with_id = ?
            """, (share_data.permission, item_type, item_id, shared_with_id))
            shared_with.append(shared_with_id)
    
    conn.commit()
    conn.close()
    
    return {"message": f"{item_type.capitalize()} shared with {len(shared_with)} connects"}


@router.delete("/share/{item_type}/{item_id}/{connect_id}")
async def unshare_item(
    item_type: str,
    item_id: str,
    connect_id: str,
    current_user: User = Depends(get_current_user)
):
    """Remove sharing of an item from a connect"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Get the connected user ID
    cursor.execute("""
        SELECT connected_user_id FROM connects 
        WHERE id = ? AND user_id = ?
    """, (connect_id, current_user.id))
    
    connect = cursor.fetchone()
    if not connect:
        conn.close()
        raise HTTPException(status_code=404, detail="Connection not found")
    
    cursor.execute("""
        DELETE FROM shared_items 
        WHERE item_type = ? AND item_id = ? AND owner_id = ? AND shared_with_id = ?
    """, (item_type, item_id, current_user.id, connect["connected_user_id"]))
    
    conn.commit()
    conn.close()
    
    return {"message": "Share removed"}


@router.get("/shared/with-me", response_model=List[SharedItem])
async def get_items_shared_with_me(current_user: User = Depends(get_current_user)):
    """Get all items shared with the current user"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT si.*, u.username as owner_username
        FROM shared_items si
        JOIN users u ON si.owner_id = u.id
        WHERE si.shared_with_id = ?
        ORDER BY si.created_at DESC
    """, (current_user.id,))
    
    rows = cursor.fetchall()
    conn.close()
    
    return [SharedItem(
        id=row["id"],
        item_type=row["item_type"],
        item_id=row["item_id"],
        owner_id=row["owner_id"],
        owner_username=row["owner_username"],
        shared_with_id=row["shared_with_id"],
        permission=row["permission"],
        created_at=row["created_at"]
    ) for row in rows]


@router.get("/shared/by-me", response_model=List[SharedItem])
async def get_items_shared_by_me(current_user: User = Depends(get_current_user)):
    """Get all items shared by the current user"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT si.*, u.username as owner_username
        FROM shared_items si
        JOIN users u ON si.owner_id = u.id
        WHERE si.owner_id = ?
        ORDER BY si.created_at DESC
    """, (current_user.id,))
    
    rows = cursor.fetchall()
    conn.close()
    
    return [SharedItem(
        id=row["id"],
        item_type=row["item_type"],
        item_id=row["item_id"],
        owner_id=row["owner_id"],
        owner_username=row["owner_username"],
        shared_with_id=row["shared_with_id"],
        permission=row["permission"],
        created_at=row["created_at"]
    ) for row in rows]


@router.get("/shared/{item_type}/{item_id}")
async def get_item_shares(
    item_type: str,
    item_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get all shares for a specific item"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT si.*, u.username as shared_with_username, u.email as shared_with_email
        FROM shared_items si
        JOIN users u ON si.shared_with_id = u.id
        WHERE si.item_type = ? AND si.item_id = ? AND si.owner_id = ?
    """, (item_type, item_id, current_user.id))
    
    rows = cursor.fetchall()
    conn.close()
    
    return [{
        "id": row["id"],
        "shared_with_id": row["shared_with_id"],
        "shared_with_username": row["shared_with_username"],
        "shared_with_email": row["shared_with_email"],
        "permission": row["permission"],
        "created_at": row["created_at"]
    } for row in rows]

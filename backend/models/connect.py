"""
Connect Model - For managing user connections (friends)
"""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ConnectBase(BaseModel):
    """Base connect model"""
    target_user_id: str


class ConnectCreate(BaseModel):
    """Create a connect request by email or username"""
    email: Optional[str] = None
    username: Optional[str] = None


class ConnectRequest(BaseModel):
    """Connect request model"""
    id: str
    requester_id: str
    requester_username: str
    requester_email: str
    target_id: str
    target_username: str
    target_email: str
    status: str  # pending, accepted, rejected
    created_at: str


class Connect(BaseModel):
    """Established connection between two users"""
    id: str
    user_id: str
    connected_user_id: str
    connected_username: str
    connected_email: str
    created_at: str


class ShareItem(BaseModel):
    """Model for sharing an item with connects"""
    connect_ids: list[str]  # List of connect IDs to share with
    permission: str = "view"  # view, edit


class SharedItem(BaseModel):
    """Model for a shared item"""
    id: str
    item_type: str  # project, note, task
    item_id: str
    owner_id: str
    owner_username: str
    shared_with_id: str
    permission: str
    created_at: str


class UserSearchResult(BaseModel):
    """Result when searching for users to connect with"""
    id: str
    username: str
    email: str

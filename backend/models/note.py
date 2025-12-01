"""
Data models for notes
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class NoteMetadata(BaseModel):
    """Frontmatter metadata"""
    title: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    project: Optional[str] = None  # Project ID reference
    created: Optional[datetime] = None
    modified: Optional[datetime] = None
    aliases: List[str] = Field(default_factory=list)
    extra: Dict[str, Any] = Field(default_factory=dict)


class Note(BaseModel):
    """Note model"""
    name: str
    path: str
    content: str
    metadata: NoteMetadata
    links: List[str] = Field(default_factory=list)
    backlinks: List[str] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)
    created: Optional[datetime] = None
    modified: Optional[datetime] = None
    user_id: Optional[str] = None  # Owner of the note
    is_encrypted: bool = False  # Whether content is encrypted


class NoteCreate(BaseModel):
    """Create note request"""
    name: str
    content: str = ""
    folder: Optional[str] = None


class NoteUpdate(BaseModel):
    """Update note request"""
    content: str
    name: Optional[str] = None  # For rename


class NoteList(BaseModel):
    """List of notes"""
    id: Optional[str] = None
    name: str
    path: str
    title: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    project: Optional[str] = None  # Project ID reference
    modified: Optional[datetime] = None


class SearchResult(BaseModel):
    """Search result"""
    name: str
    path: str
    title: Optional[str] = None
    snippet: str
    score: float
    tags: List[str] = Field(default_factory=list)

"""
Graph data models
"""
from pydantic import BaseModel, Field
from typing import List, Optional


class GraphNode(BaseModel):
    """Graph node representing a note"""
    id: str
    label: str
    title: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    size: int = 1  # Number of connections


class GraphEdge(BaseModel):
    """Graph edge representing a link"""
    source: str
    target: str
    bidirectional: bool = False


class GraphData(BaseModel):
    """Complete graph structure"""
    nodes: List[GraphNode]
    edges: List[GraphEdge]

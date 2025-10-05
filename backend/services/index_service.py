"""
Index service for search and metadata
"""
import aiosqlite
from pathlib import Path
from typing import List, Dict, Set
import re

from models.note import SearchResult
from models.graph import GraphData, GraphNode, GraphEdge


class IndexService:
    """Service for indexing and search"""
    
    def __init__(self, vault_path: Path, db_path: Path):
        self.vault_path = vault_path
        self.db_path = db_path
        self.db = None
        
    async def initialize(self):
        """Initialize database and FTS"""
        # Use WAL journal mode and set a busy timeout to cooperate with sync writes
        self.db = await aiosqlite.connect(str(self.db_path))
        try:
            await self.db.execute("PRAGMA journal_mode=WAL;")
        except Exception:
            pass
        try:
            await self.db.execute("PRAGMA busy_timeout=30000;")
        except Exception:
            pass
        
        # Create tables
        await self.db.execute("""
            CREATE TABLE IF NOT EXISTS notes (
                name TEXT PRIMARY KEY,
                path TEXT NOT NULL,
                title TEXT,
                content TEXT,
                tags TEXT,
                links TEXT,
                modified TIMESTAMP
            )
        """)
        
        # Create FTS5 virtual table for full-text search
        await self.db.execute("""
            CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
                name, title, content, tags,
                content='notes',
                content_rowid='rowid'
            )
        """)
        
        # Triggers to keep FTS in sync
        await self.db.execute("""
            CREATE TRIGGER IF NOT EXISTS notes_ai AFTER INSERT ON notes BEGIN
                INSERT INTO notes_fts(rowid, name, title, content, tags)
                VALUES (new.rowid, new.name, new.title, new.content, new.tags);
            END
        """)
        
        await self.db.execute("""
            CREATE TRIGGER IF NOT EXISTS notes_ad AFTER DELETE ON notes BEGIN
                DELETE FROM notes_fts WHERE rowid = old.rowid;
            END
        """)
        
        await self.db.execute("""
            CREATE TRIGGER IF NOT EXISTS notes_au AFTER UPDATE ON notes BEGIN
                UPDATE notes_fts SET 
                    name = new.name,
                    title = new.title,
                    content = new.content,
                    tags = new.tags
                WHERE rowid = old.rowid;
            END
        """)
        
        await self.db.commit()
        
    async def close(self):
        """Close database connection"""
        if self.db:
            try:
                await self.db.close()
            except Exception:
                pass
    
    async def index_note(self, name: str, path: str, title: str, content: str,
                        tags: List[str], links: List[str], modified):
        """Index a single note"""
        tags_str = ",".join(tags)
        links_str = ",".join(links)
        
        await self.db.execute("""
            INSERT OR REPLACE INTO notes (name, path, title, content, tags, links, modified)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (name, path, title, content, tags_str, links_str, modified))
        
        await self.db.commit()
    
    async def remove_note(self, name: str):
        """Remove note from index"""
        await self.db.execute("DELETE FROM notes WHERE name = ?", (name,))
        await self.db.commit()
    
    async def search(self, query: str, limit: int = 20) -> List[SearchResult]:
        """Full-text search"""
        cursor = await self.db.execute("""
            SELECT notes.name, notes.path, notes.title, notes.tags,
                   snippet(notes_fts, 2, '<mark>', '</mark>', '...', 32) as snippet,
                   rank
            FROM notes_fts
            JOIN notes ON notes.name = notes_fts.name
            WHERE notes_fts MATCH ?
            ORDER BY rank
            LIMIT ?
        """, (query, limit))
        
        results = []
        async for row in cursor:
            results.append(SearchResult(
                name=row[0],
                path=row[1],
                title=row[2],
                snippet=row[4],
                score=-row[5],  # rank is negative
                tags=row[3].split(",") if row[3] else []
            ))
        
        return results
    
    async def get_backlinks(self, note_name: str) -> List[str]:
        """Get notes that link to this note"""
        cursor = await self.db.execute("""
            SELECT name FROM notes WHERE links LIKE ?
        """, (f"%{note_name}%",))
        
        backlinks = []
        async for row in cursor:
            # Verify the link is actually present
            links = row[0]
            if links:
                link_list = links.split(",")
                if note_name in link_list:
                    backlinks.append(row[0])
        
        return backlinks
    
    async def get_all_tags(self) -> Dict[str, int]:
        """Get all tags with counts"""
        cursor = await self.db.execute("SELECT tags FROM notes WHERE tags != ''")
        
        tag_counts = {}
        async for row in cursor:
            tags = row[0].split(",")
            for tag in tags:
                tag = tag.strip()
                if tag:
                    tag_counts[tag] = tag_counts.get(tag, 0) + 1
        
        return dict(sorted(tag_counts.items(), key=lambda x: x[1], reverse=True))
    
    async def get_notes_by_tag(self, tag: str) -> List[str]:
        """Get notes with specific tag"""
        cursor = await self.db.execute("""
            SELECT name FROM notes WHERE tags LIKE ?
        """, (f"%{tag}%",))
        
        notes = []
        async for row in cursor:
            notes.append(row[0])
        
        return notes
    
    async def build_graph(self) -> GraphData:
        """Build graph structure"""
        cursor = await self.db.execute("SELECT name, title, tags, links FROM notes")
        
        nodes = []
        edges = []
        link_counts = {}
        all_links = set()
        
        # Create title -> name mapping
        title_to_name = {}
        notes_data = []
        
        # Collect all data and build mapping
        async for row in cursor:
            name, title, tags, links = row
            links_list = links.split(",") if links else []
            tags_list = tags.split(",") if tags else []
            
            # Map both title and name to name
            title_to_name[title] = name
            title_to_name[name] = name
            
            notes_data.append({
                "name": name,
                "title": title,
                "tags": tags_list,
                "links": links_list
            })
            
            link_counts[name] = len(links_list)
            all_links.update(links_list)
        
        # Create nodes
        for note in notes_data:
            nodes.append(GraphNode(
                id=note["name"],
                label=note["title"] or note["name"],
                title=note["title"],
                tags=note["tags"],
                size=link_counts.get(note["name"], 1)
            ))
        
        # Create edges (resolve links via title_to_name mapping)
        existing_edges = set()
        for note in notes_data:
            for link in note["links"]:
                # Try to resolve link to actual note name
                target_name = title_to_name.get(link)
                
                if target_name and target_name in link_counts:  # Only link to existing notes
                    edge_key = tuple(sorted([note["name"], target_name]))
                    if edge_key not in existing_edges:
                        edges.append(GraphEdge(
                            source=note["name"],
                            target=target_name
                        ))
                        existing_edges.add(edge_key)
        
        return GraphData(nodes=nodes, edges=edges)
    
    async def rebuild_index(self):
        """Rebuild entire index from vault"""
        from services.file_service import FileService
        
        file_service = FileService(self.vault_path)
        notes = file_service.get_all_notes()
        
        for note_info in notes:
            note = file_service.get_note(note_info.name)
            if note:
                await self.index_note(
                    note.name,
                    note.path,
                    note.metadata.title or note.name,
                    note.content,
                    note.tags,
                    note.links,
                    note.modified
                )

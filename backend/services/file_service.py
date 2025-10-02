"""
File service for managing markdown files
"""
from pathlib import Path
from typing import List, Optional, Tuple
import re
import frontmatter
from datetime import datetime

from models.note import Note, NoteMetadata, NoteList


class FileService:
    """Service for file operations"""
    
    def __init__(self, vault_path: Path):
        self.vault_path = vault_path
        
    def get_all_notes(self) -> List[NoteList]:
        """Get list of all notes"""
        notes = []
        
        for md_file in self.vault_path.rglob("*.md"):
            try:
                rel_path = md_file.relative_to(self.vault_path)
                name = str(rel_path.with_suffix("")).replace("\\", "/")
                
                # Get metadata
                post = frontmatter.load(md_file)
                title = post.metadata.get("title", name)
                tags = post.metadata.get("tags", [])
                if isinstance(tags, str):
                    tags = [tags]
                
                # Convert project to string if it exists (YAML might parse numbers as int)
                project = post.metadata.get("project")
                if project is not None:
                    project = str(project)
                    
                modified = datetime.fromtimestamp(md_file.stat().st_mtime)
                
                notes.append(NoteList(
                    name=name,
                    path=str(rel_path),
                    title=title,
                    tags=tags,
                    project=project,
                    modified=modified
                ))
            except Exception as e:
                print(f"Error reading {md_file}: {e}")
                continue
                
        return sorted(notes, key=lambda x: x.modified or datetime.min, reverse=True)
    
    def get_note(self, name: str) -> Optional[Note]:
        """Get a single note by name"""
        file_path = self.vault_path / f"{name}.md"
        
        if not file_path.exists():
            return None
            
        try:
            # Parse frontmatter
            post = frontmatter.load(file_path)
            
            # Convert project to string if it exists (YAML might parse numbers as int)
            project = post.metadata.get("project")
            if project is not None:
                project = str(project)
            
            # Extract metadata
            metadata = NoteMetadata(
                title=post.metadata.get("title"),
                tags=self._normalize_tags(post.metadata.get("tags", [])),
                project=project,
                created=post.metadata.get("created"),
                modified=post.metadata.get("modified"),
                aliases=post.metadata.get("aliases", []),
                extra={k: v for k, v in post.metadata.items() 
                       if k not in ["title", "tags", "project", "created", "modified", "aliases"]}
            )
            
            # Extract wiki links
            links = self._extract_links(post.content)
            
            # Extract inline tags
            inline_tags = self._extract_inline_tags(post.content)
            all_tags = list(set(metadata.tags + inline_tags))
            
            # File timestamps
            stats = file_path.stat()
            created = datetime.fromtimestamp(stats.st_ctime)
            modified = datetime.fromtimestamp(stats.st_mtime)
            
            return Note(
                name=name,
                path=str(file_path.relative_to(self.vault_path)),
                content=post.content,
                metadata=metadata,
                links=links,
                backlinks=[],  # Will be populated by index service
                tags=all_tags,
                created=created,
                modified=modified
            )
        except Exception as e:
            print(f"Error reading note {name}: {e}")
            return None
    
    def create_note(self, name: str, content: str, folder: Optional[str] = None) -> bool:
        """Create a new note"""
        try:
            if folder:
                file_path = self.vault_path / folder / f"{name}.md"
            else:
                file_path = self.vault_path / f"{name}.md"
            
            file_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Add basic frontmatter if not present
            if not content.startswith("---"):
                frontmatter_content = f"---\ntitle: {name}\ncreated: {datetime.now().isoformat()}\n---\n\n{content}"
            else:
                frontmatter_content = content
            
            file_path.write_text(frontmatter_content, encoding="utf-8")
            return True
        except Exception as e:
            print(f"Error creating note {name}: {e}")
            return False
    
    def update_note(self, name: str, content: str, new_name: Optional[str] = None) -> bool:
        """Update an existing note"""
        try:
            old_path = self.vault_path / f"{name}.md"
            
            if not old_path.exists():
                return False
            
            # Update content
            old_path.write_text(content, encoding="utf-8")
            
            # Rename if needed
            if new_name and new_name != name:
                new_path = self.vault_path / f"{new_name}.md"
                old_path.rename(new_path)
            
            return True
        except Exception as e:
            print(f"Error updating note {name}: {e}")
            return False
    
    def delete_note(self, name: str) -> bool:
        """Delete a note"""
        try:
            file_path = self.vault_path / f"{name}.md"
            
            if file_path.exists():
                file_path.unlink()
                return True
            return False
        except Exception as e:
            print(f"Error deleting note {name}: {e}")
            return False
    
    def create_daily_note(self, date: Optional[datetime] = None) -> Tuple[str, bool]:
        """Create or get daily note"""
        if date is None:
            date = datetime.now()
        
        name = f"daily/{date.strftime('%Y-%m-%d')}"
        file_path = self.vault_path / f"{name}.md"
        
        if file_path.exists():
            return name, False
        
        # Create daily note
        content = f"""---
title: Daily Note - {date.strftime('%Y-%m-%d')}
date: {date.strftime('%Y-%m-%d')}
tags: [daily]
---

# {date.strftime('%A, %B %d, %Y')}

## Tasks
- [ ] 

## Notes

## Links
"""
        success = self.create_note(name, content)
        return name, success
    
    @staticmethod
    def _extract_links(content: str) -> List[str]:
        """Extract wiki links [[NoteName]]"""
        pattern = r'\[\[([^\]]+)\]\]'
        matches = re.findall(pattern, content)
        # Handle [[Note|Alias]] format
        return [m.split('|')[0].strip() for m in matches]
    
    @staticmethod
    def _extract_inline_tags(content: str) -> List[str]:
        """Extract inline tags #tag"""
        pattern = r'#([a-zA-Z0-9_-]+)'
        return list(set(re.findall(pattern, content)))
    
    @staticmethod
    def _normalize_tags(tags) -> List[str]:
        """Normalize tag format"""
        if isinstance(tags, str):
            return [tags]
        elif isinstance(tags, list):
            return tags
        return []

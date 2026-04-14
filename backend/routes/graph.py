"""
Graph API routes - User-specific
"""
from fastapi import APIRouter, Request, Depends
import sqlite3
import os
import json
import re
from collections import defaultdict
from typing import Optional

from models.graph import GraphData
from models.user import User
from routes.auth import get_current_user

router = APIRouter()

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "notes.db")

WIKILINK_RE = re.compile(r"\[\[([^\]]+)\]\]")


def _normalize_ref(value: str) -> str:
    ref = (value or "").strip()
    if ref.endswith(".md"):
        ref = ref[:-3]
    return ref.casefold()


def _display_label(name: str, title: Optional[str]) -> str:
    if title and title.strip():
        return title.strip()
    return name.split("/")[-1]


def _is_folder_placeholder(name: str) -> bool:
    cleaned = (name or "").strip()
    if not cleaned:
        return True
    return cleaned == ".gitkeep" or cleaned.endswith("/.gitkeep")


def _parse_wikilinks(content: str) -> list[str]:
    if not content:
        return []

    refs: list[str] = []
    for raw in WIKILINK_RE.findall(content):
        target = raw.split("|")[0].split("#")[0].strip()
        if target:
            refs.append(target)
    return refs

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


@router.get("", response_model=GraphData)
async def get_graph(current_user: User = Depends(get_current_user)):
    """Get graph data for current user's notes"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Get all notes for this user
    cursor.execute("""
        SELECT id, name, title, tags, content
        FROM notes 
        WHERE user_id = ?
    """, (current_user.id,))
    
    rows = cursor.fetchall()
    conn.close()

    notes: list[dict] = []
    for row in rows:
        name = row["name"]
        if _is_folder_placeholder(name):
            continue

        try:
            tags = json.loads(row["tags"]) if row["tags"] else []
            if not isinstance(tags, list):
                tags = []
        except Exception:
            tags = []

        notes.append({
            "id": name,
            "name": name,
            "label": _display_label(name, row["title"]),
            "tags": [str(tag).strip() for tag in tags if str(tag).strip()],
            "content": row["content"] or "",
        })

    by_id = {n["id"]: n for n in notes}

    # Allow wiki refs by full name, basename or note title.
    resolver: dict[str, str] = {}
    for note in notes:
        resolver[_normalize_ref(note["name"])] = note["id"]
        resolver[_normalize_ref(note["name"].split("/")[-1])] = note["id"]
        resolver[_normalize_ref(note["label"])] = note["id"]

    edge_pairs: set[tuple[str, str]] = set()
    directed_links: set[tuple[str, str]] = set()

    # 1) Direct wiki-link edges (primary use case: connected knowledge map).
    for note in notes:
        source_id = note["id"]
        for ref in _parse_wikilinks(note["content"]):
            target_id = resolver.get(_normalize_ref(ref))
            if not target_id or target_id == source_id or target_id not in by_id:
                continue
            pair = tuple(sorted((source_id, target_id)))
            edge_pairs.add(pair)
            directed_links.add((source_id, target_id))

    # 2) Shared-tag edges (secondary use case: discover related but unlinked notes).
    tag_to_notes: dict[str, list[str]] = defaultdict(list)
    for note in notes:
        for tag in note["tags"]:
            normalized_tag = tag.casefold()
            if normalized_tag:
                tag_to_notes[normalized_tag].append(note["id"])

    max_tag_edges = 180
    added_tag_edges = 0

    for _, note_ids in tag_to_notes.items():
        unique_ids = list(dict.fromkeys(note_ids))
        if len(unique_ids) < 2:
            continue

        if len(unique_ids) <= 8:
            for i in range(len(unique_ids)):
                for j in range(i + 1, len(unique_ids)):
                    if added_tag_edges >= max_tag_edges:
                        break
                    pair = tuple(sorted((unique_ids[i], unique_ids[j])))
                    if pair not in edge_pairs:
                        edge_pairs.add(pair)
                        added_tag_edges += 1
                if added_tag_edges >= max_tag_edges:
                    break
        else:
            hub = unique_ids[0]
            for other in unique_ids[1:9]:
                if added_tag_edges >= max_tag_edges:
                    break
                pair = tuple(sorted((hub, other)))
                if pair not in edge_pairs:
                    edge_pairs.add(pair)
                    added_tag_edges += 1

        if added_tag_edges >= max_tag_edges:
            break

    degree: dict[str, int] = defaultdict(int)
    for source_id, target_id in edge_pairs:
        degree[source_id] += 1
        degree[target_id] += 1

    nodes = [
        {
            "id": note["id"],
            "label": note["label"],
            "title": note["label"],
            "tags": note["tags"],
            "size": max(1, degree.get(note["id"], 0)),
        }
        for note in notes
    ]

    edges = [
        {
            "source": source_id,
            "target": target_id,
            "bidirectional": (source_id, target_id) in directed_links and (target_id, source_id) in directed_links,
        }
        for source_id, target_id in sorted(edge_pairs)
    ]
    
    return GraphData(nodes=nodes, edges=edges)

# Projekt-Dropdown Fix

## 🐛 Problem
Wenn du im Editor ein Projekt auswählst, lädt die Note neu und das Dropdown zeigt wieder "Kein Projekt".

## 🔍 Ursache
1. Das Backend hat das `project` Feld nicht im `NoteMetadata` Model definiert
2. Die Frontmatter-Parsing-Logik im Frontend war zu simpel und fehleranfällig

## ✅ Lösung

### 1. Backend erweitert (`backend/models/note.py`)
```python
class NoteMetadata(BaseModel):
    title: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    project: Optional[str] = None  # ← NEU!
    created: Optional[datetime] = None
    modified: Optional[datetime] = None
    aliases: List[str] = Field(default_factory=list)
    extra: Dict[str, Any] = Field(default_factory=dict)
```

### 2. Backend FileService aktualisiert (`backend/services/file_service.py`)
```python
# Extract metadata
metadata = NoteMetadata(
    title=post.metadata.get("title"),
    tags=self._normalize_tags(post.metadata.get("tags", [])),
    project=post.metadata.get("project"),  # ← NEU!
    created=post.metadata.get("created"),
    modified=post.metadata.get("modified"),
    aliases=post.metadata.get("aliases", []),
    extra={k: v for k, v in post.metadata.items() 
           if k not in ["title", "tags", "project", "created", "modified", "aliases"]}
)
```

### 3. Frontend TypeScript Interface erweitert (`frontend/src/lib/api.ts`)
```typescript
export interface Note {
  name: string;
  path: string;
  content: string;
  metadata: {
    title?: string;
    tags: string[];
    project?: string;  // ← NEU!
    created?: string;
    modified?: string;
  };
  // ...
}
```

### 4. Editor updateProject() verbessert (`frontend/src/components/Editor.tsx`)

**Alte Methode** (fehleranfällig):
```typescript
// Simple string replacement - konnte Frontmatter beschädigen
updatedContent = `---${frontmatter.replace(/project:\s*.*/i, \`project: ${projectId}\`)}---${body}`;
```

**Neue Methode** (robust):
```typescript
// Parse Frontmatter Zeile für Zeile
const lines = content.split('\n');
let frontmatterLines: string[] = [];
let bodyLines: string[] = [];

// Finde und parse Frontmatter
for (let i = 0; i < lines.length; i++) {
  if (i === 0 && lines[i].trim() === '---') {
    inFrontmatter = true;
  } else if (inFrontmatter && lines[i].trim() === '---') {
    inFrontmatter = false;
  } else if (inFrontmatter) {
    frontmatterLines.push(lines[i]);
  } else {
    bodyLines.push(lines[i]);
  }
}

// Update oder füge project Feld hinzu
frontmatterLines = frontmatterLines.map(line => {
  if (line.trim().startsWith('project:')) {
    return projectId ? \`project: ${projectId}\` : '';
  }
  return line;
});

// Wenn nicht gefunden, füge hinzu
if (!projectUpdated && projectId) {
  frontmatterLines.push(\`project: ${projectId}\`);
}
```

### 5. loadNote() lädt jetzt project Feld
```typescript
const loadNote = async (name: string) => {
  const data = await api.getNote(name);
  setNote(data);
  setContent(data.content);
  setNewTitle(data.metadata.title || name);
  setSelectedProject(data.metadata.project || '');  // ← NEU!
};
```

## 🧪 Testen

### Manuelle Tests:
1. **Projekt zuordnen**:
   - Öffne eine Note
   - Rechte Spalte → Dropdown "Projekt zuordnen"
   - Wähle ein Projekt
   - ✅ Dropdown sollte Projekt beibehalten nach Reload

2. **Frontmatter prüfen**:
   ```yaml
   ---
   title: Meine Note
   project: 1733160000000
   ---
   ```

3. **API Response prüfen**:
   ```bash
   curl http://localhost:8000/api/notes/Welcome
   ```
   
   Response sollte enthalten:
   ```json
   {
     "metadata": {
       "title": "Welcome",
       "project": "1733160000000"
     }
   }
   ```

## 🔄 Workflow nach Fix

1. User wählt Projekt im Dropdown
2. Frontend parst Frontmatter robust
3. Frontend speichert Note mit `project: <id>`
4. Backend lädt Note und parsed Frontmatter
5. Backend gibt `project` in metadata zurück
6. Frontend lädt Note neu und setzt Dropdown-Wert
7. ✅ Dropdown zeigt korrektes Projekt

## 📝 Hinweise

- **Backend muss neu gestartet werden** für Model-Änderungen
- Frontend kompiliert automatisch bei Änderungen
- Frontmatter wird jetzt Zeile-für-Zeile geparst (robuster)
- Kleine Verzögerung (300ms) vor Reload verhindert Race-Conditions

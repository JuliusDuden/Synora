# Projekt-Management Features

## ✅ Implementierte Features

### 1. **Editor - Projekt-Zuordnung**
In der rechten Spalte des Editors gibt es jetzt ein Dropdown-Menü:
- **"Projekt zuordnen"** - Wähle ein Projekt aus der Liste
- Das Projekt wird automatisch im Frontmatter der Note gespeichert als `project: <project-id>`
- Die aktuelle Zuordnung wird unter dem Dropdown angezeigt (📁 Projektname)

**Workflow:**
1. Öffne eine Note im Editor
2. Rechte Spalte → Dropdown "Projekt zuordnen"
3. Wähle ein Projekt aus
4. Das Frontmatter wird automatisch aktualisiert

### 2. **Projekt-Detailansicht**
Wenn du auf ein Projekt klickst, öffnet sich die Detailansicht mit:

#### **Notizen-Sektion**
- Zeigt alle Notes die `project: <project-id>` im Frontmatter haben
- Button **"Neue Note"** → Erstellt Note direkt mit Projekt-Zuordnung
- Formular zum Erstellen:
  - Notizname eingeben
  - Enter oder "Erstellen"-Button
  - Note wird automatisch mit `project: <id>` im Frontmatter erstellt

#### **Aufgaben-Sektion**
- Zeigt alle Tasks die `projectId: <project-id>` haben
- Button **"Neue Aufgabe"** → Erstellt Task direkt mit Projekt-Zuordnung
- Formular zum Erstellen:
  - Aufgabe eingeben
  - **Priorität wählen** (Niedrig/Mittel/Hoch)
  - Enter oder "Erstellen"-Button
  - Task wird automatisch mit Projekt-ID gespeichert

### 3. **Tasks - Priorität & Projekt**
In der Aufgaben-Ansicht beim Erstellen:
- **Priorität-Dropdown**: Niedrig (grün) / Mittel (gelb) / Hoch (rot)
- **Projekt-Dropdown**: Optional ein Projekt zuweisen
- Tasks zeigen Priorität mit farbigen Badges
- Tasks zeigen zugehöriges Projekt (📁 Projektname)

## 🎯 Workflows

### **Workflow 1: Note zu Projekt hinzufügen (über Editor)**
```
1. Erstelle/Öffne eine Note
2. Rechte Spalte → "Projekt zuordnen"
3. Wähle Projekt aus Dropdown
4. ✅ Note ist jetzt dem Projekt zugeordnet
```

### **Workflow 2: Note zu Projekt hinzufügen (über Projekt-Detail)**
```
1. Gehe zu "Projekte"
2. Klicke auf ein Projekt
3. Sektion "Notizen" → "Neue Note"
4. Notizname eingeben
5. ✅ Note wird automatisch mit Projekt erstellt
```

### **Workflow 3: Aufgabe zu Projekt hinzufügen (über Projekt-Detail)**
```
1. Gehe zu "Projekte"
2. Klicke auf ein Projekt
3. Sektion "Aufgaben" → "Neue Aufgabe"
4. Aufgabe + Priorität eingeben
5. ✅ Task wird automatisch mit Projekt erstellt
```

### **Workflow 4: Aufgabe mit Priorität erstellen (über Tasks)**
```
1. Gehe zu "Aufgaben"
2. Klicke "Neue Aufgabe"
3. Titel eingeben
4. Priorität wählen (Niedrig/Mittel/Hoch)
5. Optional: Projekt wählen
6. ✅ Task wird mit Priorität gespeichert
```

## 📋 Datenstrukturen

### **Note Frontmatter**
```yaml
---
title: Meine Note
tags: [tag1, tag2]
project: 1733160000000  # Project ID
---
```

### **Task localStorage**
```json
{
  "id": "1733160000000",
  "title": "Task Titel",
  "priority": "high",  // "high" | "medium" | "low"
  "status": "todo",
  "projectId": "1733160000000",  // Optional
  "createdAt": "2025-10-02T10:00:00.000Z"
}
```

## 🎨 UI-Features

### **Prioritäts-Farben (Tasks)**
- 🔴 **Hoch**: Rote Border-Left + rotes Badge
- 🟡 **Mittel**: Gelbe Border-Left + gelbes Badge  
- 🟢 **Niedrig**: Grüne Border-Left + grünes Badge

### **Status-Anzeigen (Tasks in Projekt-Detail)**
- 🟢 Grüner Punkt = Erledigt
- 🟡 Gelber Punkt = In Bearbeitung
- ⚪ Grauer Punkt = Zu erledigen

### **Keyboard Shortcuts**
- **Enter** → Erstellen (in allen Formularen)
- **Escape** → Abbrechen (in allen Formularen)

## 🔄 Synchronisation

- **Notes**: Backend (SQLite via FastAPI)
- **Tasks**: localStorage (Frontend)
- **Projects**: localStorage (Frontend)

Wenn du eine Note einem Projekt zuordnest, wird das Frontmatter im Backend aktualisiert. Tasks und Projects werden lokal im Browser gespeichert.

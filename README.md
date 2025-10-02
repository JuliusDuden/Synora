# 🚀 Synora - Think Beyond.

**Your Web-based Knowledge Management System**

Ein vollständiges, web-basiertes Wissensmanagement-System inspiriert von Obsidian mit modernen Technologien.

> Think Beyond. - Erweitere deine Gedanken, organisiere dein Wissen, erreiche mehr.

## 🎯 Features

- **📝 Markdown Editor**: Monaco Editor mit Live-Preview
- **🔗 Backlinks**: Automatische Verlinkungserkennung `[[NoteName]]`
- **🌐 Graph View**: Interaktive Visualisierung mit Cytoscape.js
- **#️⃣ Tags**: Vollständiges Tag-System mit Browser
- **🔍 Suche**: Volltextsuche mit SQLite FTS
- **📂 Vault Management**: Dateibasiertes System mit CRUD
- **🌓 Dark/Light Mode**: Theme-System mit TailwindCSS
- **📅 Daily Notes**: Automatische Tagesnotizen
- **🤖 KI-Integration**: Semantische Suche und Smart Links

## 🏗️ Architektur

### Frontend (Next.js)
- React 18 + TypeScript
- Monaco Editor für Markdown
- Cytoscape.js für Graph View
- TailwindCSS für Styling
- PWA-fähig

### Backend (FastAPI)
- Python 3.11+
- FastAPI mit async/await
- SQLite für Indexierung
- Markdown-Parser mit Frontmatter
- WebSocket-Support für Live-Updates

## 🚀 Quick Start

### 1. Backend Setup

```bash
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1  # Windows
pip install -r requirements.txt
python app.py
```

Backend läuft auf: http://localhost:8000

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend läuft auf: http://localhost:3000

### 3. Docker Setup (Optional)

```bash
docker-compose up -d
```

## 📁 Projektstruktur

```
second-brain/
├── backend/           # FastAPI Backend
│   ├── app.py        # Haupteinstiegspunkt
│   ├── routes/       # API Endpunkte
│   ├── services/     # Business Logic
│   ├── models/       # Datenmodelle
│   └── vault/        # Markdown-Dateien
├── frontend/         # Next.js Frontend
│   ├── src/
│   │   ├── app/     # Next.js App Router
│   │   ├── components/
│   │   ├── lib/     # Utilities
│   │   └── hooks/   # Custom Hooks
└── docker-compose.yml
```

## 🔌 API Endpunkte

- `GET /api/notes` - Alle Notizen
- `GET /api/notes/{name}` - Einzelne Notiz
- `POST /api/notes` - Neue Notiz erstellen
- `PUT /api/notes/{name}` - Notiz aktualisieren
- `DELETE /api/notes/{name}` - Notiz löschen
- `GET /api/search?q={query}` - Suche
- `GET /api/graph` - Graph-Daten
- `GET /api/backlinks/{name}` - Backlinks
- `GET /api/tags` - Alle Tags
- `POST /api/daily` - Daily Note erstellen

## 🧩 Erweiterungen

- **KI-Layer**: Semantische Suche und Empfehlungen
- **Speech-to-Note**: Spracherkennung
- **Collaboration**: Multi-User mit WebSockets
- **Sync**: Git, Nextcloud, S3
- **Plugins**: Erweiterbar über API

## 📝 Lizenz

MIT

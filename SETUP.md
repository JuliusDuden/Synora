# Second Brain - Setup Guide

## 🚀 Quick Start (Development)

### Prerequisites
- Python 3.11+
- Node.js 20+
- PowerShell (Windows)

### 1. Backend Setup

```powershell
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env

# Run backend
python app.py
```

Backend should now be running on http://localhost:8000

### 2. Frontend Setup

```powershell
# Open new terminal and navigate to frontend
cd frontend

# Install dependencies
npm install

# Copy environment file
cp .env.local.example .env.local

# Run development server
npm run dev
```

Frontend should now be running on http://localhost:3000

## 🐳 Docker Setup (Production)

```powershell
# From project root
docker-compose up -d
```

Access the application at http://localhost:3000

## 📖 Usage

### Creating Notes
1. Click "New Note" in the sidebar
2. Write in Markdown with live preview
3. Save with Ctrl+S or the Save button

### Linking Notes
Use wiki-link syntax: `[[Note Name]]`

Example:
```markdown
This connects to [[Getting Started]] and [[Welcome]].
```

### Tags
Add tags in frontmatter:
```yaml
---
title: My Note
tags: [productivity, ideas]
---
```

Or inline: `#tag`

### Daily Notes
Click "Daily Note" to create/open today's note automatically.

### Graph View
Click the network icon to visualize connections between notes.

### Search
Press the search icon or use the search modal to find notes.

## 🔧 Configuration

### Backend (.env)
```
VAULT_PATH=./vault
DATABASE_PATH=./data/notes.db
CORS_ORIGINS=http://localhost:3000
PORT=8000
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## 🎨 Features

- ✅ Markdown Editor with Monaco
- ✅ Live Preview
- ✅ Wiki Links [[NoteName]]
- ✅ Backlinks
- ✅ Graph View
- ✅ Full-text Search
- ✅ Tags
- ✅ Daily Notes
- ✅ Dark Mode
- ✅ Responsive Design

## 🛠️ Tech Stack

**Frontend:**
- Next.js 14
- React 18
- TypeScript
- TailwindCSS
- Monaco Editor
- Cytoscape.js

**Backend:**
- Python 3.11
- FastAPI
- SQLite with FTS5
- Async/Await

## 📚 API Documentation

Once the backend is running, visit:
http://localhost:8000/docs

## 🤝 Contributing

This is a complete, production-ready setup. Feel free to extend with:
- AI-powered semantic search
- Collaboration features
- Mobile app
- Cloud sync
- Plugin system

## 📄 License

MIT

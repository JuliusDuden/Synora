# Synora - Server Deployment Guide

## Quick Start

### 1. Clone the repository on your server
```bash
git clone https://github.com/JuliusDuden/2nd-brain.git
cd 2nd-brain
```

### 2. Create environment file
```bash
cp .env.example .env
# Edit .env and set a secure JWT_SECRET
nano .env
```

### 3. Deploy with Docker
```bash
chmod +x deploy.sh
./deploy.sh
```

That's it! The application will be available at:
- **Frontend**: http://your-server:81
- **Backend API**: http://your-server:8000

---

## Manual Deployment

### Prerequisites
- Docker & Docker Compose
- Git

### Step 1: Create directories
```bash
mkdir -p backend/vault backend/data
```

### Step 2: Create .env file
```bash
cat > .env << EOF
JWT_SECRET=$(openssl rand -hex 32)
CORS_ORIGINS=http://synora.duckdns.org:81,http://localhost:3000
EOF
```

### Step 3: Build and start
```bash
docker compose build
docker compose up -d
```

### Step 4: Initialize database (if needed)
```bash
docker compose exec backend python init_database.py
```

---

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `JWT_SECRET` | Secret key for JWT tokens | **REQUIRED** |
| `CORS_ORIGINS` | Allowed CORS origins (comma-separated) | `http://localhost:3000` |
| `DATABASE_PATH` | Path to SQLite database | `/app/data/notes.db` |
| `VAULT_PATH` | Path to notes vault | `/app/vault` |
| `HOST` | Server host | `0.0.0.0` |
| `PORT` | Server port | `8000` |
| `DEBUG` | Enable debug mode | `false` |

### Ports

| Service | Internal Port | External Port |
|---------|---------------|---------------|
| Backend | 8000 | 8000 |
| Frontend | 3000 | 3000 |
| Nginx | 80 | 81 |

---

## Maintenance

### View logs
```bash
docker compose logs -f                    # All services
docker compose logs -f backend            # Backend only
docker compose logs -f frontend           # Frontend only
```

### Restart services
```bash
docker compose restart                    # All services
docker compose restart backend            # Backend only
```

### Rebuild and redeploy
```bash
docker compose down
docker compose build --no-cache
docker compose up -d
```

### Backup database
```bash
docker compose exec backend cp /app/data/notes.db /app/data/notes.db.backup
# Or from host:
cp backend/data/notes.db backend/data/notes.db.backup
```

### Update application
```bash
git pull
docker compose down
docker compose build --no-cache
docker compose up -d
```

---

## Troubleshooting

### Backend returns 500 errors

1. Check if database is initialized:
```bash
docker compose exec backend python init_database.py
```

2. Check backend logs:
```bash
docker compose logs backend --tail=100
```

3. Verify database file exists:
```bash
ls -la backend/data/
```

### Frontend can't connect to backend

1. Check CORS settings in `.env`
2. Verify nginx configuration
3. Check if backend is healthy:
```bash
curl http://localhost:8000/api/health
```

### Database locked errors

The application uses SQLite with WAL mode. If you see "database is locked" errors:

```bash
docker compose restart backend
```

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/auth/register` | POST | Register new user |
| `/api/auth/login` | POST | Login |
| `/api/notes` | GET/POST | List/Create notes |
| `/api/notes/{name}` | GET/PUT/DELETE | Get/Update/Delete note |
| `/api/projects` | GET/POST | List/Create projects |
| `/api/tasks` | GET/POST | List/Create tasks |
| `/api/ideas` | GET/POST | List/Create ideas |
| `/api/habits` | GET/POST | List/Create habits |
| `/api/snippets` | GET/POST | List/Create snippets |
| `/api/search` | GET | Search notes |
| `/api/graph` | GET | Get note graph |

---

## Security Notes

1. **Always change the JWT_SECRET** in production
2. Use HTTPS in production (configure nginx with SSL)
3. Regular backups of `backend/data/notes.db`
4. Keep Docker and dependencies updated

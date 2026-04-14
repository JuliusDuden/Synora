# Synora Deployment Guide for Debian Bookworm

This guide is for a real server deployment on Debian Bookworm using Docker Compose and the included Nginx reverse proxy.

## Recommended Production Setup

- Backend: FastAPI in Docker
- Frontend: Next.js in Docker
- Reverse proxy: included Nginx container
- External access: port `81` in the current compose setup

The frontend is prepared to work behind the same origin as the reverse proxy, so you do not need to hardcode a public API host for the default Docker deployment.

## 1. Prepare Debian Bookworm

Update the server and install the required packages:

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y git curl openssl ca-certificates docker.io docker-compose-plugin
```

Enable Docker and make sure it starts on boot:

```bash
sudo systemctl enable --now docker
```

Optional, but recommended so you can run Docker without `sudo`:

```bash
sudo usermod -aG docker $USER
```

Log out and back in after changing the group membership.

## 2. Open the Required Ports

The default compose setup exposes Nginx on port `81`.

If you use UFW:

```bash
sudo ufw allow 22/tcp
sudo ufw allow 81/tcp
sudo ufw enable
```

If you later switch to a standard public reverse proxy or TLS terminator, you will also need `80/tcp` and `443/tcp`.

## 3. Clone the Repository

```bash
git clone https://github.com/JuliusDuden/2nd-brain.git
cd 2nd-brain
```

## 4. Create Runtime Directories

```bash
mkdir -p backend/vault backend/data
```

These directories are mounted into the backend container and hold your notes and SQLite database.

## 5. Create the `.env` File

Create a secure secret and configure allowed browser origins:

```bash
cat > .env << EOF
JWT_SECRET=$(openssl rand -hex 32)
CORS_ORIGINS=http://YOUR_DOMAIN:81,http://localhost:3000
EOF
```

Replace `YOUR_DOMAIN` with your real domain or server IP.

### Optional: separate API URL

If you do not use the bundled same-origin Nginx setup and want the frontend to call a separate public backend URL, add this too:

```bash
NEXT_PUBLIC_API_URL=https://api.YOUR_DOMAIN
```

For the default Docker + Nginx deployment, you can leave this unset. The frontend will use the current origin and call `/api/...` relative to the domain that serves the app.

## 6. Deploy

Make the deployment script executable and run it:

```bash
chmod +x deploy.sh
./deploy.sh
```

What the script does:

1. Checks whether Docker and Docker Compose are installed.
2. Creates `.env` if it does not already exist.
3. Creates `backend/vault` and `backend/data`.
4. Stops any existing containers.
5. Builds the backend and frontend images.
6. Starts the stack in the background.
7. Runs health checks against the backend and frontend.

## 7. Verify the Deployment

Check the running containers:

```bash
docker compose ps
```

Check the backend health endpoint:

```bash
curl http://localhost:8000/api/health
```

Check the public Nginx entrypoint:

```bash
curl http://localhost:81/health
```

If you use a public domain, open the app in the browser at:

- `http://YOUR_DOMAIN:81`

## 8. Update the Application

```bash
git pull
docker compose down
docker compose build --no-cache
docker compose up -d
```

If you only changed notes or data, you usually do not need a rebuild.

## 9. Backups

Back up the SQLite database regularly:

```bash
cp backend/data/notes.db backend/data/notes.db.backup
```

You can also copy the whole `backend/data` directory if you want a full snapshot.

## 10. Logs and Maintenance

View logs:

```bash
docker compose logs -f
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f nginx
```

Restart one service:

```bash
docker compose restart backend
```

Full redeploy:

```bash
docker compose down
docker compose up -d --build
```

## Environment Variables

| Variable | Meaning | Notes |
|----------|---------|-------|
| `JWT_SECRET` | JWT signing secret | Required, must be strong and unique |
| `CORS_ORIGINS` | Allowed browser origins | Comma-separated list |
| `NEXT_PUBLIC_API_URL` | Frontend API base URL | Optional for same-origin Nginx deployments |
| `DATABASE_PATH` | SQLite database path | Defaults to `/app/data/notes.db` in Docker |
| `VAULT_PATH` | Note vault path | Defaults to `/app/vault` in Docker |
| `HOST` | Backend bind host | Defaults to `0.0.0.0` |
| `PORT` | Backend bind port | Defaults to `8000` |
| `DEBUG` | Backend debug mode | Keep `false` in production |

## Ports

| Service | Container Port | Host Port |
|---------|-----------------|-----------|
| Backend API | 8000 | 8000 |
| Frontend | 3000 | 3000 |
| Nginx | 80 | 81 |

## Publishing Notes

- The bundled Nginx container serves the frontend and forwards `/api/` to the backend.
- This means the browser can stay on the same origin and talk to the API through the reverse proxy.
- If you later move to standard HTTPS on `443`, update the port mapping and nginx config accordingly, then set `NEXT_PUBLIC_API_URL` to the public HTTPS origin.

## Troubleshooting

### Backend returns 500

1. Check the backend logs.
2. Make sure `backend/data/notes.db` exists.
3. Reinitialize the database if needed:

```bash
docker compose exec backend python init_database.py
```

### Frontend loads but requests fail

1. Verify `CORS_ORIGINS` includes the public origin you are using.
2. Make sure the browser is using the same domain and port that Nginx serves.
3. If you use a separate API host, set `NEXT_PUBLIC_API_URL` before building the frontend image.

### Database locked

SQLite is running in WAL mode, but if you still see lock errors:

```bash
docker compose restart backend
```

## Security Checklist

1. Use a fresh `JWT_SECRET` for every production install.
2. Use HTTPS for real public deployments.
3. Keep regular backups of `backend/data/notes.db`.
4. Keep Debian, Docker, and your images updated.
5. Restrict firewall access to the ports you really need.

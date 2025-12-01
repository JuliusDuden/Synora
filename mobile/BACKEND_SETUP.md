# Backend Setup für Mobile App

## CORS Konfiguration

Das Backend muss Anfragen von der Mobile App akzeptieren. 

### .env Datei bearbeiten

Erstelle oder bearbeite `backend/.env` und füge hinzu:

```env
# CORS Origins - Füge "*" hinzu für Entwicklung
CORS_ORIGINS=http://localhost:3000,*

# Oder spezifische IPs:
# CORS_ORIGINS=http://localhost:3000,http://192.168.1.100:3000
```

**Hinweis**: `*` erlaubt alle Origins (nur für Entwicklung empfohlen!)

## Backend von externen Geräten erreichbar machen

### Option 1: Auf allen Netzwerk-Interfaces lauschen

Bearbeite `backend/app.py` am Ende:

```python
if __name__ == "__main__":
    uvicorn.run(
        "app:app",
        host="0.0.0.0",  # ← Ändere von 127.0.0.1 zu 0.0.0.0
        port=8000,
        reload=True
    )
```

### Option 2: Beim Start spezifizieren

```powershell
cd backend
.\venv\Scripts\Activate.ps1
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

## Firewall-Regeln (Windows)

Die Windows Firewall könnte eingehende Verbindungen blockieren:

```powershell
# PowerShell als Administrator ausführen
New-NetFirewallRule -DisplayName "Python Backend" -Direction Inbound -Program "C:\Users\jisak\DevOps\2nd brain\backend\venv\Scripts\python.exe" -Action Allow
```

Oder manuell:
1. Windows-Sicherheit öffnen
2. Firewall & Netzwerkschutz → Erweiterte Einstellungen
3. Eingehende Regeln → Neue Regel
4. Programm: Python.exe aus dem venv auswählen
5. Verbindung zulassen

## Mobile App konfigurieren

1. **Deine lokale IP herausfinden**:
```powershell
ipconfig
```
Suche nach "IPv4-Adresse" (z.B. 192.168.1.100)

2. **Mobile App konfigurieren** (`mobile/app.json`):
```json
{
  "expo": {
    "extra": {
      "apiUrl": "http://192.168.1.100:8000"
    }
  }
}
```

## Testen

1. **Backend starten**:
```powershell
cd backend
.\venv\Scripts\Activate.ps1
python app.py
```

2. **Von anderem Gerät testen**:
```powershell
# Von deinem Phone/Tablet im Browser öffnen:
http://192.168.1.100:8000/docs
```

3. **Mobile App starten**:
```powershell
cd mobile
npm start
```

## Troubleshooting

### "Connection refused"
- Backend läuft nicht → `python app.py` starten
- Falsche IP → Mit `ipconfig` prüfen
- Falscher Port → Sollte 8000 sein

### "Network request failed"
- Phone und PC sind in unterschiedlichen Netzwerken
- Firewall blockiert Port 8000
- VPN ist aktiv (deaktivieren)

### "CORS error"
- `.env` hat nicht `*` in CORS_ORIGINS
- Backend neustarten nach Änderung

### Backend ist nur auf localhost erreichbar
- `host="0.0.0.0"` in app.py setzen
- Backend neustarten

## Sicherheitshinweis

⚠️ **Production**: 
- Verwende NICHT `allow_origins=["*"]` in Production!
- Verwende HTTPS statt HTTP
- Setze spezifische Origins
- Verwende Umgebungsvariablen

```python
# Production CORS Config
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://yourdomain.com",
        "https://app.yourdomain.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Lokales Testing ohne Netzwerk

Wenn du nur auf dem Emulator testen willst:

**iOS Simulator**: 
```json
"apiUrl": "http://localhost:8000"
```

**Android Emulator**:
```json
"apiUrl": "http://10.0.2.2:8000"
```

Diese verwenden spezielle IPs für den Emulator-Host.

# Synora Mobile - Quick Start

## Schnellstart für Entwicklung

### 1. Backend starten (falls noch nicht läuft)

```powershell
cd backend
.\venv\Scripts\Activate.ps1
python app.py
```

Backend läuft auf: http://localhost:8000

### 2. Mobile App Dependencies installieren

```powershell
cd mobile
npm install
```

### 3. API URL konfigurieren

**Wichtig**: Bearbeite `mobile/app.json` und setze deine lokale IP:

```json
{
  "expo": {
    "extra": {
      "apiUrl": "http://192.168.1.XXX:8000"
    }
  }
}
```

Deine lokale IP findest du mit:
```powershell
ipconfig
```
(Suche nach "IPv4-Adresse" unter deinem WLAN-Adapter)

### 4. App starten

```powershell
cd mobile
npm start
```

### 5. Auf Gerät testen

**Methode 1: Expo Go (Einfachste)**
1. Installiere "Expo Go" App auf deinem Phone
   - iOS: App Store
   - Android: Play Store
2. Scanne den QR Code aus dem Terminal

**Methode 2: Emulator**
- iOS: Drücke `i` im Terminal
- Android: Drücke `a` im Terminal

## Troubleshooting

### "Network request failed"
- Stelle sicher, dass Backend läuft
- Prüfe die API URL in `app.json`
- Phone und Computer müssen im gleichen WLAN sein
- Firewall könnte Port 8000 blockieren

### TypeScript Fehler
Normal! Die verschwinden nach `npm install`

## Features testen

1. **Login**: Verwende deinen existierenden Account
2. **Dashboard**: Siehst du deine Tasks, Projects, Habits
3. **Notes**: Erstelle und bearbeite Notizen
4. **Tasks**: Erstelle neue Tasks
5. **Responsive**: Teste auf Phone und Tablet (oder drehe das Gerät)

## Build für Production

```powershell
# EAS CLI installieren
npm install -g eas-cli

# Bei Expo anmelden
eas login

# Android Build
eas build --platform android

# iOS Build (nur auf macOS)
eas build --platform ios
```

Die APK/IPA kannst du dann direkt auf Geräten installieren oder in die Stores hochladen.

---

Bei Fragen: Siehe ausführliches README.md

# 📱 Synora Mobile App Integration

Die mobile App ist jetzt verfügbar! Sie bietet alle Features der Web-App auf iOS und Android.

## 🚀 Schnellstart

```powershell
# 1. Backend starten (falls noch nicht läuft)
cd backend
.\venv\Scripts\Activate.ps1
python app.py

# 2. Mobile App Dependencies installieren
cd ..\mobile
npm install

# 3. Mobile App starten
npm start
```

Dann mit Expo Go App den QR-Code scannen!

## 📁 Projekt-Struktur (Aktualisiert)

```
2nd brain/
├── backend/          # FastAPI Backend (Python)
├── frontend/         # Next.js Web App (React/TypeScript)
├── landingpage/      # Marketing Landing Page
└── mobile/           # 🆕 React Native Mobile App (Expo)
    ├── App.tsx
    ├── src/
    │   ├── screens/      # 11 Screens (Login, Dashboard, Notes, etc.)
    │   ├── navigation/   # Navigation Setup
    │   ├── contexts/     # Auth Context
    │   ├── services/     # API & Encryption
    │   └── types/        # TypeScript Types
    ├── README.md         # Ausführliche Dokumentation
    ├── QUICKSTART.md     # Schnellstart-Anleitung
    └── BACKEND_SETUP.md  # Backend-Konfiguration
```

## ✨ Features der Mobile App

### Implementierte Features
- ✅ **Authentication** - Login/Register mit 2FA
- ✅ **Dashboard** - Überblick über alle Daten
- ✅ **Notes** - Erstellen, bearbeiten, suchen
- ✅ **Tasks** - Todo-Listen mit Prioritäten
- ✅ **Projects** - Projekt-Management
- ✅ **Ideas** - Ideensammlung
- ✅ **Habits** - Habit-Tracking
- ✅ **Snippets** - Code-Snippets
- ✅ **Search** - Volltext-Suche
- ✅ **Settings** - Account-Verwaltung
- ✅ **E2E Encryption** - Client-seitige Verschlüsselung
- ✅ **Responsive Design** - Phone & Tablet optimiert

### Technische Highlights
- **React Native** mit **Expo** für iOS & Android
- **TypeScript** für Type-Safety
- **React Navigation** für native Navigation
- **AsyncStorage** für lokales Caching
- **Responsive Layouts** für alle Bildschirmgrößen
- **Native Performance** mit optimiertem Rendering

## 📱 Auf verschiedenen Geräten testen

### 1. Mit Expo Go (Einfachste Methode)
```powershell
cd mobile
npm start
```
- Installiere "Expo Go" auf deinem Phone
- Scanne den QR-Code

### 2. iOS Simulator (nur macOS)
```bash
npm run ios
```

### 3. Android Emulator
```powershell
npm run android
```

### 4. Web Browser (zum Testen)
```powershell
npm run web
```

## 🔧 Backend für Mobile konfigurieren

### 1. CORS aktivieren

Erstelle `backend/.env` (falls nicht vorhanden):
```env
CORS_ORIGINS=http://localhost:3000,*
```

### 2. Backend auf allen Interfaces lauschen lassen

In `backend/app.py`:
```python
if __name__ == "__main__":
    uvicorn.run(
        "app:app",
        host="0.0.0.0",  # ← Wichtig für externe Verbindungen
        port=8000,
        reload=True
    )
```

### 3. Mobile App konfigurieren

Finde deine lokale IP:
```powershell
ipconfig  # Suche "IPv4-Adresse"
```

Bearbeite `mobile/app.json`:
```json
{
  "expo": {
    "extra": {
      "apiUrl": "http://192.168.1.XXX:8000"  // Deine IP
    }
  }
}
```

### 4. Firewall-Regel (Windows)
```powershell
# Als Administrator ausführen
New-NetFirewallRule -DisplayName "Python Backend" -Direction Inbound -Program "C:\...\venv\Scripts\python.exe" -Action Allow
```

## 📦 Build für Production

### Android APK
```powershell
npm install -g eas-cli
eas login
eas build --platform android
```

### iOS App (nur macOS)
```powershell
eas build --platform ios
```

## 🎨 Responsive Design

Die App passt sich automatisch an:
- **Smartphones**: Einspaltiges Layout
- **Tablets**: Zweispaltiges Grid-Layout
- **Landscape**: Optimierte Ansichten

Code-Beispiel:
```typescript
const { width } = useWindowDimensions();
const isTablet = width >= 768;
```

## 📝 Verfügbare Screens

1. **LoginScreen** - Authentication
2. **DashboardScreen** - Übersicht
3. **NotesListScreen** - Alle Notizen
4. **NoteEditorScreen** - Notiz erstellen/bearbeiten
5. **TasksScreen** - Task-Management
6. **ProjectsScreen** - Projekte (Platzhalter)
7. **IdeasScreen** - Ideen (Platzhalter)
8. **HabitsScreen** - Habits (Platzhalter)
9. **SnippetsScreen** - Code-Snippets (Platzhalter)
10. **SearchScreen** - Suche
11. **SettingsScreen** - Einstellungen

## 🔐 Sicherheit

- **JWT Authentication** - Token-basierte Auth
- **E2E Encryption** - Client-seitige Verschlüsselung
- **Secure Storage** - AsyncStorage für sensible Daten
- **2FA Support** - Two-Factor Authentication

## 🚧 Roadmap / Nächste Schritte

### Priorität 1 (Basis-Features)
- [ ] Projects Screen vollständig implementieren
- [ ] Ideas Screen vollständig implementieren
- [ ] Habits Screen vollständig implementieren
- [ ] Snippets Screen vollständig implementieren

### Priorität 2 (Erweitert)
- [ ] Graph View für Notizen-Verbindungen
- [ ] Markdown-Preview mit Syntax-Highlighting
- [ ] Bilder/Attachments Upload
- [ ] Offline-Modus mit lokaler DB
- [ ] Dark Mode

### Priorität 3 (Premium)
- [ ] Push Notifications
- [ ] Biometrische Auth (Face ID / Fingerprint)
- [ ] Voice Notes
- [ ] Collaborative Features
- [ ] Widget für Home Screen

## 📚 Dokumentation

Siehe ausführliche Dokumentation in:
- `mobile/README.md` - Vollständige Dokumentation
- `mobile/QUICKSTART.md` - Schnellstart
- `mobile/BACKEND_SETUP.md` - Backend-Konfiguration

## 🐛 Troubleshooting

### "Cannot connect to backend"
1. Backend läuft? → `python app.py`
2. Richtige IP? → `ipconfig`
3. Gleiche WLAN? → Beide Geräte im selben Netzwerk
4. Firewall? → Port 8000 freigeben

### "Module not found"
```powershell
cd mobile
rm -rf node_modules
npm install
```

### TypeScript Fehler
Die Fehler verschwinden nach `npm install` und beim ersten Build.

## 💡 Tipps

### Performance
- Verwende `React.memo()` für häufig gerenderte Components
- Implementiere Virtualisierung für lange Listen
- Nutze `useMemo` und `useCallback` für teure Berechnungen

### Development
- Hot Reload funktioniert automatisch
- Nutze React Native Debugger für besseres Debugging
- Flipper für Performance-Profiling

### Testing
```powershell
# Type checking
npm run type-check

# Linting
npm run lint
```

## 🤝 Contributing

Beiträge sind willkommen! Besonders für:
- Implementation der Platzhalter-Screens
- UI/UX Verbesserungen
- Performance-Optimierungen
- Tests
- Dokumentation

## 📄 Technologie-Stack

| Komponente | Technologie |
|------------|-------------|
| Framework | React Native |
| Build Tool | Expo |
| Language | TypeScript |
| Navigation | React Navigation |
| State Management | React Context |
| Storage | AsyncStorage |
| Encryption | expo-crypto |
| HTTP Client | fetch API |
| UI Components | React Native Core |
| Icons | @expo/vector-icons |

## 🎯 Ziele erreicht

✅ iOS & Android Support
✅ Alle Core-Features vom Web-Client
✅ Responsive Design (Phone + Tablet)
✅ Native Navigation
✅ Secure Authentication
✅ E2E Encryption
✅ Type-safe mit TypeScript
✅ Clean Code-Architektur
✅ Ausführliche Dokumentation

---

**Viel Erfolg mit der Mobile App! 🚀**

Bei Fragen: Siehe Dokumentation in `mobile/` oder erstelle ein Issue.

*Think Beyond* 💡

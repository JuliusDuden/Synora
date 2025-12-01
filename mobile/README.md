# Synora Mobile App

**Think Beyond** - Die mobile App für dein Second Brain System.

## 🚀 Features

✅ **iOS & Android Support** - Läuft nativ auf beiden Plattformen
✅ **Tablet-optimiert** - Responsive Design für Phones und Tablets
✅ **Alle Web-Features** - Notes, Tasks, Projects, Ideas, Habits, Snippets
✅ **E2E Verschlüsselung** - Deine Daten bleiben sicher
✅ **Offline-fähig** - Mit AsyncStorage für lokales Caching
✅ **Native Performance** - React Native + Expo

## 📱 Features im Detail

### Core Features
- **Dashboard** - Überblick über alle deine Daten
- **Notes** - Erstellen, bearbeiten, durchsuchen von Markdown-Notizen
- **Tasks** - Todo-Listen mit Prioritäten
- **Projects** - Projekt-Management
- **Ideas** - Ideensammlung
- **Habits** - Habit-Tracking mit Streaks
- **Snippets** - Code-Snippet Bibliothek
- **Search** - Volltext-Suche über alle Notizen

### Technische Features
- **Authentication** - Login/Register mit 2FA Support
- **End-to-End Encryption** - Client-seitige Verschlüsselung
- **Responsive Design** - Optimiert für Phone & Tablet
- **Native Navigation** - Intuitive Tab & Stack Navigation
- **Dark Mode Ready** - Vorbereitet für Dark Mode Support

## 🛠 Setup & Installation

### Voraussetzungen

```bash
# Node.js und npm müssen installiert sein
node --version  # v18 oder höher
npm --version   # v9 oder höher

# Für iOS-Entwicklung (nur macOS):
- Xcode installiert
- iOS Simulator

# Für Android-Entwicklung:
- Android Studio installiert
- Android Emulator oder physisches Gerät
```

### Installation

1. **Dependencies installieren**
```bash
cd mobile
npm install
```

2. **Backend API URL konfigurieren**

Bearbeite `app.json` und setze die API URL:
```json
{
  "expo": {
    "extra": {
      "apiUrl": "http://YOUR_IP:8000"
    }
  }
}
```

**Wichtig**: Verwende NICHT `localhost` für mobile Geräte!
- iOS Simulator: `http://localhost:8000`
- Android Emulator: `http://10.0.2.2:8000`
- Physisches Gerät: `http://YOUR_LOCAL_IP:8000` (z.B. `http://192.168.1.100:8000`)

### Development

```bash
# Expo Development Server starten
npm start

# Für iOS (nur macOS)
npm run ios

# Für Android
npm run android

# Für Web (Browser)
npm run web
```

### Mit Expo Go App testen (Einfachste Methode)

1. **Expo Go App installieren**
   - iOS: https://apps.apple.com/app/expo-go/id982107779
   - Android: https://play.google.com/store/apps/details?id=host.exp.exponent

2. **Development Server starten**
```bash
npm start
```

3. **QR Code scannen**
   - iOS: Mit der Kamera-App
   - Android: Mit der Expo Go App

## 📦 Build & Deployment

### iOS Build (Nur macOS)

```bash
# EAS CLI installieren
npm install -g eas-cli

# Bei Expo anmelden
eas login

# iOS Build erstellen
eas build --platform ios
```

### Android Build

```bash
# EAS CLI installieren (falls nicht schon installiert)
npm install -g eas-cli

# Bei Expo anmelden
eas login

# Android Build erstellen
eas build --platform android

# Oder APK für direktes Testen
eas build --platform android --profile preview
```

### Lokaler Build (ohne EAS)

#### Android APK lokal bauen

```bash
# Android Build Setup
npx expo prebuild --platform android

# APK erstellen
cd android
./gradlew assembleRelease

# APK findest du unter:
# android/app/build/outputs/apk/release/app-release.apk
```

## 🎨 Responsive Design

Die App passt sich automatisch an verschiedene Bildschirmgrößen an:

- **Phone (< 768px)**: Einspaltiges Layout
- **Tablet (≥ 768px)**: Zweispaltiges Grid-Layout für bessere Übersicht

Beispiel im Code:
```typescript
const { width } = useWindowDimensions();
const isTablet = width >= 768;
```

## 🔐 Sicherheit

- **E2E Verschlüsselung**: Notizen werden client-seitig verschlüsselt
- **Secure Storage**: Tokens werden sicher in AsyncStorage gespeichert
- **2FA Support**: Two-Factor Authentication wird unterstützt
- **JWT Authentication**: Sichere Token-basierte Authentifizierung

## 🧪 Testing

```bash
# Type checking
npm run type-check

# Linting
npm run lint
```

## 📁 Projekt-Struktur

```
mobile/
├── App.tsx                 # Main App Entry Point
├── app.json               # Expo Konfiguration
├── package.json           # Dependencies
├── tsconfig.json          # TypeScript Config
└── src/
    ├── contexts/
    │   └── AuthContext.tsx      # Authentication Context
    ├── services/
    │   ├── api.ts              # API Client
    │   └── encryption.ts       # Encryption Service
    ├── navigation/
    │   └── AppNavigator.tsx    # Navigation Setup
    ├── screens/
    │   ├── LoginScreen.tsx
    │   ├── DashboardScreen.tsx
    │   ├── NotesListScreen.tsx
    │   ├── NoteEditorScreen.tsx
    │   ├── TasksScreen.tsx
    │   ├── ProjectsScreen.tsx
    │   ├── IdeasScreen.tsx
    │   ├── HabitsScreen.tsx
    │   ├── SnippetsScreen.tsx
    │   ├── SettingsScreen.tsx
    │   └── SearchScreen.tsx
    └── types/
        └── index.ts            # TypeScript Definitionen
```

## 🔧 Troubleshooting

### Backend ist nicht erreichbar

**Problem**: "Network request failed" oder "Failed to fetch"

**Lösung**:
1. Backend läuft und ist erreichbar: `curl http://localhost:8000`
2. Richtige IP-Adresse verwenden (siehe Setup)
3. Firewall/Antivirus prüfen
4. Bei Android: 10.0.2.2 statt localhost

### Expo Build Fehler

**Problem**: Build schlägt fehl

**Lösung**:
```bash
# Cache löschen
expo start -c

# Node Modules neu installieren
rm -rf node_modules
npm install
```

### TypeScript Fehler

**Lösung**:
```bash
# TypeScript Cache löschen
rm -rf .expo
npm run type-check
```

## 🚀 Nächste Schritte

### Features in Entwicklung
- [ ] Offline-First mit lokaler Datenbank
- [ ] Push-Notifications für Tasks
- [ ] Dark Mode
- [ ] Biometrische Authentifizierung
- [ ] Voice Notes
- [ ] Graph View (Visualisierung der Notizen-Verbindungen)
- [ ] Markdown-Preview mit Syntax-Highlighting
- [ ] Attachments/Bilder-Upload

### Verbesserungen
- [ ] Unit Tests
- [ ] E2E Tests mit Detox
- [ ] Performance-Optimierung
- [ ] Accessibility (A11y) Verbesserungen

## 📝 API Endpoints

Die App nutzt folgende Backend-Endpoints:

```
POST   /api/auth/login
POST   /api/auth/register
GET    /api/auth/me
GET    /api/notes
GET    /api/notes/{name}
POST   /api/notes
PUT    /api/notes/{name}
DELETE /api/notes/{name}
GET    /api/search
GET    /api/tags
GET    /api/graph
GET    /api/tasks
POST   /api/tasks
PUT    /api/tasks/{id}
DELETE /api/tasks/{id}
GET    /api/projects
POST   /api/projects
PUT    /api/projects/{id}
DELETE /api/projects/{id}
GET    /api/ideas
POST   /api/ideas
PUT    /api/ideas/{id}
DELETE /api/ideas/{id}
GET    /api/habits
POST   /api/habits
PUT    /api/habits/{id}
DELETE /api/habits/{id}
POST   /api/habits/{id}/complete
GET    /api/snippets
POST   /api/snippets
PUT    /api/snippets/{id}
DELETE /api/snippets/{id}
```

## 🤝 Contributing

Contributions sind willkommen! Bitte erstelle einen Pull Request.

## 📄 License

MIT License - Siehe LICENSE Datei

## 💡 Support

Bei Fragen oder Problemen:
1. Issues auf GitHub erstellen
2. Dokumentation prüfen
3. Backend-Logs prüfen

---

**Entwickelt mit ❤️ und React Native + Expo**

Think Beyond 🚀

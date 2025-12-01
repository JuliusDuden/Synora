# 🚀 SCHNELLSTART: Production Build

## Die einfachste Methode (EAS Build)

### 1. EAS CLI installieren
```powershell
npm install -g eas-cli
```

### 2. Bei Expo anmelden
```powershell
cd mobile
eas login
```

Noch kein Account? → https://expo.dev/signup (kostenlos!)

### 3. APK für Testing bauen
```powershell
eas build --platform android --profile preview
```

**Das war's!** 🎉

- ⏱️ Build dauert 10-20 Minuten
- 📱 Du bekommst einen Link zur APK
- 📥 Lade sie herunter & installiere auf deinem Gerät

### 4. Für Play Store (AAB)
```powershell
eas build --platform android --profile production
```

---

## 📱 APK installieren

### Auf dem Gerät:
1. Lade die APK aus dem EAS Build herunter
2. Aktiviere "Unbekannte Quellen" in den Einstellungen
3. Öffne die APK-Datei
4. Installiere die App

### Von PC per USB:
```powershell
# Gerät per USB verbinden
# USB-Debugging in Developer Options aktivieren
adb install pfad\zur\app.apk
```

---

## ⚙️ Was ist EAS?

**Expo Application Services** - Cloud-basiertes Build-System

**Vorteile:**
- ✅ Keine lokale Konfiguration nötig
- ✅ Kein Android Studio/Xcode erforderlich
- ✅ Automatische Signierung
- ✅ Funktioniert auf Windows, Mac, Linux
- ✅ Kostenlos für Standard-Builds

**Build-Profile:**
- `preview` → APK (zum Testen auf Geräten)
- `production` → AAB (für Play Store)

---

## 🏪 Im Play Store veröffentlichen

### Voraussetzungen:
1. **Google Play Console Account** (€25 einmalig)
2. **AAB-Datei** (von EAS Production Build)
3. **Screenshots** (min. 2)
4. **App-Icon** (512x512)
5. **Datenschutzerklärung** (URL)

### Schritte:
1. Gehe zu https://play.google.com/console
2. "Create app" klicken
3. AAB hochladen unter "Production"
4. Store-Listing ausfüllen
5. Zur Review einreichen

⏱️ Review dauert 1-7 Tage

---

## 🔧 Erweiterte Optionen

Siehe vollständige Anleitung in `PRODUCTION_BUILD.md`

### Lokaler Build (mit Android Studio):
```powershell
npx expo prebuild --platform android
cd android
.\gradlew assembleRelease
```

### Build Status prüfen:
```powershell
eas build:list
```

### Automatische Submission zum Play Store:
```powershell
eas submit --platform android
```

---

## 📋 Checkliste

Vor dem ersten Production Build:

- [ ] Backend API URL auf Production setzen (`app.json`)
- [ ] App-Name & Bundle-ID prüfen (`app.json`)
- [ ] Icon & Splash Screen hinzugefügt (`assets/`)
- [ ] Alle Features getestet
- [ ] Version-Nummer erhöht (`app.json`)

---

## 🆘 Hilfe

### Build schlägt fehl?
```powershell
# Cache löschen
eas build --platform android --profile preview --clear-cache
```

### EAS Login funktioniert nicht?
- Registriere dich erst auf https://expo.dev
- Dann: `eas login`

### Mehr Infos?
- Offizielle Docs: https://docs.expo.dev/build/introduction/
- Siehe auch: `PRODUCTION_BUILD.md`

---

**Los geht's! 🚀**

```powershell
npm install -g eas-cli
eas login
eas build --platform android --profile preview
```

# 📱 Step-by-Step: Deine erste Production-App

## 🎯 Ziel
Am Ende hast du eine installierbare APK-Datei auf deinem Android-Gerät!

---

## ✅ Schritt 1: EAS CLI installieren (2 Min)

Öffne PowerShell im `mobile` Ordner:

```powershell
cd "C:\Users\jisak\DevOps\2nd brain\mobile"
npm install -g eas-cli
```

**Was passiert?**
- Expo's Build-Tool wird installiert
- Dauert ca. 1-2 Minuten

**Prüfen, ob es funktioniert:**
```powershell
eas --version
```

Du solltest eine Version sehen (z.B. "5.9.0")

---

## ✅ Schritt 2: Expo Account erstellen (3 Min)

### Auf Website:
1. Gehe zu: **https://expo.dev/signup**
2. Registriere dich (kostenlos!)
   - Email eingeben
   - Username wählen
   - Passwort erstellen
3. Bestätige Email

### In PowerShell:
```powershell
eas login
```

**Eingeben:**
- Email oder Username
- Passwort

**Erfolgreich wenn:**
```
✔ Logged in as dein-username
```

---

## ✅ Schritt 3: Projekt konfigurieren (1 Min)

**Wichtig: Im `mobile` Ordner sein!**

```powershell
eas build:configure
```

**Was wird gefragt:**
1. **"Would you like to automatically create an EAS project?"** → **YES** (Y drücken)
2. Warte kurz...

**Erfolgreich wenn:**
- Datei `eas.json` wurde erstellt (ist schon da!)
- Datei `app.json` wurde aktualisiert
- Du siehst: "✔ EAS project configured"

---

## ✅ Schritt 4: APK bauen (15-20 Min)

Jetzt kommt der magische Teil! 🎉

```powershell
eas build --platform android --profile preview
```

**Was passiert jetzt:**

1. **"Would you like to automatically create credentials?"** → **YES** (Y)
2. **Warte auf "Build queued"**
3. **Dann wird der Code hochgeladen** (1-2 Min)
4. **Build läuft in der Cloud** (10-15 Min)

**Du siehst:**
```
✔ Build queued
🔗 Build URL: https://expo.dev/accounts/...
```

**Kopiere diese URL!** Du kannst den Fortschritt dort verfolgen.

### Während du wartest (optional):
- Öffne die Build-URL im Browser
- Schaue den Build-Logs zu
- Trinke einen Kaffee ☕

---

## ✅ Schritt 5: APK herunterladen (1 Min)

**Wenn der Build fertig ist:**

```
✔ Build finished
📦 APK: https://expo.dev/artifacts/...
```

### Download auf PC:
1. Kopiere die APK-URL
2. Öffne im Browser
3. Lade die APK herunter (ca. 50-70 MB)

### Oder direkt auf Phone:
1. Öffne die URL auf deinem Android-Gerät
2. Lade die APK herunter

---

## ✅ Schritt 6: App installieren (2 Min)

### Methode A: Von PC auf Phone

**Per USB-Kabel:**

1. **Phone vorbereiten:**
   - Gehe zu: Einstellungen → Über das Telefon
   - Tippe 7x auf "Build-Nummer"
   - "Entwickleroptionen" aktiviert!
   - Gehe zurück zu Einstellungen → Entwickleroptionen
   - Aktiviere "USB-Debugging"

2. **Phone verbinden:**
   - USB-Kabel anschließen
   - Auf Phone: "USB-Debugging erlauben?" → OK

3. **APK installieren:**
```powershell
# Prüfe, ob Gerät erkannt wird:
adb devices

# Installiere die APK:
adb install pfad\zur\heruntergeladenen\app.apk
```

**Beispiel:**
```powershell
adb install C:\Users\jisak\Downloads\synora-mobile-xxx.apk
```

### Methode B: Direkt auf Phone

1. **APK auf Phone herunterladen** (siehe Schritt 5)

2. **Installation erlauben:**
   - Einstellungen → Sicherheit
   - Aktiviere "Unbekannte Quellen" oder "Apps aus dieser Quelle installieren"

3. **APK öffnen:**
   - Gehe zu Downloads
   - Tippe auf die APK-Datei
   - "Installieren" → Fertig!

---

## ✅ Schritt 7: App testen! 🎉

1. **App öffnen** auf deinem Gerät
2. **Backend muss laufen:**
   ```powershell
   cd "C:\Users\jisak\DevOps\2nd brain\backend"
   .\venv\Scripts\Activate.ps1
   python app.py
   ```

3. **In der App:**
   - Login mit deinem Account
   - Teste alle Features
   - Erstelle eine Notiz
   - Füge einen Task hinzu
   - Durchsuche deine Notes

---

## 🎯 Du hast es geschafft!

Du hast jetzt:
- ✅ Eine produktionsreife Android-App
- ✅ Die auf jedem Android-Gerät läuft
- ✅ Die du mit Freunden teilen kannst

---

## 🚀 Nächste Schritte (Optional)

### App im Play Store veröffentlichen

**Für Play Store brauchst du AAB statt APK:**

```powershell
eas build --platform android --profile production
```

**Dann:**
1. Google Play Console Account erstellen (€25)
2. AAB hochladen
3. Store-Listing ausfüllen
4. Zur Review einreichen
5. Warte 1-7 Tage
6. App ist im Play Store! 🎉

Siehe: **PRODUCTION_BUILD.md** für Details

### App aktualisieren

Wenn du Änderungen machst:

1. **Version erhöhen** in `app.json`:
```json
{
  "version": "1.0.1",
  "android": {
    "versionCode": 2
  }
}
```

2. **Neuen Build erstellen:**
```powershell
eas build --platform android --profile preview
```

3. **Neue APK installieren** (überschreibt die alte)

---

## 🐛 Häufige Probleme

### "eas: command not found"
```powershell
npm install -g eas-cli
# PowerShell NEUSTARTEN
```

### "Not logged in"
```powershell
eas login
```

### "Build failed"
- Prüfe Build-Logs auf der Expo-Website
- Oft: `npm install` im mobile/ Ordner ausführen
- Dann nochmal: `eas build ...`

### APK installiert nicht
- "Unbekannte Quellen" aktivieren
- Oder per USB: `adb install -r pfad\zur\app.apk` (-r = replace)

### App verbindet nicht zum Backend
- Backend läuft auf 0.0.0.0:8000?
- Phone und PC im gleichen WLAN?
- Firewall?
- API URL in `app.json` korrekt?

---

## 📞 Hilfe

Siehe auch:
- **BUILD_QUICKSTART.md** - Kurzübersicht
- **PRODUCTION_BUILD.md** - Detaillierte Anleitung
- **BACKEND_SETUP.md** - Backend-Konfiguration

---

## 🎉 Zusammenfassung

**In 5 Schritten zur Production-App:**

```powershell
# 1. EAS installieren
npm install -g eas-cli

# 2. Anmelden
cd mobile
eas login

# 3. Konfigurieren
eas build:configure

# 4. Bauen
eas build --platform android --profile preview

# 5. Warten (15 Min) → Download → Installieren
```

**Fertig!** 🚀

Deine App läuft jetzt auf einem echten Android-Gerät!

# 🚀 Production Build Guide - Android

## Schnellste Methode: Expo EAS (Empfohlen)

### Schritt 1: EAS CLI installieren

```powershell
npm install -g eas-cli
```

### Schritt 2: Bei Expo anmelden

```powershell
cd mobile
eas login
```

Wenn du noch keinen Account hast: https://expo.dev/signup

### Schritt 3: Projekt konfigurieren

```powershell
eas build:configure
```

Dies erstellt automatisch `eas.json` mit Build-Konfigurationen.

### Schritt 4: Android Build starten

#### Für Play Store (Production):
```powershell
eas build --platform android --profile production
```

#### Für direktes Testen (APK):
```powershell
eas build --platform android --profile preview
```

**Was passiert jetzt?**
- ✅ Code wird zu Expo hochgeladen
- ✅ Build läuft in der Cloud (kostenlos!)
- ✅ Du bekommst eine Download-URL für die APK/AAB
- ⏱️ Dauert ca. 10-20 Minuten

### Schritt 5: APK herunterladen & installieren

Nach dem Build:
1. Du bekommst einen Link zur APK/AAB
2. Lade sie herunter
3. Übertrage auf dein Android-Gerät
4. Installiere die APK

**Oder direkt auf dem Phone:**
```powershell
eas build --platform android --profile preview --local
```

---

## 🛠️ Option 2: Lokaler Build mit Android Studio

### Vorbereitung

#### 1. Environment Variables setzen

Füge zu deinen System-Umgebungsvariablen hinzu:

```powershell
# PowerShell als Administrator
[System.Environment]::SetEnvironmentVariable('ANDROID_HOME', 'C:\Users\jisak\AppData\Local\Android\Sdk', 'User')
[System.Environment]::SetEnvironmentVariable('JAVA_HOME', 'C:\Program Files\Android\Android Studio\jbr', 'User')
```

**Pfad anpassen** falls Android SDK woanders installiert ist!

#### 2. PATH aktualisieren

```powershell
$currentPath = [System.Environment]::GetEnvironmentVariable('Path', 'User')
$newPath = "$currentPath;$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\tools"
[System.Environment]::SetEnvironmentVariable('Path', $newPath, 'User')
```

#### 3. PowerShell neustarten, dann prüfen:

```powershell
$env:ANDROID_HOME
adb --version
```

### Native Code generieren

```powershell
cd mobile
npx expo prebuild --platform android --clean
```

Dies erstellt den `android/` Ordner mit nativen Dateien.

### Keystore erstellen (für Signierung)

```powershell
# Im mobile/ Verzeichnis
cd android\app

# Keystore generieren
keytool -genkey -v -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000

# Folge den Prompts und merke dir:
# - Keystore-Passwort
# - Key-Passwort (kann gleich sein)
# - Alias: my-key-alias
```

**⚠️ WICHTIG**: Bewahre diese Datei sicher auf! Du brauchst sie für alle zukünftigen Updates!

### Gradle konfigurieren

Erstelle `android/gradle.properties` (oder bearbeite):

```properties
MYAPP_RELEASE_STORE_FILE=my-release-key.keystore
MYAPP_RELEASE_KEY_ALIAS=my-key-alias
MYAPP_RELEASE_STORE_PASSWORD=dein-keystore-passwort
MYAPP_RELEASE_KEY_PASSWORD=dein-key-passwort

android.useAndroidX=true
android.enableJetifier=true
```

### Build Config anpassen

Bearbeite `android/app/build.gradle`:

```gradle
android {
    ...
    signingConfigs {
        release {
            if (project.hasProperty('MYAPP_RELEASE_STORE_FILE')) {
                storeFile file(MYAPP_RELEASE_STORE_FILE)
                storePassword MYAPP_RELEASE_STORE_PASSWORD
                keyAlias MYAPP_RELEASE_KEY_ALIAS
                keyPassword MYAPP_RELEASE_KEY_PASSWORD
            }
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

### APK/AAB bauen

#### APK (für direktes Installieren):
```powershell
cd android
.\gradlew assembleRelease
```

APK findest du unter:
```
android\app\build\outputs\apk\release\app-release.apk
```

#### AAB (für Play Store):
```powershell
cd android
.\gradlew bundleRelease
```

AAB findest du unter:
```
android\app\build\outputs\bundle\release\app-release.aab
```

### APK installieren

```powershell
# Gerät per USB verbinden, USB-Debugging aktivieren
adb install android\app\build\outputs\apk\release\app-release.apk
```

---

## 📱 Im Play Store veröffentlichen

### 1. Google Play Console Account

- Gehe zu: https://play.google.com/console
- Erstelle Developer Account (€25 einmalig)

### 2. App erstellen

1. "Create app" klicken
2. App-Details ausfüllen:
   - Name: Synora
   - Standard-Sprache: Deutsch
   - App/Spiel: App
   - Kostenlos/Kostenpflichtig

### 3. AAB hochladen

1. Gehe zu "Production" → "Create new release"
2. Lade `app-release.aab` hoch
3. Fülle Release Notes aus

### 4. Store-Listing

- **App-Name**: Synora
- **Kurzbeschreibung**: Think Beyond - Dein Second Brain
- **Vollständige Beschreibung**: [Ausführliche Beschreibung]
- **Screenshots**: Mindestens 2 (Phone + Tablet)
- **App-Icon**: 512x512 PNG
- **Feature Graphic**: 1024x500 PNG

### 5. Inhalts-Rating

Fragebogen ausfüllen für Altersfreigabe.

### 6. Datenschutzrichtlinie

URL zu deiner Datenschutzerklärung (Pflicht!)

### 7. Review einreichen

- Prüfe alle Punkte
- Reiche zur Überprüfung ein
- ⏱️ Überprüfung dauert 1-7 Tage

---

## 🍎 iOS Build (Bonus - nur auf macOS möglich)

Falls du später iOS unterstützen willst:

```bash
# Auf macOS:
eas build --platform ios --profile production
```

**Anforderungen**:
- Apple Developer Account ($99/Jahr)
- macOS für lokale Builds (EAS geht ohne macOS!)

---

## 🔧 Troubleshooting

### "SDK location not found"

```powershell
# android/local.properties erstellen:
sdk.dir=C:\\Users\\jisak\\AppData\\Local\\Android\\Sdk
```

### "Gradle build failed"

```powershell
# Android Studio öffnen
# File → Sync Project with Gradle Files
# Dann nochmal versuchen
```

### "keytool not found"

```powershell
# Java JDK Pfad finden
$javaHome = "C:\Program Files\Android\Android Studio\jbr"
& "$javaHome\bin\keytool.exe" -genkey ...
```

### APK ist zu groß

- Verwende AAB statt APK für Play Store
- AAB wird automatisch optimiert
- Expo EAS macht das automatisch

---

## 📊 Build-Optionen Vergleich

| Methode | Vorteile | Nachteile |
|---------|----------|-----------|
| **EAS Build** | ✅ Einfach<br>✅ Keine lokale Konfiguration<br>✅ Cloud-basiert<br>✅ Kostenlos | ⏱️ Build dauert 10-20 Min |
| **Lokaler Build** | ✅ Volle Kontrolle<br>✅ Schneller bei Wiederholungen<br>✅ Offline möglich | ⚙️ Komplexe Setup<br>❌ Android Studio nötig |

## 🎯 Empfehlung

**Für den Anfang: Expo EAS Build!**

Warum?
- ✅ Viel einfacher
- ✅ Keine komplexe Konfiguration
- ✅ Funktioniert sofort
- ✅ Kostenlos für Standard-Builds
- ✅ Automatische Signierung

Lokaler Build nur wenn:
- Du spezielle native Module brauchst
- Du offline entwickeln musst
- Du sehr häufig buildest

---

## 🚀 Zusammenfassung: Production Build in 5 Minuten

```powershell
# 1. EAS CLI installieren
npm install -g eas-cli

# 2. Bei Expo anmelden
cd mobile
eas login

# 3. Build konfigurieren
eas build:configure

# 4. Preview Build (APK zum Testen)
eas build --platform android --profile preview

# 5. Warte auf Build (10-20 Min)
# 6. Lade APK herunter & installiere
```

**Das war's!** 🎉

---

## 📱 Nach dem Build

### APK testen
1. Übertrage APK auf Android-Gerät
2. Aktiviere "Unbekannte Quellen" in Einstellungen
3. Installiere APK
4. Teste alle Features!

### Checkliste vor Play Store:
- [ ] App funktioniert ohne Crashes
- [ ] Alle Features getestet
- [ ] Screenshots erstellt (2-8 Stück)
- [ ] App-Icon designed (512x512)
- [ ] Datenschutzerklärung geschrieben
- [ ] Store-Beschreibung verfasst
- [ ] AAB (nicht APK) hochgeladen

---

**Viel Erfolg mit deinem Production Build! 🚀**

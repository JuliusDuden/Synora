'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Moon,
  Sun,
  Download,
  Trash2,
  Database,
  Globe,
  Palette,
  UserCircle2,
  Upload,
  Save,
  Sparkles,
  CalendarDays,
  LogIn,
  LogOut,
  RefreshCw,
} from 'lucide-react';
import { useTranslation } from '@/lib/useTranslation';
import { api, uploadAttachment } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import {
  GOOGLE_AUTO_SYNC_KEY,
  clearGoogleAuth,
  clearGoogleImportedEvents,
  isGoogleTokenValid,
  readGoogleAuth,
  syncGooglePrimaryCalendar,
  writeGoogleAuth,
} from '@/lib/googleCalendarSync';

declare global {
  interface Window {
    google?: any;
  }
}

type DesignPreset = 'aurora' | 'graphite' | 'forest' | 'sunset';
type GlassLevel = 'soft' | 'balanced' | 'strong';

interface Settings {
  darkMode: boolean;
  language: string;
  designPreset: DesignPreset;
  glassLevel: GlassLevel;
}

interface ThemePalette {
  label: string;
  subtitle: string;
  light: {
    background: string;
    foreground: string;
    sidebar: string;
    brand: [string, string, string];
    stroke: string;
  };
  dark: {
    background: string;
    foreground: string;
    sidebar: string;
    brand: [string, string, string];
    stroke: string;
  };
}

interface GlassPalette {
  light: {
    surface: string;
    surfaceStrong: string;
    shadow: string;
    glow: string;
  };
  dark: {
    surface: string;
    surfaceStrong: string;
    shadow: string;
    glow: string;
  };
}

const DEFAULT_SETTINGS: Settings = {
  darkMode: false,
  language: 'de',
  designPreset: 'aurora',
  glassLevel: 'balanced',
};

const GOOGLE_SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

const THEME_PRESETS: Record<DesignPreset, ThemePalette> = {
  aurora: {
    label: 'Aurora',
    subtitle: 'Klar, blau und ruhig',
    light: {
      background: '#eef2f8',
      foreground: '#111827',
      sidebar: '#e9eef6',
      brand: ['#1f7cff', '#36c1ff', '#9be8ff'],
      stroke: 'rgba(255, 255, 255, 0.62)',
    },
    dark: {
      background: '#0a1323',
      foreground: '#e7eefc',
      sidebar: '#0d1b33',
      brand: ['#71a7ff', '#69ddff', '#86f4c3'],
      stroke: 'rgba(192, 210, 240, 0.28)',
    },
  },
  graphite: {
    label: 'Graphite',
    subtitle: 'Neutral und edel',
    light: {
      background: '#edf0f4',
      foreground: '#111827',
      sidebar: '#e6ebf1',
      brand: ['#4f6fff', '#7d8cff', '#c2ccff'],
      stroke: 'rgba(255, 255, 255, 0.6)',
    },
    dark: {
      background: '#0c111c',
      foreground: '#e8edf7',
      sidebar: '#11182a',
      brand: ['#8aa0ff', '#6cb8ff', '#9de4ff'],
      stroke: 'rgba(190, 205, 235, 0.26)',
    },
  },
  forest: {
    label: 'Forest',
    subtitle: 'Frisch und natürlich',
    light: {
      background: '#edf6f2',
      foreground: '#10211b',
      sidebar: '#e1f1e8',
      brand: ['#0ea5a2', '#34d399', '#b7f7d6'],
      stroke: 'rgba(255, 255, 255, 0.58)',
    },
    dark: {
      background: '#091813',
      foreground: '#e4faf2',
      sidebar: '#0d241d',
      brand: ['#2dd4bf', '#34d399', '#a7f3d0'],
      stroke: 'rgba(180, 225, 206, 0.26)',
    },
  },
  sunset: {
    label: 'Sunset',
    subtitle: 'Warm und kräftig',
    light: {
      background: '#f6efe8',
      foreground: '#24130d',
      sidebar: '#f0e3d9',
      brand: ['#ff7a59', '#ff9f43', '#ffd27d'],
      stroke: 'rgba(255, 255, 255, 0.58)',
    },
    dark: {
      background: '#1a1010',
      foreground: '#fff2ea',
      sidebar: '#281713',
      brand: ['#ff9568', '#ffb36a', '#ffd27d'],
      stroke: 'rgba(243, 204, 186, 0.26)',
    },
  },
};

const GLASS_LEVELS: Record<GlassLevel, GlassPalette> = {
  soft: {
    light: {
      surface: 'rgba(255, 255, 255, 0.52)',
      surfaceStrong: 'rgba(255, 255, 255, 0.68)',
      shadow: '0 10px 26px rgba(20, 30, 55, 0.1)',
      glow: '0 1px 0 rgba(255, 255, 255, 0.72) inset, 0 18px 40px rgba(73, 122, 203, 0.08)',
    },
    dark: {
      surface: 'rgba(12, 24, 46, 0.52)',
      surfaceStrong: 'rgba(14, 30, 56, 0.66)',
      shadow: '0 10px 26px rgba(2, 6, 18, 0.34)',
      glow: '0 1px 0 rgba(178, 203, 245, 0.16) inset, 0 18px 44px rgba(12, 46, 94, 0.18)',
    },
  },
  balanced: {
    light: {
      surface: 'rgba(255, 255, 255, 0.64)',
      surfaceStrong: 'rgba(255, 255, 255, 0.8)',
      shadow: '0 14px 40px rgba(20, 30, 55, 0.14)',
      glow: '0 1px 0 rgba(255, 255, 255, 0.8) inset, 0 24px 60px rgba(73, 122, 203, 0.16)',
    },
    dark: {
      surface: 'rgba(12, 24, 46, 0.66)',
      surfaceStrong: 'rgba(14, 30, 56, 0.8)',
      shadow: '0 16px 46px rgba(2, 6, 18, 0.48)',
      glow: '0 1px 0 rgba(178, 203, 245, 0.22) inset, 0 24px 64px rgba(12, 46, 94, 0.32)',
    },
  },
  strong: {
    light: {
      surface: 'rgba(255, 255, 255, 0.74)',
      surfaceStrong: 'rgba(255, 255, 255, 0.88)',
      shadow: '0 18px 48px rgba(20, 30, 55, 0.18)',
      glow: '0 1px 0 rgba(255, 255, 255, 0.9) inset, 0 28px 72px rgba(73, 122, 203, 0.2)',
    },
    dark: {
      surface: 'rgba(12, 24, 46, 0.76)',
      surfaceStrong: 'rgba(14, 30, 56, 0.88)',
      shadow: '0 18px 48px rgba(2, 6, 18, 0.58)',
      glow: '0 1px 0 rgba(178, 203, 245, 0.28) inset, 0 28px 72px rgba(12, 46, 94, 0.42)',
    },
  },
};

function resolveAvatarSrc(avatarUrl?: string | null) {
  return avatarUrl || '';
}

function applyDesignTokens(settings: Settings) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const mode = settings.darkMode ? 'dark' : 'light';
  const palette = THEME_PRESETS[settings.designPreset] ?? THEME_PRESETS.aurora;
  const glass = GLASS_LEVELS[settings.glassLevel] ?? GLASS_LEVELS.balanced;
  const theme = palette[mode];
  const glassTokens = glass[mode];

  root.style.setProperty('--background', theme.background);
  root.style.setProperty('--foreground', theme.foreground);
  root.style.setProperty('--sidebar-bg', theme.sidebar);
  root.style.setProperty('--brand-1', theme.brand[0]);
  root.style.setProperty('--brand-2', theme.brand[1]);
  root.style.setProperty('--brand-3', theme.brand[2]);
  root.style.setProperty('--border-color', theme.stroke);
  root.style.setProperty('--surface-glass', glassTokens.surface);
  root.style.setProperty('--surface-glass-strong', glassTokens.surfaceStrong);
  root.style.setProperty('--surface-stroke', theme.stroke);
  root.style.setProperty('--surface-shadow', glassTokens.shadow);
  root.style.setProperty('--surface-glow', glassTokens.glow);

  if (settings.darkMode) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

export default function SettingsView() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [profileName, setProfileName] = useState('');
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileStatus, setProfileStatus] = useState('');
  const [googleAuth, setGoogleAuth] = useState(() => readGoogleAuth());
  const [googleSyncing, setGoogleSyncing] = useState(false);
  const [googleStatus, setGoogleStatus] = useState('');
  const [googleLastSyncAt, setGoogleLastSyncAt] = useState<string>('');
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const googleTokenClientRef = useRef<any>(null);

  useEffect(() => {
    loadSettings();

    const handleDarkModeChange = (event: any) => {
      const newDarkMode = event.detail?.darkMode;
      if (newDarkMode !== undefined) {
        setSettings((prev) => {
          const updated = { ...prev, darkMode: newDarkMode };
          applyDesignTokens(updated);
          localStorage.setItem('settings', JSON.stringify(updated));
          return updated;
        });
      }
    };

    window.addEventListener('darkModeChange', handleDarkModeChange);
    return () => window.removeEventListener('darkModeChange', handleDarkModeChange);
  }, []);

  useEffect(() => {
    if (user) {
      setProfileName(user.username || '');
      setProfileAvatarUrl(user.avatar_url || null);
    }
  }, [user]);

  useEffect(() => {
    try {
      const rawAuto = localStorage.getItem(GOOGLE_AUTO_SYNC_KEY);
      setAutoSyncEnabled(rawAuto === null ? true : rawAuto === 'true');
      const metaRaw = localStorage.getItem('calendar_google_sync_meta_v1');
      if (metaRaw) {
        const parsed = JSON.parse(metaRaw) as { lastSyncedAt?: string };
        setGoogleLastSyncAt(parsed.lastSyncedAt || '');
      }
    } catch {
      setAutoSyncEnabled(true);
    }

    const onAuthChanged = () => {
      setGoogleAuth(readGoogleAuth());
    };
    const onSyncMetaChanged = () => {
      try {
        const metaRaw = localStorage.getItem('calendar_google_sync_meta_v1');
        const parsed = metaRaw ? (JSON.parse(metaRaw) as { lastSyncedAt?: string }) : {};
        setGoogleLastSyncAt(parsed.lastSyncedAt || '');
      } catch {
        setGoogleLastSyncAt('');
      }
    };

    window.addEventListener('googleAuthChanged', onAuthChanged);
    window.addEventListener('googleSyncMetaUpdated', onSyncMetaChanged);
    return () => {
      window.removeEventListener('googleAuthChanged', onAuthChanged);
      window.removeEventListener('googleSyncMetaUpdated', onSyncMetaChanged);
    };
  }, []);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    const initTokenClient = () => {
      if (!window.google?.accounts?.oauth2) return;
      googleTokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: GOOGLE_SCOPE,
        callback: async (response: any) => {
          if (!response?.access_token) return;
          const expiresIn = Number(response.expires_in || 3600);
          const authState = {
            accessToken: response.access_token,
            expiresAt: Date.now() + expiresIn * 1000,
            connectedAt: new Date().toISOString(),
          };
          writeGoogleAuth(authState);
          setGoogleAuth(authState);
          window.dispatchEvent(new Event('googleAuthChanged'));
          setGoogleStatus('Google verbunden. Initialer Sync laeuft...');
          try {
            setGoogleSyncing(true);
            const importedCount = await syncGooglePrimaryCalendar(response.access_token);
            const metaRaw = localStorage.getItem('calendar_google_sync_meta_v1');
            const parsed = metaRaw ? (JSON.parse(metaRaw) as { lastSyncedAt?: string }) : {};
            setGoogleLastSyncAt(parsed.lastSyncedAt || '');
            setGoogleStatus(`Sync erfolgreich: ${importedCount} Termine importiert.`);
            window.dispatchEvent(new Event('calendarEventsUpdated'));
            window.dispatchEvent(new Event('googleSyncMetaUpdated'));
          } catch (error: any) {
            if (error?.status === 401) {
              clearGoogleAuth();
              setGoogleAuth(null);
              setGoogleStatus('Google Verbindung abgelaufen. Bitte erneut verbinden.');
              window.dispatchEvent(new Event('googleAuthChanged'));
            } else {
              setGoogleStatus(error instanceof Error ? error.message : 'Google Sync fehlgeschlagen.');
            }
          } finally {
            setGoogleSyncing(false);
          }
        },
      });
    };

    const existing = document.querySelector('script[data-google-gis="true"]') as HTMLScriptElement | null;
    if (existing && window.google?.accounts?.oauth2) {
      initTokenClient();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.googleGis = 'true';
    script.onload = initTokenClient;
    document.body.appendChild(script);
  }, []);

  const loadSettings = () => {
    const saved = localStorage.getItem('settings');
    let nextSettings: Settings = DEFAULT_SETTINGS;

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        nextSettings = {
          ...DEFAULT_SETTINGS,
          ...parsed,
          designPreset: parsed.designPreset || parsed.design?.preset || DEFAULT_SETTINGS.designPreset,
          glassLevel: parsed.glassLevel || parsed.design?.glassLevel || DEFAULT_SETTINGS.glassLevel,
        };
      } catch {
        nextSettings = DEFAULT_SETTINGS;
      }
    } else {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      nextSettings = { ...DEFAULT_SETTINGS, darkMode: isDark };
    }

    setSettings(nextSettings);
    localStorage.setItem('settings', JSON.stringify(nextSettings));
    applyDesignTokens(nextSettings);
  };

  const saveSettings = (newSettings: Settings) => {
    localStorage.setItem('settings', JSON.stringify(newSettings));
    setSettings(newSettings);
    applyDesignTokens(newSettings);
    window.dispatchEvent(new Event('languageChange'));
  };

  const toggleDarkMode = () => {
    const updated = { ...settings, darkMode: !settings.darkMode };
    saveSettings(updated);
    window.dispatchEvent(new CustomEvent('darkModeChange', { detail: { darkMode: updated.darkMode } }));
  };

  const changeLanguage = (language: string) => {
    saveSettings({ ...settings, language });
  };

  const changeDesignPreset = (designPreset: DesignPreset) => {
    saveSettings({ ...settings, designPreset });
  };

  const changeGlassLevel = (glassLevel: GlassLevel) => {
    saveSettings({ ...settings, glassLevel });
  };

  const handleAvatarUpload = async (file: File) => {
    setProfileStatus('');
    setProfileSaving(true);
    try {
      const result = await uploadAttachment(file);
      await saveProfile({ avatar_url: result.url });
      setProfileAvatarUrl(result.url);
    } catch (error) {
      console.error('Failed to upload avatar:', error);
      setProfileStatus('Profilbild konnte nicht hochgeladen werden.');
    } finally {
      setProfileSaving(false);
    }
  };

  const saveProfile = async (overrides?: { avatar_url?: string | null; username?: string }) => {
    setProfileSaving(true);
    setProfileStatus('');
    try {
      const updated = await api.updateProfile({
        username: (overrides?.username ?? profileName).trim(),
        avatar_url: overrides?.avatar_url !== undefined ? overrides.avatar_url || null : profileAvatarUrl,
      });

      localStorage.setItem('auth_user', JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('profileUpdated', { detail: { user: updated } }));
      setProfileName(updated.username);
      setProfileAvatarUrl(updated.avatar_url || null);
      setProfileStatus('Profil gespeichert.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Profil konnte nicht gespeichert werden.';
      setProfileStatus(message);
    } finally {
      setProfileSaving(false);
    }
  };

  const languages = [
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
  ];

  const exportData = () => {
    const data = {
      notes: localStorage.getItem('notes'),
      projects: localStorage.getItem('projects'),
      tasks: localStorage.getItem('tasks'),
      ideas: localStorage.getItem('ideas'),
      habits: localStorage.getItem('habits'),
      settings: localStorage.getItem('settings'),
      exportDate: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `synora-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const clearAllData = () => {
    if (confirm(t.settings.deleteConfirm)) {
      if (confirm(t.settings.deleteConfirmText)) {
        localStorage.removeItem('notes');
        localStorage.removeItem('projects');
        localStorage.removeItem('tasks');
        localStorage.removeItem('ideas');
        localStorage.removeItem('habits');
        alert(t.settings.dataDeleted);
        window.location.reload();
      }
    }
  };

  const getStorageSize = () => {
    let total = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage[key].length + key.length;
      }
    }
    return (total / 1024).toFixed(2);
  };

  const handleManualGoogleSync = async (tokenOverride?: string) => {
    const auth = tokenOverride ? { accessToken: tokenOverride } : googleAuth;
    if (!auth?.accessToken) {
      setGoogleStatus('Bitte zuerst Google verbinden.');
      return;
    }
    try {
      setGoogleSyncing(true);
      const importedCount = await syncGooglePrimaryCalendar(auth.accessToken);
      const metaRaw = localStorage.getItem('calendar_google_sync_meta_v1');
      const parsed = metaRaw ? (JSON.parse(metaRaw) as { lastSyncedAt?: string }) : {};
      setGoogleLastSyncAt(parsed.lastSyncedAt || '');
      setGoogleStatus(`Sync erfolgreich: ${importedCount} Termine importiert.`);
      window.dispatchEvent(new Event('calendarEventsUpdated'));
      window.dispatchEvent(new Event('googleSyncMetaUpdated'));
    } catch (error: any) {
      if (error?.status === 401) {
        clearGoogleAuth();
        setGoogleAuth(null);
        setGoogleStatus('Google Verbindung abgelaufen. Bitte erneut verbinden.');
        window.dispatchEvent(new Event('googleAuthChanged'));
        return;
      }
      setGoogleStatus(error instanceof Error ? error.message : 'Google Sync fehlgeschlagen.');
    } finally {
      setGoogleSyncing(false);
    }
  };

  const handleGoogleConnect = () => {
    if (!GOOGLE_CLIENT_ID) {
      setGoogleStatus('NEXT_PUBLIC_GOOGLE_CLIENT_ID fehlt. Bitte in frontend/.env.local setzen.');
      return;
    }
    if (!googleTokenClientRef.current) {
      setGoogleStatus('Google SDK wird noch geladen. Bitte kurz warten.');
      return;
    }
    googleTokenClientRef.current.requestAccessToken({ prompt: 'consent' });
  };

  const handleGoogleDisconnect = async () => {
    const token = googleAuth?.accessToken;
    if (token) {
      try {
        await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
      } catch {
        // ignore revoke failures
      }
    }

    clearGoogleAuth();
    clearGoogleImportedEvents();
    setGoogleAuth(null);
    setGoogleStatus('Google Kalender wurde getrennt.');
    window.dispatchEvent(new Event('googleAuthChanged'));
    window.dispatchEvent(new Event('calendarEventsUpdated'));
  };

  const toggleAutoSync = () => {
    const next = !autoSyncEnabled;
    setAutoSyncEnabled(next);
    localStorage.setItem(GOOGLE_AUTO_SYNC_KEY, String(next));
    window.dispatchEvent(new Event('calendarGoogleAutoSyncChanged'));
  };

  const currentPalette = THEME_PRESETS[settings.designPreset];
  const avatarSrc = resolveAvatarSrc(profileAvatarUrl);

  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-950">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">
            {t.settings.title}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t.settings.subtitle}</p>
        </div>

        <div className="glass-panel rounded-lg border border-white/60 dark:border-slate-700/50">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Profil</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Benutzername und Profilbild werden im Konto gespeichert.
            </p>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="relative w-20 h-20 rounded-full overflow-hidden border border-white/60 dark:border-slate-700/60 bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm">
                {avatarSrc ? (
                  <img src={avatarSrc} alt="Profilbild" className="w-full h-full object-cover" />
                ) : (
                  <UserCircle2 size={44} className="text-gray-400 dark:text-gray-500" />
                )}
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
                    placeholder="Benutzername"
                  />
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        void handleAvatarUpload(file);
                      }
                      e.target.value = '';
                    }}
                  />
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white text-sm font-medium transition-colors"
                    disabled={profileSaving}
                  >
                    <Upload size={16} />
                    Icon hochladen
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => void saveProfile()}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 text-sm font-medium transition-colors"
                    disabled={profileSaving}
                  >
                    <Save size={16} />
                    Profil speichern
                  </button>
                  {avatarSrc && (
                    <button
                      onClick={() => {
                        setProfileAvatarUrl(null);
                        void saveProfile({ avatar_url: null });
                      }}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-950/60 text-red-700 dark:text-red-300 text-sm font-medium transition-colors"
                      disabled={profileSaving}
                    >
                      <Trash2 size={16} />
                      Icon entfernen
                    </button>
                  )}
                </div>
                {profileStatus && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">{profileStatus}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-lg border border-white/60 dark:border-slate-700/50">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">{t.settings.appearance}</h2>
          </div>
          <div className="p-4 space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {settings.darkMode ? <Moon size={20} className="text-gray-400" /> : <Sun size={20} className="text-gray-400" />}
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{t.settings.darkMode}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t.settings.darkModeDesc}</p>
                </div>
              </div>
              <button
                onClick={toggleDarkMode}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.darkMode ? 'bg-gray-900 dark:bg-white' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-gray-900 transition-transform ${
                    settings.darkMode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3 mb-3">
                <Globe size={20} className="text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{t.settings.language}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t.settings.languageDesc}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => changeLanguage(lang.code)}
                    className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      settings.language === lang.code
                        ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    <span className="text-lg">{lang.flag}</span>
                    <span>{lang.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 dark:border-gray-800 space-y-3">
              <div className="flex items-center gap-3">
                <Palette size={20} className="text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Farbschemata</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Wähle einen visuellen Stil für Hintergrund, Akzent und Oberfläche.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(Object.entries(THEME_PRESETS) as Array<[DesignPreset, ThemePalette]>).map(([preset, palette]) => {
                  const isActive = settings.designPreset === preset;
                  const swatch = settings.darkMode ? palette.dark.brand : palette.light.brand;
                  return (
                    <button
                      key={preset}
                      onClick={() => changeDesignPreset(preset)}
                      className={`text-left rounded-2xl border p-4 transition-all ${
                        isActive
                          ? 'border-gray-900 dark:border-white bg-gray-50 dark:bg-gray-800/60 shadow-sm'
                          : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 hover:border-gray-400 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">{palette.label}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{palette.subtitle}</p>
                        </div>
                        <Sparkles size={16} className={isActive ? 'text-indigo-500' : 'text-gray-300 dark:text-gray-600'} />
                      </div>
                      <div className="flex gap-2">
                        {swatch.map((color) => (
                          <span key={color} className="h-3 flex-1 rounded-full" style={{ backgroundColor: color }} />
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 dark:border-gray-800 space-y-3">
              <div className="flex items-center gap-3">
                <Sparkles size={20} className="text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Glas-Intensität</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Wie stark die Panels, Schatten und Transparenz wirken.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {([
                  ['soft', 'Soft'],
                  ['balanced', 'Balanced'],
                  ['strong', 'Strong'],
                ] as Array<[GlassLevel, string]>).map(([level, label]) => {
                  const isActive = settings.glassLevel === level;
                  return (
                    <button
                      key={level}
                      onClick={() => changeGlassLevel(level)}
                      className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors border ${
                        isActive
                          ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900 dark:border-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white border-transparent hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <div className="rounded-2xl p-4 border border-white/60 dark:border-slate-700/50 glass-panel-strong">
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
                  <span>Aktive Vorschau</span>
                  <span>{currentPalette.label}</span>
                </div>
                <div className="h-3 rounded-full mb-2" style={{ background: `linear-gradient(90deg, ${settings.darkMode ? currentPalette.dark.brand[0] : currentPalette.light.brand[0]}, ${settings.darkMode ? currentPalette.dark.brand[1] : currentPalette.light.brand[1]}, ${settings.darkMode ? currentPalette.dark.brand[2] : currentPalette.light.brand[2]})` }} />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Die Änderungen greifen sofort und bleiben im Browser gespeichert.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-lg border border-white/60 dark:border-slate-700/50">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Kalender Sync</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Google Account verbinden und automatische Synchronisierung steuern.
            </p>
          </div>
          <div className="p-4 space-y-4">
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/40 p-3">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="inline-flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
                  <CalendarDays size={16} /> Google Calendar
                </div>
                {isGoogleTokenValid(googleAuth) ? (
                  <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">Verbunden</span>
                ) : (
                  <span className="text-[11px] px-2 py-0.5 rounded bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300">Getrennt</span>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Termine werden aus dem Primary Calendar importiert und im Synora Kalender aktualisiert.
              </p>
              {googleLastSyncAt && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Letzter Sync: {new Date(googleLastSyncAt).toLocaleString('de-DE')}
                </p>
              )}
              <div className="grid grid-cols-3 gap-2 mt-3">
                <button
                  onClick={handleGoogleConnect}
                  className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 text-xs font-medium transition-colors"
                  disabled={googleSyncing}
                >
                  <LogIn size={12} /> Verbinden
                </button>
                <button
                  onClick={() => {
                    void handleManualGoogleSync();
                  }}
                  className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white text-xs font-medium transition-colors"
                  disabled={!isGoogleTokenValid(googleAuth) || googleSyncing}
                >
                  <RefreshCw size={12} /> Jetzt syncen
                </button>
                <button
                  onClick={() => void handleGoogleDisconnect()}
                  className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white text-xs font-medium transition-colors"
                  disabled={!googleAuth || googleSyncing}
                >
                  <LogOut size={12} /> Trennen
                </button>
              </div>
              {!GOOGLE_CLIENT_ID && (
                <p className="text-[11px] text-amber-600 dark:text-amber-300 mt-2">
                  Hinweis: Setze NEXT_PUBLIC_GOOGLE_CLIENT_ID in frontend/.env.local
                </p>
              )}
            </div>

            <div className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/40 px-3 py-2.5">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Auto-Sync alle 10 Minuten</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Zusatzlich bei Fokuswechsel und App-Start.</p>
              </div>
              <button
                onClick={toggleAutoSync}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  autoSyncEnabled ? 'bg-gray-900 dark:bg-white' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-gray-900 transition-transform ${
                    autoSyncEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {googleStatus && <p className="text-xs text-gray-500 dark:text-gray-400">{googleStatus}</p>}
          </div>
        </div>

        <div className="glass-panel rounded-lg border border-white/60 dark:border-slate-700/50">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">{t.settings.dataManagement}</h2>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Database size={20} className="text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{t.settings.storage}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {getStorageSize()} KB {t.settings.storageUsed}
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 dark:border-gray-800 space-y-2">
              <button
                onClick={exportData}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-lg text-sm font-medium transition-colors"
              >
                <Download size={16} />
                {t.settings.exportData}
              </button>
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">{t.settings.exportDesc}</p>
            </div>

            <div className="pt-4 border-t border-gray-100 dark:border-gray-800 space-y-2">
              <button
                onClick={clearAllData}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Trash2 size={16} />
                {t.settings.deleteAll}
              </button>
              <p className="text-xs text-red-600 dark:text-red-400 text-center">{t.settings.deleteWarning}</p>
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-lg border border-white/60 dark:border-slate-700/50">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">{t.settings.about}</h2>
          </div>
          <div className="p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">{t.settings.version}</span>
              <span className="text-gray-900 dark:text-white font-medium">1.0.0</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">{t.settings.platform}</span>
              <span className="text-gray-900 dark:text-white font-medium">Web</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 pt-4 border-t border-gray-100 dark:border-gray-800">
              {t.appName} - {t.appMotto} {t.settings.description}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import LoginPage from '@/components/LoginPage';
import Navigation from '@/components/Navigation';
import Dashboard from '@/components/Dashboard';
import Sidebar from '@/components/Sidebar';
import Editor from '@/components/Editor';
import GraphView from '@/components/GraphView';
import ProjectsView from '@/components/ProjectsView';
import TasksView from '@/components/TasksView';
import IdeasView from '@/components/IdeasView';
import HabitsView from '@/components/HabitsView';
import CalendarView from '@/components/CalendarView';
import SettingsView from '@/components/SettingsView';
import SnippetsView from '@/components/SnippetsView';
import ConnectsView from '@/components/ConnectsView';
import SearchBar from '@/components/SearchBar';
import NewNoteDialog from '@/components/NewNoteDialog';
import { Menu, Search, Moon, Sun, Plus, Settings, LogOut } from 'lucide-react';
import { api } from '@/lib/api';
import { useTranslation } from '@/lib/useTranslation';
import {
  GOOGLE_AUTO_SYNC_KEY,
  clearGoogleAuth,
  isGoogleTokenValid,
  readGoogleAuth,
  syncGooglePrimaryCalendar,
} from '@/lib/googleCalendarSync';

type DesignPreset = 'aurora' | 'graphite' | 'forest' | 'sunset';
type GlassLevel = 'soft' | 'balanced' | 'strong';

const THEME_PRESETS: Record<DesignPreset, any> = {
  aurora: {
    light: { background: '#eef2f8', foreground: '#111827', sidebar: '#e9eef6', brand: ['#1f7cff', '#36c1ff', '#9be8ff'], stroke: 'rgba(255, 255, 255, 0.62)' },
    dark: { background: '#0a1323', foreground: '#e7eefc', sidebar: '#0d1b33', brand: ['#71a7ff', '#69ddff', '#86f4c3'], stroke: 'rgba(192, 210, 240, 0.28)' },
  },
  graphite: {
    light: { background: '#edf0f4', foreground: '#111827', sidebar: '#e6ebf1', brand: ['#4f6fff', '#7d8cff', '#c2ccff'], stroke: 'rgba(255, 255, 255, 0.6)' },
    dark: { background: '#0c111c', foreground: '#e8edf7', sidebar: '#11182a', brand: ['#8aa0ff', '#6cb8ff', '#9de4ff'], stroke: 'rgba(190, 205, 235, 0.26)' },
  },
  forest: {
    light: { background: '#edf6f2', foreground: '#10211b', sidebar: '#e1f1e8', brand: ['#0ea5a2', '#34d399', '#b7f7d6'], stroke: 'rgba(255, 255, 255, 0.58)' },
    dark: { background: '#091813', foreground: '#e4faf2', sidebar: '#0d241d', brand: ['#2dd4bf', '#34d399', '#a7f3d0'], stroke: 'rgba(180, 225, 206, 0.26)' },
  },
  sunset: {
    light: { background: '#f6efe8', foreground: '#24130d', sidebar: '#f0e3d9', brand: ['#ff7a59', '#ff9f43', '#ffd27d'], stroke: 'rgba(255, 255, 255, 0.58)' },
    dark: { background: '#1a1010', foreground: '#fff2ea', sidebar: '#281713', brand: ['#ff9568', '#ffb36a', '#ffd27d'], stroke: 'rgba(243, 204, 186, 0.26)' },
  },
};

const GLASS_LEVELS: Record<GlassLevel, any> = {
  soft: {
    light: { surface: 'rgba(255, 255, 255, 0.52)', surfaceStrong: 'rgba(255, 255, 255, 0.68)', shadow: '0 10px 26px rgba(20, 30, 55, 0.1)', glow: '0 1px 0 rgba(255, 255, 255, 0.72) inset, 0 18px 40px rgba(73, 122, 203, 0.08)' },
    dark: { surface: 'rgba(12, 24, 46, 0.52)', surfaceStrong: 'rgba(14, 30, 56, 0.66)', shadow: '0 10px 26px rgba(2, 6, 18, 0.34)', glow: '0 1px 0 rgba(178, 203, 245, 0.16) inset, 0 18px 44px rgba(12, 46, 94, 0.18)' },
  },
  balanced: {
    light: { surface: 'rgba(255, 255, 255, 0.64)', surfaceStrong: 'rgba(255, 255, 255, 0.8)', shadow: '0 14px 40px rgba(20, 30, 55, 0.14)', glow: '0 1px 0 rgba(255, 255, 255, 0.8) inset, 0 24px 60px rgba(73, 122, 203, 0.16)' },
    dark: { surface: 'rgba(12, 24, 46, 0.66)', surfaceStrong: 'rgba(14, 30, 56, 0.8)', shadow: '0 16px 46px rgba(2, 6, 18, 0.48)', glow: '0 1px 0 rgba(178, 203, 245, 0.22) inset, 0 24px 64px rgba(12, 46, 94, 0.32)' },
  },
  strong: {
    light: { surface: 'rgba(255, 255, 255, 0.74)', surfaceStrong: 'rgba(255, 255, 255, 0.88)', shadow: '0 18px 48px rgba(20, 30, 55, 0.18)', glow: '0 1px 0 rgba(255, 255, 255, 0.9) inset, 0 28px 72px rgba(73, 122, 203, 0.2)' },
    dark: { surface: 'rgba(12, 24, 46, 0.76)', surfaceStrong: 'rgba(14, 30, 56, 0.88)', shadow: '0 18px 48px rgba(2, 6, 18, 0.58)', glow: '0 1px 0 rgba(178, 203, 245, 0.28) inset, 0 28px 72px rgba(12, 46, 94, 0.42)' },
  },
};

function applyAppearanceFromSettings(settings: { darkMode?: boolean; designPreset?: DesignPreset; glassLevel?: GlassLevel }) {
  if (typeof document === 'undefined') return;

  const darkMode = !!settings.darkMode;
  const preset = THEME_PRESETS[settings.designPreset || 'aurora'];
  const glass = GLASS_LEVELS[settings.glassLevel || 'balanced'];
  const mode = darkMode ? 'dark' : 'light';
  const theme = preset[mode];
  const glassTokens = glass[mode];

  document.documentElement.style.setProperty('--background', theme.background);
  document.documentElement.style.setProperty('--foreground', theme.foreground);
  document.documentElement.style.setProperty('--sidebar-bg', theme.sidebar);
  document.documentElement.style.setProperty('--brand-1', theme.brand[0]);
  document.documentElement.style.setProperty('--brand-2', theme.brand[1]);
  document.documentElement.style.setProperty('--brand-3', theme.brand[2]);
  document.documentElement.style.setProperty('--border-color', theme.stroke);
  document.documentElement.style.setProperty('--surface-glass', glassTokens.surface);
  document.documentElement.style.setProperty('--surface-glass-strong', glassTokens.surfaceStrong);
  document.documentElement.style.setProperty('--surface-stroke', theme.stroke);
  document.documentElement.style.setProperty('--surface-shadow', glassTokens.shadow);
  document.documentElement.style.setProperty('--surface-glow', glassTokens.glow);

  if (darkMode) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

function MainApp() {
  const { t } = useTranslation();
  const { isAuthenticated, isLoading, logout, user } = useAuth();
  const [currentNote, setCurrentNote] = useState<string | null>('Welcome');
  const [view, setView] = useState<string>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarCompact, setSidebarCompact] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [newNoteDialogOpen, setNewNoteDialogOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Handle URL parameters on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const noteParam = params.get('note');
      const viewParam = params.get('view');
      const projectParam = params.get('project');

      if (noteParam) {
        setCurrentNote(noteParam);
        setView('notes');
      } else if (viewParam) {
        setView(viewParam);
        if (viewParam === 'projects' && projectParam) {
          setSelectedProjectId(projectParam);
        }
      }
    }
  }, []);

  useEffect(() => {
    let disposed = false;
    let isRunning = false;

    const runGoogleSync = async () => {
      if (disposed || isRunning) return;
      const auth = readGoogleAuth();
      if (!auth) {
        return;
      }
      if (!isGoogleTokenValid(auth)) {
        clearGoogleAuth();
        window.dispatchEvent(new Event('googleAuthChanged'));
        return;
      }

      try {
        isRunning = true;
        await syncGooglePrimaryCalendar(auth.accessToken);
        window.dispatchEvent(new Event('calendarEventsUpdated'));
        window.dispatchEvent(new Event('googleSyncMetaUpdated'));
      } catch (error: any) {
        if (error?.status === 401) {
          clearGoogleAuth();
          window.dispatchEvent(new Event('googleAuthChanged'));
        }
      } finally {
        isRunning = false;
      }
    };

    const autoSyncEnabled = () => {
      const raw = localStorage.getItem(GOOGLE_AUTO_SYNC_KEY);
      return raw === null ? true : raw === 'true';
    };

    void runGoogleSync();

    let intervalId = window.setInterval(() => {
      if (autoSyncEnabled()) {
        void runGoogleSync();
      }
    }, 10 * 60 * 1000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && autoSyncEnabled()) {
        void runGoogleSync();
      }
    };

    const handleSyncNow = () => {
      void runGoogleSync();
    };

    const handleAuthChange = () => {
      void runGoogleSync();
    };

    const handleAutoSyncChanged = () => {
      window.clearInterval(intervalId);
      intervalId = window.setInterval(() => {
        if (autoSyncEnabled()) {
          void runGoogleSync();
        }
      }, 10 * 60 * 1000);

      if (autoSyncEnabled()) {
        void runGoogleSync();
      }
    };

    window.addEventListener('focus', handleVisibility);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('googleSyncNow', handleSyncNow);
    window.addEventListener('googleAuthChanged', handleAuthChange);
    window.addEventListener('calendarGoogleAutoSyncChanged', handleAutoSyncChanged);

    return () => {
      disposed = true;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleVisibility);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('googleSyncNow', handleSyncNow);
      window.removeEventListener('googleAuthChanged', handleAuthChange);
      window.removeEventListener('calendarGoogleAutoSyncChanged', handleAutoSyncChanged);
    };
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'n') {
        event.preventDefault();
        setNewNoteDialogOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    // Load theme preference from settings
    const savedSettings = localStorage.getItem('settings');
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      const merged = {
        darkMode: parsed.darkMode || false,
        designPreset: parsed.designPreset || parsed.design?.preset || 'aurora',
        glassLevel: parsed.glassLevel || parsed.design?.glassLevel || 'balanced',
      };
      setDarkMode(merged.darkMode);
      applyAppearanceFromSettings(merged);
    } else {
      // Check old darkMode setting or system preference
      const oldDarkMode = localStorage.getItem('darkMode') === 'true';
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const isDark = oldDarkMode || systemDark;
      
      setDarkMode(isDark);
      applyAppearanceFromSettings({ darkMode: isDark, designPreset: 'aurora', glassLevel: 'balanced' });
      
      // Migrate to new settings format
      localStorage.setItem('settings', JSON.stringify({ darkMode: isDark, language: 'de', designPreset: 'aurora', glassLevel: 'balanced' }));
      localStorage.removeItem('darkMode'); // Remove old setting
    }
    
    // Listen for dark mode changes from SettingsView
    const handleDarkModeChange = (event: any) => {
      const newDarkMode = event.detail?.darkMode;
      if (newDarkMode !== undefined) {
        setDarkMode(newDarkMode);
        const savedSettings = localStorage.getItem('settings');
        const parsed = savedSettings ? JSON.parse(savedSettings) : {};
        applyAppearanceFromSettings({
          darkMode: newDarkMode,
          designPreset: parsed.designPreset || parsed.design?.preset || 'aurora',
          glassLevel: parsed.glassLevel || parsed.design?.glassLevel || 'balanced',
        });
      }
    };
    
    window.addEventListener('darkModeChange', handleDarkModeChange);
    
    return () => {
      window.removeEventListener('darkModeChange', handleDarkModeChange);
    };
  }, []);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    
    // Update settings in localStorage
    const savedSettings = localStorage.getItem('settings');
    const settings = savedSettings ? JSON.parse(savedSettings) : { language: 'de', designPreset: 'aurora', glassLevel: 'balanced' };
    settings.darkMode = newMode;
    localStorage.setItem('settings', JSON.stringify(settings));
    
    // Apply to DOM
    applyAppearanceFromSettings(settings);
    
    // Trigger event for other components (like SettingsView)
    window.dispatchEvent(new CustomEvent('darkModeChange', { detail: { darkMode: newMode } }));
  };

  const handleLogout = () => {
    if (confirm(t.auth.logout + '?')) {
      logout();
    }
  };

  const handleCreateNote = async (name: string, folder?: string) => {
    try {
      await api.createNote(name, '', folder);
      setCurrentNote(folder ? `${folder}/${name}` : name);
      setView('notes');
    } catch (error) {
      console.error('Failed to create note:', error);
      alert('Failed to create note. Note might already exist.');
    }
  };

  const handleNoteSelect = (note: string) => {
    setCurrentNote(note);
    setView('notes');
  };

  const handleNoteDeleted = () => {
    // After deleting a note, return to dashboard
    setCurrentNote(null);
    setView('dashboard');
  };

  const handleNavigateToProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    setView('projects');
    // Update URL without reload
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('view', 'projects');
      url.searchParams.set('project', projectId);
      window.history.pushState({}, '', url);
    }
  };

  const handleNavigateToNote = (notePath: string) => {
    setCurrentNote(notePath);
    setView('notes');
    // Update URL without reload
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('note', notePath);
      url.searchParams.delete('view');
      url.searchParams.delete('project');
      window.history.pushState({}, '', url);
    }
  };

  const renderContent = () => {
    switch (view) {
      case 'dashboard':
        return <Dashboard onNavigate={setView} onCreateNote={() => setNewNoteDialogOpen(true)} />;
      case 'notes':
        return (
          <div className="flex h-full">
            {/* Notes Sidebar */}
            <div className="w-64 border-r border-white/50 dark:border-slate-600/40 bg-white/35 dark:bg-slate-900/35 backdrop-blur-md">
              <Sidebar
                currentNote={currentNote}
                onNoteSelect={handleNoteSelect}
                onCreateNote={() => setNewNoteDialogOpen(true)}
              />
            </div>
            {/* Editor */}
            <div className="flex-1">
              <Editor noteName={currentNote} onNoteChange={setCurrentNote} onNoteDeleted={handleNoteDeleted} />
            </div>
          </div>
        );
      case 'snippets':
        return <SnippetsView onNavigateToNote={handleNavigateToNote} onNavigateToProject={handleNavigateToProject} />;
      case 'graph':
        return <GraphView onNodeClick={handleNoteSelect} />;
      case 'projects':
        return <ProjectsView onNoteClick={handleNoteSelect} selectedProjectId={selectedProjectId} />;
      case 'tasks':
        return <TasksView />;
      case 'calendar':
        return <CalendarView />;
      case 'ideas':
        return <IdeasView />;
      case 'habits':
        return <HabitsView />;
      case 'connects':
        return <ConnectsView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <Dashboard />;
    }
  };

  // Show loading screen
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center app-shell px-4">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white/60 dark:border-slate-700/60 border-t-sky-500 dark:border-t-cyan-300 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-300">{t.common.loading}</p>
        </div>
      </div>
    );
  }

  // Show login if not authenticated
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="flex h-screen overflow-hidden app-shell p-2.5 sm:p-3.5 gap-2.5 sm:gap-3.5">
      {/* Mobile Overlay - closes sidebar when clicked */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar with Navigation */}
      <div
        className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-50 ${sidebarCompact ? 'w-16' : 'w-64'} transition-all duration-300 overflow-hidden flex flex-col ui-surface-strong rounded-2xl`}
      >
        {/* Logo */}
        <div className="h-14 flex items-center justify-between px-3 border-b border-white/45 dark:border-slate-700/45">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl brand-pill flex items-center justify-center text-white font-bold text-sm">
              S
            </div>
            {!sidebarCompact && <span className="text-sm font-semibold tracking-tight text-slate-800 dark:text-slate-100 truncate">Synora Space</span>}
          </div>
          <button
            onClick={() => setSidebarCompact(!sidebarCompact)}
            className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg ui-button-ghost border-transparent"
            title={sidebarCompact ? 'Sidebar erweitern' : 'Sidebar einklappen'}
          >
            <Menu size={14} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          <Navigation currentView={view} onViewChange={setView} compact={sidebarCompact} />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header */}
        <header className="h-14 flex items-center justify-between px-1 sm:px-2.5 mb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-xl ui-button-ghost border-transparent"
            >
              <Menu size={20} />
            </button>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setNewNoteDialogOpen(true)}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl ui-button-primary"
              title="Neue Notiz (Ctrl+Shift+N)"
            >
              <Plus size={16} />
              <span className="text-xs font-medium">Neu</span>
            </button>
            <button
              onClick={() => setSearchOpen(true)}
              className="p-2 rounded-xl ui-button-ghost border-transparent"
              title="Search (Ctrl+K)"
            >
              <Search size={18} className="sm:w-5 sm:h-5" />
            </button>
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-xl ui-button-ghost border-transparent"
              title="Toggle Dark Mode"
            >
              {darkMode ? <Sun size={18} className="sm:w-5 sm:h-5" /> : <Moon size={18} className="sm:w-5 sm:h-5" />}
            </button>
            
            {/* User Avatar Dropdown */}
            <div className="relative group">
              <button
                className="w-8 h-8 rounded-full brand-pill flex items-center justify-center text-white text-sm font-semibold soft-hover overflow-hidden"
                title={user?.username}
              >
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt={user.username} className="w-full h-full object-cover" />
                ) : (
                  user?.username?.charAt(0).toUpperCase() || 'U'
                )}
              </button>
              
              {/* Dropdown Menu */}
              <div className="absolute right-0 mt-2 w-52 ui-surface rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <div className="p-3 border-b border-white/45 dark:border-slate-700/45">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {user?.username}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {user?.email}
                  </p>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => setView('settings')}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-white/65 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Settings size={14} />
                      {t.nav.settings}
                    </span>
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-300 hover:bg-red-50/80 dark:hover:bg-red-950/40 transition-colors"
                  >
                    <span className="inline-flex items-center gap-2">
                      <LogOut size={14} />
                      {t.auth.logout}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden ui-surface-strong rounded-2xl">
          {renderContent()}
        </div>
      </div>

      {/* Search Modal */}
      {searchOpen && (
        <SearchBar
          onClose={() => setSearchOpen(false)}
          onSelect={(note: string) => {
            setCurrentNote(note);
            setSearchOpen(false);
            setView('notes');
          }}
        />
      )}

      {/* New Note Dialog */}
      {newNoteDialogOpen && (
        <NewNoteDialog
          onClose={() => setNewNoteDialogOpen(false)}
          onCreate={handleCreateNote}
        />
      )}
    </div>
  );
}

export default function Home() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

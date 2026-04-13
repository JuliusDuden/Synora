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
import SettingsView from '@/components/SettingsView';
import SnippetsView from '@/components/SnippetsView';
import ConnectsView from '@/components/ConnectsView';
import SearchBar from '@/components/SearchBar';
import NewNoteDialog from '@/components/NewNoteDialog';
import { Menu, Search, Moon, Sun, Plus, Settings, LogOut } from 'lucide-react';
import { api } from '@/lib/api';
import { useTranslation } from '@/lib/useTranslation';

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
      const settings = JSON.parse(savedSettings);
      setDarkMode(settings.darkMode || false);
      if (settings.darkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } else {
      // Check old darkMode setting or system preference
      const oldDarkMode = localStorage.getItem('darkMode') === 'true';
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const isDark = oldDarkMode || systemDark;
      
      setDarkMode(isDark);
      if (isDark) {
        document.documentElement.classList.add('dark');
      }
      
      // Migrate to new settings format
      localStorage.setItem('settings', JSON.stringify({ darkMode: isDark, language: 'de' }));
      localStorage.removeItem('darkMode'); // Remove old setting
    }
    
    // Listen for dark mode changes from SettingsView
    const handleDarkModeChange = (event: any) => {
      const newDarkMode = event.detail?.darkMode;
      if (newDarkMode !== undefined) {
        setDarkMode(newDarkMode);
        if (newDarkMode) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
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
    const settings = savedSettings ? JSON.parse(savedSettings) : { language: 'de' };
    settings.darkMode = newMode;
    localStorage.setItem('settings', JSON.stringify(settings));
    
    // Apply to DOM
    if (newMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
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
    <div className="flex h-screen overflow-hidden app-shell p-2 sm:p-3 gap-2 sm:gap-3">
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
        } lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-50 ${sidebarCompact ? 'w-16' : 'w-64'} transition-all duration-300 overflow-hidden flex flex-col glass-panel-strong rounded-2xl`}
      >
        {/* Logo */}
        <div className="h-14 flex items-center justify-between px-3 border-b border-white/50 dark:border-slate-600/40">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl brand-pill flex items-center justify-center text-white font-bold text-sm">
              S
            </div>
            {!sidebarCompact && <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">Synora Space</span>}
          </div>
          <button
            onClick={() => setSidebarCompact(!sidebarCompact)}
            className="hidden lg:flex items-center justify-center w-7 h-7 rounded-lg hover:bg-white/70 dark:hover:bg-slate-800/60"
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
        <header className="h-14 flex items-center justify-between px-1 sm:px-2 mb-1 sm:mb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-xl soft-hover hover:bg-white/70 dark:hover:bg-slate-800/60"
            >
              <Menu size={20} />
            </button>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setNewNoteDialogOpen(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl soft-hover bg-white/60 dark:bg-slate-800/55 hover:bg-white/80 dark:hover:bg-slate-800/75"
              title="Neue Notiz (Ctrl+Shift+N)"
            >
              <Plus size={16} />
              <span className="text-xs font-medium">Neu</span>
            </button>
            <button
              onClick={() => setSearchOpen(true)}
              className="p-2 rounded-xl soft-hover hover:bg-white/70 dark:hover:bg-slate-800/60"
              title="Search (Ctrl+K)"
            >
              <Search size={18} className="sm:w-5 sm:h-5" />
            </button>
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-xl soft-hover hover:bg-white/70 dark:hover:bg-slate-800/60"
              title="Toggle Dark Mode"
            >
              {darkMode ? <Sun size={18} className="sm:w-5 sm:h-5" /> : <Moon size={18} className="sm:w-5 sm:h-5" />}
            </button>
            
            {/* User Avatar Dropdown */}
            <div className="relative group">
              <button
                className="w-8 h-8 rounded-full brand-pill flex items-center justify-center text-white text-sm font-semibold soft-hover"
                title={user?.username}
              >
                {user?.username?.charAt(0).toUpperCase() || 'U'}
              </button>
              
              {/* Dropdown Menu */}
              <div className="absolute right-0 mt-2 w-48 glass-panel rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <div className="p-3 border-b border-white/50 dark:border-slate-600/40">
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
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-white/70 dark:hover:bg-slate-800/60 transition-colors"
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
        <div className="flex-1 overflow-hidden glass-panel rounded-2xl">
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

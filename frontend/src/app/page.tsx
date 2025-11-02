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
import SearchBar from '@/components/SearchBar';
import NewNoteDialog from '@/components/NewNoteDialog';
import { Menu, Search, Moon, Sun } from 'lucide-react';
import { api } from '@/lib/api';
import { useTranslation } from '@/lib/useTranslation';

function MainApp() {
  const { t } = useTranslation();
  const { isAuthenticated, isLoading, logout, user } = useAuth();
  const [currentNote, setCurrentNote] = useState<string | null>('Welcome');
  const [view, setView] = useState<string>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
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
        return <Dashboard />;
      case 'notes':
        return (
          <div className="flex h-full">
            {/* Notes Sidebar */}
            <div className="w-64 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
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
      case 'settings':
        return <SettingsView />;
      default:
        return <Dashboard />;
    }
  };

  // Show loading screen
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gray-200 dark:border-gray-800 border-t-gray-900 dark:border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">{t.common.loading}</p>
        </div>
      </div>
    );
  }

  // Show login if not authenticated
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-gray-900">
      {/* Mobile Overlay - closes sidebar when clicked */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar with Navigation */}
      <div
        className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-50 w-16 transition-transform duration-300 overflow-hidden border-r border-gray-200 dark:border-gray-700 flex flex-col bg-white dark:bg-gray-900`}
      >
        {/* Logo */}
        <div className="h-14 flex items-center justify-center border-b border-gray-200 dark:border-gray-700">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
            S
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          <Navigation currentView={view} onViewChange={setView} />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-3 sm:px-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <Menu size={20} />
            </button>
            <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Synora
            </h1>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setSearchOpen(true)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title="Search (Ctrl+K)"
            >
              <Search size={18} className="sm:w-5 sm:h-5" />
            </button>
            <button
              onClick={toggleDarkMode}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title="Toggle Dark Mode"
            >
              {darkMode ? <Sun size={18} className="sm:w-5 sm:h-5" /> : <Moon size={18} className="sm:w-5 sm:h-5" />}
            </button>
            
            {/* User Avatar Dropdown */}
            <div className="relative group">
              <button
                className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold hover:shadow-lg transition-shadow"
                title={user?.username}
              >
                {user?.username?.charAt(0).toUpperCase() || 'U'}
              </button>
              
              {/* Dropdown Menu */}
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {user?.username}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {user?.email}
                  </p>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => setView('settings')}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    ⚙️ {t.nav.settings}
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
                  >
                    🚪 {t.auth.logout}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
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

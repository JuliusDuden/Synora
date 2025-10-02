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
import SearchBar from '@/components/SearchBar';
import NewNoteDialog from '@/components/NewNoteDialog';
import { Menu, Search, Moon, Sun, LogOut } from 'lucide-react';
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

  useEffect(() => {
    // Load theme preference
    const isDark = localStorage.getItem('darkMode') === 'true';
    setDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('darkMode', String(newMode));
    if (newMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
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

  const renderContent = () => {
    switch (view) {
      case 'dashboard':
        return <Dashboard />;
      case 'notes':
        return <Editor noteName={currentNote} onNoteChange={setCurrentNote} onNoteDeleted={handleNoteDeleted} />;
      case 'graph':
        return <GraphView onNodeClick={handleNoteSelect} />;
      case 'projects':
        return <ProjectsView onNoteClick={handleNoteSelect} />;
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
      {/* Sidebar with Navigation */}
      <div
        className={`${
          sidebarOpen ? 'w-64' : 'w-0'
        } transition-all duration-300 overflow-hidden border-r border-gray-200 dark:border-gray-700 flex flex-col`}
      >
        {/* Navigation */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
            {t.appName}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t.appMotto} 🚀
          </p>
          {user && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
              👤 {user.username}
            </p>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto">
          <Navigation currentView={view} onViewChange={setView} />
        </div>

        {/* Notes Sidebar (only show when in notes view) */}
        {view === 'notes' && (
          <div className="border-t border-gray-200 dark:border-gray-700">
            <Sidebar
              currentNote={currentNote}
              onNoteSelect={handleNoteSelect}
              onCreateNote={() => setNewNoteDialogOpen(true)}
            />
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <Menu size={20} />
            </button>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              {view === 'dashboard' && t.nav.dashboard}
              {view === 'notes' && t.nav.notes}
              {view === 'graph' && t.nav.graph}
              {view === 'projects' && t.nav.projects}
              {view === 'tasks' && t.nav.tasks}
              {view === 'ideas' && t.nav.ideas}
              {view === 'habits' && t.nav.habits}
              {view === 'settings' && t.nav.settings}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSearchOpen(true)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title="Search (Ctrl+K)"
            >
              <Search size={20} />
            </button>
            <button
              onClick={toggleDarkMode}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title="Toggle Dark Mode"
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-red-100 dark:hover:bg-red-950 text-red-600 dark:text-red-400 rounded-lg transition-colors"
              title={t.auth.logout}
            >
              <LogOut size={20} />
            </button>
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

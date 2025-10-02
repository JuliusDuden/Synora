'use client';

import { Home, FileText, FolderKanban, CheckSquare, Lightbulb, Calendar, Settings, Network } from 'lucide-react';
import { useTranslation } from '@/lib/useTranslation';

interface NavigationProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

export default function Navigation({ currentView, onViewChange }: NavigationProps) {
  const { t } = useTranslation();
  
  const navItems = [
    { id: 'dashboard', label: t.nav.dashboard, icon: Home },
    { id: 'notes', label: t.nav.notes, icon: FileText },
    { id: 'projects', label: t.nav.projects, icon: FolderKanban },
    { id: 'tasks', label: t.nav.tasks, icon: CheckSquare },
    { id: 'ideas', label: t.nav.ideas, icon: Lightbulb },
    { id: 'habits', label: t.nav.habits, icon: Calendar },
    { id: 'graph', label: t.nav.graph, icon: Network },
    { id: 'settings', label: t.nav.settings, icon: Settings },
  ];
  return (
    <nav className="flex flex-col gap-1 p-2">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentView === item.id;
        
        return (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`
              flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium
              transition-all duration-200
              ${
                isActive
                  ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }
            `}
          >
            <Icon size={18} className={isActive ? 'text-white' : 'text-gray-500 dark:text-gray-400'} />
            <span>{item.label}</span>
            {isActive && (
              <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
            )}
          </button>
        );
      })}
    </nav>
  );
}

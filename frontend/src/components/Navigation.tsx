'use client';

import { Home, FileText, FolderKanban, CheckSquare, Lightbulb, Calendar, CalendarDays, Network, StickyNote, Users } from 'lucide-react';
import { useTranslation } from '@/lib/useTranslation';

interface NavigationProps {
  currentView: string;
  onViewChange: (view: string) => void;
  compact?: boolean;
}

export default function Navigation({ currentView, onViewChange, compact = false }: NavigationProps) {
  const { t } = useTranslation();
  
  const navItems = [
    { id: 'dashboard', label: t.nav.dashboard, icon: Home },
    { id: 'notes', label: t.nav.notes, icon: FileText },
    { id: 'snippets', label: 'Snippets', icon: StickyNote },
    { id: 'projects', label: t.nav.projects, icon: FolderKanban },
    { id: 'tasks', label: t.nav.tasks, icon: CheckSquare },
    { id: 'calendar', label: t.nav.calendar, icon: CalendarDays },
    { id: 'ideas', label: t.nav.ideas, icon: Lightbulb },
    { id: 'habits', label: t.nav.habits, icon: Calendar },
    { id: 'connects', label: 'Connects', icon: Users },
    { id: 'graph', label: t.nav.graph, icon: Network },
  ];
  return (
    <nav className="flex flex-col gap-1.5 p-2">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentView === item.id;
        
        return (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            title={item.label}
            className={`
              flex items-center ${compact ? 'justify-center' : 'justify-start gap-3'} h-11 px-3 rounded-xl
              transition-all duration-200 border
              ${
                isActive
                  ? 'ui-button-primary text-white border-transparent'
                  : 'ui-button-ghost text-slate-700 dark:text-slate-200 border-transparent'
              }
            `}
          >
            <Icon size={18} className={isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'} />
            {!compact && (
              <span className={`text-sm font-medium ${isActive ? 'text-white' : 'text-slate-700 dark:text-slate-200'}`}>
                {item.label}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

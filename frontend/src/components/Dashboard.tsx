'use client';

import { FileText, CheckSquare, Lightbulb, FolderKanban, Calendar, Activity } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from '@/lib/useTranslation';
import { api } from '@/lib/api';

interface Stats {
  totalNotes: number;
  totalProjects: number;
  totalTasks: number;
  completedTasks: number;
  totalIdeas: number;
  activeHabits: number;
}

export default function Dashboard() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<Stats>({
    totalNotes: 0,
    totalProjects: 0,
    totalTasks: 0,
    completedTasks: 0,
    totalIdeas: 0,
    activeHabits: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // Load all data from backend API
      const [notes, projects, tasks, ideas, habits] = await Promise.all([
        api.getAllNotes().catch(() => []),
        api.getProjects().catch(() => []),
        api.getTasks().catch(() => []),
        api.getIdeas().catch(() => []),
        api.getHabits().catch(() => []),
      ]);
      
      setStats({
        totalNotes: notes.length,
        totalProjects: projects.length,
        totalTasks: tasks.length,
        completedTasks: tasks.filter((t: any) => t.completed || t.status === 'done').length,
        totalIdeas: ideas.length,
        activeHabits: habits.filter((h: any) => {
          // Check if habit was completed today
          if (!h.last_completed) return false;
          const today = new Date().toISOString().split('T')[0];
          return h.last_completed === today;
        }).length,
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const statCards = [
    {
      title: t.dashboard.stats.notes,
      value: stats.totalNotes,
      subtitle: t.dashboard.stats.documents,
      icon: FileText,
      color: 'from-slate-500 to-slate-600',
    },
    {
      title: t.dashboard.stats.projects,
      value: stats.totalProjects,
      subtitle: t.dashboard.stats.activeProjects,
      icon: FolderKanban,
      color: 'from-blue-500 to-blue-600',
    },
    {
      title: t.dashboard.stats.tasks,
      value: `${stats.completedTasks}/${stats.totalTasks}`,
      subtitle: t.dashboard.stats.completed,
      icon: CheckSquare,
      color: 'from-green-500 to-green-600',
    },
    {
      title: t.dashboard.stats.ideas,
      value: stats.totalIdeas,
      subtitle: t.dashboard.stats.collected,
      icon: Lightbulb,
      color: 'from-amber-500 to-amber-600',
    },
  ];

  const completionRate = stats.totalTasks > 0 
    ? Math.round((stats.completedTasks / stats.totalTasks) * 100) 
    : 0;

  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            {new Date().toLocaleDateString('de-DE', { 
              weekday: 'long', 
              day: 'numeric',
              month: 'long',
              year: 'numeric' 
            })}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.title}
                className="bg-white dark:bg-gray-900 rounded-lg p-4 sm:p-6 border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
              >
                <div className="flex items-start justify-between mb-3 sm:mb-4">
                  <div className={`p-2 sm:p-2.5 rounded-lg bg-gradient-to-br ${stat.color}`}>
                    <Icon size={18} className="sm:w-5 sm:h-5 text-white" />
                  </div>
                </div>
                <div className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-1">
                  {stat.value}
                </div>
                <div className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white mb-0.5">
                  {stat.title}
                </div>
                <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                  {stat.subtitle}
                </div>
              </div>
            );
          })}
        </div>

        {/* Progress Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          {/* Tasks Progress */}
          <div className="bg-white dark:bg-gray-900 rounded-lg p-4 sm:p-6 border border-gray-200 dark:border-gray-800">
            <h2 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
              {t.tasks.overview}
            </h2>
            <div className="space-y-3 sm:space-y-4">
              <div>
                <div className="flex items-center justify-between text-xs sm:text-sm mb-2">
                  <span className="text-gray-600 dark:text-gray-400">{t.common.progress}</span>
                  <span className="font-medium text-gray-900 dark:text-white">{completionRate}%</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 sm:h-2">
                  <div
                    className="bg-gradient-to-r from-green-500 to-green-600 h-1.5 sm:h-2 rounded-full transition-all duration-300"
                    style={{ width: `${completionRate}%` }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-2">
                <div className="text-center">
                  <div className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
                    {stats.totalTasks - stats.completedTasks}
                  </div>
                  <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">{t.tasks.open}</div>
                </div>
                <div className="text-center">
                  <div className="text-lg sm:text-xl font-semibold text-green-600 dark:text-green-500">
                    {stats.completedTasks}
                  </div>
                  <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">{t.tasks.completed}</div>
                </div>
                <div className="text-center">
                  <div className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
                    {stats.totalTasks}
                  </div>
                  <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">{t.tasks.total}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Activity Summary */}
          <div className="bg-white dark:bg-gray-900 rounded-lg p-4 sm:p-6 border border-gray-200 dark:border-gray-800">
            <h2 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
              {t.common.activities}
            </h2>
            <div className="space-y-2 sm:space-y-3">
              <div className="flex items-center justify-between py-1.5 sm:py-2 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2 sm:gap-3">
                  <Activity size={14} className="sm:w-4 sm:h-4 text-gray-400" />
                  <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">{t.dashboard.stats.activeHabits}</span>
                </div>
                <span className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">{stats.activeHabits}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 sm:py-2 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2 sm:gap-3">
                  <Calendar size={14} className="sm:w-4 sm:h-4 text-gray-400" />
                  <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">{t.dashboard.stats.projects}</span>
                </div>
                <span className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">{stats.totalProjects}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 sm:py-2">
                <div className="flex items-center gap-2 sm:gap-3">
                  <Lightbulb size={14} className="sm:w-4 sm:h-4 text-gray-400" />
                  <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">{t.dashboard.stats.ideas}</span>
                </div>
                <span className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">{stats.totalIdeas}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

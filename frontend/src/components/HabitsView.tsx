'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Calendar, Flame, ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslation } from '@/lib/useTranslation';
import { api } from '@/lib/api';

interface Habit {
  id: string;
  name: string;
  description?: string;
  frequency: string;
  streak: number;
  last_completed?: string;
  created_at: string;
}

interface HabitCompletion {
  [habitId: string]: {
    [date: string]: boolean;
  };
}

interface HabitMonthState {
  [habitId: string]: Date;
}

export default function HabitsView() {
  const { t } = useTranslation();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [loading, setLoading] = useState(true);
  const [habitMonths, setHabitMonths] = useState<HabitMonthState>(() => {
    // Load from localStorage on initial render
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('habit_months');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          // Convert date strings back to Date objects
          const converted: HabitMonthState = {};
          for (const [key, value] of Object.entries(parsed)) {
            converted[key] = new Date(value as string);
          }
          return converted;
        } catch (e) {
          console.error('Failed to parse habit_months from localStorage:', e);
        }
      }
    }
    return {};
  });
  const [habitCompletions, setHabitCompletions] = useState<HabitCompletion>({});
  const [expandedHabits, setExpandedHabits] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadHabits();
    loadHabitCompletions();
  }, []);

  const loadHabits = async () => {
    try {
      setLoading(true);
      const data = await api.getHabits();
      console.log('=== LOADED HABITS ===');
      console.log('Total habits:', data.length);
      data.forEach((h, idx) => {
        console.log(`Habit ${idx}: ID=${h.id}, Name=${h.name}, Type=${typeof h.id}`);
      });
      // Check for duplicate IDs
      const ids = data.map(h => h.id);
      const uniqueIds = new Set(ids);
      if (ids.length !== uniqueIds.size) {
        console.error('⚠️ DUPLICATE IDs DETECTED!', ids);
      }
      // CRITICAL FIX: Ensure all IDs are strings for consistent comparison
      const normalizedHabits = data.map(h => ({
        ...h,
        id: String(h.id)
      }));
      console.log('Normalized habits:', normalizedHabits.map(h => ({ id: h.id, name: h.name, type: typeof h.id })));
      setHabits(normalizedHabits);
    } catch (error) {
      console.error('Failed to load habits:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadHabitCompletions = async () => {
    // Load completion data from localStorage for now
    const stored = localStorage.getItem('habit_completions');
    if (stored) {
      setHabitCompletions(JSON.parse(stored));
    }
  };

  const saveHabitCompletions = (completions: HabitCompletion) => {
    localStorage.setItem('habit_completions', JSON.stringify(completions));
    setHabitCompletions(completions);
  };

  const getHabitMonth = (habitId: string): Date => {
    const month = habitMonths[habitId] || new Date();
    // console.log(`getHabitMonth(${habitId}):`, month.toISOString().substring(0, 7));
    return month;
  };

  const setHabitMonth = (habitId: string, date: Date) => {
    setHabitMonths(prev => {
      const updated = {
        ...prev,
        [habitId]: date
      };
      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('habit_months', JSON.stringify(updated));
      }
      return updated;
    });
  };

  const createHabit = async () => {
    if (!newHabitName.trim()) return;

    try {
      const habit = await api.createHabit({
        name: newHabitName,
        description: null,
        frequency: 'daily',
      });

      // CRITICAL FIX: Normalize ID to string
      const normalizedHabit = {
        ...habit,
        id: String(habit.id)
      };
      console.log('Created habit with normalized ID:', normalizedHabit);

      setHabits([...habits, normalizedHabit]);
      setNewHabitName('');
      setIsCreating(false);
    } catch (error) {
      console.error('Failed to create habit:', error);
      alert('Failed to create habit');
    }
  };

  const toggleHabitCompletion = (habitId: string, dateStr: string) => {
    console.log('Toggle completion for habit:', habitId, 'date:', dateStr);
    const newCompletions = { ...habitCompletions };
    if (!newCompletions[habitId]) {
      newCompletions[habitId] = {};
    }
    newCompletions[habitId][dateStr] = !newCompletions[habitId][dateStr];
    console.log('Updated completions:', newCompletions);
    saveHabitCompletions(newCompletions);
    
    // Calculate new streak
    calculateStreak(habitId, newCompletions);
  };

  const calculateStreak = (habitId: string, completions: HabitCompletion) => {
    const habitCompletionDates = completions[habitId] || {};
    let streak = 0;
    const today = new Date();
    
    // Count backwards from today
    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      const dateStr = checkDate.toISOString().split('T')[0];
      
      if (habitCompletionDates[dateStr]) {
        streak++;
      } else if (i > 0) {
        // Stop counting if we hit a day without completion (but not today)
        break;
      }
    }
    
    // Update habit streak in state
    setHabits(habits.map(h => 
      h.id === habitId ? { ...h, streak } : h
    ));
  };

  const deleteHabit = async (id: string) => {
    if (!confirm('Diese Gewohnheit löschen?')) return;

    try {
      await api.deleteHabit(id);
      setHabits(habits.filter(h => h.id !== id));
      
      // Also remove completions
      const newCompletions = { ...habitCompletions };
      delete newCompletions[id];
      saveHabitCompletions(newCompletions);
    } catch (error) {
      console.error('Failed to delete habit:', error);
    }
  };

  const isCompleted = (habitId: string, dateStr: string): boolean => {
    const result = habitCompletions[habitId]?.[dateStr] || false;
    // console.log(`isCompleted(${habitId}, ${dateStr}):`, result);
    return result;
  };

  const getDaysInMonth = (date: Date): Date[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: Date[] = [];
    
    // Add padding days from previous month
    const firstDayOfWeek = firstDay.getDay();
    const startPadding = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // Monday = 0
    
    for (let i = startPadding; i > 0; i--) {
      const paddingDate = new Date(year, month, 1 - i);
      days.push(paddingDate);
    }
    
    // Add all days of the month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const goToPreviousMonth = (habitId: string) => {
    const currentMonth = getHabitMonth(habitId);
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() - 1);
    setHabitMonth(habitId, newDate);
  };

  const goToNextMonth = (habitId: string) => {
    const currentMonth = getHabitMonth(habitId);
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() + 1);
    setHabitMonth(habitId, newDate);
  };

  const goToToday = (habitId: string) => {
    setHabitMonth(habitId, new Date());
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const isCurrentMonth = (date: Date, habitMonth: Date): boolean => {
    return date.getMonth() === habitMonth.getMonth();
  };

  const toggleHabitExpanded = (habitId: string | number) => {
    const normalizedId = String(habitId);
    console.log('toggleHabitExpanded called with:', normalizedId, 'Original type:', typeof habitId);
    console.log('Current expandedHabits:', Array.from(expandedHabits));
    const newExpanded = new Set(expandedHabits);
    if (newExpanded.has(normalizedId)) {
      console.log('Removing from expanded:', normalizedId);
      newExpanded.delete(normalizedId);
    } else {
      console.log('Adding to expanded:', normalizedId);
      newExpanded.add(normalizedId);
    }
    console.log('New expandedHabits:', Array.from(newExpanded));
    setExpandedHabits(newExpanded);
  };

  const getTodayDateStr = (): string => {
    return new Date().toISOString().split('T')[0];
  };

  const isCompletedToday = (habitId: string): boolean => {
    const today = getTodayDateStr();
    return isCompleted(habitId, today);
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-gray-500 dark:text-gray-400">{t.common.loading}</div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">
              {t.habits.title}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {habits.length} {t.habits.title} • Monatsübersicht
            </p>
          </div>
          <button 
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={18} />
            {t.habits.newHabit}
          </button>
        </div>

        {/* Create Form */}
        {isCreating && (
          <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
            <div className="flex gap-2">
              <input
                type="text"
                value={newHabitName}
                onChange={(e) => setNewHabitName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createHabit()}
                className="flex-1 px-3 py-2 bg-white dark:bg-gray-950 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
                placeholder="Gewohnheit eingeben..."
                autoFocus
              />
              <button
                onClick={createHabit}
                className="px-4 py-2 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-lg text-sm font-medium transition-colors"
              >
                Erstellen
              </button>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setNewHabitName('');
                }}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm font-medium transition-colors"
              >
                Abbrechen
              </button>
            </div>
          </div>
        )}

        {/* Habits List with Dropdown */}
        {habits.length > 0 ? (
          <div className="space-y-3">
            {habits.map(habit => {
              const habitId = String(habit.id); // Ensure ID is always a string
              const isExpanded = expandedHabits.has(habitId);
              // console.log(`Rendering habit ${habit.name} (ID: ${habitId}, Original: ${habit.id}, Type: ${typeof habit.id}), isExpanded:`, isExpanded);
              const todayCompleted = isCompletedToday(habitId);
              
              return (
                <div 
                  key={habitId}
                  className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden"
                >
                  {/* Collapsed View - Today's Checkbox */}
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        {/* Today Checkbox */}
                        <button
                          onClick={() => toggleHabitCompletion(habitId, getTodayDateStr())}
                          className={`w-8 h-8 rounded-lg border-2 transition-all flex items-center justify-center flex-shrink-0 ${
                            todayCompleted
                              ? 'bg-green-500 border-green-600 dark:bg-green-600 dark:border-green-500'
                              : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                          }`}
                        >
                          {todayCompleted && (
                            <span className="text-white text-sm font-bold">✓</span>
                          )}
                        </button>

                        {/* Habit Name and Streak */}
                        <div className="flex items-center gap-2 flex-1">
                          <h3 className="text-base font-medium text-gray-900 dark:text-white">
                            {habit.name}
                          </h3>
                          {habit.streak > 0 && (
                            <div className="flex items-center gap-1 px-2 py-0.5 bg-orange-100 dark:bg-orange-950 rounded">
                              <Flame size={14} className="text-orange-500" />
                              <span className="text-xs font-medium text-orange-700 dark:text-orange-400">
                                {habit.streak} Tag{habit.streak !== 1 ? 'e' : ''}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleHabitExpanded(habitId)}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                          title={isExpanded ? 'Kalender einklappen' : 'Kalender anzeigen'}
                        >
                          {isExpanded ? (
                            <ChevronUp size={18} className="text-gray-600 dark:text-gray-400" />
                          ) : (
                            <ChevronDown size={18} className="text-gray-600 dark:text-gray-400" />
                          )}
                        </button>
                        <button
                          onClick={() => deleteHabit(habitId)}
                          className="p-2 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-colors"
                          title="Löschen"
                        >
                          <Trash2 size={16} className="text-gray-400 hover:text-red-500" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded View - Month Calendar */}
                  {isExpanded && (() => {
                    const habitMonth = getHabitMonth(habitId);
                    const daysInMonth = getDaysInMonth(habitMonth);
                    
                    return (
                      <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-800 pt-4">
                        <div className="mb-3">
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                            Monatsübersicht - {habitMonth.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}
                          </p>
                          
                          {/* Weekday Headers */}
                          <div className="grid grid-cols-7 gap-1 mb-2">
                            {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(day => (
                              <div key={day} className="text-xs font-medium text-gray-400 dark:text-gray-600 text-center py-1">
                                {day}
                              </div>
                            ))}
                          </div>
                          
                          {/* Calendar Days */}
                          <div className="grid grid-cols-7 gap-1">
                            {daysInMonth.map((date, idx) => {
                              const dateStr = date.toISOString().split('T')[0];
                              const completed = isCompleted(habitId, dateStr);
                              const isCurrentMonthDay = isCurrentMonth(date, habitMonth);
                              const isTodayDate = isToday(date);

                              return (
                                <button
                                  key={idx}
                                  onClick={() => isCurrentMonthDay && toggleHabitCompletion(habitId, dateStr)}
                                  disabled={!isCurrentMonthDay}
                                  className={`aspect-square rounded border-2 transition-all text-xs font-medium ${
                                    !isCurrentMonthDay
                                      ? 'bg-gray-50 dark:bg-gray-950 border-transparent opacity-20 cursor-not-allowed'
                                      : completed
                                      ? 'bg-green-500 border-green-600 dark:bg-green-600 dark:border-green-500 text-white'
                                      : isTodayDate
                                      ? 'bg-white dark:bg-gray-900 border-blue-500 dark:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 text-gray-700 dark:text-gray-300'
                                      : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
                                  } flex items-center justify-center`}
                                  title={`${date.getDate()}. ${date.toLocaleDateString('de-DE', { month: 'long' })}`}
                                >
                                  {completed ? '✓' : date.getDate()}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty State */
          <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
            <Calendar size={48} className="mx-auto text-gray-300 dark:text-gray-700 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Keine Gewohnheiten
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Erstelle deine erste Gewohnheit zum Tracken
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

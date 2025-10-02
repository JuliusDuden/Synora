'use client';

import { useState, useEffect } from 'react';
import { Plus, Clock, Check, ArrowRight, FolderOpen, Trash2, CheckSquare } from 'lucide-react';
import { useTranslation } from '@/lib/useTranslation';
import { api } from '@/lib/api';

interface Task {
  id?: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: string;
  due_date?: string;
  project_id?: string;
  created_at?: string;
  modified_at?: string;
}

interface TaskCardProps {
  task: Task;
  onToggle: (id: string) => void;
  onMoveToProgress?: (id: string) => void;
  onDelete: (id: string) => void;
  priorityColors: Record<string, string>;
  projects: any[];
}

const priorityColors: Record<string, string> = {
  high: 'border-red-500',
  medium: 'border-amber-500',
  low: 'border-green-500',
};

export default function TasksView() {
  const { t } = useTranslation();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskProject, setNewTaskProject] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [projects, setProjects] = useState<any[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTasks();
    loadProjects();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const data = await api.getTasks();
      setTasks(data);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProjects = async () => {
    try {
      const data = await api.getProjects();
      setProjects(data);
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const createTask = async () => {
    if (!newTaskTitle.trim()) return;
    try {
      const task = await api.createTask({
        title: newTaskTitle,
        priority: newTaskPriority,
        completed: false,
        project_id: newTaskProject || null,
      });
      setTasks(prev => [...prev, task]);
      setNewTaskTitle('');
      setNewTaskProject('');
      setNewTaskPriority('medium');
      setIsCreating(false);
    } catch (error) {
      console.error('Failed to create task:', error);
      alert('Failed to create task');
    }
  };

  const toggleStatus = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    try {
      const updated = await api.updateTask(id, { completed: !task.completed });
      setTasks(tasks.map(t => t.id === id ? { ...t, completed: updated.completed } : t));
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const moveToProgress = async (id: string) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const updated = await api.updateTask(id, { due_date: today });
      setTasks(tasks.map(t => t.id === id ? { ...t, due_date: updated.due_date } : t));
    } catch (error) {
      console.error('Failed to move task to progress:', error);
    }
  };

  const deleteTask = async (id: string) => {
    if (!confirm('Diese Aufgabe löschen?')) return;
    try {
      await api.deleteTask(id);
      setTasks(tasks.filter(t => t.id !== id));
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-gray-500 dark:text-gray-400">{t.common.loading}</div>
      </div>
    );
  }

  const todoTasks = tasks.filter(t => !t.completed && !t.due_date);
  const inProgressTasks = tasks.filter(t => !t.completed && t.due_date);
  const doneTasks = tasks.filter(t => t.completed);

  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-1">
              {t.tasks.title}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {todoTasks.length} todo &#8226; {inProgressTasks.length} in progress &#8226; {doneTasks.length} done
            </p>
          </div>
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={18} />
            {t.tasks.newTask}
          </button>
        </div>

        {isCreating && (
          <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800 space-y-3">
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && createTask()}
              className="w-full px-3 py-2 bg-white dark:bg-gray-950 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
              placeholder={t.tasks.taskTitle + '...'}
              autoFocus
            />
            <select
              value={newTaskPriority}
              onChange={(e) => setNewTaskPriority(e.target.value as 'high' | 'medium' | 'low')}
              className="w-full px-3 py-2 bg-white dark:bg-gray-950 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
            >
              <option value="low">{t.tasks.priorityLow}</option>
              <option value="medium">{t.tasks.priorityMedium}</option>
              <option value="high">{t.tasks.priorityHigh}</option>
            </select>
            {projects.length > 0 && (
              <select
                value={newTaskProject}
                onChange={(e) => setNewTaskProject(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-950 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
              >
                <option value="">{t.tasks.noProject}</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
            )}
            <div className="flex gap-2">
              <button
                onClick={createTask}
                className="px-4 py-2 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-lg text-sm font-medium transition-colors"
              >
                {t.tasks.create}
              </button>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setNewTaskTitle('');
                  setNewTaskProject('');
                  setNewTaskPriority('medium');
                }}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm font-medium transition-colors"
              >
                {t.tasks.cancel}
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Clock size={18} className="text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                Todo
              </h2>
              <span className="ml-auto px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs font-medium text-gray-600 dark:text-gray-400">
                {todoTasks.length}
              </span>
            </div>
            <div className="space-y-2">
              {todoTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onToggle={toggleStatus}
                  onMoveToProgress={moveToProgress}
                  onDelete={deleteTask}
                  priorityColors={priorityColors}
                  projects={projects}
                />
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                In Progress
              </h2>
              <span className="ml-auto px-2 py-0.5 bg-amber-100 dark:bg-amber-950 rounded text-xs font-medium text-amber-700 dark:text-amber-400">
                {inProgressTasks.length}
              </span>
            </div>
            <div className="space-y-2">
              {inProgressTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onToggle={toggleStatus}
                  onDelete={deleteTask}
                  priorityColors={priorityColors}
                  projects={projects}
                />
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-4">
              <Check size={18} className="text-green-500" />
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                Done
              </h2>
              <span className="ml-auto px-2 py-0.5 bg-green-100 dark:bg-green-950 rounded text-xs font-medium text-green-700 dark:text-green-400">
                {doneTasks.length}
              </span>
            </div>
            <div className="space-y-2">
              {doneTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onToggle={toggleStatus}
                  onDelete={deleteTask}
                  priorityColors={priorityColors}
                  projects={projects}
                />
              ))}
            </div>
          </div>
        </div>

        {tasks.length === 0 && !isCreating && (
          <div className="text-center py-16">
            <CheckSquare size={48} className="mx-auto text-gray-300 dark:text-gray-700 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {t.tasks.noTasks}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {t.tasks.create}
            </p>
            <button
              onClick={() => setIsCreating(true)}
              className="px-4 py-2 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-lg text-sm font-medium transition-colors"
            >
              {t.tasks.create}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function TaskCard({ task, onToggle, onMoveToProgress, onDelete, priorityColors, projects }: TaskCardProps) {
  const project = projects.find(p => String(p.id) === String(task.project_id));
  const priorityClass = priorityColors[task.priority] || '';

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-lg p-3 border-l-4 ${priorityClass} border-r border-t border-b border-gray-200 dark:border-gray-800 hover:shadow-md transition-shadow`}>
      <div className="flex items-start gap-3">
        <button
          onClick={() => onToggle(task.id!)}
          className="mt-0.5 flex-shrink-0"
        >
          <div className="w-5 h-5 rounded border-2 flex items-center justify-center transition-colors bg-gray-200 dark:bg-gray-800 border-gray-300 dark:border-gray-700">
            {task.completed && <Check size={12} className="text-white" />}
          </div>
        </button>

        <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {task.title}
            </p>
            {project && (
              <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs text-gray-600 dark:text-gray-400 mt-1">
                <FolderOpen size={12} />
                {project.name}
              </div>
            )}
        </div>

        <div className="flex items-center gap-1">
          {onMoveToProgress && !task.completed && !task.due_date && (
            <button
              onClick={() => onMoveToProgress(task.id!)}
              className="text-gray-400 hover:text-amber-500 dark:hover:text-amber-400 transition-colors"
              title="Move to In Progress"
            >
              <ArrowRight size={16} />
            </button>
          )}
          <button
            onClick={() => onDelete(task.id!)}
            className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, Clock, Check, ArrowRight, FolderOpen, Trash2, CheckSquare, Share2 } from 'lucide-react';
import { useTranslation } from '@/lib/useTranslation';
import { api } from '@/lib/api';
import TaskDetailView from './TaskDetailView';
import ShareDialog from './ShareDialog';

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
  status: TaskColumn;
  onToggle: (id: string) => void;
  onMoveToProgress?: (id: string) => void;
  onDelete: (id: string) => void;
  onClick?: (id: string) => void;
  onShare?: (task: Task) => void;
  onDragStart: (task: Task, status: TaskColumn) => void;
  onDragEnd: () => void;
  priorityColors: Record<string, string>;
  projects: any[];
  isDragged?: boolean;
  suppressClick?: boolean;
}

type TaskColumn = 'todo' | 'inProgress' | 'done';

const priorityColors: Record<string, string> = {
  high: 'border-red-500',
  medium: 'border-amber-500',
  low: 'border-green-500',
};

export default function TasksView() {
  const { t } = useTranslation();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sharedTasks, setSharedTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskProject, setNewTaskProject] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [projects, setProjects] = useState<any[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareTask, setShareTask] = useState<Task | null>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskColumn | null>(null);
  const [recentlyDraggedTaskId, setRecentlyDraggedTaskId] = useState<string | null>(null);
  const dragResetTimer = useRef<number | null>(null);

  useEffect(() => {
    loadTasks();
    loadProjects();
  }, []);

  useEffect(() => {
    return () => {
      if (dragResetTimer.current) {
        window.clearTimeout(dragResetTimer.current);
      }
    };
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const [ownTasks, shared] = await Promise.all([
        api.getTasks(),
        api.getSharedTasks().catch(() => [])
      ]);
      setTasks(ownTasks);
      setSharedTasks(shared);
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

  const openShareDialog = (task: Task) => {
    setShareTask(task);
    setShareDialogOpen(true);
  };

  const clearDragState = () => {
    setDraggedTaskId(null);
    setDragOverColumn(null);
  };

  const markRecentlyDragged = (taskId: string) => {
    if (dragResetTimer.current) {
      window.clearTimeout(dragResetTimer.current);
    }

    setRecentlyDraggedTaskId(taskId);
    dragResetTimer.current = window.setTimeout(() => {
      setRecentlyDraggedTaskId(null);
      dragResetTimer.current = null;
    }, 180);
  };

  const getTaskColumn = (task: Task): TaskColumn => {
    if (task.completed) return 'done';
    return task.due_date ? 'inProgress' : 'todo';
  };

  const moveTaskToColumn = async (id: string, targetColumn: TaskColumn) => {
    const task = tasks.find(item => item.id === id);
    if (!task) return;

    const today = new Date().toISOString().split('T')[0];
    const payload =
      targetColumn === 'done'
        ? { completed: true }
        : targetColumn === 'inProgress'
          ? { completed: false, due_date: today }
          : { completed: false, due_date: null };

    try {
      const updated = await api.updateTask(id, payload);
      setTasks(prev => prev.map(item => (
        item.id === id
          ? { ...item, completed: updated.completed, due_date: updated.due_date }
          : item
      )));
    } catch (error) {
      console.error('Failed to update task column:', error);
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
    await moveTaskToColumn(id, 'inProgress');
  };

  const deleteTask = async (id: string) => {
    if (!confirm('Diese Aufgabe löschen?')) return;
    try {
      await api.deleteTask(id);
      setTasks(tasks.filter(t => t.id !== id));
      // Reload projects to update their task counts
      loadProjects();
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  // Show detail view if task is selected
  if (selectedTaskId) {
    return (
      <TaskDetailView
        taskId={selectedTaskId}
        onBack={() => {
          setSelectedTaskId(null);
          loadTasks(); // Reload tasks when coming back
          loadProjects(); // Reload projects to update their task counts
        }}
      />
    );
  }

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

  const columns: Array<{
    id: TaskColumn;
    title: string;
    icon: JSX.Element;
    count: number;
    badgeClassName: string;
    tasks: Task[];
  }> = [
    {
      id: 'todo',
      title: 'Todo',
      icon: <Clock size={18} className="text-gray-400" />,
      count: todoTasks.length,
      badgeClassName: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
      tasks: todoTasks,
    },
    {
      id: 'inProgress',
      title: 'In Progress',
      icon: <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />,
      count: inProgressTasks.length,
      badgeClassName: 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400',
      tasks: inProgressTasks,
    },
    {
      id: 'done',
      title: 'Done',
      icon: <Check size={18} className="text-green-500" />,
      count: doneTasks.length,
      badgeClassName: 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400',
      tasks: doneTasks,
    },
  ];

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
          {columns.map(column => {
            const isDropTarget = dragOverColumn === column.id;

            return (
              <div
                key={column.id}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragOverColumn(column.id);
                }}
                onDragEnter={(event) => {
                  event.preventDefault();
                  setDragOverColumn(column.id);
                }}
                onDragLeave={(event) => {
                  if (event.currentTarget === event.target) {
                    setDragOverColumn(previous => previous === column.id ? null : previous);
                  }
                }}
                onDrop={async (event) => {
                  event.preventDefault();
                  const taskId = event.dataTransfer.getData('text/plain');
                  if (taskId) {
                    await moveTaskToColumn(taskId, column.id);
                    markRecentlyDragged(taskId);
                  }
                  clearDragState();
                }}
                className={`rounded-2xl border p-3 transition-all ${
                  isDropTarget
                    ? 'border-gray-400 dark:border-gray-500 bg-gray-100/80 dark:bg-gray-900/70 shadow-lg'
                    : 'border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/60'
                }`}
              >
                <div className="flex items-center gap-2 mb-4">
                  {column.icon}
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                    {column.title}
                  </h2>
                  <span className={`ml-auto px-2 py-0.5 rounded text-xs font-medium ${column.badgeClassName}`}>
                    {column.count}
                  </span>
                </div>
                <div className="space-y-2 min-h-[96px]">
                  {column.tasks.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      status={getTaskColumn(task)}
                      onToggle={toggleStatus}
                      onMoveToProgress={moveToProgress}
                      onDelete={deleteTask}
                      onClick={setSelectedTaskId}
                      onShare={openShareDialog}
                      onDragStart={(draggedTask, status) => {
                        setDraggedTaskId(draggedTask.id ?? null);
                        setDragOverColumn(status);
                      }}
                      onDragEnd={() => {
                        clearDragState();
                        if (task.id) {
                          markRecentlyDragged(task.id);
                        }
                      }}
                      isDragged={draggedTaskId === task.id}
                      suppressClick={recentlyDraggedTaskId === task.id}
                      priorityColors={priorityColors}
                      projects={projects}
                    />
                  ))}
                  {column.tasks.length === 0 && (
                    <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-800 px-4 py-8 text-center text-xs text-gray-400 dark:text-gray-600">
                      Drag tasks here
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Shared Tasks Section */}
        {sharedTasks.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center gap-2 mb-4">
              <Share2 size={18} className="text-indigo-500" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Mit dir geteilte Aufgaben
              </h2>
              <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900 rounded text-xs font-medium text-indigo-600 dark:text-indigo-400">
                {sharedTasks.length}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {sharedTasks.map(task => (
                <div
                  key={task.id}
                  className="bg-white dark:bg-gray-900 rounded-lg p-3 border-2 border-indigo-200 dark:border-indigo-800"
                >
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {task.title}
                  </p>
                  {task.description && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                      {task.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

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

      {/* Share Dialog */}
      {shareTask && (
        <ShareDialog
          isOpen={shareDialogOpen}
          onClose={() => {
            setShareDialogOpen(false);
            setShareTask(null);
          }}
          itemType="task"
          itemId={shareTask.id!}
          itemName={shareTask.title}
        />
      )}
    </div>
  );
}

function TaskCard({
  task,
  status,
  onToggle,
  onMoveToProgress,
  onDelete,
  onClick,
  onShare,
  onDragStart,
  onDragEnd,
  priorityColors,
  projects,
  isDragged,
  suppressClick,
}: TaskCardProps) {
  const project = projects.find(p => String(p.id) === String(task.project_id));
  const priorityClass = priorityColors[task.priority] || '';

  return (
    <div 
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', task.id!);
        onDragStart(task, status);
      }}
      onDragEnd={() => {
        onDragEnd();
      }}
      onClick={(e) => {
        // Only open detail if not clicking on action buttons or after a drag.
        if (suppressClick || !(e.target as HTMLElement).closest('button')) {
          if (suppressClick) {
            return;
          }
          onClick?.(task.id!);
        }
      }}
      className={`bg-white dark:bg-gray-900 rounded-lg p-3 border-l-4 ${priorityClass} border-r border-t border-b border-gray-200 dark:border-gray-800 hover:shadow-md transition-all cursor-grab active:cursor-grabbing ${isDragged ? 'opacity-50 scale-[0.98] shadow-lg ring-2 ring-gray-300 dark:ring-gray-700' : ''}`}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle(task.id!);
          }}
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
              onClick={(e) => {
                e.stopPropagation();
                onMoveToProgress(task.id!);
              }}
              className="text-gray-400 hover:text-amber-500 dark:hover:text-amber-400 transition-colors"
              title="Move to In Progress"
            >
              <ArrowRight size={16} />
            </button>
          )}
          {onShare && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onShare(task);
              }}
              className="text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"
              title="Teilen"
            >
              <Share2 size={16} />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(task.id!);
            }}
            className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

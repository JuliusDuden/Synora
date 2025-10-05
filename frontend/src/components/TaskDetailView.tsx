'use client';

import { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Star, 
  Calendar, 
  Bell, 
  Tag, 
  FolderOpen, 
  Clock,
  CheckSquare,
  Plus,
  X,
  Trash2,
  Link2,
  Check,
  FileText
} from 'lucide-react';
import { useTranslation } from '@/lib/useTranslation';
import { api } from '@/lib/api';
import MarkdownPreview from './MarkdownPreview';

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
  reminder?: string;
  tags?: string[];
  subtasks?: SubTask[];
  linked_notes?: string[];
  favorite?: boolean;
}

interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

interface TaskDetailViewProps {
  taskId: string;
  onBack: () => void;
  onNoteClick?: (noteName: string) => void;
}

export default function TaskDetailView({ taskId, onBack, onNoteClick }: TaskDetailViewProps) {
  const { t } = useTranslation();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [project, setProject] = useState<any>(null);
  const [allProjects, setAllProjects] = useState<any[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [linkedNotes, setLinkedNotes] = useState<any[]>([]);
  const [editingTags, setEditingTags] = useState(false);
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    loadTaskData();
  }, [taskId]);

  const loadTaskData = async () => {
    try {
      setLoading(true);
      // Load task
      const tasks = await api.getTasks();
      const foundTask = tasks.find((t: Task) => t.id === taskId);
      if (foundTask) {
        setTask(foundTask);
        setEditedTitle(foundTask.title);
        setEditedDescription(foundTask.description || '');
        
        // Load project if task has one
        if (foundTask.project_id) {
          const projects = await api.getProjects();
          const foundProject = projects.find((p: any) => String(p.id) === String(foundTask.project_id));
          setProject(foundProject);
        }
      }
      
      // Load all projects for dropdown
      const projects = await api.getProjects();
      setAllProjects(projects);
      
      // Load linked notes (notes that mention this task)
      const notes = await api.getAllNotes();
      const linked = notes.filter((note: any) => 
        note.content && note.content.includes(foundTask?.title || '')
      );
      setLinkedNotes(linked);
    } catch (error) {
      console.error('Failed to load task:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateTask = async (updates: Partial<Task>) => {
    if (!task?.id) return;
    try {
      const updated = await api.updateTask(task.id, updates);
      setTask({ ...task, ...updated });
    } catch (error) {
      console.error('Failed to update task:', error);
      alert('Fehler beim Aktualisieren der Aufgabe');
    }
  };

  const saveTitle = async () => {
    if (editedTitle.trim() && editedTitle !== task?.title) {
      await updateTask({ title: editedTitle });
    }
    setEditing(false);
  };

  const toggleFavorite = async () => {
    await updateTask({ favorite: !task?.favorite });
  };

  const deleteTask = async () => {
    if (!confirm('Diese Aufgabe wirklich löschen?')) return;
    if (!task?.id) return;
    
    try {
      await api.deleteTask(task.id);
      onBack();
    } catch (error) {
      console.error('Failed to delete task:', error);
      alert('Fehler beim Löschen der Aufgabe');
    }
  };

  const toggleSubtask = (subtaskId: string) => {
    if (!task?.subtasks) return;
    const updatedSubtasks = task.subtasks.map(st => 
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );
    updateTask({ subtasks: updatedSubtasks });
  };

  const addSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    const newSubtask: SubTask = {
      id: Date.now().toString(),
      title: newSubtaskTitle,
      completed: false
    };
    const updatedSubtasks = [...(task?.subtasks || []), newSubtask];
    updateTask({ subtasks: updatedSubtasks });
    setNewSubtaskTitle('');
    setAddingSubtask(false);
  };

  const removeSubtask = (subtaskId: string) => {
    if (!task?.subtasks) return;
    const updatedSubtasks = task.subtasks.filter(st => st.id !== subtaskId);
    updateTask({ subtasks: updatedSubtasks });
  };

  const addTag = () => {
    if (!newTag.trim()) return;
    const updatedTags = [...(task?.tags || []), newTag.trim()];
    updateTask({ tags: updatedTags });
    setNewTag('');
  };

  const removeTag = (tag: string) => {
    if (!task?.tags) return;
    const updatedTags = task.tags.filter(t => t !== tag);
    updateTask({ tags: updatedTags });
  };

  const calculateProgress = (): number => {
    if (!task?.subtasks || task.subtasks.length === 0) return task?.completed ? 100 : 0;
    const completed = task.subtasks.filter(st => st.completed).length;
    return Math.round((completed / task.subtasks.length) * 100);
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-gray-500 dark:text-gray-400">Lade Aufgabe...</div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-gray-500 dark:text-gray-400">Aufgabe nicht gefunden</div>
      </div>
    );
  }

  const statusColors = {
    todo: 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
    'in-progress': 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-900',
    done: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-900'
  };

  const priorityColors: Record<string, string> = {
    high: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',
    medium: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
    low: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400'
  };

  const status = task.completed ? 'done' : task.due_date ? 'in-progress' : 'todo';
  const statusLabel = status === 'done' ? 'Erledigt' : status === 'in-progress' ? 'In Arbeit' : 'Offen';

  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-950">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft size={16} />
          Zurück zu Aufgaben
        </button>

        {/* Header */}
        <div className="bg-white dark:bg-gray-900 rounded-lg p-6 border border-gray-200 dark:border-gray-800 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              {editing ? (
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  onBlur={saveTitle}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveTitle();
                    if (e.key === 'Escape') {
                      setEditedTitle(task.title);
                      setEditing(false);
                    }
                  }}
                  className="text-2xl font-semibold text-gray-900 dark:text-white bg-transparent border-b-2 border-gray-300 dark:border-gray-700 focus:outline-none focus:border-gray-900 dark:focus:border-white w-full"
                  autoFocus
                />
              ) : (
                <h1
                  onClick={() => setEditing(true)}
                  className="text-2xl font-semibold text-gray-900 dark:text-white cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
                >
                  {task.title}
                </h1>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={toggleFavorite}
                className={`p-2 rounded-lg transition-colors ${
                  task.favorite 
                    ? 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400' 
                    : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600 hover:text-amber-500'
                }`}
              >
                <Star size={20} fill={task.favorite ? 'currentColor' : 'none'} />
              </button>
              <button
                onClick={deleteTask}
                className="p-2 bg-gray-100 hover:bg-red-100 text-gray-400 hover:text-red-500 dark:bg-gray-800 dark:hover:bg-red-950 rounded-lg transition-colors"
              >
                <Trash2 size={20} />
              </button>
            </div>
          </div>

          {/* Status & Priority Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span className={`px-3 py-1 rounded-lg text-sm font-medium border ${statusColors[status]}`}>
              {statusLabel}
            </span>
            <span className={`px-3 py-1 rounded-lg text-sm font-medium ${priorityColors[task.priority as keyof typeof priorityColors] || priorityColors.medium}`}>
              Priorität: {task.priority === 'high' ? 'Hoch' : task.priority === 'medium' ? 'Mittel' : 'Niedrig'}
            </span>
          </div>
        </div>

        {/* Metadata / Quick Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Due Date */}
          <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-3 mb-2">
              <Calendar size={18} className="text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Fälligkeitsdatum</span>
            </div>
            <input
              type="date"
              value={task.due_date || ''}
              onChange={(e) => updateTask({ due_date: e.target.value || undefined })}
              className="w-full px-2 py-1 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded text-sm text-gray-900 dark:text-white"
            />
          </div>

          {/* Reminder */}
          <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-3 mb-2">
              <Bell size={18} className="text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Erinnerung</span>
            </div>
            <input
              type="datetime-local"
              value={task.reminder || ''}
              onChange={(e) => updateTask({ reminder: e.target.value || undefined })}
              className="w-full px-2 py-1 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded text-sm text-gray-900 dark:text-white"
            />
          </div>

          {/* Project */}
          <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-3 mb-2">
              <FolderOpen size={18} className="text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Projekt</span>
            </div>
            <select
              value={task.project_id || ''}
              onChange={(e) => updateTask({ project_id: e.target.value || undefined })}
              className="w-full px-2 py-1 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded text-sm text-gray-900 dark:text-white"
            >
              <option value="">Kein Projekt</option>
              {allProjects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tags */}
        <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Tag size={18} className="text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Tags / Kategorien</span>
            </div>
            <button
              onClick={() => setEditingTags(!editingTags)}
              className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              {editingTags ? 'Fertig' : 'Bearbeiten'}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {task.tags?.map(tag => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs text-gray-700 dark:text-gray-300"
              >
                {tag}
                {editingTags && (
                  <button
                    onClick={() => removeTag(tag)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <X size={12} />
                  </button>
                )}
              </span>
            ))}
            {editingTags && (
              <div className="inline-flex items-center gap-1">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addTag();
                    if (e.key === 'Escape') setEditingTags(false);
                  }}
                  placeholder="Neuer Tag..."
                  className="px-2 py-1 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded text-xs w-24"
                />
                <button
                  onClick={addTag}
                  className="p-1 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded"
                >
                  <Plus size={12} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Beschreibung</h3>
              <textarea
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                onBlur={() => {
                  if (editedDescription !== task.description) {
                    updateTask({ description: editedDescription });
                  }
                }}
                placeholder="Füge eine Beschreibung hinzu... (Markdown unterstützt)"
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded text-sm text-gray-900 dark:text-white min-h-[150px] font-mono"
              />
              {editedDescription && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-800">
                  <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Vorschau:</h4>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <MarkdownPreview content={editedDescription} />
                  </div>
                </div>
              )}
            </div>

            {/* Subtasks / Checkliste */}
            <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Unteraufgaben</h3>
                <button
                  onClick={() => setAddingSubtask(!addingSubtask)}
                  className="flex items-center gap-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded text-xs transition-colors"
                >
                  <Plus size={14} />
                  Hinzufügen
                </button>
              </div>

              <div className="space-y-2">
                {task.subtasks?.map(subtask => (
                  <div
                    key={subtask.id}
                    className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-950 rounded-lg"
                  >
                    <button
                      onClick={() => toggleSubtask(subtask.id)}
                      className="flex-shrink-0"
                    >
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                        subtask.completed 
                          ? 'bg-green-500 border-green-500' 
                          : 'bg-gray-200 dark:bg-gray-800 border-gray-300 dark:border-gray-700'
                      }`}>
                        {subtask.completed && <Check size={10} className="text-white" />}
                      </div>
                    </button>
                    <span className={`flex-1 text-sm ${
                      subtask.completed 
                        ? 'line-through text-gray-400 dark:text-gray-600' 
                        : 'text-gray-900 dark:text-white'
                    }`}>
                      {subtask.title}
                    </span>
                    <button
                      onClick={() => removeSubtask(subtask.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}

                {addingSubtask && (
                  <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-950 rounded-lg">
                    <input
                      type="text"
                      value={newSubtaskTitle}
                      onChange={(e) => setNewSubtaskTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') addSubtask();
                        if (e.key === 'Escape') {
                          setAddingSubtask(false);
                          setNewSubtaskTitle('');
                        }
                      }}
                      placeholder="Unteraufgabe hinzufügen..."
                      className="flex-1 px-2 py-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded text-sm"
                      autoFocus
                    />
                    <button
                      onClick={addSubtask}
                      className="px-2 py-1 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded text-xs"
                    >
                      Hinzufügen
                    </button>
                  </div>
                )}

                {(!task.subtasks || task.subtasks.length === 0) && !addingSubtask && (
                  <p className="text-sm text-gray-400 dark:text-gray-600 text-center py-4">
                    Keine Unteraufgaben vorhanden
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Side Panel */}
          <div className="space-y-6">
            {/* Progress Tracker */}
            <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-2 mb-3">
                <CheckSquare size={18} className="text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Fortschritt</h3>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Gesamt</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{calculateProgress()}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all"
                    style={{ width: `${calculateProgress()}%` }}
                  />
                </div>
                {task.subtasks && task.subtasks.length > 0 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {task.subtasks.filter(st => st.completed).length} von {task.subtasks.length} Unteraufgaben erledigt
                  </p>
                )}
              </div>
            </div>

            {/* Verknüpfte Notizen */}
            <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-2 mb-3">
                <Link2 size={18} className="text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Verknüpfte Notizen</h3>
              </div>
              {linkedNotes.length > 0 ? (
                <div className="space-y-2">
                  {linkedNotes.map(note => (
                    <button
                      key={note.name}
                      onClick={() => onNoteClick?.(note.name)}
                      className="w-full flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-950 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-lg text-left transition-colors"
                    >
                      <FileText size={14} className="text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-900 dark:text-white truncate">
                        {note.name.replace('.md', '')}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 dark:text-gray-600">
                  Keine verknüpften Notizen gefunden
                </p>
              )}
            </div>

            {/* Metadata */}
            <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-2 mb-3">
                <Clock size={18} className="text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Informationen</h3>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Erstellt:</span>
                  <span className="text-gray-900 dark:text-white">
                    {task.created_at ? new Date(task.created_at).toLocaleDateString('de-DE') : '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Geändert:</span>
                  <span className="text-gray-900 dark:text-white">
                    {task.modified_at ? new Date(task.modified_at).toLocaleDateString('de-DE') : '-'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Plus, Folder, Clock, Trash2, ArrowLeft, FileText, CheckSquare, Pin, Share2 } from 'lucide-react';
import { useTranslation } from '@/lib/useTranslation';
import { api } from '@/lib/api';
import ShareDialog from './ShareDialog';

interface Project {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'planning' | 'completed';
  color?: string;
  created_at: string;
  modified_at: string;
  is_shared?: boolean;
  shared_by?: string;
}

interface ProjectsViewProps {
  onProjectSelect?: (projectId: string) => void;
  onNoteClick?: (noteName: string) => void;
  selectedProjectId?: string | null;
}

export default function ProjectsView({ onProjectSelect, onNoteClick, selectedProjectId: initialProjectId }: ProjectsViewProps) {
  const { t } = useTranslation();
  const [projects, setProjects] = useState<Project[]>([]);
  const [sharedProjects, setSharedProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', description: '' });
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(initialProjectId || null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareProject, setShareProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects();
    loadTasks();
  }, []);

  // Update selected project when prop changes
  useEffect(() => {
    if (initialProjectId) {
      setSelectedProjectId(initialProjectId);
    }
  }, [initialProjectId]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const [ownProjects, shared] = await Promise.all([
        api.getProjects(),
        api.getSharedProjects().catch(() => [])
      ]);
      setProjects(ownProjects);
      setSharedProjects(shared);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const openShareDialog = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setShareProject(project);
    setShareDialogOpen(true);
  };

  const loadTasks = async () => {
    try {
      const data = await api.getTasks();
      setTasks(data);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  };

  const calculateProjectProgress = (projectId: string): number => {
    const projectTasks = tasks.filter(t => String(t.project_id) === String(projectId));
    if (projectTasks.length === 0) return 0;
    const completedTasks = projectTasks.filter(t => t.completed || t.status === 'done').length;
    return Math.round((completedTasks / projectTasks.length) * 100);
  };

  const createProject = async () => {
    if (!newProject.name.trim()) return;

    try {
      const project = await api.createProject(
        newProject.name,
        newProject.description,
        'active'
      );
      setProjects([...projects, project]);
      setNewProject({ name: '', description: '' });
      setIsCreating(false);
    } catch (error) {
      console.error('Failed to create project:', error);
      alert('Failed to create project');
    }
  };

  const deleteProject = async (id: string) => {
    if (!confirm('Dieses Projekt wirklich löschen?')) return;

    try {
      await api.deleteProject(id);
      setProjects(projects.filter(p => p.id !== id));
      if (selectedProjectId === id) {
        setSelectedProjectId(null);
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
      alert('Failed to delete project');
    }
  };

  const updateProjectStatus = async (id: string, status: 'active' | 'planning' | 'completed') => {
    try {
      const updated = await api.updateProject(id, { status });
      setProjects(projects.map(p => p.id === id ? updated : p));
    } catch (error) {
      console.error('Failed to update project:', error);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-gray-500 dark:text-gray-400">{t.common.loading}</div>
      </div>
    );
  }

  const selectedProject = selectedProjectId ? projects.find(p => p.id === selectedProjectId) : null;

  const statusLabels = {
    active: t.projects.statusActive,
    planning: t.projects.statusPlanning,
    completed: t.projects.statusCompleted,
  };

  const statusColors = {
    active: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-900',
    planning: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-900',
    completed: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-900',
  };

  // Show detail view if project is selected
  if (selectedProject) {
    return <ProjectDetailView project={selectedProject} onBack={() => setSelectedProjectId(null)} onNoteClick={onNoteClick || (() => {})} />;
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-1">
              {t.projects.title}
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              {projects.length} {projects.length === 1 ? t.projects.subtitle : t.projects.title}
            </p>
          </div>
          <button 
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-lg text-xs sm:text-sm font-medium transition-colors w-full sm:w-auto justify-center"
          >
            <Plus size={16} className="sm:w-[18px] sm:h-[18px]" />
            {t.projects.newProject}
          </button>
        </div>

        {/* Create Form */}
        {isCreating && (
          <div className="bg-white dark:bg-gray-900 rounded-lg p-4 sm:p-6 border border-gray-200 dark:border-gray-800">
            <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
              {t.projects.newProject}
            </h3>
            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                  {t.projects.projectName}
                </label>
                <input
                  type="text"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-950 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
                  placeholder={t.projects.projectName + '...'}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">
                  {t.projects.projectDescription}
                </label>
                <textarea
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-950 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white resize-none"
                  rows={3}
                  placeholder={t.projects.projectDescription + '...'}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={createProject}
                  className="px-4 py-2 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-lg text-sm font-medium transition-colors"
                >
                  {t.projects.create}
                </button>
                <button
                  onClick={() => {
                    setIsCreating(false);
                    setNewProject({ name: '', description: '' });
                  }}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm font-medium transition-colors"
                >
                  {t.projects.cancel}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => {
            const progress = calculateProjectProgress(project.id);
            return (
              <div
                key={project.id}
                onClick={() => setSelectedProjectId(project.id)}
                className="bg-white dark:bg-gray-900 rounded-lg p-5 border border-gray-200 dark:border-gray-800 hover:border-gray-400 dark:hover:border-gray-600 cursor-pointer transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                    <Folder size={20} className="text-gray-600 dark:text-gray-400" />
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={(e) => openShareDialog(project, e)}
                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                      title="Projekt teilen"
                    >
                      <Share2 size={16} className="text-gray-400 hover:text-indigo-500" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteProject(project.id);
                      }}
                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                    >
                      <Trash2 size={16} className="text-gray-400 hover:text-red-500" />
                    </button>
                  </div>
                </div>

                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
                  {project.name}
                </h3>
                {project.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                    {project.description}
                  </p>
                )}

                <div className="flex items-center gap-2 mb-4">
                  <span className={`px-2 py-1 rounded text-xs font-medium border ${statusColors[project.status]}`}>
                    {statusLabels[project.status]}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                    <Clock size={12} />
                    {new Date(project.created_at).toLocaleDateString('de-DE')}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-400">{t.common.progress}</span>
                    <span className="font-medium text-gray-900 dark:text-white">{progress}%</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
                    <div
                      className="bg-gray-900 dark:bg-white h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Shared Projects Section */}
        {sharedProjects.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Share2 size={18} className="text-indigo-500" />
              Mit dir geteilte Projekte
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sharedProjects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => setSelectedProjectId(project.id)}
                  className="bg-white dark:bg-gray-900 rounded-lg p-5 border-2 border-indigo-200 dark:border-indigo-800 hover:border-indigo-400 dark:hover:border-indigo-600 cursor-pointer transition-colors"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                      <Folder size={20} className="text-indigo-500" />
                    </div>
                    <span className="text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded">
                      von {project.shared_by}
                    </span>
                  </div>

                  <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
                    {project.name}
                  </h3>
                  {project.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                      {project.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {projects.length === 0 && !isCreating && (
          <div className="text-center py-16">
            <Folder size={48} className="mx-auto text-gray-300 dark:text-gray-700 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {t.projects.title}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {t.projects.create}
            </p>
            <button
              onClick={() => setIsCreating(true)}
              className="px-4 py-2 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-lg text-sm font-medium transition-colors"
            >
              {t.projects.create}
            </button>
          </div>
        )}
      </div>

      {/* Share Dialog */}
      {shareProject && (
        <ShareDialog
          isOpen={shareDialogOpen}
          onClose={() => {
            setShareDialogOpen(false);
            setShareProject(null);
          }}
          itemType="project"
          itemId={shareProject.id}
          itemName={shareProject.name}
        />
      )}
    </div>
  );
}

// Project Detail View Component
interface ProjectDetailViewProps {
  project: Project;
  onBack: () => void;
  onNoteClick: (noteName: string) => void;
}

function ProjectDetailView({ project, onBack, onNoteClick }: ProjectDetailViewProps) {
  const [notes, setNotes] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [snippets, setSnippets] = useState<any[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [loadingSnippets, setLoadingSnippets] = useState(true);
  const [creatingNote, setCreatingNote] = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);
  const [newNoteName, setNewNoteName] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'high' | 'medium' | 'low'>('medium');

  useEffect(() => {
    loadProjectData();
    loadProjectSnippets();
  }, [project.id]);

  const calculateProgress = (): number => {
    if (tasks.length === 0) return 0;
    const completedTasks = tasks.filter(t => t.completed).length;
    return Math.round((completedTasks / tasks.length) * 100);
  };

  const loadProjectData = async () => {
    setLoadingNotes(true);
    
    // Load notes from backend that are tagged with this project
    try {
      // Use api module with proper authentication
      const allNotes = await api.getAllNotes();
      
      // Filter notes that have this project assigned
      // Note: NoteList has project directly, not in metadata
      const projectNotes = allNotes.filter((note: any) => {
        // Convert both to strings for comparison
        const noteProject = String(note.project || '');
        const searchProject = String(project.id);
        return noteProject === searchProject;
      });
      
      setNotes(projectNotes);
    } catch (error) {
      console.error('Error loading notes:', error);
      setNotes([]);
    }
    
    // Load tasks from backend that belong to this project
    try {
      const allTasks = await api.getTasks();
      const projectTasks = allTasks.filter((task: any) => 
        String(task.project_id) === String(project.id)
      );
      setTasks(projectTasks);
    } catch (error) {
      console.error('Error loading tasks:', error);
      setTasks([]);
    }
    
    setLoadingNotes(false);
  };

  const loadProjectSnippets = () => {
    setLoadingSnippets(true);
    (async () => {
      try {
        const allSnippets = await api.getSnippets().catch(() => null);
        let projectSnippets: any[] = [];
        if (allSnippets && Array.isArray(allSnippets)) {
          projectSnippets = allSnippets.filter((snippet: any) => {
            return snippet.connections?.some((conn: any) => 
              conn.type === 'project' && String(conn.id) === String(project.id)
            );
          });
        } else {
          const storageKey = (await import('@/lib/api')).getSnippetsStorageKey();
          const savedSnippets = localStorage.getItem(storageKey);
          if (savedSnippets) {
            const parsed = JSON.parse(savedSnippets);
            projectSnippets = parsed.filter((snippet: any) => snippet.connections?.some((conn: any) => conn.type === 'project' && String(conn.id) === String(project.id)));
          }
        }
        setSnippets(projectSnippets);
      } catch (error) {
        console.error('Error loading snippets:', error);
        setSnippets([]);
      } finally {
        setLoadingSnippets(false);
      }
    })();
  };

  const createNote = async () => {
    if (!newNoteName.trim()) return;

    try {
      // Add .md extension if not present
      let noteName = newNoteName.trim();
      if (!noteName.endsWith('.md')) {
        noteName += '.md';
      }

      // Use the api module to create note with proper authentication
      await api.createNote(
        noteName,
        `---\ntitle: ${newNoteName}\nproject: ${project.id}\n---\n\n`
      );

      setNewNoteName('');
      setCreatingNote(false);
      // Wait a bit for the backend to write the file
      setTimeout(() => {
        loadProjectData();
      }, 500);
    } catch (error) {
      console.error('Error creating note:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      
      if (errorMessage.includes('already exists') || errorMessage.includes('409')) {
        alert(`Eine Notiz mit diesem Namen existiert bereits. Bitte wählen Sie einen anderen Namen.`);
      } else {
        alert(`Fehler beim Erstellen: ${errorMessage}`);
      }
    }
  };

  const createTask = async () => {
    if (!newTaskTitle.trim()) return;

    try {
      await api.createTask({
        title: newTaskTitle,
        priority: newTaskPriority,
        completed: false,
        project_id: project.id,
      });

      setNewTaskTitle('');
      setNewTaskPriority('medium');
      setCreatingTask(false);
      // Reload project data to show the new task
      loadProjectData();
    } catch (error) {
      console.error('Error creating task:', error);
      alert('Fehler beim Erstellen der Aufgabe');
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header with Back Button */}
        <div>
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft size={16} />
            Zurück zu Projekten
          </button>
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                {project.name}
              </h1>
              {project.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {project.description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300">
                {calculateProgress()}% abgeschlossen
              </span>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-950 rounded-lg">
                <FileText size={20} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {notes.length}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Notizen</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-950 rounded-lg">
                <CheckSquare size={20} className="text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {tasks.filter(t => t.completed).length}/{tasks.length}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Aufgaben erledigt</p>
              </div>
            </div>
          </div>
        </div>

        {/* Notes Section */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Notizen
            </h2>
            <button
              onClick={() => setCreatingNote(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-xs font-medium transition-colors"
            >
              <Plus size={14} />
              Neue Note
            </button>
          </div>
          <div className="p-4 space-y-3">
            {creatingNote && (
              <div className="bg-gray-50 dark:bg-gray-950 rounded-lg p-3 border border-gray-200 dark:border-gray-800">
                <input
                  type="text"
                  value={newNoteName}
                  onChange={(e) => setNewNoteName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') createNote();
                    if (e.key === 'Escape') {
                      setCreatingNote(false);
                      setNewNoteName('');
                    }
                  }}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white mb-2"
                  placeholder="Notizname eingeben..."
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={createNote}
                    className="px-3 py-1.5 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded text-xs font-medium transition-colors"
                  >
                    Erstellen
                  </button>
                  <button
                    onClick={() => {
                      setCreatingNote(false);
                      setNewNoteName('');
                    }}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded text-xs font-medium transition-colors"
                  >
                    Abbrechen
                  </button>
                </div>
              </div>
            )}
            
            {loadingNotes ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Lädt...</p>
            ) : notes.length > 0 ? (
              <div className="space-y-2">
                {notes.map((note) => (
                  <div
                    key={note.name}
                    onClick={() => onNoteClick(note.name)}
                    className="p-3 bg-gray-50 dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-900 cursor-pointer transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                          {note.title || note.name}
                        </h3>
                        {note.tags && note.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {note.tags.map((tag: string) => (
                              <span
                                key={tag}
                                className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs text-gray-600 dark:text-gray-400"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <FileText size={16} className="text-gray-400 dark:text-gray-600 group-hover:text-gray-600 dark:group-hover:text-gray-400 transition-colors flex-shrink-0" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Noch keine Notizen. Erstelle eine Note für dieses Projekt.
              </p>
            )}
          </div>
        </div>

        {/* Snippets Section */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Snippets</h2>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {snippets.length} {snippets.length === 1 ? 'Snippet' : 'Snippets'}
            </span>
          </div>
          <div className="p-4 space-y-3">
            {loadingSnippets ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Lädt...</p>
            ) : snippets.length > 0 ? (
              <div className="space-y-2">
                {snippets.map((snippet: any) => (
                  <div
                    key={snippet.id}
                    onClick={() => {
                      // Navigate to snippets view - could be enhanced to open specific snippet
                      window.location.href = '/?view=snippets';
                    }}
                    className="p-3 bg-gray-50 dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-900 cursor-pointer transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                          {snippet.title}
                        </h3>
                        {snippet.content && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                            {snippet.content.substring(0, 100)}
                            {snippet.content.length > 100 ? '...' : ''}
                          </p>
                        )}
                        {snippet.pinned && (
                          <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900 rounded text-xs text-yellow-700 dark:text-yellow-300">
                            <Pin size={10} />
                            Angeheftet
                          </span>
                        )}
                      </div>
                      <FileText size={16} className="text-gray-400 dark:text-gray-600 group-hover:text-gray-600 dark:group-hover:text-gray-400 transition-colors flex-shrink-0" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Noch keine Snippets. Erstelle ein Snippet und verknüpfe es mit diesem Projekt.
              </p>
            )}
          </div>
        </div>

        {/* Tasks Section */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Aufgaben
            </h2>
            <button
              onClick={() => setCreatingTask(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-xs font-medium transition-colors"
            >
              <Plus size={14} />
              Neue Aufgabe
            </button>
          </div>
          <div className="p-4 space-y-3">
            {creatingTask && (
              <div className="bg-gray-50 dark:bg-gray-950 rounded-lg p-3 border border-gray-200 dark:border-gray-800 space-y-2">
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') createTask();
                    if (e.key === 'Escape') {
                      setCreatingTask(false);
                      setNewTaskTitle('');
                    }
                  }}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
                  placeholder="Aufgabe eingeben..."
                  autoFocus
                />
                <select
                  value={newTaskPriority}
                  onChange={(e) => setNewTaskPriority(e.target.value as 'high' | 'medium' | 'low')}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
                >
                  <option value="low">Niedrige Priorität</option>
                  <option value="medium">Mittlere Priorität</option>
                  <option value="high">Hohe Priorität</option>
                </select>
                <div className="flex gap-2">
                  <button
                    onClick={createTask}
                    className="px-3 py-1.5 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded text-xs font-medium transition-colors"
                  >
                    Erstellen
                  </button>
                  <button
                    onClick={() => {
                      setCreatingTask(false);
                      setNewTaskTitle('');
                      setNewTaskPriority('medium');
                    }}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded text-xs font-medium transition-colors"
                  >
                    Abbrechen
                  </button>
                </div>
              </div>
            )}
            
            {tasks.length > 0 ? (
              <div className="space-y-2">
                {tasks.map((task) => {
                  const status = task.completed ? 'done' : task.due_date ? 'in-progress' : 'todo';
                  return (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800"
                    >
                      <div className={`w-2 h-2 rounded-full ${
                        status === 'done' ? 'bg-green-500' : 
                        status === 'in-progress' ? 'bg-amber-500' : 
                        'bg-gray-300 dark:bg-gray-600'
                      }`} />
                      <span className={`text-sm flex-1 ${
                        status === 'done' 
                          ? 'text-gray-500 dark:text-gray-400 line-through' 
                          : 'text-gray-900 dark:text-white'
                      }`}>
                        {task.title}
                      </span>
                      {task.priority && (
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          task.priority === 'high' ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400' :
                          task.priority === 'medium' ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400' :
                          'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400'
                        }`}>
                          {task.priority === 'high' ? 'Hoch' : task.priority === 'medium' ? 'Mittel' : 'Niedrig'}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Noch keine Aufgaben. Erstelle eine Aufgabe für dieses Projekt.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

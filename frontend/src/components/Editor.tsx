'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { api, type Note } from '@/lib/api';
import MarkdownPreview from './MarkdownPreview';
import Backlinks from './Backlinks';
import { Save, Eye, Code, Trash2 } from 'lucide-react';
import { useTranslation } from '@/lib/useTranslation';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

interface EditorProps {
  noteName: string | null;
  onNoteChange: (name: string) => void;
  onNoteDeleted?: () => void;
}

export default function Editor({ noteName, onNoteChange, onNoteDeleted }: EditorProps) {
  const { t } = useTranslation();
  const [note, setNote] = useState<Note | null>(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    // Initial dark mode check
    setIsDark(document.documentElement.classList.contains('dark'));

    // Load projects from API
    loadProjects();

    // Listen for dark mode changes
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  const loadProjects = async () => {
    try {
      const data = await api.getProjects();
      setProjects(data);
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  useEffect(() => {
    if (noteName) {
      loadNote(noteName);
    } else {
      setNote(null);
      setContent('');
    }
  }, [noteName]);

  const loadNote = async (name: string) => {
    setLoading(true);
    try {
      const data = await api.getNote(name);
      setNote(data);
      
      // Only show the content WITHOUT frontmatter in editor
      // Frontmatter is managed through the sidebar (title, tags, project)
      let cleanContent = data.content;
      
      // Remove frontmatter if present (for display only)
      if (cleanContent.startsWith('---')) {
        const lines = cleanContent.split('\n');
        let endIndex = lines.findIndex((line, idx) => idx > 0 && line.trim() === '---');
        if (endIndex > 0) {
          // Remove frontmatter and leading empty lines
          cleanContent = lines.slice(endIndex + 1).join('\n').trimStart();
        }
      }
      
      setContent(cleanContent);
      setNewTitle(data.metadata.title || name);
      setSelectedProject(data.metadata.project || '');
      setEditingTitle(false);
    } catch (error) {
      console.error('Failed to load note:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveNote = async () => {
    if (!noteName || !note) return;

    setSaving(true);
    try {
      // Reconstruct full content with frontmatter before saving
      const frontmatterLines = ['---'];
      if (newTitle) frontmatterLines.push(`title: ${newTitle}`);
      if (note.metadata.tags && note.metadata.tags.length > 0) {
        frontmatterLines.push(`tags: [${note.metadata.tags.join(', ')}]`);
      }
      // Only add project line if selectedProject is not empty
      if (selectedProject && selectedProject.trim() !== '') {
        frontmatterLines.push(`project: ${selectedProject}`);
      }
      frontmatterLines.push('---', '');
      
      const fullContent = frontmatterLines.join('\n') + content;
      
      // Get current content from editor
      await api.updateNote(noteName, fullContent);
      // Don't reload immediately to avoid losing cursor position
      // await loadNote(noteName);
    } catch (error) {
      console.error('Failed to save note:', error);
    } finally {
      setSaving(false);
    }
  };

  const saveTitle = async () => {
    if (!noteName || !newTitle.trim()) return;

    try {
      // Update frontmatter with new title
      const updatedContent = content.startsWith('---') 
        ? content.replace(/(title:\s*).*/i, `$1${newTitle}`)
        : `---\ntitle: ${newTitle}\n---\n\n${content}`;
      
      await api.updateNote(noteName, updatedContent);
      await loadNote(noteName);
    } catch (error) {
      console.error('Failed to update title:', error);
    }
  };

  const updateProject = async (projectId: string) => {
    if (!noteName || !note) return;

    setSelectedProject(projectId);

    try {
      // Build frontmatter with updated project
      const frontmatterLines = ['---'];
      frontmatterLines.push(`title: ${note.metadata.title || noteName}`);
      // Only add project line if projectId is not empty
      if (projectId && projectId.trim() !== '') {
        frontmatterLines.push(`project: ${projectId}`);
      }
      // If projectId is empty, we simply don't add the project line (removes it)
      if (note.metadata.tags && note.metadata.tags.length > 0) {
        frontmatterLines.push(`tags: ${note.metadata.tags.join(', ')}`);
      }
      frontmatterLines.push('---');
      
      const fullContent = frontmatterLines.join('\n') + '\n\n' + content;
      
      await api.updateNote(noteName, fullContent);
      // Don't reload the note to avoid UI reset
    } catch (error) {
      console.error('Failed to update project:', error);
      // Revert on error
      setSelectedProject(note.metadata.project || '');
    }
  };

  const deleteNote = async () => {
    if (!noteName) return;

    const confirmDelete = window.confirm(`Möchten Sie die Notiz "${note?.metadata.title || noteName}" wirklich löschen?`);
    if (!confirmDelete) return;

    setDeleting(true);
    try {
      await api.deleteNote(noteName);
      // Notify parent component that note was deleted
      if (onNoteDeleted) {
        onNoteDeleted();
      }
      // Clear the editor
      setNote(null);
      setContent('');
      onNoteChange(null as any);
    } catch (error) {
      console.error('Failed to delete note:', error);
      alert('Fehler beim Löschen der Notiz');
    } finally {
      setDeleting(false);
    }
  };

  const handleLinkClick = (linkName: string) => {
    onNoteChange(linkName);
  };

  if (!noteName) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        Select a note or create a new one
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        Loading...
      </div>
    );
  }

  return (
    <div className="h-full flex">
      {/* Editor Area */}
      <div className="flex-1 flex flex-col">
        {/* Editor Header */}
        <div className="h-12 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4">
          {editingTitle ? (
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onBlur={() => {
                saveTitle();
                setEditingTitle(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  saveTitle();
                  setEditingTitle(false);
                } else if (e.key === 'Escape') {
                  setNewTitle(note?.metadata.title || noteName || '');
                  setEditingTitle(false);
                }
              }}
              className="font-semibold bg-transparent border-b-2 border-primary-500 outline-none px-1"
              autoFocus
            />
          ) : (
            <h2 
              className="font-semibold truncate cursor-pointer hover:text-primary-500"
              onClick={() => setEditingTitle(true)}
              title="Click to edit title"
            >
              {note?.metadata.title || noteName}
            </h2>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPreview(!preview)}
              className={`p-2 rounded-lg ${
                preview
                  ? 'bg-primary-500 text-white'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
              title="Toggle Preview"
            >
              {preview ? <Code size={18} /> : <Eye size={18} />}
            </button>
            <button
              onClick={saveNote}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
            >
              <Save size={18} />
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        {/* Editor/Preview */}
        <div className="flex-1 overflow-hidden">
          {preview ? (
            <div className="h-full overflow-y-auto p-6">
              <MarkdownPreview content={content} onLinkClick={handleLinkClick} />
            </div>
          ) : (
            <MonacoEditor
              height="100%"
              language="markdown"
              theme={isDark ? 'vs-dark' : 'light'}
              value={content}
              onChange={(value) => setContent(value || '')}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                wordWrap: 'on',
                scrollBeyondLastLine: false,
              }}
            />
          )}
        </div>
      </div>

      {/* Sidebar - Backlinks & Metadata */}
      <div className="w-64 border-l border-gray-200 dark:border-gray-700 overflow-y-auto">
        {/* Project Assignment */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Projekt
          </label>
          <select
            value={selectedProject}
            onChange={(e) => updateProject(e.target.value)}
            className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
          >
            <option value="">Kein Projekt</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          {selectedProject && (
            <div className="mt-2 px-2 py-1.5 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200 dark:border-blue-900">
              <p className="text-xs text-blue-700 dark:text-blue-400 flex items-center gap-1">
                <span>📁</span>
                <span className="font-medium">{projects.find(p => p.id === selectedProject)?.name}</span>
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-500 mt-0.5">
                Wird nur im Frontmatter gespeichert
              </p>
            </div>
          )}
        </div>

        {/* Delete Note Button */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={deleteNote}
            disabled={deleting}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 rounded-lg text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900 transition-colors disabled:opacity-50"
          >
            <Trash2 size={16} />
            {deleting ? 'Wird gelöscht...' : 'Notiz löschen'}
          </button>
        </div>

        <Backlinks
          note={note}
          onLinkClick={handleLinkClick}
        />
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { api, uploadAttachment, type Note } from '@/lib/api';
import MarkdownPreview from './MarkdownPreview';
import StatusBar from './StatusBar';
import FileInfoModal from './FileInfoModal';
import { useTranslation } from '@/lib/useTranslation';

const RichTextEditor = dynamic(() => import('./RichTextEditor'), { ssr: false });

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
  const [editorMode, setEditorMode] = useState<'markdown' | 'wysiwyg' | 'reading'>('markdown');
  const [isDark, setIsDark] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [deleting, setDeleting] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [backlinksCount, setBacklinksCount] = useState(0);
  const editorRef = useRef<any>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const noteRef = useRef<Note | null>(null);
  const contentRef = useRef('');
  const newTitleRef = useRef('');
  const selectedProjectRef = useRef('');
  const noteNameRef = useRef<string | null>(null);
  const isSavingRef = useRef(false);
  const pendingSaveRef = useRef(false);

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
    noteRef.current = note;
  }, [note]);

  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  useEffect(() => {
    newTitleRef.current = newTitle;
  }, [newTitle]);

  useEffect(() => {
    selectedProjectRef.current = selectedProject;
  }, [selectedProject]);

  const buildFullContent = (rawContent: string, title: string, project: string, tags: string[]) => {
    const frontmatterLines = ['---'];
    if (title) frontmatterLines.push(`title: ${title}`);
    if (tags && tags.length > 0) {
      frontmatterLines.push(`tags: [${tags.join(', ')}]`);
    }
    if (project && project.trim() !== '') {
      frontmatterLines.push(`project: ${project}`);
    }
    frontmatterLines.push('---', '');
    return frontmatterLines.join('\n') + rawContent;
  };

  const saveNote = async (force = false) => {
    const currentName = noteNameRef.current;
    const currentNote = noteRef.current;
    if (!currentName || !currentNote) return;

    if (isSavingRef.current) {
      pendingSaveRef.current = true;
      return;
    }

    const fullContent = buildFullContent(
      contentRef.current,
      newTitleRef.current,
      selectedProjectRef.current,
      currentNote.metadata.tags || []
    );

    if (!force && currentNote.content === fullContent) {
      return;
    }

    isSavingRef.current = true;
    setSaving(true);
    try {
      await api.updateNote(currentName, fullContent);
      // Keep local cache in sync so route changes don't re-save identical content.
      setNote((prev) => (prev ? { ...prev, content: fullContent } : prev));
    } catch (error) {
      console.error('Failed to save note:', error);
    } finally {
      isSavingRef.current = false;
      setSaving(false);
      if (pendingSaveRef.current) {
        pendingSaveRef.current = false;
        void saveNote(true);
      }
    }
  };

  useEffect(() => {
    const previousName = noteNameRef.current;
    if (previousName && previousName !== noteName) {
      // Flush unsaved edits before loading another note.
      void saveNote(true);
    }
    noteNameRef.current = noteName;

    if (noteName) {
      loadNote(noteName);
    } else {
      setNote(null);
      setContent('');
      setBacklinksCount(0);
    }
  }, [noteName]);

  useEffect(() => {
    return () => {
      // Flush on unmount/navigation away as a last safety net.
      void saveNote(true);
    };
  }, []);

  // Auto-save when content changes (after 2 seconds of inactivity)
  useEffect(() => {
    if (!noteName || !note) return;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout for auto-save
    saveTimeoutRef.current = setTimeout(() => {
      void saveNote();
    }, 2000);

    // Cleanup on unmount
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [content, newTitle, selectedProject, noteName, note]);

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
      noteNameRef.current = name;
      setEditingTitle(false);
      setBacklinksCount(data.backlinks?.length || 0);
    } catch (error) {
      console.error('Failed to load note:', error);
    } finally {
      setLoading(false);
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

  const handleTaskToggle = (taskIndex: number, checked: boolean) => {
    let currentTaskIndex = -1;
    const updatedContent = content
      .split('\n')
      .map((line) => {
        const match = line.match(/^(\s*[-*]\s\[)(\s|x|X)(\]\s.*)$/);
        if (!match) return line;

        currentTaskIndex += 1;
        if (currentTaskIndex !== taskIndex) return line;

        return `${match[1]}${checked ? 'x' : ' '}${match[3]}`;
      })
      .join('\n');

    setContent(updatedContent);
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
    <div className="h-full flex flex-col">
      {/* Editor Header */}
      <div className="h-12 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 bg-white dark:bg-gray-800">
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
            className="font-semibold bg-transparent border-b-2 border-indigo-500 outline-none px-1 text-gray-900 dark:text-white"
            autoFocus
          />
        ) : (
          <h2 
            className="font-semibold truncate cursor-pointer hover:text-indigo-500 text-gray-900 dark:text-white"
            onClick={() => setEditingTitle(true)}
            title="Click to edit title"
          >
            {note?.metadata.title || noteName}
          </h2>
        )}
      </div>

      {/* Editor/Preview Content */}
      <div className="flex-1 overflow-hidden">
        {editorMode === 'reading' ? (
          <div className="h-full overflow-y-auto p-6 bg-white dark:bg-gray-900">
            <MarkdownPreview
              content={content}
              onLinkClick={handleLinkClick}
              onTaskToggle={handleTaskToggle}
            />
          </div>
        ) : editorMode === 'wysiwyg' ? (
          <RichTextEditor
            content={content}
            onChange={setContent}
            isDark={isDark}
            showMarkdownSyntaxOnActiveLine={false}
          />
        ) : (
          <RichTextEditor
            content={content}
            onChange={setContent}
            isDark={isDark}
            showToolbar={false}
            showMarkdownSyntaxOnActiveLine={true}
          />
        )}
      </div>

      {/* Status Bar */}
      <StatusBar
        note={note}
        content={content}
        backlinksCount={backlinksCount}
        editorMode={editorMode}
        onModeChange={setEditorMode}
        onShowInfo={() => setShowInfoModal(true)}
      />

      {/* File Info Modal */}
      {showInfoModal && (
        <FileInfoModal
          note={note}
          onClose={() => setShowInfoModal(false)}
          onProjectUpdate={updateProject}
          onDelete={deleteNote}
        />
      )}
    </div>
  );
}

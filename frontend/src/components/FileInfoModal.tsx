'use client';

import { X, Calendar, FileText, Hash, Folder, Clock, FolderOpen, Trash2 } from 'lucide-react';
import { type Note } from '@/lib/api';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface FileInfoModalProps {
  note: Note | null;
  onClose: () => void;
  onProjectUpdate?: (projectId: string) => void;
  onDelete?: () => void;
}

export default function FileInfoModal({ note, onClose, onProjectUpdate, onDelete }: FileInfoModalProps) {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadProjects();
    if (note) {
      setSelectedProject(note.metadata.project || '');
    }
  }, [note]);

  const loadProjects = async () => {
    try {
      const data = await api.getProjects();
      setProjects(data);
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const handleProjectChange = (projectId: string) => {
    setSelectedProject(projectId);
    if (onProjectUpdate) {
      onProjectUpdate(projectId);
    }
  };

  const handleDelete = () => {
    if (!confirm(`Are you sure you want to delete "${note?.metadata.title || note?.name}"?`)) {
      return;
    }
    setDeleting(true);
    if (onDelete) {
      onDelete();
    }
    onClose();
  };

  if (!note) return null;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-xl z-50">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText size={20} />
            File Information
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* File Name */}
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <FileText size={16} />
              File Name
            </div>
            <div className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 px-3 py-2 rounded border border-gray-200 dark:border-gray-700">
              {note.name.split('/').pop()}
            </div>
          </div>

          {/* Title */}
          {note.metadata.title && (
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <Hash size={16} />
                Title
              </div>
              <div className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 px-3 py-2 rounded border border-gray-200 dark:border-gray-700">
                {note.metadata.title}
              </div>
            </div>
          )}

          {/* Path/Folder */}
          {note.name.includes('/') && (
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <Folder size={16} />
                Folder Path
              </div>
              <div className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 px-3 py-2 rounded border border-gray-200 dark:border-gray-700">
                {note.name.split('/').slice(0, -1).join('/')}
              </div>
            </div>
          )}

          {/* Created Date */}
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <Calendar size={16} />
              Created
            </div>
            <div className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 px-3 py-2 rounded border border-gray-200 dark:border-gray-700">
              {note.metadata.created ? formatDate(note.metadata.created) : 'N/A'}
            </div>
          </div>

          {/* Modified Date */}
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <Clock size={16} />
              Last Modified
            </div>
            <div className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 px-3 py-2 rounded border border-gray-200 dark:border-gray-700">
              {note.metadata.modified ? formatDate(note.metadata.modified) : 'N/A'}
            </div>
          </div>

          {/* Tags */}
          {note.tags.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <Hash size={16} />
                Tags
              </div>
              <div className="flex flex-wrap gap-2">
                {note.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-2 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Project Assignment */}
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <FolderOpen size={16} />
              Project
            </div>
            <select
              value={selectedProject}
              onChange={(e) => handleProjectChange(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">No Project</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
          >
            <Trash2 size={16} />
            {deleting ? 'Deleting...' : 'Delete Note'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
}

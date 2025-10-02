'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

interface NewNoteDialogProps {
  onClose: () => void;
  onCreate: (name: string, folder?: string) => void;
}

export default function NewNoteDialog({ onClose, onCreate }: NewNoteDialogProps) {
  const [noteName, setNoteName] = useState('');
  const [folder, setFolder] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (noteName.trim()) {
      onCreate(noteName.trim(), folder.trim() || undefined);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 p-6"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Create New Note</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Note Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={noteName}
                onChange={(e) => setNoteName(e.target.value)}
                placeholder="My New Note"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Folder (optional)
              </label>
              <input
                type="text"
                value={folder}
                onChange={(e) => setFolder(e.target.value)}
                placeholder="projects"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave empty for root folder
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!noteName.trim()}
              className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
